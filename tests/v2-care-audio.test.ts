import { afterEach, describe, expect, it, vi } from "vitest";
import emotionsRaw from "../content/emotions.json";
import booksMeta from "../content/books_meta.json";
import { emotionDistribution, emotionsFileSchema, needsCare, pickEmotionVerse } from "../src/domain/emotions";
import { cleanForSpeech, pickVoice, spanishVoices, splitForSpeech, type VoiceInfo } from "../src/domain/speech";
import { planSession, type ChapterOption } from "../src/domain/sessions";
import { groupForExport, journalFileName, journalToMarkdown, type ExportEntry } from "../src/domain/journalExport";
import { parseBackup } from "../src/domain/backup";
import { parseVerseRef } from "../src/domain/refs";

// ---------- ¿Cómo me siento hoy? ----------

describe("emociones", () => {
  const file = emotionsFileSchema.parse(emotionsRaw);
  const care = new Set(file.emotions.filter((e) => e.cuidado).map((e) => e.id));

  it("el contenido es válido: 7 emociones, referencias bien escritas y libros que existen", () => {
    const codes = new Set(booksMeta.books.map((b) => b.code));
    for (const e of file.emotions) {
      for (const ref of e.verses) {
        const r = parseVerseRef(ref);
        expect(r, ref).not.toBeNull();
        expect(codes, ref).toContain(r!.book);
      }
    }
    expect(care).toEqual(new Set(["triste", "ansioso"]));
    expect(JSON.stringify(emotionsRaw)).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("el versículo es el mismo todo el día", () => {
    const e = file.emotions[0];
    expect(pickEmotionVerse(e, "2026-09-24")).toBe(pickEmotionVerse(e, "2026-09-24"));
    expect(pickEmotionVerse(e, "2026-09-24")).not.toBe(pickEmotionVerse(e, "2026-09-25"));
  });

  it("mensaje de cuidado solo con 3 días seguidos (hasta hoy) de tristeza o ansiedad", () => {
    const log = new Map([
      ["2026-09-22", "ansioso"],
      ["2026-09-23", "triste"],
      ["2026-09-24", "triste"],
    ]);
    expect(needsCare(log, "2026-09-24", care)).toBe(true);
    expect(needsCare(new Map([...log, ["2026-09-23", "bien"]]), "2026-09-24", care)).toBe(false);
    const gap = new Map(log);
    gap.delete("2026-09-23");
    expect(needsCare(gap, "2026-09-24", care)).toBe(false); // un día sin registrar corta la cuenta
    expect(needsCare(log, "2026-09-25", care)).toBe(false); // hoy todavía no eligió
  });

  it("distribución de los últimos 30 días", () => {
    const log = new Map([
      ["2026-08-01", "bien"], // fuera del rango
      ["2026-09-20", "bien"],
      ["2026-09-21", "bien"],
      ["2026-09-24", "cansado"],
    ]);
    const d = emotionDistribution(log, "2026-09-24", 30);
    expect(d.total).toBe(3);
    expect(d.counts.find((c) => c.id === "bien")?.count).toBe(2);
    expect(d.counts.find((c) => c.id === "cansado")?.count).toBe(1);
    expect(d.counts).toHaveLength(7);
  });
});

// ---------- Modo escuchar ----------

const v = (name: string, lang: string, localService = true): VoiceInfo => ({
  voiceURI: name,
  name,
  lang,
  localService,
});

describe("modo escuchar", () => {
  it("prefiere voces en español instaladas y de Latinoamérica", () => {
    const voices = [v("David", "en-US"), v("Helena", "es-ES"), v("Sabina", "es-MX"), v("Dalia Online", "es-MX", false)];
    expect(spanishVoices(voices).map((x) => x.name)).toEqual(["Sabina", "Helena", "Dalia Online"]);
    expect(pickVoice(voices, "")?.name).toBe("Sabina");
    expect(pickVoice(voices, "Helena")?.name).toBe("Helena");
    expect(pickVoice(voices, "No existe")?.name).toBe("Sabina");
    expect(pickVoice([v("David", "en-US")], "")).toBeNull();
  });

  it("limpia encabezados del Salmo 119 y las notas (Selah.)", () => {
    expect(cleanForSpeech("NUN. Lámpara es a mis pies tu palabra")).toBe("Lámpara es a mis pies tu palabra");
    expect(cleanForSpeech("Temblad, y no pequéis: desistid. (Selah.)")).toBe("Temblad, y no pequéis: desistid.");
  });

  it("parte los textos largos sin perder palabras", () => {
    const long =
      "Y aconteció en aquellos días, que salió edicto de parte de Augusto César, que toda la tierra fuese empadronada. " +
      "Este empadronamiento primero fue hecho siendo Cirenio gobernador de la Siria, y iban todos para ser empadronados, cada uno a su ciudad, y subió José de Galilea, de la ciudad de Nazaret, a Judea, a la ciudad de David.";
    const parts = splitForSpeech(long, 120);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(120);
    expect(parts.join(" ").replace(/\s+/g, " ")).toBe(long.replace(/\s+/g, " "));
    expect(splitForSpeech("Corto.")).toEqual(["Corto."]);
    expect(splitForSpeech("   ")).toEqual([]);
  });
});

describe("control de voz (con un motor simulado)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("lee versículo por versículo, avisa el actual y al terminar llama a onFinish", async () => {
    const spoken: string[] = [];
    class Utterance {
      text: string;
      onend: (() => void) | null = null;
      onerror = null;
      lang = "";
      rate = 1;
      voice = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    const synth = {
      getVoices: () => [{ voiceURI: "Sabina", name: "Sabina", lang: "es-MX", localService: true }],
      speak: (u: Utterance) => {
        spoken.push(u.text);
        queueMicrotask(() => u.onend?.());
      },
      cancel: vi.fn(),
      addEventListener: vi.fn(),
    };
    vi.stubGlobal("window", { speechSynthesis: synth, setTimeout });
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const { speech } = await import("../src/data/speech");

    const seen: (number | null)[] = [];
    speech.subscribe((s) => seen.push(s.current));
    const done = new Promise<void>(
      (resolve) =>
        void speech.play(
          [
            { id: 1, text: "En el principio crió Dios los cielos y la tierra." },
            { id: 2, text: "Y la tierra estaba desordenada y vacía." },
          ],
          { label: "Génesis 1", rate: 1, voiceURI: "", onFinish: resolve },
        ),
    );
    await done;
    expect(spoken).toHaveLength(2);
    expect(seen).toContain(1);
    expect(seen).toContain(2);
    expect(speech.state.status).toBe("idle");
  });
});

// ---------- Sesiones por tiempo ----------

const ch = (label: string, minutes: number): ChapterOption => ({
  code: label.slice(0, 3).toUpperCase(),
  chapter: 1,
  label,
  seconds: minutes * 60,
});

describe("sesiones de 10/15/30 minutos", () => {
  const seq = [ch("Juan 1", 4), ch("Juan 2", 2.5), ch("Juan 3", 3.5), ch("Juan 4", 5)];
  const psalms = [ch("Salmos 1", 0.5), ch("Salmos 23", 0.8)];

  it("toma capítulos seguidos mientras quepan", () => {
    expect(planSession(10, seq, psalms).chapters.map((c) => c.label)).toEqual(["Juan 1"]);
    expect(planSession(15, seq, psalms).chapters.map((c) => c.label)).toEqual(["Juan 1", "Juan 2"]);
    const p30 = planSession(30, seq, psalms);
    expect(p30.chapters).toHaveLength(4);
    expect(p30.steps).toEqual(["reflection", "prayer", "application"]);
    expect(p30.prayerMinutes).toBe(5);
  });

  it("si el siguiente capítulo no cabe, propone uno corto", () => {
    const p = planSession(10, [ch("Salmos 119", 18)], psalms);
    expect(p.detour).toBe(true);
    expect(p.chapters[0].label).toBe("Salmos 1");
  });

  it("acepta un capítulo un poco más largo que el presupuesto", () => {
    expect(planSession(10, [ch("Marcos 1", 5.8)], psalms).chapters[0].label).toBe("Marcos 1");
  });

  it("estima el tiempo total", () => {
    // 4 min de lectura + 2 de reflexión + 2 de oración
    expect(planSession(10, seq, psalms).totalMinutes).toBe(8);
  });
});

// ---------- Exportar el diario ----------

describe("exportar el diario", () => {
  const entries: ExportEntry[] = [
    {
      day: "2026-09-23",
      kind: "free",
      content: "# no es un título\n- ni una lista",
      created_at: "2026-09-23T21:00:00Z",
      refLabel: null,
      emotionLabel: null,
    },
    {
      day: "2026-09-22",
      kind: "reflection",
      content: "Dios amó al mundo.",
      created_at: "2026-09-22T20:00:00Z",
      refLabel: "Juan 3",
      emotionLabel: "Ansioso",
    },
  ];

  it("agrupa del día más antiguo al más reciente", () => {
    expect(groupForExport(entries).map((g) => g.day)).toEqual(["2026-09-22", "2026-09-23"]);
  });

  it("genera Markdown legible y protege el texto del usuario", () => {
    const md = journalToMarkdown(entries, { name: "Youfrend", exportedOn: "24 de septiembre de 2026" });
    expect(md).toContain("# Diario de Youfrend");
    expect(md).toContain("2 entradas");
    expect(md).toContain("## Martes 22 de septiembre de 2026");
    expect(md).toContain("### Reflexión · Juan 3");
    expect(md).toContain("_Ese día me sentía: ansioso_");
    expect(md).toContain("\\# no es un título");
    expect(md).toContain("\\- ni una lista");
    expect(md.indexOf("Martes 22")).toBeLessThan(md.indexOf("Miércoles 23"));
  });

  it("nombre del archivo", () => {
    expect(journalFileName(new Date(2026, 8, 24))).toBe("camino-de-fe-diario-2026-09-24.md");
  });
});

// ---------- Respaldo ----------

describe("respaldo formato 3", () => {
  it("un respaldo de formato 2 se importa con emotions_log vacío", () => {
    const b = parseBackup(
      JSON.stringify({
        app: "camino-de-fe",
        format: 2,
        exported_at: "x",
        tables: {
          profile: [],
          activity_log: [],
          chapter_progress: [],
          settings: [],
          journal_entries: [],
          verse_marks: [],
          challenge_runs: [],
        },
      }),
    );
    expect(b.tables.emotions_log).toEqual([]);
  });
});

/**
 * Sprint 3B: quiz por libro y desafíos mayores (ADR-0009).
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import booksMeta from "../content/books_meta.json";
import challengesRaw from "../content/challenges.json";
import achievementsRaw from "../content/achievements.json";
import {
  arrangeOptions,
  chaptersWithQuiz,
  isChoice,
  pickBookQuiz,
  pickChapterQuiz,
  quizAward,
  quizFileSchema,
  quizSummary,
  shuffle,
  toItems,
  type ChoiceItem,
  type QuizItem,
} from "../src/domain/quiz";
import { challengesFileSchema, evaluateChallenge, maxActive, type ChallengeEvent } from "../src/domain/challenges";
import { achievementsFileSchema, ruleProgress, type ProgressSnapshot } from "../src/domain/achievements";

const DIR = "content/quiz";
const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ name: f, file: quizFileSchema.parse(JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))) }));
const all: QuizItem[] = files.flatMap((f) => toItems(f.file));
const codes = new Set(booksMeta.books.map((b) => b.code));

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "");

// ---------- Contenido ----------

describe("contenido del quiz", () => {
  it("hay unas 20 libros con más de 200 preguntas en total", () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
    expect(all.filter(isChoice).length).toBeGreaterThanOrEqual(200);
    expect(all.filter((q) => !isChoice(q)).length).toBeGreaterThanOrEqual(15);
  });

  it("cada archivo se llama como su libro y el libro existe", () => {
    for (const f of files) {
      expect(f.name).toBe(`${f.file.book}.json`);
      expect(codes.has(f.file.book)).toBe(true);
    }
  });

  it("los ids son únicos en toda la app", () => {
    const refs = all.map((q) => q.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("no usa emojis y las preguntas son cortas", () => {
    for (const q of all) {
      const t = isChoice(q) ? [q.q, ...q.options].join(" ") : q.reflect;
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
      expect((isChoice(q) ? q.q : q.reflect).length, q.ref).toBeLessThan(120);
    }
  });

  it("detecta un versículo de otro capítulo, un id que no coincide y opciones repetidas", () => {
    const bad = {
      book: "GEN",
      questions: [
        { id: "2a", chapter: 3, q: "?", options: ["a", "b", "c"], verse: "GEN.3.1", check: "x" },
        { id: "3b", chapter: 3, q: "?", options: ["a", "a", "c"], verse: "GEN.4.1", check: "x" },
      ],
    };
    const r = quizFileSchema.safeParse(bad);
    expect(r.success).toBe(false);
    const msg = JSON.stringify(r.error?.issues);
    expect(msg).toMatch(/no corresponde al capítulo/);
    expect(msg).toMatch(/no es del capítulo/);
    expect(msg).toMatch(/opciones repetidas/);
  });
});

const DB_PATH = "src-tauri/resources/bible.db";
describe.runIf(existsSync(DB_PATH))("quiz contra bible.db", () => {
  it("cada respuesta está en su versículo (la palabra clave aparece en el texto)", () => {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    const stmt = db.prepare(
      "SELECT v.text FROM verses v JOIN books b ON b.id = v.book_id WHERE b.code=? AND v.chapter=? AND v.verse=?",
    );
    const problems: string[] = [];
    for (const q of all.filter(isChoice)) {
      const [code, ch, v] = q.verse.split(".");
      const row = stmt.get(code, Number(ch), Number(v)) as { text: string } | undefined;
      if (!row) problems.push(`${q.ref}: ${q.verse} no existe`);
      else if (!norm(row.text).includes(norm(q.check))) problems.push(`${q.ref}: "${q.check}" no está en ${q.verse}`);
    }
    expect(problems).toEqual([]);
  });

  it("los capítulos existen", () => {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    const chapters = new Map(
      (db.prepare("SELECT code, chapters FROM books").all() as { code: string; chapters: number }[]).map((b) => [
        b.code,
        b.chapters,
      ]),
    );
    for (const q of all) expect(q.chapter, q.ref).toBeLessThanOrEqual(chapters.get(q.book)!);
  });
});

// ---------- Mecánica ----------

const q = (book: string, id: string, chapter: number, reflect = false): QuizItem =>
  reflect
    ? { book, ref: `${book}.${id}`, id, chapter, reflect: "¿?" }
    : {
        book,
        ref: `${book}.${id}`,
        id,
        chapter,
        q: "¿?",
        options: ["bien", "mal 1", "mal 2", "mal 3"],
        verse: `${book}.${chapter}.1`,
        check: "x",
      };

describe("mezclar opciones", () => {
  it("es estable para la misma pregunta y el mismo día, y conserva cuál es la correcta", () => {
    const item = q("GEN", "3a", 3) as ChoiceItem;
    const a = arrangeOptions(item, "2026-09-25");
    const b = arrangeOptions(item, "2026-09-25");
    expect(a).toEqual(b);
    expect(a.options[a.correct]).toBe("bien");
    expect([...a.options].sort()).toEqual([...item.options].sort());
  });

  it("la correcta no queda siempre primera", () => {
    const positions = new Set(all.filter(isChoice).map((x) => arrangeOptions(x, "2026-09-25").correct));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it("shuffle no pierde elementos", () => {
    expect(shuffle([1, 2, 3, 4, 5], "x").sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("qué preguntas se muestran", () => {
  const items = [
    q("JON", "1a", 1),
    q("JON", "1b", 1),
    q("JON", "1c", 1),
    q("JON", "1d", 1),
    q("JON", "4a", 4),
    q("JON", "4b", 4, true),
  ];

  it("después de leer: hasta 3 del capítulo, primero las no acertadas, y la reflexiva al final", () => {
    const picked = pickChapterQuiz(items, 1, new Set(["JON.1a"]));
    expect(picked.map((x) => x.id)).toEqual(["1b", "1c", "1d"]);
    expect(pickChapterQuiz(items, 4, new Set()).map((x) => x.id)).toEqual(["4a", "4b"]);
    expect(pickChapterQuiz(items, 2, new Set())).toEqual([]);
    expect([...chaptersWithQuiz(items)]).toEqual([1, 4]);
  });

  it("quiz del libro: de los capítulos leídos, sin las ya acertadas si hay otras, en orden de capítulo", () => {
    const picked = pickBookQuiz(items, new Set([1]), new Set(["JON.1a"]), "s", 2);
    expect(picked.every((x) => x.chapter === 1)).toBe(true);
    expect(picked.map((x) => x.id)).not.toContain("1a");
    // sin nada leído, toma de todo el libro (sin las reflexivas)
    const any = pickBookQuiz(items, new Set(), new Set(), "s", 10);
    expect(any).toHaveLength(5);
    expect(any.map((x) => x.chapter)).toEqual([1, 1, 1, 1, 4]);
  });
});

describe("XP del quiz", () => {
  it("5 XP la primera vez que aciertas, 0 si ya la habías acertado o si llegaste a 20 hoy", () => {
    expect(quizAward({ correct: true, answeredBefore: false, rewardedToday: 0 })).toEqual({ type: "quiz", xp: 5 });
    expect(quizAward({ correct: true, answeredBefore: true, rewardedToday: 0 })?.xp).toBe(0);
    expect(quizAward({ correct: true, answeredBefore: false, rewardedToday: 20 })?.xp).toBe(0);
  });

  it("equivocarse no se registra ni resta", () => {
    expect(quizAward({ correct: false, answeredBefore: false, rewardedToday: 0 })).toBeNull();
  });

  it("el resumen siempre es amable", () => {
    expect(quizSummary(3, 3)).toMatch(/Muy bien/);
    expect(quizSummary(0, 3)).toMatch(/está bien/);
    expect(quizSummary(1, 3)).toMatch(/1 de 3/);
  });
});

// ---------- Desafíos mayores ----------

describe("desafíos mayores", () => {
  const { challenges } = challengesFileSchema.parse(challengesRaw);
  const mayores = challenges.filter((c) => c.tier === "mayor");
  const chapters = Object.fromEntries(booksMeta.books.map((b) => [b.code, 0]));
  Object.assign(chapters, { JHN: 21, JON: 4, GEN: 50, DAN: 12, ACT: 28 });

  it("hay 5, sin plazo, y piden preguntas de un libro que tiene quiz con suficientes preguntas", () => {
    expect(mayores.map((c) => c.id)).toEqual([
      "mayor_jonas",
      "mayor_daniel",
      "mayor_juan",
      "mayor_hechos",
      "mayor_genesis",
    ]);
    for (const c of mayores) {
      expect(c.days).toBeNull();
      for (const r of c.requirements) {
        if (r.type !== "quiz_correct") continue;
        const available = all.filter((x) => isChoice(x) && (!r.books || r.books.includes(x.book))).length;
        expect(available, c.id).toBeGreaterThanOrEqual(r.count);
      }
    }
    expect(maxActive("mayor")).toBe(2);
    expect(maxActive("normal")).toBe(3);
  });

  it("los desafíos de siempre siguen siendo normales", () => {
    expect(challenges.find((c) => c.id === "salmos_5")?.tier).toBe("normal");
  });

  it("el Evangelio de Juan pide lo del Documento Maestro y cuenta solo lo hecho sobre Juan", () => {
    const juan = mayores.find((c) => c.id === "mayor_juan")!;
    const ev = (type: string, ref: string | null, day = "2026-10-01"): ChallengeEvent => ({ type, ref, day });
    const events: ChallengeEvent[] = [
      ...Array.from({ length: 21 }, (_, i) => ev("chapter_read", `JHN.${i + 1}`)),
      ...Array.from({ length: 5 }, (_, i) => ev("reflection", `JHN.${i + 1}`)),
      ev("reflection", "GEN.1"), // no cuenta: es de otro libro
      ...Array.from({ length: 3 }, (_, i) => ev("prayer", `JHN.${i + 1}`)),
      ...Array.from({ length: 2 }, (_, i) => ev("application", `JHN.${i + 1}`)),
      ...Array.from({ length: 10 }, (_, i) => ev("quiz", `JHN.${i + 1}a`)),
      ev("quiz", "JHN.1a"), // repetida: no suma
    ];
    const p = evaluateChallenge(juan, {
      events,
      startedDay: "2026-10-01",
      today: "2026-10-05",
      bookChapters: chapters,
    });
    expect(p.requirements.map((r) => [r.label, r.current, r.target])).toEqual([
      ["Capítulos de Juan", 21, 21],
      ["Reflexiones sobre Juan", 5, 5],
      ["Oraciones después de leer Juan", 3, 3],
      ["Aplicaciones de Juan", 2, 3],
      ["Preguntas de Juan respondidas", 10, 10],
    ]);
    expect(p.done).toBe(false);
    expect(juan.xp).toBe(500);
  });

  it("cada desafío mayor tiene su insignia", () => {
    const { achievements } = achievementsFileSchema.parse(achievementsRaw);
    for (const c of mayores) {
      const a = achievements.find((x) => x.rule.type === "challenge_completed" && x.rule.challenge === c.id);
      expect(a, c.id).toBeTruthy();
      expect(a!.xp).toBe(0); // el XP ya lo da el desafío
    }
    const snap = { completedChallenges: ["mayor_jonas"] } as unknown as ProgressSnapshot;
    expect(ruleProgress({ type: "challenge_completed", challenge: "mayor_jonas" }, snap).done).toBe(true);
    expect(ruleProgress({ type: "challenge_completed", challenge: "mayor_juan" }, snap).done).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parseTime, reminderMessage, shouldRemind } from "../src/domain/reminder";
import { backupFileName, parseBackup, summarizeBackup, type Backup } from "../src/domain/backup";
import { pickQuickVerse } from "../src/domain/quickSession";
import { xpFor } from "../src/domain/xp";

describe("recordatorio diario", () => {
  const base = {
    enabled: true,
    time: "20:00",
    now: new Date(2026, 8, 24, 20, 5),
    today: "2026-09-24",
    todayDone: false,
    lastRemindedDay: null as string | null,
  };

  it("avisa después de la hora si no hiciste nada hoy", () => {
    expect(shouldRemind(base)).toBe(true);
  });
  it("no avisa antes de la hora", () => {
    expect(shouldRemind({ ...base, now: new Date(2026, 8, 24, 19, 59) })).toBe(false);
  });
  it("no avisa si ya hiciste algo hoy, si está apagado o si ya avisó hoy", () => {
    expect(shouldRemind({ ...base, todayDone: true })).toBe(false);
    expect(shouldRemind({ ...base, enabled: false })).toBe(false);
    expect(shouldRemind({ ...base, lastRemindedDay: "2026-09-24" })).toBe(false);
    expect(shouldRemind({ ...base, lastRemindedDay: "2026-09-23" })).toBe(true);
  });
  it("valida la hora", () => {
    expect(parseTime("07:30")).toEqual({ h: 7, m: 30 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("siete")).toBeNull();
    expect(shouldRemind({ ...base, time: "mala" })).toBe(false);
  });
  it("el mensaje menciona la racha cuando hay una", () => {
    expect(reminderMessage("2026-09-24", 5)).toBe("Llevas 5 días seguidos. Hoy todavía cuenta.");
    expect(reminderMessage("2026-09-24", 0)).toMatch(/\S/);
  });
});

describe("respaldo", () => {
  const sample: Backup = {
    app: "camino-de-fe",
    format: 1,
    exported_at: "2026-09-24T12:00:00.000Z",
    app_version: "1.0.0",
    tables: {
      profile: [{ id: 1, name: "Youfrend", created_at: "2026-09-23T00:00:00Z" }],
      activity_log: [
        { id: 1, type: "chapter_read", ref: "GEN.1", xp: 20, day: "2026-09-23", duration_sec: 99, created_at: "x" },
        {
          id: 2,
          type: "daily_missions_bonus",
          ref: null,
          xp: 60,
          day: "2026-09-23",
          duration_sec: null,
          created_at: "x",
        },
      ],
      chapter_progress: [{ book_id: 1, chapter: 1, times_read: 1, first_read_at: "x", last_read_at: "x" }],
      settings: [{ key: "theme", value: "dark" }],
      journal_entries: [
        {
          id: 1,
          day: "2026-09-23",
          ref: "MAT.11.28",
          kind: "reflection",
          content: "Descanso",
          emotion: null,
          created_at: "x",
          updated_at: "x",
        },
      ],
      verse_marks: [
        { ref: "MAT.5.7", color: "green", favorite: 1, created_at: "x", updated_at: "x" },
        { ref: "MAT.5.8", color: "yellow", favorite: 0, created_at: "x", updated_at: "x" },
      ],
    },
  };

  it("lee un respaldo válido y lo resume", () => {
    const b = parseBackup(JSON.stringify(sample));
    expect(summarizeBackup(b)).toEqual({
      exportedAt: "2026-09-24T12:00:00.000Z",
      activities: 2,
      chaptersRead: 1,
      journalEntries: 1,
      favorites: 1,
      totalXp: 80,
    });
  });

  it("rechaza archivos que no son respaldos", () => {
    expect(() => parseBackup("no es json")).toThrow("no es un JSON válido");
    expect(() => parseBackup(JSON.stringify({ hola: 1 }))).toThrow("no es un respaldo de Camino de Fe");
  });

  it("rechaza respaldos dañados", () => {
    const broken = structuredClone(sample) as unknown as { tables: { activity_log: { xp: unknown }[] } };
    broken.tables.activity_log[0].xp = "veinte";
    expect(() => parseBackup(JSON.stringify(broken))).toThrow("incompleto o dañado");
  });

  it("nombra el archivo con la fecha", () => {
    expect(backupFileName(new Date(2026, 8, 4))).toBe("camino-de-fe-respaldo-2026-09-04.json");
  });
});

describe("tengo 5 minutos", () => {
  const list = ["A", "B", "C"];
  it("usa el versículo del día si todavía no se leyó", () => {
    expect(pickQuickVerse(list, "B", false)).toEqual({ ref: "B", isDaily: true });
  });
  it("si ya se leyó, elige otro distinto", () => {
    expect(pickQuickVerse(list, "B", true, () => 0)).toEqual({ ref: "A", isDaily: false });
    expect(pickQuickVerse(list, "B", true, () => 0.99)).toEqual({ ref: "C", isDaily: false });
  });
  it("la lectura corta da poco XP y tiene límite", () => {
    expect(xpFor("short_reading", 0)).toBe(5);
    expect(xpFor("short_reading", 2)).toBe(0);
  });
});

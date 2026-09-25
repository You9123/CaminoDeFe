import { describe, expect, it } from "vitest";
import booksMeta from "../content/books_meta.json";
import summaries from "../content/book_summaries.json";
import challengesRaw from "../content/challenges.json";
import surprisesRaw from "../content/random_missions.json";
import { buildMap, decorations, labelPoint, MAP, PATH_LENGTH, pointAt, zoneGlow } from "../src/domain/mapLayout";
import {
  challengeDeadline,
  challengesFileSchema,
  challengeState,
  evaluateChallenge,
  overallProgress,
  type Challenge,
  type ChallengeRun,
} from "../src/domain/challenges";
import { pickSurprise, surpriseMet, surprisesFileSchema, type TodayFacts } from "../src/domain/surprise";
import { xpFor } from "../src/domain/xp";

const codes = new Set(booksMeta.books.map((b) => b.code));

// ---------- Mapa ----------

describe("mapa", () => {
  it("el camino empieza arriba a la izquierda y termina en la última fila", () => {
    expect(pointAt(0)).toEqual({ x: MAP.left, y: MAP.top });
    const end = pointAt(PATH_LENGTH);
    expect(end.y).toBe(MAP.top + (MAP.rows - 1) * MAP.rowGap);
    // 5 filas: la última va hacia la derecha
    expect(end.x).toBeCloseTo(MAP.right);
  });

  it("las medias vueltas son continuas", () => {
    const rowLen = MAP.right - MAP.left;
    const a = pointAt(rowLen - 0.001);
    const b = pointAt(rowLen + 0.001);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.01);
    // A mitad de la vuelta, el punto está a la derecha del camino
    const mid = pointAt(rowLen + (Math.PI * MAP.rowGap) / 4);
    expect(mid.x).toBeCloseTo(MAP.right + MAP.rowGap / 2);
  });

  it("ubica los 66 libros en orden, separados y dentro del camino", () => {
    const { books, zones } = buildMap(booksMeta.books);
    expect(books).toHaveLength(66);
    for (let i = 1; i < books.length; i++) {
      expect(books[i].s).toBeGreaterThan(books[i - 1].s);
      const p = books[i].point;
      const q = books[i - 1].point;
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(40); // los círculos no se tocan
    }
    expect(books[books.length - 1].s).toBeLessThanOrEqual(PATH_LENGTH);
    expect(zones.map((z) => z.zone)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const z of zones) expect(z.to).toBeGreaterThan(z.from);
  });

  it("el nombre de la zona va sobre el tramo recto con más libros", () => {
    const rows = [100, 250];
    const p = labelPoint(
      [
        { x: 900, y: 150 }, // en una curva
        { x: 300, y: 250 },
        { x: 500, y: 250 },
      ],
      rows,
    );
    expect(p).toEqual({ x: 400, y: 210 });
  });

  it("los adornos no caen sobre los nombres de zona", () => {
    const { zones } = buildMap(booksMeta.books);
    const labels = zones.map((z) => z.label);
    for (const d of decorations(labels)) {
      for (const l of labels) expect(Math.abs(l.x - d.x) >= 120 || Math.abs(l.y - d.y) > 50).toBe(true);
    }
  });

  it("una zona se enciende con el primer capítulo", () => {
    expect(zoneGlow(0, 50)).toBe(0);
    expect(zoneGlow(1, 50)).toBeGreaterThan(0.3);
    expect(zoneGlow(50, 50)).toBe(1);
  });

  it("hay un resumen para cada libro", () => {
    const s: Record<string, string> = summaries.summaries;
    for (const code of codes) expect(s[code], code).toBeTruthy();
    expect(Object.keys(s)).toHaveLength(66);
  });
});

// ---------- Desafíos ----------

const chapters = { PSA: 150, MRK: 16, RUT: 4 };

const reflexiva: Challenge = {
  id: "r",
  title: "R",
  description: "R",
  icon: "quill",
  days: 7,
  xp: 150,
  tier: "normal",
  requirements: [{ type: "activity_days", activity: "reflection", days: 3, label: "Días" }],
};

describe("desafíos", () => {
  it("cuenta capítulos distintos de los libros pedidos", () => {
    const c: Challenge = {
      ...reflexiva,
      days: null,
      requirements: [{ type: "chapters_in_books", books: ["PSA"], count: 3, label: "Salmos" }],
    };
    const p = evaluateChallenge(c, {
      events: [
        { type: "chapter_read", ref: "PSA.1", day: "2026-09-20" },
        { type: "chapter_read", ref: "PSA.1", day: "2026-09-21" }, // relectura: no suma
        { type: "chapter_read", ref: "PSA.2", day: "2026-09-21" },
        { type: "chapter_read", ref: "MRK.1", day: "2026-09-21" },
      ],
      startedDay: "2026-09-20",
      today: "2026-09-24",
      bookChapters: chapters,
    });
    expect(p.requirements[0]).toMatchObject({ current: 2, target: 3, done: false });
    expect(p.daysLeft).toBeNull();
    expect(p.expired).toBe(false);
  });

  it("libros completos: todos los capítulos", () => {
    const c: Challenge = {
      ...reflexiva,
      days: null,
      requirements: [{ type: "books_read", books: ["RUT"], label: "Rut" }],
    };
    const events = [1, 2, 3, 4].map((n) => ({ type: "chapter_read", ref: `RUT.${n}`, day: "2026-09-22" }));
    const p = evaluateChallenge(c, { events, startedDay: "2026-09-22", today: "2026-09-22", bookChapters: chapters });
    expect(p.done).toBe(true);
    expect(overallProgress(p)).toBe(1);
  });

  it("plazo: el día en que empieza es el día 1", () => {
    expect(challengeDeadline({ days: 7 }, "2026-09-21")).toBe("2026-09-27");
    expect(challengeDeadline({ days: null }, "2026-09-21")).toBeNull();
    const p = evaluateChallenge(reflexiva, {
      events: [],
      startedDay: "2026-09-21",
      today: "2026-09-27",
      bookChapters: chapters,
    });
    expect(p.daysLeft).toBe(1);
    expect(p.expired).toBe(false);
  });

  it("días distintos; lo de después del plazo no cuenta y vence sin castigo", () => {
    const events = ["2026-09-21", "2026-09-21", "2026-09-22", "2026-09-29"].map((day) => ({
      type: "reflection",
      ref: null,
      day,
    }));
    const p = evaluateChallenge(reflexiva, {
      events,
      startedDay: "2026-09-21",
      today: "2026-09-29",
      bookChapters: chapters,
    });
    expect(p.requirements[0].current).toBe(2);
    expect(p.expired).toBe(true);
    expect(p.daysLeft).toBe(0);
  });

  it("estado según los intentos", () => {
    const run = (status: ChallengeRun["status"], id = 1): ChallengeRun => ({
      id,
      challenge_id: "x",
      started_at: "t",
      started_day: "2026-09-20",
      status,
      ended_at: null,
    });
    expect(challengeState([], "x").state).toBe("available");
    expect(challengeState([run("expired")], "x")).toMatchObject({ state: "available", previousTries: 1 });
    expect(challengeState([run("expired"), run("active", 2)], "x").state).toBe("active");
    expect(challengeState([run("completed")], "x").state).toBe("completed");
  });

  it("content/challenges.json es válido y usa libros que existen", () => {
    const file = challengesFileSchema.parse(challengesRaw);
    expect(file.challenges.length).toBeGreaterThanOrEqual(8);
    for (const c of file.challenges) {
      for (const r of c.requirements) {
        if ("books" in r) for (const b of r.books ?? []) expect(codes, `${c.id}: ${b}`).toContain(b);
        if (r.type === "activity_days" && c.days !== null) expect(r.days).toBeLessThanOrEqual(c.days);
      }
    }
  });
});

// ---------- Misión sorpresa ----------

const noFacts: TodayFacts = {
  chaptersRead: [],
  favoritedToday: false,
  highlightedToday: false,
  prayerSeconds: [],
  freeJournalToday: false,
};

describe("misión sorpresa", () => {
  const file = surprisesFileSchema.parse(surprisesRaw);

  it("es la misma todo el día y cambia al día siguiente", () => {
    const list = file.missions;
    expect(pickSurprise(list, "2026-09-24")).toBe(pickSurprise(list, "2026-09-24"));
    const week = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"];
    expect(new Set(week.map((d) => pickSurprise(list, d).id)).size).toBe(7);
  });

  it("se comprueba con lo que pasó hoy", () => {
    expect(surpriseMet({ type: "read_chapter", books: ["PSA"] }, noFacts)).toBe(false);
    expect(surpriseMet({ type: "read_chapter", books: ["PSA"] }, { ...noFacts, chaptersRead: ["PSA.23"] })).toBe(true);
    expect(surpriseMet({ type: "read_chapter", books: ["PSA"] }, { ...noFacts, chaptersRead: ["PRO.3"] })).toBe(false);
    expect(surpriseMet({ type: "favorite" }, { ...noFacts, favoritedToday: true })).toBe(true);
    expect(surpriseMet({ type: "highlight" }, { ...noFacts, highlightedToday: true })).toBe(true);
    expect(surpriseMet({ type: "prayer_minutes", minutes: 3 }, { ...noFacts, prayerSeconds: [60, 178] })).toBe(true);
    expect(surpriseMet({ type: "prayer_minutes", minutes: 5 }, { ...noFacts, prayerSeconds: [180] })).toBe(false);
    expect(surpriseMet({ type: "journal_free" }, { ...noFacts, freeJournalToday: true })).toBe(true);
    expect(surpriseMet({ type: "manual" }, { ...noFacts, favoritedToday: true })).toBe(false);
  });

  it("da 20 XP una vez al día", () => {
    expect(xpFor("surprise_mission", 0)).toBe(20);
    expect(xpFor("surprise_mission", 1)).toBe(0);
  });

  it("content/random_missions.json: libros y rutas válidos, sin emojis", () => {
    const routes = /^\/(biblia(\/buscar|\/[1-3A-Z]{3})?|diario|mapa|misiones)$/;
    for (const m of file.missions) {
      if (m.check.type === "read_chapter") for (const b of m.check.books) expect(codes, `${m.id}: ${b}`).toContain(b);
      if (m.link) expect(m.link.to, m.id).toMatch(routes);
    }
    expect(JSON.stringify(surprisesRaw)).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(JSON.stringify(challengesRaw)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

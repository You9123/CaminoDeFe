import { describe, expect, it } from "vitest";
import raw from "../content/achievements.json";
import booksMeta from "../content/books_meta.json";
import { RANKS, rankForLevel } from "../src/domain/ranks";
import {
  achievementsFileSchema,
  achievementViews,
  newlyUnlocked,
  ruleProgress,
  type Achievement,
  type ProgressSnapshot,
} from "../src/domain/achievements";
import { isCosmeticActive, nextStreakReward, streakRewards } from "../src/domain/cosmetics";
import {
  formatDuration,
  heatLevel,
  heatmap,
  heatmapMonths,
  totals,
  weeklySeries,
  zoneProgress,
  type DayTypeRow,
} from "../src/domain/stats";

// ---------- Rangos ----------

describe("rangos", () => {
  it("siguen la tabla del documento maestro", () => {
    expect(RANKS.map((r) => r.level)).toEqual([1, 5, 10, 20, 30, 40, 50]);
  });
  it("se asignan por nivel", () => {
    expect(rankForLevel(1).rank.title).toBe("Comenzando el camino");
    expect(rankForLevel(4).rank.id).toBe("comenzando");
    expect(rankForLevel(5).rank.id).toBe("caminante");
    expect(rankForLevel(19).rank.id).toBe("buscador");
    expect(rankForLevel(20).next?.id).toBe("perseverante");
    expect(rankForLevel(80).rank.id).toBe("peregrino");
    expect(rankForLevel(80).next).toBeNull();
  });
});

// ---------- Logros ----------

const books: ProgressSnapshot["books"] = {
  GEN: { chapters: 50, testament: "AT" },
  PSA: { chapters: 150, testament: "AT" },
  MRK: { chapters: 16, testament: "NT" },
  JUD: { chapters: 1, testament: "NT" },
};

const snap = (over: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  readByBook: {},
  books,
  bestStreak: 0,
  activityCounts: {},
  level: 1,
  ...over,
});

const ach = (id: string, rule: Achievement["rule"], xp = 10): Achievement => ({
  id,
  group: "g",
  title: id,
  description: id,
  icon: "book",
  rule,
  xp,
});

describe("motor de logros", () => {
  it("cuenta capítulos distintos sumando todos los libros", () => {
    const p = ruleProgress({ type: "chapters_read_count", count: 10 }, snap({ readByBook: { GEN: 7, MRK: 5 } }));
    expect(p).toEqual({ current: 10, target: 10, done: true });
  });

  it("un libro está completo solo con todos sus capítulos", () => {
    const rule = { type: "books_completed_count", count: 1 } as const;
    expect(ruleProgress(rule, snap({ readByBook: { MRK: 15 } })).done).toBe(false);
    expect(ruleProgress(rule, snap({ readByBook: { MRK: 16 } })).done).toBe(true);
    expect(
      ruleProgress({ type: "books_completed_count", count: 2 }, snap({ readByBook: { MRK: 16, JUD: 1 } })).done,
    ).toBe(true);
  });

  it("libros concretos o un testamento avanzan por capítulos", () => {
    const nt = ruleProgress({ type: "books_completed", testament: "NT" }, snap({ readByBook: { MRK: 16 } }));
    expect(nt).toEqual({ current: 16, target: 17, done: false });
    const all = ruleProgress({ type: "books_completed", testament: "ALL" }, snap({ readByBook: { MRK: 16 } }));
    expect(all.target).toBe(217);
    const psa = ruleProgress({ type: "books_completed", books: ["PSA"] }, snap({ readByBook: { PSA: 150 } }));
    expect(psa.done).toBe(true);
  });

  it("el progreso nunca pasa del objetivo", () => {
    expect(ruleProgress({ type: "streak_reached", days: 7 }, snap({ bestStreak: 40 }))).toEqual({
      current: 7,
      target: 7,
      done: true,
    });
  });

  it("devuelve solo los nuevos, en el orden del catálogo", () => {
    const catalog = [
      ach("a", { type: "activity_count", activity: "prayer", count: 1 }),
      ach("b", { type: "level_reached", level: 5 }),
      ach("c", { type: "streak_reached", days: 3 }),
    ];
    const s = snap({ activityCounts: { prayer: 2 }, level: 6, bestStreak: 1 });
    expect(newlyUnlocked(catalog, s, new Set()).map((a) => a.id)).toEqual(["a", "b"]);
    expect(newlyUnlocked(catalog, s, new Set(["a"])).map((a) => a.id)).toEqual(["b"]);
  });

  it("la vista marca fecha de desbloqueo y progreso", () => {
    const catalog = [ach("a", { type: "activity_count", activity: "reflection", count: 5 })];
    const [v] = achievementViews(catalog, snap({ activityCounts: { reflection: 2 } }), new Map());
    expect(v.unlockedAt).toBeNull();
    expect(v.progress).toEqual({ current: 2, target: 5, done: false });
  });

  it("rechaza reglas mal escritas", () => {
    const bad = (rule: unknown) =>
      achievementsFileSchema.safeParse({
        groups: [{ id: "g", title: "G" }],
        achievements: [{ ...ach("x", { type: "level_reached", level: 2 }), rule }],
      }).success;
    expect(bad({ type: "level_reached", level: 2 })).toBe(true);
    expect(bad({ type: "books_completed" })).toBe(false);
    expect(bad({ type: "books_completed", books: ["GEN"], testament: "AT" })).toBe(false);
    expect(bad({ type: "activity_count", activity: "achievement", count: 1 })).toBe(false);
    expect(bad({ type: "nadar", count: 1 })).toBe(false);
  });
});

describe("content/achievements.json", () => {
  const file = achievementsFileSchema.parse(raw);
  const codes = new Set(booksMeta.books.map((b) => b.code));

  it("es válido y sin ids repetidos", () => {
    expect(file.achievements.length).toBeGreaterThanOrEqual(20);
  });

  it("solo usa códigos de libros que existen", () => {
    for (const a of file.achievements) {
      if (a.rule.type === "books_completed" && a.rule.books) {
        for (const c of a.rule.books) expect(codes, `${a.id}: ${c}`).toContain(c);
      }
    }
  });

  it("los logros de nivel no dan XP (evita XP por subir de nivel)", () => {
    for (const a of file.achievements) if (a.rule.type === "level_reached") expect(a.xp).toBe(0);
  });

  it("no usa emojis", () => {
    expect(JSON.stringify(raw)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

// ---------- Recompensas por racha ----------

describe("recompensas por racha", () => {
  it("se ganan con el récord y no se pierden", () => {
    const r = streakRewards(8);
    expect(r.filter((x) => x.unlocked).map((x) => x.days)).toEqual([3, 7]);
    expect(nextStreakReward(8)?.days).toBe(14);
    expect(nextStreakReward(8)?.daysLeft).toBe(6);
    expect(nextStreakReward(500)).toBeNull();
  });

  it("un adorno está activo si se ganó, se puede usar ya y no se apagó", () => {
    expect(isCosmeticActive("olive_branch", 2, new Set())).toBe(false);
    expect(isCosmeticActive("olive_branch", 3, new Set())).toBe(true);
    expect(isCosmeticActive("olive_branch", 3, new Set(["olive_branch"]))).toBe(false);
    // La bufanda no se "prende" aquí: se le pone a la mascota en Ajustes
    expect(isCosmeticActive("pet_scarf", 50, new Set())).toBe(false);
  });
});

// ---------- Estadísticas ----------

const row = (day: string, type: string, n = 1, secs = 0, xp = 0): DayTypeRow => ({ day, type, n, secs, xp });

describe("estadísticas", () => {
  const rows = [
    row("2026-09-21", "chapter_read", 2, 600, 40),
    row("2026-09-21", "prayer", 1, 180, 10),
    row("2026-09-22", "reflection", 1, 0, 15),
    row("2026-09-22", "daily_missions_bonus", 1, 0, 60),
    row("2026-09-23", "achievement", 3, 0, 50),
    row("2026-09-14", "chapter_read", 1, 300, 20),
  ];

  it("totales: tiempo de lectura y oración, días con actividad propia", () => {
    const t = totals(rows);
    expect(t.chapterReadings).toBe(3);
    expect(t.prayers).toBe(1);
    expect(t.reflections).toBe(1);
    expect(t.seconds).toBe(1080);
    expect(t.xp).toBe(195);
    // El 23 solo tiene logros: no cuenta como día activo
    expect(t.activeDays).toBe(3);
  });

  it("formatea duraciones", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(59 * 60)).toBe("59 min");
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(14 * 3600 + 32 * 60 + 10)).toBe("14 h 32 min");
  });

  it("heatmap: semanas de lunes a domingo que terminan hoy", () => {
    const grid = heatmap(rows, "2026-09-24", 3);
    expect(grid).toHaveLength(3);
    expect(grid[0][0].day).toBe("2026-09-07");
    expect(grid[2][0].day).toBe("2026-09-21");
    expect(grid[2][0].count).toBe(3);
    expect(grid[2][2].count).toBe(0); // el 23: solo logros
    expect(grid[2][4].future).toBe(true); // viernes 25
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(2)).toBe(1);
    expect(heatLevel(9)).toBe(4);
  });

  it("heatmap: rotula los meses donde empiezan", () => {
    const grid = heatmap([], "2026-10-07", 6);
    const months = heatmapMonths(grid);
    // La primera columna (31 ago) no se rotula porque el mes queda cortado
    expect(months).toEqual([
      { week: 1, label: "sep" },
      { week: 5, label: "oct" },
    ]);
  });

  it("serie semanal", () => {
    const w = weeklySeries(rows, "2026-09-24", 3);
    expect(w.map((p) => p.weekStart)).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
    expect(w[1]).toMatchObject({ chapters: 1, minutes: 5, activeDays: 1 });
    expect(w[2]).toMatchObject({ chapters: 2, minutes: 13, activeDays: 2 });
  });

  it("progreso por zonas", () => {
    const z = zoneProgress(
      [
        { id: 1, name: "Uno" },
        { id: 2, name: "Dos" },
      ],
      [
        { code: "GEN", zone: 1, chapters: 50 },
        { code: "EXO", zone: 1, chapters: 40 },
        { code: "MRK", zone: 2, chapters: 16 },
      ],
      { GEN: 50, EXO: 3, MRK: 20 },
    );
    expect(z[0]).toMatchObject({ read: 53, total: 90, booksDone: 1, books: 2 });
    expect(z[1]).toMatchObject({ read: 16, total: 16, booksDone: 1 });
  });
});

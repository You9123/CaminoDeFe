import { describe, expect, it } from "vitest";
import { computeStreak } from "../src/domain/streaks";
import { activityAwards, missionProgress } from "../src/domain/missions";

// Semana de referencia: lunes 21 al domingo 27 de septiembre de 2026.
describe("rachas", () => {
  it("sin actividad: racha 0 y la semana vacía", () => {
    const s = computeStreak([], "2026-09-24");
    expect(s).toMatchObject({ current: 0, best: 0, todayDone: false, graceAvailable: true });
    expect(s.week.map((d) => d.status)).toEqual(["empty", "empty", "empty", "today", "future", "future", "future"]);
  });

  it("cuenta días seguidos", () => {
    const s = computeStreak(["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"], "2026-09-24");
    expect(s).toMatchObject({ current: 4, best: 4, todayDone: true });
  });

  it("hoy sin actividad todavía no rompe la racha", () => {
    const s = computeStreak(["2026-09-22", "2026-09-23"], "2026-09-24");
    expect(s).toMatchObject({ current: 2, todayDone: false });
    expect(s.week[3].status).toBe("today");
  });

  it("el día de gracia cubre UN día faltante y no suma", () => {
    const s = computeStreak(["2026-09-21", "2026-09-22", "2026-09-24"], "2026-09-24");
    expect(s.current).toBe(3);
    expect(s.week[2].status).toBe("grace");
    expect(s.graceAvailable).toBe(false);
  });

  it("si ayer faltó y hoy está pendiente, la gracia protege la racha", () => {
    const s = computeStreak(["2026-09-21", "2026-09-22"], "2026-09-24");
    expect(s.current).toBe(2);
    expect(s.week[2].status).toBe("grace");
  });

  it("dos días seguidos sin actividad cortan la racha, pero el récord se conserva", () => {
    const s = computeStreak(["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-21"], "2026-09-24");
    expect(s.current).toBe(0);
    expect(s.best).toBe(4);
  });

  it("solo hay un día de gracia por semana", () => {
    // Faltó el martes 22 (gracia) y el jueves 24 (ya no hay gracia) → se corta.
    const s = computeStreak(["2026-09-21", "2026-09-23", "2026-09-25"], "2026-09-26");
    expect(s.week[1].status).toBe("grace");
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it("la gracia se recarga cada lunes", () => {
    // Faltó domingo 20 (semana anterior) y martes 22 (esta semana): ambos cubiertos.
    const s = computeStreak(["2026-09-18", "2026-09-19", "2026-09-21", "2026-09-23"], "2026-09-23");
    expect(s.current).toBe(4);
    expect(s.graceAvailable).toBe(false);
  });

  it("sin racha activa no se gasta la gracia", () => {
    const s = computeStreak(["2026-09-24"], "2026-09-24");
    expect(s).toMatchObject({ current: 1, graceAvailable: true });
  });

  it("ignora días futuros (cambios de reloj)", () => {
    expect(computeStreak(["2026-09-24", "2026-09-30"], "2026-09-24").current).toBe(1);
  });
});

describe("misiones diarias", () => {
  it("calcula el progreso", () => {
    const p = missionProgress(new Set(["daily_verse", "prayer", "chapter_read"]));
    expect(p).toMatchObject({ completed: 2, total: 4, allDone: false });
  });

  it("da el bono al completar la cuarta misión", () => {
    const awards = activityAwards("application", {
      rewardedTimesToday: 0,
      doneTypesToday: new Set(["daily_verse", "reflection", "prayer"]),
      bonusAlreadyGiven: false,
    });
    expect(awards).toEqual([
      { type: "application", xp: 10 },
      { type: "daily_missions_bonus", xp: 60 },
    ]);
  });

  it("no repite el bono", () => {
    const awards = activityAwards("prayer", {
      rewardedTimesToday: 1,
      doneTypesToday: new Set(["daily_verse", "reflection", "prayer", "application"]),
      bonusAlreadyGiven: true,
    });
    expect(awards).toEqual([{ type: "prayer", xp: 10 }]);
  });

  it("registra la actividad con 0 XP si se pasó el límite diario", () => {
    const awards = activityAwards("daily_verse", {
      rewardedTimesToday: 1,
      doneTypesToday: new Set(["daily_verse"]),
      bonusAlreadyGiven: false,
    });
    expect(awards).toEqual([{ type: "daily_verse", xp: 0 }]);
  });
});

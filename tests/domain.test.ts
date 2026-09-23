import { describe, expect, it } from "vitest";
import { gameDay, greeting } from "../src/domain/day";
import { levelFromXp, totalXpForLevel, xpToNextLevel } from "../src/domain/levels";
import { chapterReadAwards, xpFor } from "../src/domain/xp";
import { estimatedReadSeconds, minSecondsToCount } from "../src/domain/reading";
import { parseChapterRef, parseVerseRef } from "../src/domain/refs";
import { dayIndex, pickDailyVerse } from "../src/domain/dailyVerse";

describe("gameDay", () => {
  it("antes de las 3 a. m. cuenta como el día anterior", () => {
    expect(gameDay(new Date(2026, 8, 24, 1, 30))).toBe("2026-09-23");
    expect(gameDay(new Date(2026, 8, 24, 2, 59))).toBe("2026-09-23");
  });
  it("desde las 3 a. m. es el día nuevo", () => {
    expect(gameDay(new Date(2026, 8, 24, 3, 0))).toBe("2026-09-24");
    expect(gameDay(new Date(2026, 8, 24, 23, 59))).toBe("2026-09-24");
  });
  it("saludo según la hora", () => {
    expect(greeting(new Date(2026, 0, 1, 7))).toBe("Buenos días");
    expect(greeting(new Date(2026, 0, 1, 15))).toBe("Buenas tardes");
    expect(greeting(new Date(2026, 0, 1, 22))).toBe("Buenas noches");
  });
});

describe("niveles", () => {
  it("coincide con la tabla del documento maestro", () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(5)).toBe(550);
    expect(totalXpForLevel(10)).toBe(1800);
    expect(totalXpForLevel(20)).toBe(6175);
    expect(totalXpForLevel(30)).toBe(13050);
    expect(totalXpForLevel(50)).toBe(34300);
  });
  it("levelFromXp es consistente con totalXpForLevel", () => {
    for (let lvl = 1; lvl <= 60; lvl++) {
      const xp = totalXpForLevel(lvl);
      expect(levelFromXp(xp).level).toBe(lvl);
      expect(levelFromXp(xp).xpIntoLevel).toBe(0);
      if (xp > 0) expect(levelFromXp(xp - 1).level).toBe(lvl - 1);
    }
  });
  it("calcula el progreso dentro del nivel", () => {
    const info = levelFromXp(150);
    expect(info).toMatchObject({ level: 2, xpIntoLevel: 50, xpForNext: xpToNextLevel(2) });
    expect(info.progress).toBeCloseTo(50 / 125);
  });
  it("XP negativo o decimal no rompe nada", () => {
    expect(levelFromXp(-20).level).toBe(1);
    expect(levelFromXp(99.9).level).toBe(1);
  });
});

describe("XP", () => {
  it("respeta los límites diarios", () => {
    expect(xpFor("prayer", 0)).toBe(10);
    expect(xpFor("prayer", 1)).toBe(10);
    expect(xpFor("prayer", 2)).toBe(0);
    expect(xpFor("daily_verse", 1)).toBe(0);
    expect(xpFor("chapter_read", 500)).toBe(20);
  });
  it("releer el mismo capítulo el mismo día no da XP", () => {
    expect(
      chapterReadAwards({ alreadyReadThisChapterToday: true, distinctChaptersToday: 4, bonusAlreadyGiven: false }),
    ).toEqual([{ type: "chapter_read", xp: 0 }]);
  });
  it("da el bono al llegar al 5.º capítulo, una sola vez", () => {
    const fourth = chapterReadAwards({
      alreadyReadThisChapterToday: false,
      distinctChaptersToday: 3,
      bonusAlreadyGiven: false,
    });
    expect(fourth.map((a) => a.type)).toEqual(["chapter_read"]);

    const fifth = chapterReadAwards({
      alreadyReadThisChapterToday: false,
      distinctChaptersToday: 4,
      bonusAlreadyGiven: false,
    });
    expect(fifth).toEqual([
      { type: "chapter_read", xp: 20 },
      { type: "bonus_5_chapters", xp: 50 },
    ]);

    const sixth = chapterReadAwards({
      alreadyReadThisChapterToday: false,
      distinctChaptersToday: 5,
      bonusAlreadyGiven: true,
    });
    expect(sixth.map((a) => a.type)).toEqual(["chapter_read"]);
  });
});

describe("lectura", () => {
  it("estima el tiempo a 200 palabras por minuto", () => {
    expect(estimatedReadSeconds(200)).toBe(60);
    expect(estimatedReadSeconds(600)).toBe(180);
  });
  it("tiempo mínimo = 40 % del estimado, con un piso de 10 s", () => {
    expect(minSecondsToCount(600)).toBe(72);
    expect(minSecondsToCount(20)).toBe(10);
  });
});

describe("referencias", () => {
  it("interpreta referencias válidas", () => {
    expect(parseVerseRef("PSA.118.24")).toEqual({ book: "PSA", chapter: 118, verse: 24 });
    expect(parseVerseRef("1JN.4.19")).toEqual({ book: "1JN", chapter: 4, verse: 19 });
    expect(parseChapterRef("JHN.3")).toEqual({ book: "JHN", chapter: 3 });
  });
  it("rechaza referencias mal formadas", () => {
    expect(parseVerseRef("Juan 3:16")).toBeNull();
    expect(parseVerseRef("JHN.3")).toBeNull();
    expect(parseChapterRef("JHN.3.16")).toBeNull();
  });
});

describe("versículo del día", () => {
  it("es determinista y avanza un elemento por día", () => {
    const list = ["a", "b", "c"];
    expect(pickDailyVerse(list, "2026-09-23")).toBe(pickDailyVerse(list, "2026-09-23"));
    const i = dayIndex("2026-09-23");
    expect(dayIndex("2026-09-24")).toBe(i + 1);
    expect(pickDailyVerse(list, "2026-09-24")).toBe(list[(i + 1) % 3]);
  });
});

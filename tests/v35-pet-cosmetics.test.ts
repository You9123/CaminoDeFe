/**
 * Sprint 3.5D: reacciones de la mascota, frases con datos del día y un solo catálogo de cosméticos (ADR-0015).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import raw from "../content/achievements.json";
import {
  COSMETICS,
  cosmeticUnlocked,
  cosmeticViews,
  isCosmeticActive,
  levelUnlocks,
  levelUpMessage,
  newUnlocks,
  NO_FACTS,
  type CosmeticFacts,
} from "../src/domain/cosmetics";
import { cosmeticFacts } from "../src/domain/cosmeticFacts";
import {
  ACCESSORY_IDS,
  PET_ACCESSORIES,
  PET_SPECIES,
  PET_STAGES,
  petLine,
  petMood,
  petReaction,
  petStage,
  wornAccessory,
} from "../src/domain/pet";
import { PetArt } from "../src/components/pet/PetArt";

const facts = (over: Partial<CosmeticFacts> = {}): CosmeticFacts => ({ ...NO_FACTS, ...over });
const byId = (id: string) => COSMETICS.find((c) => c.id === id)!;

describe("un solo catálogo de cosméticos", () => {
  it("ids únicos y los de antes se conservan (lo guardado sigue valiendo)", () => {
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const old of [
      "olive_branch",
      "leaves_background",
      "map_frame",
      "golden_seal",
      "bufanda",
      "flores",
      "campanita",
    ])
      expect(ids).toContain(old);
  });

  it("reúne los accesorios de la mascota y las recompensas de racha", () => {
    expect(PET_ACCESSORIES.map((a) => a.id)).toEqual([...ACCESSORY_IDS]);
    expect(COSMETICS.filter((c) => c.unlock.type === "streak").map((c) => c.id)).toEqual([
      "olive_branch",
      "bufanda",
      "leaves_background",
      "map_frame",
      "golden_seal",
    ]);
  });

  it("todo se gana: los logros que piden existen y nada se compra", () => {
    const ids = new Set(raw.achievements.map((a) => a.id));
    for (const c of COSMETICS) {
      if (c.unlock.type === "achievement") expect(ids).toContain(c.unlock.id);
      expect(JSON.stringify(c)).not.toMatch(/precio|monedas|comprar|tienda/i);
    }
  });

  it("los accesorios no se prenden como adornos; se eligen para la mascota", () => {
    for (const c of COSMETICS) if (c.type === "pet_accessory") expect(c.toggle).toBeFalsy();
    expect(isCosmeticActive("bufanda", facts({ bestStreak: 99 }), new Set())).toBe(false);
  });

  it("se gana con racha, logro, nivel o desafío mayor", () => {
    expect(cosmeticUnlocked(byId("olive_branch"), facts({ bestStreak: 3 }))).toBe(true);
    expect(cosmeticUnlocked(byId("flores"), facts({ achievements: new Set(["first_book"]) }))).toBe(true);
    expect(cosmeticUnlocked(byId("panuelo"), facts({ level: 14 }))).toBe(false);
    expect(cosmeticUnlocked(byId("panuelo"), facts({ level: 15 }))).toBe(true);
    expect(cosmeticUnlocked(byId("laurel"), facts())).toBe(false);
    expect(cosmeticUnlocked(byId("laurel"), facts({ majorChallenges: 1 }))).toBe(true);
    expect(isCosmeticActive("laurel_badge", facts({ majorChallenges: 1 }), new Set())).toBe(true);
    expect(isCosmeticActive("laurel_badge", facts({ majorChallenges: 1 }), new Set(["laurel_badge"]))).toBe(false);
  });

  it("los desafíos mayores se cuentan por sus insignias", () => {
    const majors = raw.achievements.filter((a) => a.rule.type === "challenge_completed").map((a) => a.id);
    expect(cosmeticFacts(0, 1, ["first_chapter"], majors).majorChallenges).toBe(0);
    expect(cosmeticFacts(0, 1, ["first_chapter", majors[0]], majors).majorChallenges).toBe(1);
  });

  it("dice qué falta solo con números, sin presión", () => {
    const v = cosmeticViews(facts({ bestStreak: 5, level: 13 }));
    expect(v.find((c) => c.id === "bufanda")!.missing).toBe("Faltan 2 días");
    expect(v.find((c) => c.id === "panuelo")!.missing).toBe("Faltan 2 niveles");
    expect(v.find((c) => c.id === "panuelo")!.how).toBe("Nivel 15");
    expect(v.find((c) => c.id === "olive_branch")!.missing).toBeNull();
  });
});

describe("desbloqueos nuevos", () => {
  it("solo se anuncia lo que de verdad es nuevo", () => {
    expect(newUnlocks(facts({ bestStreak: 6 }), facts({ bestStreak: 7 })).map((c) => c.id)).toEqual(["bufanda"]);
    expect(newUnlocks(facts({ bestStreak: 7 }), facts({ bestStreak: 8 }))).toEqual([]);
    expect(newUnlocks(facts(), facts({ majorChallenges: 1 })).map((c) => c.id)).toEqual(["laurel", "laurel_badge"]);
  });

  it("la subida de nivel menciona los desbloqueos solo si hay", () => {
    expect(levelUnlocks(14, 15).map((c) => c.id)).toEqual(["panuelo"]);
    expect(levelUnlocks(15, 16)).toEqual([]);
    const unlocks = newUnlocks(facts({ level: 14 }), facts({ level: 15 }));
    expect(levelUpMessage(14, 15, unlocks, true)).toBe("Llegaste al nivel 15 · Desbloqueaste: Pañuelo de viaje");
    expect(levelUpMessage(15, 16, [], true)).toBe("Llegaste al nivel 16");
    // Sin mascota, el pañuelo no se menciona.
    expect(levelUpMessage(14, 15, unlocks, false)).toBe("Llegaste al nivel 15");
    const lamp = newUnlocks(facts({ level: 24 }), facts({ level: 25 }));
    expect(levelUpMessage(24, 25, lamp, false)).toBe("Llegaste al nivel 25 · Desbloqueaste: Lámpara del camino");
  });
});

describe("reacciones de la mascota", () => {
  const none = { activities: [], discoveries: 0, levelUp: false, achievements: 0, challenges: 0 };

  it("curiosa al descubrir; celebra al leer, completar misiones o desafíos", () => {
    expect(petReaction({ ...none, activities: ["chapter_read"], discoveries: 2 })).toBe("curious");
    expect(petReaction({ ...none, activities: ["chapter_read"] })).toBe("celebrating");
    expect(petReaction({ ...none, activities: ["prayer", "daily_missions_bonus"] })).toBe("celebrating");
    expect(petReaction({ ...none, challenges: 1 })).toBe("celebrating");
    expect(petReaction({ ...none, levelUp: true })).toBe("celebrating");
  });

  it("no reacciona a todo", () => {
    expect(petReaction({ ...none, activities: ["reflection"] })).toBeNull();
    expect(petReaction({ ...none, activities: ["prayer"] })).toBeNull();
    expect(petReaction(none)).toBeNull();
  });

  it("la reacción manda sobre el ánimo del día, aunque esté dormida", () => {
    expect(petMood({ reaction: "curious", celebrating: false, todayDone: false, daysSinceActivity: 5 })).toBe(
      "curious",
    );
    expect(petMood({ reaction: null, celebrating: false, todayDone: true, daysSinceActivity: 0 })).toBe("happy");
  });
});

describe("frases con datos del día", () => {
  const ctx = { userName: "Youfrend", hour: 10, allMissionsDone: false, seed: 0 };

  it("habla de lo que hiciste hoy", () => {
    const lines = new Set(
      [0, 1, 2, 3].map((seed) =>
        petLine("happy", { ...ctx, seed, chaptersToday: 2, discoveredToday: { name: "Eva", person: true } }),
      ),
    );
    expect(lines).toContain("Hoy llevas 2 capítulos.");
    expect(lines).toContain("Hoy descubriste a Eva.");
    expect(petLine("curious", { ...ctx, discoveredToday: { name: "Eva", person: true } })).toBe("Descubriste a Eva.");
    expect(petLine("curious", { ...ctx, discoveredToday: { name: "La caída", person: false } })).toBe(
      "Descubriste la caída.",
    );
    expect(petLine("curious", { ...ctx, discoveredToday: { name: "Egipto", person: false } })).toBe(
      "Descubriste Egipto.",
    );
  });

  it("sin datos, frases cálidas de siempre; nunca culpa ni signos de exclamación", () => {
    expect(petLine("happy", ctx)).toBe("Qué bueno leer juntos hoy.");
    const all = new Set<string>();
    for (const mood of ["idle", "happy", "sleeping", "celebrating", "curious"] as const)
      for (let seed = 0; seed < 6; seed++)
        for (const chaptersToday of [0, 1, 3])
          all.add(
            petLine(mood, {
              ...ctx,
              seed,
              chaptersToday,
              discoveredToday: seed % 2 ? { name: "Juan el Bautista", person: true } : null,
            }),
          );
    for (const line of all) {
      expect(line.length).toBeLessThanOrEqual(48);
      expect(line).not.toMatch(/!|fallaste|perdiste|abandon|deberías/i);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("mascota: evolución, arte y apagada", () => {
  it("evoluciona por nivel y nunca retrocede", () => {
    let last = -1;
    for (let level = 1; level <= 60; level++) {
      const i = petStage(level).index;
      expect(i).toBeGreaterThanOrEqual(last);
      last = i;
    }
    expect(last).toBe(PET_STAGES.length - 1);
  });

  it("se dibuja con cada especie, ánimo y accesorio sin romperse", () => {
    for (const species of PET_SPECIES)
      for (const mood of ["idle", "happy", "sleeping", "celebrating", "curious"] as const)
        for (const accessory of [null, ...ACCESSORY_IDS]) {
          const svg = renderToStaticMarkup(createElement(PetArt, { species, stage: "joven", mood, accessory }));
          expect(svg).toContain("<svg");
        }
  });

  it("apagada o sin elegir no lleva accesorios ni rompe nada", () => {
    expect(wornAccessory(null, facts({ bestStreak: 100 }))).toBeNull();
    expect(wornAccessory("laurel", facts())).toBeNull();
    expect(wornAccessory("laurel", facts({ majorChallenges: 1 }))).toBe("laurel");
  });
});

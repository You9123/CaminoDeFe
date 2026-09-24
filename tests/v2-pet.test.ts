import { describe, expect, it } from "vitest";
import {
  accessoryUnlocked,
  isPetSpecies,
  PET_ACCESSORIES,
  petLine,
  petMood,
  petStage,
  SPECIES_INFO,
  stageGear,
  wornAccessory,
} from "../src/domain/pet";
import raw from "../content/achievements.json";

describe("mascota", () => {
  it("evoluciona con el nivel: 1, 5, 10, 20 y 30", () => {
    expect(petStage(1).id).toBe("bebe");
    expect(petStage(4).id).toBe("bebe");
    expect(petStage(5).id).toBe("joven");
    expect(petStage(10).id).toBe("aventurera");
    expect(petStage(20).id).toBe("tunica");
    expect(petStage(30).id).toBe("guardiana");
    expect(petStage(99).next).toBeNull();
    expect(petStage(12).next?.level).toBe(20);
  });

  it("la ropa se va sumando con las etapas", () => {
    expect(stageGear("bebe")).toMatchObject({ satchel: false, tunic: false, guardian: false });
    expect(stageGear("aventurera")).toMatchObject({ satchel: true, tunic: false });
    expect(stageGear("guardiana")).toMatchObject({ satchel: true, tunic: true, guardian: true, size: 1 });
    expect(stageGear("bebe").size).toBeLessThan(stageGear("joven").size);
  });

  it("especies válidas y nombres por defecto", () => {
    expect(isPetSpecies("oveja")).toBe(true);
    expect(isPetSpecies("none")).toBe(false);
    expect(isPetSpecies(null)).toBe(false);
    expect(SPECIES_INFO.oveja.defaultName).toBe("Lana");
  });

  it("los accesorios se ganan con racha o logros, y solo se lleva uno ganado", () => {
    const scarf = PET_ACCESSORIES.find((a) => a.id === "bufanda")!;
    expect(accessoryUnlocked(scarf, 6, new Set())).toBe(false);
    expect(accessoryUnlocked(scarf, 7, new Set())).toBe(true);
    expect(wornAccessory("flores", 0, new Set())).toBeNull();
    expect(wornAccessory("flores", 0, new Set(["first_book"]))).toBe("flores");
    expect(wornAccessory("inventado", 100, new Set())).toBeNull();
  });

  it("los logros que piden los accesorios existen", () => {
    const ids = new Set(raw.achievements.map((a) => a.id));
    for (const a of PET_ACCESSORIES) if (a.unlock.type === "achievement") expect(ids).toContain(a.unlock.id);
  });

  it("ánimo: celebra, está contenta si hoy hiciste algo, duerme tras 2 días sin actividad", () => {
    expect(petMood({ celebrating: true, todayDone: false, daysSinceActivity: 9 })).toBe("celebrating");
    expect(petMood({ celebrating: false, todayDone: true, daysSinceActivity: 0 })).toBe("happy");
    expect(petMood({ celebrating: false, todayDone: false, daysSinceActivity: 1 })).toBe("idle");
    expect(petMood({ celebrating: false, todayDone: false, daysSinceActivity: 2 })).toBe("sleeping");
    expect(petMood({ celebrating: false, todayDone: false, daysSinceActivity: null })).toBe("idle");
  });

  it("frases cortas, amables y sin culpa", () => {
    const ctx = { userName: "Youfrend", hour: 9, allMissionsDone: false, seed: 0 };
    const all = new Set<string>();
    for (const mood of ["idle", "happy", "sleeping", "celebrating"] as const) {
      for (let seed = 0; seed < 6; seed++) {
        for (const hour of [8, 15, 22]) all.add(petLine(mood, { ...ctx, hour, seed }));
      }
    }
    for (const line of all) {
      expect(line.length).toBeLessThanOrEqual(48);
      expect(line).not.toMatch(/!|fallaste|perdiste|abandon/i);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
    expect(petLine("idle", ctx)).toBe("Buenos días, Youfrend.");
  });
});

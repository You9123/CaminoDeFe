/**
 * Cosméticos: un solo catálogo (V3.5D, ADR-0015).
 *
 * Reúne lo que antes eran dos listas: las recompensas por racha (Documento Maestro §2.7) y los
 * accesorios de la mascota (§2.12). Todo se gana jugando: no hay tienda, ni monedas, ni rarezas.
 * Todo es cosmético: nada de la Biblia se bloquea.
 *
 * Nada de esto se guarda: lo ganado se calcula con el récord de racha, el nivel y los logros
 * (activity_log). Solo se guarda qué adornos apagó el usuario (settings.cosmetics_off) y qué
 * accesorio lleva la mascota (settings.pet_accessory). Los ids no cambian entre versiones.
 */
export type CosmeticType = "pet_accessory" | "decoration" | "background" | "map_frame" | "badge";

export type CosmeticUnlock =
  /** Récord de racha (el mejor, así que nunca se pierde). */
  | { type: "streak"; days: number }
  /** Un logro concreto. `label` es su nombre, para decir cómo se gana. */
  | { type: "achievement"; id: string; label: string }
  | { type: "level"; level: number }
  /** Completar cualquier desafío mayor. */
  | { type: "major_challenge" };

export type Cosmetic = {
  id: string;
  type: CosmeticType;
  title: string;
  description: string;
  unlock: CosmeticUnlock;
  /** Se puede prender y apagar (adornos de la app). Los accesorios se eligen en Ajustes → Mascota. */
  toggle?: boolean;
};

export const COSMETICS: readonly Cosmetic[] = [
  // ---------- Por constancia (récord de racha) ----------
  {
    id: "olive_branch",
    type: "decoration",
    title: "Ramita de olivo",
    description: "Un pequeño adorno junto a tu saludo en Hoy.",
    unlock: { type: "streak", days: 3 },
    toggle: true,
  },
  {
    id: "bufanda",
    type: "pet_accessory",
    title: "Bufanda de lana",
    description: "Una bufanda para tu mascota.",
    unlock: { type: "streak", days: 7 },
  },
  {
    id: "leaves_background",
    type: "background",
    title: "Fondo de hojas",
    description: "Hojas muy suaves dibujadas sobre el papel de fondo.",
    unlock: { type: "streak", days: 14 },
    toggle: true,
  },
  {
    id: "map_frame",
    type: "map_frame",
    title: "Marco del mapa",
    description: "Un marco especial para el mapa de la Biblia.",
    unlock: { type: "streak", days: 30 },
    toggle: true,
  },
  {
    id: "golden_seal",
    type: "badge",
    title: "Sello dorado",
    description: "Una insignia dorada junto a tu nivel.",
    unlock: { type: "streak", days: 100 },
    toggle: true,
  },
  // ---------- Por logros ----------
  {
    id: "flores",
    type: "pet_accessory",
    title: "Corona de flores",
    description: "Flores para la cabeza de tu mascota.",
    unlock: { type: "achievement", id: "first_book", label: "Libro completo" },
  },
  {
    id: "campanita",
    type: "pet_accessory",
    title: "Campanita",
    description: "Una campanita dorada para el cuello de tu mascota.",
    unlock: { type: "achievement", id: "reflections_10", label: "Diez reflexiones" },
  },
  // ---------- Por nivel (V3.5D) ----------
  {
    id: "panuelo",
    type: "pet_accessory",
    title: "Pañuelo de viaje",
    description: "Un pañuelo azul para tu mascota, para el camino largo.",
    unlock: { type: "level", level: 15 },
  },
  {
    id: "lamp_badge",
    type: "badge",
    title: "Lámpara del camino",
    description: "Una lamparita junto a tu nivel.",
    unlock: { type: "level", level: 25 },
    toggle: true,
  },
  // ---------- Por desafíos mayores (V3.5D) ----------
  {
    id: "laurel",
    type: "pet_accessory",
    title: "Corona de laurel",
    description: "Hojas de laurel para tu mascota, por terminar un desafío mayor.",
    unlock: { type: "major_challenge" },
  },
  {
    id: "laurel_badge",
    type: "badge",
    title: "Ramita de laurel",
    description: "Una ramita de laurel junto a tu rango.",
    unlock: { type: "major_challenge" },
    toggle: true,
  },
];

export type CosmeticId = (typeof COSMETICS)[number]["id"];

/** Lo que hace falta saber para decidir qué está ganado (todo derivado de activity_log). */
export type CosmeticFacts = {
  bestStreak: number;
  level: number;
  /** Ids de los logros desbloqueados. */
  achievements: ReadonlySet<string>;
  /** Desafíos mayores completados alguna vez. */
  majorChallenges: number;
};

export const NO_FACTS: CosmeticFacts = { bestStreak: 0, level: 1, achievements: new Set(), majorChallenges: 0 };

export function cosmeticUnlocked(c: Cosmetic, f: CosmeticFacts): boolean {
  const u = c.unlock;
  switch (u.type) {
    case "streak":
      return f.bestStreak >= u.days;
    case "achievement":
      return f.achievements.has(u.id);
    case "level":
      return f.level >= u.level;
    case "major_challenge":
      return f.majorChallenges > 0;
  }
}

/** Cómo se gana, dicho para el usuario: "Racha de 7 días", "Nivel 15", "Logro «Libro completo»". */
export function unlockLabel(u: CosmeticUnlock): string {
  switch (u.type) {
    case "streak":
      return `Racha de ${u.days} días`;
    case "achievement":
      return `Logro «${u.label}»`;
    case "level":
      return `Nivel ${u.level}`;
    case "major_challenge":
      return "Completar un desafío mayor";
  }
}

/** Grupos para mostrar el catálogo (Mi camino → Logros). */
export const COSMETIC_GROUPS: readonly { title: string; unlock: CosmeticUnlock["type"][] }[] = [
  { title: "Por constancia", unlock: ["streak"] },
  { title: "Por logros y desafíos", unlock: ["achievement", "major_challenge"] },
  { title: "Por nivel", unlock: ["level"] },
];

export type CosmeticView = Cosmetic & {
  unlocked: boolean;
  how: string;
  /** Qué falta, si no está ganado ("Faltan 3 días", "Faltan 4 niveles"), o null. */
  missing: string | null;
};

export function cosmeticViews(f: CosmeticFacts): CosmeticView[] {
  return COSMETICS.map((c) => {
    const unlocked = cosmeticUnlocked(c, f);
    let missing: string | null = null;
    if (!unlocked && c.unlock.type === "streak") {
      const n = c.unlock.days - f.bestStreak;
      missing = n === 1 ? "Falta 1 día" : `Faltan ${n} días`;
    } else if (!unlocked && c.unlock.type === "level") {
      const n = c.unlock.level - f.level;
      missing = n === 1 ? "Falta 1 nivel" : `Faltan ${n} niveles`;
    }
    return { ...c, unlocked, how: unlockLabel(c.unlock), missing };
  });
}

/** ¿Está activo un adorno de la app? Tiene que poder prenderse, estar ganado y no apagado. */
export function isCosmeticActive(id: string, f: CosmeticFacts, disabled: ReadonlySet<string>): boolean {
  const c = COSMETICS.find((x) => x.id === id);
  return !!c && !!c.toggle && cosmeticUnlocked(c, f) && !disabled.has(id);
}

/**
 * Lo que se acaba de ganar entre dos momentos (antes y después de una actividad).
 * Sirve para decir "Nuevo desbloqueo: …" solo cuando de verdad hay algo nuevo.
 */
export function newUnlocks(before: CosmeticFacts, after: CosmeticFacts): Cosmetic[] {
  return COSMETICS.filter((c) => !cosmeticUnlocked(c, before) && cosmeticUnlocked(c, after));
}

/** Lo que se gana justo al llegar a un nivel (para el aviso de subida de nivel). */
export function levelUnlocks(fromLevel: number, toLevel: number): Cosmetic[] {
  return COSMETICS.filter((c) => c.unlock.type === "level" && c.unlock.level > fromLevel && c.unlock.level <= toLevel);
}

/**
 * Texto de la subida de nivel: "Llegaste al nivel 15" y, SOLO si ese nivel trae algo nuevo,
 * "· Desbloqueaste: Pañuelo de viaje". Los accesorios de la mascota no se mencionan si no hay mascota.
 */
export function levelUpMessage(from: number, to: number, unlocks: readonly Cosmetic[], petOn: boolean): string {
  const atLevel = levelUnlocks(from, to).filter(
    (c) => unlocks.some((u) => u.id === c.id) && (petOn || c.type !== "pet_accessory"),
  );
  const base = `Llegaste al nivel ${to}`;
  return atLevel.length > 0 ? `${base} · Desbloqueaste: ${atLevel.map((c) => c.title).join(", ")}` : base;
}

// ---------- Compatibilidad: recompensas por racha (V2) ----------

export type StreakRewardView = Cosmetic & { days: number; unlocked: boolean; daysLeft: number };

/** Solo las recompensas por racha, en orden (como en la V2). */
export function streakRewards(bestStreak: number): StreakRewardView[] {
  return COSMETICS.flatMap((c) =>
    c.unlock.type === "streak"
      ? [
          {
            ...c,
            days: c.unlock.days,
            unlocked: bestStreak >= c.unlock.days,
            daysLeft: Math.max(0, c.unlock.days - bestStreak),
          },
        ]
      : [],
  );
}

/** La siguiente recompensa por racha, o null si ya se tienen todas. */
export function nextStreakReward(bestStreak: number): StreakRewardView | null {
  return streakRewards(bestStreak).find((r) => !r.unlocked) ?? null;
}

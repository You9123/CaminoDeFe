/**
 * Recompensas cosméticas por racha (ver Documento Maestro §2.7).
 *
 * Se ganan con el RÉCORD de racha, no con la racha actual: si la racha se corta,
 * lo que ya ganaste se queda contigo (principio "nunca castigar").
 * Todo es cosmético: nada de la Biblia se bloquea.
 */
export type CosmeticId = "olive_branch" | "pet_scarf" | "leaves_background" | "map_frame" | "golden_seal";

export type StreakReward = {
  id: CosmeticId;
  days: number;
  title: string;
  description: string;
  /** Si todavía no se puede usar porque su función llega en otro sprint. */
  comingWith?: "la mascota" | "el mapa";
  /** Se puede prender y apagar. */
  toggle?: boolean;
};

export const STREAK_REWARDS: readonly StreakReward[] = [
  {
    id: "olive_branch",
    days: 3,
    title: "Ramita de olivo",
    description: "Un pequeño adorno junto a tu saludo en Hoy.",
    toggle: true,
  },
  {
    id: "pet_scarf",
    days: 7,
    title: "Bufanda de lana",
    description: "Un aspecto nuevo para tu mascota.",
    comingWith: "la mascota",
  },
  {
    id: "leaves_background",
    days: 14,
    title: "Fondo de hojas",
    description: "Hojas muy suaves dibujadas sobre el papel de fondo.",
    toggle: true,
  },
  {
    id: "map_frame",
    days: 30,
    title: "Marco del mapa",
    description: "Un marco especial para el mapa de la Biblia.",
    comingWith: "el mapa",
  },
  {
    id: "golden_seal",
    days: 100,
    title: "Sello dorado",
    description: "Una insignia dorada junto a tu nivel.",
    toggle: true,
  },
];

export type StreakRewardView = StreakReward & { unlocked: boolean; daysLeft: number };

export function streakRewards(bestStreak: number): StreakRewardView[] {
  return STREAK_REWARDS.map((r) => ({
    ...r,
    unlocked: bestStreak >= r.days,
    daysLeft: Math.max(0, r.days - bestStreak),
  }));
}

/** La siguiente recompensa por ganar, o null si ya se tienen todas. */
export function nextStreakReward(bestStreak: number): StreakRewardView | null {
  return streakRewards(bestStreak).find((r) => !r.unlocked) ?? null;
}

/** ¿Está activo un adorno? Tiene que estar ganado y no apagado por el usuario. */
export function isCosmeticActive(id: CosmeticId, bestStreak: number, disabled: ReadonlySet<string>): boolean {
  const reward = STREAK_REWARDS.find((r) => r.id === id);
  return !!reward && !reward.comingWith && bestStreak >= reward.days && !disabled.has(id);
}

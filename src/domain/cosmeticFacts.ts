import type { CosmeticFacts } from "./cosmetics";

/** Arma los datos de los cosméticos a partir del progreso y los logros desbloqueados. */
export function cosmeticFacts(
  bestStreak: number,
  level: number,
  unlockedAchievements: Iterable<string>,
  majorBadgeIds: readonly string[],
): CosmeticFacts {
  const achievements = new Set(unlockedAchievements);
  return {
    bestStreak,
    level,
    achievements,
    majorChallenges: majorBadgeIds.filter((id) => achievements.has(id)).length,
  };
}

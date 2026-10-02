import { MAJOR_BADGE_IDS } from "../content/achievements";
import { getUnlockedAchievements } from "../data/achievementsRepo";
import { cosmeticFacts } from "../domain/cosmeticFacts";
import type { CosmeticFacts } from "../domain/cosmetics";
import { useProgress } from "../stores/progressStore";
import { useAsync } from "./useAsync";

/** Récord de racha, nivel y logros: lo que decide qué cosméticos están ganados (ADR-0015). */
export function useCosmeticFacts(): CosmeticFacts {
  const best = useProgress((s) => s.streak.best);
  const level = useProgress((s) => s.level.level);
  const totalXp = useProgress((s) => s.totalXp);
  const unlocked = useAsync(getUnlockedAchievements, `cosmetics-${totalXp}`).latest;
  return cosmeticFacts(best, level, unlocked?.keys() ?? [], MAJOR_BADGE_IDS);
}

/**
 * Curva de niveles (ver Documento Maestro §2.5).
 * XP para pasar del nivel n al n+1 = BASE + STEP·(n−1)
 */
export const LEVEL_BASE_XP = 100;
export const LEVEL_STEP_XP = 25;

export function xpToNextLevel(level: number): number {
  return LEVEL_BASE_XP + LEVEL_STEP_XP * (level - 1);
}

/** XP acumulado necesario para ALCANZAR un nivel (nivel 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  const n = level - 1;
  return LEVEL_BASE_XP * n + (LEVEL_STEP_XP * (n - 1) * n) / 2;
}

export type LevelInfo = {
  level: number;
  /** XP ganado dentro del nivel actual. */
  xpIntoLevel: number;
  /** XP total que pide el nivel actual para subir. */
  xpForNext: number;
  /** 0..1 */
  progress: number;
};

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  const xpForNext = xpToNextLevel(level);
  return { level, xpIntoLevel: remaining, xpForNext, progress: remaining / xpForNext };
}

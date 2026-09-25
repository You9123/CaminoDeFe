/**
 * Reglas de XP (ver Documento Maestro §2.5).
 * Todo es configurable aquí; la UI y la base de datos nunca "inventan" XP.
 */
export type ActivityType =
  | "chapter_read"
  | "bonus_5_chapters"
  | "daily_verse"
  | "short_reading"
  | "reflection"
  | "prayer"
  | "application"
  | "daily_missions_bonus"
  | "surprise_mission"
  | "quiz";

type Rule = { xp: number; dailyCap: number | null };

export const XP_RULES: Record<ActivityType, Rule> = {
  chapter_read: { xp: 20, dailyCap: null },
  bonus_5_chapters: { xp: 50, dailyCap: 1 },
  daily_verse: { xp: 10, dailyCap: 1 },
  /** Lectura corta de "Tengo 5 minutos" cuando el versículo del día ya se leyó. */
  short_reading: { xp: 5, dailyCap: 2 },
  reflection: { xp: 15, dailyCap: 3 },
  prayer: { xp: 10, dailyCap: 2 },
  application: { xp: 10, dailyCap: 2 },
  daily_missions_bonus: { xp: 60, dailyCap: 1 },
  /** Misión sorpresa del día (V2). */
  surprise_mission: { xp: 20, dailyCap: 1 },
  /** Respuesta correcta en el quiz (V3). Solo la primera vez que aciertas cada pregunta. */
  quiz: { xp: 5, dailyCap: 20 },
};

/**
 * Filas de activity_log que son RECOMPENSAS (logros, desafíos) y no algo que el usuario hizo.
 * No cuentan para la racha ni como "día con actividad" (ADR-0004).
 */
export const REWARD_TYPES = ["achievement", "challenge"] as const;

/** XP que da una actividad, considerando cuántas veces ya se recompensó hoy. */
export function xpFor(type: ActivityType, rewardedTimesToday: number): number {
  const rule = XP_RULES[type];
  if (rule.dailyCap !== null && rewardedTimesToday >= rule.dailyCap) return 0;
  return rule.xp;
}

export const BONUS_CHAPTERS_PER_DAY = 5;

export type Award = { type: ActivityType; xp: number };

/**
 * Recompensas al terminar un capítulo.
 * - Releer el mismo capítulo el mismo día no da XP (pero sí se registra).
 * - Al llegar a 5 capítulos distintos en el día se da un bono único.
 */
export function chapterReadAwards(input: {
  alreadyReadThisChapterToday: boolean;
  /** Capítulos distintos con XP hoy, SIN contar este. */
  distinctChaptersToday: number;
  bonusAlreadyGiven: boolean;
}): Award[] {
  if (input.alreadyReadThisChapterToday) return [{ type: "chapter_read", xp: 0 }];

  const awards: Award[] = [{ type: "chapter_read", xp: XP_RULES.chapter_read.xp }];
  const countAfter = input.distinctChaptersToday + 1;
  if (!input.bonusAlreadyGiven && countAfter >= BONUS_CHAPTERS_PER_DAY) {
    awards.push({ type: "bonus_5_chapters", xp: XP_RULES.bonus_5_chapters.xp });
  }
  return awards;
}

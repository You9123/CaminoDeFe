import { XP_RULES, xpFor, type ActivityType, type Award } from "./xp";

/**
 * Misiones diarias (ver Documento Maestro §2.8).
 * Una misión se cumple cuando existe hoy al menos una actividad de su tipo.
 * El XP lo da la actividad; al cumplir las 4 se suma un bono único.
 */
export type MissionActivity = "daily_verse" | "reflection" | "prayer" | "application";

export type Mission = {
  id: MissionActivity;
  title: string;
  description: string;
};

export const DAILY_MISSIONS: readonly Mission[] = [
  { id: "daily_verse", title: "El versículo", description: "Lee el versículo del día" },
  { id: "reflection", title: "Reflexiona", description: "Escribe qué significa para ti" },
  { id: "prayer", title: "Oración", description: "Dedica unos minutos a orar" },
  { id: "application", title: "Ponlo en práctica", description: "Elige cómo aplicarlo hoy" },
];

export const MISSION_TYPES = new Set<ActivityType>(DAILY_MISSIONS.map((m) => m.id));

export function missionXp(id: MissionActivity): number {
  return XP_RULES[id].xp;
}

export type MissionProgress = {
  missions: (Mission & { done: boolean })[];
  completed: number;
  total: number;
  allDone: boolean;
};

export function missionProgress(doneToday: ReadonlySet<string>): MissionProgress {
  const missions = DAILY_MISSIONS.map((m) => ({ ...m, done: doneToday.has(m.id) }));
  const completed = missions.filter((m) => m.done).length;
  return { missions, completed, total: missions.length, allDone: completed === missions.length };
}

/**
 * Recompensas al registrar una actividad (reflexión, oración, aplicación, versículo...).
 * La actividad siempre se registra (aunque dé 0 XP por el límite diario) para que cuente la misión.
 */
export function activityAwards(
  type: ActivityType,
  ctx: {
    /** Veces que este tipo YA dio XP hoy. */
    rewardedTimesToday: number;
    /** Tipos de actividad registrados hoy ANTES de esta. */
    doneTypesToday: ReadonlySet<string>;
    bonusAlreadyGiven: boolean;
  },
): Award[] {
  const awards: Award[] = [{ type, xp: xpFor(type, ctx.rewardedTimesToday) }];

  const after = new Set(ctx.doneTypesToday);
  after.add(type);
  if (!ctx.bonusAlreadyGiven && missionProgress(after).allDone) {
    awards.push({ type: "daily_missions_bonus", xp: XP_RULES.daily_missions_bonus.xp });
  }
  return awards;
}

import { create } from "zustand";
import * as progress from "../data/progressRepo";
import { gameDay } from "../domain/day";
import { levelFromXp, type LevelInfo } from "../domain/levels";
import { computeStreak, type StreakInfo } from "../domain/streaks";
import { missionProgress, type MissionProgress } from "../domain/missions";
import { xpFor, type ActivityType, type Award } from "../domain/xp";
import { toast } from "./toastStore";

type ProgressState = {
  loaded: boolean;
  /** Día de juego con el que se calculó todo (para detectar el cambio de día con la app abierta). */
  day: string;
  name: string;
  totalXp: number;
  todayXp: number;
  chaptersRead: number;
  level: LevelInfo;
  streak: StreakInfo;
  missions: MissionProgress;
  /** Veces que cada tipo de actividad ya dio XP hoy (para los límites diarios). */
  rewardedToday: Record<string, number>;
  refresh: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  /** Recarga el progreso y muestra avisos (+XP, bono, subida de nivel). */
  celebrate: (awards: Award[]) => Promise<void>;
};

export const useProgress = create<ProgressState>((set, get) => ({
  loaded: false,
  day: gameDay(),
  name: "",
  totalXp: 0,
  todayXp: 0,
  chaptersRead: 0,
  level: levelFromXp(0),
  streak: computeStreak([], gameDay()),
  missions: missionProgress(new Set()),
  rewardedToday: {},

  refresh: async () => {
    const day = gameDay();
    const [name, totalXp, todayXp, chaptersRead, activeDays, dayActivity] = await Promise.all([
      progress.getProfileName(),
      progress.getTotalXp(),
      progress.getXpForDay(day),
      progress.getChaptersReadCount(),
      progress.getActiveDays(),
      progress.getDayActivity(day),
    ]);
    set({
      loaded: true,
      day,
      name,
      totalXp,
      todayXp,
      chaptersRead,
      level: levelFromXp(totalXp),
      streak: computeStreak(activeDays, day),
      missions: missionProgress(dayActivity.doneTypes),
      rewardedToday: dayActivity.rewarded,
    });
  },

  setName: async (name) => {
    await progress.setProfileName(name);
    await get().refresh();
  },

  celebrate: async (awards) => {
    const levelBefore = get().level.level;
    const streakBefore = get().streak.current;
    await get().refresh();
    const { level, streak } = get();

    const main = awards.filter((a) => a.type !== "daily_missions_bonus" && a.type !== "bonus_5_chapters");
    const mainXp = main.reduce((s, a) => s + a.xp, 0);
    if (mainXp > 0) toast(`+${mainXp} XP`, "xp");

    if (awards.some((a) => a.type === "bonus_5_chapters")) toast("Cinco capítulos hoy · +50 XP", "bonus");
    if (awards.some((a) => a.type === "daily_missions_bonus")) toast("Misiones de hoy completas · +60 XP", "bonus");
    if (streak.current > streakBefore && streak.current > 1) toast(`${streak.current} días seguidos`, "streak");
    if (level.level > levelBefore) toast(`Llegaste al nivel ${level.level}`, "level");
  },
}));

/** XP que daría ahora mismo una actividad (0 si ya se llegó al límite de hoy). */
export function useXpFor(type: ActivityType): number {
  const rewarded = useProgress((s) => s.rewardedToday[type] ?? 0);
  return xpFor(type, rewarded);
}

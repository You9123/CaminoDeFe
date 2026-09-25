import { create } from "zustand";
import * as progress from "../data/progressRepo";
import { gameDay } from "../domain/day";
import { levelFromXp, type LevelInfo } from "../domain/levels";
import { computeStreak, type StreakInfo } from "../domain/streaks";
import { missionProgress, type MissionProgress } from "../domain/missions";
import { rankForLevel, type RankInfo } from "../domain/ranks";
import { xpFor, type ActivityType, type Award } from "../domain/xp";
import type { Achievement } from "../domain/achievements";
import { checkAchievements } from "../data/achievementsRepo";
import { checkChallenges } from "../data/challengesRepo";
import type { Challenge } from "../domain/challenges";
import { toast } from "./toastStore";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { CATALOG } from "../content/collectibles";
import { KIND_LABEL, newlyUnlocked, type Collectible } from "../domain/collectibles";

type ProgressState = {
  loaded: boolean;
  /** Día de juego con el que se calculó todo (para detectar el cambio de día con la app abierta). */
  day: string;
  name: string;
  totalXp: number;
  todayXp: number;
  chaptersRead: number;
  level: LevelInfo;
  rank: RankInfo;
  streak: StreakInfo;
  missions: MissionProgress;
  /** Veces que cada tipo de actividad ya dio XP hoy (para los límites diarios). */
  rewardedToday: Record<string, number>;
  /** Último día (de juego) con actividad propia, o null si nunca hubo. */
  lastActiveDay: string | null;
  /** Cambia cada vez que hay algo que celebrar (subir de nivel, un logro, un desafío): la mascota salta. */
  celebrationKey: number;
  /** Desafío mayor recién completado: se muestra la animación grande (ver ChallengeCelebration). */
  bigCelebration: Challenge | null;
  dismissCelebration: () => void;
  refresh: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  /** Recarga el progreso y muestra avisos (+XP, bono, subida de nivel, logros). `quietXp`: sin el aviso de +XP. */
  celebrate: (awards: Award[], opts?: { quietXp?: boolean }) => Promise<void>;
  /** Revisa desafíos y logros sin una actividad nueva (al abrir la app, al entrar a Misiones...). */
  checkAchievements: () => Promise<void>;
};

function announceChallenges(list: Challenge[]) {
  for (const c of list) {
    if (c.tier === "mayor") useProgress.setState({ bigCelebration: c });
    else toast(`Desafío completado: ${c.title} · +${c.xp} XP`, "achievement");
  }
}

/**
 * Revisa desafíos y después logros (un logro puede depender de un desafío completado).
 * Si algo falla, no se interrumpe la actividad que el usuario ya guardó.
 */
async function checkRewards(): Promise<{ challenges: Challenge[]; achievements: Achievement[] }> {
  const challenges = await checkChallenges().catch((e: unknown) => {
    console.error("No se pudieron revisar los desafíos", e);
    return [] as Challenge[];
  });
  const achievements = await checkAchievements().catch((e: unknown) => {
    console.error("No se pudieron revisar los logros", e);
    return [] as Achievement[];
  });
  return { challenges, achievements };
}

/** Avisos de logros: uno por logro si son pocos; si son muchos (al actualizar a la V2), uno solo. */
function announceAchievements(list: Achievement[]) {
  if (list.length === 0) return;
  if (list.length > 2) {
    const xp = list.reduce((s, a) => s + a.xp, 0);
    toast(`Desbloqueaste ${list.length} logros${xp > 0 ? ` · +${xp} XP` : ""}`, "achievement");
    return;
  }
  for (const a of list) toast(`Logro: ${a.title}${a.xp > 0 ? ` · +${a.xp} XP` : ""}`, "achievement");
}

export const useProgress = create<ProgressState>((set, get) => ({
  loaded: false,
  day: gameDay(),
  name: "",
  totalXp: 0,
  todayXp: 0,
  chaptersRead: 0,
  level: levelFromXp(0),
  rank: rankForLevel(1),
  streak: computeStreak([], gameDay()),
  missions: missionProgress(new Set()),
  rewardedToday: {},
  lastActiveDay: null,
  celebrationKey: 0,
  bigCelebration: null,
  dismissCelebration: () => set({ bigCelebration: null }),

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
      rank: rankForLevel(levelFromXp(totalXp).level),
      streak: computeStreak(activeDays, day),
      missions: missionProgress(dayActivity.doneTypes),
      rewardedToday: dayActivity.rewarded,
      lastActiveDay: activeDays.length > 0 ? activeDays[activeDays.length - 1] : null,
    });
  },

  setName: async (name) => {
    await progress.setProfileName(name);
    await get().refresh();
  },

  celebrate: async (awards, opts) => {
    const levelBefore = get().level.level;
    const rankBefore = get().rank.rank.id;
    const streakBefore = get().streak.current;
    const rewards = await checkRewards();
    await get().refresh();
    const { level, rank, streak } = get();

    const main = awards.filter((a) => a.type !== "daily_missions_bonus" && a.type !== "bonus_5_chapters");
    const mainXp = main.reduce((s, a) => s + a.xp, 0);
    if (mainXp > 0 && !opts?.quietXp) toast(`+${mainXp} XP`, "xp");

    if (awards.some((a) => a.type === "bonus_5_chapters")) toast("Cinco capítulos hoy · +50 XP", "bonus");
    if (awards.some((a) => a.type === "daily_missions_bonus")) toast("Misiones de hoy completas · +60 XP", "bonus");
    if (streak.current > streakBefore && streak.current > 1) toast(`${streak.current} días seguidos`, "streak");
    if (level.level > levelBefore) toast(`Llegaste al nivel ${level.level}`, "level");
    if (rank.rank.id !== rankBefore) toast(`Nuevo rango: ${rank.rank.title}`, "level");
    announceChallenges(rewards.challenges);
    announceAchievements(rewards.achievements);
    if (level.level > levelBefore || rewards.challenges.length > 0 || rewards.achievements.length > 0) {
      set({ celebrationKey: get().celebrationKey + 1 });
    }
  },

  checkAchievements: async () => {
    const levelBefore = get().level.level;
    const { challenges, achievements } = await checkRewards();
    if (challenges.length === 0 && achievements.length === 0) return;
    await get().refresh();
    if (get().level.level > levelBefore) toast(`Llegaste al nivel ${get().level.level}`, "level");
    announceChallenges(challenges);
    announceAchievements(achievements);
    set({ celebrationKey: get().celebrationKey + 1 });
  },
}));

/** XP que daría ahora mismo una actividad (0 si ya se llegó al límite de hoy). */
export function useXpFor(type: ActivityType): number {
  const rewarded = useProgress((s) => s.rewardedToday[type] ?? 0);
  return xpFor(type, rewarded);
}

/**
 * Después de leer un capítulo: avisa de las fichas nuevas (personajes, lugares, eventos)
 * y hace que la mascota celebre. Devuelve las fichas para mostrarlas en el lector.
 */
export async function announceCollectibles(ref: string, wasReadBefore: boolean): Promise<Collectible[]> {
  if (wasReadBefore) return [];
  try {
    const { read } = await getReadChapterMap();
    const list = newlyUnlocked(CATALOG.collectibles, read, ref, wasReadBefore);
    if (list.length === 0) return [];
    if (list.length > 2) toast(`${list.length} fichas nuevas en Coleccionables`, "collectible");
    else for (const c of list) toast(`${KIND_LABEL[c.kind].unlocked}: ${c.name}`, "collectible");
    useProgress.setState((s) => ({ celebrationKey: s.celebrationKey + 1 }));
    return list;
  } catch (e) {
    console.error("No se pudieron revisar los coleccionables", e);
    return [];
  }
}

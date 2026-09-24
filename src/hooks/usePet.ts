import { useEffect, useRef, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  isPetSpecies,
  petLine,
  petMood,
  petStage,
  SPECIES_INFO,
  wornAccessory,
  type AccessoryId,
  type PetMood,
  type PetSpecies,
} from "../domain/pet";
import { dayIndex } from "../domain/dailyVerse";
import { getUnlockedAchievements } from "../data/achievementsRepo";
import { useAsync } from "./useAsync";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";

export type PetView = {
  species: PetSpecies;
  name: string;
  stage: ReturnType<typeof petStage>;
  mood: PetMood;
  accessory: AccessoryId | null;
  line: string;
  /** Hace que salte un momento (al tocarla). */
  poke: () => void;
};

const CELEBRATE_MS = 2200;

/** Todo lo que la mascota necesita para dibujarse. null si no hay mascota (apagada o sin elegir). */
export function usePet(): PetView | null {
  const species = useSettings((s) => s.petSpecies);
  const petName = useSettings((s) => s.petName);
  const chosenAccessory = useSettings((s) => s.petAccessory);
  const { level, streak, day, lastActiveDay, celebrationKey, missions, name, totalXp } = useProgress();
  const achievements = useAsync(getUnlockedAchievements, `pet-${totalXp}`).data;

  // Celebra un momento cuando cambia celebrationKey (subió de nivel, logro...) o cuando la tocan.
  const [celebrating, setCelebrating] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const start = window.setTimeout(() => setCelebrating(true), 0);
    const end = window.setTimeout(() => setCelebrating(false), CELEBRATE_MS);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [celebrationKey]);
  const [pokes, setPokes] = useState(0);
  useEffect(() => {
    if (pokes === 0) return;
    const start = window.setTimeout(() => setCelebrating(true), 0);
    const end = window.setTimeout(() => setCelebrating(false), 1500);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [pokes]);

  if (!isPetSpecies(species)) return null;

  const daysSinceActivity = lastActiveDay ? differenceInCalendarDays(parseISO(day), parseISO(lastActiveDay)) : null;
  const mood = petMood({ celebrating, todayDone: streak.todayDone, daysSinceActivity });
  return {
    species,
    name: petName || SPECIES_INFO[species].defaultName,
    stage: petStage(level.level),
    mood,
    accessory: wornAccessory(chosenAccessory, streak.best, new Set(achievements?.keys() ?? [])),
    line: petLine(mood, {
      userName: name,
      hour: new Date().getHours(),
      allMissionsDone: missions.allDone,
      seed: dayIndex(day) + pokes,
    }),
    poke: () => setPokes((p) => p + 1),
  };
}

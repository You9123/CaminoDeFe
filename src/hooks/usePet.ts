import { useEffect, useState } from "react";
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
import { getReadChapterMap } from "../data/collectiblesRepo";
import { CATALOG } from "../content/collectibles";
import { recentDiscoveries } from "../domain/collectibles";
import { gameDay } from "../domain/day";
import { useCosmeticFacts } from "./useCosmeticFacts";
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

/** Cuánto dura una reacción (celebrar o curiosear) antes de volver a su ánimo del día. */
export const REACTION_MS = 6000;

/** Todo lo que la mascota necesita para dibujarse. null si no hay mascota (apagada o sin elegir). */
export function usePet(): PetView | null {
  const species = useSettings((s) => s.petSpecies);
  const petName = useSettings((s) => s.petName);
  const chosenAccessory = useSettings((s) => s.petAccessory);
  const { streak, day, lastActiveDay, missions, name, totalXp, level, rewardedToday } = useProgress();
  const reaction = useProgress((s) => s.petReaction);
  const facts = useCosmeticFacts();
  const map = useAsync(getReadChapterMap, `pet-${totalXp}`).latest;

  // Reacción en curso (V3.5D): dura unos segundos desde que pasó, aunque la mascota aparezca después.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!reaction) return;
    const left = reaction.at + REACTION_MS - Date.now();
    const tick = window.setTimeout(() => setNow(Date.now()), 0);
    const end = left > 0 ? window.setTimeout(() => setNow(Date.now()), left) : undefined;
    return () => {
      window.clearTimeout(tick);
      if (end) window.clearTimeout(end);
    };
  }, [reaction]);
  const reacting = reaction && now - reaction.at < REACTION_MS ? reaction.kind : null;

  // Tocarla la hace saltar y cambiar de frase.
  const [pokes, setPokes] = useState(0);
  const [poked, setPoked] = useState(false);
  useEffect(() => {
    if (pokes === 0) return;
    const start = window.setTimeout(() => setPoked(true), 0);
    const end = window.setTimeout(() => setPoked(false), 1500);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [pokes]);

  if (!isPetSpecies(species)) return null;

  const daysSinceActivity = lastActiveDay ? differenceInCalendarDays(parseISO(day), parseISO(lastActiveDay)) : null;
  const mood = petMood({ reaction: reacting, celebrating: poked, todayDone: streak.todayDone, daysSinceActivity });

  // Datos del día para la frase (V3.5D): capítulos de hoy y lo último que descubriste hoy.
  const latest = map ? recentDiscoveries(CATALOG.collectibles, map.firstReadAt, 1)[0] : undefined;
  const discoveredToday =
    latest && gameDay(parseISO(latest.at)) === day
      ? { name: latest.item.name, person: latest.item.kind === "character" }
      : null;

  return {
    species,
    name: petName || SPECIES_INFO[species].defaultName,
    stage: petStage(level.level),
    mood,
    accessory: wornAccessory(chosenAccessory, facts),
    line: petLine(mood, {
      userName: name,
      hour: new Date().getHours(),
      allMissionsDone: missions.allDone,
      seed: dayIndex(day) + pokes,
      chaptersToday: rewardedToday.chapter_read ?? 0,
      discoveredToday,
    }),
    poke: () => setPokes((p) => p + 1),
  };
}

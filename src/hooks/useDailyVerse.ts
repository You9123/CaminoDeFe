import dailyVerses from "../../content/daily_verses.json";
import { gameDay } from "../domain/day";
import { pickDailyVerse } from "../domain/dailyVerse";
import { getVerseByRef } from "../data/bibleRepo";
import { recordActivity } from "../data/progressRepo";
import { useAsync } from "./useAsync";
import { useProgress } from "../stores/progressStore";

/** El versículo del día, si ya se leyó hoy y la acción para marcarlo como leído. */
export function useDailyVerse() {
  const day = gameDay();
  const celebrate = useProgress((s) => s.celebrate);
  const verseRead = useProgress((s) => s.missions.missions.find((m) => m.id === "daily_verse")?.done ?? false);
  const verse = useAsync(() => getVerseByRef(pickDailyVerse(dailyVerses.verses, day)), day);

  const markVerseRead = async () => {
    if (!verse.data) return;
    await celebrate((await recordActivity("daily_verse", { ref: verse.data.ref })).awards);
  };

  return { day, verse, verseRead, markVerseRead };
}

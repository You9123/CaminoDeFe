import { userDb } from "./db";
import { gameDay } from "../domain/day";
import type { TodayFacts } from "../domain/surprise";

/** Lo que pasó hoy (día de juego) que puede cumplir una misión sorpresa. */
export async function getTodayFacts(day: string = gameDay()): Promise<TodayFacts> {
  const db = await userDb();
  // Las marcas guardan la hora en ISO (UTC); se traen las de los últimos 2 días y se filtra por día de juego.
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const [chapters, prayers, marks, journal] = await Promise.all([
    db.select<{ ref: string }[]>("SELECT ref FROM activity_log WHERE type = 'chapter_read' AND day = $1", [day]),
    db.select<{ secs: number | null }[]>(
      "SELECT duration_sec AS secs FROM activity_log WHERE type = 'prayer' AND day = $1",
      [day],
    ),
    db.select<{ color: string | null; favorite: number; updated_at: string }[]>(
      "SELECT color, favorite, updated_at FROM verse_marks WHERE updated_at >= $1",
      [since],
    ),
    db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM journal_entries WHERE kind = 'free' AND day = $1", [day]),
  ]);
  const todayMarks = marks.filter((m) => gameDay(new Date(m.updated_at)) === day);
  return {
    chaptersRead: chapters.map((c) => c.ref),
    prayerSeconds: prayers.map((p) => Number(p.secs ?? 0)),
    favoritedToday: todayMarks.some((m) => m.favorite === 1),
    highlightedToday: todayMarks.some((m) => m.color !== null),
    freeJournalToday: Number(journal[0]?.n ?? 0) > 0,
  };
}

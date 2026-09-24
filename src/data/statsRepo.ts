import { bibleDb, TRANSLATION_ID, userDb } from "./db";
import type { DayTypeRow } from "../domain/stats";

/** activity_log agrupado por día y tipo (una fila por combinación). */
export async function getDayTypeRows(): Promise<DayTypeRow[]> {
  const db = await userDb();
  const rows = await db.select<{ day: string; type: string; n: number; secs: number | null; xp: number | null }[]>(
    `SELECT day, type, COUNT(*) AS n, SUM(COALESCE(duration_sec, 0)) AS secs, SUM(xp) AS xp
     FROM activity_log GROUP BY day, type ORDER BY day`,
  );
  return rows.map((r) => ({
    day: r.day,
    type: r.type,
    n: Number(r.n),
    secs: Number(r.secs ?? 0),
    xp: Number(r.xp ?? 0),
  }));
}

/** Versículos de todos los capítulos leídos alguna vez. */
export async function getVersesReadCount(): Promise<number> {
  const [udb, bdb] = await Promise.all([userDb(), bibleDb()]);
  const [read, all] = await Promise.all([
    udb.select<{ book_id: number; chapter: number }[]>("SELECT book_id, chapter FROM chapter_progress"),
    bdb.select<{ book_id: number; chapter: number; verses: number }[]>(
      "SELECT book_id, chapter, verses FROM chapters WHERE translation_id = $1",
      [TRANSLATION_ID],
    ),
  ]);
  const perChapter = new Map(all.map((c) => [`${c.book_id}.${c.chapter}`, Number(c.verses)]));
  return read.reduce((s, r) => s + (perChapter.get(`${r.book_id}.${r.chapter}`) ?? 0), 0);
}

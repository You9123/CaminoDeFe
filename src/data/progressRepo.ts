import { userDb } from "./db";
import { gameDay } from "../domain/day";
import { chapterReadAwards, type Award } from "../domain/xp";
import { chapterRef } from "../domain/refs";

const nowIso = () => new Date().toISOString();

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const db = await userDb();
  const rows = await db.select<{ n: number | null }[]>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

// ---------- Lecturas ----------

export async function getTotalXp(): Promise<number> {
  return count("SELECT SUM(xp) AS n FROM activity_log");
}

export async function getXpForDay(day: string = gameDay()): Promise<number> {
  return count("SELECT SUM(xp) AS n FROM activity_log WHERE day = $1", [day]);
}

export async function getChaptersReadCount(): Promise<number> {
  return count("SELECT COUNT(*) AS n FROM chapter_progress");
}

/** Capítulos ya leídos (alguna vez) de un libro. */
export async function getReadChapters(bookId: number): Promise<Set<number>> {
  const db = await userDb();
  const rows = await db.select<{ chapter: number }[]>("SELECT chapter FROM chapter_progress WHERE book_id = $1", [
    bookId,
  ]);
  return new Set(rows.map((r) => r.chapter));
}

/** Capítulos leídos por libro: { bookId: cantidad }. */
export async function getReadCountByBook(): Promise<Record<number, number>> {
  const db = await userDb();
  const rows = await db.select<{ book_id: number; n: number }[]>(
    "SELECT book_id, COUNT(*) AS n FROM chapter_progress GROUP BY book_id",
  );
  return Object.fromEntries(rows.map((r) => [r.book_id, Number(r.n)]));
}

// ---------- Escrituras ----------

export type ChapterReadResult = { awards: Award[]; xpGained: number };

/**
 * Registra que se terminó de leer un capítulo y otorga el XP correspondiente.
 * La lógica de cuánto XP dar vive en el dominio (chapterReadAwards); aquí solo se guarda.
 */
export async function recordChapterRead(input: {
  bookId: number;
  bookCode: string;
  chapter: number;
  durationSec: number;
}): Promise<ChapterReadResult> {
  const db = await userDb();
  const day = gameDay();
  const ref = chapterRef(input.bookCode, input.chapter);
  const now = nowIso();

  const [alreadyToday, distinctToday, bonusGiven] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM activity_log WHERE type = 'chapter_read' AND ref = $1 AND day = $2 AND xp > 0", [
      ref,
      day,
    ]),
    count("SELECT COUNT(DISTINCT ref) AS n FROM activity_log WHERE type = 'chapter_read' AND day = $1 AND xp > 0", [
      day,
    ]),
    count("SELECT COUNT(*) AS n FROM activity_log WHERE type = 'bonus_5_chapters' AND day = $1", [day]),
  ]);

  const awards = chapterReadAwards({
    alreadyReadThisChapterToday: alreadyToday > 0,
    distinctChaptersToday: distinctToday,
    bonusAlreadyGiven: bonusGiven > 0,
  });

  for (const a of awards) {
    const isChapter = a.type === "chapter_read";
    await db.execute(
      "INSERT INTO activity_log (type, ref, xp, day, duration_sec, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [a.type, isChapter ? ref : null, a.xp, day, isChapter ? Math.round(input.durationSec) : null, now],
    );
  }

  await db.execute(
    `INSERT INTO chapter_progress (book_id, chapter, times_read, first_read_at, last_read_at)
     VALUES ($1, $2, 1, $3, $3)
     ON CONFLICT (book_id, chapter) DO UPDATE SET
       times_read = times_read + 1,
       last_read_at = excluded.last_read_at`,
    [input.bookId, input.chapter, now],
  );

  return { awards, xpGained: awards.reduce((s, a) => s + a.xp, 0) };
}

// ---------- Perfil y ajustes ----------

export async function getProfileName(): Promise<string> {
  const db = await userDb();
  const rows = await db.select<{ name: string }[]>("SELECT name FROM profile WHERE id = 1");
  return rows[0]?.name ?? "";
}

export async function setProfileName(name: string): Promise<void> {
  const db = await userDb();
  await db.execute("UPDATE profile SET name = $1 WHERE id = 1", [name.trim()]);
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await userDb();
  const rows = await db.select<{ value: string }[]>("SELECT value FROM settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await userDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export const LAST_POSITION_KEY = "last_position";

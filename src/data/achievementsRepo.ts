import { userDb } from "./db";
import { listBooks } from "./bibleRepo";
import { getActiveDays, getTotalXp } from "./progressRepo";
import { gameDay } from "../domain/day";
import { levelFromXp } from "../domain/levels";
import { computeStreak } from "../domain/streaks";
import { newlyUnlocked, type Achievement, type ProgressSnapshot } from "../domain/achievements";
import { ACHIEVEMENTS } from "../content/achievements";

/** Tipo de fila en activity_log para un logro desbloqueado (ref = id del logro). */
export const ACHIEVEMENT_TYPE = "achievement";

/** Logros desbloqueados: id → fecha ISO. */
export async function getUnlockedAchievements(): Promise<Map<string, string>> {
  const db = await userDb();
  const rows = await db.select<{ ref: string; created_at: string }[]>(
    "SELECT ref, MIN(created_at) AS created_at FROM activity_log WHERE type = $1 AND ref IS NOT NULL GROUP BY ref",
    [ACHIEVEMENT_TYPE],
  );
  return new Map(rows.map((r) => [r.ref, r.created_at]));
}

/** Foto del progreso para evaluar las reglas de los logros. */
export async function getProgressSnapshot(): Promise<ProgressSnapshot> {
  const db = await userDb();
  const [books, perBook, counts, challengeRows, activeDays, totalXp] = await Promise.all([
    listBooks(),
    db.select<{ book_id: number; n: number }[]>("SELECT book_id, COUNT(*) AS n FROM chapter_progress GROUP BY book_id"),
    db.select<{ type: string; n: number }[]>("SELECT type, COUNT(*) AS n FROM activity_log GROUP BY type"),
    db.select<{ ref: string }[]>("SELECT DISTINCT ref FROM activity_log WHERE type = 'challenge' AND ref IS NOT NULL"),
    getActiveDays(),
    getTotalXp(),
  ]);
  const codeById = new Map(books.map((b) => [b.id, b.code]));
  const readByBook: Record<string, number> = {};
  for (const r of perBook) {
    const code = codeById.get(r.book_id);
    if (code) readByBook[code] = Number(r.n);
  }
  return {
    readByBook,
    books: Object.fromEntries(books.map((b) => [b.code, { chapters: b.chapters, testament: b.testament }])),
    bestStreak: computeStreak(activeDays, gameDay()).best,
    activityCounts: Object.fromEntries(counts.map((c) => [c.type, Number(c.n)])),
    level: levelFromXp(totalXp).level,
    completedChallenges: challengeRows.map((r) => r.ref),
  };
}

let running: Promise<Achievement[]> | null = null;

/**
 * Revisa el catálogo y guarda los logros nuevos (con su XP) en activity_log.
 * Se repite hasta que no haya más, porque el XP de un logro puede subir de nivel
 * y cumplir un logro de nivel.
 *
 * Si ya hay una revisión en curso, se espera a que termine y se revisa otra vez: así cada
 * logro se devuelve (y se anuncia) una sola vez, y no se pierde lo que haya pasado mientras tanto.
 */
export function checkAchievements(): Promise<Achievement[]> {
  if (running) return running.then(() => checkAchievements());
  running = (async () => {
    try {
      const db = await userDb();
      const found: Achievement[] = [];
      for (let round = 0; round < 5; round++) {
        const [snapshot, unlockedAt] = await Promise.all([getProgressSnapshot(), getUnlockedAchievements()]);
        const unlocked = new Set([...unlockedAt.keys(), ...found.map((a) => a.id)]);
        const fresh = newlyUnlocked(ACHIEVEMENTS, snapshot, unlocked);
        if (fresh.length === 0) break;
        const day = gameDay();
        const now = new Date().toISOString();
        for (const a of fresh) {
          // WHERE NOT EXISTS: nunca se guarda dos veces el mismo logro.
          await db.execute(
            `INSERT INTO activity_log (type, ref, xp, day, duration_sec, created_at)
             SELECT $1, $2, $3, $4, NULL, $5
             WHERE NOT EXISTS (SELECT 1 FROM activity_log WHERE type = $1 AND ref = $2)`,
            [ACHIEVEMENT_TYPE, a.id, a.xp, day, now],
          );
        }
        found.push(...fresh);
      }
      return found;
    } finally {
      running = null;
    }
  })();
  return running;
}

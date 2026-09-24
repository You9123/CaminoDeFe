import { userDb } from "./db";
import { gameDay } from "../domain/day";
import type { EmotionId } from "../domain/emotions";

/** Emociones registradas: día → id. */
export async function getEmotionLog(): Promise<Map<string, string>> {
  const db = await userDb();
  const rows = await db.select<{ day: string; emotion: string }[]>("SELECT day, emotion FROM emotions_log");
  return new Map(rows.map((r) => [r.day, r.emotion]));
}

export async function getTodayEmotion(day: string = gameDay()): Promise<EmotionId | null> {
  const db = await userDb();
  const rows = await db.select<{ emotion: EmotionId }[]>("SELECT emotion FROM emotions_log WHERE day = $1", [day]);
  return rows[0]?.emotion ?? null;
}

/** Guarda (o cambia) la emoción de hoy. */
export async function setTodayEmotion(emotion: EmotionId, day: string = gameDay()): Promise<void> {
  const db = await userDb();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO emotions_log (day, emotion, created_at, updated_at) VALUES ($1, $2, $3, $3)
     ON CONFLICT (day) DO UPDATE SET emotion = excluded.emotion, updated_at = excluded.updated_at`,
    [day, emotion, now],
  );
}

export async function clearTodayEmotion(day: string = gameDay()): Promise<void> {
  const db = await userDb();
  await db.execute("DELETE FROM emotions_log WHERE day = $1", [day]);
}

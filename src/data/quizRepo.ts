import { userDb } from "./db";
import { gameDay } from "../domain/day";
import { quizAward } from "../domain/quiz";
import type { Award } from "../domain/xp";
import { addJournalEntry } from "./journalRepo";
import { getDayActivity, recordActivity } from "./progressRepo";

/** Preguntas que ya respondiste bien alguna vez ("GEN.3a"). */
export async function getCorrectQuizRefs(): Promise<Set<string>> {
  const db = await userDb();
  const rows = await db.select<{ ref: string }[]>(
    "SELECT DISTINCT ref FROM activity_log WHERE type = 'quiz' AND ref IS NOT NULL",
  );
  return new Set(rows.map((r) => r.ref));
}

/**
 * Guarda una respuesta. Solo las correctas quedan en activity_log (type 'quiz', ref = la pregunta);
 * dan 5 XP la primera vez y hasta 20 veces al día. Una incorrecta no se guarda.
 */
export async function recordQuizAnswer(ref: string, correct: boolean): Promise<Award[]> {
  if (!correct) return [];
  const db = await userDb();
  const day = gameDay();
  const [before, today] = await Promise.all([
    db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM activity_log WHERE type = 'quiz' AND ref = $1", [ref]),
    getDayActivity(day),
  ]);
  const award = quizAward({
    correct,
    answeredBefore: Number(before[0]?.n ?? 0) > 0,
    rewardedToday: today.rewarded.quiz ?? 0,
  });
  if (!award) return [];
  await db.execute(
    "INSERT INTO activity_log (type, ref, xp, day, duration_sec, created_at) VALUES ('quiz', $1, $2, $3, NULL, $4)",
    [ref, award.xp, day, new Date().toISOString()],
  );
  return [award];
}

/**
 * Respuesta a una pregunta reflexiva: va al diario como reflexión (con la pregunta arriba)
 * y cuenta como reflexión del día. `chapterRef` es el capítulo ("JHN.15").
 */
export async function saveQuizReflection(question: string, answer: string, chapterRef: string): Promise<Award[]> {
  const content = answer.trim();
  if (!content) return [];
  await addJournalEntry({ kind: "reflection", content: `${question}\n\n${content}`, ref: chapterRef });
  return (await recordActivity("reflection", { ref: chapterRef })).awards;
}

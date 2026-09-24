import { addDays, format, parseISO } from "date-fns";
import { z } from "zod";
import { dayIndex } from "./dailyVerse";

/**
 * ¿Cómo me siento hoy? (Documento Maestro §2.10)
 * Es opcional y la app nunca juzga ni diagnostica: solo acompaña con un versículo.
 */
export const EMOTION_IDS = ["bien", "normal", "triste", "enojado", "ansioso", "cansado", "agradecido"] as const;
export type EmotionId = (typeof EMOTION_IDS)[number];

const verseRef = z.string().regex(/^[1-3A-Z]{3}\.\d+\.\d+$/);

export const emotionsFileSchema = z.object({
  emotions: z
    .array(
      z.object({
        id: z.enum(EMOTION_IDS),
        label: z.string().min(1),
        /** Frase corta y amable que aparece al elegirla. */
        line: z.string().min(1),
        /** Si se repite varios días, se muestra un mensaje de cuidado. */
        cuidado: z.boolean().optional(),
        verses: z.array(verseRef).min(3),
      }),
    )
    .length(EMOTION_IDS.length),
});
export type Emotion = z.infer<typeof emotionsFileSchema>["emotions"][number];

/** Versículo para una emoción: el mismo durante todo el día, distinto de un día a otro. */
export function pickEmotionVerse(e: Pick<Emotion, "verses">, day: string): string {
  const i = ((dayIndex(day) % e.verses.length) + e.verses.length) % e.verses.length;
  return e.verses[i];
}

/** Días seguidos en que se eligieron emociones "de cuidado". */
export const CARE_STREAK_DAYS = 3;

/**
 * ¿Mostrar el mensaje de cuidado? Solo si en los últimos días SEGUIDOS (hasta hoy)
 * se eligió siempre una emoción de cuidado. Un día sin registrar corta la cuenta.
 */
export function needsCare(
  log: ReadonlyMap<string, string>,
  today: string,
  careIds: ReadonlySet<string>,
  days: number = CARE_STREAK_DAYS,
): boolean {
  for (let i = 0; i < days; i++) {
    const day = format(addDays(parseISO(today), -i), "yyyy-MM-dd");
    const e = log.get(day);
    if (!e || !careIds.has(e)) return false;
  }
  return true;
}

export type EmotionCount = { id: EmotionId; count: number };

/** Cuántas veces se eligió cada emoción en los últimos `days` días (hasta hoy). */
export function emotionDistribution(
  log: ReadonlyMap<string, string>,
  today: string,
  days = 30,
): { counts: EmotionCount[]; total: number } {
  const from = format(addDays(parseISO(today), -(days - 1)), "yyyy-MM-dd");
  const counts = new Map<EmotionId, number>(EMOTION_IDS.map((id) => [id, 0]));
  let total = 0;
  for (const [day, e] of log) {
    if (day < from || day > today || !counts.has(e as EmotionId)) continue;
    counts.set(e as EmotionId, (counts.get(e as EmotionId) ?? 0) + 1);
    total++;
  }
  return { counts: EMOTION_IDS.map((id) => ({ id, count: counts.get(id) ?? 0 })), total };
}

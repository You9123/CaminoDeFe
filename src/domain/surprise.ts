import { z } from "zod";
import { dayIndex } from "./dailyVerse";

/**
 * Misión sorpresa (ver Documento Maestro §2.8).
 * Una misión extra al día, elegida con una semilla basada en la fecha (como el versículo del día).
 * Algunas se comprueban solas (leer un Salmo, marcar un favorito...); otras dependen de la vida
 * real ("da las gracias a alguien") y el usuario las confirma: la app confía en él.
 */
const code = z.string().regex(/^[1-3A-Z]{3}$/);

export const surpriseCheckSchema = z.discriminatedUnion("type", [
  /** Leer hoy un capítulo de alguno de estos libros. */
  z.object({ type: z.literal("read_chapter"), books: z.array(code).min(1) }),
  /** Marcar hoy un versículo como favorito. */
  z.object({ type: z.literal("favorite") }),
  /** Resaltar hoy un versículo con color. */
  z.object({ type: z.literal("highlight") }),
  /** Un momento de oración de al menos N minutos. */
  z.object({ type: z.literal("prayer_minutes"), minutes: z.number().int().positive() }),
  /** Escribir hoy una entrada libre en el diario. */
  z.object({ type: z.literal("journal_free") }),
  /** Algo de la vida real: lo confirma el usuario. */
  z.object({ type: z.literal("manual") }),
]);
export type SurpriseCheck = z.infer<typeof surpriseCheckSchema>;

export const surpriseSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  check: surpriseCheckSchema,
  /** Atajo opcional para ir a hacerla (ruta interna de la app). */
  link: z.object({ label: z.string().min(1), to: z.string().startsWith("/") }).optional(),
});
export type SurpriseMission = z.infer<typeof surpriseSchema>;

export const surprisesFileSchema = z.object({ missions: z.array(surpriseSchema).min(7) }).superRefine((file, ctx) => {
  const ids = new Set<string>();
  for (const m of file.missions) {
    if (ids.has(m.id)) ctx.addIssue({ code: "custom", message: `Misión repetida: ${m.id}` });
    ids.add(m.id);
  }
});

/**
 * La misión sorpresa del día. Se salta de 37 en 37 para que no siga el mismo orden que
 * el versículo del día y para que días seguidos den misiones distintas.
 */
export function pickSurprise<T>(list: readonly T[], day: string): T {
  if (list.length === 0) throw new Error("No hay misiones sorpresa");
  const i = (((dayIndex(day) * 37 + 11) % list.length) + list.length) % list.length;
  return list[i];
}

/** Lo que pasó hoy, para comprobar la misión. */
export type TodayFacts = {
  /** Referencias de capítulos leídos hoy ("PSA.23"). */
  chaptersRead: readonly string[];
  favoritedToday: boolean;
  highlightedToday: boolean;
  /** Duración (segundos) de cada momento de oración de hoy. */
  prayerSeconds: readonly number[];
  freeJournalToday: boolean;
};

/** ¿Ya se cumplió la condición? Las manuales nunca se cumplen solas. */
export function surpriseMet(check: SurpriseCheck, f: TodayFacts): boolean {
  switch (check.type) {
    case "read_chapter":
      return f.chaptersRead.some((ref) => check.books.includes(ref.split(".")[0]));
    case "favorite":
      return f.favoritedToday;
    case "highlight":
      return f.highlightedToday;
    case "prayer_minutes":
      // Margen de 5 s: el temporizador de 3 min puede registrar 179 s.
      return f.prayerSeconds.some((s) => s >= check.minutes * 60 - 5);
    case "journal_free":
      return f.freeJournalToday;
    case "manual":
      return false;
  }
}

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { z } from "zod";
import { ACHIEVEMENT_ICONS } from "./achievements";

/**
 * Desafíos de varios días (ver Documento Maestro §2.14).
 *
 * Son "misiones secundarias" que el usuario decide empezar. Cuenta lo que se hace desde el
 * DÍA en que empieza (también lo de más temprano ese mismo día, para no exigir empezar antes de leer). Algunos tienen plazo (en días de juego); si se acaba el
 * tiempo, simplemente termina y se puede volver a intentar: nunca se castiga.
 *
 * Como los logros, son datos (content/challenges.json) y aquí vive el motor puro.
 */

const code = z.string().regex(/^[1-3A-Z]{3}$/);
const count = z.number().int().positive();
const label = z.string().min(1);

export const CHALLENGE_ACTIVITIES = [
  "chapter_read",
  "daily_verse",
  "reflection",
  "prayer",
  "application",
  "daily_missions_bonus",
  "surprise_mission",
  "quiz",
] as const;

export const requirementSchema = z.discriminatedUnion("type", [
  /** Capítulos DISTINTOS leídos de esos libros. */
  z.object({ type: z.literal("chapters_in_books"), books: z.array(code).min(1), count, label }),
  /** TODOS los capítulos de esos libros. */
  z.object({ type: z.literal("books_read"), books: z.array(code).min(1), label }),
  /** Veces que se registró una actividad (opcional: solo las hechas sobre esos libros). */
  z.object({
    type: z.literal("activity_count"),
    activity: z.enum(CHALLENGE_ACTIVITIES),
    count,
    label,
    books: z.array(code).min(1).optional(),
  }),
  /** Días DISTINTOS con esa actividad. */
  z.object({ type: z.literal("activity_days"), activity: z.enum(CHALLENGE_ACTIVITIES), days: count, label }),
  /** Preguntas DISTINTAS del quiz respondidas bien (opcional: de esos libros). */
  z.object({ type: z.literal("quiz_correct"), count, label, books: z.array(code).min(1).optional() }),
]);
export type Requirement = z.infer<typeof requirementSchema>;

export const challengeSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.enum(ACHIEVEMENT_ICONS),
  /** Plazo en días (el día en que se empieza es el día 1), o null si no tiene plazo. */
  days: z.number().int().positive().nullable(),
  xp: z.number().int().min(50).max(500),
  /** "mayor": los desafíos grandes de la V3 (un libro completo con requisitos combinados). */
  tier: z.enum(["normal", "mayor"]).default("normal"),
  requirements: z.array(requirementSchema).min(1),
});
export type Challenge = z.infer<typeof challengeSchema>;

export const challengesFileSchema = z
  .object({ challenges: z.array(challengeSchema).min(1) })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    for (const c of file.challenges) {
      if (ids.has(c.id)) ctx.addIssue({ code: "custom", message: `Desafío repetido: ${c.id}` });
      ids.add(c.id);
    }
  });

/** Una actividad registrada desde el día en que empezó el desafío. */
export type ChallengeEvent = { type: string; ref: string | null; day: string };

export type RequirementProgress = { label: string; current: number; target: number; done: boolean };

export type ChallengeProgress = {
  requirements: RequirementProgress[];
  done: boolean;
  /** Último día (de juego) del plazo, o null si no tiene. */
  deadline: string | null;
  /** Días que quedan contando hoy (1 = hoy es el último día), o null si no tiene plazo. */
  daysLeft: number | null;
  /** Se acabó el plazo sin completarlo. */
  expired: boolean;
};

const bookOf = (ref: string | null) => (ref ? ref.split(".")[0] : "");

function requirementProgress(
  r: Requirement,
  events: readonly ChallengeEvent[],
  bookChapters: Record<string, number>,
): RequirementProgress {
  const make = (current: number, target: number) => ({
    label: r.label,
    current: Math.min(current, target),
    target,
    done: current >= target,
  });
  const chaptersOf = (books: readonly string[]) =>
    new Set(events.filter((e) => e.type === "chapter_read" && books.includes(bookOf(e.ref))).map((e) => e.ref)).size;

  switch (r.type) {
    case "chapters_in_books":
      return make(chaptersOf(r.books), r.count);
    case "books_read": {
      const target = r.books.reduce((s, b) => s + (bookChapters[b] ?? 0), 0);
      return make(chaptersOf(r.books), Math.max(target, 1));
    }
    case "activity_count":
      return make(
        events.filter((e) => e.type === r.activity && (!r.books || r.books.includes(bookOf(e.ref)))).length,
        r.count,
      );
    case "quiz_correct":
      return make(
        new Set(
          events.filter((e) => e.type === "quiz" && (!r.books || r.books.includes(bookOf(e.ref)))).map((e) => e.ref),
        ).size,
        r.count,
      );
    case "activity_days":
      return make(new Set(events.filter((e) => e.type === r.activity).map((e) => e.day)).size, r.days);
  }
}

export function challengeDeadline(c: Pick<Challenge, "days">, startedDay: string): string | null {
  return c.days === null ? null : format(addDays(parseISO(startedDay), c.days - 1), "yyyy-MM-dd");
}

/**
 * Progreso de un desafío en curso.
 * `events` son las actividades desde el día en que empezó; las posteriores al plazo no cuentan.
 */
export function evaluateChallenge(
  c: Challenge,
  input: {
    events: readonly ChallengeEvent[];
    startedDay: string;
    today: string;
    /** Capítulos por libro (código → total). */
    bookChapters: Record<string, number>;
  },
): ChallengeProgress {
  const deadline = challengeDeadline(c, input.startedDay);
  const events = deadline ? input.events.filter((e) => e.day <= deadline) : input.events;
  const requirements = c.requirements.map((r) => requirementProgress(r, events, input.bookChapters));
  const done = requirements.every((r) => r.done);
  const daysLeft = deadline ? differenceInCalendarDays(parseISO(deadline), parseISO(input.today)) + 1 : null;
  return {
    requirements,
    done,
    deadline,
    daysLeft: daysLeft === null ? null : Math.max(daysLeft, 0),
    expired: !done && daysLeft !== null && daysLeft <= 0,
  };
}

/** Porcentaje total (promedio de los requisitos), para una barra general. */
export function overallProgress(p: ChallengeProgress): number {
  if (p.requirements.length === 0) return 0;
  return p.requirements.reduce((s, r) => s + r.current / r.target, 0) / p.requirements.length;
}

/** Cuántos desafíos se pueden tener en curso a la vez (los mayores se cuentan aparte). */
export const MAX_ACTIVE_CHALLENGES = 3;
export const MAX_ACTIVE_MAJOR = 2;

export type ChallengeTier = "normal" | "mayor";

/** Límite de desafíos en curso según el tipo. */
export const maxActive = (tier: ChallengeTier) => (tier === "mayor" ? MAX_ACTIVE_MAJOR : MAX_ACTIVE_CHALLENGES);

export type RunStatus = "active" | "completed" | "abandoned" | "expired";
export type ChallengeRun = {
  id: number;
  challenge_id: string;
  started_at: string;
  started_day: string;
  status: RunStatus;
  ended_at: string | null;
};

export type ChallengeState = "available" | "active" | "completed";

/**
 * Estado de cada desafío según sus intentos:
 * completado (alguna vez) > en curso > disponible (nunca empezado, abandonado o vencido).
 */
export function challengeState(
  runs: readonly ChallengeRun[],
  challengeId: string,
): {
  state: ChallengeState;
  run: ChallengeRun | null;
  /** Intentos anteriores que no se completaron. */
  previousTries: number;
} {
  const mine = runs.filter((r) => r.challenge_id === challengeId);
  const completed = mine.find((r) => r.status === "completed");
  const active = mine.find((r) => r.status === "active");
  const previousTries = mine.filter((r) => r.status === "abandoned" || r.status === "expired").length;
  if (completed) return { state: "completed", run: completed, previousTries };
  if (active) return { state: "active", run: active, previousTries };
  return { state: "available", run: null, previousTries };
}

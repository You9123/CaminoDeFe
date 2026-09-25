import { z } from "zod";

/**
 * Logros e insignias (ver Documento Maestro §2.15 y §5.4).
 *
 * Los logros son DATOS (content/achievements.json), no código: cada uno tiene una regla
 * de un tipo conocido. Para agregar un logro nuevo solo se edita el JSON.
 *
 * Aquí vive el motor: funciones puras que reciben una "foto" del progreso y devuelven
 * qué logros se cumplen y cuánto falta para los demás. No tocan la base de datos.
 *
 * Un logro desbloqueado se guarda como una fila `achievement` en activity_log
 * (ref = id del logro, xp = recompensa). Así activity_log sigue siendo la única
 * fuente de verdad y el respaldo no cambia (ADR-0004).
 */

export const ACHIEVEMENT_ICONS = [
  "book",
  "scroll",
  "lamp",
  "bookmark",
  "sprout",
  "cross",
  "harp",
  "dove",
  "sunrise",
  "flame",
  "anchor",
  "check",
  "quill",
  "journal",
  "candle",
  "olive",
  "path",
  "compass",
  "spark",
] as const;
export type AchievementIcon = (typeof ACHIEVEMENT_ICONS)[number];

/** Tipos de actividad que se pueden contar con la regla `activity_count`. */
export const COUNTABLE_ACTIVITIES = [
  "chapter_read",
  "daily_verse",
  "short_reading",
  "reflection",
  "prayer",
  "application",
  "daily_missions_bonus",
  "surprise_mission",
  /** Respuestas correctas del quiz. */
  "quiz",
  /** Desafíos completados (filas de recompensa). */
  "challenge",
] as const;

const count = z.number().int().positive();

export const ruleSchema = z.discriminatedUnion("type", [
  /** Capítulos distintos leídos alguna vez. */
  z.object({ type: z.literal("chapters_read_count"), count }),
  /** Cantidad de libros terminados (cualquiera). */
  z.object({ type: z.literal("books_completed_count"), count }),
  /** Terminar TODOS los libros indicados (por código o por testamento). */
  z
    .object({
      type: z.literal("books_completed"),
      books: z
        .array(z.string().regex(/^[1-3A-Z]{3}$/))
        .min(1)
        .optional(),
      testament: z.enum(["AT", "NT", "ALL"]).optional(),
    })
    .refine((r) => (r.books === undefined) !== (r.testament === undefined), {
      message: "books_completed necesita `books` o `testament` (solo uno)",
    }),
  /** Récord de racha (el mejor, así que nunca se "pierde"). */
  z.object({ type: z.literal("streak_reached"), days: count }),
  /** Veces que se registró una actividad (aunque haya dado 0 XP por el límite diario). */
  z.object({ type: z.literal("activity_count"), activity: z.enum(COUNTABLE_ACTIVITIES), count }),
  z.object({ type: z.literal("level_reached"), level: count }),
  /** Completar un desafío concreto (la insignia de los desafíos mayores). */
  z.object({ type: z.literal("challenge_completed"), challenge: z.string().regex(/^[a-z0-9_]+$/) }),
]);
export type AchievementRule = z.infer<typeof ruleSchema>;

export const achievementSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  group: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.enum(ACHIEVEMENT_ICONS),
  rule: ruleSchema,
  /** XP de recompensa (0 = solo la insignia). */
  xp: z.number().int().min(0).max(500),
});
export type Achievement = z.infer<typeof achievementSchema>;

export const achievementsFileSchema = z
  .object({
    groups: z.array(z.object({ id: z.string(), title: z.string() })).min(1),
    achievements: z.array(achievementSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const groups = new Set(file.groups.map((g) => g.id));
    const ids = new Set<string>();
    for (const a of file.achievements) {
      if (ids.has(a.id)) ctx.addIssue({ code: "custom", message: `Logro repetido: ${a.id}` });
      ids.add(a.id);
      if (!groups.has(a.group)) ctx.addIssue({ code: "custom", message: `Grupo desconocido en ${a.id}: ${a.group}` });
    }
  });
export type AchievementsFile = z.infer<typeof achievementsFileSchema>;

/** Foto del progreso con la que se evalúan las reglas. */
export type ProgressSnapshot = {
  /** Capítulos leídos por libro (código → cantidad de capítulos distintos). */
  readByBook: Record<string, number>;
  /** Todos los libros de la Biblia: código → capítulos totales y testamento. */
  books: Record<string, { chapters: number; testament: "AT" | "NT" }>;
  bestStreak: number;
  /** Veces que se registró cada tipo de actividad. */
  activityCounts: Record<string, number>;
  level: number;
  /** Ids de los desafíos completados alguna vez. */
  completedChallenges: readonly string[];
};

export type RuleProgress = { current: number; target: number; done: boolean };

function completedBooks(s: ProgressSnapshot): string[] {
  return Object.keys(s.books).filter((code) => (s.readByBook[code] ?? 0) >= s.books[code].chapters);
}

function booksInRule(rule: Extract<AchievementRule, { type: "books_completed" }>, s: ProgressSnapshot): string[] {
  if (rule.books) return rule.books;
  const all = Object.keys(s.books);
  return rule.testament === "ALL" ? all : all.filter((c) => s.books[c].testament === rule.testament);
}

const progress = (current: number, target: number): RuleProgress => ({
  current: Math.min(current, target),
  target,
  done: current >= target,
});

/** Cuánto se ha avanzado en una regla. Los libros se miden en capítulos para que la barra avance. */
export function ruleProgress(rule: AchievementRule, s: ProgressSnapshot): RuleProgress {
  switch (rule.type) {
    case "chapters_read_count":
      return progress(
        Object.values(s.readByBook).reduce((a, b) => a + b, 0),
        rule.count,
      );
    case "books_completed_count":
      return progress(completedBooks(s).length, rule.count);
    case "books_completed": {
      const codes = booksInRule(rule, s);
      let current = 0;
      let target = 0;
      for (const code of codes) {
        const total = s.books[code]?.chapters ?? 0;
        target += total;
        current += Math.min(s.readByBook[code] ?? 0, total);
      }
      return progress(current, Math.max(target, 1));
    }
    case "streak_reached":
      return progress(s.bestStreak, rule.days);
    case "activity_count":
      return progress(s.activityCounts[rule.activity] ?? 0, rule.count);
    case "level_reached":
      return progress(s.level, rule.level);
    case "challenge_completed":
      return progress(s.completedChallenges.includes(rule.challenge) ? 1 : 0, 1);
  }
}

/** Logros que se cumplen ahora y todavía no estaban desbloqueados (en el orden del catálogo). */
export function newlyUnlocked(
  catalog: readonly Achievement[],
  s: ProgressSnapshot,
  unlocked: ReadonlySet<string>,
): Achievement[] {
  return catalog.filter((a) => !unlocked.has(a.id) && ruleProgress(a.rule, s).done);
}

export type AchievementView = Achievement & {
  progress: RuleProgress;
  /** Fecha ISO en que se desbloqueó, o null. */
  unlockedAt: string | null;
};

export function achievementViews(
  catalog: readonly Achievement[],
  s: ProgressSnapshot,
  unlockedAt: ReadonlyMap<string, string>,
): AchievementView[] {
  return catalog.map((a) => ({ ...a, progress: ruleProgress(a.rule, s), unlockedAt: unlockedAt.get(a.id) ?? null }));
}

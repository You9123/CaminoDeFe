import { z } from "zod";
import { XP_RULES, type Award } from "./xp";

/**
 * Quiz por libro (Documento Maestro §2.18, ADR-0009).
 *
 * - Las preguntas viven en content/quiz/<LIBRO>.json. La PRIMERA opción es la correcta;
 *   la app las mezcla al mostrarlas.
 * - Cada pregunta dice en qué versículo está la respuesta ("verse") y una palabra que tiene
 *   que aparecer en él ("check"): la prueba de contenido lo revisa contra bible.db.
 * - Las preguntas reflexivas ("reflect") no tienen respuesta correcta: lo que escribas va al diario.
 * - Una respuesta correcta da 5 XP solo la PRIMERA vez que aciertas esa pregunta, y hasta 20 al día.
 *   Equivocarse no resta nada ni queda registrado.
 */

const code = z.string().regex(/^[1-3A-Z]{3}$/);
const qid = z.string().regex(/^\d{1,3}[a-j]$/, "El id es el capítulo y una letra: '3a'");
const text = z.string().trim().min(1);

const choiceSchema = z.object({
  id: qid,
  chapter: z.number().int().positive(),
  q: text,
  /** La primera es la correcta. */
  options: z.array(text).min(3).max(4),
  /** Versículo donde está la respuesta ("GEN.3.4"). */
  verse: z.string().regex(/^[1-3]?[A-Z]{2,3}\.\d{1,3}\.\d{1,3}$/),
  /** Palabra que debe aparecer en ese versículo (se revisa en las pruebas). */
  check: text,
});

const reflectSchema = z.object({
  id: qid,
  chapter: z.number().int().positive(),
  reflect: text,
});

export const questionSchema = z.union([choiceSchema, reflectSchema]);
export type ChoiceQuestion = z.infer<typeof choiceSchema>;
export type ReflectQuestion = z.infer<typeof reflectSchema>;
export type Question = ChoiceQuestion | ReflectQuestion;

export const isChoice = <T extends Question>(q: T): q is T & ChoiceQuestion => "options" in q;

export const quizFileSchema = z
  .object({ book: code, questions: z.array(questionSchema).min(1) })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    for (const q of file.questions) {
      if (ids.has(q.id)) ctx.addIssue({ code: "custom", message: `${file.book}: pregunta repetida ${q.id}` });
      ids.add(q.id);
      if (!q.id.startsWith(`${q.chapter}`) || !/^\d+[a-j]$/.test(q.id) || parseInt(q.id, 10) !== q.chapter) {
        ctx.addIssue({
          code: "custom",
          message: `${file.book} ${q.id}: el id no corresponde al capítulo ${q.chapter}`,
        });
      }
      if (isChoice(q)) {
        const [book, ch] = q.verse.split(".");
        if (book !== file.book || Number(ch) !== q.chapter) {
          ctx.addIssue({ code: "custom", message: `${file.book} ${q.id}: el versículo ${q.verse} no es del capítulo` });
        }
        if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) {
          ctx.addIssue({ code: "custom", message: `${file.book} ${q.id}: opciones repetidas` });
        }
      }
    }
  });
export type QuizFile = z.infer<typeof quizFileSchema>;

/** Referencia de una pregunta, única en toda la app: "GEN.3a". Es la que se guarda en activity_log. */
export const quizRef = (book: string, q: Pick<Question, "id">) => `${book}.${q.id}`;

/** Una pregunta lista para mostrar, con su libro. */
export type QuizItem = Question & { book: string; ref: string };
export type ChoiceItem = ChoiceQuestion & { book: string; ref: string };

export function toItems(file: QuizFile): QuizItem[] {
  return file.questions.map((q) => ({ ...q, book: file.book, ref: quizRef(file.book, q) }));
}

// ---------- Mezclar sin azar real (para poder probarlo) ----------

/** Hash sencillo y estable de un texto (FNV-1a). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], seed: string): T[] {
  const out = [...list];
  const r = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Opciones mezcladas y cuál es la correcta. La semilla incluye el día: la misma pregunta
 * no cambia mientras la miras, pero otro día aparece en otro orden.
 */
export function arrangeOptions(
  q: ChoiceQuestion & { ref: string },
  day: string,
): { options: string[]; correct: number } {
  const order = shuffle(
    q.options.map((_, i) => i),
    `${q.ref}|${day}`,
  );
  return { options: order.map((i) => q.options[i]), correct: order.indexOf(0) };
}

// ---------- Qué preguntas mostrar ----------

/** Capítulos de un libro que tienen al menos una pregunta de opción múltiple. */
export function chaptersWithQuiz(items: readonly QuizItem[]): Set<number> {
  return new Set(items.filter(isChoice).map((q) => q.chapter));
}

/**
 * Preguntas después de leer un capítulo: hasta `max` de opción múltiple (primero las que todavía
 * no acertaste) y, si el capítulo tiene una, la reflexiva al final.
 */
export function pickChapterQuiz(
  items: readonly QuizItem[],
  chapter: number,
  correct: ReadonlySet<string>,
  max = 3,
): QuizItem[] {
  const mine = items.filter((q) => q.chapter === chapter);
  const choice = mine.filter(isChoice);
  const ordered = [...choice.filter((q) => !correct.has(q.ref)), ...choice.filter((q) => correct.has(q.ref))];
  const reflect = mine.find((q) => !isChoice(q));
  return [...ordered.slice(0, max), ...(reflect ? [reflect] : [])];
}

/**
 * Quiz del libro: hasta `max` preguntas de opción múltiple, primero de los capítulos que ya leíste
 * y que todavía no acertaste. Si no leíste nada, se toman de todo el libro. Orden mezclado con `seed`.
 */
export function pickBookQuiz(
  items: readonly QuizItem[],
  readChapters: ReadonlySet<number>,
  correct: ReadonlySet<string>,
  seed: string,
  max = 10,
): QuizItem[] {
  const choice = items.filter(isChoice);
  const read = choice.filter((q) => readChapters.has(q.chapter));
  const pool = read.length > 0 ? read : choice;
  const rank = (q: QuizItem) => (correct.has(q.ref) ? 1 : 0);
  const mixed = shuffle(pool, seed).sort((a, b) => rank(a) - rank(b));
  return mixed.slice(0, max).sort((a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id));
}

// ---------- XP ----------

/**
 * XP de una respuesta correcta: 5 si es la primera vez que aciertas esa pregunta
 * y todavía no llegaste al límite de hoy. Una respuesta incorrecta no da ni quita nada.
 */
export function quizAward(input: { correct: boolean; answeredBefore: boolean; rewardedToday: number }): Award | null {
  if (!input.correct) return null;
  const rule = XP_RULES.quiz;
  const capped = rule.dailyCap !== null && input.rewardedToday >= rule.dailyCap;
  return { type: "quiz", xp: input.answeredBefore || capped ? 0 : rule.xp };
}

/** Resumen amable al terminar. Nunca juzga: un quiz es una excusa para volver al texto. */
export function quizSummary(right: number, total: number): string {
  if (total === 0) return "Gracias por tomarte este momento.";
  if (right === total) return total === 1 ? "¡Bien! La respondiste bien." : `¡Muy bien! Respondiste bien las ${total}.`;
  if (right === 0)
    return total === 1
      ? "Esta vez no salió, y está bien. Volver a leer el pasaje ayuda mucho."
      : "Esta vez no salieron, y está bien. Volver a leer el pasaje ayuda mucho.";
  return `Respondiste bien ${right} de ${total}. Lo que no salió, ya lo leíste en su versículo.`;
}

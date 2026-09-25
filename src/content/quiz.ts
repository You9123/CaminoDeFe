import { quizFileSchema, toItems, type QuizItem } from "../domain/quiz";

/** Todos los archivos content/quiz/*.json, validados al cargar (ADR-0009). */
const FILES = import.meta.glob<unknown>("../../content/quiz/*.json", { eager: true, import: "default" });

const BY_BOOK = new Map<string, QuizItem[]>();
for (const raw of Object.values(FILES)) {
  const file = quizFileSchema.parse(raw);
  BY_BOOK.set(file.book, toItems(file));
}

/** Preguntas de un libro (vacío si ese libro todavía no tiene quiz). */
export const quizFor = (book: string): QuizItem[] => BY_BOOK.get(book) ?? [];

/** Libros con quiz, en el orden de la Biblia. */
export const QUIZ_BOOKS = [...BY_BOOK.keys()];

export const QUIZ_QUESTION_COUNT = [...BY_BOOK.values()].reduce((s, q) => s + q.length, 0);

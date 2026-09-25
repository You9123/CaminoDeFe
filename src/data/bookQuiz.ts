import { gameDay } from "../domain/day";
import { pickBookQuiz, type QuizItem } from "../domain/quiz";
import { quizFor } from "../content/quiz";
import { getBookByCode } from "./bibleRepo";
import { getReadChapters } from "./progressRepo";
import { getCorrectQuizRefs } from "./quizRepo";

/** Arma el quiz de un libro: hasta 10 preguntas, primero de lo que ya leíste (ver pickBookQuiz). */
export async function buildBookQuiz(code: string): Promise<QuizItem[]> {
  const book = await getBookByCode(code);
  if (!book) return [];
  const [read, correct] = await Promise.all([getReadChapters(book.id), getCorrectQuizRefs()]);
  return pickBookQuiz(quizFor(code), read, correct, `${code}|${gameDay()}`);
}

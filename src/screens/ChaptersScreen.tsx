import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getBookByCode } from "../data/bibleRepo";
import { getReadChapters } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { quizFor } from "../content/quiz";
import { buildBookQuiz } from "../data/bookQuiz";
import { QuizModal } from "../components/QuizModal";
import { LampIcon } from "../components/icons";
import { isChoice, type QuizItem } from "../domain/quiz";

export function ChaptersScreen() {
  const { code = "" } = useParams();
  const { data, loading } = useAsync(async () => {
    const book = await getBookByCode(code);
    if (!book) return null;
    return { book, read: await getReadChapters(book.id) };
  }, code);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);
  const questions = quizFor(code).filter(isChoice).length;

  if (loading && !data) return null;
  if (!data) return <p className="p-10 text-muted">No se encontró ese libro.</p>;

  const { book, read } = data;
  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <Link to="/biblia" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft size={16} /> Todos los libros
      </Link>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-4xl font-semibold">{book.name}</h1>
          <p className="text-muted">
            {read.size} de {book.chapters} capítulos leídos
          </p>
        </div>
        {questions > 0 && (
          <button
            onClick={() => void buildBookQuiz(book.code).then(setQuiz)}
            className="inline-flex items-center gap-2 rounded-xl border border-accent px-4 py-2.5 font-semibold text-accent hover:bg-accent-soft"
            title={`${questions} preguntas en total`}
          >
            <LampIcon size={18} duo={false} />
            Quiz del libro
          </button>
        )}
      </div>
      {quiz && <QuizModal items={quiz} title={`Quiz de ${book.name}`} onClose={() => setQuiz(null)} />}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => {
          const isRead = read.has(ch);
          return (
            <Link
              key={ch}
              to={`/biblia/${book.code}/${ch}`}
              className={`flex aspect-square items-center justify-center rounded-xl border text-lg font-medium transition hover:border-accent hover:text-accent ${
                isRead ? "border-success/40 bg-success-soft text-success" : "border-border bg-surface"
              }`}
              title={isRead ? "Leído" : undefined}
            >
              {ch}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

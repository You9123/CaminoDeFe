import { useState } from "react";
import { useNavigate } from "react-router";
import booksMeta from "../../content/books_meta.json";
import summaries from "../../content/book_summaries.json";
import { estimatedReadSeconds } from "../domain/reading";
import { formatDuration } from "../domain/stats";
import { getBookChapterWords, type Book } from "../data/bibleRepo";
import { getReadChapters } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { Modal } from "./Modal";
import { BookIcon, LampIcon } from "./icons";
import { QuizModal } from "./QuizModal";
import { quizFor } from "../content/quiz";
import { buildBookQuiz } from "../data/bookQuiz";
import type { QuizItem } from "../domain/quiz";

const SUMMARIES: Record<string, string> = summaries.summaries;

/** Ficha de un libro en el mapa: de qué trata, cuánto llevas y por dónde seguir. */
export function BookSheet({ book, read, onClose }: { book: Book; read: number; onClose: () => void }) {
  const navigate = useNavigate();
  const zone = booksMeta.zones.find((z) => z.id === book.zone);
  const data = useAsync(async () => {
    const [chapters, words] = await Promise.all([getReadChapters(book.id), getBookChapterWords(book.id)]);
    return { chapters, words };
  }, book.code);

  const readSet = data.data?.chapters ?? new Set<number>();
  const words = data.data?.words ?? [];
  const totalSecs = words.reduce((s, w) => s + estimatedReadSeconds(w), 0);
  const leftSecs = words.reduce((s, w, i) => s + (readSet.has(i + 1) ? 0 : estimatedReadSeconds(w)), 0);
  const firstUnread = Array.from({ length: book.chapters }, (_, i) => i + 1).find((c) => !readSet.has(c)) ?? 1;
  const done = read >= book.chapters;
  const pct = (read / book.chapters) * 100;

  const go = (chapter: number) => navigate(`/biblia/${book.code}/${chapter}`);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);
  const hasQuiz = quizFor(book.code).length > 0;
  if (quiz) return <QuizModal items={quiz} title={`Quiz de ${book.name}`} onClose={onClose} />;

  return (
    <Modal onClose={onClose} label={book.name}>
      <p className="pr-10 text-xs font-semibold tracking-wide text-accent uppercase">
        Zona {book.zone} · {zone?.name}
      </p>
      <h2 className="mt-1 font-display text-3xl font-semibold">{book.name}</h2>
      <p className="mt-2 leading-relaxed text-muted">{SUMMARIES[book.code]}</p>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium">
            {read} de {book.chapters} {book.chapters === 1 ? "capítulo" : "capítulos"}
          </span>
          {data.data && (
            <span className="text-muted">
              {done ? `Unas ${formatDuration(totalSecs)} de lectura` : `Te faltan unas ${formatDuration(leftSecs)}`}
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {book.chapters > 1 && (
        <div className="mt-5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
            <button
              key={c}
              onClick={() => go(c)}
              title={readSet.has(c) ? `Capítulo ${c} · leído` : `Capítulo ${c}`}
              className={`h-8 min-w-8 rounded-lg px-1.5 text-xs font-semibold tabular-nums transition ${
                readSet.has(c)
                  ? "bg-accent text-accent-ink hover:brightness-110"
                  : "border border-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        {hasQuiz ? (
          <button
            onClick={() => void buildBookQuiz(book.code).then(setQuiz)}
            className="mr-auto inline-flex items-center gap-2 rounded-xl border border-accent px-4 py-2.5 font-semibold text-accent hover:bg-accent-soft"
            title={read > 0 ? "Preguntas de los capítulos que ya leíste" : "Preguntas de todo el libro"}
          >
            <LampIcon size={18} duo={false} />
            Quiz del libro
          </button>
        ) : (
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
            Cerrar
          </button>
        )}
        <button
          onClick={() => go(firstUnread)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink"
        >
          <BookIcon size={18} duo={false} />
          {done ? "Leer otra vez" : read > 0 ? `Seguir en el capítulo ${firstUnread}` : "Empezar a leer"}
        </button>
      </div>
    </Modal>
  );
}

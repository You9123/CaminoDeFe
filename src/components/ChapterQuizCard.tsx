import { useState } from "react";
import { pickChapterQuiz, isChoice, type QuizItem } from "../domain/quiz";
import { getCorrectQuizRefs } from "../data/quizRepo";
import { quizFor } from "../content/quiz";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { QuizModal } from "./QuizModal";
import { LampIcon } from "./icons";

/**
 * Tarjeta opcional al final del capítulo: "Pon a prueba lo que leíste".
 * Se habilita cuando el capítulo ya está marcado como leído (hoy o antes).
 */
export function ChapterQuizCard({
  book,
  bookName,
  chapter,
  enabled,
}: {
  book: string;
  bookName: string;
  chapter: number;
  enabled: boolean;
}) {
  const totalXp = useProgress((s) => s.totalXp);
  const [open, setOpen] = useState<QuizItem[] | null>(null);
  const hasQuiz = quizFor(book).some((q) => q.chapter === chapter && isChoice(q));
  const correct = useAsync(getCorrectQuizRefs, `${totalXp}`).data;
  if (!hasQuiz) return null;

  const items = pickChapterQuiz(quizFor(book), chapter, correct ?? new Set());
  const choice = items.filter(isChoice);
  const pending = choice.filter((q) => !correct?.has(q.ref)).length;

  return (
    <aside className="mt-12 flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-soft/30 px-5 py-4">
      <LampIcon size={30} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Pon a prueba lo que leíste</p>
        <p className="text-sm text-muted">
          {choice.length === 1 ? "Una pregunta" : `${choice.length} preguntas`} de {bookName} {chapter}
          {items.length > choice.length && " y una para pensar"}
          {correct && pending === 0
            ? choice.length === 1
              ? " · ya la respondiste bien"
              : " · ya las respondiste bien"
            : ""}
        </p>
      </div>
      <button
        onClick={() => setOpen(items)}
        disabled={!enabled}
        title={enabled ? undefined : "Se habilita al terminar el capítulo"}
        className="shrink-0 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-40"
      >
        {enabled ? "Responder" : "Al terminar"}
      </button>
      {open && <QuizModal items={open} title={`${bookName} ${chapter}`} onClose={() => setOpen(null)} />}
    </aside>
  );
}

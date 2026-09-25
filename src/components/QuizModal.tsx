import { useMemo, useState } from "react";
import { Link } from "react-router";
import { gameDay } from "../domain/day";
import { arrangeOptions, isChoice, quizSummary, type ChoiceItem, type QuizItem } from "../domain/quiz";
import { chapterRef } from "../domain/refs";
import { getVerseByRef, refPath } from "../data/bibleRepo";
import { recordQuizAnswer, saveQuizReflection } from "../data/quizRepo";
import { chapterLabel } from "../content/bookNames";
import { useAsync } from "../hooks/useAsync";
import { useProgress, useXpFor } from "../stores/progressStore";
import { Modal } from "./Modal";
import { Medallion } from "./Medallion";
import { CheckIcon, LampIcon, QuillIcon } from "./icons";

type Result = { right: boolean; xp: number };

/**
 * Quiz (Documento Maestro §2.18): una pregunta a la vez. Al responder se muestra el versículo
 * donde está la respuesta. Equivocarse no resta nada. Las reflexivas van al diario.
 */
export function QuizModal({ items, title, onClose }: { items: QuizItem[]; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [done, setDone] = useState(items.length === 0);
  const [reflected, setReflected] = useState(false);
  const item = items[index];
  const choiceCount = items.filter(isChoice).length;
  const right = Object.values(results).filter((r) => r.right).length;
  const xp = Object.values(results).reduce((s, r) => s + r.xp, 0);

  const next = () => (index + 1 < items.length ? setIndex(index + 1) : setDone(true));

  return (
    <Modal onClose={onClose} label={title}>
      <div className="pr-10">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{title}</p>
        {!done && items.length > 1 && (
          <div className="mt-3 flex gap-1.5" aria-label={`Pregunta ${index + 1} de ${items.length}`}>
            {items.map((q, i) => (
              <span
                key={q.ref}
                className={`h-1.5 flex-1 rounded-full ${
                  i < index || results[q.ref]
                    ? results[q.ref]?.right === false
                      ? "bg-muted/50"
                      : "bg-accent"
                    : i === index
                      ? "bg-accent/40"
                      : "bg-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {done ? (
        <Summary right={right} total={choiceCount} xp={xp} reflected={reflected} onClose={onClose} />
      ) : isChoice(item) ? (
        <ChoiceStep
          key={item.ref}
          item={item}
          last={index + 1 === items.length}
          onAnswered={(r) => setResults((prev) => ({ ...prev, [item.ref]: r }))}
          onNext={next}
          onClose={onClose}
        />
      ) : (
        <ReflectStep key={item.ref} item={item} onSaved={() => setReflected(true)} onNext={next} />
      )}
    </Modal>
  );
}

function ChoiceStep({
  item,
  last,
  onAnswered,
  onNext,
  onClose,
}: {
  item: ChoiceItem;
  last: boolean;
  onAnswered: (r: Result) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const celebrate = useProgress((s) => s.celebrate);
  const { options, correct } = useMemo(() => arrangeOptions(item, gameDay()), [item]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [gained, setGained] = useState(0);
  const verse = useAsync(() => getVerseByRef(item.verse), item.verse);
  const answered = chosen !== null;
  const isRight = chosen === correct;

  const choose = async (i: number) => {
    if (answered) return;
    setChosen(i);
    const right = i === correct;
    try {
      const awards = await recordQuizAnswer(item.ref, right);
      const xp = awards.reduce((s, a) => s + a.xp, 0);
      setGained(xp);
      onAnswered({ right, xp });
      if (awards.length > 0) await celebrate(awards, { quietXp: true });
    } catch (e) {
      console.error(e);
      onAnswered({ right, xp: 0 });
    }
  };

  return (
    <>
      <h2 className="mt-4 font-display text-2xl leading-snug font-semibold">{item.q}</h2>
      <div className="mt-5 flex flex-col gap-2" role="list">
        {options.map((o, i) => {
          const state = !answered ? "idle" : i === correct ? "correct" : i === chosen ? "chosen" : "rest";
          return (
            <button
              key={o}
              role="listitem"
              onClick={() => void choose(i)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                state === "idle"
                  ? "border-border hover:border-accent hover:bg-accent-soft/40"
                  : state === "correct"
                    ? "border-success bg-success-soft font-semibold"
                    : state === "chosen"
                      ? "border-border bg-surface-2 text-muted"
                      : "border-border/60 text-muted/80"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                  state === "correct" ? "border-success bg-success text-white" : "border-border text-muted"
                }`}
              >
                {state === "correct" ? <CheckIcon size={15} /> : "ABCD"[i]}
              </span>
              <span className="leading-snug">{o}</span>
              {state === "chosen" && <span className="ml-auto shrink-0 text-xs">Tu respuesta</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="animate-rise mt-5">
          <p className={`font-semibold ${isRight ? "text-success" : "text-ink"}`}>
            {isRight ? "¡Bien!" : "Casi. La respuesta está aquí:"}
            {gained > 0 && (
              <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-sm text-success">+{gained} XP</span>
            )}
          </p>
          {verse.data && (
            <figure className="mt-2 rounded-2xl bg-surface-2/70 px-4 py-3">
              <blockquote className="font-reading leading-relaxed">«{verse.data.text}»</blockquote>
              <figcaption className="mt-1 text-right text-sm text-muted">
                <Link to={refPath(item.verse)} onClick={onClose} className="hover:text-accent">
                  {verse.data.label}
                </Link>
              </figcaption>
            </figure>
          )}
          <div className="mt-5 flex justify-end">
            <button onClick={onNext} className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink">
              {last ? "Ver cómo me fue" : "Siguiente"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ReflectStep({
  item,
  onSaved,
  onNext,
}: {
  item: QuizItem & { reflect: string };
  onSaved: () => void;
  onNext: () => void;
}) {
  const celebrate = useProgress((s) => s.celebrate);
  const xp = useXpFor("reflection");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const awards = await saveQuizReflection(item.reflect, text, chapterRef(item.book, item.chapter));
      await celebrate(awards);
      onSaved();
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-accent">
        <QuillIcon size={20} /> Para pensar · no hay respuesta correcta
      </p>
      <h2 className="mt-2 font-display text-2xl leading-snug font-semibold">{item.reflect}</h2>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Escribe con tus palabras."
        className="selectable mt-4 w-full resize-none rounded-xl border border-border bg-bg p-3 outline-none focus:border-accent"
      />
      <p className="mt-2 text-xs text-muted">
        Se guarda en tu diario, con la pregunta ({chapterLabel(`${item.book}.${item.chapter}`)}).
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onNext} className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
          Saltar
        </button>
        <button
          onClick={() => void save()}
          disabled={saving || text.trim().length === 0}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:opacity-50"
        >
          {xp > 0 ? `Guardar en mi diario (+${xp} XP)` : "Guardar en mi diario"}
        </button>
      </div>
    </>
  );
}

function Summary({
  right,
  total,
  xp,
  reflected,
  onClose,
}: {
  right: number;
  total: number;
  xp: number;
  reflected: boolean;
  onClose: () => void;
}) {
  return (
    <div className="animate-rise flex flex-col items-center py-4 text-center">
      <Medallion
        icon={right === total && total > 0 ? CheckIcon : LampIcon}
        unlocked
        gold={right === total && total > 0}
        size={84}
      />
      <p className="mt-4 font-display text-2xl font-semibold">{quizSummary(right, total)}</p>
      {xp > 0 ? (
        <p className="mt-1 font-semibold text-success">+{xp} XP</p>
      ) : (
        right > 0 && (
          <p className="mt-1 text-sm text-muted">Las preguntas que ya habías acertado no vuelven a dar XP.</p>
        )
      )}
      {reflected && <p className="mt-2 text-sm text-muted">Tu respuesta para pensar quedó en el diario.</p>}
      <button onClick={onClose} className="mt-6 rounded-xl bg-accent px-6 py-2.5 font-semibold text-accent-ink">
        Listo
      </button>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import { CARE_EMOTIONS, EMOTION_BY_ID, EMOTIONS } from "../content/emotions";
import { needsCare, pickEmotionVerse, type EmotionId } from "../domain/emotions";
import { getVerseByRef, refPath } from "../data/bibleRepo";
import { clearTodayEmotion, getEmotionLog, setTodayEmotion } from "../data/emotionsRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";
import { EMOTION_ICON } from "./emotionIcons";
import { ListenButton } from "./ListenButton";
import { PostReadingFlow } from "./PostReadingFlow";
import { BookIcon, QuillIcon } from "./icons";

/**
 * ¿Cómo me siento hoy? (Documento Maestro §2.10)
 * Opcional: se puede saltar por hoy o apagar en Ajustes. Nunca juzga ni diagnostica.
 */
export function EmotionCard() {
  const day = useProgress((s) => s.day);
  const promptOn = useSettings((s) => s.emotionPrompt);
  const [version, setVersion] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const navigate = useNavigate();

  const log = useAsync(getEmotionLog, `${day}-${version}`).data;
  const today = (log?.get(day) as EmotionId | undefined) ?? null;
  const emotion = today ? EMOTION_BY_ID.get(today) : undefined;
  const verseRef = emotion ? pickEmotionVerse(emotion, day) : null;
  const verse = useAsync(async () => (verseRef ? getVerseByRef(verseRef) : null), verseRef ?? "none").data;

  if (!log) return null;
  if (!today && (!promptOn || skipped)) return null;

  const choose = async (id: EmotionId) => {
    await setTodayEmotion(id, day);
    setChanging(false);
    setVersion((v) => v + 1);
  };

  const clear = async () => {
    await clearTodayEmotion(day);
    setChanging(false);
    setVersion((v) => v + 1);
  };

  // ---------- Elegir ----------
  if (!today || changing) {
    return (
      <section className="animate-rise mb-6 rounded-3xl border border-border bg-surface px-7 py-5">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">¿Cómo te sientes hoy?</h2>
          <button
            onClick={() => (changing ? setChanging(false) : setSkipped(true))}
            className="text-sm text-muted hover:text-ink"
          >
            {changing ? "Cancelar" : "Ahora no"}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {EMOTIONS.map((e) => {
            const Icon = EMOTION_ICON[e.id];
            const selected = e.id === today;
            return (
              <button
                key={e.id}
                onClick={() => void choose(e.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-sm transition ${
                  selected
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-border hover:border-accent hover:bg-accent-soft/40"
                }`}
              >
                <Icon size={28} className="text-accent" />
                {e.label}
              </button>
            );
          })}
        </div>
        {changing && today && (
          <button onClick={() => void clear()} className="mt-3 text-xs text-muted hover:text-ink">
            Borrar lo de hoy
          </button>
        )}
      </section>
    );
  }

  // ---------- Ya eligió ----------
  const Icon = EMOTION_ICON[today];
  const care = needsCare(log, day, CARE_EMOTIONS);

  return (
    <section className="animate-rise mb-6 rounded-3xl border border-border bg-surface px-7 py-5">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted">
              Hoy te sientes <span className="font-semibold text-ink">{emotion?.label.toLowerCase()}</span>.{" "}
              {emotion?.line}
            </p>
            <button onClick={() => setChanging(true)} className="shrink-0 text-sm text-muted hover:text-ink">
              Cambiar
            </button>
          </div>
          {verse && (
            <>
              <blockquote className="selectable mt-2 font-reading text-lg leading-relaxed">«{verse.text}»</blockquote>
              <p className="mt-1 font-display text-muted italic">{verse.label}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(refPath(verse.ref))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"
                >
                  <BookIcon size={17} duo={false} /> Leer el contexto
                </button>
                <ListenButton text={verse.text} label={verse.label} />
                <button
                  onClick={() => setReflecting(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"
                >
                  <QuillIcon size={17} duo={false} /> Reflexionar
                </button>
              </div>
            </>
          )}
          {care && (
            <div className="mt-4 rounded-2xl border border-dashed border-accent/50 bg-accent-soft/40 px-4 py-3 text-sm leading-relaxed">
              Llevas algunos días sintiéndote así. No tienes que cargarlo solo: si puedes, habla con alguien de
              confianza, alguien de tu familia, un amigo o tu pastor. Y si te pesa mucho, buscar a un profesional
              también es una forma de cuidarte.
            </div>
          )}
        </div>
      </div>

      {reflecting && verse && (
        <PostReadingFlow
          steps={["reflection"]}
          refId={verse.ref}
          refLabel={verse.label}
          onClose={() => setReflecting(false)}
        />
      )}
    </section>
  );
}

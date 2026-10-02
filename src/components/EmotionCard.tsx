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
 * Desde la V3.5 es discreta: una fila para elegir y, después, una línea con el versículo plegado.
 */
export function EmotionCard() {
  const day = useProgress((s) => s.day);
  const promptOn = useSettings((s) => s.emotionPrompt);
  const [version, setVersion] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  // El versículo de la emoción queda plegado: Hoy tiene un solo versículo grande (el del día).
  const [showVerse, setShowVerse] = useState(false);
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

  // ---------- Elegir (discreto: una sola fila, V3.5) ----------
  if (!today || changing) {
    return (
      <section className="animate-rise mb-6 rounded-2xl border border-border bg-surface/70 px-5 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold">¿Cómo te sientes hoy?</h2>
          <span className="flex items-center gap-3 text-sm">
            {changing && today && (
              <button onClick={() => void clear()} className="text-xs text-muted hover:text-ink">
                Borrar lo de hoy
              </button>
            )}
            <button
              onClick={() => (changing ? setChanging(false) : setSkipped(true))}
              className="text-muted hover:text-ink"
            >
              {changing ? "Cancelar" : "Ahora no"}
            </button>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((e) => {
            const Icon = EMOTION_ICON[e.id];
            const selected = e.id === today;
            return (
              <button
                key={e.id}
                onClick={() => void choose(e.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] transition ${
                  selected
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-border text-muted hover:border-accent hover:text-ink"
                }`}
              >
                <Icon size={17} className="text-accent" />
                {e.label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------- Ya eligió ----------
  const Icon = EMOTION_ICON[today];
  const care = needsCare(log, day, CARE_EMOTIONS);

  return (
    <section className="animate-rise mb-6 rounded-2xl border border-border bg-surface/70 px-5 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon size={22} />
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
          {verse && !showVerse && (
            <button
              onClick={() => setShowVerse(true)}
              className="mt-1 text-sm font-semibold text-accent hover:underline"
            >
              Ver un versículo para hoy
            </button>
          )}
          {verse && showVerse && (
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

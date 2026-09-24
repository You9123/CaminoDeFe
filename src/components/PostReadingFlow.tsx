import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { BookIcon, CandleIcon, CheckIcon, QuillIcon, SproutIcon } from "./icons";
import { Modal } from "./Modal";
import { addJournalEntry } from "../data/journalRepo";
import { recordActivity } from "../data/progressRepo";
import type { ActivityType } from "../domain/xp";
import { useProgress, useXpFor } from "../stores/progressStore";

/**
 * Flujo "Leer → Reflexionar → Orar → Aplicar" (Documento Maestro §2.4).
 * Todos los pasos son opcionales. Se usa después de leer un capítulo
 * y también desde las misiones del día (con un solo paso).
 */
export type FlowStep = "verse" | "reflection" | "prayer" | "application";

type Props = {
  steps: FlowStep[];
  /** Referencia bíblica relacionada (ej. "JHN.3" o "PSA.23.1"). */
  refId: string | null;
  /** Texto para mostrar (ej. "Juan 3"). */
  refLabel: string;
  /** Solo para el paso "verse": el texto a leer y qué actividad registra al terminar. */
  verse?: { text: string; activity: ActivityType };
  /** Título opcional arriba (ej. "Tengo 5 minutos"). */
  title?: string;
  /** Temporizador de oración preseleccionado (0 = sin temporizador). */
  prayerMinutes?: number;
  onClose: () => void;
};

export function PostReadingFlow({ steps, refId, refLabel, verse, title, prayerMinutes = 0, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const next = () => (index + 1 < steps.length ? setIndex(index + 1) : onClose());

  return (
    <Modal onClose={onClose} label={title ?? "Reflexión, oración y aplicación"}>
      {title && <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>}
      {steps.length > 1 && (
        <div className="mb-5 flex gap-1.5">
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
      )}
      {step === "verse" && verse && <VerseStep refId={refId} refLabel={refLabel} verse={verse} onNext={next} />}
      {step === "reflection" && <ReflectionStep refId={refId} refLabel={refLabel} onNext={next} />}
      {step === "prayer" && <PrayerStep refId={refId} defaultMinutes={prayerMinutes} onNext={next} />}
      {step === "application" && <ApplicationStep refId={refId} onNext={next} />}
    </Modal>
  );
}

/** "Guardar (+15 XP)" o solo "Guardar" si ya se alcanzó el límite de hoy. */
function withXp(label: string, xp: number): string {
  return xp > 0 ? `${label} (+${xp} XP)` : label;
}

type StepProps = { refId: string | null; onNext: () => void };

function useSaver() {
  const celebrate = useProgress((s) => s.celebrate);
  const [saving, setSaving] = useState(false);
  const run = async (fn: () => Promise<Parameters<typeof celebrate>[0]>, onDone: () => void) => {
    setSaving(true);
    try {
      await celebrate(await fn());
      onDone();
    } finally {
      setSaving(false);
    }
  };
  return { saving, run };
}

function StepFooter(props: { onSkip: () => void; onSave: () => void; saveLabel: string; disabled?: boolean }) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button onClick={props.onSkip} className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
        Saltar
      </button>
      <button
        onClick={props.onSave}
        disabled={props.disabled}
        className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink transition disabled:opacity-50"
      >
        {props.saveLabel}
      </button>
    </div>
  );
}

function StepLabel({ icon: Icon, children }: { icon: ComponentType<{ size?: number }>; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-accent">
      <Icon size={22} />
      {children}
    </p>
  );
}

// ---------- Lectura corta ----------

function VerseStep({
  refId,
  refLabel,
  verse,
  onNext,
}: StepProps & { refLabel: string; verse: { text: string; activity: ActivityType } }) {
  const { saving, run } = useSaver();
  const xp = useXpFor(verse.activity);
  const save = () => run(async () => (await recordActivity(verse.activity, { ref: refId })).awards, onNext);

  return (
    <>
      <StepLabel icon={BookIcon}>Lee con calma</StepLabel>
      <blockquote className="selectable mt-4 font-reading text-[1.45rem] leading-relaxed">«{verse.text}»</blockquote>
      <p className="mt-3 font-display text-muted italic">{refLabel}</p>
      <p className="mt-4 text-sm text-muted">Léelo dos veces, despacio. Fíjate en la palabra que más te toque.</p>
      <StepFooter onSkip={onNext} onSave={save} disabled={saving} saveLabel={withXp("Lo leí", xp)} />
    </>
  );
}

// ---------- Reflexión ----------

function ReflectionStep({ refId, refLabel, onNext }: StepProps & { refLabel: string }) {
  const [text, setText] = useState("");
  const { saving, run } = useSaver();
  const xp = useXpFor("reflection");

  const save = () =>
    run(async () => {
      await addJournalEntry({ kind: "reflection", content: text, ref: refId });
      return (await recordActivity("reflection", { ref: refId })).awards;
    }, onNext);

  return (
    <>
      <StepLabel icon={QuillIcon}>Reflexiona</StepLabel>
      <h2 className="mt-2 mb-4 font-display text-2xl font-semibold">
        ¿Qué fue lo que más te llamó la atención de {refLabel}?
      </h2>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Escribe con tus palabras. No hay respuestas correctas ni incorrectas."
        className="selectable w-full resize-none rounded-xl border border-border bg-bg p-3 outline-none focus:border-accent"
      />
      <p className="mt-2 text-xs text-muted">Se guarda en tu diario, solo en esta computadora.</p>
      <StepFooter
        onSkip={onNext}
        onSave={save}
        disabled={saving || text.trim().length === 0}
        saveLabel={withXp("Guardar", xp)}
      />
    </>
  );
}

// ---------- Oración ----------

const PRAYER_OPTIONS = [0, 1, 3, 5] as const;

function PrayerStep({ refId, defaultMinutes, onNext }: StepProps & { defaultMinutes: number }) {
  const [minutes, setMinutes] = useState<number>(defaultMinutes);
  const [remaining, setRemaining] = useState(defaultMinutes * 60);
  const [started] = useState(() => Date.now());
  const { saving, run } = useSaver();
  const xp = useXpFor("prayer");

  useEffect(() => {
    if (minutes === 0) return;
    const end = Date.now() + minutes * 60_000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [minutes]);

  const choose = (m: number) => {
    setMinutes(m);
    setRemaining(m * 60);
  };

  const save = () =>
    run(async () => {
      const durationSec = Math.round((Date.now() - started) / 1000);
      return (await recordActivity("prayer", { ref: refId, durationSec })).awards;
    }, onNext);

  const timerDone = minutes > 0 && remaining === 0;

  return (
    <>
      <StepLabel icon={CandleIcon}>Momento de oración</StepLabel>
      <h2 className="mt-2 mb-2 font-display text-2xl font-semibold">Tómate un momento para hablar con Dios.</h2>
      <p className="mb-5 text-muted">Si quieres, usa un temporizador para no estar pendiente del reloj.</p>

      <div className="mb-5 flex gap-2">
        {PRAYER_OPTIONS.map((m) => (
          <button
            key={m}
            onClick={() => choose(m)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              minutes === m
                ? "border-accent bg-accent-soft font-semibold text-accent"
                : "border-border hover:border-accent"
            }`}
          >
            {m === 0 ? "Sin temporizador" : `${m} min`}
          </button>
        ))}
      </div>

      {minutes > 0 && (
        <p className="mb-2 text-center font-reading text-5xl tabular-nums">
          {timerDone ? "Amén" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
        </p>
      )}

      <StepFooter onSkip={onNext} onSave={save} disabled={saving} saveLabel={withXp("He terminado", xp)} />
    </>
  );
}

// ---------- Aplicación ----------

const APPLICATION_OPTIONS = [
  "Ser más paciente",
  "Perdonar a alguien",
  "Ayudar a alguien",
  "Evitar algo que sé que está mal",
  "Agradecer",
];

function ApplicationStep({ refId, onNext }: StepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [other, setOther] = useState("");
  const [showOther, setShowOther] = useState(false);
  const { saving, run } = useSaver();
  const xp = useXpFor("application");

  const toggle = (opt: string) => {
    const s = new Set(selected);
    if (s.has(opt)) s.delete(opt);
    else s.add(opt);
    setSelected(s);
  };

  const choices = [...selected, ...(showOther && other.trim() ? [other.trim()] : [])];

  const save = () =>
    run(async () => {
      await addJournalEntry({ kind: "application", content: choices.join(" · "), ref: refId });
      return (await recordActivity("application", { ref: refId })).awards;
    }, onNext);

  return (
    <>
      <StepLabel icon={SproutIcon}>Ponlo en práctica</StepLabel>
      <h2 className="mt-2 mb-4 font-display text-2xl font-semibold">¿Cómo puedes aplicar esto hoy?</h2>

      <div className="flex flex-wrap gap-2">
        {APPLICATION_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              selected.has(opt)
                ? "border-accent bg-accent-soft font-semibold text-accent"
                : "border-border hover:border-accent"
            }`}
          >
            {selected.has(opt) && <CheckIcon size={14} className="mr-1 -mt-0.5 inline" />}
            {opt}
          </button>
        ))}
        <button
          onClick={() => setShowOther(!showOther)}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            showOther ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border hover:border-accent"
          }`}
        >
          Otra…
        </button>
      </div>

      {showOther && (
        <input
          autoFocus
          value={other}
          onChange={(e) => setOther(e.target.value)}
          maxLength={200}
          placeholder="Escribe tu propia acción"
          className="selectable mt-3 w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />
      )}

      <StepFooter
        onSkip={onNext}
        onSave={save}
        disabled={saving || choices.length === 0}
        saveLabel={withXp("Me comprometo", xp)}
      />
    </>
  );
}

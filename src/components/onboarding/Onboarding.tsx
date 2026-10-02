import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ONBOARDING_STEPS, type OnboardingStep } from "../../domain/onboarding";
import { markOnboardingDone } from "../../data/onboardingRepo";
import { useProgress } from "../../stores/progressStore";
import { useSettings } from "../../stores/settingsStore";
import { PetChooser } from "../pet/PetChooser";
import { Toggle } from "../../screens/settings/ui";
import { BellIcon, BookIcon, LogoMark } from "../icons";

/**
 * Bienvenida corta para un perfil nuevo (V3.5, ADR-0013):
 * bienvenida → nombre → mascota (o ninguna) → recordatorio opcional → "Lee tu primer capítulo".
 * Al terminar Génesis 1, la pantalla "Capítulo completado" dice "Tu primer descubrimiento".
 * Todo se puede saltar y cambiar después en Ajustes.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const index = ONBOARDING_STEPS.indexOf(step);
  const next = () => setStep(ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)]);
  const navigate = useNavigate();

  const finish = async (path: string) => {
    await markOnboardingDone();
    onDone();
    navigate(path);
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-10">
      <div className="animate-rise w-full max-w-2xl rounded-3xl border border-border bg-surface px-10 py-9 shadow-sm">
        <div className="mb-7 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-display text-xl font-semibold">Camino de Fe</span>
          </span>
          <span className="flex gap-1.5" aria-label={`Paso ${index + 1} de ${ONBOARDING_STEPS.length}`}>
            {ONBOARDING_STEPS.map((s, i) => (
              <span key={s} className={`h-1.5 w-7 rounded-full ${i <= index ? "bg-accent" : "bg-border"}`} />
            ))}
          </span>
        </div>

        {step === "welcome" && <Welcome onNext={next} />}
        {step === "name" && <NameStep onNext={next} />}
        {step === "pet" && <PetChooser onChosen={next} />}
        {step === "reminder" && <ReminderStep onNext={next} />}
        {step === "first" && (
          <FirstChapter onRead={() => void finish("/biblia/GEN/1")} onLater={() => void finish("/")} />
        )}
      </div>
    </div>
  );
}

function Primary(props: { onClick?: () => void; type?: "submit"; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink transition disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

function Secondary(props: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink"
    >
      {props.children}
    </button>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h1 className="font-display text-4xl leading-tight font-semibold">Bienvenido</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        Camino de Fe te acompaña a leer la Biblia un poco cada día, a tu ritmo. Lees, reflexionas, oras y lo pones en
        práctica. Por el camino vas descubriendo personajes, lugares y momentos de la historia.
      </p>
      <p className="mt-3 text-sm text-muted">Todo se guarda solo en esta computadora.</p>
      <div className="mt-8 flex justify-end">
        <Primary onClick={onNext}>Empezar</Primary>
      </div>
    </>
  );
}

function NameStep({ onNext }: { onNext: () => void }) {
  const setName = useProgress((s) => s.setName);
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) void setName(value).then(onNext);
      }}
    >
      <h2 className="font-display text-3xl font-semibold">¿Cómo te llamas?</h2>
      <p className="mt-2 text-muted">Para saludarte en la pantalla Hoy.</p>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        placeholder="Tu nombre"
        className="mt-5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-lg outline-none focus:border-accent"
      />
      <div className="mt-8 flex justify-end gap-3">
        <Secondary onClick={onNext}>Prefiero no decirlo</Secondary>
        <Primary type="submit" disabled={!value.trim()}>
          Seguir
        </Primary>
      </div>
    </form>
  );
}

function ReminderStep({ onNext }: { onNext: () => void }) {
  const { reminderEnabled, reminderTime, setReminder } = useSettings();
  return (
    <>
      <p className="flex items-center gap-2 text-sm font-semibold text-accent">
        <BellIcon size={20} /> Opcional
      </p>
      <h2 className="mt-1 font-display text-3xl font-semibold">¿Quieres un recordatorio?</h2>
      <p className="mt-2 leading-relaxed text-muted">
        Un aviso al día, a la hora que elijas, solo si todavía no hiciste nada ese día. Nunca te va a reclamar nada.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Toggle checked={reminderEnabled} onChange={(v) => void setReminder(v, reminderTime)} label="Recordarme" />
        <input
          type="time"
          value={reminderTime}
          disabled={!reminderEnabled}
          onChange={(e) => void setReminder(reminderEnabled, e.target.value)}
          className="rounded-xl border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent disabled:opacity-50"
          aria-label="Hora del recordatorio"
        />
      </div>
      <div className="mt-8 flex justify-end">
        <Primary onClick={onNext}>Seguir</Primary>
      </div>
    </>
  );
}

function FirstChapter({ onRead, onLater }: { onRead: () => void; onLater: () => void }) {
  return (
    <>
      <h2 className="font-display text-3xl font-semibold">Lee tu primer capítulo</h2>
      <p className="mt-2 leading-relaxed text-muted">
        Empieza por el principio: Génesis 1, la creación. Son pocos minutos. Cuando lo termines, vas a hacer tu primer
        descubrimiento.
      </p>
      <p className="mt-3 text-sm text-muted">
        También puedes empezar por cualquier otro libro: la Biblia está abierta completa desde el primer día.
      </p>
      <div className="mt-8 flex justify-end gap-3">
        <Secondary onClick={onLater}>Ahora no</Secondary>
        <Primary onClick={onRead}>
          <BookIcon size={18} duo={false} /> Leer Génesis 1
        </Primary>
      </div>
    </>
  );
}

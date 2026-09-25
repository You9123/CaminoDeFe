import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { isEasyPin, PIN_MAX, PIN_MIN, pinProblem, resetReadyAt } from "../../domain/pin";
import { usePin } from "../../stores/pinStore";
import { toast } from "../../stores/toastStore";
import { PinInput, PinPrompt } from "../../components/PinLock";
import { LockIcon } from "../../components/icons";
import { Field } from "./ui";

type Mode = "idle" | "create" | "confirmChange" | "change" | "confirmRemove";

/** Ajustes → Privacidad: poner, cambiar o quitar el PIN del diario. */
export function PrivacyFields() {
  const { enabled, resetRequestedAt, removePin, cancelReset } = usePin();
  const [mode, setMode] = useState<Mode>("idle");

  const remove = async () => {
    await removePin();
    toast("Se quitó el PIN del diario.", "info");
  };

  return (
    <Field
      label="PIN del diario"
      hint={
        <>
          El PIN evita que otra persona que use esta computadora lea tu diario desde la app. También se pide para
          exportar el respaldo. Si lo olvidas, puedes quitarlo esperando 24 horas, sin perder nada. No cifra tus
          archivos: es un candado para miradas curiosas.
        </>
      }
    >
      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl bg-accent-soft/60 px-3 py-2 text-sm font-semibold text-accent">
            <LockIcon size={17} duo={false} /> Tu diario tiene PIN
          </span>
          <button
            onClick={() => setMode("confirmChange")}
            className="rounded-xl border border-border px-4 py-2 font-semibold hover:border-accent hover:text-accent"
          >
            Cambiar PIN
          </button>
          <button
            onClick={() => setMode("confirmRemove")}
            className="rounded-xl px-4 py-2 text-muted hover:bg-surface-2 hover:text-ink"
          >
            Quitar PIN
          </button>
        </div>
      ) : (
        mode !== "create" && (
          <button
            onClick={() => setMode("create")}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink"
          >
            <LockIcon size={18} duo={false} /> Proteger mi diario con un PIN
          </button>
        )
      )}

      {enabled && resetRequestedAt !== null && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft/30 px-4 py-3 text-sm">
          <span>
            Se pidió quitar el PIN (se podrá desde el{" "}
            {format(resetReadyAt(resetRequestedAt), "d 'de' MMMM 'a las' HH:mm", { locale: es })}). ¿No fuiste tú?
          </span>
          <button onClick={() => void cancelReset()} className="rounded-lg bg-ink px-3 py-1.5 font-semibold text-bg">
            Cancelar la solicitud
          </button>
        </div>
      )}

      {(mode === "create" || mode === "change") && (
        <NewPinForm changing={mode === "change"} onDone={() => setMode("idle")} />
      )}

      {mode === "confirmChange" && (
        <PinPrompt
          title="Cambiar PIN"
          message="Primero escribe tu PIN actual."
          onConfirm={() => setMode("change")}
          onClose={() => setMode((m) => (m === "confirmChange" ? "idle" : m))}
        />
      )}
      {mode === "confirmRemove" && (
        <PinPrompt
          title="Quitar PIN"
          message="Escribe tu PIN actual. Tu diario queda como está, solo sin candado."
          confirmLabel="Quitar PIN"
          onConfirm={() => void remove()}
          onClose={() => setMode("idle")}
        />
      )}
    </Field>
  );
}

function NewPinForm({ changing, onDone }: { changing: boolean; onDone: () => void }) {
  const setPin = usePin((s) => s.setPin);
  const [step, setStep] = useState<"first" | "repeat">("first");
  const [first, setFirst] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  const next = () => {
    const problem = pinProblem(first);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep("repeat");
  };

  const save = async () => {
    if (repeat !== first) {
      setRepeat("");
      setShake((n) => n + 1);
      setError("No coincide. Escríbelo otra vez.");
      return;
    }
    setBusy(true);
    try {
      await setPin(first);
      toast(changing ? "PIN cambiado." : "Listo: tu diario ahora tiene PIN.", "info");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="animate-rise mt-3 rounded-xl border border-border bg-bg/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "first") next();
        else void save();
      }}
    >
      <p className="text-sm font-semibold">
        {step === "first"
          ? `${changing ? "Tu PIN nuevo" : "Elige un PIN"}: de ${PIN_MIN} a ${PIN_MAX} números`
          : "Escríbelo otra vez para confirmar"}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {step === "first" ? (
          <PinInput
            key="first"
            value={first}
            onChange={(v) => {
              setFirst(v);
              setError(null);
            }}
            onSubmit={next}
            label={changing ? "PIN nuevo" : "PIN"}
            autoFocus
            size="sm"
          />
        ) : (
          <PinInput
            key="repeat"
            value={repeat}
            onChange={(v) => {
              setRepeat(v);
              setError(null);
            }}
            onSubmit={() => void save()}
            label="Repetir PIN"
            autoFocus
            shake={shake}
            size="sm"
          />
        )}
      </div>
      <p className="min-h-5 text-xs text-muted" role="status" aria-live="polite">
        {error ??
          (step === "first" && isEasyPin(first)
            ? "Ese PIN es fácil de adivinar. Puedes usarlo, pero uno menos obvio protege mejor."
            : "")}
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={step === "first" ? onDone : () => (setStep("first"), setRepeat(""), setError(null))}
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink"
        >
          {step === "first" ? "Cancelar" : "Atrás"}
        </button>
        <button
          type="submit"
          disabled={busy || (step === "first" ? first.length < PIN_MIN : repeat.length < PIN_MIN)}
          className="rounded-lg bg-accent px-4 py-1.5 font-semibold text-accent-ink disabled:opacity-50"
        >
          {step === "first" ? "Siguiente" : "Guardar PIN"}
        </button>
      </div>
    </form>
  );
}

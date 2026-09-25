import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cleanPinInput, FREE_TRIES, lockRemaining, PIN_MAX, PIN_MIN, resetReadyAt, waitLabel } from "../domain/pin";
import { usePin, type UnlockResult } from "../stores/pinStore";
import { toast } from "../stores/toastStore";
import { Modal } from "./Modal";
import { LockIcon } from "./icons";

// ---------- Campo del PIN ----------

/**
 * Campo del PIN: un input real (para el teclado y los lectores de pantalla) debajo de seis puntos.
 * Los dos últimos puntos son punteados porque son opcionales (el PIN tiene de 4 a 6 números).
 */
export function PinInput({
  value,
  onChange,
  onSubmit,
  label,
  autoFocus,
  disabled,
  shake,
  size = "lg",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  label: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Cambia de valor para hacer temblar los puntos (PIN incorrecto). */
  shake?: number;
  size?: "lg" | "sm";
}) {
  const dot = size === "lg" ? "h-4 w-4" : "h-3 w-3";
  const input = useRef<HTMLInputElement>(null);
  // Al terminar la espera, el campo vuelve a tener el foco para seguir escribiendo.
  useEffect(() => {
    if (autoFocus && !disabled) input.current?.focus();
  }, [autoFocus, disabled]);
  return (
    <div className="relative inline-flex">
      <div key={shake} className={`flex gap-3 px-4 py-3 ${shake ? "animate-shake" : ""}`} aria-hidden>
        {Array.from({ length: PIN_MAX }, (_, i) => (
          <span
            key={i}
            className={`${dot} rounded-full border-2 transition-colors ${
              i < value.length
                ? "border-accent bg-accent"
                : i < PIN_MIN
                  ? "border-muted/60"
                  : "border-dashed border-muted/40"
            }`}
          />
        ))}
      </div>
      <input
        ref={input}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={label}
        value={value}
        maxLength={PIN_MAX}
        onChange={(e) => onChange(cleanPinInput(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="peer absolute inset-0 cursor-text rounded-xl opacity-0"
      />
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-accent/50 peer-focus-visible:ring-2" />
    </div>
  );
}

/** Teclado numérico para quien prefiere el mouse. */
function Keypad({
  onDigit,
  onDelete,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const key = "h-12 rounded-xl text-lg font-semibold tabular-nums transition hover:bg-surface-2 disabled:opacity-40";
  return (
    <div className="mt-3 grid w-64 grid-cols-3 gap-1.5">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button key={d} type="button" tabIndex={-1} disabled={disabled} onClick={() => onDigit(d)} className={key}>
          {d}
        </button>
      ))}
      <span />
      <button type="button" tabIndex={-1} disabled={disabled} onClick={() => onDigit("0")} className={key}>
        0
      </button>
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={onDelete}
        className={`${key} text-sm font-normal text-muted`}
      >
        Borrar
      </button>
    </div>
  );
}

// ---------- Cuenta regresiva ----------

/** Milisegundos que faltan para poder volver a intentar; se actualiza cada segundo. */
function useWait(): number {
  const failures = usePin((s) => s.failures);
  const [now, setNow] = useState(() => Date.now());
  const wait = lockRemaining(failures, now);
  useEffect(() => {
    if (!failures.until) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [failures.until]);
  return wait;
}

function failMessage(count: number): string {
  const left = FREE_TRIES - count;
  return left > 0 && left <= 2
    ? `PIN incorrecto. ${left === 1 ? "Queda 1 intento" : `Quedan ${left} intentos`} antes de tener que esperar.`
    : "PIN incorrecto. Inténtalo de nuevo.";
}

/** Escribir el PIN y comprobarlo. Lo comparten la pantalla de bloqueo y la ventana de confirmar. */
function usePinEntry(action: (pin: string) => Promise<UnlockResult>, onOk: (r: UnlockResult & { ok: true }) => void) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const wait = useWait();

  const submit = async () => {
    if (busy || wait > 0) return;
    if (pin.length < PIN_MIN) {
      setError(`El PIN tiene al menos ${PIN_MIN} números.`);
      return;
    }
    setBusy(true);
    try {
      const r = await action(pin);
      if (r.ok) {
        setError(null);
        onOk(r);
      } else {
        setPin("");
        setShake((n) => n + 1);
        // Si hay que esperar, la cuenta regresiva ya lo dice (y se borra sola al terminar).
        setError(r.waitMs > 0 ? null : failMessage(usePin.getState().failures.count));
      }
    } finally {
      setBusy(false);
    }
  };

  const change = (v: string) => {
    setPin(v);
    if (error && v) setError(null);
  };

  return { pin, change, submit, error, shake, busy, wait };
}

// ---------- Pantalla de bloqueo del diario ----------

/**
 * Envuelve el Diario: si hay un PIN y el diario está cerrado, muestra la pantalla de bloqueo.
 * Si sales del Diario (o minimizas la app) por más de 10 minutos, se vuelve a cerrar.
 */
export function JournalGate({ children }: { children: ReactNode }) {
  const { loaded, enabled, unlocked, enterJournal, leaveJournal } = usePin();

  useLayoutEffect(() => {
    enterJournal();
    const onVisibility = () => (document.hidden ? leaveJournal() : enterJournal());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      leaveJournal();
    };
  }, [enterJournal, leaveJournal]);

  if (!loaded) return null;
  if (!enabled || unlocked) return <>{children}</>;
  return <LockScreen />;
}

function LockScreen() {
  const unlock = usePin((s) => s.unlock);
  const resetAt = usePin((s) => s.resetRequestedAt);
  const [forgot, setForgot] = useState(false);
  const entry = usePinEntry(unlock, (r) => {
    if (r.cancelledReset) toast("Se canceló la solicitud para quitar el PIN.", "info");
  });
  const locked = entry.wait > 0;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-10 py-12 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft/70 text-accent">
        <LockIcon size={40} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold">Tu diario está protegido</h1>
      <p className="mt-1.5 text-muted">Escribe tu PIN para abrirlo.</p>

      <form
        className="mt-6 flex flex-col items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void entry.submit();
        }}
      >
        <PinInput
          value={entry.pin}
          onChange={entry.change}
          onSubmit={() => void entry.submit()}
          label="PIN del diario"
          autoFocus
          disabled={locked}
          shake={entry.shake}
        />
        <p className="mt-2 min-h-10 max-w-xs text-sm text-muted" role="status" aria-live="polite">
          {locked ? `Demasiados intentos. Espera ${waitLabel(entry.wait)} para volver a probar.` : entry.error}
        </p>
        <Keypad
          disabled={locked}
          onDigit={(d) => entry.change(cleanPinInput(entry.pin + d))}
          onDelete={() => entry.change(entry.pin.slice(0, -1))}
        />
        <button
          type="submit"
          disabled={locked || entry.busy || entry.pin.length < PIN_MIN}
          className="mt-4 w-64 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:opacity-50"
        >
          Abrir mi diario
        </button>
      </form>

      {resetAt !== null ? (
        <ResetPending requestedAt={resetAt} />
      ) : forgot ? (
        <ForgotPanel onCancel={() => setForgot(false)} />
      ) : (
        <button
          onClick={() => setForgot(true)}
          className="mt-6 text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          ¿Olvidaste tu PIN?
        </button>
      )}
    </div>
  );
}

function ForgotPanel({ onCancel }: { onCancel: () => void }) {
  const requestReset = usePin((s) => s.requestReset);
  return (
    <div className="animate-rise mt-6 rounded-2xl border border-border bg-surface p-5 text-left text-sm">
      <p className="font-semibold">No pasa nada.</p>
      <p className="mt-1.5 leading-relaxed text-muted">
        Por seguridad, puedes quitar el PIN después de esperar <strong className="text-ink">24 horas</strong>. Tus
        entradas no se borran: solo se quita el candado. Si abres el diario con tu PIN antes de ese plazo, la solicitud
        se cancela sola.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink">
          Cancelar
        </button>
        <button onClick={() => void requestReset()} className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-bg">
          Pedir quitar el PIN
        </button>
      </div>
    </div>
  );
}

function ResetPending({ requestedAt }: { requestedAt: number }) {
  const { cancelReset, completeReset } = usePin();
  const ready = resetReadyAt(requestedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const done = now >= ready;

  const remove = async () => {
    if (await completeReset()) toast("Se quitó el PIN. Tu diario está como lo dejaste.", "info");
  };

  return (
    <div className="animate-rise mt-6 w-full rounded-2xl border border-accent/40 bg-accent-soft/30 p-5 text-left text-sm">
      {done ? (
        <>
          <p className="font-semibold">Ya puedes quitar el PIN.</p>
          <p className="mt-1.5 text-muted">
            Tus entradas quedan como están. Si quieres, después puedes poner un PIN nuevo en Ajustes.
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">Pediste quitar el PIN.</p>
          <p className="mt-1.5 text-muted">
            Podrás quitarlo desde el {format(ready, "d 'de' MMMM 'a las' HH:mm", { locale: es })}. Mientras tanto, si
            recuerdas tu PIN, escríbelo arriba.
          </p>
        </>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => void cancelReset()}
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink"
        >
          Cancelar la solicitud
        </button>
        {done && (
          <button onClick={() => void remove()} className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-bg">
            Quitar el PIN
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Confirmar con el PIN ----------

/** Pide el PIN antes de algo delicado (exportar el respaldo, cambiar o quitar el PIN). */
export function PinPrompt({
  title,
  message,
  confirmLabel = "Continuar",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const check = usePin((s) => s.check);
  const done = useRef(false);
  const entry = usePinEntry(check, () => {
    if (done.current) return;
    done.current = true;
    onClose();
    onConfirm();
  });
  const locked = entry.wait > 0;

  return (
    <Modal onClose={onClose} label={title}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft/70 text-accent">
          <LockIcon size={28} />
        </span>
        <h2 className="mt-3 font-display text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-muted">{message}</p>
        <form
          className="mt-4 flex flex-col items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void entry.submit();
          }}
        >
          <PinInput
            value={entry.pin}
            onChange={entry.change}
            onSubmit={() => void entry.submit()}
            label="PIN del diario"
            autoFocus
            disabled={locked}
            shake={entry.shake}
          />
          <p className="mt-1 min-h-10 max-w-xs text-sm text-muted" role="status" aria-live="polite">
            {locked ? `Demasiados intentos. Espera ${waitLabel(entry.wait)} para volver a probar.` : entry.error}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={locked || entry.busy || entry.pin.length < PIN_MIN}
              className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

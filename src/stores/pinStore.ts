import { create } from "zustand";
import { deleteSetting, getSetting, setSetting } from "../data/progressRepo";
import {
  canReset,
  hashPin,
  isPinHash,
  lockRemaining,
  NO_FAILURES,
  parseFailures,
  registerFailure,
  serializeFailures,
  shouldRelock,
  verifyPin,
  type Failures,
} from "../domain/pin";

const KEY_PIN = "journal_pin";
const KEY_FAILS = "journal_pin_failures";
const KEY_RESET = "journal_pin_reset_at";

export type UnlockResult = { ok: true; cancelledReset: boolean } | { ok: false; waitMs: number };

type PinState = {
  loaded: boolean;
  /** Hay un PIN puesto. */
  enabled: boolean;
  /** El diario está abierto en esta sesión. Se cierra al reiniciar la app. */
  unlocked: boolean;
  failures: Failures;
  /** Cuándo se pidió quitar un PIN olvidado (ms), o null. */
  resetRequestedAt: number | null;
  /** Cuándo saliste del diario (ms), para volver a cerrarlo. */
  leftAt: number | null;
  load: () => Promise<void>;
  unlock: (pin: string) => Promise<UnlockResult>;
  /** Comprueba el PIN sin abrir el diario (cambiar/quitar PIN, exportar respaldo). */
  check: (pin: string) => Promise<UnlockResult>;
  lock: () => void;
  /** Poner o cambiar el PIN. Deja el diario abierto. */
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  requestReset: () => Promise<void>;
  cancelReset: () => Promise<void>;
  /** Quitar el PIN olvidado, solo si ya pasaron 24 h. */
  completeReset: () => Promise<boolean>;
  leaveJournal: () => void;
  enterJournal: () => void;
};

let stored: string | null = null;

export const usePin = create<PinState>((set, get) => {
  const saveFailures = async (failures: Failures) => {
    set({ failures });
    if (failures.count === 0) await deleteSetting(KEY_FAILS);
    else await setSetting(KEY_FAILS, serializeFailures(failures));
  };

  const attempt = async (pin: string): Promise<UnlockResult> => {
    const { failures, resetRequestedAt } = get();
    const wait = lockRemaining(failures, Date.now());
    if (wait > 0) return { ok: false, waitMs: wait };
    if (!stored) return { ok: true, cancelledReset: false };
    if (await verifyPin(pin, stored)) {
      if (failures.count > 0) await saveFailures(NO_FAILURES);
      const cancelledReset = resetRequestedAt !== null;
      if (cancelledReset) {
        set({ resetRequestedAt: null });
        await deleteSetting(KEY_RESET);
      }
      return { ok: true, cancelledReset };
    }
    const next = registerFailure(failures, Date.now());
    await saveFailures(next);
    return { ok: false, waitMs: lockRemaining(next, Date.now()) };
  };

  return {
    loaded: false,
    enabled: false,
    unlocked: false,
    failures: NO_FAILURES,
    resetRequestedAt: null,
    leftAt: null,

    load: async () => {
      const [pin, fails, reset] = await Promise.all([
        getSetting(KEY_PIN),
        getSetting(KEY_FAILS),
        getSetting(KEY_RESET),
      ]);
      const prev = stored;
      stored = isPinHash(pin) ? pin : null;
      const resetAt = reset ? Number(reset) : null;
      set({
        loaded: true,
        enabled: stored !== null,
        // Al importar un respaldo con otro PIN, el diario se vuelve a cerrar.
        unlocked: stored !== null && stored === prev && get().unlocked,
        failures: parseFailures(fails),
        resetRequestedAt: resetAt !== null && Number.isFinite(resetAt) ? resetAt : null,
      });
    },

    unlock: async (pin) => {
      const r = await attempt(pin);
      if (r.ok) set({ unlocked: true, leftAt: null });
      return r;
    },

    check: attempt,

    lock: () => set({ unlocked: false, leftAt: null }),

    setPin: async (pin) => {
      const hash = await hashPin(pin);
      await setSetting(KEY_PIN, hash);
      await Promise.all([deleteSetting(KEY_FAILS), deleteSetting(KEY_RESET)]);
      stored = hash;
      set({ enabled: true, unlocked: true, failures: NO_FAILURES, resetRequestedAt: null, leftAt: null });
    },

    removePin: async () => {
      await Promise.all([deleteSetting(KEY_PIN), deleteSetting(KEY_FAILS), deleteSetting(KEY_RESET)]);
      stored = null;
      set({ enabled: false, unlocked: false, failures: NO_FAILURES, resetRequestedAt: null, leftAt: null });
    },

    requestReset: async () => {
      if (get().resetRequestedAt !== null) return;
      const now = Date.now();
      await setSetting(KEY_RESET, String(now));
      set({ resetRequestedAt: now });
    },

    cancelReset: async () => {
      await deleteSetting(KEY_RESET);
      set({ resetRequestedAt: null });
    },

    completeReset: async () => {
      if (!canReset(get().resetRequestedAt, Date.now())) return false;
      await get().removePin();
      return true;
    },

    leaveJournal: () => {
      if (get().unlocked) set({ leftAt: Date.now() });
    },

    enterJournal: () => {
      const { leftAt } = get();
      if (shouldRelock(leftAt, Date.now())) set({ unlocked: false, leftAt: null });
      else if (leftAt !== null) set({ leftAt: null });
    },
  };
});

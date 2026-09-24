import { create } from "zustand";
import type { SessionPlan } from "../domain/sessions";

/** La sesión por tiempo que está en curso (solo en memoria: si se cierra la app, se termina). */
type SessionState = {
  plan: SessionPlan | null;
  /** Índice del capítulo actual dentro del plan. */
  index: number;
  start: (plan: SessionPlan) => void;
  advance: () => void;
  end: () => void;
};

export const useSession = create<SessionState>((set, get) => ({
  plan: null,
  index: 0,
  start: (plan) => set({ plan, index: 0 }),
  advance: () => set({ index: Math.min(get().index + 1, (get().plan?.chapters.length ?? 1) - 1) }),
  end: () => set({ plan: null, index: 0 }),
}));

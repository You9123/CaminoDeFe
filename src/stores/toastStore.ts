import { create } from "zustand";

export type ToastKind = "xp" | "bonus" | "streak" | "level" | "achievement" | "collectible" | "info";
export type Toast = { id: number; text: string; kind: ToastKind };

type ToastState = { toasts: Toast[]; push: (text: string, kind?: ToastKind) => void; dismiss: (id: number) => void };

let nextId = 1;
const DURATION_MS = 3500;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (text, kind = "info") => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, text, kind }] });
    window.setTimeout(() => get().dismiss(id), DURATION_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Atajo para mostrar un aviso desde cualquier parte. */
export const toast = (text: string, kind?: ToastKind) => useToasts.getState().push(text, kind);

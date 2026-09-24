import type { ComponentType } from "react";
import { useToasts, type ToastKind } from "../stores/toastStore";
import { CheckIcon, FlameIcon, PeakIcon, SparkIcon } from "./icons";

const STYLES: Record<ToastKind, { box: string; icon: ComponentType<{ size?: number; duo?: boolean }> }> = {
  xp: { box: "bg-success text-white", icon: SparkIcon },
  bonus: { box: "bg-accent text-accent-ink", icon: SparkIcon },
  streak: { box: "bg-accent text-accent-ink", icon: FlameIcon },
  level: { box: "bg-ink text-bg", icon: PeakIcon },
  info: { box: "bg-surface text-ink border border-border", icon: CheckIcon },
};

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed top-5 right-5 z-50 flex flex-col items-end gap-2" aria-live="polite">
      {toasts.map((t) => {
        const { box, icon: Icon } = STYLES[t.kind];
        return (
          <div
            key={t.id}
            className={`animate-rise flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold shadow-lg ${box}`}
          >
            <Icon size={18} duo={false} />
            {t.text}
          </div>
        );
      })}
    </div>
  );
}

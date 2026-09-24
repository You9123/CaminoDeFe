import type { ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {children}
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
      <span className="text-sm">{label}</span>
    </label>
  );
}

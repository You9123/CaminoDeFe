import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  onClose,
  children,
  label,
  wide = false,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
  /** Ficha más ancha (coleccionables). */
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className={`animate-rise relative max-h-full w-full overflow-y-auto rounded-3xl border border-border bg-surface p-8 shadow-xl ${
          wide ? "max-w-[44rem]" : "max-w-[34rem]"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-lg bg-surface/80 p-1.5 text-muted backdrop-blur-sm hover:bg-surface-2 hover:text-ink"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

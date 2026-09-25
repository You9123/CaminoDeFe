import { useEffect } from "react";
import { useProgress } from "../stores/progressStore";
import { ACHIEVEMENT_ICON } from "./badgeIcons";
import { Medallion } from "./Medallion";
import { SparkIcon } from "./icons";

const SPARKS = [
  { x: -120, y: -70, d: 0 },
  { x: 118, y: -84, d: 120 },
  { x: -150, y: 30, d: 260 },
  { x: 150, y: 40, d: 60 },
  { x: -60, y: -120, d: 340 },
  { x: 70, y: -128, d: 200 },
  { x: -100, y: 96, d: 420 },
  { x: 104, y: 100, d: 300 },
];

/**
 * "Desafío completado": la animación grande de los desafíos mayores (Documento Maestro §2.14).
 * Un medallón dorado con rayos que giran y chispas. Sin sonido. Se apaga con "reducir movimiento".
 */
export function ChallengeCelebration() {
  const c = useProgress((s) => s.bigCelebration);
  const dismiss = useProgress((s) => s.dismissCelebration);

  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c, dismiss]);

  if (!c) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label="Desafío completado"
      onMouseDown={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="celebrate-card relative w-full max-w-md rounded-3xl border border-gold/60 bg-surface px-8 pt-10 pb-8 text-center shadow-2xl">
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
          <svg className="celebrate-rays absolute inset-0" viewBox="0 0 200 200" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => (
              <path
                key={i}
                d="M100 8 L104 52 L96 52 Z"
                fill="var(--gold)"
                opacity={i % 2 ? 0.25 : 0.45}
                transform={`rotate(${i * 22.5} 100 100)`}
              />
            ))}
          </svg>
          <span className="celebrate-medal relative">
            <Medallion icon={ACHIEVEMENT_ICON[c.icon]} unlocked gold size={112} />
          </span>
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="celebrate-spark absolute text-gold"
              style={{ left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)`, animationDelay: `${s.d}ms` }}
              aria-hidden
            >
              <SparkIcon size={i % 3 === 0 ? 22 : 16} duo={false} />
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-gold uppercase">Desafío completado</p>
        <h2 className="mt-1 font-display text-3xl font-semibold">{c.title}</h2>
        <p className="mt-2 text-muted">Llegaste al final. No por obligación: por constancia.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-1.5 font-semibold text-gold">
          +{c.xp} XP · nueva insignia
        </p>
        <div className="mt-7">
          <button
            onClick={dismiss}
            className="rounded-xl bg-accent px-6 py-2.5 font-semibold text-accent-ink"
            autoFocus
          >
            Seguir mi camino
          </button>
        </div>
      </div>
    </div>
  );
}

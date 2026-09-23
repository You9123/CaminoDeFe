import type { LevelInfo } from "../domain/levels";

export function XpBar({ level, compact = false }: { level: LevelInfo; compact?: boolean }) {
  const pct = Math.round(level.progress * 100);
  return (
    <div>
      <div
        className={`w-full overflow-hidden rounded-full bg-border ${compact ? "h-2" : "h-3"}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1.5 text-muted ${compact ? "text-xs" : "text-sm"}`}>
        {level.xpIntoLevel} / {level.xpForNext} XP
      </p>
    </div>
  );
}

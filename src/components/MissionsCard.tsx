import { XP_RULES } from "../domain/xp";
import { missionXp, type MissionActivity, type MissionProgress } from "../domain/missions";
import { MISSION_ICONS } from "./missionIcons";
import { CheckIcon } from "./icons";

const ACTION_LABEL: Record<MissionActivity, string> = {
  daily_verse: "Leer",
  reflection: "Reflexionar",
  prayer: "Orar",
  application: "Aplicar",
};

export function MissionsCard({
  progress,
  onAction,
}: {
  progress: MissionProgress;
  onAction: (mission: MissionActivity) => void;
}) {
  const pct = (progress.completed / progress.total) * 100;
  const bonus = XP_RULES.daily_missions_bonus.xp;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">Misiones de hoy</h2>
        <p className="text-sm text-muted tabular-nums">
          {progress.completed} de {progress.total}
        </p>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>

      <ul className="flex flex-col gap-2">
        {progress.missions.map((m) => {
          const Icon = MISSION_ICONS[m.id];
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${m.done ? "bg-success-soft" : "bg-surface-2/80"}`}
            >
              <Icon size={24} className={m.done ? "text-success" : "text-accent"} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${m.done ? "text-success" : ""}`}>{m.title}</p>
                <p className="truncate text-xs text-muted">{m.description}</p>
              </div>
              {m.done ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                  <CheckIcon size={16} /> Hecho
                </span>
              ) : (
                <button
                  onClick={() => onAction(m.id)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink hover:brightness-105"
                >
                  {ACTION_LABEL[m.id]} <span className="font-normal opacity-80">+{missionXp(m.id)}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className={`mt-3 text-center text-sm ${progress.allDone ? "font-semibold text-accent" : "text-muted"}`}>
        {progress.allDone
          ? `Completaste las misiones de hoy · +${bonus} XP extra`
          : `Completa las ${progress.total} y suma ${bonus} XP extra`}
      </p>
    </div>
  );
}

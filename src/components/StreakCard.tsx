import { parseISO } from "date-fns";
import type { DayStatus, StreakInfo } from "../domain/streaks";
import { CheckIcon, FlameIcon, MedalIcon, ShieldIcon } from "./icons";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

const DOT: Record<DayStatus, string> = {
  done: "bg-accent text-accent-ink border-accent",
  grace: "bg-accent-soft text-accent border-accent/40",
  today: "border-accent border-2 border-dashed text-accent",
  empty: "border-border text-muted",
  future: "border-border/60 text-muted/40",
};

const LABEL: Record<DayStatus, string> = {
  done: "Día completado",
  grace: "Día de gracia",
  today: "Hoy",
  empty: "Sin actividad",
  future: "",
};

export function StreakCard({ streak }: { streak: StreakInfo }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <FlameIcon size={18} className="text-accent" /> Racha
          </p>
          <p className="mt-1 font-display text-4xl font-semibold">
            {streak.current}{" "}
            <span className="font-ui text-base font-normal text-muted">{streak.current === 1 ? "día" : "días"}</span>
          </p>
        </div>
        <div className="text-right text-sm text-muted">
          <p className="inline-flex items-center gap-1">
            <MedalIcon size={17} className="text-accent" /> Récord
          </p>
          <p className="text-lg font-semibold text-ink">{streak.best}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        {streak.week.map(({ day, status }, i) => (
          <div key={day} className="flex flex-col items-center gap-1" title={LABEL[status]}>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${DOT[status]}`}
            >
              {status === "done" ? (
                <CheckIcon size={15} />
              ) : status === "grace" ? (
                <ShieldIcon size={16} duo={false} />
              ) : (
                parseISO(day).getDate()
              )}
            </span>
            <span className="text-[11px] text-muted">{DAY_LETTERS[i]}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 text-xs leading-relaxed text-muted">
        <p>
          {streak.todayDone
            ? "Hoy ya cuenta para tu racha."
            : streak.current > 0
              ? "Cualquier actividad de hoy mantiene tu racha."
              : "Cualquier actividad de hoy empieza una racha nueva."}
        </p>
        <p className="flex items-start gap-1.5">
          <ShieldIcon size={14} duo={false} className="mt-px shrink-0 text-accent" />
          {streak.graceAvailable
            ? "Tienes un día de gracia esta semana: si faltas un día, la racha sigue."
            : "Ya usaste el día de gracia de esta semana."}
        </p>
      </div>
    </div>
  );
}

import { addDays, format, parseISO, startOfISOWeek } from "date-fns";

/**
 * Rachas (ver Documento Maestro §2.7).
 *
 * - Un día cuenta si tiene al menos una actividad registrada.
 * - Día de gracia: 1 por semana (lunes a domingo). Si faltas UN solo día, la racha sigue
 *   (el día de gracia no suma, solo protege). Dos días seguidos sin actividad la cortan.
 * - Hoy nunca rompe la racha: está "pendiente" hasta que termine el día.
 * - La racha se calcula siempre desde activity_log; no se guarda en ningún lado.
 */
export type DayStatus = "done" | "grace" | "empty" | "today" | "future";

export type StreakInfo = {
  current: number;
  best: number;
  todayDone: boolean;
  /** ¿Queda día de gracia esta semana? */
  graceAvailable: boolean;
  /** Lunes a domingo de la semana actual. */
  week: { day: string; status: DayStatus }[];
};

const toKey = (d: Date) => format(d, "yyyy-MM-dd");
const nextKey = (day: string) => toKey(addDays(parseISO(day), 1));
const weekKey = (day: string) => toKey(startOfISOWeek(parseISO(day)));

export function computeStreak(activeDays: Iterable<string>, today: string): StreakInfo {
  const active = new Set([...activeDays].filter((d) => d <= today));
  const sorted = [...active].sort();
  const status = new Map<string, DayStatus>();
  const graceWeeks = new Set<string>();
  let current = 0;
  let best = 0;

  if (sorted.length > 0) {
    for (let key = sorted[0]; key <= today; key = nextKey(key)) {
      if (active.has(key)) {
        current++;
        best = Math.max(best, current);
        status.set(key, "done");
        continue;
      }
      if (key === today) break; // pendiente: no rompe nada

      const next = nextKey(key);
      const isSingleGap = active.has(next) || next === today;
      if (current > 0 && isSingleGap && !graceWeeks.has(weekKey(key))) {
        graceWeeks.add(weekKey(key));
        status.set(key, "grace");
      } else {
        current = 0;
      }
    }
  }

  const monday = startOfISOWeek(parseISO(today));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = toKey(addDays(monday, i));
    const s: DayStatus = day > today ? "future" : (status.get(day) ?? (day === today ? "today" : "empty"));
    return { day, status: s };
  });

  return {
    current,
    best,
    todayDone: active.has(today),
    graceAvailable: !graceWeeks.has(weekKey(today)),
    week,
  };
}

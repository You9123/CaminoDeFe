import { addDays, format, parseISO, startOfISOWeek } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Estadísticas (ver Documento Maestro §2.16).
 * Todo se calcula a partir de activity_log, agrupado por día y tipo.
 */
export type DayTypeRow = {
  day: string;
  type: string;
  /** Cuántas veces se registró ese tipo ese día. */
  n: number;
  /** Suma de duration_sec (0 si no hay). */
  secs: number;
  xp: number;
};

/** Lo que cuenta como "algo que hiciste" (los bonos y logros no son actividades propias). */
export const USER_ACTIVITIES = new Set([
  "chapter_read",
  "daily_verse",
  "short_reading",
  "reflection",
  "prayer",
  "application",
]);

/** Tipos cuyo tiempo se suma al "tiempo dedicado". */
const TIMED = new Set(["chapter_read", "prayer"]);

export type Totals = {
  chapterReadings: number;
  prayers: number;
  reflections: number;
  applications: number;
  seconds: number;
  xp: number;
  activeDays: number;
};

export function totals(rows: readonly DayTypeRow[]): Totals {
  const t: Totals = {
    chapterReadings: 0,
    prayers: 0,
    reflections: 0,
    applications: 0,
    seconds: 0,
    xp: 0,
    activeDays: 0,
  };
  const days = new Set<string>();
  for (const r of rows) {
    t.xp += r.xp;
    if (TIMED.has(r.type)) t.seconds += r.secs;
    if (r.type === "chapter_read") t.chapterReadings += r.n;
    if (r.type === "prayer") t.prayers += r.n;
    if (r.type === "reflection") t.reflections += r.n;
    if (r.type === "application") t.applications += r.n;
    if (USER_ACTIVITIES.has(r.type)) days.add(r.day);
  }
  t.activeDays = days.size;
  return t;
}

/** "14 h 32 min", "25 min" o "0 min". */
export function formatDuration(seconds: number): string {
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ---------- Heatmap ----------

export type HeatCell = { day: string; count: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

export function heatLevel(count: number): HeatCell["level"] {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

const key = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Cuadrícula tipo GitHub: una columna por semana (lunes arriba, domingo abajo),
 * terminando en la semana de hoy.
 */
export function heatmap(rows: readonly DayTypeRow[], today: string, weeks = 26): HeatCell[][] {
  const perDay = new Map<string, number>();
  for (const r of rows) {
    if (USER_ACTIVITIES.has(r.type)) perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.n);
  }
  const firstMonday = addDays(startOfISOWeek(parseISO(today)), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = key(addDays(firstMonday, w * 7 + d));
      const count = perDay.get(day) ?? 0;
      return { day, count, level: heatLevel(count), future: day > today };
    }),
  );
}

/** Etiquetas de mes para la cuadrícula: índice de la semana donde empieza cada mes. */
export function heatmapMonths(grid: readonly HeatCell[][]): { week: number; label: string }[] {
  const out: { week: number; label: string }[] = [];
  let last = "";
  grid.forEach((week, i) => {
    const month = week[0].day.slice(0, 7);
    if (month !== last) {
      // La primera columna solo se rotula si el mes empieza en ella (si no, queda cortado).
      if (i > 0 || week[0].day.endsWith("-01") || grid.length === 1) {
        out.push({ week: i, label: format(parseISO(week[0].day), "MMM", { locale: es }).replace(".", "") });
      }
      last = month;
    }
  });
  return out;
}

// ---------- Por semana ----------

export type WeekPoint = {
  weekStart: string;
  /** "15 sep" */
  label: string;
  chapters: number;
  minutes: number;
  activeDays: number;
};

export function weeklySeries(rows: readonly DayTypeRow[], today: string, weeks = 12): WeekPoint[] {
  const thisMonday = startOfISOWeek(parseISO(today));
  const points: WeekPoint[] = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, -7 * (weeks - 1 - i));
    return {
      weekStart: key(start),
      label: format(start, "d MMM", { locale: es }).replace(".", ""),
      chapters: 0,
      minutes: 0,
      activeDays: 0,
    };
  });
  const index = new Map(points.map((p, i) => [p.weekStart, i]));
  const daysPerWeek = points.map(() => new Set<string>());

  for (const r of rows) {
    if (r.day > today) continue;
    const i = index.get(key(startOfISOWeek(parseISO(r.day))));
    if (i === undefined) continue;
    if (r.type === "chapter_read") points[i].chapters += r.n;
    if (TIMED.has(r.type)) points[i].minutes += r.secs / 60;
    if (USER_ACTIVITIES.has(r.type)) daysPerWeek[i].add(r.day);
  }
  points.forEach((p, i) => {
    p.minutes = Math.round(p.minutes);
    p.activeDays = daysPerWeek[i].size;
  });
  return points;
}

// ---------- Zonas ----------

export type ZoneProgress = {
  zone: number;
  name: string;
  read: number;
  total: number;
  booksDone: number;
  books: number;
};

export function zoneProgress(
  zones: readonly { id: number; name: string }[],
  books: readonly { code: string; zone: number; chapters: number }[],
  readByBook: Record<string, number>,
): ZoneProgress[] {
  return zones.map((z) => {
    const inZone = books.filter((b) => b.zone === z.id);
    const read = inZone.reduce((s, b) => s + Math.min(readByBook[b.code] ?? 0, b.chapters), 0);
    const total = inZone.reduce((s, b) => s + b.chapters, 0);
    const booksDone = inZone.filter((b) => (readByBook[b.code] ?? 0) >= b.chapters).length;
    return { zone: z.id, name: z.name, read, total, booksDone, books: inZone.length };
  });
}

import { dayIndex } from "./dailyVerse";

/**
 * Recordatorio diario (Documento Maestro §2.20).
 * Suena una vez al día, a la hora elegida, solo si todavía no hiciste nada hoy.
 * Funciona mientras la app está abierta (aunque esté minimizada).
 */
export const DEFAULT_REMINDER_TIME = "20:00";

export function parseTime(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

export function shouldRemind(o: {
  enabled: boolean;
  time: string;
  now: Date;
  today: string;
  todayDone: boolean;
  lastRemindedDay: string | null;
}): boolean {
  if (!o.enabled || o.todayDone || o.lastRemindedDay === o.today) return false;
  const t = parseTime(o.time);
  if (!t) return false;
  const minutesNow = o.now.getHours() * 60 + o.now.getMinutes();
  return minutesNow >= t.h * 60 + t.m;
}

const MESSAGES = [
  "Tu camino te espera. Unos minutos con la Palabra hoy.",
  "¿Tienes cinco minutos? Un versículo y una oración pueden cambiar tu día.",
  "Haz una pausa. Hay algo para ti en la Palabra de hoy.",
  "Antes de terminar el día, un momento con Dios.",
];

export function reminderMessage(day: string, streak: number): string {
  if (streak > 1) return `Llevas ${streak} días seguidos. Hoy todavía cuenta.`;
  return MESSAGES[((dayIndex(day) % MESSAGES.length) + MESSAGES.length) % MESSAGES.length];
}

import { format, parseISO, subDays, subHours } from "date-fns";
import { es } from "date-fns/locale";

/** Hora local en la que termina el "día" de la app (3:00 a. m. por defecto; se cambia en Ajustes). */
export const DEFAULT_DAY_END_HOUR = 3;
export const DAY_END_HOUR_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

let dayEndHour = DEFAULT_DAY_END_HOUR;

export function setDayEndHour(hour: number): void {
  dayEndHour = Number.isInteger(hour) && hour >= 0 && hour <= 5 ? hour : DEFAULT_DAY_END_HOUR;
}

export function getDayEndHour(): number {
  return dayEndHour;
}

/**
 * Devuelve el "día de juego" (YYYY-MM-DD) de un momento dado.
 * Con fin de día a las 3:00, leer a la 1:00 a. m. cuenta para el día anterior.
 */
export function gameDay(date: Date = new Date(), endHour: number = dayEndHour): string {
  return format(subHours(date, endHour), "yyyy-MM-dd");
}

/** Saludo según la hora local. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** "2026-09-23" → "Miércoles 23 de septiembre" (o "Hoy" / "Ayer"). */
export function formatDayLong(day: string, today: string = gameDay()): string {
  if (day === today) return "Hoy";
  if (day === format(subDays(parseISO(today), 1), "yyyy-MM-dd")) return "Ayer";
  const d = parseISO(day);
  const withYear = day.slice(0, 4) !== today.slice(0, 4);
  const text = format(d, withYear ? "EEEE d 'de' MMMM 'de' yyyy" : "EEEE d 'de' MMMM", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

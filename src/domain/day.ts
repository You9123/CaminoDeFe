import { format, subHours } from "date-fns";

/** Hora local en la que termina el "día" de la app (3:00 a. m.). */
export const DAY_END_HOUR = 3;

/**
 * Devuelve el "día de juego" (YYYY-MM-DD) de un momento dado.
 * Leer a la 1:00 a. m. cuenta para el día anterior.
 */
export function gameDay(date: Date = new Date(), endHour: number = DAY_END_HOUR): string {
  return format(subHours(date, endHour), "yyyy-MM-dd");
}

/** Saludo según la hora local. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Elige el versículo del día de forma determinista: el mismo día siempre da el mismo versículo.
 */
export function dayIndex(day: string): number {
  // Días transcurridos desde 2000-01-01 (UTC, sin problemas de horario de verano).
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86_400_000);
}

export function pickDailyVerse<T>(list: readonly T[], day: string): T {
  if (list.length === 0) throw new Error("La lista de versículos del día está vacía");
  const i = ((dayIndex(day) % list.length) + list.length) % list.length;
  return list[i];
}

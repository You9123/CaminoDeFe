/** Velocidad de lectura promedio en español (palabras por minuto). */
export const WORDS_PER_MINUTE = 200;

/** Porcentaje del tiempo estimado que el capítulo debe estar abierto para contar. */
export const MIN_READ_RATIO = 0.4;
export const MIN_READ_SECONDS_FLOOR = 10;

export function estimatedReadSeconds(words: number): number {
  return Math.ceil((words / WORDS_PER_MINUTE) * 60);
}

export function minSecondsToCount(words: number): number {
  return Math.max(MIN_READ_SECONDS_FLOOR, Math.round(estimatedReadSeconds(words) * MIN_READ_RATIO));
}

export function formatMinutes(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  return `${min} min`;
}

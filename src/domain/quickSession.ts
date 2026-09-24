/**
 * Elige el versículo de "Tengo 5 minutos":
 * el versículo del día si todavía no se leyó; si no, otro al azar de la lista.
 */
export function pickQuickVerse(
  list: readonly string[],
  dailyRef: string,
  dailyRead: boolean,
  random: () => number = Math.random,
): { ref: string; isDaily: boolean } {
  if (!dailyRead) return { ref: dailyRef, isDaily: true };
  const others = list.filter((r) => r !== dailyRef);
  if (others.length === 0) return { ref: dailyRef, isDaily: true };
  return { ref: others[Math.floor(random() * others.length) % others.length], isDaily: false };
}

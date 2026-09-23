/**
 * Normalización del texto de la Reina-Valera 1909.
 *
 * La RV1909 es de dominio público, así que se puede ajustar libremente.
 * Solo corregimos cosas de ortografía antigua que distraen al leer hoy;
 * NO se cambia vocabulario ("crió", "Jerusalem", etc. se quedan igual).
 */

const LETTER = "[\\p{L}\\p{M}]";

/** Palabras sueltas con tilde antigua → ortografía actual. */
const WORD_FIXES: Record<string, string> = {
  á: "a",
  ó: "o",
  é: "e",
  fué: "fue",
  fuí: "fui",
  dió: "dio",
  vió: "vio",
  pié: "pie",
};

const WORD_RE = new RegExp(`(?<!${LETTER})(${Object.keys(WORD_FIXES).join("|")})(?!${LETTER})`, "giu");

function matchCase(original: string, replacement: string): string {
  const first = original.charAt(0);
  return first === first.toUpperCase() && first !== first.toLowerCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

export function modernizeSpelling(text: string): string {
  return text.replace(WORD_RE, (m) => matchCase(m, WORD_FIXES[m.toLowerCase()]));
}

/**
 * En el versículo 1 de cada capítulo, la edición impresa usa una "letra capital"
 * (ej. "EN el principio", "JEHOVÁ es mi pastor"). Convertimos esa primera palabra
 * en mayúsculas a formato normal ("En", "Jehová").
 */
// A veces la capital abarca dos palabras: "DE SIETE años era Joas".
const CAPS_RUN_RE = new RegExp(`(?<!${LETTER})(\\p{Lu}{2,})((?:\\s+\\p{Lu}{2,}(?!${LETTER}))*)(?!${LETTER})`, "u");

export function fixDropCap(text: string): string {
  return text.replace(
    CAPS_RUN_RE,
    (_m, first: string, rest: string) =>
      first.charAt(0) + first.slice(1).toLocaleLowerCase("es") + rest.toLocaleLowerCase("es"),
  );
}

export function normalizeVerse(text: string, verseNumber: number): string {
  let t = text.trim().replace(/\s+/g, " ");
  if (verseNumber === 1) t = fixDropCap(t);
  return modernizeSpelling(t);
}

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

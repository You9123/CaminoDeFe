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
 * (ej. "EN el principio", "Y ACONTECIÓ", "Salmo de David. JEHOVÁ es mi pastor").
 * La pasamos a escritura normal:
 * - Al inicio de una oración: primera letra en mayúscula ("En el principio").
 * - En medio de una oración: minúscula ("Y aconteció"), salvo nombres propios ("Y Jehová dijo").
 * A veces la capital abarca dos palabras: "DE SIETE años era Joas".
 */
const CAPS_RUN_RE = new RegExp(`(?<!${LETTER})(\\p{Lu}{2,}(?:\\s+\\p{Lu}{2,})*)(?!${LETTER})`, "u");
const SENTENCE_START_RE = /(^|[.:;!?¡¿«"(])\s*$/u;

export type ProperNounCheck = (lowerWord: string) => boolean;

const lower = (w: string) => w.toLocaleLowerCase("es");
const title = (w: string) => w.charAt(0) + lower(w.slice(1));

export function fixDropCap(text: string, isProperNoun: ProperNounCheck = () => false): string {
  return text.replace(CAPS_RUN_RE, (run: string, _g: string, offset: number) => {
    const startsSentence = SENTENCE_START_RE.test(text.slice(0, offset));
    return run.replace(/\p{L}+/gu, (word, i: number) => {
      if (isProperNoun(lower(word))) return title(word);
      return i === 0 && startsSentence ? title(word) : lower(word);
    });
  });
}

/**
 * Detecta nombres propios mirando todo el texto: una palabra que casi siempre aparece
 * con mayúscula inicial en medio de una oración (Jehová, Moisés, Jesús…) es nombre propio.
 */
export function buildProperNounCheck(allVerses: Iterable<string>): ProperNounCheck {
  const titled = new Map<string, number>();
  const lowered = new Map<string, number>();
  for (const text of allVerses) {
    for (const m of text.matchAll(/(?<=[\p{L},]\s)(\p{L}+)/gu)) {
      const w = m[1];
      const key = lower(w);
      if (w === key) lowered.set(key, (lowered.get(key) ?? 0) + 1);
      else if (w === title(w)) titled.set(key, (titled.get(key) ?? 0) + 1);
    }
  }
  return (w) => (titled.get(w) ?? 0) >= 3 && (titled.get(w) ?? 0) > (lowered.get(w) ?? 0);
}

export function normalizeVerse(text: string, verseNumber: number, isProperNoun?: ProperNounCheck): string {
  let t = text.trim().replace(/\s+/g, " ");
  if (verseNumber === 1) t = fixDropCap(t, isProperNoun);
  return modernizeSpelling(t);
}

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

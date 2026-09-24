/**
 * Convierte lo que escribe el usuario en una consulta segura para SQLite FTS5.
 * - Cada palabra se busca como prefijo ("miseric" encuentra "misericordia").
 * - Todas las palabras deben aparecer (AND).
 * - Se ignoran signos y operadores de FTS5, así nunca hay errores de sintaxis.
 * Las tildes no importan: el índice usa remove_diacritics.
 */
export const MAX_SEARCH_TERMS = 8;

export function searchTerms(input: string): string[] {
  const words = input.toLocaleLowerCase("es").match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words)].filter((w) => w.length >= 2).slice(0, MAX_SEARCH_TERMS);
}

export function buildFtsQuery(input: string): string | null {
  const terms = searchTerms(input);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"*`).join(" ");
}

/** Marcadores que usa highlight() de FTS5 para señalar coincidencias. */
export const MARK_START = "⟦";
export const MARK_END = "⟧";

/** "a ⟦b⟧ c" → [{text:"a ", hit:false}, {text:"b", hit:true}, {text:" c", hit:false}] */
export function splitHighlights(text: string): { text: string; hit: boolean }[] {
  const parts: { text: string; hit: boolean }[] = [];
  const re = new RegExp(`${MARK_START}(.*?)${MARK_END}`, "gu");
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
    parts.push({ text: m[1], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}

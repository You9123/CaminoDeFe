import { chapterRef, type ChapterRef } from "./refs";

/**
 * "Continuar mi camino" (pantalla Hoy, V3.5): a qué capítulo lleva el botón.
 * - Sin posición guardada: el primer capítulo de la Biblia.
 * - Si el último capítulo abierto todavía no se leyó: ese mismo (lo dejaste a medias).
 * - Si ya se leyó: el siguiente (y al final de un libro, el primero del siguiente).
 * Al final de la Biblia se queda en el último capítulo.
 */
export function continueTarget(
  last: ChapterRef | null,
  read: ReadonlySet<string>,
  books: { code: string; chapters: number }[],
): ChapterRef {
  const first = { book: books[0]?.code ?? "GEN", chapter: 1 };
  if (!last) return first;
  const i = books.findIndex((b) => b.code === last.book);
  if (i < 0) return first;
  if (!read.has(chapterRef(last.book, last.chapter))) return last;
  if (last.chapter < books[i].chapters) return { book: last.book, chapter: last.chapter + 1 };
  const next = books[i + 1];
  return next ? { book: next.code, chapter: 1 } : last;
}

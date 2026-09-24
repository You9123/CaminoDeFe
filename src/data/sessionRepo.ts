import { bibleDb, TRANSLATION_ID, userDb } from "./db";
import { listBooks } from "./bibleRepo";
import { getSetting, LAST_POSITION_KEY } from "./progressRepo";
import { parseChapterRef } from "../domain/refs";
import { estimatedReadSeconds } from "../domain/reading";
import type { ChapterOption } from "../domain/sessions";

let wordsCache: Map<string, number> | null = null;

/** Palabras de todos los capítulos: "bookId.capítulo" → palabras. */
async function chapterWords(): Promise<Map<string, number>> {
  if (wordsCache) return wordsCache;
  const db = await bibleDb();
  const rows = await db.select<{ book_id: number; chapter: number; words: number }[]>(
    "SELECT book_id, chapter, words FROM chapters WHERE translation_id = $1",
    [TRANSLATION_ID],
  );
  wordsCache = new Map(rows.map((r) => [`${r.book_id}.${r.chapter}`, Number(r.words)]));
  return wordsCache;
}

/**
 * Candidatos para una sesión:
 * - `sequence`: desde donde va el usuario, los capítulos que todavía no leyó (en orden).
 * - `shortOptions`: Salmos que todavía no leyó, por si el siguiente capítulo no cabe.
 */
export async function getSessionCandidates(): Promise<{ sequence: ChapterOption[]; shortOptions: ChapterOption[] }> {
  const [books, words, last, read] = await Promise.all([
    listBooks(),
    chapterWords(),
    getSetting(LAST_POSITION_KEY),
    userDb().then((db) =>
      db.select<{ book_id: number; chapter: number }[]>("SELECT book_id, chapter FROM chapter_progress"),
    ),
  ]);
  const readSet = new Set(read.map((r) => `${r.book_id}.${r.chapter}`));
  const option = (b: (typeof books)[number], chapter: number): ChapterOption => ({
    code: b.code,
    chapter,
    label: `${b.name} ${chapter}`,
    seconds: estimatedReadSeconds(words.get(`${b.id}.${chapter}`) ?? 0),
  });

  // Todos los capítulos de la Biblia en orden, para caminar desde la última posición.
  const all = books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ b, chapter: i + 1 })));
  const pos = parseChapterRef(last ?? "");
  const found = pos ? all.findIndex((c) => c.b.code === pos.book && c.chapter === pos.chapter) : 0;
  const start = Math.max(found, 0);
  // Desde ahí, los capítulos que todavía no ha leído (si ya leyó todo, simplemente los siguientes).
  const ahead = all.slice(start);
  const unread = ahead.filter((c) => !readSet.has(`${c.b.id}.${c.chapter}`));
  const sequence = (unread.length > 0 ? unread : ahead.slice(1)).slice(0, 8).map((c) => option(c.b, c.chapter));

  const psalms = books.find((b) => b.code === "PSA");
  const shortOptions = psalms
    ? Array.from({ length: psalms.chapters }, (_, i) => i + 1)
        .filter((c) => !readSet.has(`${psalms.id}.${c}`))
        .map((c) => option(psalms, c))
    : [];
  return { sequence, shortOptions };
}

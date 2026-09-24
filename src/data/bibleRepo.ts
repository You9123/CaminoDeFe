import { bibleDb, TRANSLATION_ID } from "./db";
import { parseVerseRef } from "../domain/refs";
import { buildFtsQuery, MARK_END, MARK_START } from "../domain/search";

export type Book = {
  id: number;
  code: string;
  name: string;
  abbr: string;
  testament: "AT" | "NT";
  zone: number;
  chapters: number;
};

export type Verse = { verse: number; text: string };

export type Chapter = {
  book: Book;
  chapter: number;
  verses: Verse[];
  words: number;
};

let booksCache: Book[] | null = null;

export async function listBooks(): Promise<Book[]> {
  if (booksCache) return booksCache;
  const db = await bibleDb();
  booksCache = await db.select<Book[]>("SELECT id, code, name, abbr, testament, zone, chapters FROM books ORDER BY id");
  return booksCache;
}

export async function getBookByCode(code: string): Promise<Book | undefined> {
  return (await listBooks()).find((b) => b.code === code);
}

export async function getChapter(code: string, chapter: number): Promise<Chapter | null> {
  const book = await getBookByCode(code);
  if (!book || chapter < 1 || chapter > book.chapters) return null;

  const db = await bibleDb();
  const [verses, meta] = await Promise.all([
    db.select<Verse[]>(
      "SELECT verse, text FROM verses WHERE translation_id = $1 AND book_id = $2 AND chapter = $3 ORDER BY verse",
      [TRANSLATION_ID, book.id, chapter],
    ),
    db.select<{ words: number }[]>(
      "SELECT words FROM chapters WHERE translation_id = $1 AND book_id = $2 AND chapter = $3",
      [TRANSLATION_ID, book.id, chapter],
    ),
  ]);
  return { book, chapter, verses, words: meta[0]?.words ?? 0 };
}

export type ResolvedVerse = { ref: string; label: string; text: string; book: Book; chapter: number; verse: number };

/** Convierte "PSA.118.24" en { label: "Salmos 118:24", text: "..." }. */
export async function getVerseByRef(ref: string): Promise<ResolvedVerse | null> {
  const r = parseVerseRef(ref);
  if (!r) return null;
  const book = await getBookByCode(r.book);
  if (!book) return null;

  const db = await bibleDb();
  const rows = await db.select<{ text: string }[]>(
    "SELECT text FROM verses WHERE translation_id = $1 AND book_id = $2 AND chapter = $3 AND verse = $4",
    [TRANSLATION_ID, book.id, r.chapter, r.verse],
  );
  if (!rows[0]) return null;
  return {
    ref,
    label: `${book.name} ${r.chapter}:${r.verse}`,
    text: rows[0].text,
    book,
    chapter: r.chapter,
    verse: r.verse,
  };
}

// ---------- Búsqueda ----------

export type SearchHit = {
  book: Book;
  chapter: number;
  verse: number;
  /** Texto con las coincidencias entre MARK_START y MARK_END. */
  marked: string;
};

export type SearchResult = { total: number; hits: SearchHit[] };

export const SEARCH_LIMIT = 150;

export async function searchVerses(input: string): Promise<SearchResult> {
  const fts = buildFtsQuery(input);
  if (!fts) return { total: 0, hits: [] };

  const [db, books] = await Promise.all([bibleDb(), listBooks()]);
  const byId = new Map(books.map((b) => [b.id, b]));

  const [count, rows] = await Promise.all([
    db.select<{ n: number }[]>("SELECT count(*) AS n FROM verses_fts WHERE verses_fts MATCH $1", [fts]),
    db.select<{ book_id: number; chapter: number; verse: number; marked: string }[]>(
      `SELECT v.book_id, v.chapter, v.verse, highlight(verses_fts, 0, $2, $3) AS marked
       FROM verses_fts JOIN verses v ON v.rowid = verses_fts.rowid
       WHERE verses_fts MATCH $1 AND v.translation_id = $4
       ORDER BY verses_fts.rowid LIMIT $5`,
      [fts, MARK_START, MARK_END, TRANSLATION_ID, SEARCH_LIMIT],
    ),
  ]);

  return {
    total: Number(count[0]?.n ?? 0),
    hits: rows.flatMap((r) => {
      const book = byId.get(r.book_id);
      return book ? [{ book, chapter: r.chapter, verse: r.verse, marked: r.marked }] : [];
    }),
  };
}

// ---------- Referencias legibles ----------

/** "JHN.3" → "Juan 3" · "PSA.23.1" → "Salmos 23:1". Devuelve la referencia tal cual si no la reconoce. */
export function refLabel(ref: string, books: Book[]): string {
  const [code, chapter, verse] = ref.split(".");
  const book = books.find((b) => b.code === code);
  if (!book || !chapter) return ref;
  return verse ? `${book.name} ${chapter}:${verse}` : `${book.name} ${chapter}`;
}

/** Ruta del lector para una referencia ("PSA.23.1" → "/biblia/PSA/23?v=1"). */
export function refPath(ref: string): string {
  const [code, chapter, verse] = ref.split(".");
  return `/biblia/${code}/${chapter}${verse ? `?v=${verse}` : ""}`;
}

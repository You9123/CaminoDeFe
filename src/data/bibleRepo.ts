import { bibleDb, TRANSLATION_ID } from "./db";
import { parseVerseRef } from "../domain/refs";

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

/**
 * Referencias bíblicas independientes de la traducción: "PSA.118.24", "JHN.3".
 * El contenido y la base de datos del usuario guardan SOLO referencias, nunca texto.
 */
export type VerseRef = { book: string; chapter: number; verse: number };
export type ChapterRef = { book: string; chapter: number };

const VERSE_RE = /^([1-3]?[A-Z]{2,3})\.(\d{1,3})\.(\d{1,3})$/;
const CHAPTER_RE = /^([1-3]?[A-Z]{2,3})\.(\d{1,3})$/;

export function parseVerseRef(ref: string): VerseRef | null {
  const m = VERSE_RE.exec(ref);
  return m ? { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) } : null;
}

export function parseChapterRef(ref: string): ChapterRef | null {
  const m = CHAPTER_RE.exec(ref);
  return m ? { book: m[1], chapter: Number(m[2]) } : null;
}

export function chapterRef(bookCode: string, chapter: number): string {
  return `${bookCode}.${chapter}`;
}

import booksMeta from "../../content/books_meta.json";
import { userDb } from "./db";
import { chapterRef } from "../domain/refs";

const CODE_BY_ID = new Map(booksMeta.books.map((b) => [b.id, b.code]));

export type ReadChapters = {
  /** Capítulos leídos alguna vez ("GEN.12"). */
  read: Set<string>;
  /** Primera vez que se leyó cada capítulo (ISO), para la fecha de desbloqueo de las fichas. */
  firstReadAt: Map<string, string>;
};

/**
 * Todo lo que necesitan la línea temporal y los coleccionables: los capítulos leídos.
 * No hay tablas nuevas; el avance de cada ficha se calcula con chapter_progress (ADR-0008).
 */
export async function getReadChapterMap(): Promise<ReadChapters> {
  const db = await userDb();
  const rows = await db.select<{ book_id: number; chapter: number; first_read_at: string }[]>(
    "SELECT book_id, chapter, first_read_at FROM chapter_progress",
  );
  const read = new Set<string>();
  const firstReadAt = new Map<string, string>();
  for (const r of rows) {
    const code = CODE_BY_ID.get(Number(r.book_id));
    if (!code) continue;
    const ref = chapterRef(code, Number(r.chapter));
    read.add(ref);
    firstReadAt.set(ref, r.first_read_at);
  }
  return { read, firstReadAt };
}

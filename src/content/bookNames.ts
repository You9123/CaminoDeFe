import booksMeta from "../../content/books_meta.json";
import { passageLabel } from "../domain/collectibles";

const BOOK_NAME = new Map(booksMeta.books.map((b) => [b.code, b.name]));

/** Nombre de un libro por su código ("GEN" → "Génesis"), sin consultar bible.db. */
export const bookName = (code: string) => BOOK_NAME.get(code);

/** "GEN.12" → "Génesis 12" · "GEN.6-9" → "Génesis 6–9". */
export const chapterLabel = (ref: string) => passageLabel(ref, bookName);

import booksMeta from "../../content/books_meta.json";
import { passageLabel, type HintBookInfo } from "../domain/collectibles";

const BOOK_NAME = new Map(booksMeta.books.map((b) => [b.code, b.name]));

/** Nombre de un libro por su código ("GEN" → "Génesis"), sin consultar bible.db. */
export const bookName = (code: string) => BOOK_NAME.get(code);

/** "GEN.12" → "Génesis 12" · "GEN.6-9" → "Génesis 6–9". */
export const chapterLabel = (ref: string) => passageLabel(ref, bookName);

const ZONE_NAME = new Map(booksMeta.zones.map((z) => [z.id, z.name]));
const HINT_INFO = new Map(
  booksMeta.books.map((b) => [b.code, { name: b.name, zone: ZONE_NAME.get(b.zone) ?? "" } satisfies HintBookInfo]),
);

/** Nombre y zona del mapa de un libro, para las pistas de las fichas bloqueadas. */
export const hintBookInfo = (code: string) => HINT_INFO.get(code);

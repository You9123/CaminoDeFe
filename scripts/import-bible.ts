/**
 * Genera src-tauri/resources/bible.db a partir de la Reina-Valera 1909 (dominio público).
 *
 * Uso:  pnpm import-bible
 *
 * Fuente: scrollmapper/bible_databases (módulo "SpaRV" de CrossWire = RV1909),
 * fijada a un commit concreto para que el resultado sea siempre el mismo.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProperNounCheck, countWords, normalizeVerse } from "./normalize.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", ".cache");
const SOURCE_FILE = join(CACHE, "SpaRV.json");
const OUT = join(ROOT, "src-tauri", "resources", "bible.db");
const OUT_VERSION = join(ROOT, "src-tauri", "resources", "bible.version");

const SOURCE_COMMIT = "e1b254cef86d0e65b1a5d1a94b8b112d0f296a2c";
const SOURCE_URL = `https://raw.githubusercontent.com/scrollmapper/bible_databases/${SOURCE_COMMIT}/formats/json/SpaRV.json`;

/**
 * Cambia este valor cuando cambie el contenido de bible.db.
 * La app lo compara al iniciar y, si es distinto, reemplaza su copia de la Biblia.
 */
const BIBLE_DB_VERSION = "rv1909-2026.09-2";

const TRANSLATION = {
  id: "RV1909",
  name: "Reina-Valera 1909",
  language: "es",
  license: "Dominio público",
  source: `scrollmapper/bible_databases@${SOURCE_COMMIT.slice(0, 7)} (CrossWire SpaRV)`,
};

type SourceJson = {
  translation: string;
  books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[];
};
type BooksMeta = {
  books: { id: number; code: string; name: string; abbr: string; testament: string; zone: number }[];
};

async function loadSource(): Promise<SourceJson> {
  if (!existsSync(SOURCE_FILE)) {
    console.log(`Descargando fuente…\n  ${SOURCE_URL}`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`No se pudo descargar la fuente: HTTP ${res.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(SOURCE_FILE, await res.text());
  }
  return JSON.parse(readFileSync(SOURCE_FILE, "utf8")) as SourceJson;
}

async function main() {
  const source = await loadSource();
  const meta = JSON.parse(readFileSync(join(ROOT, "content", "books_meta.json"), "utf8")) as BooksMeta;

  if (source.books.length !== 66 || meta.books.length !== 66) {
    throw new Error(`Se esperaban 66 libros (fuente: ${source.books.length}, meta: ${meta.books.length})`);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  if (existsSync(OUT)) rmSync(OUT);
  const db = new DatabaseSync(OUT);

  db.exec(`
    PRAGMA journal_mode = OFF;
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE translations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, language TEXT NOT NULL,
      license TEXT NOT NULL, source TEXT NOT NULL
    );
    CREATE TABLE books (
      id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, abbr TEXT NOT NULL,
      testament TEXT NOT NULL CHECK (testament IN ('AT','NT')), zone INTEGER NOT NULL,
      chapters INTEGER NOT NULL
    );
    CREATE TABLE chapters (
      translation_id TEXT NOT NULL, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
      verses INTEGER NOT NULL, words INTEGER NOT NULL,
      PRIMARY KEY (translation_id, book_id, chapter)
    );
    CREATE TABLE verses (
      translation_id TEXT NOT NULL, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL, text TEXT NOT NULL,
      UNIQUE (translation_id, book_id, chapter, verse)
    );
    CREATE VIRTUAL TABLE verses_fts USING fts5(
      text, content='verses', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2'
    );
  `);

  db.prepare("INSERT INTO meta VALUES (?, ?)").run("bible_db_version", BIBLE_DB_VERSION);
  db.prepare("INSERT INTO translations VALUES (?, ?, ?, ?, ?)").run(
    TRANSLATION.id,
    TRANSLATION.name,
    TRANSLATION.language,
    TRANSLATION.license,
    TRANSLATION.source,
  );

  const insBook = db.prepare("INSERT INTO books VALUES (?, ?, ?, ?, ?, ?, ?)");
  const insChapter = db.prepare("INSERT INTO chapters VALUES (?, ?, ?, ?, ?)");
  const insVerse = db.prepare("INSERT INTO verses VALUES (?, ?, ?, ?, ?)");

  const isProperNoun = buildProperNounCheck(
    source.books.flatMap((b) => b.chapters.flatMap((c) => c.verses.map((v) => v.text))),
  );

  let totalVerses = 0;
  let skippedEmpty = 0;
  db.exec("BEGIN");
  source.books.forEach((srcBook, i) => {
    const book = meta.books[i];
    if (book.id !== i + 1) throw new Error(`books_meta.json fuera de orden en ${book.code}`);

    let chapterCount = 0;
    for (const ch of srcBook.chapters) {
      let verses = 0;
      let words = 0;
      for (const v of ch.verses) {
        // La fuente trae "huecos" vacíos donde la numeración de la RV1909 difiere de la KJV.
        if (!v.text.trim()) {
          skippedEmpty++;
          continue;
        }
        const text = normalizeVerse(v.text, v.verse, isProperNoun);
        insVerse.run(TRANSLATION.id, book.id, ch.chapter, v.verse, text);
        verses++;
        words += countWords(text);
      }
      if (verses > 0) {
        insChapter.run(TRANSLATION.id, book.id, ch.chapter, verses, words);
        chapterCount++;
      }
      totalVerses += verses;
    }
    insBook.run(book.id, book.code, book.name, book.abbr, book.testament, book.zone, chapterCount);
  });
  db.exec("COMMIT");

  db.exec("INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')");
  db.exec("VACUUM");
  db.close();
  writeFileSync(OUT_VERSION, BIBLE_DB_VERSION + "\n");

  console.log(`✔ bible.db generado: ${totalVerses} versículos (${skippedEmpty} huecos vacíos omitidos)`);
  console.log(`  ${OUT}`);
  console.log(`  versión: ${BIBLE_DB_VERSION}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

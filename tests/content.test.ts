/**
 * Valida que el contenido (JSON) y la Biblia importada estén en orden.
 * Si agregas versículos del día con una referencia mal escrita, esta prueba lo detecta.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import dailyVerses from "../content/daily_verses.json";
import booksMeta from "../content/books_meta.json";
import { parseVerseRef } from "../src/domain/refs";

const DB_PATH = "src-tauri/resources/bible.db";

describe.runIf(existsSync(DB_PATH))("bible.db", () => {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const one = <T>(sql: string, ...params: (string | number)[]) => db.prepare(sql).get(...params) as T;

  it("tiene los 66 libros y 1189 capítulos", () => {
    expect(one<{ n: number }>("SELECT count(*) n FROM books").n).toBe(66);
    expect(one<{ n: number }>("SELECT count(*) n FROM chapters").n).toBe(1189);
  });

  it("no tiene versículos vacíos", () => {
    expect(one<{ n: number }>("SELECT count(*) n FROM verses WHERE trim(text) = ''").n).toBe(0);
  });

  it("incluye versículos que otras fuentes pierden (Joel 2:28, Malaquías 4:6)", () => {
    expect(one<{ text: string }>("SELECT text FROM verses WHERE book_id=29 AND chapter=2 AND verse=28").text).toMatch(
      /derramaré mi Espíritu/,
    );
    expect(one<{ n: number }>("SELECT count(*) n FROM verses WHERE book_id=39 AND chapter=4").n).toBe(6);
  });

  it("aplica la ortografía moderna", () => {
    expect(one<{ text: string }>("SELECT text FROM verses WHERE book_id=43 AND chapter=3 AND verse=16").text).toContain(
      "ha dado a su Hijo",
    );
    expect(one<{ text: string }>("SELECT text FROM verses WHERE book_id=1 AND chapter=1 AND verse=1").text).toMatch(
      /^En el principio/,
    );
  });

  it("todos los versículos del día existen", () => {
    const missing: string[] = [];
    for (const ref of dailyVerses.verses) {
      const r = parseVerseRef(ref);
      if (!r) {
        missing.push(`${ref} (formato inválido)`);
        continue;
      }
      const row = one<{ n: number }>(
        "SELECT count(*) n FROM verses v JOIN books b ON b.id = v.book_id WHERE b.code=? AND v.chapter=? AND v.verse=?",
        r.book,
        r.chapter,
        r.verse,
      );
      if (row.n !== 1) missing.push(ref);
    }
    expect(missing).toEqual([]);
  });
});

describe("books_meta.json", () => {
  it("tiene 66 libros con ids consecutivos y zonas válidas", () => {
    const zoneIds = new Set(booksMeta.zones.map((z) => z.id));
    expect(booksMeta.books).toHaveLength(66);
    booksMeta.books.forEach((b, i) => {
      expect(b.id).toBe(i + 1);
      expect(zoneIds.has(b.zone)).toBe(true);
    });
  });
  it("no repite versículos del día", () => {
    expect(new Set(dailyVerses.verses).size).toBe(dailyVerses.verses.length);
  });
});

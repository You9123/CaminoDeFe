/**
 * Sprint 3.5A: descubrimientos con niebla y sin spoilers (ADR-0012).
 */
import { describe, expect, it } from "vitest";
import timeline from "../content/timeline.json";
import characters from "../content/characters.json";
import places from "../content/places.json";
import events from "../content/events.json";
import booksMeta from "../content/books_meta.json";
import {
  bookRevealsName,
  buildCatalog,
  chapterDiscoveries,
  collectibleKey,
  collectibleState,
  collectionSummary,
  discoveryHint,
  hintBook,
  keyChapters,
  newlyUnlocked,
  unlockedAt,
  type HintBookInfo,
} from "../src/domain/collectibles";
import { collectionPath } from "../src/app/paths";

const catalog = buildCatalog({ timeline, characters, places, events });
const all = catalog.collectibles;
const get = (key: string) => catalog.byKey.get(key)!;

const zones = new Map(booksMeta.zones.map((z) => [z.id, z.name]));
const info = new Map<string, HintBookInfo>(
  booksMeta.books.map((b) => [b.code, { name: b.name, zone: zones.get(b.zone)! }]),
);
const lookup = (code: string) => info.get(code);

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

describe("estado de una ficha", () => {
  const abraham = get("character:abraham");
  const chapters = keyChapters(abraham.passages);

  it("sin ningún capítulo clave leído, está bloqueada", () => {
    expect(collectibleState(abraham, new Set())).toBe("locked");
    expect(collectibleState(abraham, new Set(["GEN.1", "EXO.3"]))).toBe("locked");
  });

  it("el primer capítulo clave la desbloquea", () => {
    const read = new Set([chapters[0]]);
    expect(collectibleState(abraham, read)).toBe("unlocked");
    expect(newlyUnlocked(all, read, chapters[0], false)).toContainEqual(abraham);
  });

  it("con todos sus capítulos clave, está completa", () => {
    expect(collectibleState(abraham, new Set(chapters))).toBe("complete");
  });

  it("un capítulo puede descubrir varias fichas a la vez", () => {
    const found = newlyUnlocked(all, new Set(["JHN.19"]), "JHN.19", false);
    expect(found.length).toBeGreaterThan(2);
    for (const c of found) expect(collectibleState(c, new Set(["JHN.19"]))).not.toBe("locked");
  });

  it("releer un capítulo no descubre nada nuevo", () => {
    expect(newlyUnlocked(all, new Set(["GEN.1"]), "GEN.1", true)).toEqual([]);
  });

  it("leer otro capítulo clave de una ficha ya descubierta no la vuelve a anunciar", () => {
    const read = new Set([chapters[0], chapters[1]]);
    expect(newlyUnlocked(all, read, chapters[1], false)).not.toContainEqual(abraham);
  });
});

describe("progreso de la V3", () => {
  // Una base de la V3 solo tiene chapter_progress: todo se deriva de ahí, sin tablas nuevas.
  const v3 = new Map([
    ["GEN.1", "2026-08-01T10:00:00Z"],
    ["GEN.2", "2026-08-02T10:00:00Z"],
    ["GEN.3", "2026-08-03T10:00:00Z"],
    ["EXO.14", "2026-09-10T10:00:00Z"],
  ]);
  const read = new Set(v3.keys());

  it("reconoce lo que ya se había leído", () => {
    const s = collectionSummary(all, read);
    expect(s.total).toBe(115);
    expect(s.byKind.character.total + s.byKind.place.total + s.byKind.event.total).toBe(115);
    expect(s.discovered).toBe(all.filter((c) => collectibleState(c, read) !== "locked").length);
    expect(s.discovered).toBeGreaterThan(0);
    expect(collectibleState(get("event:creacion_mundo"), read)).not.toBe("locked");
  });

  it("la fecha de descubrimiento sale de la primera lectura", () => {
    expect(unlockedAt(get("event:creacion_mundo"), v3)).toBe("2026-08-01T10:00:00Z");
  });

  it("una base nueva no tiene nada descubierto", () => {
    expect(collectionSummary(all, new Set()).discovered).toBe(0);
  });
});

describe("sin spoilers", () => {
  it("la pista nunca dice el nombre de la ficha", () => {
    for (const c of all) {
      const hint = discoveryHint(c, lookup);
      const name = norm(c.name);
      expect(norm(hint.text)).not.toContain(name);
      const filler = ["los", "las", "del", "con", "por", "una", "uno", "sus", "que", "ante"];
      for (const w of name.split(/[^a-z]+/).filter((x) => x.length >= 3 && !filler.includes(x)))
        expect(norm(hint.text).split(/[^a-z]+/)).not.toContain(w);
    }
  });

  it("la pista dice el libro, nunca el capítulo", () => {
    const abraham = get("character:abraham");
    const hint = discoveryHint(abraham, lookup);
    expect(hint).toEqual({ text: "Aparece en Génesis", book: "GEN" });
    expect(hint.text).not.toMatch(/\d/);
    expect(hintBook(abraham)).toBe("GEN");
  });

  it("si el libro se llama como la ficha, solo da la zona del mapa", () => {
    expect(bookRevealsName("Daniel", "Daniel")).toBe(true);
    expect(bookRevealsName("Roma", "Romanos")).toBe(true);
    expect(bookRevealsName("Samuel", "1 Samuel")).toBe(true);
    expect(bookRevealsName("Rut", "Rut")).toBe(true);
    expect(bookRevealsName("Abraham", "Génesis")).toBe(false);
    const daniel = get("character:daniel");
    const hint = discoveryHint(daniel, lookup);
    expect(hint.book).toBeNull();
    expect(hint.text).toBe("Aparece en la zona «Los profetas» del mapa");
  });

  it("el lector solo cuenta las fichas que faltan por descubrir en un capítulo", () => {
    const before = chapterDiscoveries(all, "GEN.3", new Set());
    expect(before.revealed).toEqual([]);
    expect(before.hidden).toBeGreaterThan(0);
    const after = chapterDiscoveries(all, "GEN.3", new Set(["GEN.3"]));
    expect(after.hidden).toBe(0);
    expect(after.revealed).toHaveLength(before.hidden);
    // Adán ya se descubrió con Génesis 2: en Génesis 3 se nombra, y lo demás sigue oculto.
    const mixed = chapterDiscoveries(all, "GEN.3", new Set(["GEN.2"]));
    expect(mixed.revealed.map((c) => c.id)).toContain("adan");
    expect(mixed.revealed.length + mixed.hidden).toBe(before.hidden);
    expect(mixed.hidden).toBeGreaterThan(0);
    expect(chapterDiscoveries(all, "OBA.1", new Set())).toEqual({ revealed: [], hidden: 0 });
  });

  it("enlaza a la colección con la ficha abierta", () => {
    const eva = get("character:eva");
    expect(collectionPath()).toBe("/logros/coleccionables");
    expect(collectionPath("place")).toBe("/logros/coleccionables?tipo=lugares");
    expect(collectionPath(eva.kind, eva)).toBe(
      `/logros/coleccionables?tipo=personajes&ficha=${encodeURIComponent(collectibleKey("character", "eva"))}`,
    );
  });
});

/**
 * Sprint 3A: línea temporal y coleccionables (ADR-0008).
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import timeline from "../content/timeline.json";
import characters from "../content/characters.json";
import places from "../content/places.json";
import events from "../content/events.json";
import {
  buildCatalog,
  collectibleKey,
  collectiblesInChapter,
  eraProgress,
  erasOf,
  expandPassage,
  keyChapters,
  kindTotals,
  newlyUnlocked,
  passageLabel,
  passagesProgress,
  relatedOf,
  unlockedAt,
  type BookInfo,
} from "../src/domain/collectibles";

const raw = { timeline, characters, places, events };
const catalog = buildCatalog(raw);
const get = (key: string) => catalog.byKey.get(key)!;

// ---------- Contenido ----------

describe("contenido de la línea temporal", () => {
  it("tiene las 15 etapas en orden, de la creación a la Iglesia", () => {
    expect(catalog.eras.map((e) => e.id)).toEqual([
      "creacion",
      "diluvio",
      "abraham",
      "isaac",
      "jacob",
      "jose",
      "exodo",
      "jueces",
      "david",
      "salomon",
      "division",
      "exilio",
      "regreso",
      "jesus",
      "iglesia",
    ]);
    expect(catalog.eras.at(-2)!.testament).toBe("NT");
  });

  it("cada etapa tiene al menos un evento, y los eventos siguen el orden de las etapas", () => {
    const order = catalog.eras.map((e) => e.id);
    const evs = catalog.collectibles.filter((c) => c.kind === "event");
    for (const era of order) expect(evs.some((e) => e.era === era)).toBe(true);
    const idx = evs.map((e) => order.indexOf(e.era!));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it("todos los personajes y lugares aparecen en alguna etapa (salvo Job, que no tiene fecha)", () => {
    const orphans = catalog.collectibles
      .filter((c) => c.kind !== "event" && erasOf(c, catalog).length === 0)
      .map((c) => c.id);
    expect(orphans).toEqual(["job"]);
  });

  it("no usa emojis ni guarda texto bíblico largo", () => {
    const all = JSON.stringify(raw);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const c of catalog.collectibles) {
      expect(c.summary.length).toBeLessThan(260);
      expect(c.line.length).toBeLessThan(40);
    }
  });

  it("detecta referencias rotas y ids repetidos", () => {
    const bad = structuredClone(raw) as typeof raw;
    bad.events.events[0].characters = ["nadie"];
    bad.characters.characters.push({ ...bad.characters.characters[0] });
    bad.events.events[1].era = "otra";
    expect(() => buildCatalog(bad)).toThrow(/Personaje repetido: adan/);
    expect(() => buildCatalog(bad)).toThrow(/personaje desconocido "nadie"/);
    expect(() => buildCatalog(bad)).toThrow(/etapa desconocida "otra"/);
  });

  it("rechaza rangos al revés y capítulos que no existen", () => {
    const bad = structuredClone(raw) as typeof raw;
    bad.places.places[0].passages = ["GEN.9-6"];
    expect(() => buildCatalog(bad)).toThrow();
    const books: BookInfo[] = [{ code: "GEN", name: "Génesis", chapters: 50 }];
    const bad2 = structuredClone(raw) as typeof raw;
    bad2.characters.characters[0].passages = ["GEN.51"];
    expect(() => buildCatalog(bad2, books)).toThrow(/"GEN.51" no existe/);
  });
});

const DB_PATH = "src-tauri/resources/bible.db";
describe.runIf(existsSync(DB_PATH))("contenido contra bible.db", () => {
  it("todos los capítulos y versículos existen", () => {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    const books = db.prepare("SELECT code, name, chapters FROM books").all() as BookInfo[];
    expect(() => buildCatalog(raw, books)).not.toThrow();
    const verse = db.prepare(
      "SELECT count(*) n FROM verses v JOIN books b ON b.id = v.book_id WHERE b.code=? AND v.chapter=? AND v.verse=?",
    );
    const missing = catalog.collectibles
      .filter((c) => c.verse)
      .filter((c) => {
        const [code, ch, v] = c.verse!.split(".");
        return (verse.get(code, Number(ch), Number(v)) as { n: number }).n !== 1;
      })
      .map((c) => c.verse);
    expect(missing).toEqual([]);
  });
});

// ---------- Pasajes ----------

describe("pasajes", () => {
  it("expande rangos de capítulos", () => {
    expect(expandPassage("GEN.12")).toEqual(["GEN.12"]);
    expect(expandPassage("GEN.6-9")).toEqual(["GEN.6", "GEN.7", "GEN.8", "GEN.9"]);
    expect(expandPassage("1SA.3")).toEqual(["1SA.3"]);
    expect(expandPassage("JHN.3.16")).toEqual([]);
    expect(keyChapters(["GEN.6-7", "GEN.7", "GEN.11"])).toEqual(["GEN.6", "GEN.7", "GEN.11"]);
  });

  it("muestra el pasaje con el nombre del libro", () => {
    const name = (c: string) => ({ GEN: "Génesis", "1SA": "1 Samuel" })[c];
    expect(passageLabel("GEN.6-9", name)).toBe("Génesis 6–9");
    expect(passageLabel("1SA.17", name)).toBe("1 Samuel 17");
  });
});

// ---------- Progreso y desbloqueo ----------

describe("progreso de las fichas", () => {
  const moises = get(collectibleKey("character", "moises"));

  it("cuenta capítulos clave leídos y sugiere el siguiente", () => {
    expect(passagesProgress(moises.passages, new Set())).toEqual({
      read: 0,
      total: 6,
      unlocked: false,
      complete: false,
      next: "EXO.2",
    });
    const p = passagesProgress(moises.passages, new Set(["EXO.3", "EXO.14", "GEN.1"]));
    expect(p).toMatchObject({ read: 2, total: 6, unlocked: true, complete: false, next: "EXO.2" });
    const all = new Set(keyChapters(moises.passages));
    expect(passagesProgress(moises.passages, all)).toMatchObject({ complete: true, next: null });
  });

  it("un rango cuenta cada capítulo (Noé: Génesis 6 a 9)", () => {
    const noe = get(collectibleKey("character", "noe"));
    expect(passagesProgress(noe.passages, new Set(["GEN.7"]))).toMatchObject({ read: 1, total: 4 });
  });

  it("la etapa suma sus pasajes y los de sus eventos", () => {
    const exodo = catalog.eras.find((e) => e.id === "exodo")!;
    const p = eraProgress(exodo, catalog.collectibles, new Set(["EXO.15"]));
    // EXO.15 no está en la etapa, pero sí en el evento "El mar se abre".
    expect(p.read).toBe(1);
    expect(p.total).toBe(6); // EXO.3, 12, 14, 20 + EXO.15 y EXO.19 de los eventos
  });

  it("desbloquea al leer por primera vez un capítulo clave", () => {
    const after = new Set(["EXO.3"]);
    const nuevas = newlyUnlocked(catalog.collectibles, after, "EXO.3", false).map((c) => collectibleKey(c.kind, c.id));
    expect(nuevas).toEqual(["character:moises", "place:sinai", "event:zarza"]);
  });

  it("no repite el aviso si la ficha ya estaba desbloqueada o el capítulo ya se había leído", () => {
    // Moisés ya tenía EXO.2; al leer EXO.3 solo se estrenan el Sinaí y la zarza.
    const nuevas = newlyUnlocked(catalog.collectibles, new Set(["EXO.2", "EXO.3"]), "EXO.3", false);
    expect(nuevas.map((c) => c.id)).toEqual(["sinai", "zarza"]);
    expect(newlyUnlocked(catalog.collectibles, new Set(["EXO.3"]), "EXO.3", true)).toEqual([]);
    expect(newlyUnlocked(catalog.collectibles, new Set(["LEV.1"]), "LEV.1", false)).toEqual([]);
  });

  it("la fecha de desbloqueo es la primera lectura de un capítulo clave", () => {
    const first = new Map([
      ["EXO.14", "2026-09-20T10:00:00Z"],
      ["EXO.3", "2026-09-12T08:00:00Z"],
      ["GEN.1", "2026-01-01T00:00:00Z"],
    ]);
    expect(unlockedAt(moises, first)).toBe("2026-09-12T08:00:00Z");
    expect(unlockedAt(get("character:adan"), new Map())).toBeNull();
  });

  it("resume cuántas fichas hay desbloqueadas por tipo", () => {
    const t = kindTotals(catalog.collectibles, new Set(["GEN.2", "GEN.3"]));
    expect(t.character).toMatchObject({ unlocked: 2, complete: 1 }); // Adán completo; Eva le falta GEN.4
    expect(t.place).toMatchObject({ unlocked: 1, complete: 1 }); // el Edén
    expect(t.event.unlocked).toBe(2); // la creación (a medias) y la caída
    expect(t.character.total).toBe(characters.characters.length);
  });
});

describe("relaciones", () => {
  it("un personaje aparece en sus etapas y eventos", () => {
    const pedro = get("character:pedro");
    expect(erasOf(pedro, catalog).map((e) => e.id)).toEqual(["jesus", "iglesia"]);
    expect(relatedOf(pedro, catalog).map((c) => c.id)).toEqual(["ultima_cena", "resurreccion", "pentecostes"]);
  });

  it("un evento muestra sus personajes y lugares", () => {
    const ev = get("event:muros_jerico");
    expect(relatedOf(ev, catalog).map((c) => collectibleKey(c.kind, c.id))).toEqual([
      "character:josue",
      "character:rahab",
      "place:jerico",
    ]);
    expect(erasOf(ev, catalog).map((e) => e.id)).toEqual(["jueces"]);
  });

  it("encuentra las fichas de un capítulo para el lector", () => {
    const ids = collectiblesInChapter(catalog.collectibles, "1SA.17").map((c) => c.id);
    expect(ids).toEqual(["david", "david_goliat"]);
  });
});

// ---------- Imágenes de las fichas ----------

import { readdirSync, statSync } from "node:fs";
import imagesRaw from "../content/collectible_images.json";
import { creditLine, imagesFileSchema } from "../src/domain/collectibles";

describe("imágenes de las fichas", () => {
  const { images } = imagesFileSchema.parse(imagesRaw);
  const dir = "src/assets/fichas";
  const files = readdirSync(dir);

  it("cada imagen es de una ficha que existe y su archivo corresponde a la clave", () => {
    for (const [key, img] of Object.entries(images)) {
      expect(catalog.byKey.has(key), key).toBe(true);
      expect(img.file).toBe(`${key.replace(":", "-")}.webp`);
      expect(files).toContain(img.file);
    }
  });

  it("no hay archivos sin crédito, y todos son livianos", () => {
    const used = new Set(Object.values(images).map((i) => i.file));
    for (const f of files) {
      expect(used.has(f), `${f} no tiene crédito en collectible_images.json`).toBe(true);
      expect(statSync(`${dir}/${f}`).size).toBeLessThan(160_000);
    }
  });

  it("arma el crédito corto", () => {
    expect(creditLine(images["character:moises"])).toBe("Rembrandt, 1659 · Dominio público");
  });
});

/**
 * Sprint 3.5C: conexiones entre mapa, historia y colección; logros de descubrimiento (ADR-0014).
 */
import { describe, expect, it } from "vitest";
import timeline from "../content/timeline.json";
import characters from "../content/characters.json";
import places from "../content/places.json";
import events from "../content/events.json";
import booksMeta from "../content/books_meta.json";
import achievementsRaw from "../content/achievements.json";
import {
  bookDiscoveries,
  booksOf,
  buildCatalog,
  collectibleKey,
  collectiblesInBook,
  connectionsOf,
  eraProgress,
  exploreStatus,
  keyChapters,
  kindCountLabel,
  passagesProgress,
  type Collectible,
} from "../src/domain/collectibles";
import { achievementsFileSchema, newlyUnlocked, ruleProgress, type ProgressSnapshot } from "../src/domain/achievements";
import { zoneState } from "../src/domain/mapLayout";
import { bookCollectionPath } from "../src/app/paths";

const catalog = buildCatalog({ timeline, characters, places, events });
const all = catalog.collectibles;
const get = (key: string) => catalog.byKey.get(key)!;
const EVENTS = all.filter((c) => c.kind === "event");

describe("descubrimientos por libro", () => {
  it("cuenta por tipo solo las fichas que aparecen en el libro", () => {
    const gen = collectiblesInBook(all, "GEN");
    expect(gen.length).toBeGreaterThan(5);
    expect(gen.every((c) => booksOf(c).includes("GEN"))).toBe(true);

    const none = bookDiscoveries(all, "GEN", new Set());
    expect(none.map((k) => k.kind)).toEqual(["character", "place", "event"]);
    expect(none.every((k) => k.unlocked === 0)).toBe(true);
    expect(none.reduce((n, k) => n + k.total, 0)).toBe(gen.length);

    const some = bookDiscoveries(all, "GEN", new Set(["GEN.1", "GEN.3"]));
    const ev = some.find((k) => k.kind === "event")!;
    expect(ev.unlocked).toBeGreaterThan(0);
    expect(ev.unlocked).toBeLessThan(ev.total);
  });

  it("no dice nombres, solo cantidades", () => {
    const label = kindCountLabel({ kind: "character", unlocked: 3, total: 8 });
    expect(label).toBe("3 de 8 personajes");
    expect(kindCountLabel({ kind: "place", unlocked: 0, total: 1 })).toBe("0 de 1 lugar");
  });

  it("un libro sin fichas no muestra tipos vacíos", () => {
    expect(bookDiscoveries(all, "OBA", new Set())).toEqual([]);
  });

  it("la colección se puede filtrar por libro", () => {
    expect(bookCollectionPath("GEN")).toBe("/explorar/coleccion?libro=GEN");
  });
});

describe("estado de etapas y zonas", () => {
  it("una etapa sin leer está sin explorar; a medias, en porcentaje; completa, completa", () => {
    const era = catalog.eras[0];
    const chapters = keyChapters([
      ...era.passages,
      ...EVENTS.filter((e) => e.era === era.id).flatMap((e) => e.passages),
    ]);
    expect(exploreStatus(eraProgress(era, EVENTS, new Set()))).toEqual({
      state: "unexplored",
      label: "Sin explorar",
      percent: 0,
    });
    const half = exploreStatus(eraProgress(era, EVENTS, new Set([chapters[0]])));
    expect(half.state).toBe("partial");
    expect(half.label).toMatch(/^\d{1,2} %$/);
    expect(exploreStatus(eraProgress(era, EVENTS, new Set(chapters))).label).toBe("Completa");
  });

  it("el porcentaje no dice 0 % ni 100 % por redondeo", () => {
    expect(exploreStatus({ read: 1, total: 300, unlocked: true, complete: false, next: "X" }).label).toBe("1 %");
    expect(exploreStatus({ read: 299, total: 300, unlocked: true, complete: false, next: "X" }).label).toBe("99 %");
  });

  it("zonas del mapa: apagada, parcial, iluminada y completa", () => {
    expect(zoneState(0, 50)).toBe("off");
    expect(zoneState(10, 50)).toBe("partial");
    expect(zoneState(25, 50)).toBe("lit");
    expect(zoneState(50, 50)).toBe("complete");
  });
});

describe("conexiones entre fichas", () => {
  it("un personaje lleva a su etapa, sus eventos y los lugares de esos eventos", () => {
    const abraham = get("character:abraham");
    const c = connectionsOf(abraham, catalog);
    expect(c.eras.length).toBeGreaterThan(0);
    expect(c.events.length).toBeGreaterThan(0);
    expect(c.events.every((e) => e.characters.includes("abraham"))).toBe(true);
    expect(c.places.length).toBeGreaterThan(0);
    expect(c.characters.map((x) => x.id)).not.toContain("abraham");
  });

  it("un lugar lleva a los eventos que pasan ahí y a sus personajes", () => {
    const eden = get("place:eden");
    const c = connectionsOf(eden, catalog);
    expect(c.events.map((e) => e.id)).toContain("creacion_mundo");
    expect(c.characters.map((x) => x.id)).toEqual(expect.arrayContaining(["adan", "eva"]));
    expect(c.places.map((x) => x.id)).not.toContain("eden");
  });

  it("un evento lleva a su etapa, sus personajes y sus lugares", () => {
    const ev = get("event:creacion_mundo");
    const c = connectionsOf(ev, catalog);
    expect(c.eras.map((e) => e.id)).toEqual([ev.era]);
    expect(c.events).toEqual([]);
    expect(c.characters.map((x) => x.id)).toEqual(ev.characters);
    expect(c.places.map((x) => x.id)).toEqual(ev.places);
  });

  it("todas las conexiones apuntan a fichas que existen y nunca a sí mismas", () => {
    for (const item of all) {
      const c = connectionsOf(item, catalog);
      for (const x of [...c.events, ...c.characters, ...c.places]) {
        expect(catalog.byKey.get(collectibleKey(x.kind, x.id))).toBe(x);
        expect(collectibleKey(x.kind, x.id)).not.toBe(collectibleKey(item.kind, item.id));
      }
    }
  });
});

describe("logros de descubrimiento", () => {
  const file = achievementsFileSchema.parse(achievementsRaw);
  const books = Object.fromEntries(
    booksMeta.books.map((b) => [b.code, { chapters: 10, testament: b.testament as "AT" | "NT" }]),
  );
  const snap = (read: Set<string>): ProgressSnapshot => ({
    readByBook: {},
    books,
    bestStreak: 0,
    activityCounts: {},
    level: 1,
    completedChallenges: [],
    collectibles: all.map((c: Collectible) => ({
      kind: c.kind,
      books: booksOf(c),
      unlocked: passagesProgress(c.passages, read).unlocked,
    })),
  });
  const discovery = file.achievements.filter((a) => a.rule.type === "collectibles_unlocked");

  it("están los acordados, en la categoría Descubrimiento", () => {
    expect(discovery.map((a) => a.id)).toEqual([
      "discover_10",
      "discover_25",
      "discover_50",
      "discover_all",
      "genesis_characters",
    ]);
    expect(discovery.every((a) => a.group === "descubrimiento")).toBe(true);
  });

  it("los logros están en las 5 categorías del plan", () => {
    expect(file.groups.map((g) => g.title)).toEqual([
      "Lectura",
      "Constancia",
      "Reflexión y oración",
      "Descubrimiento",
      "Desafíos",
    ]);
    for (const g of file.groups) expect(file.achievements.some((a) => a.group === g.id)).toBe(true);
  });

  it("los libros de las reglas existen y las cantidades se pueden alcanzar", () => {
    const codes = new Set(booksMeta.books.map((b) => b.code));
    for (const a of discovery) {
      if (a.rule.type !== "collectibles_unlocked") continue;
      if (a.rule.book) expect(codes.has(a.rule.book)).toBe(true);
      if (a.rule.count) expect(a.rule.count).toBeLessThanOrEqual(all.length);
    }
  });

  it("sin nada leído no se cumple ninguno; todo descubierto los cumple todos", () => {
    const none = snap(new Set());
    expect(newlyUnlocked(discovery, none, new Set())).toEqual([]);
    const everything = new Set(all.flatMap((c) => keyChapters(c.passages)));
    expect(newlyUnlocked(discovery, snap(everything), new Set()).map((a) => a.id)).toEqual(discovery.map((a) => a.id));
  });

  it("la colección completa mide las 115 fichas", () => {
    const allRule = discovery.find((a) => a.id === "discover_all")!.rule;
    expect(ruleProgress(allRule, snap(new Set()))).toEqual({ current: 0, target: 115, done: false });
  });

  it("los personajes de Génesis: solo personajes que aparecen en Génesis", () => {
    const rule = discovery.find((a) => a.id === "genesis_characters")!.rule;
    const genChars = collectiblesInBook(all, "GEN").filter((c) => c.kind === "character");
    const p = ruleProgress(rule, snap(new Set(["GEN.1", "GEN.2", "GEN.3"])));
    expect(p.target).toBe(genChars.length);
    expect(p.current).toBeGreaterThanOrEqual(2); // Adán y Eva
    expect(p.done).toBe(false);
    const allGen = new Set(genChars.flatMap((c) => keyChapters(c.passages)));
    expect(ruleProgress(rule, snap(allGen)).done).toBe(true);
  });

  it("un progreso de la V3 recibe los logros que ya cumplía", () => {
    const v3 = new Set(Array.from({ length: 50 }, (_, i) => `GEN.${i + 1}`));
    const got = newlyUnlocked(discovery, snap(v3), new Set()).map((a) => a.id);
    expect(got).toContain("discover_10");
    expect(got).toContain("genesis_characters");
    expect(got).not.toContain("discover_all");
  });
});

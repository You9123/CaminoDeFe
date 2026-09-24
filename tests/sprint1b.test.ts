import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { buildFtsQuery, MARK_END, MARK_START, searchTerms, splitHighlights } from "../src/domain/search";
import { versesLabel } from "../src/domain/refs";
import { DEFAULT_DAY_END_HOUR, formatDayLong, gameDay, getDayEndHour, setDayEndHour } from "../src/domain/day";

describe("buscador", () => {
  it("convierte palabras en prefijos y descarta lo que no sirve", () => {
    expect(buildFtsQuery("Misericordia")).toBe('"misericordia"*');
    expect(buildFtsQuery("  no   temas! ")).toBe('"no"* "temas"*');
    expect(buildFtsQuery('amor" OR NEAR(')).toBe('"amor"* "or"* "near"*');
    expect(buildFtsQuery("a ; *")).toBeNull();
    expect(buildFtsQuery("")).toBeNull();
  });
  it("no repite palabras y limita la cantidad", () => {
    expect(searchTerms("paz paz PAZ")).toEqual(["paz"]);
    expect(searchTerms("uno dos tres cuatro cinco seis siete ocho nueve diez")).toHaveLength(8);
  });
  it("separa las coincidencias marcadas", () => {
    const text = `Bienaventurados los ${MARK_START}misericordiosos${MARK_END}: porque ellos alcanzarán ${MARK_START}misericordia${MARK_END}.`;
    expect(splitHighlights(text)).toEqual([
      { text: "Bienaventurados los ", hit: false },
      { text: "misericordiosos", hit: true },
      { text: ": porque ellos alcanzarán ", hit: false },
      { text: "misericordia", hit: true },
      { text: ".", hit: false },
    ]);
    expect(splitHighlights("sin marcas")).toEqual([{ text: "sin marcas", hit: false }]);
  });
});

describe.runIf(existsSync("src-tauri/resources/bible.db"))("búsqueda real en bible.db", () => {
  const db = new DatabaseSync("src-tauri/resources/bible.db", { readOnly: true });
  const count = (q: string) =>
    (db.prepare("SELECT count(*) n FROM verses_fts WHERE verses_fts MATCH ?").get(buildFtsQuery(q)!) as { n: number })
      .n;

  it("ignora tildes y mayúsculas", () => {
    expect(count("jehova")).toBe(count("Jehová"));
    expect(count("jehova")).toBeGreaterThan(5000);
  });
  it("busca por prefijo y exige todas las palabras", () => {
    expect(count("misericord")).toBeGreaterThan(count("misericordia"));
    expect(count("buen pastor")).toBeLessThan(count("pastor"));
    expect(count("buen pastor")).toBeGreaterThan(0);
  });
});

describe("etiquetas de versículos", () => {
  it("agrupa rangos seguidos", () => {
    expect(versesLabel([16])).toBe("16");
    expect(versesLabel([18, 16, 17])).toBe("16-18");
    expect(versesLabel([16, 18])).toBe("16, 18");
  });
});

describe("fechas del diario y fin del día", () => {
  afterEach(() => setDayEndHour(DEFAULT_DAY_END_HOUR));

  it("muestra Hoy, Ayer o la fecha en español", () => {
    expect(formatDayLong("2026-09-24", "2026-09-24")).toBe("Hoy");
    expect(formatDayLong("2026-09-23", "2026-09-24")).toBe("Ayer");
    expect(formatDayLong("2026-09-20", "2026-09-24")).toBe("Domingo 20 de septiembre");
    expect(formatDayLong("2025-12-25", "2026-09-24")).toBe("Jueves 25 de diciembre de 2025");
  });

  it("la hora de fin del día se puede cambiar y valida valores raros", () => {
    const at130 = new Date(2026, 8, 24, 1, 30);
    expect(gameDay(at130)).toBe("2026-09-23");
    setDayEndHour(0);
    expect(gameDay(at130)).toBe("2026-09-24");
    setDayEndHour(9);
    expect(getDayEndHour()).toBe(DEFAULT_DAY_END_HOUR);
  });
});

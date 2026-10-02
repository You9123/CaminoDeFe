/**
 * Sprint 3.5B: navegación de 6 entradas, Hoy con 4 bloques y bienvenida (ADR-0013).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import timeline from "../content/timeline.json";
import characters from "../content/characters.json";
import places from "../content/places.json";
import events from "../content/events.json";
import { collectionPath, historyPath, LEGACY_ROUTES, legacyRedirect, PATHS } from "../src/app/paths";
import { buildCatalog, isFirstDiscovery, newlyUnlocked, recentDiscoveries } from "../src/domain/collectibles";
import { needsOnboarding, ONBOARDING_STEPS, type OnboardingFacts } from "../src/domain/onboarding";
import { continueTarget } from "../src/domain/today";

vi.mock("../src/hooks/usePet", () => ({ usePet: () => null }));

const catalog = buildCatalog({ timeline, characters, places, events });
const all = catalog.collectibles;

describe("rutas y redirecciones", () => {
  it("cada ruta vieja lleva a una pantalla nueva", () => {
    expect(legacyRedirect("/mapa")).toBe("/explorar");
    expect(legacyRedirect("/linea-temporal")).toBe("/explorar/historia");
    expect(legacyRedirect("/logros/coleccionables")).toBe("/explorar/coleccion");
    expect(legacyRedirect("/misiones")).toBe("/mi-camino");
    expect(legacyRedirect("/logros")).toBe("/mi-camino/logros");
    expect(legacyRedirect("/estadisticas")).toBe("/mi-camino/estadisticas");
    const targets = new Set<string>(Object.values(PATHS));
    for (const to of Object.values(LEGACY_ROUTES)) expect(targets.has(to)).toBe(true);
  });

  it("conserva la búsqueda (etapa, tipo y ficha abierta)", () => {
    expect(legacyRedirect("/linea-temporal", "?etapa=diluvio")).toBe("/explorar/historia?etapa=diluvio");
    expect(legacyRedirect("/logros/coleccionables", "?tipo=lugares&ficha=place%3Aeden")).toBe(
      "/explorar/coleccion?tipo=lugares&ficha=place%3Aeden",
    );
    expect(legacyRedirect("/mapa/")).toBe("/explorar");
  });

  it("no toca las rutas que siguen igual", () => {
    for (const p of ["/", "/biblia", "/biblia/GEN/1", "/diario", "/ajustes", "/explorar", "/mi-camino/logros"])
      expect(legacyRedirect(p)).toBeNull();
  });

  it("los enlaces internos usan las rutas nuevas", () => {
    expect(historyPath("diluvio")).toBe("/explorar/historia?etapa=diluvio");
    expect(collectionPath()).toBe("/explorar/coleccion");
    expect(collectionPath("event")).toBe("/explorar/coleccion?tipo=eventos");
  });

  it("ningún archivo de la app enlaza a una ruta vieja", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|json)$/.test(f)) files.push(p);
      }
    };
    walk("src");
    walk("content");
    const legacy = /["'`](\/mapa|\/linea-temporal|\/misiones|\/logros|\/estadisticas)\b/;
    const offenders = files
      .filter((f) => !f.endsWith(join("app", "paths.ts")))
      .filter((f) => legacy.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("Continuar mi camino", () => {
  const books = [
    { code: "GEN", chapters: 50 },
    { code: "EXO", chapters: 40 },
    { code: "REV", chapters: 22 },
  ];

  it("sin posición guardada empieza en Génesis 1", () => {
    expect(continueTarget(null, new Set(), books)).toEqual({ book: "GEN", chapter: 1 });
  });

  it("si el último capítulo quedó sin terminar, vuelve a él", () => {
    expect(continueTarget({ book: "GEN", chapter: 4 }, new Set(["GEN.3"]), books)).toEqual({
      book: "GEN",
      chapter: 4,
    });
  });

  it("si ya se leyó, sigue con el siguiente (y pasa al libro siguiente)", () => {
    expect(continueTarget({ book: "GEN", chapter: 3 }, new Set(["GEN.3"]), books)).toEqual({
      book: "GEN",
      chapter: 4,
    });
    expect(continueTarget({ book: "GEN", chapter: 50 }, new Set(["GEN.50"]), books)).toEqual({
      book: "EXO",
      chapter: 1,
    });
    expect(continueTarget({ book: "REV", chapter: 22 }, new Set(["REV.22"]), books)).toEqual({
      book: "REV",
      chapter: 22,
    });
  });
});

describe("descubrimientos en Hoy", () => {
  it("muestra los 3 más recientes, el último primero", () => {
    const at = new Map([
      ["GEN.1", "2026-09-01T10:00:00Z"],
      ["GEN.12", "2026-09-20T10:00:00Z"],
      ["EXO.14", "2026-09-10T10:00:00Z"],
      ["JHN.19", "2026-09-30T10:00:00Z"],
    ]);
    const recent = recentDiscoveries(all, at, 3);
    expect(recent).toHaveLength(3);
    expect(recent[0].at).toBe("2026-09-30T10:00:00Z");
    expect(recent.every((r, i) => i === 0 || r.at <= recent[i - 1].at)).toBe(true);
    expect(recentDiscoveries(all, new Map())).toEqual([]);
  });

  it("Génesis 1 es el primer descubrimiento (La creación)", () => {
    const read = new Set(["GEN.1"]);
    const found = newlyUnlocked(all, read, "GEN.1", false);
    expect(found.map((c) => c.id)).toContain("creacion_mundo");
    expect(isFirstDiscovery(all, read, found)).toBe(true);
    // Si ya había algo descubierto, no es el primero.
    const later = new Set(["EXO.14", "GEN.1"]);
    expect(isFirstDiscovery(all, later, newlyUnlocked(all, later, "GEN.1", false))).toBe(false);
    expect(isFirstDiscovery(all, read, [])).toBe(false);
  });
});

describe("bienvenida", () => {
  const fresh: OnboardingFacts = { done: false, name: "", petSpecies: null, activities: 0, chaptersRead: 0 };

  it("solo la ve un perfil nuevo", () => {
    expect(needsOnboarding(fresh)).toBe(true);
    expect(needsOnboarding({ ...fresh, done: true })).toBe(false);
  });

  it("quien ya usaba la app no la ve, aunque no tenga la marca guardada", () => {
    expect(needsOnboarding({ ...fresh, name: "Youfrend" })).toBe(false);
    expect(needsOnboarding({ ...fresh, petSpecies: "none" })).toBe(false);
    expect(needsOnboarding({ ...fresh, activities: 3 })).toBe(false);
    expect(needsOnboarding({ ...fresh, chaptersRead: 1 })).toBe(false);
  });

  it("tiene los pasos acordados, en orden", () => {
    expect(ONBOARDING_STEPS).toEqual(["welcome", "name", "pet", "reminder", "first"]);
  });
});

describe("Hoy sin mascota", () => {
  it("no reserva espacio", async () => {
    const { PetCompanion } = await import("../src/components/pet/PetCompanion");
    expect(renderToStaticMarkup(createElement(PetCompanion))).toBe("");
  });
});

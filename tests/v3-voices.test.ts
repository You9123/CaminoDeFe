/**
 * Sprint 3D: voces naturales con Piper (ADR-0011).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import raw from "../content/voices.json";
import {
  activeNaturalVoice,
  downloadSize,
  naturalVoiceId,
  naturalVoiceURI,
  overallPercent,
  sizeLabel,
  voicesFileSchema,
} from "../src/domain/voices";

const file = voicesFileSchema.parse(raw);
const rust = readFileSync("src-tauri/src/piper.rs", "utf8");

describe("Catálogo de voces", () => {
  it("es válido y tiene voces latinoamericanas primero", () => {
    expect(file.voices.length).toBeGreaterThanOrEqual(3);
    expect(file.voices[0].id.startsWith("es_MX")).toBe(true);
    expect(new Set(file.voices.map((v) => v.gender))).toEqual(new Set(["hombre", "mujer"]));
  });

  it("todas las direcciones apuntan a la misma versión fija de rhasspy/piper-voices", () => {
    const revs = new Set(
      file.voices.flatMap((v) => [v.model.url, v.config.url]).map((u) => u.split("/resolve/")[1].split("/")[0]),
    );
    expect(revs.size).toBe(1);
    expect([...revs][0]).toMatch(/^[0-9a-f]{40}$/);
  });

  it("rechaza direcciones de otros sitios y voces repetidas", () => {
    const bad = structuredClone(raw) as typeof raw;
    bad.voices[0].model.url = "https://example.com/es_MX-claude-high.onnx";
    expect(voicesFileSchema.safeParse(bad).success).toBe(false);
    const dup = structuredClone(raw) as typeof raw;
    dup.voices.push(dup.voices[0]);
    expect(voicesFileSchema.safeParse(dup).success).toBe(false);
  });

  it("el tamaño del motor coincide con el de Windows fijado en Rust", () => {
    expect(rust).toContain("piper_windows_amd64.zip");
    expect(rust).toMatch(/sha256: "[0-9a-f]{64}"/);
    expect(file.engine.size).toBe(22477236);
  });

  it("Rust solo descarga de Piper oficial", () => {
    expect(rust).toContain('"https://huggingface.co/rhasspy/piper-voices/"');
    expect(rust).toContain('"https://github.com/rhasspy/piper/releases/download/"');
  });
});

describe("Voces naturales: lógica", () => {
  it("guarda la voz como piper:<id>", () => {
    expect(naturalVoiceURI("es_MX-ald-medium")).toBe("piper:es_MX-ald-medium");
    expect(naturalVoiceId("piper:es_MX-ald-medium")).toBe("es_MX-ald-medium");
    expect(naturalVoiceId("Microsoft Sabina - Spanish (Mexico)")).toBeNull();
    expect(naturalVoiceId("")).toBeNull();
    expect(naturalVoiceId("piper:")).toBeNull();
  });

  it("usa la voz natural solo si está instalada", () => {
    expect(activeNaturalVoice("piper:a", ["a", "b"])).toBe("a");
    expect(activeNaturalVoice("piper:c", ["a"])).toBeNull();
    expect(activeNaturalVoice("Sabina", ["a"])).toBeNull();
  });

  it("calcula lo que hay que descargar (el motor solo la primera vez)", () => {
    const v = file.voices[0];
    expect(downloadSize(v, 100, true)).toBe(v.model.size + v.config.size);
    expect(downloadSize(v, 100, false)).toBe(v.model.size + v.config.size + 100);
    expect(sizeLabel(63_122_309)).toBe("63 MB");
    expect(sizeLabel(10)).toBe("1 MB");
  });

  it("una sola barra de avance para motor y voz", () => {
    const base = { total: null, engineSize: 20, voiceSize: 80 };
    expect(overallPercent({ ...base, step: "engine", downloaded: 10, includesEngine: true })).toBe(10);
    expect(overallPercent({ ...base, step: "voice", downloaded: 40, includesEngine: true })).toBe(60);
    expect(overallPercent({ ...base, step: "voice", downloaded: 40, includesEngine: false })).toBe(50);
    expect(overallPercent({ ...base, step: "voice", downloaded: 999, includesEngine: false })).toBe(100);
  });
});

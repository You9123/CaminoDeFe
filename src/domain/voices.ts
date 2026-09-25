import { z } from "zod";

/**
 * Voces naturales (Piper, ADR-0011). El catálogo vive en content/voices.json.
 *
 * - En Ajustes, la voz elegida se guarda como "piper:<id>" (ej. "piper:es_MX-ald-medium");
 *   las voces de Windows siguen guardándose con su voiceURI de siempre.
 * - Cada archivo tiene su huella SHA-256: la app no usa nada que no coincida.
 */

const sha = z.string().regex(/^[0-9a-f]{64}$/, "Huella SHA-256 en minúsculas");
const hfUrl = z
  .string()
  .regex(
    /^https:\/\/huggingface\.co\/rhasspy\/piper-voices\/resolve\/[\w.-]+\/[\w./-]+$/,
    "Solo voces oficiales de Piper",
  );

const fileSchema = z.object({ url: hfUrl, sha256: sha, size: z.number().int().positive() });

export const voiceSchema = z.object({
  id: z.string().regex(/^[a-z]{2}_[A-Z]{2}-[a-z0-9_]+-(x_low|low|medium|high)$/),
  /** Nombre corto para mostrar ("Ald"). */
  name: z.string().min(1),
  gender: z.enum(["hombre", "mujer"]),
  accent: z.string().min(1),
  /** Una frase sobre cómo suena. */
  note: z.string().min(1),
  /** Licencia del modelo de voz (se muestra en Ajustes → Acerca de). */
  license: z.string().min(1),
  model: fileSchema,
  config: fileSchema,
});

export const voicesFileSchema = z
  .object({
    $comment: z.string().optional(),
    engine: z.object({ size: z.number().int().positive() }),
    voices: z.array(voiceSchema).min(1),
  })
  .superRefine((f, ctx) => {
    const ids = new Set<string>();
    for (const v of f.voices) {
      if (ids.has(v.id)) ctx.addIssue({ code: "custom", message: `Voz repetida: ${v.id}` });
      ids.add(v.id);
      if (!v.model.url.endsWith(`/${v.id}.onnx`) || !v.config.url.endsWith(`/${v.id}.onnx.json`))
        ctx.addIssue({ code: "custom", message: `${v.id}: las direcciones no corresponden a la voz` });
    }
  });

export type NaturalVoice = z.infer<typeof voiceSchema>;
export type VoicesFile = z.infer<typeof voicesFileSchema>;

const PREFIX = "piper:";

export const naturalVoiceURI = (id: string) => `${PREFIX}${id}`;

/** El id de la voz natural elegida, o null si es una voz de Windows (o "automática"). */
export function naturalVoiceId(voiceURI: string): string | null {
  return voiceURI.startsWith(PREFIX) ? voiceURI.slice(PREFIX.length) || null : null;
}

/** Cuánto hay que descargar para usar una voz: el motor solo la primera vez. */
export function downloadSize(voice: NaturalVoice, engineSize: number, engineInstalled: boolean): number {
  return voice.model.size + voice.config.size + (engineInstalled ? 0 : engineSize);
}

/** "63 MB" */
export function sizeLabel(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;
}

/**
 * Avance total al descargar una voz (0–100): el motor y la voz son pasos distintos,
 * pero se muestran como una sola barra.
 */
export function overallPercent(input: {
  step: "engine" | "voice";
  downloaded: number;
  total: number | null;
  engineSize: number;
  voiceSize: number;
  includesEngine: boolean;
}): number {
  const { step, downloaded, engineSize, voiceSize, includesEngine } = input;
  const total = (includesEngine ? engineSize : 0) + voiceSize;
  if (total <= 0) return 0;
  const done = step === "engine" ? downloaded : (includesEngine ? engineSize : 0) + downloaded;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

/**
 * La voz que se usa de verdad: la natural elegida si está instalada; si no (se borró o todavía se
 * descarga), null y se lee con la voz de Windows.
 */
export function activeNaturalVoice(voiceURI: string, installed: readonly string[]): string | null {
  const id = naturalVoiceId(voiceURI);
  return id && installed.includes(id) ? id : null;
}

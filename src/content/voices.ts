import raw from "../../content/voices.json";
import { voicesFileSchema } from "../domain/voices";

/** Catálogo de voces naturales (Piper), validado al cargar (ADR-0011). */
export const VOICES = voicesFileSchema.parse(raw);
export const voiceById = (id: string) => VOICES.voices.find((v) => v.id === id) ?? null;

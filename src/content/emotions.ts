import raw from "../../content/emotions.json";
import { emotionsFileSchema, type Emotion, type EmotionId } from "../domain/emotions";

/** Emociones validadas con Zod al cargar (la prueba de contenido lo revisa antes). */
export const EMOTIONS = emotionsFileSchema.parse(raw).emotions;
export const EMOTION_BY_ID = new Map<EmotionId, Emotion>(EMOTIONS.map((e) => [e.id, e]));
export const CARE_EMOTIONS = new Set<string>(EMOTIONS.filter((e) => e.cuidado).map((e) => e.id));

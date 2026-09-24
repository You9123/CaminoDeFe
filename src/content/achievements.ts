import raw from "../../content/achievements.json";
import { achievementsFileSchema } from "../domain/achievements";

/**
 * Catálogo de logros validado con Zod al cargar.
 * Si el JSON tiene un error, la prueba de contenido (tests/content.test.ts) lo detecta antes.
 */
const file = achievementsFileSchema.parse(raw);

export const ACHIEVEMENT_GROUPS = file.groups;
export const ACHIEVEMENTS = file.achievements;

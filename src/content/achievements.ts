import raw from "../../content/achievements.json";
import { achievementsFileSchema } from "../domain/achievements";

/**
 * Catálogo de logros validado con Zod al cargar.
 * Si el JSON tiene un error, la prueba de contenido (tests/content.test.ts) lo detecta antes.
 */
const file = achievementsFileSchema.parse(raw);

export const ACHIEVEMENT_GROUPS = file.groups;
export const ACHIEVEMENTS = file.achievements;

/** Insignias de los desafíos mayores (regla challenge_completed): cuentan para los cosméticos. */
export const MAJOR_BADGE_IDS: readonly string[] = file.achievements
  .filter((a) => a.rule.type === "challenge_completed")
  .map((a) => a.id);

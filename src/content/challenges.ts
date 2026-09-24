import raw from "../../content/challenges.json";
import { challengesFileSchema } from "../domain/challenges";

/** Catálogo de desafíos validado con Zod al cargar (la prueba de contenido lo revisa antes). */
export const CHALLENGES = challengesFileSchema.parse(raw).challenges;

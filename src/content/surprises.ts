import raw from "../../content/random_missions.json";
import { surprisesFileSchema } from "../domain/surprise";

/** Misiones sorpresa validadas con Zod al cargar (la prueba de contenido lo revisa antes). */
export const SURPRISES = surprisesFileSchema.parse(raw).missions;

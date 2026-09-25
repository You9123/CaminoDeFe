import timeline from "../../content/timeline.json";
import characters from "../../content/characters.json";
import places from "../../content/places.json";
import events from "../../content/events.json";
import { buildCatalog } from "../domain/collectibles";

/**
 * Línea temporal y coleccionables, validados al cargar (ADR-0008).
 * La prueba de contenido además revisa que cada capítulo exista en bible.db.
 */
export const CATALOG = buildCatalog({ timeline, characters, places, events });

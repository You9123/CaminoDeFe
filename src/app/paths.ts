import { collectibleKey, type Collectible, type CollectibleKind } from "../domain/collectibles";

/**
 * Rutas de la app (V3.5, ADR-0013). La barra lateral tiene 6 entradas: Hoy, Biblia, Explorar,
 * Mi camino, Diario y Ajustes. Explorar y Mi camino agrupan pantallas que antes eran entradas sueltas.
 */
export const PATHS = {
  today: "/",
  bible: "/biblia",
  explore: "/explorar",
  /** Explorar → Libros (el mapa). */
  books: "/explorar",
  /** Explorar → Historia (la línea temporal). */
  history: "/explorar/historia",
  /** Explorar → Colección (personajes, lugares, eventos). */
  collection: "/explorar/coleccion",
  journey: "/mi-camino",
  /** Mi camino → Misiones (diarias, desafíos, desafíos mayores). */
  missions: "/mi-camino",
  /** Mi camino → Logros (insignias y recompensas). */
  achievements: "/mi-camino/logros",
  /** Mi camino → Estadísticas. */
  stats: "/mi-camino/estadisticas",
  journal: "/diario",
  settings: "/ajustes",
} as const;

/**
 * Rutas de antes de la V3.5 y a dónde van ahora. Se redirigen conservando la búsqueda
 * (`?etapa=`, `?tipo=`, `?ficha=`), así que ningún enlace viejo queda roto.
 */
export const LEGACY_ROUTES: Record<string, string> = {
  "/mapa": PATHS.books,
  "/linea-temporal": PATHS.history,
  "/misiones": PATHS.missions,
  "/logros": PATHS.achievements,
  "/logros/coleccionables": PATHS.collection,
  "/estadisticas": PATHS.stats,
};

/** A dónde lleva hoy una ruta vieja (con su búsqueda), o null si no es una ruta vieja. */
export function legacyRedirect(pathname: string, search = ""): string | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const to = LEGACY_ROUTES[clean];
  return to ? `${to}${search}` : null;
}

/** Valor de ?tipo= en la colección para cada tipo de ficha. */
export const KIND_PARAM: Record<CollectibleKind, string> = {
  character: "personajes",
  place: "lugares",
  event: "eventos",
};

/** Enlace a la colección: en la pestaña de un tipo y, si se pide, con una ficha abierta. */
export function collectionPath(kind?: CollectibleKind, item?: Collectible): string {
  const q = new URLSearchParams();
  if (kind) q.set("tipo", KIND_PARAM[kind]);
  if (item) q.set("ficha", collectibleKey(item.kind, item.id));
  const query = q.toString();
  return query ? `${PATHS.collection}?${query}` : PATHS.collection;
}

/** La colección filtrada a las fichas de un libro (desde la ficha del libro en el mapa). */
export const bookCollectionPath = (code: string) => `${PATHS.collection}?libro=${encodeURIComponent(code)}`;

/** Enlace a una etapa de la historia (línea temporal). */
export const historyPath = (eraId: string) => `${PATHS.history}?etapa=${encodeURIComponent(eraId)}`;

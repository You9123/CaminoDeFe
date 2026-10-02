import { collectibleKey, type Collectible, type CollectibleKind } from "../domain/collectibles";

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
  return query ? `/logros/coleccionables?${query}` : "/logros/coleccionables";
}

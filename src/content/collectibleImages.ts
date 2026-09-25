import raw from "../../content/collectible_images.json";
import { imagesFileSchema, type ImageCredit } from "../domain/collectibles";

/** Archivos de src/assets/fichas/, empaquetados por Vite (la app funciona sin internet). */
const FILES = import.meta.glob<string>("../assets/fichas/*.webp", { eager: true, import: "default" });
const URL_BY_FILE = new Map(Object.entries(FILES).map(([path, url]) => [path.split("/").pop()!, url]));

const { images } = imagesFileSchema.parse(raw);

export type CollectibleImage = ImageCredit & { url: string };

/** Imagen de una ficha ("character:moises"), o undefined si todavía no tiene. */
export function collectibleImage(key: string): CollectibleImage | undefined {
  const credit = images[key];
  const url = credit && URL_BY_FILE.get(credit.file);
  return credit && url ? { ...credit, url } : undefined;
}

/** Todas las imágenes con su ficha, para la lista de créditos en Ajustes. */
export function allCollectibleImages(): { key: string; image: CollectibleImage }[] {
  return Object.keys(images)
    .map((key) => ({ key, image: collectibleImage(key) }))
    .filter((x): x is { key: string; image: CollectibleImage } => x.image !== undefined);
}

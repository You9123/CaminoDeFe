import { Link } from "react-router";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CATALOG } from "../content/collectibles";
import { collectibleImage } from "../content/collectibleImages";
import { collectibleKey, KIND_LABEL, recentDiscoveries } from "../domain/collectibles";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { collectionPath, PATHS } from "../app/paths";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { COLLECTIBLE_ICON } from "./collectibleIcons";
import { Medallion } from "./Medallion";

/** "Descubrimientos recientes" en Hoy: las últimas 3 fichas descubiertas, con enlace a la colección. */
export function RecentDiscoveries() {
  const totalXp = useProgress((s) => s.totalXp);
  const data = useAsync(getReadChapterMap, `${totalXp}`).latest;
  if (!data) return <div className="rounded-2xl border border-border bg-surface p-4" />;
  const recent = recentDiscoveries(CATALOG.collectibles, data.firstReadAt, 3);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.05rem] leading-tight font-semibold">Descubrimientos recientes</h2>
        <Link to={PATHS.collection} className="shrink-0 text-sm text-muted hover:text-accent" title="Ver la colección">
          Ver todo
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          Todavía no descubriste ninguna ficha. Cada capítulo puede esconder personajes, lugares y eventos: aparecen
          aquí al leerlos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.map(({ item, at }) => {
            const image = collectibleImage(collectibleKey(item.kind, item.id));
            return (
              <li key={collectibleKey(item.kind, item.id)}>
                <Link
                  to={collectionPath(item.kind, item)}
                  className="flex items-center gap-3 rounded-xl px-1.5 py-1 transition hover:bg-surface-2"
                >
                  {image ? (
                    <img
                      src={image.url}
                      alt=""
                      className="ficha-img h-11 w-11 shrink-0 rounded-xl object-cover"
                      style={{ animation: "none" }}
                      draggable={false}
                    />
                  ) : (
                    <Medallion icon={COLLECTIBLE_ICON[item.icon]} unlocked size={44} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="block text-xs text-muted">
                      {KIND_LABEL[item.kind].one} ·{" "}
                      {formatDistanceToNowStrict(parseISO(at), { locale: es, addSuffix: true })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

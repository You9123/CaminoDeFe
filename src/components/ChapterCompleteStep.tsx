import { useNavigate } from "react-router";
import { collectibleImage } from "../content/collectibleImages";
import { collectibleKey, KIND_LABEL, type Collectible } from "../domain/collectibles";
import { collectionPath } from "../app/paths";
import { COLLECTIBLE_ICON } from "./collectibleIcons";
import { Medallion } from "./Medallion";
import { CheckIcon } from "./icons";

/** Lo que se muestra en "Capítulo completado", al terminar un capítulo en el lector. */
export type ChapterCompletion = {
  /** "Génesis 3". */
  refLabel: string;
  xpGained: number;
  /** Si los XP incluyen el bono de cinco capítulos. */
  bonus: boolean;
  levelUp: number | null;
  /** Fichas que se descubrieron con este capítulo (vacío si no hubo). */
  discoveries: Collectible[];
  /** Si son las primeras de la colección: "Tu primer descubrimiento" (bienvenida, V3.5). */
  first?: boolean;
};

/**
 * Primera pantalla después de terminar un capítulo (Plan V3.5, 3.5A): el resultado y, si hay,
 * los nuevos descubrimientos con su imagen ya nítida (la niebla se despeja). Una sola pantalla:
 * después siguen la reflexión, la oración y la aplicación.
 */
export function ChapterCompleteStep({
  completion: c,
  onNext,
  onLeave,
}: {
  completion: ChapterCompletion;
  onNext: () => void;
  /** Cierra el flujo antes de ir a otra pantalla. */
  onLeave: () => void;
}) {
  const navigate = useNavigate();
  const go = (path: string) => {
    onLeave();
    navigate(path);
  };
  const found = c.discoveries;

  return (
    <>
      <p className="flex items-center gap-2 text-sm font-semibold text-accent">
        <CheckIcon size={22} />
        Capítulo completado
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold">{c.refLabel}</h2>
      {c.xpGained > 0 ? (
        <p className="mt-1.5 font-semibold text-success">
          +{c.xpGained} XP
          {c.bonus && <span className="font-normal"> (incluye el bono de cinco capítulos)</span>}
          {c.levelUp && <span className="font-normal text-accent"> · Llegaste al nivel {c.levelUp}</span>}
        </p>
      ) : (
        <p className="mt-1.5 text-muted">Ya lo habías leído hoy, así que no suma XP de nuevo. Releer también cuenta.</p>
      )}

      {found.length > 0 && (
        <section className="mt-6">
          {c.first ? (
            <>
              <h3 className="font-display text-xl font-semibold">Tu primer descubrimiento</h3>
              <p className="mt-1 mb-3 text-sm leading-relaxed text-muted">
                Cada capítulo puede esconder personajes, lugares y momentos de la historia. Los que descubras quedan en
                Explorar, en tu colección.
              </p>
            </>
          ) : (
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
              {found.length === 1 ? "Nuevo descubrimiento" : "Nuevos descubrimientos"}
            </h3>
          )}
          <div
            className={`grid gap-3 ${found.length === 1 ? "grid-cols-1" : found.length === 2 || found.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {found.map((item, i) => (
              <Discovery
                key={collectibleKey(item.kind, item.id)}
                item={item}
                delay={i * 0.25}
                wide={found.length === 1}
                onOpen={() => go(collectionPath(item.kind, item))}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-7 flex items-center justify-end gap-3">
        {found.length > 0 && (
          <button
            onClick={() => go(collectionPath(found[0].kind))}
            className="mr-auto text-sm font-semibold text-accent hover:underline"
          >
            Ver colección
          </button>
        )}
        <button onClick={onNext} className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink">
          Seguir
        </button>
      </div>
    </>
  );
}

function Discovery({
  item,
  delay,
  wide,
  onOpen,
}: {
  item: Collectible;
  delay: number;
  wide: boolean;
  onOpen: () => void;
}) {
  const image = collectibleImage(collectibleKey(item.kind, item.id));
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left transition hover:border-accent"
      title="Ver la ficha"
    >
      <span className={`relative block shrink-0 overflow-hidden bg-surface-2 ${wide ? "h-44" : "h-28"}`}>
        {image ? (
          <img
            src={image.url}
            alt={image.title}
            className="ficha-reveal h-full w-full object-cover"
            style={{ animationDelay: `${delay}s` }}
            draggable={false}
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Medallion icon={COLLECTIBLE_ICON[item.icon]} unlocked size={56} />
          </span>
        )}
      </span>
      <span className="block px-3 py-2.5">
        <span className="block text-[11px] font-semibold tracking-wide text-accent uppercase">
          {KIND_LABEL[item.kind].one}
        </span>
        <span className="block leading-snug font-semibold group-hover:text-accent">{item.name}</span>
      </span>
    </button>
  );
}

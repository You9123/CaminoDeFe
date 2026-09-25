import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { CATALOG } from "../content/collectibles";
import { chapterLabel } from "../content/bookNames";
import {
  collectibleKey,
  KIND_LABEL,
  kindTotals,
  passagesProgress,
  type Collectible,
  type CollectibleKind,
} from "../domain/collectibles";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { AchievementsHeader } from "../components/AchievementsTabs";
import { CollectibleSheet } from "../components/CollectibleSheet";
import { COLLECTIBLE_ICON, KIND_ICON } from "../components/collectibleIcons";
import { Medallion } from "../components/Medallion";

const KINDS: CollectibleKind[] = ["character", "place", "event"];
const KIND_PARAM: Record<CollectibleKind, string> = { character: "personajes", place: "lugares", event: "eventos" };

/**
 * Coleccionables: personajes, lugares y eventos (Documento Maestro §2.19).
 * Todas las fichas se ven desde el principio; se "desbloquean" (y toman color) al leer
 * uno de sus capítulos clave. La Biblia nunca se bloquea: esto es solo el álbum.
 */
export function CollectiblesScreen() {
  const totalXp = useProgress((s) => s.totalXp);
  const [params, setParams] = useSearchParams();
  const kind = KINDS.find((k) => KIND_PARAM[k] === params.get("tipo")) ?? "character";
  const openKey = params.get("ficha");
  const open = openKey ? CATALOG.byKey.get(openKey) : undefined;

  const data = useAsync(getReadChapterMap, `${totalXp}`);
  const read = useMemo(() => data.data?.read ?? new Set<string>(), [data.data]);
  const totals = useMemo(() => kindTotals(CATALOG.collectibles, read), [read]);
  const items = CATALOG.collectibles.filter((c) => c.kind === kind);

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const unlockedAll = totals.character.unlocked + totals.place.unlocked + totals.event.unlocked;

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <AchievementsHeader subtitle="Personajes, lugares y eventos que vas conociendo al leer." />

      <div className="animate-rise mb-7 grid grid-cols-3 gap-3" role="tablist" aria-label="Tipo de ficha">
        {KINDS.map((k) => {
          const Icon = KIND_ICON[k];
          const t = totals[k];
          const active = k === kind;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              onClick={() => setParam("tipo", KIND_PARAM[k])}
              className={`flex items-center gap-3.5 rounded-2xl border px-5 py-4 text-left transition ${
                active ? "border-accent bg-accent-soft/50" : "border-border bg-surface hover:border-accent/60"
              }`}
            >
              <Icon size={28} className={active ? "text-accent" : "text-muted"} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{KIND_LABEL[k].many}</span>
                <span className="text-sm text-muted tabular-nums">
                  {data.loading ? " " : `${t.unlocked} de ${t.total}`}
                  {t.complete > 0 && (
                    <span className="text-gold">
                      {" "}
                      · {t.complete} {t.complete === 1 ? "completa" : "completas"}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!data.loading && unlockedAll === 0 && (
        <p className="animate-rise mb-6 rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted">
          Todavía no hay fichas desbloqueadas. Cada vez que leas un capítulo donde aparece alguien o algo de esta lista,
          su ficha toma color. Puedes empezar por cualquiera.
        </p>
      )}

      <div className="animate-rise grid grid-cols-3 gap-3">
        {items.map((c) => (
          <CollectibleCard
            key={c.id}
            item={c}
            read={read}
            loading={data.loading}
            onOpen={() => setParam("ficha", collectibleKey(c.kind, c.id))}
          />
        ))}
      </div>

      {open && (
        <CollectibleSheet
          key={openKey}
          item={open}
          onClose={() => setParam("ficha", null)}
          onOpen={(key) => setParam("ficha", key)}
        />
      )}
    </div>
  );
}

function CollectibleCard({
  item,
  read,
  loading,
  onOpen,
}: {
  item: Collectible;
  read: ReadonlySet<string>;
  loading: boolean;
  onOpen: () => void;
}) {
  const p = passagesProgress(item.passages, read);
  const on = p.unlocked && !loading;
  return (
    <button
      onClick={onOpen}
      className={`group flex gap-3.5 rounded-2xl border p-4 text-left transition hover:border-accent/70 ${
        on ? "border-border bg-surface" : "border-border/70 bg-surface/50"
      }`}
    >
      <Medallion icon={COLLECTIBLE_ICON[item.icon]} unlocked={on} gold={on && p.complete} size={52} />
      <span className="min-w-0 flex-1">
        <span className={`block leading-snug font-semibold ${on ? "" : "text-ink/75"}`}>{item.name}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.line}</span>
        {on ? (
          <span className="mt-2.5 block">
            <span className="block h-1.5 overflow-hidden rounded-full bg-border/80">
              <span
                className={`block h-full rounded-full ${p.complete ? "bg-gold" : "bg-accent/70"}`}
                style={{ width: `${(p.read / p.total) * 100}%` }}
              />
            </span>
            <span className="mt-1 block text-[11px] text-muted tabular-nums">
              {p.complete ? "Completa" : `${p.read} de ${p.total} capítulos`}
            </span>
          </span>
        ) : (
          <span className="mt-2 block text-[11px] text-muted">
            {loading ? " " : `Aparece en ${chapterLabel(p.next ?? item.passages[0])}`}
          </span>
        )}
      </span>
    </button>
  );
}

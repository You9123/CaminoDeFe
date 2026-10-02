import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { CATALOG } from "../content/collectibles";
import { hintBookInfo } from "../content/bookNames";
import {
  collectibleKey,
  collectionSummary,
  discoveryHint,
  KIND_LABEL,
  passagesProgress,
  type Collectible,
  type CollectibleKind,
} from "../domain/collectibles";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { ExploreHeader } from "../components/SectionHeader";
import { CollectibleSheet } from "../components/CollectibleSheet";
import { COLLECTIBLE_ICON, KIND_ICON } from "../components/collectibleIcons";
import { Medallion } from "../components/Medallion";
import { KIND_PARAM } from "../app/paths";
import { LockIcon } from "../components/icons";

const KINDS: CollectibleKind[] = ["character", "place", "event"];

/**
 * Coleccionables: personajes, lugares y eventos (Documento Maestro §2.19, ADR-0012).
 * Las fichas se descubren al leer uno de sus capítulos clave. Antes están cubiertas de niebla:
 * candado, "???", el tipo y en qué libro aparecen, sin nombre ni resumen.
 * La Biblia nunca se bloquea: esto es solo el álbum.
 */
export function CollectiblesScreen() {
  const totalXp = useProgress((s) => s.totalXp);
  const [params, setParams] = useSearchParams();
  const kind = KINDS.find((k) => KIND_PARAM[k] === params.get("tipo")) ?? "character";
  const openKey = params.get("ficha");
  const open = openKey ? CATALOG.byKey.get(openKey) : undefined;

  const data = useAsync(getReadChapterMap, `${totalXp}`);
  const read = useMemo(() => data.latest?.read ?? new Set<string>(), [data.latest]);
  const summary = useMemo(() => collectionSummary(CATALOG.collectibles, read), [read]);
  const totals = summary.byKind;
  const loaded = data.latest !== undefined;
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

  const unlockedAll = summary.discovered;

  return (
    <div className="mx-auto max-w-5xl px-10 py-12">
      <ExploreHeader
        subtitle="Personajes, lugares y eventos que vas descubriendo al leer."
        aside={
          loaded && (
            <p aria-live="polite">
              <span className="font-display text-2xl font-semibold text-ink">{summary.discovered}</span> de{" "}
              {summary.total}
              <br />
              descubiertos
            </p>
          )
        }
      />

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
                  {loaded ? `${t.unlocked} de ${t.total}` : " "}
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

      {loaded && unlockedAll === 0 && (
        <p className="animate-rise mb-6 rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted">
          Todavía no descubriste ninguna ficha. Cada vez que leas un capítulo donde aparece alguien o algo de esta
          colección, su ficha se despeja. Puedes empezar por cualquier libro.
        </p>
      )}

      <div className="animate-rise grid grid-cols-3 gap-3">
        {items.map((c) => (
          <CollectibleCard
            key={c.id}
            item={c}
            read={read}
            loading={!loaded}
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
  const kind = KIND_LABEL[item.kind].one;
  if (!on) {
    return (
      <button
        onClick={onOpen}
        disabled={loading}
        aria-label={loading ? undefined : `${kind} por descubrir. ${discoveryHint(item, hintBookInfo).text}`}
        className="group flex gap-3.5 rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-left transition hover:border-accent/70"
      >
        <Medallion icon={LockIcon} unlocked={false} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block leading-snug font-semibold text-muted">{loading ? " " : "???"}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{loading ? " " : kind}</span>
          <span className="mt-2 block text-[11px] text-muted">
            {loading ? " " : discoveryHint(item, hintBookInfo).text}
          </span>
        </span>
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      className="group flex gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-accent/70"
    >
      <Medallion icon={COLLECTIBLE_ICON[item.icon]} unlocked gold={p.complete} size={52} />
      <span className="min-w-0 flex-1">
        <span className="block leading-snug font-semibold">{item.name}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.line}</span>
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
      </span>
    </button>
  );
}

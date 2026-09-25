import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CATALOG } from "../content/collectibles";
import { bookName } from "../content/bookNames";
import {
  collectibleKey,
  eraProgress,
  expandPassage,
  passageLabel,
  passagesProgress,
  passageStart,
  type CardProgress,
  type Collectible,
  type Era,
} from "../domain/collectibles";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { CollectibleSheet, RelatedChip } from "../components/CollectibleSheet";
import { COLLECTIBLE_ICON } from "../components/collectibleIcons";
import { Medallion } from "../components/Medallion";
import { BookIcon, CheckIcon } from "../components/icons";

/** Ancho de cada etapa y del espacio entre los dos testamentos (px). */
const STOP_W = 124;
const GAP_W = 104;
const LABEL_H = 30;
const MEDAL = 60;
const LINE_Y = LABEL_H + MEDAL / 2;

const ERAS = CATALOG.eras;
const FIRST_NT = ERAS.findIndex((e) => e.testament === "NT");
const EVENTS = CATALOG.collectibles.filter((c) => c.kind === "event");
const TOTAL_W = ERAS.length * STOP_W + (FIRST_NT > 0 ? GAP_W : 0);

/** Centro horizontal de la etapa i, contando el espacio entre testamentos. */
const centerX = (i: number) => i * STOP_W + STOP_W / 2 + (FIRST_NT > 0 && i >= FIRST_NT ? GAP_W : 0);

/** Trazo "a mano": pequeñas ondulaciones entre dos puntos. */
function wobbly(x0: number, x1: number, y: number): string {
  const steps = Math.max(1, Math.round((x1 - x0) / 60));
  const w = (x1 - x0) / steps;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < steps; i++) {
    const dy = i % 2 === 0 ? -1.6 : 1.4;
    d += ` Q${x0 + w * i + w / 2} ${y + dy} ${x0 + w * (i + 1)} ${y}`;
  }
  return d;
}

/**
 * Línea temporal bíblica (Documento Maestro §2.17): 15 etapas, de la creación a la Iglesia.
 * Cada etapa se ilumina cuando lees alguno de sus capítulos o los de sus eventos.
 */
export function TimelineScreen() {
  const navigate = useNavigate();
  const totalXp = useProgress((s) => s.totalXp);
  const [params, setParams] = useSearchParams();
  const data = useAsync(getReadChapterMap, `${totalXp}`);
  const read = useMemo(() => data.data?.read ?? new Set<string>(), [data.data]);
  const progress = useMemo(() => ERAS.map((e) => eraProgress(e, EVENTS, read)), [read]);

  // Etapa elegida: la de la URL; si no hay, la última en la que ya leíste algo.
  const lastLit = progress.map((p, i) => (p.unlocked ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
  const paramIndex = ERAS.findIndex((e) => e.id === params.get("etapa"));
  const index = paramIndex >= 0 ? paramIndex : Math.max(0, lastLit);
  const era = ERAS[index];
  const openKey = params.get("ficha");
  const open = openKey ? CATALOG.byKey.get(openKey) : undefined;

  const setParam = (updates: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(updates)) {
          if (v === null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  const select = (i: number) => setParam({ etapa: ERAS[Math.min(Math.max(i, 0), ERAS.length - 1)].id });

  // La etapa elegida siempre queda a la vista en la franja.
  const scroller = useRef<HTMLDivElement>(null);
  const stops = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: centerX(index) - el.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (to === null || to < 0 || to >= ERAS.length) return;
    e.preventDefault();
    select(to);
    stops.current[to]?.focus();
  };
  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * STOP_W * 3, behavior: "smooth" });

  const litCount = progress.filter((p) => p.unlocked).length;
  const gapStart = FIRST_NT * STOP_W;

  return (
    <div className="mx-auto max-w-5xl px-10 py-12">
      <header className="animate-rise mb-6 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold">Línea temporal</h1>
          <p className="mt-1.5 text-muted">
            De la creación a la Iglesia. Elige una etapa para ver qué pasó, quiénes estaban y dónde leerlo.
          </p>
        </div>
        {!data.loading && (
          <p className="shrink-0 text-right text-sm text-muted tabular-nums">
            <span className="font-display text-2xl font-semibold text-ink">{litCount}</span> de {ERAS.length} etapas
            <br />
            con algo leído
          </p>
        )}
      </header>

      {/* ---------- La franja ---------- */}
      <section className="animate-rise relative rounded-3xl border border-border bg-surface">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-14 rounded-l-3xl bg-gradient-to-r from-surface to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-14 rounded-r-3xl bg-gradient-to-l from-surface to-transparent"
        />
        <ScrollButton side="left" onClick={() => scrollBy(-1)} />
        <ScrollButton side="right" onClick={() => scrollBy(1)} />
        <div ref={scroller} className="timeline-scroll overflow-x-auto px-12 pt-5 pb-4">
          <div className="relative" style={{ width: TOTAL_W }} role="tablist" aria-label="Etapas de la Biblia">
            <svg className="pointer-events-none absolute top-0 left-0" width={TOTAL_W} height={LINE_Y + 40} aria-hidden>
              <path d={wobbly(centerX(0), gapStart + 10, LINE_Y)} stroke="var(--border)" strokeWidth={3} fill="none" />
              <path
                d={wobbly(gapStart + 10, gapStart + GAP_W - 10, LINE_Y)}
                stroke="var(--border)"
                strokeWidth={3}
                strokeDasharray="2 8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={wobbly(gapStart + GAP_W - 10, centerX(ERAS.length - 1), LINE_Y)}
                stroke="var(--border)"
                strokeWidth={3}
                fill="none"
              />
              <text
                x={gapStart + GAP_W / 2}
                y={LINE_Y + 22}
                textAnchor="middle"
                className="fill-muted text-[11px] italic"
              >
                unos 400 años
              </text>
            </svg>

            <p
              className="absolute top-0 text-[11px] font-semibold tracking-wider text-muted uppercase"
              style={{ left: centerX(0) - MEDAL / 2 }}
            >
              Antiguo Testamento
            </p>
            <p
              className="absolute top-0 text-[11px] font-semibold tracking-wider text-muted uppercase"
              style={{ left: centerX(FIRST_NT) - MEDAL / 2 }}
            >
              Nuevo Testamento
            </p>

            <div className="relative flex" style={{ paddingTop: LABEL_H }}>
              {ERAS.map((e, i) => (
                <div key={e.id} className="flex" style={{ marginLeft: i === FIRST_NT ? GAP_W : 0 }}>
                  <Stop
                    era={e}
                    progress={progress[i]}
                    loading={data.loading}
                    selected={i === index}
                    onSelect={() => select(i)}
                    onKeyDown={(ev) => onKey(ev, i)}
                    buttonRef={(el) => {
                      stops.current[i] = el;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <p className="mt-2 px-2 text-xs text-muted">
        Las fechas son aproximadas y algunas se discuten entre estudiosos. Las etapas no están a escala.
      </p>

      {/* ---------- La etapa elegida ---------- */}
      <EraDetail
        key={era.id}
        era={era}
        index={index}
        progress={progress[index]}
        read={read}
        loading={data.loading}
        onOpen={(key) => setParam({ ficha: key })}
        onRead={(ref) => {
          const s = passageStart(ref);
          if (s) navigate(`/biblia/${s.code}/${s.chapter}`);
        }}
        onSelect={select}
      />

      {open && (
        <CollectibleSheet
          key={openKey}
          item={open}
          onClose={() => setParam({ ficha: null })}
          onOpen={(key) => setParam({ ficha: key })}
        />
      )}
    </div>
  );
}

function ScrollButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      className={`absolute z-10 rounded-full border border-border bg-surface p-1.5 text-muted shadow-sm hover:border-accent hover:text-accent ${
        side === "left" ? "left-2" : "right-2"
      }`}
      style={{ top: 20 + LINE_Y - 15 }}
      aria-label={side === "left" ? "Etapas anteriores" : "Etapas siguientes"}
    >
      <Icon size={18} />
    </button>
  );
}

function Stop({
  era,
  progress: p,
  loading,
  selected,
  onSelect,
  onKeyDown,
  buttonRef,
}: {
  era: Era;
  progress: CardProgress;
  loading: boolean;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const lit = p.unlocked && !loading;
  return (
    <button
      ref={buttonRef}
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className="group flex flex-col items-center rounded-2xl px-1.5 pb-2 text-center outline-none focus-visible:bg-surface-2"
      style={{ width: STOP_W }}
      title={`${era.title} · ${era.when}`}
    >
      <span
        className={`rounded-full bg-surface p-1 transition ${
          selected ? "ring-2 ring-accent" : "ring-0 group-hover:ring-2 group-hover:ring-accent/40"
        }`}
      >
        <Medallion icon={COLLECTIBLE_ICON[era.icon]} unlocked={lit} gold={lit && p.complete} size={MEDAL - 8} />
      </span>
      <span
        className={`mt-2 font-display text-[15px] leading-tight font-semibold ${selected ? "text-accent" : lit ? "" : "text-ink/70"}`}
      >
        {era.title}
      </span>
      <span className="mt-0.5 text-[11px] leading-tight text-muted">{era.when}</span>
      <span className="mt-1.5 h-1 w-12 overflow-hidden rounded-full bg-border/70" aria-hidden>
        <span
          className={`block h-full rounded-full ${p.complete ? "bg-gold" : "bg-accent/70"}`}
          style={{ width: loading ? 0 : `${(p.read / p.total) * 100}%` }}
        />
      </span>
    </button>
  );
}

function EraDetail({
  era,
  index,
  progress: p,
  read,
  loading,
  onOpen,
  onRead,
  onSelect,
}: {
  era: Era;
  index: number;
  progress: CardProgress;
  read: ReadonlySet<string>;
  loading: boolean;
  onOpen: (key: string) => void;
  onRead: (ref: string) => void;
  onSelect: (i: number) => void;
}) {
  const events = EVENTS.filter((e) => e.era === era.id);
  const people = era.characters.map((id) => CATALOG.byKey.get(collectibleKey("character", id))!);
  const places = era.places.map((id) => CATALOG.byKey.get(collectibleKey("place", id))!);
  const prev = ERAS[index - 1];
  const next = ERAS[index + 1];

  return (
    <section className="animate-rise mt-8 rounded-3xl border border-border bg-surface px-8 py-7">
      <div className="grid grid-cols-[1fr_16rem] gap-10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent">
            Etapa {index + 1} de {ERAS.length} · {era.when}
          </p>
          <h2 className="mt-0.5 font-display text-3xl font-semibold">{era.title}</h2>
          <p className="mt-3 leading-relaxed">{era.summary}</p>

          <div className="mt-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full ${p.complete ? "bg-gold" : "bg-accent"}`}
                style={{ width: loading ? 0 : `${(p.read / p.total) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[13px] text-muted tabular-nums">
              {loading
                ? " "
                : p.complete
                  ? `Leíste los ${p.total} capítulos de esta etapa.`
                  : p.read === 0
                    ? `Son ${p.total} capítulos clave. Empieza por el que quieras.`
                    : `Llevas ${p.read} de ${p.total} capítulos clave de esta etapa.`}
            </p>
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Para leer</h3>
          <div className="flex flex-wrap gap-2">
            {era.passages.map((ref) => {
              const done = expandPassage(ref).every((c) => read.has(c));
              return (
                <button
                  key={ref}
                  onClick={() => onRead(ref)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition ${
                    done
                      ? "border-accent/40 bg-accent-soft/60 hover:border-accent"
                      : "border-border text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {done ? <CheckIcon size={14} className="text-accent" /> : <BookIcon size={15} duo={false} />}
                  {passageLabel(ref, bookName)}
                </button>
              );
            })}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Qué pasó</h3>
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <EventRow key={ev.id} item={ev} read={read} loading={loading} onOpen={onOpen} />
            ))}
          </div>
        </div>

        <aside className="min-w-0">
          {people.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Quiénes estaban</h3>
              <div className="flex flex-wrap gap-2">
                {people.map((c) => (
                  <RelatedChip key={c.id} item={c} read={read} onOpen={onOpen} />
                ))}
              </div>
            </>
          )}
          {places.length > 0 && (
            <>
              <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Dónde</h3>
              <div className="flex flex-wrap gap-2">
                {places.map((c) => (
                  <RelatedChip key={c.id} item={c} read={read} onOpen={onOpen} />
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <div className="mt-7 flex justify-between border-t border-border pt-4 text-sm">
        {prev ? (
          <button
            onClick={() => onSelect(index - 1)}
            className="inline-flex items-center gap-1 text-muted hover:text-accent"
          >
            <ChevronLeft size={16} /> {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button
            onClick={() => onSelect(index + 1)}
            className="inline-flex items-center gap-1 text-muted hover:text-accent"
          >
            {next.title} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

function EventRow({
  item,
  read,
  loading,
  onOpen,
}: {
  item: Collectible;
  read: ReadonlySet<string>;
  loading: boolean;
  onOpen: (key: string) => void;
}) {
  const p = passagesProgress(item.passages, read);
  const on = p.unlocked && !loading;
  return (
    <button
      onClick={() => onOpen(collectibleKey(item.kind, item.id))}
      className="flex items-center gap-3.5 rounded-2xl border border-border px-3 py-2.5 text-left transition hover:border-accent/70"
    >
      <Medallion icon={COLLECTIBLE_ICON[item.icon]} unlocked={on} gold={on && p.complete} size={40} />
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold leading-snug ${on ? "" : "text-ink/75"}`}>{item.name}</span>
        <span className="block truncate text-[13px] text-muted">{item.summary}</span>
      </span>
      <span className="shrink-0 text-xs text-muted tabular-nums">
        {loading ? "" : p.complete ? "Completo" : `${p.read}/${p.total}`}
      </span>
    </button>
  );
}

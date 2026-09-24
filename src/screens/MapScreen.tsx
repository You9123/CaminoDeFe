import { useMemo, useState, type ComponentType, type KeyboardEvent } from "react";
import booksMeta from "../../content/books_meta.json";
import {
  buildMap,
  decorations,
  MAP,
  MAP_HEIGHT,
  PATH_LENGTH,
  roadPath,
  zoneGlow,
  type Decoration,
} from "../domain/mapLayout";
import { zoneProgress } from "../domain/stats";
import { isCosmeticActive } from "../domain/cosmetics";
import { listBooks, type Book } from "../data/bibleRepo";
import { getReadCountByBook } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";
import { BookSheet } from "../components/BookSheet";
import {
  CrossIcon,
  CrownIcon,
  DoveIcon,
  FlameIcon,
  HarpIcon,
  PeakIcon,
  SproutIcon,
  SunriseIcon,
} from "../components/icons";

type Icon = ComponentType<{ size?: number; className?: string; duo?: boolean }>;

/** Íconos de las 8 zonas (Documento Maestro §2.13), con el trazo propio de la app. */
const ZONE_ICON: Record<number, Icon> = {
  1: SproutIcon,
  2: PeakIcon,
  3: CrownIcon,
  4: HarpIcon,
  5: DoveIcon,
  6: CrossIcon,
  7: FlameIcon,
  8: SunriseIcon,
};

const NODE_R = 16;
const RING = 2 * Math.PI * NODE_R;

type Node = Book & { read: number };

export function MapScreen() {
  const totalXp = useProgress((s) => s.totalXp);
  const best = useProgress((s) => s.streak.best);
  const cosmeticsOff = useSettings((s) => s.cosmeticsOff);
  const framed = isCosmeticActive("map_frame", best, cosmeticsOff);
  const [open, setOpen] = useState<Node | null>(null);
  const [hover, setHover] = useState<Node | null>(null);

  const data = useAsync(async () => {
    const [books, readById] = await Promise.all([listBooks(), getReadCountByBook()]);
    return books.map((b) => ({ ...b, read: Math.min(readById[b.id] ?? 0, b.chapters) }));
  }, `${totalXp}`);

  const nodes = useMemo(() => data.data ?? [], [data.data]);
  const map = useMemo(() => buildMap(nodes), [nodes]);
  const zones = useMemo(() => {
    const readByCode = Object.fromEntries(nodes.map((n) => [n.code, n.read]));
    return zoneProgress(booksMeta.zones, nodes, readByCode);
  }, [nodes]);
  const d = useMemo(() => roadPath(), []);
  const decor = useMemo(() => decorations(map.zones.map((z) => z.label)), [map.zones]);

  const booksDone = nodes.filter((n) => n.read >= n.chapters).length;
  const chaptersRead = nodes.reduce((s, n) => s + n.read, 0);
  const chaptersTotal = nodes.reduce((s, n) => s + n.chapters, 0);
  const shown = hover ?? null;

  const onKey = (e: KeyboardEvent, n: Node) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(n);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-10 py-12">
      <header className="animate-rise mb-6 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold">Mapa de la Biblia</h1>
          <p className="mt-1.5 text-muted">
            Todo está abierto desde el principio. Cada zona se ilumina a medida que lees.
          </p>
        </div>
        {nodes.length > 0 && (
          <p className="shrink-0 text-right text-sm text-muted tabular-nums">
            <span className="font-display text-2xl font-semibold text-ink">{booksDone}</span> de 66 libros
            <br />
            {chaptersRead} de {chaptersTotal} capítulos
          </p>
        )}
      </header>

      <section
        className={`animate-rise relative rounded-3xl border bg-surface ${
          framed ? "border-gold/60 p-4" : "border-border p-2"
        }`}
      >
        {framed && <FrameCorners />}
        <svg
          viewBox={`0 0 ${MAP.width} ${MAP_HEIGHT}`}
          className="block h-auto w-full"
          role="group"
          aria-label="Mapa de la Biblia por zonas"
        >
          {decor.map((x, i) => (
            <DecorationMark key={i} d={x} />
          ))}

          {/* Zonas iluminadas: una franja suave bajo el camino, más intensa cuanto más se ha leído. */}
          {map.zones.map((z) => {
            const zp = zones.find((x) => x.zone === z.zone);
            const glow = zp ? zoneGlow(zp.read, zp.total) : 0;
            if (glow === 0) return null;
            return (
              <path
                key={z.zone}
                d={d}
                pathLength={PATH_LENGTH}
                fill="none"
                stroke="var(--accent-soft)"
                strokeWidth={46}
                strokeLinecap="round"
                strokeDasharray={`0 ${z.from} ${z.to - z.from} ${PATH_LENGTH}`}
                opacity={glow}
              />
            );
          })}

          {/* El camino: un borde, el relleno y una línea central punteada. */}
          <path d={d} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
          <path d={d} fill="none" stroke="var(--surface-2)" strokeWidth={10} strokeLinecap="round" />
          <path
            d={d}
            fill="none"
            stroke="var(--muted)"
            strokeOpacity={0.35}
            strokeWidth={1.4}
            strokeDasharray="5 9"
            strokeLinecap="round"
          />

          {/* Nombres de las zonas */}
          {map.zones.map((z) => {
            const meta = booksMeta.zones.find((x) => x.id === z.zone);
            const zp = zones.find((x) => x.zone === z.zone);
            const lit = !!zp && zp.read > 0;
            const Icon = ZONE_ICON[z.zone];
            return (
              <g key={z.zone} transform={`translate(${z.label.x} ${z.label.y})`}>
                <g transform="translate(-11 -22)" className={lit ? "text-accent" : "text-muted"}>
                  <Icon size={22} duo={lit} />
                </g>
                <text
                  y={14}
                  textAnchor="middle"
                  className={`font-display text-[15px] font-semibold ${lit ? "fill-ink" : "fill-muted"}`}
                >
                  {meta?.name}
                </text>
              </g>
            );
          })}

          {/* Libros */}
          {map.books.map((b) => {
            const done = b.read >= b.chapters;
            const frac = b.read / b.chapters;
            return (
              <g
                key={b.code}
                transform={`translate(${b.point.x} ${b.point.y})`}
                className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-ink"
                tabIndex={0}
                role="button"
                aria-label={`${b.name}: ${b.read} de ${b.chapters} capítulos`}
                onClick={() => setOpen(b)}
                onKeyDown={(e) => onKey(e, b)}
                onMouseEnter={() => setHover(b)}
                onMouseLeave={() => setHover(null)}
              >
                <circle
                  r={NODE_R + 6}
                  fill="transparent"
                  stroke={hover?.code === b.code ? "var(--accent)" : "transparent"}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle
                  r={NODE_R}
                  fill={done ? "var(--accent)" : "var(--surface)"}
                  stroke={done ? "var(--accent)" : "var(--border)"}
                  strokeWidth={2}
                />
                {!done && frac > 0 && (
                  <circle
                    r={NODE_R}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(frac * RING, 3)} ${RING}`}
                    transform="rotate(-90)"
                  />
                )}
                <text
                  y={3.8}
                  textAnchor="middle"
                  className={`pointer-events-none text-[10.5px] font-semibold ${
                    done ? "fill-accent-ink" : frac > 0 ? "fill-ink" : "fill-muted"
                  }`}
                >
                  {b.abbr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Lectura del libro bajo el mouse, sin tapar el mapa */}
        <div className="flex items-center justify-between gap-4 px-4 pt-1 pb-3 text-sm text-muted">
          <p aria-live="polite" className="min-h-5">
            {shown ? (
              <>
                <span className="font-semibold text-ink">{shown.name}</span> · {shown.read} de {shown.chapters}{" "}
                {shown.chapters === 1 ? "capítulo" : "capítulos"}
              </>
            ) : (
              "Toca un libro para ver de qué trata y seguir leyendo."
            )}
          </p>
          <Legend />
        </div>
      </section>

      {open && <BookSheet book={open} read={open.read} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Adornos del paisaje: muy suaves para no competir con los libros. */
function DecorationMark({ d }: { d: Decoration }) {
  const common = { stroke: "var(--muted)", strokeWidth: 1.4, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g transform={`translate(${d.x} ${d.y}) scale(1.25)`} opacity={0.45} aria-hidden>
      {d.kind === "hill" && (
        <>
          <path d="M-30 8c7-14 16-18 26-9 6-8 16-6 26 9" {...common} />
          <path d="M-14 1c2-2 4-3 6-3" {...common} opacity={0.6} />
        </>
      )}
      {d.kind === "tree" && (
        <>
          <path
            d="M0-16c6.5-.2 10 4.3 9.6 9.2-.4 4.6-4.4 7.6-9.6 7.5-5.3.1-9.4-3-9.6-7.6C-9.8-12 -6.3-15.9 0-16z"
            fill="var(--success-soft)"
            stroke="var(--muted)"
            strokeWidth={1.4}
          />
          <path d="M0 0v10M-6 10.5c4 .3 8 .3 12 0" {...common} />
        </>
      )}
      {d.kind === "grass" && <path d="M-8 6c1-4 1-7 0-10M-2 6c1.5-5 1-9-.5-12M4 6c1-3 2.5-5 4.5-7" {...common} />}
    </g>
  );
}

function Legend() {
  const dot = (fill: string, stroke: string, ring = false) => (
    <svg width="16" height="16" viewBox="-9 -9 18 18" aria-hidden>
      <circle r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {ring && (
        <circle
          r="7"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="18 44"
          transform="rotate(-90)"
        />
      )}
    </svg>
  );
  return (
    <div className="flex shrink-0 items-center gap-4 text-xs">
      <span className="flex items-center gap-1.5">{dot("var(--surface)", "var(--border)")} Sin empezar</span>
      <span className="flex items-center gap-1.5">{dot("var(--surface)", "var(--border)", true)} En camino</span>
      <span className="flex items-center gap-1.5">{dot("var(--accent)", "var(--accent)")} Completo</span>
    </div>
  );
}

/** Esquinas del marco especial (recompensa por 30 días de racha). */
function FrameCorners() {
  const corner = (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden>
      <path d="M3 30C3 15 15 3 30 3" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 32c0-12 11-23 23-23" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
      <path
        d="M14.5 14.5c1.4-3.3 4.1-4.9 7.6-4.6-.6 3.5-3.2 5.2-7.6 4.6zM14.5 14.5c-3.3 1.4-4.9 4.1-4.6 7.6 3.5-.6 5.2-3.2 4.6-7.6z"
        fill="var(--gold-soft)"
        stroke="var(--gold)"
        strokeWidth="1.2"
      />
    </svg>
  );
  const pos = ["top-1 left-1", "top-1 right-1 rotate-90", "right-1 bottom-1 rotate-180", "bottom-1 left-1 -rotate-90"];
  return (
    <>
      <span className="pointer-events-none absolute inset-2 rounded-[20px] border border-dashed border-gold/45" />
      {pos.map((p) => (
        <span key={p} className={`pointer-events-none absolute ${p}`}>
          {corner}
        </span>
      ))}
    </>
  );
}

import { useState, type ComponentType, type ReactNode } from "react";
import booksMeta from "../../content/books_meta.json";
import {
  formatDuration,
  heatmap,
  heatmapMonths,
  totals,
  weeklySeries,
  zoneProgress,
  type HeatCell,
  type WeekPoint,
} from "../domain/stats";
import { formatDayLong, gameDay } from "../domain/day";
import { emotionDistribution, type EmotionCount } from "../domain/emotions";
import { getEmotionLog } from "../data/emotionsRepo";
import { EMOTION_BY_ID } from "../content/emotions";
import { EMOTION_ICON } from "../components/emotionIcons";
import { getDayTypeRows, getVersesReadCount } from "../data/statsRepo";
import { getReadCountByBook } from "../data/progressRepo";
import { listBooks } from "../data/bibleRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import {
  BookIcon,
  CandleIcon,
  FlameIcon,
  HourglassIcon,
  MedalIcon,
  QuillIcon,
  ScrollIcon,
  SparkIcon,
} from "../components/icons";

const HEAT_WEEKS = 39;
const EMOTION_DAYS = 30;
const BAR_WEEKS = 12;

export function StatsScreen() {
  const { streak, chaptersRead, totalXp } = useProgress();
  const today = gameDay();

  const data = useAsync(async () => {
    const [rows, verses, books, readById, emotionLog] = await Promise.all([
      getDayTypeRows(),
      getVersesReadCount(),
      listBooks(),
      getReadCountByBook(),
      getEmotionLog(),
    ]);
    const readByCode = Object.fromEntries(books.map((b) => [b.code, readById[b.id] ?? 0]));
    return {
      totals: totals(rows),
      verses,
      heat: heatmap(rows, today, HEAT_WEEKS),
      weeks: weeklySeries(rows, today, BAR_WEEKS),
      zones: zoneProgress(booksMeta.zones, books, readByCode),
      emotions: emotionDistribution(emotionLog, today, EMOTION_DAYS),
    };
  }, `${today}-${totalXp}`);

  const d = data.data;

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <header className="animate-rise mb-8">
        <h1 className="font-display text-4xl font-semibold">Mi camino</h1>
        <p className="mt-1.5 text-muted">Lo que llevas andado, en números.</p>
      </header>

      <section className="animate-rise mb-8 grid grid-cols-4 gap-3">
        <Tile icon={FlameIcon} label="Racha actual" value={streak.current} />
        <Tile icon={MedalIcon} label="Récord" value={streak.best} />
        <Tile icon={BookIcon} label="Capítulos" value={chaptersRead} />
        <Tile icon={ScrollIcon} label="Versículos" value={d?.verses} />
        <Tile icon={CandleIcon} label="Oraciones" value={d?.totals.prayers} />
        <Tile icon={QuillIcon} label="Reflexiones" value={d?.totals.reflections} />
        <Tile icon={HourglassIcon} label="Tiempo total" value={d ? formatDuration(d.totals.seconds) : undefined} />
        <Tile icon={SparkIcon} label="XP total" value={totalXp.toLocaleString("es")} />
      </section>

      <section className="animate-rise mb-8 rounded-3xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Los últimos nueve meses</h2>
          {d && (
            <p className="text-sm text-muted">
              {d.totals.activeDays} {d.totals.activeDays === 1 ? "día" : "días"} con actividad en total
            </p>
          )}
        </div>
        {d ? <Heatmap grid={d.heat} today={today} /> : <Placeholder h={150} />}
      </section>

      <section className="animate-rise mb-8 grid grid-cols-2 gap-4">
        <ChartCard title="Capítulos por semana">
          {d ? (
            <Bars points={d.weeks} value={(p) => p.chapters} unit={(n) => (n === 1 ? "capítulo" : "capítulos")} />
          ) : (
            <Placeholder h={170} />
          )}
        </ChartCard>
        <ChartCard title="Minutos por semana" hint="Lectura de capítulos y momentos de oración">
          {d ? <Bars points={d.weeks} value={(p) => p.minutes} unit={() => "min"} /> : <Placeholder h={170} />}
        </ChartCard>
      </section>

      {d && <EmotionsSection data={d.emotions} />}

      <section className="animate-rise rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">Por zonas de la Biblia</h2>
        {d ? (
          <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
            {d.zones.map((z) => {
              const pct = z.total ? (z.read / z.total) * 100 : 0;
              return (
                <li key={z.zone}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{z.name}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {z.read} / {z.total} cap. · {z.booksDone} de {z.books} {z.books === 1 ? "libro" : "libros"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct > 0 ? Math.max(pct, 1.5) : 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Placeholder h={160} />
        )}
      </section>
    </div>
  );
}

function Tile(props: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string | undefined;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[13px] leading-tight text-muted">
        <Icon size={17} className="shrink-0 text-accent" /> {props.label}
      </p>
      <p className="mt-1.5 font-display text-[1.7rem] leading-tight font-semibold tabular-nums">
        {props.value ?? <span className="text-muted/50">·</span>}
      </p>
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted">{hint ?? "Últimas 12 semanas"}</p>
      {children}
    </div>
  );
}

function Placeholder({ h }: { h: number }) {
  return <div className="animate-pulse rounded-xl bg-surface-2/60" style={{ height: h }} />;
}

// ---------- Heatmap ----------

/** Un solo tono (el acento), de claro a intenso según la cantidad de actividades. */
const HEAT_BG = [
  "var(--surface-2)",
  "color-mix(in oklab, var(--accent) 24%, var(--surface))",
  "color-mix(in oklab, var(--accent) 48%, var(--surface))",
  "color-mix(in oklab, var(--accent) 74%, var(--surface))",
  "var(--accent)",
];
const DAY_ROWS = ["L", "", "M", "", "V", "", "D"];
const CELL = 15;
const GAP = 3;

function activitiesLabel(n: number) {
  if (n === 0) return "sin actividad";
  return n === 1 ? "1 actividad" : `${n} actividades`;
}

function Heatmap({ grid, today }: { grid: HeatCell[][]; today: string }) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  const months = heatmapMonths(grid);
  const readout = hover ?? grid.flat().find((c) => c.day === today) ?? null;

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col pt-[18px] text-[10px] text-muted" style={{ gap: GAP }}>
          {DAY_ROWS.map((l, i) => (
            <span key={i} className="leading-none" style={{ height: CELL, lineHeight: `${CELL}px` }}>
              {l}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="relative h-[18px] text-[11px] text-muted">
            {months.map((m) => (
              <span key={m.week} className="absolute top-0 capitalize" style={{ left: m.week * (CELL + GAP) }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: GAP }} onMouseLeave={() => setHover(null)}>
            {grid.map((week) => (
              <div key={week[0].day} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((c) => (
                  <span
                    key={c.day}
                    onMouseEnter={() => !c.future && setHover(c)}
                    aria-label={c.future ? undefined : `${formatDayLong(c.day, today)}: ${activitiesLabel(c.count)}`}
                    className={`block rounded-[4px] ${c.day === today ? "ring-2 ring-ink/60 ring-offset-1 ring-offset-surface" : ""} ${
                      hover?.day === c.day ? "outline-2 outline-offset-1 outline-ink" : ""
                    }`}
                    style={{
                      width: CELL,
                      height: CELL,
                      background: c.future ? "transparent" : HEAT_BG[c.level],
                      border: c.future ? "1px dashed var(--border)" : undefined,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-xs text-muted">
        <p className="min-h-4" aria-live="polite">
          {readout && (
            <>
              <span className="font-semibold text-ink">{formatDayLong(readout.day, today)}</span> ·{" "}
              {activitiesLabel(readout.count)}
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          Menos
          {HEAT_BG.map((bg, i) => (
            <span key={i} className="inline-block h-3 w-3 rounded-[3px]" style={{ background: bg }} />
          ))}
          Más
        </div>
      </div>
    </div>
  );
}

// ---------- Barras por semana ----------

const BAR_H = 130;

function Bars({
  points,
  value,
  unit,
}: {
  points: WeekPoint[];
  value: (p: WeekPoint) => number;
  unit: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const values = points.map(value);
  const max = Math.max(...values, 1);
  const last = points.length - 1;
  const shown = hover ?? last;

  return (
    <div>
      <p className="mb-2 text-xs text-muted" aria-live="polite">
        <span className="font-semibold text-ink tabular-nums">
          {values[shown]} {unit(values[shown])}
        </span>{" "}
        · {shown === last ? "esta semana" : `semana del ${points[shown].label}`}
      </p>
      <div className="relative" style={{ height: BAR_H }} onMouseLeave={() => setHover(null)}>
        {/* Línea guía del máximo, muy tenue */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-muted tabular-nums">{max}</span>
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-border">
          {points.map((p, i) => {
            const h = values[i] > 0 ? Math.max((values[i] / max) * (BAR_H - 6), 4) : 0;
            return (
              <div
                key={p.weekStart}
                className="flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                aria-label={`Semana del ${p.label}: ${values[i]} ${unit(values[i])}`}
              >
                <div
                  className={`w-[62%] rounded-t-[4px] transition-colors ${i === shown ? "bg-accent" : "bg-accent/45"}`}
                  style={{ height: h }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>{points[0].label}</span>
        <span>esta semana</span>
      </div>
    </div>
  );
}

// ---------- Emociones ----------

/** Cómo te has sentido: una barra por emoción (todas en el mismo tono; el nombre y el ícono la identifican). */
function EmotionsSection({ data }: { data: { counts: EmotionCount[]; total: number } }) {
  const max = Math.max(...data.counts.map((c) => c.count), 1);
  return (
    <section className="animate-rise mb-8 rounded-3xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold">Cómo te has sentido</h2>
        <p className="text-sm text-muted">
          Últimos {EMOTION_DAYS} días · {data.total} {data.total === 1 ? "día registrado" : "días registrados"}
        </p>
      </div>
      {data.total === 0 ? (
        <p className="text-sm text-muted">
          Todavía no hay nada aquí. En la pantalla Hoy puedes contar cómo te sientes, si quieres.
        </p>
      ) : (
        <ul className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2.5">
          {data.counts.map((c) => {
            const Icon = EMOTION_ICON[c.id];
            return (
              <li key={c.id} className="contents">
                <span className="flex items-center gap-2 text-sm">
                  <Icon size={20} className="text-accent" />
                  {EMOTION_BY_ID.get(c.id)?.label}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${c.count ? Math.max((c.count / max) * 100, 3) : 0}%` }}
                  />
                </span>
                <span className="w-14 text-right text-sm text-muted tabular-nums">
                  {c.count} {c.count === 1 ? "día" : "días"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import type { ComponentType, ReactNode } from "react";
import { NavLink } from "react-router";
import { PATHS } from "../app/paths";
import {
  BookIcon,
  BookmarkIcon,
  ChartIcon,
  CompassIcon,
  LaurelIcon,
  MapIcon,
  PersonIcon,
  SearchIcon,
  TimelineIcon,
} from "./icons";

export type SectionTab = { to: string; label: string; icon: ComponentType<{ size?: number }>; end: boolean };

/**
 * Encabezado de una sección con pestañas (Biblia, Explorar, Mi camino): título, una línea que
 * explica la pestaña, un dato opcional a la derecha y las pestañas.
 */
export function SectionHeader({
  title,
  subtitle,
  tabs,
  aside,
}: {
  title: string;
  subtitle: string;
  tabs: SectionTab[];
  aside?: ReactNode;
}) {
  return (
    <header className="animate-rise mb-8">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-muted">{subtitle}</p>
        </div>
        {aside && <div className="shrink-0 text-right text-sm text-muted tabular-nums">{aside}</div>}
      </div>
      <nav className="flex gap-1 border-b border-border" aria-label={title}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[15px] transition-colors ${
                isActive ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-ink"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

const BIBLE_TABS: SectionTab[] = [
  { to: PATHS.bible, label: "Libros", icon: BookIcon, end: true },
  { to: `${PATHS.bible}/buscar`, label: "Buscar", icon: SearchIcon, end: false },
  { to: `${PATHS.bible}/favoritos`, label: "Favoritos", icon: BookmarkIcon, end: false },
];

const EXPLORE_TABS: SectionTab[] = [
  { to: PATHS.books, label: "Libros", icon: MapIcon, end: true },
  { to: PATHS.history, label: "Historia", icon: TimelineIcon, end: false },
  { to: PATHS.collection, label: "Colección", icon: PersonIcon, end: false },
];

const JOURNEY_TABS: SectionTab[] = [
  { to: PATHS.missions, label: "Misiones", icon: CompassIcon, end: true },
  { to: PATHS.achievements, label: "Logros", icon: LaurelIcon, end: false },
  { to: PATHS.stats, label: "Estadísticas", icon: ChartIcon, end: false },
];

type HeaderProps = { subtitle: string; aside?: ReactNode };

/** Biblia: Libros / Buscar / Favoritos. */
export const BibleHeader = (p: HeaderProps) => <SectionHeader title="La Biblia" tabs={BIBLE_TABS} {...p} />;

/** Explorar: Libros (el mapa) / Historia (la línea temporal) / Colección. */
export const ExploreHeader = (p: HeaderProps) => <SectionHeader title="Explorar" tabs={EXPLORE_TABS} {...p} />;

/** Mi camino: Misiones / Logros / Estadísticas. */
export const JourneyHeader = (p: HeaderProps) => <SectionHeader title="Mi camino" tabs={JOURNEY_TABS} {...p} />;

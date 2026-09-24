import { NavLink, Outlet, useLocation } from "react-router";
import { useEffect, useRef, type ComponentType } from "react";
import { XpBar } from "../components/XpBar";
import { Toaster } from "../components/Toaster";
import {
  BookIcon,
  ChartIcon,
  CompassIcon,
  FlameIcon,
  JournalIcon,
  LaurelIcon,
  LogoMark,
  MapIcon,
  PeakIcon,
  SealIcon,
  SlidersIcon,
  SunriseIcon,
} from "../components/icons";
import { RANK_ICON } from "../components/badgeIcons";
import { isCosmeticActive } from "../domain/cosmetics";
import { isDevDatabase } from "../data/db";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";
import { useDailyReminder } from "../hooks/useDailyReminder";

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }>; end?: boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Hoy", icon: SunriseIcon, end: true },
  { to: "/biblia", label: "Biblia", icon: BookIcon },
  { to: "/mapa", label: "Mapa", icon: MapIcon },
  { to: "/misiones", label: "Misiones", icon: CompassIcon },
  { to: "/diario", label: "Diario", icon: JournalIcon },
  { to: "/logros", label: "Logros", icon: LaurelIcon },
  { to: "/estadisticas", label: "Estadísticas", icon: ChartIcon },
];

function NavItemLink({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
          isActive ? "bg-accent-soft/70 font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
        }`
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}

export function Layout() {
  const level = useProgress((s) => s.level);
  const rank = useProgress((s) => s.rank.rank);
  const streak = useProgress((s) => s.streak.current);
  const best = useProgress((s) => s.streak.best);
  const cosmeticsOff = useSettings((s) => s.cosmeticsOff);
  const leaves = isCosmeticActive("leaves_background", best, cosmeticsOff);
  const goldSeal = isCosmeticActive("golden_seal", best, cosmeticsOff);
  const RankIcon = RANK_ICON[rank.id];
  const devDb = useAsync(isDevDatabase, "db").data;
  useDailyReminder();

  // Cada pantalla empieza arriba (antes se conservaba el scroll de la pantalla anterior).
  const main = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (leaves) root.dataset.bg = "leaves";
    else delete root.dataset.bg;
  }, [leaves]);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface/80 px-4 py-6">
        <div className="mb-9 flex items-center gap-2.5 px-2">
          <LogoMark size={30} />
          <span className="font-display text-[1.35rem] leading-none font-semibold">Camino de Fe</span>
        </div>
        {devDb && (
          <p
            className="-mt-6 mb-5 ml-2 self-start rounded-full border border-dashed border-accent/60 px-2.5 py-0.5 text-[11px] font-semibold text-accent"
            title="Estás en modo desarrollo (pnpm tauri dev): se usa user-dev.db y no se toca tu progreso real."
          >
            Datos de prueba
          </p>
        )}

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavItemLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <NavItemLink to="/ajustes" label="Ajustes" icon={SlidersIcon} />
          <div className="rounded-2xl border border-border bg-surface-2/70 p-4">
            <div className="mb-2 flex justify-between text-sm text-muted">
              <span className="inline-flex items-center gap-1.5" title="Nivel">
                <PeakIcon size={17} className="text-accent" />
                Nivel <span className="font-semibold text-ink">{level.level}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="Racha actual">
                <FlameIcon size={17} className="text-accent" />
                <span className="font-semibold text-ink">{streak}</span>
              </span>
            </div>
            <XpBar level={level} compact />
            <NavLink
              to="/logros"
              className="mt-2 flex items-center gap-1.5 text-[13px] text-muted hover:text-accent"
              title="Tu rango"
            >
              <RankIcon size={16} className="shrink-0 text-accent" />
              <span className="leading-tight">{rank.title}</span>
              {goldSeal && <SealIcon size={16} className="ml-auto shrink-0 text-gold" duo={false} />}
            </NavLink>
          </div>
        </div>
      </aside>

      <main ref={main} className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

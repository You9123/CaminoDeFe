import { NavLink, Outlet } from "react-router";
import type { ComponentType } from "react";
import { XpBar } from "../components/XpBar";
import { Toaster } from "../components/Toaster";
import { BookIcon, FlameIcon, JournalIcon, LogoMark, PeakIcon, SlidersIcon, SunriseIcon } from "../components/icons";
import { useProgress } from "../stores/progressStore";

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }>; end?: boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Hoy", icon: SunriseIcon, end: true },
  { to: "/biblia", label: "Biblia", icon: BookIcon },
  { to: "/diario", label: "Diario", icon: JournalIcon },
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
  const streak = useProgress((s) => s.streak.current);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface/80 px-4 py-6">
        <div className="mb-9 flex items-center gap-2.5 px-2">
          <LogoMark size={30} />
          <span className="font-display text-[1.35rem] leading-none font-semibold">Camino de Fe</span>
        </div>

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
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

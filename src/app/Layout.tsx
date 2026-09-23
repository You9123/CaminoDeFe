import { NavLink, Outlet } from "react-router";
import { BookOpen, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { XpBar } from "../components/XpBar";
import { useProgress } from "../stores/progressStore";

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }>; end?: boolean };

const NAV: NavItem[] = [
  { to: "/", label: "Hoy", icon: Sun, end: true },
  { to: "/biblia", label: "Biblia", icon: BookOpen },
];

export function Layout() {
  const level = useProgress((s) => s.level);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="text-2xl" aria-hidden>
            ✝️
          </span>
          <span className="text-lg font-semibold tracking-tight">Camino de Fe</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                  isActive ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-surface-2 p-4">
          <p className="mb-2 text-sm text-muted">
            ⭐ Nivel <span className="font-semibold text-ink">{level.level}</span>
          </p>
          <XpBar level={level} compact />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

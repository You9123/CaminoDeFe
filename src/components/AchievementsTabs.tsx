import { NavLink } from "react-router";
import { LaurelIcon, PersonIcon } from "./icons";

const TABS = [
  { to: "/logros", label: "Insignias", icon: LaurelIcon, end: true },
  { to: "/logros/coleccionables", label: "Coleccionables", icon: PersonIcon, end: false },
];

/** Encabezado común de Logros: insignias y coleccionables (Documento Maestro §3). */
export function AchievementsHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="animate-rise mb-8">
      <h1 className="font-display text-4xl font-semibold">Logros</h1>
      <p className="mt-1.5 mb-6 text-muted">{subtitle}</p>
      <nav className="flex gap-1 border-b border-border">
        {TABS.map(({ to, label, icon: Icon, end }) => (
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

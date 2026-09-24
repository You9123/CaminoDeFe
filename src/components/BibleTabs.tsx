import { NavLink } from "react-router";
import { BookIcon, BookmarkIcon, SearchIcon } from "./icons";

const TABS = [
  { to: "/biblia", label: "Libros", icon: BookIcon, end: true },
  { to: "/biblia/buscar", label: "Buscar", icon: SearchIcon, end: false },
  { to: "/biblia/favoritos", label: "Favoritos", icon: BookmarkIcon, end: false },
];

/** Encabezado común de la sección Biblia. */
export function BibleHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-4xl font-semibold">La Biblia</h1>
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

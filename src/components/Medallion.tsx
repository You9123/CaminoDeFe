import type { BadgeIcon } from "./badgeIcons";

/**
 * Medallón de insignia: un círculo dibujado a mano con el ícono adentro.
 * Bloqueada = trazo punteado y tinta apagada (se ve lo que falta, sin esconderlo).
 * `gold` = versión dorada (sello de 100 días).
 */
export function Medallion({
  icon: Icon,
  unlocked,
  size = 64,
  gold = false,
}: {
  icon: BadgeIcon;
  unlocked: boolean;
  size?: number;
  gold?: boolean;
}) {
  const ring = gold ? "var(--gold)" : unlocked ? "var(--accent)" : "var(--border)";
  const fill = gold ? "var(--gold-soft)" : unlocked ? "var(--accent-soft)" : "transparent";
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden className="absolute inset-0">
        <path
          d="M32 4.6c15.4-.3 27.5 11.6 27.4 27.3-.1 15.4-12.2 27.6-27.5 27.5C16.6 59.3 4.5 47.3 4.6 32 4.7 16.9 16.8 4.9 32 4.6z"
          fill={fill}
          stroke={ring}
          strokeWidth={unlocked ? 2.2 : 1.8}
          strokeDasharray={unlocked ? undefined : "4 4"}
          strokeLinecap="round"
        />
        {unlocked && (
          <path
            d="M32 10.2c11.9-.2 21.5 9.3 21.4 21.6-.1 12-9.6 21.6-21.4 21.5"
            stroke={ring}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity=".45"
          />
        )}
      </svg>
      <Icon
        size={Math.round(size * 0.46)}
        duo={false}
        className={`relative ${gold ? "text-gold" : unlocked ? "text-accent" : "text-muted/60"}`}
      />
    </span>
  );
}

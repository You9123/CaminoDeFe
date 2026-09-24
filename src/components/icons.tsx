import type { ReactNode, SVGProps } from "react";

/**
 * Íconos propios de Camino de Fe.
 * Trazo redondeado, un poco irregular (como dibujado a mano) y un relleno suave (.duo)
 * con el color de acento. Reemplazan a los emojis para que la app tenga identidad propia.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number; duo?: boolean };

function Svg({ size = 20, duo = true, children, className, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${duo ? "" : "[&_.duo]:fill-none"} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Logotipo: un camino que sube y termina en una cruz. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <path
        d="M7 30.5c3.2-3.7 13.6-3.3 13.4-9.1-.2-5.1-9.6-3.9-9.4-8.8.1-2.6 3.2-3.4 5-3.6"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M11 30.6c2.6-2.4 12.4-2.6 12.3-9.3"
        stroke="var(--accent-soft)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M16.1 1.6v6.6M13.2 3.9h5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SunriseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" stroke="none" d="M6.8 17.6a5.2 5.2 0 0 1 10.4 0z" />
      <path d="M6.8 17.6a5.2 5.2 0 0 1 10.4.1" />
      <path d="M3.2 17.8c5.9-.3 11.8-.2 17.6.1M7.6 20.9c2.9-.2 5.9-.2 8.8 0" />
      <path d="M12 6.3v2.4M5.6 9.1l1.6 1.6M18.4 9.2l-1.6 1.5M2.9 14.2h1.9M19.2 14.3h1.9" />
    </Svg>
  );
}

export function QuillIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" stroke="none" d="M19.8 3.4C13 3.8 8.6 8.3 7.6 15.2l1.2 1C15 15.6 19.2 10.6 19.8 3.4z" />
      <path d="M19.8 3.4C13 3.8 8.6 8.3 7.6 15.2l1.2 1C15 15.6 19.2 10.6 19.8 3.4z" />
      <path d="M4.6 20.6c3-3.5 6.4-7.4 10.3-11.5M10.9 13.5l3.1.1M13.2 10.6l2.9-.2" />
    </Svg>
  );
}

export function CandleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        stroke="none"
        d="M12 3.3c1.7 1.9 2.3 3.1 2.3 4.2a2.3 2.3 0 0 1-4.6 0c0-1.1.6-2.3 2.3-4.2z"
      />
      <path d="M12 3.3c1.7 1.9 2.3 3.1 2.3 4.2a2.3 2.3 0 0 1-4.6 0c0-1.1.6-2.3 2.3-4.2zM12 9.8v1.4" />
      <path d="M9.1 11.3c2-.2 3.9-.2 5.8 0l-.1 9.1H9.2z" />
      <path d="M6.6 20.5c3.6-.2 7.2-.2 10.8 0" />
    </Svg>
  );
}

export function SproutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        stroke="none"
        d="M12 13.2C12 9.6 9.4 7 4.8 7c0 3.9 2.8 6.2 7.2 6.2zM12 11c0-3.3 2.5-5.6 6.7-5.6 0 3.6-2.7 5.6-6.7 5.6z"
      />
      <path d="M12 13.2C12 9.6 9.4 7 4.8 7c0 3.9 2.8 6.2 7.2 6.2zM12 11c0-3.3 2.5-5.6 6.7-5.6 0 3.6-2.7 5.6-6.7 5.6z" />
      <path d="M12 20.8c.1-3.7-.1-7.3 0-10.4M6.8 20.8c3.5-.3 7-.3 10.4 0" />
    </Svg>
  );
}

export function FlameIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21.2c-4 0-6.6-2.6-6.6-6.2 0-3.4 2.3-5.2 3.4-7.7.3 1.6 1.1 2.7 2.2 3.1.3-3.4 1.7-6.2 4.1-7.4-.5 2.9.9 4.7 2.3 6.5 1.2 1.6 1.8 3.2 1.8 5.1 0 3.8-3.1 6.6-7.2 6.6z" />
      <path
        className="duo"
        d="M12 21.2c-1.7 0-2.9-1.2-2.9-2.9 0-1.8 1.4-2.6 2.2-4.3.9 1.4 3.6 2.3 3.6 4.4 0 1.7-1.2 2.8-2.9 2.8z"
      />
    </Svg>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M12 3.1 5.2 5.9c-.1 1.8-.1 3.5 0 5.3.2 4.5 3 7.9 6.8 9.6 3.9-1.6 6.7-5.1 6.8-9.6.1-1.8.1-3.5 0-5.3z"
      />
      <path d="M9.4 11.9c.9.9 1.6 1.7 2.3 2.7 1-2 2.4-3.6 3.9-4.9" />
    </Svg>
  );
}

/** Un monte con bandera: el nivel en el camino. */
export function PeakIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" d="M2.8 20.3 9.3 9.9l3.5 5.2 2.4-3.4 6 8.7c-6.1-.3-12.2-.3-18.4-.1z" />
      <path d="M9.3 9.9V3.8c1.5.3 2.8.9 4.1 1.6-1.3.8-2.6 1.3-4.1 1.6" />
    </Svg>
  );
}

export function MedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.6 9.6 6.6 3.2h3.3l2.1 4.2 2.1-4.2h3.3l-2 6.4" />
      <circle className="duo" cx="12" cy="14.6" r="5.4" />
      <circle cx="12" cy="14.6" r="2.1" />
    </Svg>
  );
}

export function BookIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" d="M3.2 5.6c3.1-.9 6.2-.5 8.8 1.5v13.3c-2.6-2-5.7-2.3-8.8-1.5z" />
      <path d="M20.8 5.6c-3.1-.9-6.2-.5-8.8 1.5v13.3c2.6-2 5.7-2.3 8.8-1.5z" />
    </Svg>
  );
}

export function JournalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M5.4 3.3c4.4-.2 8.8-.2 13.1 0 .3 5.8.3 11.6 0 17.4-4.3.2-8.7.2-13.1 0-.3-5.8-.3-11.6 0-17.4z"
      />
      <path d="M8.7 3.4v17.2M14.6 3.3v5.9l1.5-1.1 1.5 1.1V3.3" />
    </Svg>
  );
}

export function BookmarkIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="M6.8 3.4c3.5-.2 6.9-.2 10.4 0 .2 5.8.1 11.6 0 17.3L12 17.2l-5.2 3.5c-.2-5.8-.2-11.6 0-17.3z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function SparkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M12 2.8c.6 4.5 2.7 6.6 7.2 7.2-4.5.6-6.6 2.7-7.2 7.2-.6-4.5-2.7-6.6-7.2-7.2 4.5-.6 6.6-2.7 7.2-7.2z"
      />
      <path d="M18.6 16.4c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2}>
      <path d="M4.8 12.9c1.6 1.2 2.8 2.6 4 4.2 2.6-4.4 5.9-7.8 10.3-10.4" />
    </Svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.6 3.9c3.8-.1 6.6 2.6 6.6 6.4 0 3.7-2.9 6.6-6.6 6.6-3.8 0-6.7-2.8-6.6-6.6.1-3.6 3-6.3 6.6-6.4zM15.6 15.5c1.6 1.5 3.1 3 4.6 4.7" />
    </Svg>
  );
}

export function SlidersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7.1c5.3-.2 10.7-.2 16 0M4 16.9c5.3.2 10.7.2 16 0" />
      <circle className="duo" cx="15.2" cy="7.1" r="2.4" />
      <circle className="duo" cx="8.6" cy="16.9" r="2.4" />
    </Svg>
  );
}

export function PenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.8 4.6c1.2-1.1 2.6-1.1 3.6-.1s1 2.4-.1 3.6L8.4 19l-4.2 1 .9-4.3zM13.9 6.6l3.6 3.6" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.6c5-.2 10-.2 15 0M9.3 6.4V4.1h5.4v2.3M6.4 6.8c.3 4.6.6 9.1 1 13.3 3.1.2 6.1.2 9.2 0 .4-4.2.7-8.7 1-13.3" />
    </Svg>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 8.9c3.6-.2 7.3-.2 10.9 0 .2 3.7.2 7.3 0 11-3.6.2-7.3.2-10.9 0-.2-3.7-.2-7.3 0-11z" />
      <path d="M15.1 5.1c0-.5 0-.9-.1-1.2-3.6-.2-7.2-.2-10.9 0-.2 3.7-.2 7.3 0 11 .3 0 .7.1 1.1.1" />
    </Svg>
  );
}

export function HourglassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.4 3.3c3.7-.2 7.4-.2 11.2 0M6.4 20.7c3.7.2 7.4.2 11.2 0" />
      <path d="M7.6 3.5c-.2 3.6 1.5 5.9 4.4 8.5 2.9-2.6 4.6-4.9 4.4-8.5M7.6 20.5c-.2-3.6 1.5-5.9 4.4-8.5 2.9 2.6 4.6 4.9 4.4 8.5" />
      <path className="duo" d="M9 20c.3-2 1.4-3.2 3-4.4 1.6 1.2 2.7 2.4 3 4.4z" />
    </Svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M6.3 16.6c.9-1.3 1-2.8 1-4.6 0-3.1 2-5.4 4.7-5.4s4.7 2.3 4.7 5.4c0 1.8.1 3.3 1 4.6-3.8.3-7.6.3-11.4 0z"
      />
      <path d="M12 3.4v3.1M10 19.3c.5 1 1.2 1.4 2 1.4s1.5-.4 2-1.4" />
    </Svg>
  );
}

export function ArchiveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.6 4.6c5.6-.2 11.2-.2 16.8 0 .1 1.3.1 2.6 0 3.9-5.6.2-11.2.2-16.8 0-.1-1.3-.1-2.6 0-3.9z" />
      <path className="duo" d="M5 8.6c.1 3.8.2 7.5.4 10.8 4.4.2 8.8.2 13.2 0 .2-3.3.3-7 .4-10.8" />
      <path d="M9.8 12.3c1.5.1 2.9.1 4.4 0" />
    </Svg>
  );
}

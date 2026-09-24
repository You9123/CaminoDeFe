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

// ---------- V2: rangos, logros y estadísticas ----------

/** Un camino que se pierde entre los montes: el Caminante. */
export function PathIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        stroke="none"
        d="M4.8 21c1.7-3.5 6-4.4 6.1-7.4.1-1.8-1.1-2.6.3-4h1.4c.3 1.4 2.4 2 2.6 3.8.4 2.9-2 4.8-1.6 7.6z"
      />
      <path d="M4.8 21c1.7-3.5 6-4.4 6.1-7.4.1-1.8-1.1-2.6.3-4M13.6 21c-.4-2.8 2-4.7 1.6-7.6-.2-1.8-2.3-2.4-2.6-3.8" />
      <path d="M2.9 9.7c2.8-1.7 5.5-1.8 8.3-.1M12.6 9.6c2.6-1.8 5.6-2 8.5-.3M17.6 4.4c.2 1 .6 1.4 1.6 1.6-1 .2-1.4.6-1.6 1.6-.2-1-.6-1.4-1.6-1.6 1-.2 1.4-.6 1.6-1.6z" />
    </Svg>
  );
}

/** Lámpara de aceite: "lámpara es a mis pies tu palabra". El Buscador. */
export function LampIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M3.6 13.1c2.6-.3 5.8-.2 9.1.2 2.5.3 4.3-.3 5.9-1.9.9.9 1.2 2.2.6 3.6-1.2 2.6-4.4 3.6-8 3.5-3.7-.1-6.6-1.7-7.6-5.4z"
      />
      <path d="M3.6 13.1c1 3.7 3.9 5.3 7.6 5.4 3.6.1 6.8-.9 8-3.5.6-1.4.3-2.7-.6-3.6-1.6 1.6-3.4 2.2-5.9 1.9-3.3-.4-6.5-.5-9.1-.2z" />
      <path d="M9.2 18.6c-.2.8-.1 1.5.2 2.1 1.5.2 3 .2 4.5 0 .3-.6.4-1.3.2-2.1M19.2 11.9c.9-1.2 1.9-1.7 2.9-1.5" />
      <path d="M5.2 9.6c-.9-1.2-1.1-2.3-.5-3.4.3 1 .9 1.4 1.6 1.4-.1-1.4.5-2.6 1.5-3.2-.1 1.4.5 2.2 1 3 .5.9.4 2-.4 2.7" />
    </Svg>
  );
}

/** Ancla: "la cual tenemos como segura y firme ancla del alma". El Perseverante. */
export function AnchorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle className="duo" cx="12" cy="4.9" r="1.9" />
      <path d="M12 6.8c.1 4.6.1 9.3 0 14M8.2 10c2.5-.2 5.1-.2 7.6 0" />
      <path d="M4.3 13.4c.4 4.3 3.4 7.2 7.7 7.4 4.3-.2 7.3-3.1 7.7-7.4M3 14.9l1.3-1.6 1.7 1.2M21 14.9l-1.3-1.6-1.7 1.2" />
    </Svg>
  );
}

/** Paloma en vuelo con una ramita. El Siervo. */
export function DoveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M3.4 12.2c2.1-.9 4.2-.9 6.3.1 1.2-3.1 1.1-5.8-.2-8.6 3.1 1.3 5 3.8 5.7 7 1.1-.9 2.5-1.4 4-1.2l1.6-.6c-.3 1-.7 1.8-1.3 2.4.1 4.1-3.4 6.9-8.3 6.3-2.5-.3-4.5-1.3-6.1-3.2L7 13.2z"
      />
      <path d="M3.4 12.2c2.1-.9 4.2-.9 6.3.1 1.2-3.1 1.1-5.8-.2-8.6 3.1 1.3 5 3.8 5.7 7 1.1-.9 2.5-1.4 4-1.2l1.6-.6c-.3 1-.7 1.8-1.3 2.4.1 4.1-3.4 6.9-8.3 6.3-2.5-.3-4.5-1.3-6.1-3.2L7 13.2z" />
      <path d="M12.6 18.7c.3 1.1.1 2-.6 2.8M12.3 20.2c-.9-.2-1.5.1-1.9.8M17.6 11.2h.1" />
    </Svg>
  );
}

/** Rollo de pergamino. */
export function ScrollIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M6.6 5.2c3.9-.2 7.9-.2 11.8 0 .2 4.6.2 9.1 0 13.6-3.9.2-7.9.2-11.8 0-.2-4.5-.2-9 0-13.6z"
      />
      <path d="M6.6 5.2c-1.2 0-2 .7-2 1.8s.8 1.7 2 1.7M18.4 18.8c1.2 0 2-.7 2-1.8s-.8-1.7-2-1.7" />
      <path d="M6.6 5.2c-.2 4.6-.2 9.1 0 13.6 3.9.2 7.9.2 11.8 0M18.4 18.8c.2-4.5.2-9 0-13.6-3.9-.2-7.9-.2-11.8 0" />
      <path d="M9.4 9.4c2 .1 4 .1 6 0M9.4 12.2c2 .1 4 .1 6 0M9.4 15c1.2.1 2.4.1 3.6 0" />
    </Svg>
  );
}

/** Arpa (lira): los Salmos. */
export function HarpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" d="M6.5 4.1c3.9 1.1 7.8 5.4 11.6 12.5-3.9.2-7.8.2-11.7.1.4-4.3.4-8.5.1-12.6z" />
      <path d="M6.5 4.1c-.1 5.4-.1 10.8 0 16.4M6.5 4.1c3.9 1.1 7.8 5.4 11.6 12.5M5 20.6c4.7.2 9.4.2 14.1 0-.3-1.4-.6-2.8-1-4" />
      <path d="M9.2 7.1c0 3.2-.1 6.4-.1 9.6M11.9 9.6v7.2M14.6 12.4c0 1.4 0 2.9.1 4.3" />
    </Svg>
  );
}

/** Cruz sencilla. */
export function CrossIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M10.5 3.2c1-.1 2-.1 3 0 .1 1.9.1 3.9 0 5.8 2 0 4 0 6 .1.1 1 .1 2 0 3-2 .1-4 .1-6 .1.1 2.9.1 5.8 0 8.6-1 .1-2 .1-3 0-.1-2.8-.1-5.7 0-8.6-2 0-4 0-6-.1-.1-1-.1-2 0-3 2-.1 4-.1 6-.1-.1-1.9-.1-3.9 0-5.8z"
      />
      <path d="M10.5 3.2c1-.1 2-.1 3 0 .1 1.9.1 3.9 0 5.8 2 0 4 0 6 .1.1 1 .1 2 0 3-2 .1-4 .1-6 .1.1 2.9.1 5.8 0 8.6-1 .1-2 .1-3 0-.1-2.8-.1-5.7 0-8.6-2 0-4 0-6-.1-.1-1-.1-2 0-3 2-.1 4-.1 6-.1-.1-1.9-.1-3.9 0-5.8z" />
    </Svg>
  );
}

/** Ramita de olivo. */
export function OliveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.8 20.6c4-4.8 8.8-9.8 16-16.2" />
      <g className="duo">
        <path d="M0 0c1.6-1.7 4.4-1.7 6 0-1.6 1.7-4.4 1.7-6 0z" transform="translate(7.2 17.0) rotate(-100)" />
        <path d="M0 0c1.6-1.7 4.4-1.7 6 0-1.6 1.7-4.4 1.7-6 0z" transform="translate(9.5 14.4) rotate(-2)" />
        <path d="M0 0c1.6-1.7 4.4-1.7 6 0-1.6 1.7-4.4 1.7-6 0z" transform="translate(12.2 11.7) rotate(-104)" />
        <path d="M0 0c1.6-1.7 4.4-1.7 6 0-1.6 1.7-4.4 1.7-6 0z" transform="translate(14.6 9.2) rotate(-6)" />
        <path d="M0 0c1.6-1.7 4.4-1.7 6 0-1.6 1.7-4.4 1.7-6 0z" transform="translate(17.4 6.6) rotate(-48)" />
      </g>
      <circle cx="11.4" cy="17.6" r="1.5" />
      <path d="M11.6 16.1c.1-.9-.1-1.6-.6-2.2" />
    </Svg>
  );
}

/** Corona de laurel: los logros. */
export function LaurelIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.8 20.4C4.6 18.9 2.9 14.8 3.9 9.8c.3-1.5.9-2.9 1.8-4.2M15.2 20.4c4.2-1.5 5.9-5.6 4.9-10.6-.3-1.5-.9-2.9-1.8-4.2" />
      <path
        className="duo"
        d="M4.1 15.8c-1.5-.6-2.3-1.7-2.4-3.2 1.5.4 2.3 1.5 2.4 3.2zM4.1 11.5C2.8 10.6 2.3 9.4 2.6 7.9c1.3.8 1.8 2 1.5 3.6zM5.9 18.4c-.2 1.5.5 2.6 2 3.2.1-1.5-.6-2.6-2-3.2zM19.9 15.8c1.5-.6 2.3-1.7 2.4-3.2-1.5.4-2.3 1.5-2.4 3.2zM19.9 11.5c1.3-.9 1.8-2.1 1.5-3.6-1.3.8-1.8 2-1.5 3.6zM18.1 18.4c.2 1.5-.5 2.6-2 3.2-.1-1.5.6-2.6 2-3.2z"
      />
      <path d="M12 7.3c.6 1.4 1.3 2.1 2.7 2.4-1.4.3-2.1 1-2.7 2.4-.6-1.4-1.3-2.1-2.7-2.4 1.4-.3 2.1-1 2.7-2.4z" />
    </Svg>
  );
}

/** Barras dibujadas a mano: estadísticas. */
export function ChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        className="duo"
        d="M5.6 20.1c-.1-2.9-.1-5.8 0-8.7 1.1-.1 2.1-.1 3.2 0 .1 2.9.1 5.8 0 8.7M10.4 20.1c-.1-4.8-.1-9.6 0-14.4 1.1-.1 2.1-.1 3.2 0 .1 4.8.1 9.6 0 14.4M15.2 20.1c-.1-3.8-.1-7.6 0-11.4 1.1-.1 2.1-.1 3.2 0 .1 3.8.1 7.6 0 11.4"
      />
      <path d="M5.6 20.1c-.1-2.9-.1-5.8 0-8.7 1.1-.1 2.1-.1 3.2 0 .1 2.9.1 5.8 0 8.7M10.4 20.1c-.1-4.8-.1-9.6 0-14.4 1.1-.1 2.1-.1 3.2 0 .1 4.8.1 9.6 0 14.4M15.2 20.1c-.1-3.8-.1-7.6 0-11.4 1.1-.1 2.1-.1 3.2 0 .1 3.8.1 7.6 0 11.4" />
      <path d="M3.2 20.3c5.9-.2 11.7-.2 17.6 0" />
    </Svg>
  );
}

/** Sello con cintas: las insignias. */
export function SealIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.4 14.6 6.8 21l2.9-1.2 1.6 2M15.6 14.6l1.6 6.4-2.9-1.2-1.6 2" />
      <path
        className="duo"
        d="M12 2.6l1.7 1.3 2.1-.3.8 2 2 .8-.3 2.1 1.3 1.7-1.3 1.7.3 2.1-2 .8-.8 2-2.1-.3L12 17.8l-1.7-1.3-2.1.3-.8-2-2-.8.3-2.1-1.3-1.7 1.3-1.7-.3-2.1 2-.8.8-2 2.1.3z"
      />
      <circle cx="12" cy="10.2" r="3.3" />
    </Svg>
  );
}

// ---------- V2 · Sprint 2B: mapa y misiones ----------

/** Mapa plegado en tres partes, con un camino punteado. */
export function MapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" d="M9 4.6 3.4 6.5c-.2 4.6-.2 9.2 0 13.7L9 18.4l6 2 5.6-1.9c.2-4.6.2-9.1 0-13.7L15 6.6z" />
      <path d="M9 4.6 3.4 6.5c-.2 4.6-.2 9.2 0 13.7L9 18.4l6 2 5.6-1.9c.2-4.6.2-9.1 0-13.7L15 6.6zM9 4.6c.2 4.6.2 9.2 0 13.8M15 6.6c-.2 4.6-.2 9.2 0 13.8" />
    </Svg>
  );
}

/** Brújula: misiones y desafíos. */
export function CompassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.2c4.9-.1 8.8 3.8 8.8 8.7.1 4.9-3.9 8.9-8.8 8.9-4.8 0-8.8-4-8.8-8.8 0-4.8 4-8.7 8.8-8.8z" />
      <path className="duo" d="M15.6 8.3 13.4 13.4 8.4 15.6l2.2-5.1z" />
      <path d="M15.6 8.3 13.4 13.4 8.4 15.6l2.2-5.1zM12 5.4v1.2M12 17.4v1.2M5.4 12h1.2M17.4 12h1.2" />
    </Svg>
  );
}

/** Corona sencilla: la zona de los reyes. */
export function CrownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path className="duo" d="M4.2 17.6 3.4 8.1l4.6 3.7L12 5.2l4 6.6 4.6-3.7-.8 9.5c-5.2.3-10.4.3-15.6 0z" />
      <path d="M4.2 17.6 3.4 8.1l4.6 3.7L12 5.2l4 6.6 4.6-3.7-.8 9.5c-5.2.3-10.4.3-15.6 0zM4.6 20.4c4.9.2 9.9.2 14.8 0" />
    </Svg>
  );
}

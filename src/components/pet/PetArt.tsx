import type { ReactNode } from "react";
import type { AccessoryId, PetMood, PetSpecies, PetStageId } from "../../domain/pet";
import { stageGear } from "../../domain/pet";

/**
 * Dibujo de la mascota: SVG vectorial con trazo "a mano", como los íconos (ADR-0003).
 * Cada especie define su cuerpo y unos puntos de anclaje; la ropa y los accesorios
 * (morral, túnica, bufanda...) se dibujan una sola vez y se colocan en esos puntos.
 */
type Pt = { x: number; y: number };

type Anchors = {
  /** Centro del cuello (bufanda, campanita), su ancho y giro (el pez la lleva vertical). */
  neck: Pt & { w: number; rot?: number };
  /** Punto más alto de la cabeza (corona de flores). */
  headTop: Pt & { w: number };
  /** Caja del cuerpo (morral y túnica). */
  body: { x: number; y: number; w: number; h: number };
  /** Dónde va el objeto de guardiana. */
  side: Pt;
};

const INK = "var(--pet-ink)";
const SW = 2.2;

/** Contorno de nube o lana: arcos pequeños alrededor de una elipse. */
function cloudPath(cx: number, cy: number, rx: number, ry: number, bumps: number, puff = 0.62): string {
  const pts = Array.from({ length: bumps }, (_, i) => {
    const a = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i <= bumps; i++) {
    const p = pts[i % bumps];
    const prev = pts[i - 1];
    const r = (Math.hypot(p.x - prev.x, p.y - prev.y) * puff).toFixed(1);
    d += ` A${r} ${r} 0 0 1 ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d + "z";
}

// ---------- Ojos (comunes) ----------

function Eyes({
  at,
  mood,
  r = 2.6,
  gap,
  lineColor = INK,
}: {
  at: Pt;
  mood: PetMood;
  r?: number;
  gap: number;
  /** Color de los ojos cerrados o sonrientes (claro sobre una cara oscura). */
  lineColor?: string;
}) {
  const left = { x: at.x - gap / 2, y: at.y };
  const right = { x: at.x + gap / 2, y: at.y };
  if (mood === "sleeping") {
    return (
      <g stroke={lineColor} strokeWidth={1.8} strokeLinecap="round" fill="none">
        {[left, right].map((p, i) => (
          <path key={i} d={`M${p.x - r} ${p.y}q${r} ${r * 0.9} ${r * 2} 0`} />
        ))}
      </g>
    );
  }
  if (mood === "celebrating" || mood === "happy") {
    // Ojos sonrientes: arcos hacia arriba.
    return (
      <g stroke={lineColor} strokeWidth={2} strokeLinecap="round" fill="none">
        {[left, right].map((p, i) => (
          <path key={i} d={`M${p.x - r} ${p.y + 0.8}q${r} ${-r * 1.3} ${r * 2} 0`} />
        ))}
      </g>
    );
  }
  return (
    <g className="pet-blink">
      {[left, right].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={r} fill={INK} />
          <circle cx={p.x + r * 0.35} cy={p.y - r * 0.35} r={r * 0.35} fill="var(--pet-light)" />
        </g>
      ))}
    </g>
  );
}

// ---------- Especies ----------

/** `back` va detrás de la ropa (patas, cuerpo, cola) y `front` delante (cabeza, cara). */
type SpeciesArt = {
  anchors: Anchors;
  draw: (mood: PetMood, stage: PetStageId) => { back: ReactNode; front: ReactNode };
};

const SHEEP: SpeciesArt = {
  anchors: {
    neck: { x: 80, y: 71, w: 20 },
    headTop: { x: 86, y: 41, w: 18 },
    body: { x: 30, y: 52, w: 56, h: 40 },
    side: { x: 20, y: 62 },
  },
  draw: (mood) => ({
    back: (
      <>
        <g stroke="var(--pet-dark)" strokeWidth={5} strokeLinecap="round">
          <path d="M40 86v14M50 88v13M68 88v13M78 86v14" />
        </g>
        <path d={cloudPath(28, 64, 7, 6, 6)} fill="var(--pet-light)" stroke={INK} strokeWidth={SW} />
        <path d={cloudPath(57, 72, 29, 19, 13)} fill="var(--pet-light)" stroke={INK} strokeWidth={SW} />
      </>
    ),
    front: (
      <g transform="rotate(-8 86 60)">
        <ellipse
          cx={73}
          cy={52}
          rx={8}
          ry={3.8}
          fill="var(--pet-dark)"
          stroke={INK}
          strokeWidth={1.6}
          transform="rotate(-20 73 52)"
        />
        <ellipse
          cx={99}
          cy={52}
          rx={8}
          ry={3.8}
          fill="var(--pet-dark)"
          stroke={INK}
          strokeWidth={1.6}
          transform="rotate(20 99 52)"
        />
        <path
          d="M86 45c7.6-.2 12.4 5.6 12.2 13.4-.2 7.6-5.4 12.6-12.2 12.6s-12-5-12.2-12.6C73.6 50.6 78.4 45.2 86 45z"
          fill="var(--pet-dark)"
          stroke={INK}
          strokeWidth={SW}
        />
        <path d={cloudPath(86, 45, 9, 5, 7)} fill="var(--pet-light)" stroke={INK} strokeWidth={1.8} />
        {mood === "idle" && (
          <g>
            <ellipse cx={81.5} cy={58} rx={3.6} ry={3.8} fill="var(--pet-light)" />
            <ellipse cx={90.5} cy={58} rx={3.6} ry={3.8} fill="var(--pet-light)" />
          </g>
        )}
        <Eyes at={{ x: 86, y: 58.4 }} mood={mood} gap={9} r={2.1} lineColor="var(--pet-light)" />
        <path
          d="M83.4 65.2c1.6 1.4 3.6 1.4 5.2 0"
          stroke="var(--pet-light)"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    ),
  }),
};

const LION: SpeciesArt = {
  anchors: {
    neck: { x: 60, y: 73, w: 26 },
    headTop: { x: 60, y: 27, w: 26 },
    body: { x: 38, y: 68, w: 44, h: 34 },
    side: { x: 28, y: 58 },
  },
  draw: (mood, stage) => {
    const cub = stage === "bebe";
    return {
      back: (
        <>
          <path
            d="M78 96c10 2 17-4 17-13 0-6-3-10-2-15"
            fill="none"
            stroke={INK}
            strokeWidth={SW}
            strokeLinecap="round"
          />
          <path d={cloudPath(93, 64, 4.5, 5, 6)} fill="var(--pet-mane)" stroke={INK} strokeWidth={1.8} />
          <path
            d="M60 66c13 0 22 10 22 23 0 9-5 14-22 14s-22-5-22-14c0-13 9-23 22-23z"
            fill="var(--pet-tan)"
            stroke={INK}
            strokeWidth={SW}
          />
          <path
            d="M60 80c7 0 11 5 11 11"
            fill="none"
            stroke={INK}
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.35}
          />
          <ellipse cx={50} cy={102} rx={7} ry={4.4} fill="var(--pet-tan)" stroke={INK} strokeWidth={SW} />
          <ellipse cx={70} cy={102} rx={7} ry={4.4} fill="var(--pet-tan)" stroke={INK} strokeWidth={SW} />
        </>
      ),
      front: (
        <>
          <path
            d={cub ? cloudPath(60, 50, 22, 21, 12) : cloudPath(60, 50, 29, 27, 14)}
            fill="var(--pet-mane)"
            stroke={INK}
            strokeWidth={SW}
          />
          <circle cx={46} cy={36} r={6} fill="var(--pet-tan)" stroke={INK} strokeWidth={SW} />
          <circle cx={74} cy={36} r={6} fill="var(--pet-tan)" stroke={INK} strokeWidth={SW} />
          <path
            d="M60 33c10.6 0 18 7.6 18 18 0 10-7.8 17-18 17s-18-7-18-17c0-10.4 7.4-18 18-18z"
            fill="var(--pet-tan)"
            stroke={INK}
            strokeWidth={SW}
          />
          <ellipse cx={52} cy={58} rx={3.4} ry={2.2} fill="var(--pet-cheek)" />
          <ellipse cx={68} cy={58} rx={3.4} ry={2.2} fill="var(--pet-cheek)" />
          <Eyes at={{ x: 60, y: 49 }} mood={mood} gap={14} r={2.5} />
          <ellipse cx={60} cy={59.5} rx={7.5} ry={5.5} fill="var(--pet-light)" stroke={INK} strokeWidth={1.4} />
          <path d="M57 56.4h6l-3 3.2z" fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <path
            d="M60 59.6v1.6M60 61.2c-1 1.4-2.6 1.6-3.8.8M60 61.2c1 1.4 2.6 1.6 3.8.8"
            stroke={INK}
            strokeWidth={1.3}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ),
    };
  },
};

const DOVE: SpeciesArt = {
  anchors: {
    neck: { x: 78, y: 62, w: 18 },
    headTop: { x: 80, y: 33, w: 18 },
    body: { x: 34, y: 58, w: 50, h: 34 },
    side: { x: 99, y: 52 },
  },
  draw: (mood) => ({
    back: (
      <>
        <path d="M56 92v8M64 92v8M52 100h8M60 100h8" stroke="var(--pet-beak)" strokeWidth={2.2} strokeLinecap="round" />
        <path
          d="M36 70 18 62c1 6 3 10 6 13-4 1-6 3-7 6 7 2 14 1 20-2z"
          fill="var(--pet-light)"
          stroke={INK}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        <path
          d="M34 72c4-12 16-18 30-17 12 1 20 7 22 16 2 11-8 22-26 22-16 0-28-8-26-21z"
          fill="var(--pet-light)"
          stroke={INK}
          strokeWidth={SW}
        />
        <path
          d="M40 70c6-8 18-11 30-6-2 10-10 17-22 17-5 0-8-4-8-11z"
          fill="var(--pet-wing)"
          stroke={INK}
          strokeWidth={1.8}
        />
        <path
          d="M48 74c5 0 10-2 14-6M46 79c6 0 12-2 16-6"
          stroke={INK}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
          opacity={0.5}
        />
      </>
    ),
    front: (
      <>
        <path
          d="M80 34c8 0 14 6 14 14s-6 14-14 14-13-6-13-14 5-14 13-14z"
          fill="var(--pet-light)"
          stroke={INK}
          strokeWidth={SW}
        />
        <path
          d="M93 45.4 101.6 48.6 93 51.6z"
          fill="var(--pet-beak)"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <ellipse cx={86} cy={53} rx={3} ry={2} fill="var(--pet-cheek)" />
        <Eyes at={{ x: 85, y: 45 }} mood={mood} gap={0} r={2.4} />
      </>
    ),
  }),
};

const FISH: SpeciesArt = {
  anchors: {
    neck: { x: 71, y: 65, w: 34, rot: -90 },
    headTop: { x: 70, y: 43, w: 22 },
    body: { x: 36, y: 46, w: 54, h: 38 },
    side: { x: 104, y: 44 },
  },
  draw: (mood) => ({
    back: (
      <>
        <path
          d="M36 64 18 50c-2 6-2 10 1 14-3 4-3 8-1 14z"
          fill="var(--pet-fish)"
          stroke={INK}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        <path
          d="M58 46c4-8 12-11 20-9-2 4-4 7-8 9"
          fill="var(--pet-fish)"
          stroke={INK}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        <path
          d="M56 82c2 6 7 9 12 8-1-3-3-6-6-8"
          fill="var(--pet-fish)"
          stroke={INK}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        <path
          d="M34 64c4-12 16-20 32-20 16 0 28 9 30 20-2 11-14 20-30 20-16 0-28-8-32-20z"
          fill="var(--pet-fish)"
          stroke={INK}
          strokeWidth={SW}
        />
        <path d="M44 70c8 7 26 9 42 2-6 7-14 10-22 10-9 0-16-4-20-12z" fill="var(--pet-light)" opacity={0.65} />
        <path
          d="M52 56c2 2 2 5 0 7M60 54c2 3 2 7 0 10M68 55c2 2 2 5 0 7"
          stroke={INK}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
          opacity={0.4}
        />
      </>
    ),
    front: (
      <>
        <circle cx={82} cy={59} r={6} fill="var(--pet-light)" stroke={INK} strokeWidth={1.6} />
        <Eyes at={{ x: 83, y: 59 }} mood={mood} gap={0} r={2.8} />
        <ellipse cx={84} cy={69} rx={3} ry={1.8} fill="var(--pet-cheek)" />
        <path d="M92 66c1.4 1 3 1 4-.2" stroke={INK} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      </>
    ),
  }),
};

const SPECIES: Record<PetSpecies, SpeciesArt> = { oveja: SHEEP, leon: LION, paloma: DOVE, pez: FISH };

// ---------- Ropa y accesorios ----------

function Satchel({ b }: { b: Anchors["body"] }) {
  // Correa cruzada y un morral pequeño al costado.
  const x = b.x + b.w * 0.18;
  const y = b.y + b.h * 0.62;
  return (
    <g>
      <path
        d={`M${b.x + b.w * 0.78} ${b.y + 2}L${x + 6} ${y}`}
        stroke="var(--pet-leather)"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <path
        d={`M${x} ${y - 2}c4-.4 9-.4 13 0 .5 4 .4 8-.4 11-4 .6-8 .6-12 0-.9-3-1-7-.6-11z`}
        fill="var(--pet-leather)"
        stroke={INK}
        strokeWidth={1.6}
      />
      <path d={`M${x} ${y + 2.4}c4 1.4 9 1.4 13 0`} stroke={INK} strokeWidth={1.3} fill="none" />
    </g>
  );
}

function Tunic({ b }: { b: Anchors["body"] }) {
  // Un manto sobre el lomo: de los hombros a la cadera, con el borde ondulado.
  const { x, y, w, h } = b;
  const x0 = x + w * 0.16;
  const x1 = x + w * 0.88;
  const top = y + h * 0.12;
  const hem = y + h * 0.66;
  const waves = 5;
  const step = (x1 - x0) / waves;
  let d = `M${x0} ${hem}L${x0 + w * 0.02} ${top + h * 0.2}C${x0 + w * 0.15} ${top - h * 0.12} ${x1 - w * 0.15} ${top - h * 0.12} ${x1} ${top + h * 0.12}L${x1} ${hem}`;
  for (let k = 0; k < waves; k++) d += `q${-step / 2} ${h * 0.09} ${-step} 0`;
  return <path d={d + "z"} fill="var(--pet-tunic)" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />;
}

function Crook({ at }: { at: Pt }) {
  // Cayado de pastor.
  return (
    <path
      d={`M${at.x} ${at.y + 44}V${at.y}c0-7 -9-8 -10-2`}
      stroke="var(--pet-leather)"
      strokeWidth={3.4}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function OliveSprig({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(20)`}>
      <path d="M-4 0h16" stroke="var(--pet-leaf-ink)" strokeWidth={1.6} strokeLinecap="round" />
      {[
        [2, -1, -35],
        [6, 1, 30],
        [10, -1, -30],
      ].map(([lx, ly, a], i) => (
        <path
          key={i}
          d="M0 0c1.4-1.6 4-1.6 5.6 0-1.6 1.6-4.2 1.6-5.6 0z"
          transform={`translate(${lx} ${ly}) rotate(${a})`}
          fill="var(--pet-leaf)"
          stroke="var(--pet-leaf-ink)"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function Lantern({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <path d="M0-12v5" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M-5-7h10l-1 12h-8z" fill="var(--pet-glow)" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M-6 5h12" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function Scarf({ n }: { n: Anchors["neck"] }) {
  const l = n.x - n.w / 2;
  return (
    <g transform={n.rot ? `rotate(${n.rot} ${n.x} ${n.y})` : undefined}>
      <path
        d={`M${l} ${n.y - 3}c${n.w * 0.33} 3 ${n.w * 0.66} 3 ${n.w} 0l.6 5.4c-${n.w * 0.34} 3.2-${n.w * 0.66} 3.2-${n.w} 0z`}
        fill="var(--pet-scarf)"
        stroke={INK}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d={`M${l + 4} ${n.y + 1}l-2 11 5 .6 2-10`}
        fill="var(--pet-scarf)"
        stroke={INK}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Bell({ n }: { n: Anchors["neck"] }) {
  return (
    <g transform={n.rot ? `rotate(${n.rot} ${n.x} ${n.y})` : undefined}>
      <path
        d={`M${n.x - n.w / 2} ${n.y - 2}c${n.w * 0.33} 2.4 ${n.w * 0.66} 2.4 ${n.w} 0`}
        stroke="var(--pet-leather)"
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${n.x - 4} ${n.y + 7}c0-5 1.6-7 4-7s4 2 4 7z`}
        fill="var(--gold-soft)"
        stroke="var(--gold)"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <circle cx={n.x} cy={n.y + 8} r={1.2} fill="var(--gold)" />
    </g>
  );
}

function Flowers({ h }: { h: Anchors["headTop"] }) {
  const xs = [-h.w / 2 + 3, -h.w / 6, h.w / 6, h.w / 2 - 3];
  const colors = ["var(--pet-flower-a)", "var(--pet-flower-b)", "var(--pet-flower-a)", "var(--pet-flower-b)"];
  return (
    <g transform={`translate(${h.x} ${h.y})`}>
      <path
        d={`M${-h.w / 2} 3c${h.w * 0.3}-4 ${h.w * 0.7}-4 ${h.w} 0`}
        stroke="var(--pet-leaf-ink)"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
      {xs.map((x, i) => (
        <g key={i} transform={`translate(${x} ${i % 2 ? -1 : 1})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={2.4 * Math.cos((a * Math.PI) / 180)}
              cy={2.4 * Math.sin((a * Math.PI) / 180)}
              r={1.8}
              fill={colors[i]}
            />
          ))}
          <circle r={1.3} fill="var(--gold)" />
        </g>
      ))}
    </g>
  );
}

// ---------- Mascota completa ----------

export function PetArt({
  species,
  stage,
  mood,
  accessory,
  size = 140,
  title,
}: {
  species: PetSpecies;
  stage: PetStageId;
  mood: PetMood;
  accessory: AccessoryId | null;
  size?: number;
  title?: string;
}) {
  const art = SPECIES[species];
  const gear = stageGear(stage);
  const a = art.anchors;
  const parts = art.draw(mood, stage);
  const motion =
    mood === "celebrating" ? "pet-jump" : mood === "sleeping" ? "" : species === "pez" ? "pet-float" : "pet-breathe";

  const guardianItem =
    species === "paloma" ? (
      <OliveSprig at={{ x: 96, y: 51 }} />
    ) : species === "pez" ? (
      <Lantern at={a.side} />
    ) : (
      <Crook at={a.side} />
    );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className="pet overflow-visible"
      fill="none"
    >
      {title && <title>{title}</title>}
      <ellipse cx={60} cy={108} rx={30} ry={4} fill="var(--pet-shadow)" />
      {mood === "sleeping" && (
        <g className="pet-zzz" fill="var(--pet-ink)" fontFamily="var(--font-display)" fontWeight={600}>
          <text x={96} y={30} fontSize={12}>
            z
          </text>
          <text x={104} y={20} fontSize={9}>
            z
          </text>
        </g>
      )}
      {mood === "celebrating" && (
        <g className="pet-sparkles" fill="var(--gold)">
          <path d="M16 30c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5z" />
          <path d="M104 22c.5 2.4 1.6 3.5 4 4-2.4.5-3.5 1.6-4 4-.5-2.4-1.6-3.5-4-4 2.4-.5 3.5-1.6 4-4z" />
          <path d="M100 86c.4 2 1.3 2.9 3.3 3.3-2 .4-2.9 1.3-3.3 3.3-.4-2-1.3-2.9-3.3-3.3 2-.4 2.9-1.3 3.3-3.3z" />
        </g>
      )}
      <g className={motion}>
        <g transform={`translate(60 108) scale(${gear.size}) translate(-60 -108)`}>
          {gear.guardian && species !== "paloma" && guardianItem}
          {parts.back}
          {gear.tunic && <Tunic b={a.body} />}
          {gear.satchel && <Satchel b={a.body} />}
          {parts.front}
          {accessory === "bufanda" && <Scarf n={a.neck} />}
          {accessory === "campanita" && <Bell n={a.neck} />}
          {accessory === "flores" && <Flowers h={a.headTop} />}
          {gear.guardian && species === "paloma" && guardianItem}
        </g>
      </g>
    </svg>
  );
}

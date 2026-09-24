/**
 * Geometría del mapa de la Biblia (ver Documento Maestro §2.13).
 *
 * Un camino en zigzag (filas horizontales unidas por medias vueltas) recorre las 8 zonas.
 * Cada libro es un punto del camino; entre zonas se deja un espacio para el nombre de la zona.
 * Todo es cálculo puro: la pantalla solo dibuja lo que devuelve `buildMap`.
 */
export type Point = { x: number; y: number };

export const MAP = {
  width: 1000,
  rows: 5,
  left: 110,
  right: 890,
  top: 120,
  rowGap: 150,
  bottom: 55,
  /** Espacio entre zonas, medido en "puestos" de libro. */
  zoneGap: 1.8,
  /** Margen al principio y al final del camino, en puestos. */
  edge: 0.9,
} as const;

const rowLength = MAP.right - MAP.left;
const turnRadius = MAP.rowGap / 2;
const turnLength = Math.PI * turnRadius;

export const MAP_HEIGHT = MAP.top + (MAP.rows - 1) * MAP.rowGap + MAP.bottom;
/** Largo total del camino (se usa como `pathLength` del SVG para que las medidas coincidan). */
export const PATH_LENGTH = MAP.rows * rowLength + (MAP.rows - 1) * turnLength;

/** El camino como `d` de SVG: filas rectas unidas por medias circunferencias. */
export function roadPath(): string {
  let d = `M${MAP.left} ${MAP.top}`;
  for (let row = 0; row < MAP.rows; row++) {
    const y = MAP.top + row * MAP.rowGap;
    const toRight = row % 2 === 0;
    d += ` H${toRight ? MAP.right : MAP.left}`;
    if (row < MAP.rows - 1) {
      // Media vuelta hacia abajo, por la derecha o por la izquierda.
      d += ` A${turnRadius} ${turnRadius} 0 0 ${toRight ? 1 : 0} ${toRight ? MAP.right : MAP.left} ${y + MAP.rowGap}`;
    }
  }
  return d;
}

/** Punto del camino a una distancia `s` desde el inicio. */
export function pointAt(s: number): Point {
  let rest = Math.min(Math.max(s, 0), PATH_LENGTH);
  for (let row = 0; row < MAP.rows; row++) {
    const y = MAP.top + row * MAP.rowGap;
    const toRight = row % 2 === 0;
    if (rest <= rowLength || row === MAP.rows - 1) {
      const d = Math.min(rest, rowLength);
      return { x: toRight ? MAP.left + d : MAP.right - d, y };
    }
    rest -= rowLength;
    if (rest <= turnLength) {
      const angle = rest / turnRadius; // 0..π
      const cx = toRight ? MAP.right : MAP.left;
      const cy = y + turnRadius;
      const dir = toRight ? 1 : -1;
      return { x: cx + dir * turnRadius * Math.sin(angle), y: cy - turnRadius * Math.cos(angle) };
    }
    rest -= turnLength;
  }
  return { x: MAP.left, y: MAP.top };
}

export type MapBook = { code: string; zone: number };

export type PlacedBook<B extends MapBook> = B & { s: number; point: Point };
export type PlacedZone = {
  zone: number;
  /** Tramo del camino que ocupa la zona (distancias desde el inicio). */
  from: number;
  to: number;
  /** Dónde va el nombre de la zona (arriba del camino, antes de su primer libro). */
  label: Point;
};

/** Ubica cada libro (en el orden recibido) y cada zona sobre el camino. */
export function buildMap<B extends MapBook>(books: readonly B[]): { books: PlacedBook<B>[]; zones: PlacedZone[] } {
  const zoneIds = [...new Set(books.map((b) => b.zone))];
  const slots = books.length - 1 + (zoneIds.length - 1) * MAP.zoneGap + 2 * MAP.edge;
  const step = PATH_LENGTH / slots;

  const placed: PlacedBook<B>[] = [];
  let s = MAP.edge * step;
  books.forEach((b, i) => {
    if (i > 0 && b.zone !== books[i - 1].zone) s += MAP.zoneGap * step;
    placed.push({ ...b, s, point: pointAt(s) });
    if (i < books.length - 1) s += step;
  });

  const rowYs = Array.from({ length: MAP.rows }, (_, r) => MAP.top + r * MAP.rowGap);
  const zones = zoneIds.map((zone) => {
    const inZone = placed.filter((b) => b.zone === zone);
    const from = Math.max(0, inZone[0].s - step * 0.7);
    const to = Math.min(PATH_LENGTH, inZone[inZone.length - 1].s + step * 0.7);
    return {
      zone,
      from,
      to,
      label: labelPoint(
        inZone.map((b) => b.point),
        rowYs,
      ),
    };
  });
  return { books: placed, zones };
}

/**
 * El nombre de la zona va centrado ARRIBA del tramo recto donde la zona tiene más libros
 * (en las curvas quedaría encima de otros libros). Si todos sus libros están en una curva,
 * va arriba del primero.
 */
export function labelPoint(points: readonly Point[], rowYs: readonly number[]): Point {
  const byRow = new Map<number, Point[]>();
  for (const p of points) {
    const row = rowYs.find((y) => Math.abs(p.y - y) < 0.5);
    if (row === undefined) continue;
    byRow.set(row, [...(byRow.get(row) ?? []), p]);
  }
  const best = [...byRow.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0];
  if (!best) return { x: points[0].x, y: points[0].y - LABEL_OFFSET };
  const xs = best[1].map((p) => p.x);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  return { x: Math.min(Math.max(x, MAP.left + 40), MAP.right - 40), y: best[0] - LABEL_OFFSET };
}

const LABEL_OFFSET = 40;

/** Brillo de una zona según su avance (0 = apagada; con algo leído ya se enciende un poco). */
export function zoneGlow(read: number, total: number): number {
  if (read <= 0 || total <= 0) return 0;
  return 0.3 + 0.7 * Math.min(read / total, 1);
}

export type Decoration = { x: number; y: number; kind: "hill" | "tree" | "grass" };

const DECOR_KINDS: Decoration["kind"][] = ["hill", "tree", "grass", "tree", "hill", "grass"];

/**
 * Pequeños adornos dibujados (colinas, árboles, pasto) en los espacios entre filas del camino.
 * Posiciones fijas y deterministas; se saltan las que chocarían con el nombre de una zona.
 */
export function decorations(labels: readonly Point[]): Decoration[] {
  const out: Decoration[] = [];
  const xs = [235, 405, 575, 745];
  for (let row = 0; row < MAP.rows - 1; row++) {
    const y = MAP.top + row * MAP.rowGap + 62;
    xs.forEach((x0, i) => {
      const x = x0 + ((row * 37 + i * 53) % 40) - 20;
      const clash = labels.some((l) => Math.abs(l.x - x) < 120 && l.y > y - 60 && l.y < y + 70);
      if (!clash) out.push({ x, y: y + ((row + i) % 2) * 10, kind: DECOR_KINDS[(row + i) % DECOR_KINDS.length] });
    });
  }
  return out;
}

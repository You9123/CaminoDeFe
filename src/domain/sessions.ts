/**
 * Sesiones por tiempo (Documento Maestro §2.3): "Tengo 5 / 10 / 15 / 30 minutos".
 * La de 5 minutos es la de siempre (un versículo). Las demás recomiendan capítulos
 * que quepan en el tiempo, usando el tiempo estimado de lectura de cada uno.
 */
export const SESSION_MINUTES = [5, 10, 15, 30] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

/** Pasos después de leer (un subconjunto de los del flujo "Reflexionar, orar, aplicar"). */
export type SessionStep = "reflection" | "prayer" | "application";

type Shape = { readingSeconds: number; prayerMinutes: number; steps: SessionStep[] };

/** Cómo se reparte el tiempo. Reflexión ≈ 2 min; aplicación ≈ 1 min. */
export const SESSION_SHAPES: Record<Exclude<SessionMinutes, 5>, Shape> = {
  10: { readingSeconds: 5 * 60, prayerMinutes: 2, steps: ["reflection", "prayer"] },
  15: { readingSeconds: 9 * 60, prayerMinutes: 3, steps: ["reflection", "prayer"] },
  30: { readingSeconds: 20 * 60, prayerMinutes: 5, steps: ["reflection", "prayer", "application"] },
};

export type ChapterOption = { code: string; chapter: number; label: string; seconds: number };

export type SessionPlan = {
  minutes: SessionMinutes;
  chapters: ChapterOption[];
  prayerMinutes: number;
  steps: SessionStep[];
  readingSeconds: number;
  /** Tiempo total estimado (lectura + reflexión + oración + aplicación), en minutos. */
  totalMinutes: number;
  /** true si se eligió un capítulo corto porque el siguiente del camino no cabía. */
  detour: boolean;
};

/** Un poco de margen: un capítulo que se pasa 20 % del tiempo sigue siendo razonable. */
const TOLERANCE = 1.2;

/**
 * Arma el plan: capítulos seguidos desde donde va el usuario mientras quepan.
 * Si el siguiente capítulo es demasiado largo, propone uno corto (por ejemplo, un Salmo).
 */
export function planSession(
  minutes: Exclude<SessionMinutes, 5>,
  sequence: readonly ChapterOption[],
  shortOptions: readonly ChapterOption[],
): SessionPlan {
  const shape = SESSION_SHAPES[minutes];
  const budget = shape.readingSeconds;
  const chapters: ChapterOption[] = [];
  let used = 0;
  for (const c of sequence) {
    const limit = chapters.length === 0 ? budget * TOLERANCE : budget;
    if (used + c.seconds > limit) break;
    chapters.push(c);
    used += c.seconds;
  }

  let detour = false;
  if (chapters.length === 0) {
    const short =
      shortOptions.find((c) => c.seconds <= budget) ??
      [...shortOptions, ...sequence].sort((a, b) => a.seconds - b.seconds)[0];
    if (short) {
      chapters.push(short);
      used = short.seconds;
      detour = true;
    }
  }

  const extras = 2 * 60 + shape.prayerMinutes * 60 + (shape.steps.includes("application") ? 60 : 0);
  return {
    minutes,
    chapters,
    prayerMinutes: shape.prayerMinutes,
    steps: shape.steps,
    readingSeconds: used,
    totalMinutes: Math.max(1, Math.round((used + extras) / 60)),
    detour,
  };
}

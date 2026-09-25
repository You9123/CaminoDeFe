import { z } from "zod";

/**
 * Línea temporal y coleccionables (Documento Maestro §2.17 y §2.19, ADR-0008).
 *
 * - La línea temporal tiene 15 etapas (content/timeline.json), de la creación a la Iglesia.
 * - Los coleccionables son fichas de personajes, lugares y eventos (characters/places/events.json).
 *   Cada evento pertenece a una etapa.
 * - Todo guarda solo referencias de CAPÍTULO ("GEN.12" o un rango "GEN.6-9"). El avance de una
 *   ficha es la parte de sus capítulos clave que ya leíste, así que no hace falta guardar nada nuevo:
 *   se calcula con chapter_progress. Una ficha se desbloquea con el primer capítulo leído.
 *
 * Aquí vive la lógica pura; la carga y validación del contenido está en src/content/collectibles.ts.
 */

// ---------- Esquemas ----------

/** Íconos que puede usar el contenido (se dibujan en src/components/collectibleIcons.ts). */
export const COLLECTIBLE_ICONS = [
  "anchor",
  "ark",
  "book",
  "candle",
  "city",
  "compass",
  "cross",
  "crown",
  "dove",
  "fish",
  "flame",
  "harp",
  "heart",
  "ladder",
  "lamp",
  "moon",
  "olive",
  "path",
  "peak",
  "quill",
  "scroll",
  "shield",
  "sling",
  "spark",
  "sprout",
  "staff",
  "star",
  "sun",
  "sunrise",
  "tablets",
  "tent",
  "tomb",
  "wave",
  "well",
] as const;
export type CollectibleIcon = (typeof COLLECTIBLE_ICONS)[number];

const PASSAGE_RE = /^([1-3]?[A-Z]{2,3})\.(\d{1,3})(?:-(\d{1,3}))?$/;
const VERSE_RE = /^[1-3]?[A-Z]{2,3}\.\d{1,3}\.\d{1,3}$/;

const id = z.string().regex(/^[a-z0-9_]+$/);
const text = z.string().trim().min(1);
const passage = z
  .string()
  .regex(PASSAGE_RE, "Pasaje inválido (usa 'GEN.12' o 'GEN.6-9')")
  .refine((p) => {
    const m = PASSAGE_RE.exec(p)!;
    return !m[3] || Number(m[3]) > Number(m[2]);
  }, "El rango debe ir de menor a mayor");
const passages = z.array(passage).min(1);
const icon = z.enum(COLLECTIBLE_ICONS);
const verse = z.string().regex(VERSE_RE).optional();

export const eraSchema = z.object({
  id,
  title: text,
  /** Fecha aproximada para mostrar ("Hacia el 1000 a. C."). */
  when: text,
  testament: z.enum(["AT", "NT"]),
  icon,
  summary: text,
  passages,
  characters: z.array(id),
  places: z.array(id),
});

const figure = { id, name: text, icon, line: text, summary: text, passages, verse };
export const characterSchema = z.object(figure);
export const placeSchema = z.object(figure);
export const eventSchema = z.object({
  id,
  title: text,
  era: id,
  icon,
  summary: text,
  passages,
  verse,
  characters: z.array(id),
  places: z.array(id),
});

export const timelineFileSchema = z.object({ eras: z.array(eraSchema).min(1) });
export const charactersFileSchema = z.object({ characters: z.array(characterSchema).min(1) });
export const placesFileSchema = z.object({ places: z.array(placeSchema).min(1) });
export const eventsFileSchema = z.object({ events: z.array(eventSchema).min(1) });

export type Era = z.infer<typeof eraSchema>;
export type EventCard = z.infer<typeof eventSchema>;

export type CollectibleKind = "character" | "place" | "event";

/** Una ficha, sea personaje, lugar o evento, con la misma forma para la interfaz. */
export type Collectible = {
  kind: CollectibleKind;
  id: string;
  name: string;
  icon: CollectibleIcon;
  /** Frase corta para la tarjeta (en los eventos, la fecha de su etapa). */
  line: string;
  summary: string;
  passages: string[];
  verse?: string;
  /** Solo en los eventos. */
  era?: string;
  characters: string[];
  places: string[];
};

export type Catalog = {
  eras: Era[];
  collectibles: Collectible[];
  byKey: Map<string, Collectible>;
};

export const KIND_LABEL: Record<CollectibleKind, { one: string; many: string; unlocked: string }> = {
  character: { one: "Personaje", many: "Personajes", unlocked: "Personaje desbloqueado" },
  place: { one: "Lugar", many: "Lugares", unlocked: "Lugar desbloqueado" },
  event: { one: "Evento", many: "Eventos", unlocked: "Evento desbloqueado" },
};

/** Clave única de una ficha ("character:moises"): un id puede repetirse entre tipos. */
export const collectibleKey = (kind: CollectibleKind, cid: string) => `${kind}:${cid}`;

export type BookInfo = { code: string; name: string; chapters: number };

/**
 * Arma el catálogo y revisa que todo encaje: ids únicos, referencias a personajes/lugares/etapas
 * que existen y capítulos que existen en la Biblia (si se pasan los libros).
 * Lanza un error con TODOS los problemas juntos, para corregirlos de una vez.
 */
export function buildCatalog(
  raw: { timeline: unknown; characters: unknown; places: unknown; events: unknown },
  books?: BookInfo[],
): Catalog {
  const { eras } = timelineFileSchema.parse(raw.timeline);
  const { characters } = charactersFileSchema.parse(raw.characters);
  const { places } = placesFileSchema.parse(raw.places);
  const { events } = eventsFileSchema.parse(raw.events);
  const problems: string[] = [];

  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const x of ids) {
      if (seen.has(x)) problems.push(`${label} repetido: ${x}`);
      seen.add(x);
    }
    return seen;
  };
  const eraIds = unique(
    "Etapa",
    eras.map((e) => e.id),
  );
  const charIds = unique(
    "Personaje",
    characters.map((c) => c.id),
  );
  const placeIds = unique(
    "Lugar",
    places.map((p) => p.id),
  );
  unique(
    "Evento",
    events.map((e) => e.id),
  );

  const eraById = new Map(eras.map((e) => [e.id, e]));
  const checkLinks = (owner: string, chars: string[], pls: string[]) => {
    for (const c of chars) if (!charIds.has(c)) problems.push(`${owner}: personaje desconocido "${c}"`);
    for (const p of pls) if (!placeIds.has(p)) problems.push(`${owner}: lugar desconocido "${p}"`);
  };
  for (const e of eras) checkLinks(`Etapa ${e.id}`, e.characters, e.places);
  for (const e of events) {
    if (!eraIds.has(e.era)) problems.push(`Evento ${e.id}: etapa desconocida "${e.era}"`);
    checkLinks(`Evento ${e.id}`, e.characters, e.places);
  }

  if (books) {
    const byCode = new Map(books.map((b) => [b.code, b]));
    const checkRef = (owner: string, ref: string) => {
      const [code, ch] = ref.split(".");
      const book = byCode.get(code);
      if (!book) return problems.push(`${owner}: libro desconocido en "${ref}"`);
      const last = ref.includes("-") ? Number(ref.split("-")[1]) : Number(ch);
      if (Number(ch) < 1 || last > book.chapters) problems.push(`${owner}: "${ref}" no existe`);
    };
    const all: { owner: string; passages: string[]; verse?: string }[] = [
      ...eras.map((e) => ({ owner: `Etapa ${e.id}`, passages: e.passages })),
      ...characters.map((c) => ({ owner: `Personaje ${c.id}`, passages: c.passages, verse: c.verse })),
      ...places.map((p) => ({ owner: `Lugar ${p.id}`, passages: p.passages, verse: p.verse })),
      ...events.map((e) => ({ owner: `Evento ${e.id}`, passages: e.passages, verse: e.verse })),
    ];
    for (const x of all) {
      for (const p of x.passages) checkRef(x.owner, p);
      if (x.verse) checkRef(x.owner, x.verse.split(".").slice(0, 2).join("."));
    }
  }

  if (problems.length > 0) throw new Error(`Contenido de la línea temporal con errores:\n${problems.join("\n")}`);

  const collectibles: Collectible[] = [
    ...characters.map((c) => ({ ...c, kind: "character" as const, characters: [], places: [] })),
    ...places.map((p) => ({ ...p, kind: "place" as const, characters: [], places: [] })),
    ...events.map((e) => ({
      kind: "event" as const,
      id: e.id,
      name: e.title,
      icon: e.icon,
      line: eraById.get(e.era)!.title,
      summary: e.summary,
      passages: e.passages,
      verse: e.verse,
      era: e.era,
      characters: e.characters,
      places: e.places,
    })),
  ];
  return { eras, collectibles, byKey: new Map(collectibles.map((c) => [collectibleKey(c.kind, c.id), c])) };
}

// ---------- Pasajes ----------

/** "GEN.12" → ["GEN.12"] · "GEN.6-9" → ["GEN.6", "GEN.7", "GEN.8", "GEN.9"]. */
export function expandPassage(p: string): string[] {
  const m = PASSAGE_RE.exec(p);
  if (!m) return [];
  const from = Number(m[2]);
  const to = m[3] ? Number(m[3]) : from;
  return Array.from({ length: to - from + 1 }, (_, i) => `${m[1]}.${from + i}`);
}

/** Capítulos clave distintos, en orden. */
export function keyChapters(list: string[]): string[] {
  return [...new Set(list.flatMap(expandPassage))];
}

/** "GEN.6-9" → "Génesis 6–9" (con los nombres de los libros). */
export function passageLabel(p: string, bookName: (code: string) => string | undefined): string {
  const m = PASSAGE_RE.exec(p);
  if (!m) return p;
  const name = bookName(m[1]) ?? m[1];
  return m[3] ? `${name} ${m[2]}–${m[3]}` : `${name} ${m[2]}`;
}

/** Primer capítulo de un pasaje, para abrirlo en el lector. */
export function passageStart(p: string): { code: string; chapter: number } | null {
  const m = PASSAGE_RE.exec(p);
  return m ? { code: m[1], chapter: Number(m[2]) } : null;
}

// ---------- Progreso ----------

export type CardProgress = {
  read: number;
  total: number;
  unlocked: boolean;
  complete: boolean;
  /** Capítulo clave por el que conviene seguir (el primero sin leer), o null si ya están todos. */
  next: string | null;
};

/** Cuánto llevas de una lista de pasajes. `read` = capítulos leídos alguna vez ("GEN.12"). */
export function passagesProgress(list: string[], read: ReadonlySet<string>): CardProgress {
  const chapters = keyChapters(list);
  const done = chapters.filter((c) => read.has(c)).length;
  return {
    read: done,
    total: chapters.length,
    unlocked: done > 0,
    complete: done === chapters.length,
    next: chapters.find((c) => !read.has(c)) ?? null,
  };
}

/**
 * Progreso de una etapa: sus pasajes y los de sus eventos, juntos.
 * Así, leer la historia de un evento también ilumina su etapa.
 */
export function eraProgress(era: Era, events: Collectible[], read: ReadonlySet<string>): CardProgress {
  const own = events.filter((e) => e.era === era.id).flatMap((e) => e.passages);
  return passagesProgress([...era.passages, ...own], read);
}

/**
 * Fichas que se desbloquean justo al leer `ref` por primera vez: las que incluyen ese capítulo
 * y no tenían ningún otro leído. Si ya lo habías leído antes, no hay nada nuevo.
 */
export function newlyUnlocked(
  collectibles: Collectible[],
  readAfter: ReadonlySet<string>,
  ref: string,
  wasReadBefore: boolean,
): Collectible[] {
  if (wasReadBefore) return [];
  return collectibles.filter((c) => {
    const chapters = keyChapters(c.passages);
    return chapters.includes(ref) && chapters.every((x) => x === ref || !readAfter.has(x));
  });
}

/** Fecha en que se desbloqueó una ficha: la primera lectura de cualquiera de sus capítulos clave. */
export function unlockedAt(c: Collectible, firstReadAt: ReadonlyMap<string, string>): string | null {
  let min: string | null = null;
  for (const ch of keyChapters(c.passages)) {
    const at = firstReadAt.get(ch);
    if (at && (min === null || at < min)) min = at;
  }
  return min;
}

/** Etapas en las que aparece una ficha (por la etapa misma o por alguno de sus eventos). */
export function erasOf(c: Collectible, catalog: Catalog): Era[] {
  if (c.kind === "event") return catalog.eras.filter((e) => e.id === c.era);
  const events = catalog.collectibles.filter((e) => e.kind === "event");
  return catalog.eras.filter((era) => {
    const inEra = c.kind === "character" ? era.characters : era.places;
    if (inEra.includes(c.id)) return true;
    return events.some((e) => e.era === era.id && (c.kind === "character" ? e.characters : e.places).includes(c.id));
  });
}

/** Fichas relacionadas: eventos donde aparece, y personajes y lugares de esos eventos. */
export function relatedOf(c: Collectible, catalog: Catalog): Collectible[] {
  const events = catalog.collectibles.filter((e) => e.kind === "event");
  const keys = new Set<string>();
  if (c.kind === "event") {
    for (const x of c.characters) keys.add(collectibleKey("character", x));
    for (const x of c.places) keys.add(collectibleKey("place", x));
  } else {
    for (const e of events) {
      const list = c.kind === "character" ? e.characters : e.places;
      if (list.includes(c.id)) keys.add(collectibleKey("event", e.id));
    }
  }
  return [...keys].map((k) => catalog.byKey.get(k)!).filter(Boolean);
}

/** Capítulos que aparecen en alguna ficha: para decir "aquí aparecen..." en el lector. */
export function collectiblesInChapter(collectibles: Collectible[], ref: string): Collectible[] {
  return collectibles.filter((c) => keyChapters(c.passages).includes(ref));
}

/** Resumen por tipo: cuántas fichas desbloqueadas y cuántas completas. */
export function kindTotals(
  collectibles: Collectible[],
  read: ReadonlySet<string>,
): Record<CollectibleKind, { unlocked: number; complete: number; total: number }> {
  const out = {
    character: { unlocked: 0, complete: 0, total: 0 },
    place: { unlocked: 0, complete: 0, total: 0 },
    event: { unlocked: 0, complete: 0, total: 0 },
  };
  for (const c of collectibles) {
    const p = passagesProgress(c.passages, read);
    const t = out[c.kind];
    t.total++;
    if (p.unlocked) t.unlocked++;
    if (p.complete) t.complete++;
  }
  return out;
}

// ---------- Imágenes de las fichas ----------

/** Imagen de una ficha: una obra de dominio público o una foto con licencia libre, con su crédito. */
export const imageCreditSchema = z.object({
  file: z.string().regex(/^(character|place|event)-[a-z0-9_]+\.webp$/),
  title: text,
  author: text,
  year: text,
  license: z.string().regex(/^(Dominio público|CC0|CC BY(-SA)? \d\.\d)$/, "Licencia no permitida"),
  source: z.string().url(),
});
export type ImageCredit = z.infer<typeof imageCreditSchema>;

export const imagesFileSchema = z.object({
  images: z.record(z.string().regex(/^(character|place|event):[a-z0-9_]+$/), imageCreditSchema),
});

/** Crédito corto para mostrar bajo la imagen: "Rembrandt, 1659 · Dominio público". */
export function creditLine(c: ImageCredit): string {
  return `${c.author}, ${c.year} · ${c.license}`;
}

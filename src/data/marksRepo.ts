import { userDb } from "./db";

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "rose"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type VerseMark = { ref: string; color: HighlightColor | null; favorite: boolean };

type Row = { ref: string; color: HighlightColor | null; favorite: number; updated_at: string };

const toMark = (r: Row): VerseMark => ({ ref: r.ref, color: r.color, favorite: r.favorite === 1 });

/** Marcas de un capítulo: número de versículo → marca. */
export async function getChapterMarks(bookCode: string, chapter: number): Promise<Map<number, VerseMark>> {
  const db = await userDb();
  const prefix = `${bookCode}.${chapter}.`;
  const rows = await db.select<Row[]>("SELECT ref, color, favorite, updated_at FROM verse_marks WHERE ref LIKE $1", [
    `${prefix}%`,
  ]);
  return new Map(rows.map((r) => [Number(r.ref.slice(prefix.length)), toMark(r)]));
}

/** Cambia el color y/o el favorito de varios versículos. `undefined` = no tocar ese campo. */
export async function updateMarks(
  refs: string[],
  change: { color?: HighlightColor | null; favorite?: boolean },
): Promise<void> {
  const db = await userDb();
  const now = new Date().toISOString();
  for (const ref of refs) {
    const current = await db.select<Row[]>("SELECT ref, color, favorite, updated_at FROM verse_marks WHERE ref = $1", [
      ref,
    ]);
    const color = change.color !== undefined ? change.color : (current[0]?.color ?? null);
    const favorite = change.favorite !== undefined ? change.favorite : current[0]?.favorite === 1;

    if (!color && !favorite) {
      await db.execute("DELETE FROM verse_marks WHERE ref = $1", [ref]);
      continue;
    }
    await db.execute(
      `INSERT INTO verse_marks (ref, color, favorite, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (ref) DO UPDATE SET color = excluded.color, favorite = excluded.favorite, updated_at = excluded.updated_at`,
      [ref, color, favorite ? 1 : 0, now],
    );
  }
}

export async function listFavorites(): Promise<VerseMark[]> {
  const db = await userDb();
  const rows = await db.select<Row[]>(
    "SELECT ref, color, favorite, updated_at FROM verse_marks WHERE favorite = 1 ORDER BY updated_at DESC",
  );
  return rows.map(toMark);
}

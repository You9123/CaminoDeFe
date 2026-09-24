/**
 * Rangos (ver Documento Maestro §2.6).
 * Son títulos de juego que acompañan al nivel: miden el hábito, nunca la fe.
 */
export type RankId = "comenzando" | "caminante" | "buscador" | "discipulo" | "perseverante" | "siervo" | "peregrino";

export type Rank = {
  id: RankId;
  /** Nivel desde el que se tiene este rango. */
  level: number;
  title: string;
  /** Frase corta y amable que acompaña al rango. */
  line: string;
};

export const RANKS: readonly Rank[] = [
  { id: "comenzando", level: 1, title: "Comenzando el camino", line: "Todo camino empieza con un paso." },
  { id: "caminante", level: 5, title: "Caminante", line: "Ya tienes el paso firme." },
  { id: "buscador", level: 10, title: "Buscador", line: "Buscas, y vas encontrando." },
  { id: "discipulo", level: 20, title: "Discípulo", line: "Aprendes cada día un poco más." },
  { id: "perseverante", level: 30, title: "Perseverante", line: "Sigues, aun cuando cuesta." },
  { id: "siervo", level: 40, title: "Siervo", line: "Lo que lees se nota en cómo vives." },
  { id: "peregrino", level: 50, title: "Peregrino", line: "Un largo camino, andado con fidelidad." },
];

export type RankInfo = {
  rank: Rank;
  /** El siguiente rango, o null si ya se tiene el último. */
  next: Rank | null;
};

export function rankForLevel(level: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (level >= RANKS[i].level) index = i;
  }
  return { rank: RANKS[index], next: RANKS[index + 1] ?? null };
}

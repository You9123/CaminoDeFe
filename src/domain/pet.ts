import { COSMETICS, cosmeticUnlocked, unlockLabel, type Cosmetic, type CosmeticFacts } from "./cosmetics";

/**
 * Mascota espiritual (Documento Maestro §2.12).
 * Opcional. Evoluciona con el nivel, se pone accesorios que se ganan con rachas y logros,
 * y "duerme" si pasan días sin entrar. Nunca se enferma ni se muere.
 */
export const PET_SPECIES = ["oveja", "leon", "paloma", "pez"] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const SPECIES_INFO: Record<PetSpecies, { name: string; defaultName: string; description: string }> = {
  oveja: { name: "Oveja", defaultName: "Lana", description: "Tranquila y fiel. Conoce la voz de su pastor." },
  leon: { name: "León", defaultName: "Bruno", description: "Valiente, pero de corazón manso." },
  paloma: { name: "Paloma", defaultName: "Paz", description: "Ligera y serena. Trae buenas noticias." },
  pez: { name: "Pez", defaultName: "Jonás", description: "Curioso y alegre. Nada contigo." },
};

export const isPetSpecies = (v: string | null | undefined): v is PetSpecies =>
  !!v && (PET_SPECIES as readonly string[]).includes(v);

// ---------- Etapas ----------

export type PetStageId = "bebe" | "joven" | "aventurera" | "tunica" | "guardiana";

export const PET_STAGES: readonly { id: PetStageId; level: number; title: string }[] = [
  { id: "bebe", level: 1, title: "Bebé" },
  { id: "joven", level: 5, title: "Joven" },
  { id: "aventurera", level: 10, title: "Aventurera" },
  { id: "tunica", level: 20, title: "Con túnica" },
  { id: "guardiana", level: 30, title: "Guardiana del camino" },
];

export function petStage(level: number) {
  let index = 0;
  PET_STAGES.forEach((s, i) => {
    if (level >= s.level) index = i;
  });
  return { ...PET_STAGES[index], index, next: PET_STAGES[index + 1] ?? null };
}

/** Qué lleva puesto según la etapa (se va sumando). */
export function stageGear(stage: PetStageId) {
  const i = PET_STAGES.findIndex((s) => s.id === stage);
  return { satchel: i >= 2, tunic: i >= 3, guardian: i >= 4, size: [0.78, 0.9, 1, 1, 1][i] ?? 1 };
}

// ---------- Accesorios ----------
// Vienen del catálogo único de cosméticos (V3.5D, ADR-0015): son los de tipo "pet_accessory".

export const ACCESSORY_IDS = ["bufanda", "flores", "campanita", "panuelo", "laurel"] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export type Accessory = Cosmetic & { id: AccessoryId; how: string };

export const PET_ACCESSORIES: readonly Accessory[] = COSMETICS.filter(
  (c): c is Cosmetic & { id: AccessoryId } =>
    c.type === "pet_accessory" && (ACCESSORY_IDS as readonly string[]).includes(c.id),
).map((c) => ({ ...c, how: unlockLabel(c.unlock) }));

export function accessoryUnlocked(a: Accessory, facts: CosmeticFacts): boolean {
  return cosmeticUnlocked(a, facts);
}

/** El accesorio elegido, solo si ya se ganó (si no, ninguno). */
export function wornAccessory(chosen: string | null, facts: CosmeticFacts): AccessoryId | null {
  const a = PET_ACCESSORIES.find((x) => x.id === chosen);
  return a && accessoryUnlocked(a, facts) ? a.id : null;
}

// ---------- Ánimo y frases ----------

/**
 * Ánimos. "curious" (V3.5D) es la reacción al descubrir algo: abre bien los ojos y ladea la cabeza.
 */
export type PetMood = "idle" | "happy" | "sleeping" | "celebrating" | "curious";

/** Reacciones que pueden pasar por algo que hiciste. */
export type PetReaction = "celebrating" | "curious";

/**
 * ¿Cómo reacciona la mascota a lo que acaba de pasar? (V3.5D) No reacciona a todo:
 * - descubrir una ficha la pone curiosa (lo más específico gana);
 * - terminar un capítulo, completar las misiones del día o la sorpresa, un desafío, un logro
 *   o subir de nivel la hacen celebrar;
 * - una reflexión, una oración o una misión suelta no cambian nada (ya está contenta por el día).
 */
export function petReaction(e: {
  activities: readonly string[];
  discoveries: number;
  levelUp: boolean;
  achievements: number;
  challenges: number;
}): PetReaction | null {
  if (e.discoveries > 0) return "curious";
  const big = ["chapter_read", "daily_missions_bonus", "surprise_mission"];
  if (e.levelUp || e.achievements > 0 || e.challenges > 0 || e.activities.some((a) => big.includes(a)))
    return "celebrating";
  return null;
}

/** Días sin actividad a partir de los cuales la mascota "duerme" (hasta que hagas algo hoy). */
export const SLEEP_AFTER_DAYS = 2;

export function petMood(input: {
  /** Reacción en curso (dura unos segundos), si la hay. */
  reaction?: PetReaction | null;
  celebrating: boolean;
  todayDone: boolean;
  /** Días entre la última actividad y hoy (null si nunca hubo actividad). */
  daysSinceActivity: number | null;
}): PetMood {
  if (input.reaction) return input.reaction;
  if (input.celebrating) return "celebrating";
  if (input.todayDone) return "happy";
  if (input.daysSinceActivity !== null && input.daysSinceActivity >= SLEEP_AFTER_DAYS) return "sleeping";
  return "idle";
}

/** Datos del día para que la mascota hable de lo que hiciste (V3.5D). Todo es opcional. */
export type PetDayFacts = {
  /** Capítulos distintos leídos hoy. */
  chaptersToday?: number;
  /** La última ficha descubierta hoy, si hubo: su nombre y si es un personaje ("a Eva"). */
  discoveredToday?: { name: string; person: boolean } | null;
};

/**
 * Una frase corta para la burbuja. Tono cálido, sin culpa, sin frases religiosas genéricas
 * y sin exceso de signos de exclamación. `seed` (por ejemplo, el número de día) elige entre
 * varias para que no se repita siempre la misma. Con datos del día, habla de lo que hiciste.
 */
export function petLine(
  mood: PetMood,
  ctx: { userName: string; hour: number; allMissionsDone: boolean; seed: number } & PetDayFacts,
): string {
  const who = ctx.userName ? `, ${ctx.userName}` : "";
  const pick = (options: string[]) => options[Math.abs(ctx.seed) % options.length];
  const chapters = ctx.chaptersToday ?? 0;
  const found = ctx.discoveredToday ?? null;
  switch (mood) {
    case "curious":
      return found ? pick([`Descubriste ${withArticle(found)}.`, `Mira: ${found.name}.`]) : "Algo nuevo apareció.";
    case "celebrating":
      return pick(["Mira cuánto hemos crecido.", "Qué alegría. Vamos por más.", "Otro paso en el camino."]);
    case "sleeping":
      return pick([`Zzz… Te extrañaba${who}.`, "Zzz… Cuando quieras, seguimos.", "Zzz… Aquí te espero."]);
    case "happy": {
      const facts: string[] = [];
      if (found) facts.push(`Hoy descubriste ${withArticle(found)}.`);
      if (chapters >= 2) facts.push(`Hoy llevas ${chapters} capítulos.`);
      if (chapters === 1) facts.push("Hoy ya leímos un capítulo.");
      if (ctx.allMissionsDone) return pick(["Hoy completamos todo. Descansa tranquilo.", ...facts]);
      return pick(facts.length > 0 ? facts : ["Qué bueno leer juntos hoy.", "Hoy ya dimos un paso."]);
    }
    case "idle":
      if (ctx.hour < 12) return pick([`Buenos días${who}.`, "¿Leemos un poco?", "Un día nuevo para caminar."]);
      if (ctx.hour < 19) return pick([`Hola${who}.`, "¿Tienes unos minutos?", "Aquí estoy, cuando quieras."]);
      return pick([`Buenas noches${who}.`, "¿Un versículo antes de dormir?", "Cerremos el día juntos."]);
  }
}

/**
 * "a Eva" para personajes; los lugares y eventos van tal cual, y si empiezan con artículo
 * ("El mar Rojo", "La caída") se escribe en minúscula para que la frase se lea bien.
 */
function withArticle(found: { name: string; person: boolean }): string {
  if (found.person) return `a ${found.name}`;
  if (/^(El|La|Los|Las) /.test(found.name)) return found.name[0].toLowerCase() + found.name.slice(1);
  return found.name;
}

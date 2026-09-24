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

export type AccessoryId = "bufanda" | "flores" | "campanita";

export type Accessory = {
  id: AccessoryId;
  title: string;
  /** Cómo se gana, dicho para el usuario. */
  how: string;
  unlock: { type: "streak"; days: number } | { type: "achievement"; id: string };
};

export const PET_ACCESSORIES: readonly Accessory[] = [
  { id: "bufanda", title: "Bufanda de lana", how: "Racha de 7 días", unlock: { type: "streak", days: 7 } },
  {
    id: "flores",
    title: "Corona de flores",
    how: "Logro «Libro completo»",
    unlock: { type: "achievement", id: "first_book" },
  },
  {
    id: "campanita",
    title: "Campanita",
    how: "Logro «Diez reflexiones»",
    unlock: { type: "achievement", id: "reflections_10" },
  },
];

export function accessoryUnlocked(a: Accessory, bestStreak: number, achievements: ReadonlySet<string>): boolean {
  return a.unlock.type === "streak" ? bestStreak >= a.unlock.days : achievements.has(a.unlock.id);
}

/** El accesorio elegido, solo si ya se ganó (si no, ninguno). */
export function wornAccessory(
  chosen: string | null,
  bestStreak: number,
  achievements: ReadonlySet<string>,
): AccessoryId | null {
  const a = PET_ACCESSORIES.find((x) => x.id === chosen);
  return a && accessoryUnlocked(a, bestStreak, achievements) ? a.id : null;
}

// ---------- Ánimo y frases ----------

export type PetMood = "idle" | "happy" | "sleeping" | "celebrating";

/** Días sin actividad a partir de los cuales la mascota "duerme" (hasta que hagas algo hoy). */
export const SLEEP_AFTER_DAYS = 2;

export function petMood(input: {
  celebrating: boolean;
  todayDone: boolean;
  /** Días entre la última actividad y hoy (null si nunca hubo actividad). */
  daysSinceActivity: number | null;
}): PetMood {
  if (input.celebrating) return "celebrating";
  if (input.todayDone) return "happy";
  if (input.daysSinceActivity !== null && input.daysSinceActivity >= SLEEP_AFTER_DAYS) return "sleeping";
  return "idle";
}

/**
 * Una frase corta para la burbuja. Tono cálido, sin culpa y sin exceso de signos de exclamación.
 * `seed` (por ejemplo, el número de día) elige entre varias para que no se repita siempre la misma.
 */
export function petLine(
  mood: PetMood,
  ctx: { userName: string; hour: number; allMissionsDone: boolean; seed: number },
): string {
  const who = ctx.userName ? `, ${ctx.userName}` : "";
  const pick = (options: string[]) => options[Math.abs(ctx.seed) % options.length];
  switch (mood) {
    case "celebrating":
      return pick(["Mira cuánto hemos crecido.", "Qué alegría. Vamos por más.", "Otro paso en el camino."]);
    case "sleeping":
      return pick([`Zzz… Te extrañaba${who}.`, "Zzz… Cuando quieras, seguimos.", "Zzz… Aquí te espero."]);
    case "happy":
      return ctx.allMissionsDone
        ? pick(["Hoy completamos todo. Descansa tranquilo.", "Día completo. Gracias por venir."])
        : pick(["Qué bueno leer juntos hoy.", "Hoy ya dimos un paso.", "Me gusta este rato contigo."]);
    case "idle":
      if (ctx.hour < 12) return pick([`Buenos días${who}.`, "¿Leemos un poco?", "Un día nuevo para caminar."]);
      if (ctx.hour < 19) return pick([`Hola${who}.`, "¿Tienes unos minutos?", "Aquí estoy, cuando quieras."]);
      return pick([`Buenas noches${who}.`, "¿Un versículo antes de dormir?", "Cerremos el día juntos."]);
  }
}

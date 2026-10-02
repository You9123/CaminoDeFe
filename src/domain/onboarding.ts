/**
 * Bienvenida corta (V3.5, ADR-0013): bienvenida → nombre → mascota → recordatorio → primer capítulo.
 * Solo la ve un perfil nuevo. Quien ya usa la app (tiene nombre, mascota elegida o cualquier
 * actividad) no la ve nunca, aunque venga de una versión anterior sin la marca guardada.
 */
export type OnboardingFacts = {
  /** settings.onboarding_done === "1". */
  done: boolean;
  name: string;
  /** settings.pet_species: null si nunca se eligió (ni "none"). */
  petSpecies: string | null;
  /** Filas de activity_log. */
  activities: number;
  /** Filas de chapter_progress. */
  chaptersRead: number;
};

export function needsOnboarding(f: OnboardingFacts): boolean {
  if (f.done) return false;
  return f.name.trim() === "" && f.petSpecies === null && f.activities === 0 && f.chaptersRead === 0;
}

export const ONBOARDING_STEPS = ["welcome", "name", "pet", "reminder", "first"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

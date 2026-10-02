import { userDb } from "./db";
import { getChaptersReadCount, getProfileName, getSetting, setSetting } from "./progressRepo";
import type { OnboardingFacts } from "../domain/onboarding";

export const ONBOARDING_KEY = "onboarding_done";

/** Lo necesario para saber si mostrar la bienvenida (ver needsOnboarding). */
export async function getOnboardingFacts(): Promise<OnboardingFacts> {
  const db = await userDb();
  const [flag, name, pet, rows, chaptersRead] = await Promise.all([
    getSetting(ONBOARDING_KEY),
    getProfileName(),
    getSetting("pet_species"),
    db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM activity_log"),
    getChaptersReadCount(),
  ]);
  return {
    done: flag === "1",
    name,
    petSpecies: pet,
    activities: Number(rows[0]?.n ?? 0),
    chaptersRead,
  };
}

/** Marca la bienvenida como vista (también para quien ya usaba la app antes de la V3.5). */
export async function markOnboardingDone(): Promise<void> {
  await setSetting(ONBOARDING_KEY, "1");
}

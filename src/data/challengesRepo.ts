import { userDb } from "./db";
import { listBooks } from "./bibleRepo";
import { gameDay } from "../domain/day";
import {
  challengeState,
  evaluateChallenge,
  MAX_ACTIVE_CHALLENGES,
  type Challenge,
  type ChallengeEvent,
  type ChallengeProgress,
  type ChallengeRun,
  type ChallengeState,
} from "../domain/challenges";
import { CHALLENGES } from "../content/challenges";

/** Tipo de fila en activity_log para la recompensa de un desafío (ref = id del desafío). */
export const CHALLENGE_TYPE = "challenge";

const nowIso = () => new Date().toISOString();

export async function listRuns(): Promise<ChallengeRun[]> {
  const db = await userDb();
  return db.select<ChallengeRun[]>(
    "SELECT id, challenge_id, started_at, started_day, status, ended_at FROM challenge_runs ORDER BY id",
  );
}

async function bookChapters(): Promise<Record<string, number>> {
  return Object.fromEntries((await listBooks()).map((b) => [b.code, b.chapters]));
}

async function eventsSince(day: string): Promise<ChallengeEvent[]> {
  const db = await userDb();
  return db.select<ChallengeEvent[]>("SELECT type, ref, day FROM activity_log WHERE day >= $1", [day]);
}

export type ChallengeView = Challenge & {
  state: ChallengeState;
  run: ChallengeRun | null;
  previousTries: number;
  /** Solo si está en curso. */
  progress: ChallengeProgress | null;
};

export async function getChallengeViews(): Promise<ChallengeView[]> {
  const [runs, chapters] = await Promise.all([listRuns(), bookChapters()]);
  const today = gameDay();
  return Promise.all(
    CHALLENGES.map(async (c) => {
      const s = challengeState(runs, c.id);
      const progress =
        s.state === "active" && s.run
          ? evaluateChallenge(c, {
              events: await eventsSince(s.run.started_day),
              startedDay: s.run.started_day,
              today,
              bookChapters: chapters,
            })
          : null;
      return { ...c, ...s, progress };
    }),
  );
}

export class ChallengeLimitError extends Error {}

export async function startChallenge(id: string): Promise<void> {
  const runs = await listRuns();
  const s = challengeState(runs, id);
  if (s.state !== "available") return;
  if (runs.filter((r) => r.status === "active").length >= MAX_ACTIVE_CHALLENGES) {
    throw new ChallengeLimitError(`Puedes tener hasta ${MAX_ACTIVE_CHALLENGES} desafíos a la vez.`);
  }
  const db = await userDb();
  await db.execute(
    "INSERT INTO challenge_runs (challenge_id, started_at, started_day, status) VALUES ($1, $2, $3, 'active')",
    [id, nowIso(), gameDay()],
  );
}

/** Dejar un desafío. Se puede volver a empezar cuando se quiera. */
export async function abandonChallenge(runId: number): Promise<void> {
  const db = await userDb();
  await db.execute(
    "UPDATE challenge_runs SET status = 'abandoned', ended_at = $2 WHERE id = $1 AND status = 'active'",
    [runId, nowIso()],
  );
}

let running: Promise<Challenge[]> | null = null;

/**
 * Revisa los desafíos en curso: marca los completados (y guarda su XP en activity_log)
 * y cierra los que se quedaron sin tiempo. Devuelve los recién completados.
 * Si ya hay una revisión en curso, espera y revisa otra vez (como checkAchievements).
 */
export function checkChallenges(): Promise<Challenge[]> {
  if (running) return running.then(() => checkChallenges());
  running = (async () => {
    try {
      const views = await getChallengeViews();
      const db = await userDb();
      const completed: Challenge[] = [];
      for (const v of views) {
        if (!v.run || !v.progress) continue;
        const now = nowIso();
        if (v.progress.done) {
          await db.execute(
            "UPDATE challenge_runs SET status = 'completed', ended_at = $2 WHERE id = $1 AND status = 'active'",
            [v.run.id, now],
          );
          await db.execute(
            `INSERT INTO activity_log (type, ref, xp, day, duration_sec, created_at)
             SELECT $1, $2, $3, $4, NULL, $5
             WHERE NOT EXISTS (SELECT 1 FROM activity_log WHERE type = $1 AND ref = $2)`,
            [CHALLENGE_TYPE, v.id, v.xp, gameDay(), now],
          );
          completed.push(v);
        } else if (v.progress.expired) {
          await db.execute(
            "UPDATE challenge_runs SET status = 'expired', ended_at = $2 WHERE id = $1 AND status = 'active'",
            [v.run.id, now],
          );
        }
      }
      return completed;
    } finally {
      running = null;
    }
  })();
  return running;
}

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MAX_ACTIVE_CHALLENGES, MAX_ACTIVE_MAJOR, overallProgress } from "../domain/challenges";
import {
  abandonChallenge,
  ChallengeLimitError,
  getChallengeViews,
  startChallenge,
  type ChallengeView,
} from "../data/challengesRepo";
import { useProgress } from "../stores/progressStore";
import { toast } from "../stores/toastStore";
import { DailyMissionsCard } from "../components/DailyMissionsCard";
import { SurpriseCard } from "../components/SurpriseCard";
import { Medallion } from "../components/Medallion";
import { ACHIEVEMENT_ICON } from "../components/badgeIcons";
import { HourglassIcon } from "../components/icons";

export function MissionsScreen() {
  const totalXp = useProgress((s) => s.totalXp);
  const checkRewards = useProgress((s) => s.checkAchievements);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  // Al entrar se cierran los desafíos vencidos y se entregan los que ya se cumplieron.
  useEffect(() => {
    void checkRewards().then(reload);
  }, [checkRewards]);

  // Se conserva la lista anterior mientras se recarga (así la página no salta al empezar un desafío).
  const [views, setViews] = useState<ChallengeView[]>([]);
  useEffect(() => {
    let cancelled = false;
    getChallengeViews().then(
      (v) => !cancelled && setViews(v),
      (e: unknown) => console.error(e),
    );
    return () => {
      cancelled = true;
    };
  }, [totalXp, version]);
  const normal = views.filter((v) => v.tier !== "mayor");
  const majors = views.filter((v) => v.tier === "mayor");
  const active = normal.filter((v) => v.state === "active");
  const available = normal.filter((v) => v.state === "available");
  const completed = normal.filter((v) => v.state === "completed");
  const majorsActive = majors.filter((v) => v.state === "active").length;

  const start = async (id: string) => {
    try {
      await startChallenge(id);
      reload();
    } catch (e) {
      toast(e instanceof ChallengeLimitError ? e.message : "No se pudo empezar el desafío", "info");
    }
  };

  const abandon = async (runId: number) => {
    await abandonChallenge(runId);
    reload();
  };

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <header className="animate-rise mb-8">
        <h1 className="font-display text-4xl font-semibold">Misiones</h1>
        <p className="mt-1.5 text-muted">Pequeños pasos para hoy y desafíos para los próximos días.</p>
      </header>

      <section className="animate-rise mb-10 grid grid-cols-[3fr_2fr] gap-4">
        <DailyMissionsCard />
        <SurpriseCard />
      </section>

      {majors.length > 0 && (
        <section className="animate-rise mb-12">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold">Desafíos mayores</h2>
            <p className="text-sm text-muted tabular-nums">
              {majorsActive} de {MAX_ACTIVE_MAJOR} en curso
            </p>
          </div>
          <p className="mb-5 text-sm text-muted">
            Un libro completo, con reflexiones, oración y preguntas. Sin plazo: son para recorrerlos con calma. Al
            terminarlos ganas una insignia.
          </p>
          <div className="flex flex-col gap-3">
            {majors
              .filter((c) => c.state === "active")
              .map((c) => (
                <ActiveChallenge key={c.id} c={c} onAbandon={abandon} major />
              ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {majors
              .filter((c) => c.state !== "active")
              .map((c) => (
                <MajorCard key={c.id} c={c} full={majorsActive >= MAX_ACTIVE_MAJOR} onStart={() => void start(c.id)} />
              ))}
          </div>
        </section>
      )}

      <section className="animate-rise">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">Desafíos</h2>
          <p className="text-sm text-muted tabular-nums">
            {active.length} de {MAX_ACTIVE_CHALLENGES} en curso
          </p>
        </div>
        <p className="mb-5 text-sm text-muted">
          Tú decides cuándo empezar. Cuenta lo que hagas desde ese día. Si se acaba el tiempo, puedes volver a
          intentarlo.
        </p>

        {active.length > 0 && (
          <div className="mb-8 flex flex-col gap-3">
            {active.map((c) => (
              <ActiveChallenge key={c.id} c={c} onAbandon={abandon} />
            ))}
          </div>
        )}

        {available.length > 0 && (
          <>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Para empezar</h3>
            <div className="mb-8 grid grid-cols-2 gap-3">
              {available.map((c) => (
                <AvailableChallenge
                  key={c.id}
                  c={c}
                  full={active.length >= MAX_ACTIVE_CHALLENGES}
                  onStart={() => void start(c.id)}
                />
              ))}
            </div>
          </>
        )}

        {completed.length > 0 && (
          <>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Completados</h3>
            <div className="grid grid-cols-2 gap-3">
              {completed.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
                  <Medallion icon={ACHIEVEMENT_ICON[c.icon]} unlocked size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-muted">
                      {c.run?.ended_at && shortDate(c.run.ended_at)}
                      <span className="ml-1.5 font-semibold text-accent">+{c.xp} XP</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** Tarjeta de un desafío mayor disponible o completado: los requisitos se ven desde antes de empezar. */
function MajorCard({ c, full, onStart }: { c: ChallengeView; full: boolean; onStart: () => void }) {
  const done = c.state === "completed";
  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 ${done ? "border-gold/60 bg-gold-soft/40" : "border-gold/40 bg-surface"}`}
    >
      <div className="flex items-start gap-4">
        <Medallion icon={ACHIEVEMENT_ICON[c.icon]} unlocked={done} gold={done} size={60} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-semibold">{c.title}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">{c.description}</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-[13px]">
        {c.requirements.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {requirementText(r)}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold">
          +{c.xp} XP · insignia
        </span>
        {done ? (
          <span className="text-xs font-semibold text-gold">
            Completado{c.run?.ended_at ? ` el ${shortDate(c.run.ended_at)}` : ""}
          </span>
        ) : (
          <button
            onClick={onStart}
            disabled={full}
            title={full ? `Puedes tener hasta ${MAX_ACTIVE_MAJOR} desafíos mayores a la vez` : undefined}
            className="shrink-0 rounded-lg border border-gold px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-gold hover:bg-gold-soft disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {c.previousTries > 0 ? "Volver a empezar" : "Empezar"}
          </button>
        )}
      </div>
    </div>
  );
}

/** "Leer Juan completo", "5 reflexiones sobre Juan"… para mostrar antes de empezar. */
function requirementText(r: ChallengeView["requirements"][number]): string {
  const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  switch (r.type) {
    case "books_read":
      return `Leer ${r.label.replace(/^Capítulos de /, "")} completo`;
    case "quiz_correct":
    case "activity_count":
    case "chapters_in_books":
      return `${r.count} ${lowerFirst(r.label)}`;
    case "activity_days":
      return `${r.days} ${lowerFirst(r.label)}`;
  }
}

const shortDate = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: es }).replace(".", "");

function Meta({ c }: { c: ChallengeView }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5">
        <HourglassIcon size={13} duo={false} />
        {c.days === null ? "Sin plazo" : `${c.days} días`}
      </span>
      <span className="rounded-full bg-accent-soft/70 px-2 py-0.5 font-semibold text-accent">+{c.xp} XP</span>
    </p>
  );
}

function AvailableChallenge({ c, full, onStart }: { c: ChallengeView; full: boolean; onStart: () => void }) {
  return (
    <div className="flex gap-3.5 rounded-2xl border border-border bg-surface p-4">
      <Medallion icon={ACHIEVEMENT_ICON[c.icon]} unlocked={false} size={52} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold">{c.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{c.description}</p>
        <Meta c={c} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-[11px] text-muted">{c.previousTries > 0 ? "Ya lo intentaste una vez." : ""}</span>
          <button
            onClick={onStart}
            disabled={full}
            title={full ? `Puedes tener hasta ${MAX_ACTIVE_CHALLENGES} desafíos a la vez` : undefined}
            className="shrink-0 rounded-lg border border-accent px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-accent hover:bg-accent-soft disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {c.previousTries > 0 ? "Volver a empezar" : "Empezar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveChallenge({
  c,
  onAbandon,
  major = false,
}: {
  c: ChallengeView;
  onAbandon: (runId: number) => void;
  major?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const p = c.progress;
  if (!p || !c.run) return null;
  const pct = Math.round(overallProgress(p) * 100);
  const timeLeft =
    p.daysLeft === null
      ? `Empezaste el ${shortDate(c.run.started_at)}`
      : p.daysLeft <= 1
        ? "Hoy es el último día"
        : `Quedan ${p.daysLeft} días`;

  return (
    <div className={`rounded-2xl border bg-surface p-5 shadow-sm ${major ? "border-gold/60" : "border-accent/40"}`}>
      <div className="flex items-start gap-4">
        <Medallion icon={ACHIEVEMENT_ICON[c.icon]} unlocked gold={major} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-lg font-semibold">{c.title}</p>
            <p className="shrink-0 text-sm font-semibold text-accent tabular-nums">{pct}%</p>
          </div>
          <p className="text-[13px] text-muted">{c.description}</p>

          <ul className="mt-3 flex flex-col gap-2.5">
            {p.requirements.map((r) => (
              <li key={r.label}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className={r.done ? "text-success" : ""}>{r.label}</span>
                  <span className="text-muted tabular-nums">
                    {r.current} / {r.target}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full ${r.done ? "bg-success" : "bg-accent"}`}
                    style={{ width: `${(r.current / r.target) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <HourglassIcon size={14} duo={false} /> {timeLeft} · +{c.xp} XP al completarlo
            </span>
            {confirming ? (
              <span className="flex items-center gap-2">
                ¿Dejarlo por ahora?
                <button onClick={() => onAbandon(c.run!.id)} className="font-semibold text-accent hover:underline">
                  Sí
                </button>
                <button onClick={() => setConfirming(false)} className="hover:text-ink">
                  No
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirming(true)} className="hover:text-ink">
                Dejar este desafío
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

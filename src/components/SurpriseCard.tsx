import { Link } from "react-router";
import { SURPRISES } from "../content/surprises";
import { pickSurprise, surpriseMet } from "../domain/surprise";
import { XP_RULES } from "../domain/xp";
import { getTodayFacts } from "../data/surpriseRepo";
import { recordActivity } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress, useXpFor } from "../stores/progressStore";
import { CheckIcon, SparkIcon } from "./icons";

/**
 * Misión sorpresa del día. Las que se comprueban solas muestran "Completar" cuando ya se
 * cumplieron; las de la vida real ("da las gracias a alguien") se confirman con "Lo hice".
 */
export function SurpriseCard({ compact = false }: { compact?: boolean }) {
  const day = useProgress((s) => s.day);
  const done = useProgress((s) => (s.rewardedToday.surprise_mission ?? 0) > 0);
  const totalXp = useProgress((s) => s.totalXp);
  const celebrate = useProgress((s) => s.celebrate);
  const xp = useXpFor("surprise_mission") || XP_RULES.surprise_mission.xp;
  const mission = pickSurprise(SURPRISES, day);
  const facts = useAsync(() => getTodayFacts(day), `${day}-${totalXp}`);

  const manual = mission.check.type === "manual";
  const met = !done && !manual && facts.data ? surpriseMet(mission.check, facts.data) : false;

  const complete = async () => {
    await celebrate((await recordActivity("surprise_mission", { ref: mission.id })).awards);
  };

  const action = done ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
      <CheckIcon size={16} /> Hecha
    </span>
  ) : manual || met ? (
    <button
      onClick={complete}
      className="shrink-0 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-ink"
    >
      {manual ? "Lo hice" : "Completar"} <span className="font-normal opacity-80">+{xp}</span>
    </button>
  ) : mission.link ? (
    <Link
      to={mission.link.to}
      className="shrink-0 rounded-lg border border-accent px-3.5 py-1.5 text-sm font-semibold text-accent hover:bg-accent-soft"
    >
      {mission.link.label}
    </Link>
  ) : (
    <span className="shrink-0 text-xs text-muted">+{xp} XP al completarla</span>
  );

  const box = `rounded-2xl border border-dashed ${done ? "border-success/50 bg-success-soft/60" : "border-accent/60 bg-accent-soft/35"}`;

  if (compact) {
    return (
      <div className={`flex items-center gap-4 px-5 py-4 ${box}`}>
        <SparkIcon size={26} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">Misión sorpresa</p>
          <p className="font-semibold">{mission.title}</p>
          <p className="text-sm text-muted">{mission.description}</p>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col p-5 ${box}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-accent">
        <SparkIcon size={20} /> Misión sorpresa
      </p>
      <h3 className="mt-3 font-display text-xl font-semibold">{mission.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{mission.description}</p>
      <p className="mt-3 text-xs text-muted">
        {done
          ? "Listo por hoy. Mañana habrá otra."
          : manual
            ? "Esta es de la vida real: cuando la hagas, márcala tú."
            : met
              ? "Ya la cumpliste. Márcala para sumar el XP."
              : "Cuando la cumplas, aquí aparece el botón para completarla."}
      </p>
      <div className="mt-auto pt-4">{action}</div>
    </div>
  );
}

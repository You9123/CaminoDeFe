import { Fragment, type ComponentType } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { achievementViews, type AchievementView } from "../domain/achievements";
import { RANKS } from "../domain/ranks";
import { streakRewards, type CosmeticId, type StreakRewardView } from "../domain/cosmetics";
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS } from "../content/achievements";
import { getProgressSnapshot, getUnlockedAchievements } from "../data/achievementsRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";
import { ACHIEVEMENT_ICON, RANK_ICON } from "../components/badgeIcons";
import { Medallion } from "../components/Medallion";
import { MapIcon, OliveIcon, SealIcon, SparkIcon, SproutIcon } from "../components/icons";
import { Toggle } from "./settings/ui";

type Icon = ComponentType<{ size?: number; className?: string; duo?: boolean }>;

const REWARD_ICON: Record<CosmeticId, Icon> = {
  olive_branch: OliveIcon,
  pet_scarf: SparkIcon,
  leaves_background: SproutIcon,
  map_frame: MapIcon,
  golden_seal: SealIcon,
};

export function AchievementsScreen() {
  const { level, rank, streak, totalXp } = useProgress();
  // Se recarga cuando cambia el XP total (cada actividad o logro nuevo cambia el XP o deja rastro).
  const data = useAsync(async () => {
    const [snapshot, unlocked] = await Promise.all([getProgressSnapshot(), getUnlockedAchievements()]);
    return achievementViews(ACHIEVEMENTS, snapshot, unlocked);
  }, `${totalXp}-${streak.best}`);
  const views = data.data ?? [];
  const unlockedCount = views.filter((v) => v.unlockedAt).length;

  const RankIcon = RANK_ICON[rank.rank.id];
  const rankIndex = RANKS.findIndex((r) => r.id === rank.rank.id);

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <header className="animate-rise mb-8">
        <h1 className="font-display text-4xl font-semibold">Logros</h1>
        <p className="mt-1.5 text-muted">Marcas del camino. Miden el hábito, nunca la fe.</p>
      </header>

      {/* ---------- Rango ---------- */}
      <section className="animate-rise mb-10 rounded-3xl border border-border bg-surface px-8 py-7">
        <div className="flex items-center gap-6">
          <Medallion icon={RankIcon} unlocked size={92} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-accent">Tu rango · nivel {level.level}</p>
            <h2 className="mt-0.5 font-display text-3xl font-semibold">{rank.rank.title}</h2>
            <p className="mt-1 text-muted">{rank.rank.line}</p>
          </div>
          {rank.next && (
            <div className="text-right text-sm text-muted">
              <p>Siguiente</p>
              <p className="font-display text-lg font-semibold text-ink">{rank.next.title}</p>
              <p>
                en el nivel {rank.next.level}
                {rank.next.level - level.level === 1 ? " · falta 1" : ` · faltan ${rank.next.level - level.level}`}
              </p>
            </div>
          )}
        </div>

        <ol className="mt-7 flex items-start" aria-label="Rangos">
          {RANKS.map((r, i) => {
            const Icon = RANK_ICON[r.id];
            const reached = i <= rankIndex;
            return (
              <Fragment key={r.id}>
                {i > 0 && (
                  <li aria-hidden className="mt-[18px] flex-1 px-1">
                    <span
                      className={`block border-t-2 ${i <= rankIndex ? "border-accent" : "border-dashed border-border"}`}
                    />
                  </li>
                )}
                <li className="flex w-[76px] flex-col items-center text-center" title={`Nivel ${r.level}`}>
                  <Medallion icon={Icon} unlocked={reached} size={38} />
                  <span
                    className={`mt-1.5 text-[11px] leading-tight ${i === rankIndex ? "font-semibold text-ink" : "text-muted"}`}
                  >
                    {r.title}
                  </span>
                  <span className="text-[10px] text-muted/80">Nv. {r.level}</span>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </section>

      {/* ---------- Recompensas por racha ---------- */}
      <section className="animate-rise mb-10">
        <SectionTitle
          title="Recompensas por constancia"
          aside={`Récord de racha: ${streak.best} ${streak.best === 1 ? "día" : "días"}`}
        />
        <p className="mb-4 -mt-2 text-sm text-muted">
          Se ganan con tu récord, así que no se pierden aunque la racha se corte.
        </p>
        <div className="grid grid-cols-5 gap-3">
          {streakRewards(streak.best).map((r) => (
            <RewardCard key={r.id} reward={r} />
          ))}
        </div>
      </section>

      {/* ---------- Insignias ---------- */}
      <section className="animate-rise">
        <SectionTitle title="Insignias" aside={data.loading ? "" : `${unlockedCount} de ${views.length}`} />
        {ACHIEVEMENT_GROUPS.map((g) => {
          const items = views.filter((v) => v.group === g.id);
          if (items.length === 0) return null;
          return (
            <div key={g.id} className="mb-8">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{g.title}</h3>
              <div className="grid grid-cols-3 gap-3">
                {items.map((a) => (
                  <AchievementCard key={a.id} a={a} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {aside && <p className="text-sm text-muted tabular-nums">{aside}</p>}
    </div>
  );
}

const shortDate = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: es }).replace(".", "");

function AchievementCard({ a }: { a: AchievementView }) {
  const unlocked = a.unlockedAt !== null;
  const pct = Math.round((a.progress.current / a.progress.target) * 100);
  return (
    <div
      className={`flex gap-3.5 rounded-2xl border p-4 ${unlocked ? "border-border bg-surface" : "border-border/70 bg-surface/50"}`}
    >
      <Medallion icon={ACHIEVEMENT_ICON[a.icon]} unlocked={unlocked} size={52} />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold leading-snug ${unlocked ? "" : "text-ink/75"}`}>{a.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.description}</p>
        {unlocked ? (
          <p className="mt-2 text-xs text-muted">
            {shortDate(a.unlockedAt!)}
            {a.xp > 0 && <span className="ml-1.5 font-semibold text-accent">+{a.xp} XP</span>}
          </p>
        ) : (
          <div className="mt-2.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-border/80">
              <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted tabular-nums">
              {a.progress.current} / {a.progress.target}
              {a.xp > 0 && <span className="ml-1.5">· +{a.xp} XP</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RewardCard({ reward: r }: { reward: StreakRewardView }) {
  const off = useSettings((s) => s.cosmeticsOff.has(r.id));
  const setCosmetic = useSettings((s) => s.setCosmetic);
  const Icon = REWARD_ICON[r.id];
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border p-4 text-center ${r.unlocked ? "border-border bg-surface" : "border-border/70 bg-surface/50"}`}
    >
      <Medallion icon={Icon} unlocked={r.unlocked} gold={r.id === "golden_seal" && r.unlocked} size={52} />
      <p className="mt-2 text-xs font-semibold text-accent">{r.days} días</p>
      <p className={`font-semibold leading-snug ${r.unlocked ? "" : "text-ink/75"}`}>{r.title}</p>
      <p className="mt-1 text-[12px] leading-snug text-muted">{r.description}</p>
      <div className="mt-auto pt-3 text-[12px] text-muted">
        {!r.unlocked ? (
          <span className="tabular-nums">{r.daysLeft === 1 ? "Falta 1 día" : `Faltan ${r.daysLeft} días`}</span>
        ) : r.usedIn ? (
          <span>Ganada · {r.usedIn}</span>
        ) : r.toggle ? (
          <Toggle checked={!off} onChange={(v) => void setCosmetic(r.id, v)} label={off ? "Guardada" : "En uso"} />
        ) : null}
      </div>
    </div>
  );
}

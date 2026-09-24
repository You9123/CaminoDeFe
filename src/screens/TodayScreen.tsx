import { useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router";
import dailyVerses from "../../content/daily_verses.json";
import { gameDay, greeting } from "../domain/day";
import { pickDailyVerse } from "../domain/dailyVerse";
import { parseChapterRef } from "../domain/refs";
import type { MissionActivity } from "../domain/missions";
import { getVerseByRef } from "../data/bibleRepo";
import { getSetting, LAST_POSITION_KEY, recordActivity } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { XpBar } from "../components/XpBar";
import { StreakCard } from "../components/StreakCard";
import { MissionsCard } from "../components/MissionsCard";
import { PostReadingFlow, type FlowStep } from "../components/PostReadingFlow";
import { QuickSession } from "../components/QuickSession";
import { pickQuickVerse } from "../domain/quickSession";
import { BookIcon, CheckIcon, HourglassIcon, PeakIcon, SparkIcon, SunriseIcon } from "../components/icons";

export function TodayScreen() {
  const navigate = useNavigate();
  const { loaded, name, level, todayXp, chaptersRead, totalXp, streak, missions, celebrate } = useProgress();
  const day = gameDay();
  const [flowStep, setFlowStep] = useState<FlowStep | null>(null);
  const [quick, setQuick] = useState<{ ref: string; isDaily: boolean } | null>(null);

  const verse = useAsync(() => getVerseByRef(pickDailyVerse(dailyVerses.verses, day)), day);
  const verseRead = missions.missions.find((m) => m.id === "daily_verse")?.done ?? false;

  const markVerseRead = async () => {
    if (!verse.data) return;
    await celebrate((await recordActivity("daily_verse", { ref: verse.data.ref })).awards);
  };

  const onMission = (m: MissionActivity) => {
    if (m === "daily_verse") void markVerseRead();
    else setFlowStep(m);
  };

  const continueReading = async () => {
    const last = parseChapterRef((await getSetting(LAST_POSITION_KEY)) ?? "");
    navigate(last ? `/biblia/${last.book}/${last.chapter}` : "/biblia/GEN/1");
  };

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <header className="animate-rise mb-8">
        <h1 className="font-display text-4xl font-semibold">
          {greeting()}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-1.5 text-muted">Tu camino continúa.</p>
      </header>

      {loaded && !name && <NamePrompt />}

      <section className="animate-rise relative mb-6 overflow-hidden rounded-3xl border border-border bg-surface px-9 py-8 shadow-sm">
        <SunriseIcon size={140} className="pointer-events-none absolute -top-6 -right-6 text-accent opacity-[0.08]" />
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
          <SunriseIcon size={20} /> Versículo del día
        </p>
        {verse.data ? (
          <>
            <blockquote className="selectable font-reading text-[1.65rem] leading-relaxed">
              «{verse.data.text}»
            </blockquote>
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="font-display text-lg text-muted italic">{verse.data.label}</p>
              {verseRead ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckIcon size={16} /> Leído hoy
                </span>
              ) : (
                <button
                  onClick={markVerseRead}
                  className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
                >
                  Marcar como leído <span className="font-normal opacity-80">+10 XP</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted">{verse.loading ? "Cargando…" : "No se pudo cargar el versículo."}</p>
        )}
      </section>

      <div className="animate-rise mb-10 grid grid-cols-[2fr_1fr] gap-3">
        <button
          onClick={continueReading}
          className="flex items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-accent-ink shadow-sm transition hover:brightness-105 active:scale-[0.99]"
        >
          <BookIcon size={22} duo={false} />
          Continuar mi camino
        </button>
        <button
          onClick={() =>
            setQuick(pickQuickVerse(dailyVerses.verses, pickDailyVerse(dailyVerses.verses, day), verseRead))
          }
          className="flex items-center justify-center gap-2.5 rounded-2xl border border-accent bg-surface px-5 py-4 text-lg font-semibold text-accent transition hover:bg-accent-soft/60 active:scale-[0.99]"
          title="Un versículo, una reflexión y un minuto de oración"
        >
          <HourglassIcon size={22} />
          Tengo 5 minutos
        </button>
      </div>

      <section className="animate-rise mb-4 grid grid-cols-[3fr_2fr] gap-4">
        <MissionsCard progress={missions} onAction={onMission} />
        <StreakCard streak={streak} />
      </section>

      <section className="animate-rise grid grid-cols-3 gap-4">
        <Stat label="Nivel" value={level.level} icon={PeakIcon}>
          <div className="mt-3">
            <XpBar level={level} compact />
          </div>
        </Stat>
        <Stat label="XP de hoy" value={todayXp} icon={SparkIcon} hint={`${totalXp} XP en total`} />
        <Stat label="Capítulos leídos" value={chaptersRead} icon={BookIcon} />
      </section>

      {quick && <QuickSession verseRef={quick.ref} isDaily={quick.isDaily} onClose={() => setQuick(null)} />}

      {flowStep && verse.data && (
        <PostReadingFlow
          steps={[flowStep]}
          refId={verse.data.ref}
          refLabel={verse.data.label}
          onClose={() => setFlowStep(null)}
        />
      )}
    </div>
  );
}

function Stat(props: {
  label: string;
  value: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  hint?: string;
  children?: ReactNode;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="flex items-center gap-1.5 text-sm text-muted">
        <Icon size={18} className="text-accent" /> {props.label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{props.value}</p>
      {props.hint && <p className="mt-1 text-xs text-muted">{props.hint}</p>}
      {props.children}
    </div>
  );
}

function NamePrompt() {
  const setName = useProgress((s) => s.setName);
  const [value, setValue] = useState("");

  return (
    <form
      className="animate-rise mb-8 flex items-center gap-3 rounded-2xl border border-dashed border-accent bg-accent-soft/40 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) void setName(value);
      }}
    >
      <label className="flex-1">
        <span className="mb-1 block text-sm font-medium">Bienvenido. ¿Cómo te llamas?</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          placeholder="Tu nombre"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <button type="submit" className="self-end rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink">
        Guardar
      </button>
    </form>
  );
}

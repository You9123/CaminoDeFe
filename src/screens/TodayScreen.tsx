import { useState } from "react";
import { useNavigate } from "react-router";
import dailyVerses from "../../content/daily_verses.json";
import { greeting } from "../domain/day";
import { pickDailyVerse } from "../domain/dailyVerse";
import { parseChapterRef } from "../domain/refs";
import { continueTarget } from "../domain/today";
import { getSetting, LAST_POSITION_KEY } from "../data/progressRepo";
import { listBooks, refPath } from "../data/bibleRepo";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { bookName } from "../content/bookNames";
import { useAsync } from "../hooks/useAsync";
import { useDailyVerse } from "../hooks/useDailyVerse";
import { useProgress } from "../stores/progressStore";
import { DailyMissionsCard } from "../components/DailyMissionsCard";
import { SurpriseCard } from "../components/SurpriseCard";
import { EmotionCard } from "../components/EmotionCard";
import { ListenButton } from "../components/ListenButton";
import { PetCompanion } from "../components/pet/PetCompanion";
import { QuickSession } from "../components/QuickSession";
import { SessionPicker } from "../components/SessionPicker";
import { RecentDiscoveries } from "../components/RecentDiscoveries";
import { pickQuickVerse } from "../domain/quickSession";
import { BookIcon, CheckIcon, FlameIcon, HourglassIcon, OliveIcon, SunriseIcon } from "../components/icons";
import { isCosmeticActive } from "../domain/cosmetics";
import { useSettings } from "../stores/settingsStore";

/**
 * Hoy (V3.5, ADR-0013): cuatro bloques y nada más.
 * 1. Saludo, racha en una línea y la mascota (secundaria).
 * 2. La acción principal: "Continuar mi camino" con el capítulo, y "Tengo unos minutos".
 * 3. El versículo del día, compacto.
 * 4. Misiones del día (con la sorpresa) y descubrimientos recientes.
 * La emoción sigue siendo opcional y discreta. Nivel, XP y rango están en la barra lateral.
 */
export function TodayScreen() {
  const navigate = useNavigate();
  const { loaded, name, streak, totalXp } = useProgress();
  const cosmeticsOff = useSettings((s) => s.cosmeticsOff);
  const olive = isCosmeticActive("olive_branch", streak.best, cosmeticsOff);
  const [quick, setQuick] = useState<{ ref: string; isDaily: boolean } | null>(null);
  const [picking, setPicking] = useState(false);
  const { day, verse, verseRead, markVerseRead } = useDailyVerse();

  // A qué capítulo lleva "Continuar": el último abierto si quedó a medias, o el siguiente.
  const target = useAsync(async () => {
    const [last, books, { read }] = await Promise.all([
      getSetting(LAST_POSITION_KEY),
      listBooks(),
      getReadChapterMap(),
    ]);
    return continueTarget(parseChapterRef(last ?? ""), read, books);
  }, `${totalXp}`).latest;

  const continueReading = () => {
    const t = target ?? { book: "GEN", chapter: 1 };
    navigate(`/biblia/${t.book}/${t.chapter}`);
  };

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      {/* ---------- 1. Saludo ---------- */}
      <header className="animate-rise mb-7 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 font-display text-4xl font-semibold">
            <span>
              {greeting()}
              {name ? `, ${name}` : ""}.
            </span>
            {olive && (
              <span title="Ramita de olivo · recompensa por 3 días de racha">
                <OliveIcon size={34} className="-rotate-12 text-success [&_.duo]:fill-success-soft" />
              </span>
            )}
          </h1>
          {loaded && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <FlameIcon size={17} className="text-accent" />
              {streak.current > 0 ? (
                <>
                  <span className="font-semibold text-ink">
                    {streak.current} {streak.current === 1 ? "día" : "días"} de racha
                  </span>
                  · {streak.todayDone ? "hoy ya cuenta" : "cualquier actividad de hoy la mantiene"}
                </>
              ) : (
                "Cualquier actividad de hoy empieza una racha nueva."
              )}
            </p>
          )}
        </div>
        <PetCompanion />
      </header>

      {loaded && <EmotionCard />}

      {/* ---------- 2. Acción principal ---------- */}
      <div className="animate-rise mb-6 grid grid-cols-[3fr_2fr] gap-3">
        <button
          onClick={continueReading}
          className="flex items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-4 text-accent-ink shadow-sm transition hover:brightness-105 active:scale-[0.99]"
        >
          <BookIcon size={24} duo={false} />
          <span className="text-left leading-tight">
            <span className="block text-lg font-semibold">Continuar mi camino</span>
            <span className="block text-sm opacity-85">
              {target ? `${bookName(target.book) ?? target.book} ${target.chapter}` : " "}
            </span>
          </span>
        </button>
        <button
          onClick={() => setPicking(true)}
          className="flex items-center justify-center gap-2.5 rounded-2xl border border-accent/70 bg-surface px-5 py-4 font-semibold text-accent transition hover:bg-accent-soft/60 active:scale-[0.99]"
          title="Una sesión de 5, 10, 15 o 30 minutos"
        >
          <HourglassIcon size={21} />
          Tengo unos minutos
        </button>
      </div>

      {/* ---------- 3. Versículo del día ---------- */}
      <section className="animate-rise relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-5">
        <SunriseIcon size={96} className="pointer-events-none absolute -top-4 -right-4 text-accent opacity-[0.07]" />
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
          <SunriseIcon size={18} /> Versículo del día
        </p>
        {verse.data ? (
          <>
            <blockquote className="selectable font-reading text-[1.25rem] leading-relaxed">
              «{verse.data.text}»
            </blockquote>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="mr-auto font-display text-muted italic">{verse.data.label}</p>
              <button
                onClick={() => navigate(refPath(verse.data!.ref))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"
              >
                <BookIcon size={17} duo={false} /> Leer el contexto
              </button>
              <ListenButton text={verse.data.text} label={verse.data.label} />
              {verseRead ? (
                <span className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-success">
                  <CheckIcon size={16} /> Leído hoy
                </span>
              ) : (
                <button
                  onClick={markVerseRead}
                  className="rounded-xl border border-accent px-3.5 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
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

      {/* ---------- 4. Misiones y descubrimientos ---------- */}
      <section className="animate-rise grid grid-cols-[3fr_2fr] items-start gap-4">
        <div className="flex flex-col gap-3">
          <DailyMissionsCard compact />
          <SurpriseCard compact />
        </div>
        <RecentDiscoveries />
      </section>

      {picking && (
        <SessionPicker
          onClose={() => setPicking(false)}
          onQuick={() =>
            setQuick(pickQuickVerse(dailyVerses.verses, pickDailyVerse(dailyVerses.verses, day), verseRead))
          }
        />
      )}

      {quick && <QuickSession verseRef={quick.ref} isDaily={quick.isDaily} onClose={() => setQuick(null)} />}
    </div>
  );
}

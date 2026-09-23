import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Play } from "lucide-react";
import dailyVerses from "../../content/daily_verses.json";
import { gameDay, greeting } from "../domain/day";
import { pickDailyVerse } from "../domain/dailyVerse";
import { parseChapterRef } from "../domain/refs";
import { getVerseByRef } from "../data/bibleRepo";
import { getSetting, LAST_POSITION_KEY } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { XpBar } from "../components/XpBar";

export function TodayScreen() {
  const navigate = useNavigate();
  const { loaded, name, level, todayXp, chaptersRead, totalXp } = useProgress();
  const day = gameDay();

  const verse = useAsync(() => getVerseByRef(pickDailyVerse(dailyVerses.verses, day)), day);

  const continueReading = async () => {
    const last = parseChapterRef((await getSetting(LAST_POSITION_KEY)) ?? "");
    navigate(last ? `/biblia/${last.book}/${last.chapter}` : "/biblia/GEN/1");
  };

  return (
    <div className="mx-auto max-w-3xl px-10 py-12">
      <header className="animate-rise mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting()}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-1 text-muted">Tu camino continúa…</p>
      </header>

      {loaded && !name && <NamePrompt />}

      <section className="animate-rise mb-8 rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-accent">🌅 Versículo del día</p>
        {verse.data ? (
          <>
            <blockquote className="selectable font-reading text-2xl leading-relaxed">“{verse.data.text}”</blockquote>
            <p className="mt-4 text-muted">— {verse.data.label}</p>
          </>
        ) : (
          <p className="text-muted">{verse.loading ? "Cargando…" : "No se pudo cargar el versículo."}</p>
        )}
      </section>

      <button
        onClick={continueReading}
        className="animate-rise mb-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-accent-ink shadow-sm transition hover:brightness-105 active:scale-[0.99]"
      >
        <Play size={20} fill="currentColor" />
        Continuar mi camino
      </button>

      <section className="animate-rise grid grid-cols-3 gap-4">
        <Stat label="Nivel" value={level.level} icon="⭐">
          <div className="mt-3">
            <XpBar level={level} compact />
          </div>
        </Stat>
        <Stat label="XP de hoy" value={todayXp} icon="✨" hint={`${totalXp} XP en total`} />
        <Stat label="Capítulos leídos" value={chaptersRead} icon="📖" />
      </section>
    </div>
  );
}

function Stat(props: { label: string; value: number; icon: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">
        {props.icon} {props.label}
      </p>
      <p className="mt-1 text-3xl font-semibold">{props.value}</p>
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
      className="animate-rise mb-8 flex items-center gap-3 rounded-2xl border border-dashed border-accent bg-accent-soft/50 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) void setName(value);
      }}
    >
      <label className="flex-1">
        <span className="mb-1 block text-sm font-medium">¡Bienvenido! ¿Cómo te llamas?</span>
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

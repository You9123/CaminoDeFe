import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Clock } from "lucide-react";
import { getChapter, listBooks, type Book } from "../data/bibleRepo";
import {
  getReadChapters,
  LAST_POSITION_KEY,
  recordChapterRead,
  setSetting,
  type ChapterReadResult,
} from "../data/progressRepo";
import { chapterRef } from "../domain/refs";
import { estimatedReadSeconds, formatMinutes, minSecondsToCount } from "../domain/reading";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";

type Nav = { code: string; chapter: number; label: string } | null;

function neighbours(books: Book[], book: Book, chapter: number): { prev: Nav; next: Nav } {
  const i = books.findIndex((b) => b.id === book.id);
  const prevBook = books[i - 1];
  const nextBook = books[i + 1];
  const prev: Nav =
    chapter > 1
      ? { code: book.code, chapter: chapter - 1, label: `${book.name} ${chapter - 1}` }
      : prevBook
        ? { code: prevBook.code, chapter: prevBook.chapters, label: `${prevBook.name} ${prevBook.chapters}` }
        : null;
  const next: Nav =
    chapter < book.chapters
      ? { code: book.code, chapter: chapter + 1, label: `${book.name} ${chapter + 1}` }
      : nextBook
        ? { code: nextBook.code, chapter: 1, label: `${nextBook.name} 1` }
        : null;
  return { prev, next };
}

/** Segundos con la ventana visible desde que se montó el componente. */
function useVisibleSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return seconds;
}

export function ReaderScreen() {
  const { code = "", chapter = "1" } = useParams();
  // La `key` hace que React cree un lector nuevo (estado y temporizador en cero) al cambiar de capítulo.
  return <ChapterReader key={`${code}.${chapter}`} code={code} chapterNum={Number(chapter)} />;
}

function ChapterReader({ code, chapterNum }: { code: string; chapterNum: number }) {
  const key = `${code}.${chapterNum}`;
  const navigate = useNavigate();

  const { data, loading } = useAsync(async () => {
    const [chapter, books] = await Promise.all([getChapter(code, chapterNum), listBooks()]);
    if (!chapter) return null;
    const read = await getReadChapters(chapter.book.id);
    return { chapter, alreadyRead: read.has(chapterNum), ...neighbours(books, chapter.book, chapterNum) };
  }, key);

  const elapsed = useVisibleSeconds();
  const [result, setResult] = useState<(ChapterReadResult & { levelUp: number | null }) | null>(null);
  const [saving, setSaving] = useState(false);
  const refresh = useProgress((s) => s.refresh);

  useEffect(() => {
    window.document.querySelector("main")?.scrollTo({ top: 0 });
    if (code) void setSetting(LAST_POSITION_KEY, chapterRef(code, chapterNum));
  }, [code, chapterNum]);

  if (loading && !data) return null;
  if (!data) return <p className="p-10 text-muted">No se encontró ese capítulo.</p>;

  const { chapter, prev, next, alreadyRead } = data;
  const minSeconds = minSecondsToCount(chapter.words);
  const remaining = Math.max(0, minSeconds - elapsed);

  const finish = async () => {
    setSaving(true);
    try {
      const before = useProgress.getState().level.level;
      const res = await recordChapterRead({
        bookId: chapter.book.id,
        bookCode: chapter.book.code,
        chapter: chapter.chapter,
        durationSec: elapsed,
      });
      await refresh();
      const after = useProgress.getState().level.level;
      setResult({ ...res, levelUp: after > before ? after : null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-8 pb-40 pt-10">
      <div className="mb-8 flex items-center justify-between text-sm text-muted">
        <Link to={`/biblia/${chapter.book.code}`} className="inline-flex items-center gap-2 hover:text-accent">
          <ArrowLeft size={16} /> {chapter.book.name}
        </Link>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} /> {formatMinutes(estimatedReadSeconds(chapter.words))} de lectura
        </span>
      </div>

      <h1 className="mb-8 text-center font-reading text-4xl">
        {chapter.book.name} <span className="text-accent">{chapter.chapter}</span>
      </h1>

      <article className="selectable font-reading text-[1.3rem] leading-[1.85]">
        {chapter.verses.map((v) => (
          <span key={v.verse}>
            <sup className="mr-1 ml-0.5 font-ui text-[0.62em] font-semibold text-accent">{v.verse}</sup>
            {v.text}{" "}
          </span>
        ))}
      </article>

      <div className="mt-14 flex justify-between gap-4 text-sm">
        {prev ? (
          <button
            onClick={() => navigate(`/biblia/${prev.code}/${prev.chapter}`)}
            className="inline-flex items-center gap-1 text-muted hover:text-accent"
          >
            <ChevronLeft size={16} /> {prev.label}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button
            onClick={() => navigate(`/biblia/${next.code}/${next.chapter}`)}
            className="inline-flex items-center gap-1 text-muted hover:text-accent"
          >
            {next.label} <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-surface/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          {result ? (
            <ResultMessage result={result} />
          ) : (
            <p className="text-sm text-muted">
              {alreadyRead
                ? "Ya habías leído este capítulo antes. ¡Releer también cuenta!"
                : "Lee con calma. Cuando termines, márcalo."}
            </p>
          )}

          {result ? (
            next && (
              <button
                onClick={() => navigate(`/biblia/${next.code}/${next.chapter}`)}
                className="shrink-0 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink"
              >
                Siguiente: {next.label}
              </button>
            )
          ) : (
            <button
              onClick={finish}
              disabled={remaining > 0 || saving}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink transition disabled:cursor-not-allowed disabled:opacity-50"
              title={remaining > 0 ? "Se habilita después de un tiempo mínimo de lectura" : undefined}
            >
              <Check size={18} />
              {remaining > 0 ? `Terminé (en ${formatClock(remaining)})` : "Terminé este capítulo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultMessage({ result }: { result: ChapterReadResult & { levelUp: number | null } }) {
  if (result.xpGained === 0) {
    return (
      <p className="text-sm text-muted">Ya lo leíste hoy: no suma XP otra vez, ¡pero qué bueno que volviste a él! 🙌</p>
    );
  }
  const bonus = result.awards.find((a) => a.type === "bonus_5_chapters");
  return (
    <div className="animate-rise">
      <p className="font-semibold text-success">
        +{result.xpGained} XP {bonus && <span className="font-normal">(incluye bono de 5 capítulos hoy 🎉)</span>}
      </p>
      {result.levelUp && <p className="text-sm text-accent">⭐ ¡Subiste al nivel {result.levelUp}!</p>}
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

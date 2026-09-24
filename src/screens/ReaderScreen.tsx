import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { getChapter, listBooks, type Book } from "../data/bibleRepo";
import {
  getReadChapters,
  LAST_POSITION_KEY,
  recordChapterRead,
  setSetting,
  type ChapterReadResult,
} from "../data/progressRepo";
import { getChapterMarks, HIGHLIGHT_COLORS, updateMarks, type HighlightColor } from "../data/marksRepo";
import { chapterRef, versesLabel } from "../domain/refs";
import { estimatedReadSeconds, formatMinutes, minSecondsToCount } from "../domain/reading";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { toast } from "../stores/toastStore";
import { PostReadingFlow } from "../components/PostReadingFlow";
import { BookmarkIcon, CheckIcon, CopyIcon, QuillIcon } from "../components/icons";

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
  const [params] = useSearchParams();
  const target = Number(params.get("v")) || null;
  // La `key` hace que React cree un lector nuevo (estado y temporizador en cero) al cambiar de capítulo.
  return <ChapterReader key={`${code}.${chapter}`} code={code} chapterNum={Number(chapter)} targetVerse={target} />;
}

const SWATCH: Record<HighlightColor, string> = {
  yellow: "var(--hl-yellow)",
  green: "var(--hl-green)",
  blue: "var(--hl-blue)",
  rose: "var(--hl-rose)",
};

function ChapterReader({
  code,
  chapterNum,
  targetVerse,
}: {
  code: string;
  chapterNum: number;
  targetVerse: number | null;
}) {
  const key = `${code}.${chapterNum}`;
  const navigate = useNavigate();

  const { data, loading } = useAsync(async () => {
    const [chapter, books] = await Promise.all([getChapter(code, chapterNum), listBooks()]);
    if (!chapter) return null;
    const read = await getReadChapters(chapter.book.id);
    return { chapter, alreadyRead: read.has(chapterNum), ...neighbours(books, chapter.book, chapterNum) };
  }, key);

  const [marksVersion, setMarksVersion] = useState(0);
  const marks = useAsync(() => getChapterMarks(code, chapterNum), `${key}:${marksVersion}`).data;
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const elapsed = useVisibleSeconds();
  const [result, setResult] = useState<(ChapterReadResult & { levelUp: number | null }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const celebrate = useProgress((s) => s.celebrate);

  useEffect(() => {
    if (code) void setSetting(LAST_POSITION_KEY, chapterRef(code, chapterNum));
  }, [code, chapterNum]);

  // Al llegar desde el buscador o favoritos, lleva la vista al versículo.
  useEffect(() => {
    const main = window.document.querySelector("main");
    if (!data) return;
    const el = targetVerse ? document.getElementById(`v-${targetVerse}`) : null;
    if (el) el.scrollIntoView({ block: "center" });
    else main?.scrollTo({ top: 0 });
  }, [data, targetVerse]);

  if (loading && !data) return null;
  if (!data) return <p className="p-10 text-muted">No se encontró ese capítulo.</p>;

  const { chapter, prev, next, alreadyRead } = data;
  const minSeconds = minSecondsToCount(chapter.words);
  const remaining = Math.max(0, minSeconds - elapsed);
  const selectedList = [...selected].sort((a, b) => a - b);
  const selectedRefs = selectedList.map((v) => `${chapter.book.code}.${chapter.chapter}.${v}`);
  const allFavorite = selectedList.length > 0 && selectedList.every((v) => marks?.get(v)?.favorite);

  const toggleVerse = (verse: number) => {
    // Si el usuario está seleccionando texto con el mouse, no cambiamos la selección de versículos.
    if (window.getSelection()?.toString()) return;
    const s = new Set(selected);
    if (s.has(verse)) s.delete(verse);
    else s.add(verse);
    setSelected(s);
  };

  const applyMarks = async (change: { color?: HighlightColor | null; favorite?: boolean }) => {
    await updateMarks(selectedRefs, change);
    setMarksVersion((v) => v + 1);
    if (change.favorite === true) toast("Guardado en favoritos", "info");
    if (change.color !== undefined) setSelected(new Set());
  };

  const copySelected = async () => {
    const text = chapter.verses
      .filter((v) => selected.has(v.verse))
      .map((v) => v.text)
      .join(" ");
    const label = `${chapter.book.name} ${chapter.chapter}:${versesLabel(selectedList)}`;
    await navigator.clipboard.writeText(`«${text}» — ${label} (RV1909)`);
    toast("Copiado", "info");
    setSelected(new Set());
  };

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
      await celebrate(res.awards);
      const after = useProgress.getState().level.level;
      setResult({ ...res, levelUp: after > before ? after : null });
      setShowFlow(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-8 pt-10 pb-48">
      <div className="mb-8 flex items-center justify-between text-sm text-muted">
        <Link to={`/biblia/${chapter.book.code}`} className="inline-flex items-center gap-2 hover:text-accent">
          <ArrowLeft size={16} /> {chapter.book.name}
        </Link>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} /> {formatMinutes(estimatedReadSeconds(chapter.words))} de lectura
        </span>
      </div>

      <h1 className="mb-8 text-center font-display text-5xl font-semibold">
        {chapter.book.name} <span className="text-accent">{chapter.chapter}</span>
      </h1>

      <article className="selectable font-reading leading-[1.9]" style={{ fontSize: "var(--reading-size)" }}>
        {chapter.verses.map((v) => {
          const mark = marks?.get(v.verse);
          const isSelected = selected.has(v.verse);
          return (
            <span
              key={v.verse}
              id={`v-${v.verse}`}
              onClick={() => toggleVerse(v.verse)}
              className={`cursor-pointer rounded-[3px] transition-colors ${
                isSelected ? "underline decoration-accent decoration-2 underline-offset-[6px]" : ""
              } ${v.verse === targetVerse ? "animate-flash" : ""}`}
              style={mark?.color ? { backgroundColor: SWATCH[mark.color] } : undefined}
            >
              <sup className="mr-1 ml-0.5 font-ui text-[0.6em] font-semibold text-accent">
                {v.verse}
                {mark?.favorite && <BookmarkIcon size={11} filled className="-mt-0.5 ml-0.5 inline" />}
              </sup>
              {v.text}{" "}
            </span>
          );
        })}
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

      {/* Herramientas para los versículos seleccionados */}
      {selectedList.length > 0 && (
        <div className="animate-rise fixed right-0 bottom-24 left-60 z-30 flex justify-center px-8">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 shadow-lg">
            <span className="px-2 text-sm text-muted">
              {chapter.book.name} {chapter.chapter}:{versesLabel(selectedList)}
            </span>
            <span className="h-6 w-px bg-border" />
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => applyMarks({ color: c })}
                className="h-7 w-7 rounded-full border border-border transition hover:scale-110"
                style={{ backgroundColor: SWATCH[c] }}
                aria-label={`Resaltar en ${c}`}
                title="Resaltar"
              />
            ))}
            <button
              onClick={() => applyMarks({ color: null })}
              className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-ink"
              title="Quitar resaltado"
            >
              Sin color
            </button>
            <span className="h-6 w-px bg-border" />
            <button
              onClick={() => applyMarks({ favorite: !allFavorite })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-2 ${allFavorite ? "text-accent" : ""}`}
            >
              <BookmarkIcon size={17} filled={allFavorite} /> {allFavorite ? "Quitar favorito" : "Favorito"}
            </button>
            <button
              onClick={copySelected}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-2"
            >
              <CopyIcon size={17} /> Copiar
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior */}
      <div className="fixed right-0 bottom-0 left-60 z-20 border-t border-border bg-surface/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            {result ? (
              <ResultMessage result={result} />
            ) : (
              <p className="text-sm text-muted">
                {alreadyRead
                  ? "Ya habías leído este capítulo. Releer también cuenta."
                  : "Lee con calma. Cuando termines, márcalo."}
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setShowFlow(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-accent px-4 py-2.5 font-semibold text-accent hover:bg-accent-soft"
              title="Abrir la reflexión, la oración y la aplicación de este capítulo"
            >
              <QuillIcon size={18} />
              Reflexionar, orar, aplicar
            </button>
            {result ? (
              next && (
                <button
                  onClick={() => navigate(`/biblia/${next.code}/${next.chapter}`)}
                  className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink"
                >
                  Siguiente: {next.label}
                </button>
              )
            ) : (
              <button
                onClick={finish}
                disabled={remaining > 0 || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink transition disabled:cursor-not-allowed disabled:opacity-50"
                title={remaining > 0 ? "Se habilita después de un tiempo mínimo de lectura" : undefined}
              >
                <CheckIcon size={18} />
                {remaining > 0 ? `Terminé (en ${formatClock(remaining)})` : "Terminé este capítulo"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showFlow && (
        <PostReadingFlow
          steps={["reflection", "prayer", "application"]}
          refId={chapterRef(chapter.book.code, chapter.chapter)}
          refLabel={`${chapter.book.name} ${chapter.chapter}`}
          onClose={() => setShowFlow(false)}
        />
      )}
    </div>
  );
}

function ResultMessage({ result }: { result: ChapterReadResult & { levelUp: number | null } }) {
  if (result.xpGained === 0) {
    return <p className="text-sm text-muted">Ya lo habías leído hoy, así que no suma XP de nuevo.</p>;
  }
  const bonus = result.awards.some((a) => a.type === "bonus_5_chapters");
  return (
    <div className="animate-rise">
      <p className="font-semibold text-success">
        +{result.xpGained} XP {bonus && <span className="font-normal">(incluye el bono de cinco capítulos)</span>}
      </p>
      {result.levelUp && <p className="text-sm text-accent">Llegaste al nivel {result.levelUp}</p>}
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { listBooks, refLabel } from "../data/bibleRepo";
import { listJournalEntries } from "../data/journalRepo";
import { EMOTION_BY_ID } from "../content/emotions";
import type { EmotionId } from "../domain/emotions";
import {
  exportDayTitle,
  groupForExport,
  journalFileName,
  journalToMarkdown,
  kindLabel,
  type ExportEntry,
} from "../domain/journalExport";
import { useProgress } from "../stores/progressStore";
import { toast } from "../stores/toastStore";
import { ArchiveIcon } from "./icons";

async function exportEntries(): Promise<ExportEntry[]> {
  const [entries, books] = await Promise.all([listJournalEntries({}), listBooks()]);
  return entries.map((e) => ({
    day: e.day,
    kind: e.kind,
    content: e.content,
    created_at: e.created_at,
    refLabel: e.ref ? refLabel(e.ref, books) : null,
    emotionLabel: e.emotion ? (EMOTION_BY_ID.get(e.emotion as EmotionId)?.label ?? null) : null,
  }));
}

const today = () => format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

/** Botón "Exportar" del diario: Markdown (.md) o PDF (con el diálogo de impresión). */
export function JournalExportButton() {
  const name = useProgress((s) => s.name);
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState<ExportEntry[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // El menú se cierra al hacer clic fuera de él.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toMarkdown = async () => {
    setOpen(false);
    const entries = await exportEntries();
    if (entries.length === 0) return toast("Tu diario todavía está vacío", "info");
    const path = await save({
      defaultPath: journalFileName(),
      filters: [{ name: "Markdown", extensions: ["md"] }],
      title: "Guardar el diario",
    });
    if (!path) return;
    try {
      const md = journalToMarkdown(entries, { name, exportedOn: today() });
      await invoke("write_markdown_file", { path, contents: md });
      toast("Diario guardado", "info");
    } catch (e) {
      toast(String(e), "info");
    }
  };

  const toPdf = async () => {
    setOpen(false);
    const entries = await exportEntries();
    if (entries.length === 0) return toast("Tu diario todavía está vacío", "info");
    setPrinting(entries);
  };

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-semibold text-muted hover:border-accent hover:text-accent"
        aria-expanded={open}
      >
        <ArchiveIcon size={18} /> Exportar
      </button>
      {open && (
        <div className="animate-rise absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <button
            onClick={() => void toMarkdown()}
            className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
          >
            <span className="block font-semibold">Markdown (.md)</span>
            <span className="text-xs text-muted">Texto simple que se abre en cualquier editor.</span>
          </button>
          <button onClick={() => void toPdf()} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-surface-2">
            <span className="block font-semibold">PDF</span>
            <span className="text-xs text-muted">Se abre el diálogo de impresión: elige «Guardar como PDF».</span>
          </button>
        </div>
      )}
      {printing && <PrintJournal entries={printing} name={name} onDone={() => setPrinting(null)} />}
    </div>
  );
}

/**
 * Versión para papel del diario. Se dibuja fuera de la app (en <body>) y el CSS de impresión
 * esconde todo lo demás. Al cerrar el diálogo de impresión, desaparece.
 */
function PrintJournal({ entries, name, onDone }: { entries: ExportEntry[]; name: string; onDone: () => void }) {
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    // Un momento para que se dibuje antes de abrir el diálogo.
    const id = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("afterprint", after);
    };
  }, [onDone]);

  return createPortal(
    <div id="print-root">
      <h1>{name ? `Diario de ${name}` : "Mi diario"}</h1>
      <p className="print-meta">
        Camino de Fe · exportado el {today()} · {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
      </p>
      {groupForExport(entries).map((g) => (
        <section key={g.day}>
          <h2>{exportDayTitle(g.day)}</h2>
          {g.entries.map((e, i) => (
            <article key={i}>
              <h3>{[kindLabel(e.kind), e.refLabel].filter(Boolean).join(" · ")}</h3>
              <p>{e.content}</p>
              {e.emotionLabel && <p className="print-meta">Ese día me sentía: {e.emotionLabel.toLowerCase()}</p>}
            </article>
          ))}
        </section>
      ))}
    </div>,
    document.body,
  );
}

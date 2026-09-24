import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { X } from "lucide-react";
import { listBooks, refLabel, refPath, type Book } from "../data/bibleRepo";
import {
  addJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
  type JournalKind,
} from "../data/journalRepo";
import { formatDayLong } from "../domain/day";
import { useAsync } from "../hooks/useAsync";
import { JournalIcon, PenIcon, QuillIcon, SearchIcon, SproutIcon, TrashIcon } from "../components/icons";

const KINDS: Record<JournalKind, { label: string; icon: ComponentType<{ size?: number; className?: string }> }> = {
  reflection: { label: "Reflexión", icon: QuillIcon },
  application: { label: "Aplicación", icon: SproutIcon },
  free: { label: "Nota", icon: JournalIcon },
};

const FILTERS: { value: JournalKind | null; label: string }[] = [
  { value: null, label: "Todo" },
  { value: "reflection", label: "Reflexiones" },
  { value: "application", label: "Aplicaciones" },
  { value: "free", label: "Notas" },
];

const PROMPTS = ["Hoy leí…", "Me llamó la atención…", "Hoy estoy agradecido por…", "Quiero pedirle a Dios…"];

export function JournalScreen() {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<JournalKind | null>(null);
  const [version, setVersion] = useState(0);
  const [composing, setComposing] = useState(false);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchText), 250);
    return () => window.clearTimeout(id);
  }, [searchText]);

  const { data } = useAsync(async () => {
    const [entries, books] = await Promise.all([listJournalEntries({ search, kind }), listBooks()]);
    return { entries, books };
  }, `journal:${search}:${kind}:${version}`);

  const groups = groupByDay(data?.entries ?? []);
  const filtering = Boolean(search || kind);

  return (
    <div className="mx-auto max-w-3xl px-10 py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Mi diario</h1>
          <p className="mt-1.5 text-muted">
            Tus reflexiones, compromisos y notas. Solo se guardan en esta computadora.
          </p>
        </div>
        {!composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink"
          >
            <PenIcon size={18} /> Escribir
          </button>
        )}
      </header>

      {composing && (
        <Composer
          onCancel={() => setComposing(false)}
          onSaved={() => {
            setComposing(false);
            reload();
          }}
        />
      )}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-accent">
          <SearchIcon size={18} className="text-muted" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar en tu diario"
            className="flex-1 bg-transparent outline-none"
          />
        </label>
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setKind(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                kind === f.value ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {data && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          <JournalIcon size={36} className="mx-auto mb-3 text-accent" />
          {filtering ? (
            <p>No hay entradas que coincidan.</p>
          ) : (
            <>
              <p>Tu diario está vacío por ahora.</p>
              <p className="mt-1 text-sm">
                Se llena solo con lo que escribes después de leer, o puedes empezar con <strong>Escribir</strong>.
              </p>
            </>
          )}
        </div>
      )}

      {groups.map(({ day, entries }) => (
        <section key={day} className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">{formatDayLong(day)}</h2>
          <div className="flex flex-col gap-3">
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} books={data?.books ?? []} onChanged={reload} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupByDay(entries: JournalEntry[]): { day: string; entries: JournalEntry[] }[] {
  const groups: { day: string; entries: JournalEntry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.day === e.day) last.entries.push(e);
    else groups.push({ day: e.day, entries: [e] });
  }
  return groups;
}

function Composer({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const addPrompt = (p: string) => setText((t) => (t.trim() ? `${t.trimEnd()}\n\n${p} ` : `${p} `));

  const save = async () => {
    setSaving(true);
    try {
      await addJournalEntry({ kind: "free", content: text });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-rise mb-8 rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => addPrompt(p)}
            className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-accent hover:text-accent"
          >
            {p}
          </button>
        ))}
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={5000}
        placeholder="Escribe lo que tengas en el corazón hoy."
        className="w-full resize-y rounded-xl border border-border bg-bg p-3 font-reading leading-relaxed outline-none focus:border-accent"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl px-4 py-2 text-muted hover:bg-surface-2 hover:text-ink">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving || !text.trim()}
          className="rounded-xl bg-accent px-5 py-2 font-semibold text-accent-ink disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function EntryCard({ entry, books, onChanged }: { entry: JournalEntry; books: Book[]; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [text, setText] = useState(entry.content);
  const { label, icon: Icon } = KINDS[entry.kind] ?? KINDS.free;

  const save = async () => {
    if (!text.trim()) return;
    await updateJournalEntry(entry.id, text);
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    await deleteJournalEntry(entry.id);
    onChanged();
  };

  return (
    <article className="group rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <Icon size={18} className="text-accent" />
        <span className="font-semibold">{label}</span>
        {entry.ref && (
          <>
            <span className="text-muted">·</span>
            <Link to={refPath(entry.ref)} className="text-accent italic hover:underline">
              {refLabel(entry.ref, books)}
            </Link>
          </>
        )}
        <span className="ml-auto text-xs text-muted">{format(new Date(entry.created_at), "HH:mm")}</span>
        {!editing && !confirmDelete && (
          <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Editar"
              title="Editar"
            >
              <PenIcon size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Eliminar"
              title="Eliminar"
            >
              <TrashIcon size={16} />
            </button>
          </span>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={5000}
            className="w-full resize-y rounded-xl border border-border bg-bg p-3 font-reading leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-2 flex justify-end gap-2 text-sm">
            <button
              onClick={() => {
                setText(entry.content);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button onClick={save} className="rounded-lg bg-accent px-4 py-1.5 font-semibold text-accent-ink">
              Guardar cambios
            </button>
          </div>
        </>
      ) : (
        <p className="selectable font-reading leading-relaxed whitespace-pre-wrap">{entry.content}</p>
      )}

      {confirmDelete && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span>¿Eliminar esta entrada? No se puede deshacer.</span>
          <span className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1 hover:bg-surface">
              <X size={14} className="mr-1 inline" />
              Cancelar
            </button>
            <button onClick={remove} className="rounded-lg bg-ink px-3 py-1 font-semibold text-bg">
              Eliminar
            </button>
          </span>
        </div>
      )}
    </article>
  );
}

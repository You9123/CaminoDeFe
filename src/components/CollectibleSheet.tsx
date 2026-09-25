import { useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CATALOG } from "../content/collectibles";
import { bookName, chapterLabel } from "../content/bookNames";
import { collectibleImage } from "../content/collectibleImages";
import {
  collectibleKey,
  creditLine,
  erasOf,
  expandPassage,
  KIND_LABEL,
  passageLabel,
  passagesProgress,
  passageStart,
  relatedOf,
  unlockedAt,
  type Collectible,
} from "../domain/collectibles";
import { getReadChapterMap } from "../data/collectiblesRepo";
import { getVerseByRef, refPath } from "../data/bibleRepo";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../stores/progressStore";
import { COLLECTIBLE_ICON } from "./collectibleIcons";
import { Medallion } from "./Medallion";
import { Modal } from "./Modal";
import { BookIcon, CheckIcon, TimelineIcon } from "./icons";

const longDate = (iso: string) => format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });

/**
 * Ficha de un coleccionable: quién fue (o qué pasó, o qué lugar es), un versículo,
 * los capítulos clave para leer y con qué se relaciona. Carga sola lo que ya leíste.
 */
export function CollectibleSheet({
  item,
  onClose,
  onOpen,
}: {
  item: Collectible;
  onClose: () => void;
  /** Abrir otra ficha relacionada (sin cerrar el modal). */
  onOpen: (key: string) => void;
}) {
  const navigate = useNavigate();
  const totalXp = useProgress((s) => s.totalXp);
  const data = useAsync(getReadChapterMap, `${totalXp}`);
  const verse = useAsync(async () => (item.verse ? getVerseByRef(item.verse) : null), item.verse ?? "");

  const read = data.data?.read ?? new Set<string>();
  const p = passagesProgress(item.passages, read);
  const since = data.data ? unlockedAt(item, data.data.firstReadAt) : null;
  const Icon = COLLECTIBLE_ICON[item.icon];
  const eras = erasOf(item, CATALOG);
  const related = relatedOf(item, CATALOG);
  const kind = KIND_LABEL[item.kind];
  const image = collectibleImage(collectibleKey(item.kind, item.id));

  const go = (path: string) => {
    onClose();
    navigate(path);
  };
  const readPassage = (ref: string) => {
    const s = passageStart(ref);
    if (s) go(`/biblia/${s.code}/${s.chapter}`);
  };

  return (
    <Modal onClose={onClose} label={item.name} wide>
      {image && (
        <figure className="relative -mx-8 -mt-8 mb-5 h-[22rem] overflow-hidden rounded-t-3xl bg-surface-2">
          <img
            src={image.url}
            alt={image.title}
            className={`ficha-img h-full w-full object-cover ${p.unlocked || data.loading ? "" : "ficha-img-locked"}`}
            draggable={false}
          />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface via-surface/60 to-transparent"
          />
          <figcaption
            className="absolute right-5 bottom-2 max-w-[92%] truncate text-right text-[11px] text-muted"
            title={`${image.title}. ${creditLine(image)}`}
          >
            {image.title} · {creditLine(image)}
          </figcaption>
        </figure>
      )}
      <div className="flex items-center gap-5 pr-8">
        <Medallion icon={Icon} unlocked={p.unlocked} gold={p.complete} size={image ? 60 : 76} />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{kind.one}</p>
          <h2 className="font-display text-3xl leading-tight font-semibold">{item.name}</h2>
          <p className="mt-0.5 text-muted">{item.line}</p>
        </div>
      </div>

      <p className="mt-5 leading-relaxed">{item.summary}</p>

      {verse.data && (
        <figure className="mt-5 rounded-2xl bg-surface-2/70 px-5 py-4">
          <blockquote className="font-reading text-[1.05rem] leading-relaxed italic">«{verse.data.text}»</blockquote>
          <figcaption className="mt-1.5 text-right text-sm text-muted">
            <button onClick={() => go(refPath(verse.data!.ref))} className="hover:text-accent">
              {verse.data.label}
            </button>
          </figcaption>
        </figure>
      )}

      {/* ---------- Avance ---------- */}
      <div className="mt-6">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {p.complete ? "Ficha completa" : p.unlocked ? "Desbloqueada" : "Por descubrir"}
          </span>
          <span className="text-muted tabular-nums">
            {p.read} de {p.total} {p.total === 1 ? "capítulo clave" : "capítulos clave"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${p.complete ? "bg-gold" : "bg-accent"}`}
            style={{ width: `${(p.read / p.total) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          {since
            ? `Desde el ${longDate(since)}.`
            : `Se desbloquea al leer ${chapterLabel(p.next ?? item.passages[0])}.`}
        </p>
      </div>

      <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Dónde leerlo</h3>
      <div className="flex flex-wrap gap-2">
        {item.passages.map((ref) => {
          const done = expandPassage(ref).every((c) => read.has(c));
          return (
            <button
              key={ref}
              onClick={() => readPassage(ref)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition ${
                done
                  ? "border-accent/40 bg-accent-soft/60 text-ink hover:border-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent"
              }`}
              title={done ? "Leído" : "Abrir en el lector"}
            >
              {done ? <CheckIcon size={14} className="text-accent" /> : <BookIcon size={15} duo={false} />}
              {passageLabel(ref, bookName)}
            </button>
          );
        })}
      </div>

      {(eras.length > 0 || related.length > 0) && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Relacionado</h3>
          <div className="flex flex-wrap gap-2">
            {eras.map((e) => (
              <button
                key={e.id}
                onClick={() => go(`/linea-temporal?etapa=${e.id}`)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
                title="Ver en la línea temporal"
              >
                <TimelineIcon size={16} className="text-accent" duo={false} />
                {e.title}
              </button>
            ))}
            {related.map((r) => (
              <RelatedChip key={collectibleKey(r.kind, r.id)} item={r} read={read} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      <div className="mt-7 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
          Cerrar
        </button>
        <button
          onClick={() => readPassage(p.next ?? item.passages[0])}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink"
        >
          <BookIcon size={18} duo={false} />
          {p.complete ? "Leer otra vez" : `Leer ${chapterLabel(p.next!)}`}
        </button>
      </div>
    </Modal>
  );
}

/** Ficha pequeña (medallón + nombre) que abre otra ficha. */
export function RelatedChip({
  item,
  read,
  onOpen,
}: {
  item: Collectible;
  read: ReadonlySet<string>;
  onOpen: (key: string) => void;
}) {
  const p = passagesProgress(item.passages, read);
  return (
    <button
      onClick={() => onOpen(collectibleKey(item.kind, item.id))}
      className="inline-flex items-center gap-2 rounded-xl border border-border py-1 pr-3 pl-1 text-sm hover:border-accent hover:text-accent"
      title={`${KIND_LABEL[item.kind].one}${p.unlocked ? "" : " · por descubrir"}`}
    >
      <Medallion icon={COLLECTIBLE_ICON[item.icon]} unlocked={p.unlocked} gold={p.complete} size={28} />
      <span className={p.unlocked ? "" : "text-muted"}>{item.name}</span>
    </button>
  );
}

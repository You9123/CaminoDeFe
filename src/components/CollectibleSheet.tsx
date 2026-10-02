import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CATALOG } from "../content/collectibles";
import { bookName, chapterLabel, hintBookInfo } from "../content/bookNames";
import { collectibleImage } from "../content/collectibleImages";
import {
  collectibleKey,
  creditLine,
  discoveryHint,
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
import { BookIcon, CheckIcon, LockIcon, MapIcon, TimelineIcon } from "./icons";

const longDate = (iso: string) => format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });

/**
 * Ficha de un coleccionable: quién fue (o qué pasó, o qué lugar es), un versículo,
 * los capítulos clave para leer y con qué se relaciona. Carga sola lo que ya leíste.
 * Si todavía está bloqueada, se muestra cubierta de niebla y sin spoilers (ADR-0012).
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
  const [imageOpen, setImageOpen] = useState(false);
  const totalXp = useProgress((s) => s.totalXp);
  const data = useAsync(getReadChapterMap, `${totalXp}`);
  const verse = useAsync(async () => (item.verse ? getVerseByRef(item.verse) : null), item.verse ?? "");

  const map = data.latest;
  const read = map?.read ?? new Set<string>();
  const p = passagesProgress(item.passages, read);
  const since = map ? unlockedAt(item, map.firstReadAt) : null;
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

  useEffect(() => {
    if (!imageOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setImageOpen(false);
      }
    };
    // Capture phase: runs before the Modal's own Escape handler, so it closes
    // only the enlarged photo and leaves the ficha open behind it.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [imageOpen]);

  // Hasta saber qué leíste no se muestra nada: así una ficha bloqueada nunca deja ver su nombre.
  if (!map) return null;
  if (!p.unlocked) return <LockedSheet item={item} onClose={onClose} onGo={go} />;

  return (
    <>
      <Modal onClose={onClose} label={item.name} wide>
        {image && (
          <figure className="relative -mx-8 -mt-8 mb-5 h-[22rem] overflow-hidden rounded-t-3xl bg-surface-2">
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="block h-full w-full cursor-zoom-in"
              aria-label={`Ver imagen completa: ${image.title}`}
            >
              <img
                src={image.url}
                alt={image.title}
                className="ficha-img h-full w-full object-cover"
                draggable={false}
              />
            </button>
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
            <span className="font-semibold">{p.complete ? "Ficha completa" : "Descubierta"}</span>
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
          <p className="mt-1.5 text-[13px] text-muted">{since ? `Descubierta el ${longDate(since)}.` : " "}</p>
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
      {imageOpen &&
        image &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
            onMouseDown={(e) => e.target === e.currentTarget && setImageOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={image.title}
          >
            <button
              onClick={() => setImageOpen(false)}
              className="absolute top-4 right-4 z-10 rounded-lg bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60"
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>
            <img
              src={image.url}
              alt={image.title}
              className="max-h-full max-w-full rounded-2xl object-contain"
              draggable={false}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Ficha bloqueada: la pintura cubierta de niebla, un candado, "???", el tipo y en qué libro aparece.
 * Nada más: ni nombre, ni resumen, ni versículo, ni capítulo exacto, ni imagen nítida.
 */
function LockedSheet({
  item,
  onClose,
  onGo,
}: {
  item: Collectible;
  onClose: () => void;
  onGo: (path: string) => void;
}) {
  const kind = KIND_LABEL[item.kind];
  const image = collectibleImage(collectibleKey(item.kind, item.id));
  const hint = discoveryHint(item, hintBookInfo);
  return (
    <Modal onClose={onClose} label={`${kind.one} por descubrir`} wide>
      {image && (
        <figure aria-hidden className="relative -mx-8 -mt-8 mb-5 h-[22rem] overflow-hidden rounded-t-3xl bg-surface-2">
          <img src={image.url} alt="" className="ficha-fog h-full w-full object-cover" draggable={false} />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/35 p-4 text-white/90 backdrop-blur-sm">
              <LockIcon size={40} duo={false} />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        </figure>
      )}
      <div className="flex items-center gap-5 pr-8">
        <Medallion icon={LockIcon} unlocked={false} size={image ? 60 : 76} />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{kind.one} por descubrir</p>
          <h2 className="font-display text-3xl leading-tight font-semibold" aria-label="Nombre oculto">
            ???
          </h2>
          <p className="mt-0.5 text-muted">{hint.text}</p>
        </div>
      </div>

      <p className="mt-5 leading-relaxed text-muted">
        Esta ficha se descubre leyendo. Cuando llegues a su historia, la niebla se despeja y sabrás{" "}
        {item.kind === "character" ? "quién es" : item.kind === "place" ? "qué lugar es" : "qué pasó"}.
      </p>

      <div className="mt-7 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
          Cerrar
        </button>
        <button
          onClick={() => onGo(hint.book ? `/biblia/${hint.book}` : "/mapa")}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-ink"
        >
          {hint.book ? <BookIcon size={18} duo={false} /> : <MapIcon size={18} duo={false} />}
          {hint.book ? `Abrir ${bookName(hint.book) ?? hint.book}` : "Ver el mapa"}
        </button>
      </div>
    </Modal>
  );
}

/** Ficha pequeña (medallón + nombre) que abre otra ficha. Bloqueada: candado y "???". */
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
  const kind = KIND_LABEL[item.kind].one;
  return (
    <button
      onClick={() => onOpen(collectibleKey(item.kind, item.id))}
      className="inline-flex items-center gap-2 rounded-xl border border-border py-1 pr-3 pl-1 text-sm hover:border-accent hover:text-accent"
      title={p.unlocked ? kind : `${kind} por descubrir`}
    >
      <Medallion
        icon={p.unlocked ? COLLECTIBLE_ICON[item.icon] : LockIcon}
        unlocked={p.unlocked}
        gold={p.complete}
        size={28}
      />
      {p.unlocked ? (
        <span>{item.name}</span>
      ) : (
        <span className="text-muted" aria-label={`${kind} por descubrir`}>
          ???
        </span>
      )}
    </button>
  );
}

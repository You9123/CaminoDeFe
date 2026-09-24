import { useState } from "react";
import { Link } from "react-router";
import { getVerseByRef, refPath } from "../data/bibleRepo";
import { listFavorites, updateMarks } from "../data/marksRepo";
import { useAsync } from "../hooks/useAsync";
import { BibleHeader } from "../components/BibleTabs";
import { BookmarkIcon } from "../components/icons";

export function FavoritesScreen() {
  const [version, setVersion] = useState(0);
  const { data } = useAsync(async () => {
    const marks = await listFavorites();
    const verses = await Promise.all(marks.map((m) => getVerseByRef(m.ref)));
    return marks.flatMap((m, i) => (verses[i] ? [{ mark: m, verse: verses[i] }] : []));
  }, `favorites:${version}`);

  const remove = async (ref: string) => {
    await updateMarks([ref], { favorite: false });
    setVersion((v) => v + 1);
  };

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <BibleHeader subtitle="Los versículos que guardaste mientras leías." />

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          <BookmarkIcon size={36} className="mx-auto mb-3 text-accent" />
          <p>Todavía no tienes favoritos.</p>
          <p className="mt-1 text-sm">
            Mientras lees, haz clic en un versículo y elige <strong>Favorito</strong> para guardarlo aquí.
          </p>
        </div>
      )}

      <ul className="grid gap-3">
        {data?.map(({ mark, verse }) => (
          <li
            key={mark.ref}
            className="group relative rounded-2xl border border-border bg-surface px-6 py-5"
            style={mark.color ? { boxShadow: `inset 4px 0 0 var(--hl-${mark.color})` } : undefined}
          >
            <p className="selectable font-reading text-[1.15rem] leading-relaxed">{verse.text}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <Link to={refPath(mark.ref)} className="font-display font-semibold text-accent italic hover:underline">
                {verse.label}
              </Link>
              <button
                onClick={() => remove(mark.ref)}
                className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
              >
                Quitar de favoritos
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

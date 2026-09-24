import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { searchVerses, SEARCH_LIMIT } from "../data/bibleRepo";
import { splitHighlights } from "../domain/search";
import { useAsync } from "../hooks/useAsync";
import { BibleHeader } from "../components/BibleTabs";
import { SearchIcon } from "../components/icons";

const SUGGESTIONS = ["misericordia", "no temas", "paz", "perdón", "fe esperanza", "buen pastor"];

export function SearchScreen() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [text, setText] = useState(query);

  // Espera a que dejes de escribir un momento antes de buscar.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (text !== query) setParams(text ? { q: text } : {}, { replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [text, query, setParams]);

  const { data, loading } = useAsync(() => searchVerses(query), `search:${query}`);

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <BibleHeader subtitle="Busca palabras en toda la Biblia. Las tildes no importan." />

      <label className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 focus-within:border-accent">
        <SearchIcon size={20} className="text-muted" />
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej.: amor, no temas, misericordia…"
          className="flex-1 bg-transparent text-lg outline-none"
        />
      </label>

      {!query && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Prueba con:
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setText(s)}
              className="rounded-full border border-border px-3 py-1 hover:border-accent hover:text-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {query && data && (
        <>
          <p className="mt-6 mb-4 text-sm text-muted">
            {data.total === 0
              ? "No encontramos versículos con esas palabras."
              : data.total === 1
                ? "1 versículo"
                : `${data.total.toLocaleString("es")} versículos${data.total > SEARCH_LIMIT ? ` · mostrando los primeros ${SEARCH_LIMIT}` : ""}`}
          </p>
          <ul className="flex flex-col gap-2">
            {data.hits.map((h) => (
              <li key={`${h.book.id}.${h.chapter}.${h.verse}`}>
                <Link
                  to={`/biblia/${h.book.code}/${h.chapter}?v=${h.verse}`}
                  className="block rounded-xl border border-transparent px-4 py-3 transition hover:border-border hover:bg-surface"
                >
                  <p className="mb-1 text-sm font-semibold text-accent">
                    {h.book.name} {h.chapter}:{h.verse}
                  </p>
                  <p className="font-reading text-[1.05rem] leading-relaxed">
                    {splitHighlights(h.marked).map((part, i) =>
                      part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {query && loading && <p className="mt-6 text-sm text-muted">Buscando…</p>}
    </div>
  );
}

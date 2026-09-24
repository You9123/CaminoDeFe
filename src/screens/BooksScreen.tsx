import { Link } from "react-router";
import booksMeta from "../../content/books_meta.json";
import { listBooks, type Book } from "../data/bibleRepo";
import { getReadCountByBook } from "../data/progressRepo";
import { useAsync } from "../hooks/useAsync";
import { BibleHeader } from "../components/BibleTabs";
import { CheckIcon } from "../components/icons";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function BooksScreen() {
  const { data } = useAsync(async () => {
    const [books, read] = await Promise.all([listBooks(), getReadCountByBook()]);
    return { books, read };
  }, "books");

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <BibleHeader subtitle="Reina-Valera 1909. Elige un libro para empezar a leer." />

      {data &&
        booksMeta.zones.map((zone, i) => {
          const books = data.books.filter((b) => b.zone === zone.id);
          return (
            <section key={zone.id} className="mb-10">
              <h2 className="mb-4 flex items-baseline gap-3">
                <span className="font-display text-sm font-semibold text-accent">{ROMAN[i]}</span>
                <span className="font-display text-xl font-semibold">{zone.name}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {books.map((b) => (
                  <BookCard key={b.id} book={b} read={data.read[b.id] ?? 0} />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

function BookCard({ book, read }: { book: Book; read: number }) {
  const pct = Math.round((read / book.chapters) * 100);
  const done = read === book.chapters;
  return (
    <Link
      to={`/biblia/${book.code}`}
      className="group rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-sm"
    >
      <p className="flex items-center gap-1.5 font-semibold group-hover:text-accent">
        {book.name} {done && <CheckIcon size={15} className="text-success" />}
      </p>
      <p className="mb-3 text-xs text-muted">
        {read > 0 ? `${read} de ${book.chapters} capítulos` : `${book.chapters} capítulos`}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${done ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

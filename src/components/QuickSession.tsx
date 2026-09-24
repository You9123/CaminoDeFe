import { getVerseByRef } from "../data/bibleRepo";
import { useAsync } from "../hooks/useAsync";
import { PostReadingFlow } from "./PostReadingFlow";

/**
 * "Tengo 5 minutos" (Documento Maestro §2.3): un versículo, una reflexión y un minuto de oración.
 * Si el versículo del día todavía no se leyó, se usa ese; si no, uno distinto de la lista.
 */
export function QuickSession({
  verseRef,
  isDaily,
  onClose,
}: {
  verseRef: string;
  isDaily: boolean;
  onClose: () => void;
}) {
  const { data } = useAsync(() => getVerseByRef(verseRef), `quick:${verseRef}`);
  if (!data) return null;
  return (
    <PostReadingFlow
      title="Sesión de 5 minutos · unos 4 minutos en total"
      steps={["verse", "reflection", "prayer"]}
      refId={data.ref}
      refLabel={data.label}
      verse={{ text: data.text, activity: isDaily ? "daily_verse" : "short_reading" }}
      prayerMinutes={1}
      onClose={onClose}
    />
  );
}

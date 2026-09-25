import { downloadPercent, formatMegabytes, shortNotes } from "../domain/updates";
import { useUpdates } from "../stores/updateStore";
import { UpdateIcon } from "./icons";

/**
 * Aviso de versión nueva en la barra lateral. No interrumpe: se puede dejar para más tarde.
 * Mientras se descarga muestra el avance; al terminar, la app se reinicia sola.
 */
export function UpdateCard() {
  const { status, version, notes, dismissed, downloaded, total, error, install, dismiss } = useUpdates();
  const busy = status === "downloading" || status === "installing";
  const failedInstall = status === "error" && version !== null;
  const visible = busy || (!dismissed && (status === "available" || failedInstall));
  if (!version || !visible) return null;

  const pct = downloadPercent(downloaded, total);
  const lines = shortNotes(notes, 2);

  return (
    <div className="animate-rise rounded-2xl border border-accent/50 bg-accent-soft/40 p-3.5 text-sm" role="status">
      <p className="flex items-center gap-2 leading-tight font-semibold">
        <UpdateIcon size={20} className="shrink-0 text-accent" />
        {busy ? `Actualizando a la ${version}` : `Hay una versión nueva: ${version}`}
      </p>

      {busy ? (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full bg-accent transition-[width] ${pct === null ? "w-1/3 animate-pulse" : ""}`}
              style={pct === null ? undefined : { width: `${status === "installing" ? 100 : pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {status === "installing"
              ? "Instalando. La app se va a cerrar y abrir sola."
              : pct === null
                ? "Descargando…"
                : `Descargando… ${pct} %${total ? ` · ${formatMegabytes(total)}` : ""}`}
          </p>
        </>
      ) : failedInstall ? (
        <>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{error}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => void install()}
              className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-ink"
            >
              Reintentar
            </button>
            <button
              onClick={() => void dismiss()}
              className="rounded-lg px-2 py-1.5 whitespace-nowrap text-muted hover:text-ink"
            >
              Más tarde
            </button>
          </div>
        </>
      ) : (
        <>
          {lines.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs leading-snug text-muted">
              {lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => void install()}
              className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-ink"
              title="Se guarda una copia de tus datos, se instala y la app se reinicia"
            >
              Actualizar
            </button>
            <button
              onClick={() => void dismiss()}
              className="rounded-lg px-2 py-1.5 whitespace-nowrap text-muted hover:text-ink"
            >
              Más tarde
            </button>
          </div>
        </>
      )}
    </div>
  );
}

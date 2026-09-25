import { useUpdates } from "../../stores/updateStore";
import { UpdateIcon } from "../../components/icons";
import { Field, Toggle } from "./ui";

/** Ajustes → Acerca de: buscar actualizaciones. */
export function UpdateFields() {
  const { status, auto, version, error, setAuto, checkNow, install } = useUpdates();
  const busy = status === "checking" || status === "downloading" || status === "installing";

  const message =
    status === "checking"
      ? "Buscando…"
      : status === "upToDate"
        ? "Tienes la última versión."
        : status === "available"
          ? `Hay una versión nueva: ${version}.`
          : status === "downloading" || status === "installing"
            ? `Actualizando a la ${version}…`
            : status === "error"
              ? error
              : null;

  return (
    <Field
      label="Actualizaciones"
      hint="Para saber si hay una versión nueva, la app solo consulta la página de Camino de Fe en GitHub. No se envía nada de tus datos. Antes de instalar se guarda una copia automática de todo."
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void checkNow(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <UpdateIcon size={18} duo={false} /> Buscar actualizaciones
        </button>
        {status === "available" && (
          <button
            onClick={() => void install()}
            className="rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink"
          >
            Actualizar ahora
          </button>
        )}
        {message && (
          <span className={`text-sm ${status === "error" ? "text-ink" : "text-muted"}`} role="status">
            {message}
          </span>
        )}
      </div>
      <div className="mt-3">
        <Toggle checked={auto} onChange={(v) => void setAuto(v)} label="Buscar al abrir la app" />
      </div>
    </Field>
  );
}

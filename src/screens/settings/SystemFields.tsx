import { useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { open, save } from "@tauri-apps/plugin-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createBackup, readBackupFile, restoreBackup, writeBackupFile } from "../../data/backupRepo";
import { notify } from "../../data/notify";
import { backupFileName, summarizeBackup, type Backup } from "../../domain/backup";
import { reminderMessage } from "../../domain/reminder";
import { gameDay } from "../../domain/day";
import { useAsync } from "../../hooks/useAsync";
import { useProgress } from "../../stores/progressStore";
import { useSettings } from "../../stores/settingsStore";
import { toast } from "../../stores/toastStore";
import { ArchiveIcon, BellIcon } from "../../components/icons";
import { Field, Toggle } from "./ui";

// ---------- Recordatorio ----------

export function ReminderFields() {
  const { reminderEnabled, reminderTime, setReminder } = useSettings();
  const streak = useProgress((s) => s.streak.current);

  const test = async () => {
    const ok = await notify("Camino de Fe", reminderMessage(gameDay(), streak));
    if (!ok) toast("Windows no permitió la notificación. Revisa la configuración de notificaciones.", "info");
  };

  return (
    <Field
      label="Recordatorio diario"
      hint="Te avisa una vez al día, a esa hora, solo si todavía no hiciste nada hoy. Funciona mientras Camino de Fe esté abierta, aunque esté minimizada."
    >
      <div className="flex flex-wrap items-center gap-4">
        <Toggle checked={reminderEnabled} onChange={(v) => void setReminder(v, reminderTime)} label="Recordarme" />
        <input
          type="time"
          value={reminderTime}
          disabled={!reminderEnabled}
          onChange={(e) => void setReminder(reminderEnabled, e.target.value)}
          className="rounded-xl border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={test}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
        >
          <BellIcon size={17} /> Probar
        </button>
      </div>
    </Field>
  );
}

export function AutostartField() {
  const [version, setVersion] = useState(0);
  const { data: enabled, error } = useAsync(() => isEnabled(), `autostart:${version}`);

  const change = async (v: boolean) => {
    try {
      if (v) await enable();
      else await disable();
      setVersion((n) => n + 1);
    } catch (e) {
      console.error(e);
      toast("No se pudo cambiar esta opción.", "info");
    }
  };

  return (
    <Field
      label="Al iniciar Windows"
      hint="Abre Camino de Fe minimizada cuando enciendes la computadora, para que el recordatorio te llegue aunque no la hayas abierto."
    >
      <Toggle
        checked={enabled === true}
        disabled={enabled === undefined || Boolean(error)}
        onChange={(v) => void change(v)}
        label="Abrir Camino de Fe al iniciar Windows"
      />
    </Field>
  );
}

// ---------- Respaldo ----------

const FILTERS = [{ name: "Respaldo de Camino de Fe", extensions: ["json"] }];

export function BackupFields() {
  const refresh = useProgress((s) => s.refresh);
  const loadSettings = useSettings((s) => s.load);
  const [pending, setPending] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);

  const exportBackup = async () => {
    const path = await save({ defaultPath: backupFileName(), filters: FILTERS, title: "Guardar respaldo" });
    if (!path) return;
    setBusy(true);
    try {
      await writeBackupFile(path, await createBackup());
      toast("Respaldo guardado", "info");
    } catch (e) {
      toast(String(e), "info");
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async () => {
    const path = await open({ multiple: false, directory: false, filters: FILTERS, title: "Abrir respaldo" });
    if (typeof path !== "string") return;
    try {
      setPending(await readBackupFile(path));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "info");
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending);
      await loadSettings();
      await refresh();
      setPending(null);
      toast("Respaldo importado", "info");
    } catch (e) {
      console.error(e);
      toast("No se pudo importar. Tus datos anteriores quedaron guardados en una copia automática.", "info");
    } finally {
      setBusy(false);
    }
  };

  const summary = pending ? summarizeBackup(pending) : null;

  return (
    <Field
      label="Tus datos"
      hint="El respaldo es un archivo con todo tu progreso, tu diario, tus favoritos y tus ajustes. Guárdalo en otro lugar (una memoria USB, la nube) por si cambias de computadora."
    >
      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportBackup}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-50"
        >
          <ArchiveIcon size={18} duo={false} /> Exportar respaldo
        </button>
        <button
          onClick={chooseFile}
          disabled={busy}
          className="rounded-xl border border-border px-4 py-2 font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Importar respaldo…
        </button>
      </div>

      {summary && (
        <div className="animate-rise mt-4 rounded-xl border border-accent/50 bg-accent-soft/40 p-4 text-sm">
          <p className="mb-2 font-semibold">
            Respaldo del {format(new Date(summary.exportedAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </p>
          <ul className="mb-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-muted">
            <li>{summary.totalXp.toLocaleString("es")} XP</li>
            <li>{summary.chaptersRead} capítulos leídos</li>
            <li>{summary.journalEntries} entradas del diario</li>
            <li>{summary.favorites} favoritos</li>
          </ul>
          <p className="mb-3">
            Al importarlo se <strong>reemplaza todo</strong> lo que tienes ahora. Antes, la app guarda una copia
            automática de tus datos actuales.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPending(null)} className="rounded-lg px-3 py-1.5 hover:bg-surface">
              Cancelar
            </button>
            <button
              onClick={confirmImport}
              disabled={busy}
              className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-bg disabled:opacity-50"
            >
              Reemplazar mis datos
            </button>
          </div>
        </div>
      )}
    </Field>
  );
}

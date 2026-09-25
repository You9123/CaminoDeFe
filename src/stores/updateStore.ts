import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getSetting, setSetting } from "../data/progressRepo";
import { saveAutomaticBackup } from "../data/backupRepo";
import { gameDay } from "../domain/day";
import { dismissKey, isDismissed, shouldAutoCheck } from "../domain/updates";

/**
 * Actualizaciones (ADR-0010). Solo se habla con GitHub Releases del repositorio de Camino de Fe:
 * se descarga latest.json y, si tú lo decides, el instalador firmado. No se envía nada de tus datos.
 */

const KEY_AUTO = "update_auto";
const KEY_LAST = "update_last_check";
const KEY_DISMISSED = "update_dismissed";

export type UpdateStatus = "idle" | "checking" | "upToDate" | "available" | "downloading" | "installing" | "error";

type UpdateState = {
  status: UpdateStatus;
  /** Buscar al abrir la app (por defecto sí). */
  auto: boolean;
  version: string | null;
  notes: string | null;
  /** El aviso de la barra lateral se escondió con "Más tarde". */
  dismissed: boolean;
  downloaded: number;
  total: number | null;
  error: string | null;
  /** Al abrir la app: carga el ajuste y, si toca, busca en silencio. */
  init: () => Promise<void>;
  /** Buscar ahora. `manual` = lo pidió la persona desde Ajustes (se muestran los errores). */
  checkNow: (manual?: boolean) => Promise<void>;
  setAuto: (on: boolean) => Promise<void>;
  dismiss: () => Promise<void>;
  /** Copia automática de tus datos, descarga, instala y reinicia. */
  install: () => Promise<void>;
};

let pending: Update | null = null;

const friendly = (e: unknown, what: "buscar" | "instalar") => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/network|dns|connect|timed? ?out|offline|error sending request/i.test(msg))
    return "No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.";
  if (/valid release JSON|404/i.test(msg))
    return "No se encontró una versión publicada en GitHub. Inténtalo más tarde.";
  if (/signature/i.test(msg)) return "La descarga no tiene una firma válida, así que no se instaló.";
  return `No se pudo ${what} la actualización (${msg}).`;
};

export const useUpdates = create<UpdateState>((set, get) => ({
  status: "idle",
  auto: true,
  version: null,
  notes: null,
  dismissed: false,
  downloaded: 0,
  total: null,
  error: null,

  init: async () => {
    const [auto, last] = await Promise.all([getSetting(KEY_AUTO), getSetting(KEY_LAST)]);
    const on = auto !== "0";
    set({ auto: on });
    // En desarrollo (pnpm tauri dev) no se busca sola: la versión de prueba no se actualiza.
    if (import.meta.env.DEV) return;
    if (shouldAutoCheck(on, last ? Number(last) : null, Date.now())) await get().checkNow(false);
  },

  checkNow: async (manual = true) => {
    const { status } = get();
    if (status === "checking" || status === "downloading" || status === "installing") return;
    set({ status: "checking", error: null });
    try {
      const update = await check({ timeout: 20_000 });
      await setSetting(KEY_LAST, String(Date.now()));
      if (pending && pending !== update) void pending.close().catch(() => {});
      pending = update;
      if (!update) {
        set({ status: "upToDate", version: null, notes: null });
        return;
      }
      const dismissed = !manual && isDismissed(await getSetting(KEY_DISMISSED), update.version, gameDay());
      set({ status: "available", version: update.version, notes: update.body ?? null, dismissed });
    } catch (e) {
      console.error(e);
      // Una búsqueda automática que falla (sin internet) no molesta: solo se ve si la pediste tú.
      set({ status: manual ? "error" : "idle", error: manual ? friendly(e, "buscar") : null });
    }
  },

  setAuto: async (on) => {
    set({ auto: on });
    await setSetting(KEY_AUTO, on ? "1" : "0");
  },

  dismiss: async () => {
    const { version } = get();
    set({ dismissed: true });
    if (version) await setSetting(KEY_DISMISSED, dismissKey(version, gameDay()));
  },

  install: async () => {
    const { status } = get();
    if (!pending || (status !== "available" && status !== "error")) return;
    if (import.meta.env.DEV) {
      set({ status: "error", error: "En modo desarrollo no se instalan actualizaciones." });
      return;
    }
    set({ status: "downloading", downloaded: 0, total: null, error: null, dismissed: false });
    try {
      // Por si algo sale mal a mitad de camino, tus datos quedan copiados antes de tocar nada.
      await saveAutomaticBackup("antes-de-actualizar");
      await pending.downloadAndInstall((ev) => {
        if (ev.event === "Started") set({ total: ev.data.contentLength ?? null });
        else if (ev.event === "Progress") set((s) => ({ downloaded: s.downloaded + ev.data.chunkLength }));
        else set({ status: "installing" });
      });
      // En Windows el instalador cierra y vuelve a abrir la app; en otros sistemas se reinicia aquí.
      await relaunch();
    } catch (e) {
      console.error(e);
      set({ status: "error", error: friendly(e, "instalar") });
    }
  },
}));

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { VOICES } from "../content/voices";
import type { NaturalVoice } from "../domain/voices";

/**
 * Voces naturales instaladas y descargas en curso (ADR-0011).
 * La descarga y la síntesis las hace Rust (src-tauri/src/piper.rs).
 */

type Download = {
  id: string;
  step: "engine" | "voice";
  downloaded: number;
  total: number | null;
  includesEngine: boolean;
};

type VoicesState = {
  loaded: boolean;
  engine: boolean;
  installed: string[];
  download: Download | null;
  error: string | null;
  refresh: () => Promise<void>;
  install: (voice: NaturalVoice) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
};

type Progress = { id: string; downloaded: number; total: number | null };

let listening = false;

export const useVoices = create<VoicesState>((set, get) => {
  const listenProgress = () => {
    if (listening) return;
    listening = true;
    void listen<Progress>("piper-progress", ({ payload }) => {
      const d = get().download;
      if (!d) return;
      const step = payload.id === "engine" ? "engine" : "voice";
      set({ download: { ...d, step, downloaded: payload.downloaded, total: payload.total } });
    });
  };

  return {
    loaded: false,
    engine: false,
    installed: [],
    download: null,
    error: null,

    refresh: async () => {
      try {
        const s = await invoke<{ engine: boolean; voices: string[] }>("piper_status");
        set({ loaded: true, engine: s.engine, installed: s.voices });
      } catch (e) {
        console.error(e);
        set({ loaded: true });
      }
    },

    install: async (voice) => {
      if (get().download) return false;
      listenProgress();
      const includesEngine = !get().engine;
      set({
        error: null,
        download: {
          id: voice.id,
          step: includesEngine ? "engine" : "voice",
          downloaded: 0,
          total: null,
          includesEngine,
        },
      });
      try {
        if (includesEngine) {
          await invoke("piper_install_engine");
          set({ engine: true });
          set((s) => (s.download ? { download: { ...s.download, step: "voice", downloaded: 0, total: null } } : s));
        }
        await invoke("piper_install_voice", {
          id: voice.id,
          modelUrl: voice.model.url,
          modelSha256: voice.model.sha256,
          configUrl: voice.config.url,
          configSha256: voice.config.sha256,
        });
        await get().refresh();
        return true;
      } catch (e) {
        console.error(e);
        const msg = String(e);
        set({
          error: /error sending request|dns|connect|timed out/i.test(msg)
            ? "No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo."
            : msg,
        });
        return false;
      } finally {
        set({ download: null });
      }
    },

    remove: async (id) => {
      await invoke("piper_remove_voice", { id });
      await get().refresh();
    },
  };
});

/** El catálogo completo, por si una pantalla lo necesita junto al estado. */
export const NATURAL_VOICES = VOICES.voices;

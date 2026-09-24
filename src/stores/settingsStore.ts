import { create } from "zustand";
import { getSetting, setSetting } from "../data/progressRepo";
import { DEFAULT_DAY_END_HOUR, setDayEndHour } from "../domain/day";
import { DEFAULT_REMINDER_TIME, parseTime } from "../domain/reminder";

export type Theme = "system" | "light" | "dark";
export type ReadingSize = "sm" | "md" | "lg" | "xl";

export const READING_SIZES: Record<ReadingSize, { label: string; rem: number }> = {
  sm: { label: "Pequeña", rem: 1.1 },
  md: { label: "Normal", rem: 1.3 },
  lg: { label: "Grande", rem: 1.5 },
  xl: { label: "Muy grande", rem: 1.75 },
};

type SettingsState = {
  loaded: boolean;
  theme: Theme;
  readingSize: ReadingSize;
  dayEndHour: number;
  reminderEnabled: boolean;
  reminderTime: string;
  /** Adornos ganados que el usuario apagó (ids de cosmetics.ts). */
  cosmeticsOff: Set<string>;
  /** Preguntar "¿Cómo te sientes hoy?" en la pantalla Hoy. */
  emotionPrompt: boolean;
  /** Voz para el modo escuchar (voiceURI) o "" para elegirla sola. */
  ttsVoice: string;
  /** Velocidad del modo escuchar (0.75 a 1.5). */
  ttsRate: number;
  load: () => Promise<void>;
  setTheme: (t: Theme) => Promise<void>;
  setReadingSize: (s: ReadingSize) => Promise<void>;
  setDayEndHour: (h: number) => Promise<void>;
  setReminder: (enabled: boolean, time: string) => Promise<void>;
  setCosmetic: (id: string, on: boolean) => Promise<void>;
  setEmotionPrompt: (on: boolean) => Promise<void>;
  setTts: (change: { voice?: string; rate?: number }) => Promise<void>;
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

function applyReadingSize(size: ReadingSize) {
  document.documentElement.style.setProperty("--reading-size", `${READING_SIZES[size].rem}rem`);
}

const isTheme = (v: string | null): v is Theme => v === "system" || v === "light" || v === "dark";
const isSize = (v: string | null): v is ReadingSize => v !== null && v in READING_SIZES;

const clampRate = (r: number) => (Number.isFinite(r) ? Math.min(1.5, Math.max(0.75, r)) : 1);

const parseList = (v: string | null) => new Set((v ?? "").split(",").filter(Boolean));

export const useSettings = create<SettingsState>((set, get) => ({
  loaded: false,
  theme: "system",
  readingSize: "md",
  dayEndHour: DEFAULT_DAY_END_HOUR,
  reminderEnabled: false,
  reminderTime: DEFAULT_REMINDER_TIME,
  cosmeticsOff: new Set(),
  emotionPrompt: true,
  ttsVoice: "",
  ttsRate: 1,

  load: async () => {
    const [theme, size, hour, reminderOn, reminderAt, cosmeticsOff, emotionPrompt, ttsVoice, ttsRate] =
      await Promise.all([
        getSetting("theme"),
        getSetting("reading_size"),
        getSetting("day_end_hour"),
        getSetting("reminder_enabled"),
        getSetting("reminder_time"),
        getSetting("cosmetics_off"),
        getSetting("emotion_prompt"),
        getSetting("tts_voice"),
        getSetting("tts_rate"),
      ]);
    const t = isTheme(theme) ? theme : "system";
    const s = isSize(size) ? size : "md";
    const h = hour !== null ? Number(hour) : DEFAULT_DAY_END_HOUR;
    applyTheme(t);
    applyReadingSize(s);
    setDayEndHour(h);
    set({
      loaded: true,
      theme: t,
      readingSize: s,
      dayEndHour: h,
      reminderEnabled: reminderOn === "1",
      reminderTime: reminderAt && parseTime(reminderAt) ? reminderAt : DEFAULT_REMINDER_TIME,
      cosmeticsOff: parseList(cosmeticsOff),
      emotionPrompt: emotionPrompt !== "0",
      ttsVoice: ttsVoice ?? "",
      ttsRate: clampRate(Number(ttsRate ?? 1)),
    });
  },

  setTheme: async (theme) => {
    applyTheme(theme);
    set({ theme });
    await setSetting("theme", theme);
  },

  setReadingSize: async (readingSize) => {
    applyReadingSize(readingSize);
    set({ readingSize });
    await setSetting("reading_size", readingSize);
  },

  setDayEndHour: async (hour) => {
    setDayEndHour(hour);
    set({ dayEndHour: hour });
    await setSetting("day_end_hour", String(hour));
  },

  setReminder: async (enabled, time) => {
    const valid = parseTime(time) ? time : DEFAULT_REMINDER_TIME;
    set({ reminderEnabled: enabled, reminderTime: valid });
    await Promise.all([setSetting("reminder_enabled", enabled ? "1" : "0"), setSetting("reminder_time", valid)]);
  },

  setCosmetic: async (id, on) => {
    const next = new Set(get().cosmeticsOff);
    if (on) next.delete(id);
    else next.add(id);
    set({ cosmeticsOff: next });
    await setSetting("cosmetics_off", [...next].join(","));
  },

  setEmotionPrompt: async (on) => {
    set({ emotionPrompt: on });
    await setSetting("emotion_prompt", on ? "1" : "0");
  },

  setTts: async ({ voice, rate }) => {
    if (voice !== undefined) {
      set({ ttsVoice: voice });
      await setSetting("tts_voice", voice);
    }
    if (rate !== undefined) {
      const r = clampRate(rate);
      set({ ttsRate: r });
      await setSetting("tts_rate", String(r));
    }
  },
}));

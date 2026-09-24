import { create } from "zustand";
import { getSetting, setSetting } from "../data/progressRepo";
import { DEFAULT_DAY_END_HOUR, setDayEndHour } from "../domain/day";

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
  load: () => Promise<void>;
  setTheme: (t: Theme) => Promise<void>;
  setReadingSize: (s: ReadingSize) => Promise<void>;
  setDayEndHour: (h: number) => Promise<void>;
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

export const useSettings = create<SettingsState>((set) => ({
  loaded: false,
  theme: "system",
  readingSize: "md",
  dayEndHour: DEFAULT_DAY_END_HOUR,

  load: async () => {
    const [theme, size, hour] = await Promise.all([
      getSetting("theme"),
      getSetting("reading_size"),
      getSetting("day_end_hour"),
    ]);
    const t = isTheme(theme) ? theme : "system";
    const s = isSize(size) ? size : "md";
    const h = hour !== null ? Number(hour) : DEFAULT_DAY_END_HOUR;
    applyTheme(t);
    applyReadingSize(s);
    setDayEndHour(h);
    set({ loaded: true, theme: t, readingSize: s, dayEndHour: h });
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
}));

import { create } from "zustand";
import * as progress from "../data/progressRepo";
import { levelFromXp, type LevelInfo } from "../domain/levels";

type ProgressState = {
  loaded: boolean;
  name: string;
  totalXp: number;
  todayXp: number;
  chaptersRead: number;
  level: LevelInfo;
  refresh: () => Promise<void>;
  setName: (name: string) => Promise<void>;
};

export const useProgress = create<ProgressState>((set, get) => ({
  loaded: false,
  name: "",
  totalXp: 0,
  todayXp: 0,
  chaptersRead: 0,
  level: levelFromXp(0),

  refresh: async () => {
    const [name, totalXp, todayXp, chaptersRead] = await Promise.all([
      progress.getProfileName(),
      progress.getTotalXp(),
      progress.getXpForDay(),
      progress.getChaptersReadCount(),
    ]);
    set({ loaded: true, name, totalXp, todayXp, chaptersRead, level: levelFromXp(totalXp) });
  },

  setName: async (name) => {
    await progress.setProfileName(name);
    await get().refresh();
  },
}));

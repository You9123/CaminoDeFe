import type { ComponentType } from "react";
import type { MissionActivity } from "../domain/missions";
import { CandleIcon, QuillIcon, SproutIcon, SunriseIcon } from "./icons";

export const MISSION_ICONS: Record<MissionActivity, ComponentType<{ size?: number; className?: string }>> = {
  daily_verse: SunriseIcon,
  reflection: QuillIcon,
  prayer: CandleIcon,
  application: SproutIcon,
};

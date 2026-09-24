import type { ComponentType } from "react";
import type { EmotionId } from "../domain/emotions";
import { CloudSunIcon, HeartIcon, MoonIcon, RainIcon, StormIcon, SunIcon, WindIcon } from "./icons";

/** Emociones como clima (sin caras ni emojis, ADR-0003). */
export const EMOTION_ICON: Record<EmotionId, ComponentType<{ size?: number; className?: string; duo?: boolean }>> = {
  bien: SunIcon,
  normal: CloudSunIcon,
  triste: RainIcon,
  enojado: StormIcon,
  ansioso: WindIcon,
  cansado: MoonIcon,
  agradecido: HeartIcon,
};

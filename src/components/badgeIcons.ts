import type { ComponentType } from "react";
import type { AchievementIcon } from "../domain/achievements";
import type { RankId } from "../domain/ranks";
import {
  AnchorIcon,
  BookIcon,
  BookmarkIcon,
  CandleIcon,
  CheckIcon,
  CompassIcon,
  CrossIcon,
  DoveIcon,
  FlameIcon,
  HarpIcon,
  JournalIcon,
  LampIcon,
  OliveIcon,
  PathIcon,
  QuillIcon,
  ScrollIcon,
  SparkIcon,
  SproutIcon,
  SunriseIcon,
} from "./icons";

export type BadgeIcon = ComponentType<{ size?: number; className?: string; duo?: boolean }>;

export const ACHIEVEMENT_ICON: Record<AchievementIcon, BadgeIcon> = {
  book: BookIcon,
  scroll: ScrollIcon,
  lamp: LampIcon,
  bookmark: BookmarkIcon,
  sprout: SproutIcon,
  cross: CrossIcon,
  harp: HarpIcon,
  dove: DoveIcon,
  sunrise: SunriseIcon,
  flame: FlameIcon,
  anchor: AnchorIcon,
  check: CheckIcon,
  quill: QuillIcon,
  journal: JournalIcon,
  candle: CandleIcon,
  olive: OliveIcon,
  path: PathIcon,
  compass: CompassIcon,
  spark: SparkIcon,
};

export const RANK_ICON: Record<RankId, BadgeIcon> = {
  comenzando: SproutIcon,
  caminante: PathIcon,
  buscador: LampIcon,
  discipulo: FlameIcon,
  perseverante: AnchorIcon,
  siervo: DoveIcon,
  peregrino: SunriseIcon,
};

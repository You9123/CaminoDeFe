import { useState } from "react";
import type { MissionActivity } from "../domain/missions";
import { useDailyVerse } from "../hooks/useDailyVerse";
import { useProgress } from "../stores/progressStore";
import { MissionsCard } from "./MissionsCard";
import { PostReadingFlow, type FlowStep } from "./PostReadingFlow";

/** Las 4 misiones del día, con sus acciones (sobre el versículo del día). Se usa en Hoy y en Misiones. */
export function DailyMissionsCard() {
  const missions = useProgress((s) => s.missions);
  const { verse, markVerseRead } = useDailyVerse();
  const [flowStep, setFlowStep] = useState<FlowStep | null>(null);

  const onMission = (m: MissionActivity) => {
    if (m === "daily_verse") void markVerseRead();
    else setFlowStep(m);
  };

  return (
    <>
      <MissionsCard progress={missions} onAction={onMission} />
      {flowStep && verse.data && (
        <PostReadingFlow
          steps={[flowStep]}
          refId={verse.data.ref}
          refLabel={verse.data.label}
          onClose={() => setFlowStep(null)}
        />
      )}
    </>
  );
}

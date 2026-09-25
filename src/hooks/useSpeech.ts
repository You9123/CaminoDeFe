import { useEffect, useSyncExternalStore } from "react";
import { speech, speechSupported, type SpeechState } from "../data/speech";
import { useVoices } from "../stores/voicesStore";

/** Estado del modo escuchar (compartido por toda la app). */
export function useSpeechState(): SpeechState {
  return useSyncExternalStore(
    (fn) => speech.subscribe(fn),
    () => speech.state,
  );
}

/** Detiene la lectura cuando se desmonta la pantalla que la empezó. */
export function useStopSpeechOnUnmount() {
  useEffect(() => () => speech.stop(), []);
}

/** Se puede escuchar: hay voces de Windows o al menos una voz natural descargada. */
export function useCanSpeak(): boolean {
  const natural = useVoices((s) => s.installed.length > 0);
  return natural || speechSupported();
}

export { speech, speechSupported };

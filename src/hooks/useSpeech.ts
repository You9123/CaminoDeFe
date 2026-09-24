import { useEffect, useSyncExternalStore } from "react";
import { speech, speechSupported, type SpeechState } from "../data/speech";

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

export { speech, speechSupported };

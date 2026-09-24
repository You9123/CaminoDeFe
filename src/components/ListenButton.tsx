import { speech, speechSupported, useSpeechState } from "../hooks/useSpeech";
import { useSettings } from "../stores/settingsStore";
import { SpeakerIcon } from "./icons";

/** Botón pequeño para escuchar un texto corto (versículo del día, versículo de la emoción). */
export function ListenButton({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const state = useSpeechState();
  const rate = useSettings((s) => s.ttsRate);
  const voiceURI = useSettings((s) => s.ttsVoice);
  if (!speechSupported()) return null;
  const playing = state.status === "playing" && state.label === label;

  return (
    <button
      onClick={() => (playing ? speech.stop() : void speech.play([{ id: 1, text }], { label, rate, voiceURI }))}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent ${
        playing ? "border-accent text-accent" : ""
      } ${className}`}
      title={playing ? "Detener" : "Escuchar"}
    >
      <SpeakerIcon size={17} duo={playing} />
      {playing ? "Detener" : "Escuchar"}
    </button>
  );
}

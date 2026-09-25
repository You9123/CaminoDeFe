import { useEffect, useState } from "react";
import { loadVoices, speech, speechSupported } from "../../data/speech";
import { SPEECH_RATES, spanishVoices } from "../../domain/speech";
import { useSettings } from "../../stores/settingsStore";
import { useSpeechState } from "../../hooks/useSpeech";
import { Field, Toggle } from "./ui";
import { NaturalVoices, VOICE_SAMPLE } from "./NaturalVoices";
import { voiceById } from "../../content/voices";
import { naturalVoiceURI } from "../../domain/voices";
import { useVoices } from "../../stores/voicesStore";

export function SpeechFields() {
  const voiceURI = useSettings((s) => s.ttsVoice);
  const rate = useSettings((s) => s.ttsRate);
  const setTts = useSettings((s) => s.setTts);
  const state = useSpeechState();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  const natural = useVoices((s) => s.installed);

  useEffect(() => {
    void loadVoices().then((v) => setVoices(spanishVoices(v)));
  }, []);

  const testing = state.status === "playing" && state.label === "Prueba de voz";
  const noWindowsVoices = !speechSupported() || (voices !== null && voices.length === 0);

  return (
    <>
      <NaturalVoices />
      <Field
        label="Voz"
        hint={
          noWindowsVoices
            ? "No encontramos voces de Windows en español. Puedes descargar una voz natural arriba, o agregarlas en Configuración de Windows → Hora e idioma → Idioma y región → Español → Opciones → Voz."
            : "Elige una voz natural o una de las voces instaladas en Windows. Todas funcionan sin internet."
        }
      >
        <div className="flex gap-2">
          <select
            value={voiceURI}
            onChange={(e) => void setTts({ voice: e.target.value })}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          >
            <option value="">Automática de Windows{voices?.[0] ? ` (${voices[0].name})` : ""}</option>
            {natural.length > 0 && (
              <optgroup label="Voces naturales">
                {natural.map((id) => {
                  const v = voiceById(id);
                  return (
                    <option key={id} value={naturalVoiceURI(id)}>
                      {v ? `${v.name} · ${v.accent} (natural)` : id}
                    </option>
                  );
                })}
              </optgroup>
            )}
            {voices && voices.length > 0 && (
              <optgroup label="Voces de Windows">
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} · {v.lang}
                    {v.localService ? "" : " · necesita internet"}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={() =>
              testing
                ? speech.stop()
                : void speech.play([{ id: 1, text: VOICE_SAMPLE }], { label: "Prueba de voz", rate, voiceURI })
            }
            className="shrink-0 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
          >
            {testing ? "Detener" : "Probar"}
          </button>
        </div>
      </Field>
      <Field label="Velocidad">
        <div className="inline-flex rounded-xl border border-border bg-bg p-1">
          {SPEECH_RATES.map((r) => (
            <button
              key={r}
              onClick={() => void setTts({ rate: r })}
              className={`rounded-lg px-3.5 py-1.5 text-sm tabular-nums transition ${
                rate === r ? "bg-surface font-semibold text-accent shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {r}x
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

export function EmotionPromptField() {
  const on = useSettings((s) => s.emotionPrompt);
  const set = useSettings((s) => s.setEmotionPrompt);
  return (
    <Field
      label="¿Cómo te sientes hoy?"
      hint="Una pregunta opcional en la pantalla Hoy. Lo que elijas se queda en esta computadora y acompaña tus notas del diario."
    >
      <Toggle checked={on} onChange={(v) => void set(v)} label={on ? "Preguntar cada día" : "No preguntar"} />
    </Field>
  );
}

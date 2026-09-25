import { useEffect } from "react";
import { VOICES } from "../../content/voices";
import { downloadSize, naturalVoiceId, naturalVoiceURI, overallPercent, sizeLabel } from "../../domain/voices";
import { speech, useSpeechState } from "../../hooks/useSpeech";
import { useSettings } from "../../stores/settingsStore";
import { useVoices } from "../../stores/voicesStore";
import { toast } from "../../stores/toastStore";
import { CheckIcon, SpeakerIcon } from "../../components/icons";
import { Field } from "./ui";

export const VOICE_SAMPLE =
  "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará yacer; junto a aguas de reposo me pastoreará.";

/**
 * Ajustes → Escuchar → Voces naturales (ADR-0011): descargar, probar, usar y quitar voces de Piper.
 */
export function NaturalVoices() {
  const { engine, installed, download, error, refresh, install, remove } = useVoices();
  const voiceURI = useSettings((s) => s.ttsVoice);
  const rate = useSettings((s) => s.ttsRate);
  const setTts = useSettings((s) => s.setTts);
  const state = useSpeechState();
  const current = naturalVoiceId(voiceURI);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const choose = async (id: string) => {
    speech.stop();
    await setTts({ voice: naturalVoiceURI(id) });
  };

  const get = async (id: string) => {
    const voice = VOICES.voices.find((v) => v.id === id);
    if (!voice) return;
    if (await install(voice)) {
      await choose(id);
      toast(`Lista la voz de ${voice.name}. Ya se usa en el modo escuchar.`, "info");
    }
  };

  const drop = async (id: string) => {
    speech.stop();
    if (current === id) await setTts({ voice: "" });
    await remove(id);
  };

  const test = (id: string) => {
    const label = `Prueba de voz natural ${id}`;
    if (state.status === "playing" && state.label === label) return speech.stop();
    void speech.play([{ id: 1, text: VOICE_SAMPLE }], { label, rate, voiceURI: naturalVoiceURI(id) });
  };

  return (
    <Field
      label="Voces naturales"
      hint={
        <>
          Suenan mucho más humanas y funcionan sin internet. Cada voz se descarga una sola vez; la primera también
          descarga el lector de voz ({sizeLabel(VOICES.engine.size)}). Vienen de Piper, un proyecto libre, y se guardan
          solo en esta computadora.
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {VOICES.voices.map((v) => {
          const has = installed.includes(v.id);
          const inUse = has && current === v.id;
          const busy = download?.id === v.id;
          const testing = state.status === "playing" && state.label === `Prueba de voz natural ${v.id}`;
          const pct = busy
            ? overallPercent({
                step: download.step,
                downloaded: download.downloaded,
                total: download.total,
                engineSize: VOICES.engine.size,
                voiceSize: v.model.size + v.config.size,
                includesEngine: download.includesEngine,
              })
            : 0;
          return (
            <li
              key={v.id}
              className={`rounded-xl border px-4 py-3 ${inUse ? "border-accent/60 bg-accent-soft/30" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {v.name}{" "}
                    <span className="font-normal text-muted">
                      · {v.gender === "mujer" ? "Mujer" : "Hombre"} · {v.accent}
                    </span>
                  </p>
                  <p className="text-xs text-muted">{v.note}</p>
                </div>
                {has ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => test(v.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
                    >
                      <SpeakerIcon size={16} duo={testing} /> {testing ? "Detener" : "Probar"}
                    </button>
                    {inUse ? (
                      <span className="inline-flex items-center gap-1 px-2 text-sm font-semibold text-accent">
                        <CheckIcon size={15} /> En uso
                      </span>
                    ) : (
                      <button
                        onClick={() => void choose(v.id)}
                        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink"
                      >
                        Usar
                      </button>
                    )}
                    <button
                      onClick={() => void drop(v.id)}
                      className="rounded-lg px-2 py-1.5 text-sm text-muted hover:text-ink"
                      title="Borra la voz de esta computadora. La puedes volver a descargar."
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => void get(v.id)}
                    disabled={download !== null}
                    className="shrink-0 rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent-soft disabled:opacity-50"
                  >
                    {busy ? "Descargando…" : `Descargar (${sizeLabel(downloadSize(v, VOICES.engine.size, engine))})`}
                  </button>
                )}
              </div>
              {busy && (
                <div className="mt-2.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {download.step === "engine" ? "Descargando el lector de voz…" : "Descargando la voz…"} {pct} %
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="mt-2 text-sm" role="status">
          {error}
        </p>
      )}
    </Field>
  );
}

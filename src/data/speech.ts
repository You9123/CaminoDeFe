import { cleanForSpeech, pickVoice, splitForSpeech } from "../domain/speech";

/**
 * Control del texto a voz (Web Speech API). No es React: una sola instancia para toda la app,
 * así al cambiar de pantalla no quedan dos lecturas a la vez.
 *
 * Pausar = detener y recordar en qué versículo iba (en Chromium, `pause()` no es confiable).
 */
export type SpeechItem = { id: number; text: string };

type Listener = (state: SpeechState) => void;
export type SpeechState = {
  status: "idle" | "playing" | "paused";
  /** Id del elemento que se está leyendo (versículo), o null. */
  current: number | null;
  /** Qué se está leyendo (ej. "Juan 3"), para mostrarlo. */
  label: string;
};

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Las voces llegan de forma asíncrona la primera vez. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    window.setTimeout(done, 1500);
  });
}

class SpeechController {
  private items: SpeechItem[] = [];
  private index = 0;
  private run = 0; // se incrementa en cada inicio/parada: descarta eventos viejos
  private opts = { rate: 1, voiceURI: "" };
  private onFinish: (() => void) | null = null;
  // Referencias para que el navegador no descarte las frases antes de leerlas (bug de Chromium).
  private alive: SpeechSynthesisUtterance[] = [];
  state: SpeechState = { status: "idle", current: null, label: "" };
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(partial: Partial<SpeechState>) {
    this.state = { ...this.state, ...partial };
    for (const fn of this.listeners) fn(this.state);
  }

  /** Empieza a leer una lista (por ejemplo, los versículos de un capítulo). */
  async play(
    items: SpeechItem[],
    opts: { label: string; rate: number; voiceURI: string; from?: number; onFinish?: () => void },
  ) {
    this.stop();
    this.items = items;
    this.index = Math.max(
      0,
      items.findIndex((i) => i.id === (opts.from ?? items[0]?.id)),
    );
    this.opts = { rate: opts.rate, voiceURI: opts.voiceURI };
    this.onFinish = opts.onFinish ?? null;
    this.set({ label: opts.label });
    await this.speakFrom(this.index);
  }

  /** Cambia la velocidad sin perder el lugar (vuelve a empezar el versículo actual). */
  async setRate(rate: number) {
    this.opts.rate = rate;
    if (this.state.status === "playing") {
      this.cancelEngine();
      await this.speakFrom(this.index);
    }
  }

  pause() {
    if (this.state.status !== "playing") return;
    this.cancelEngine();
    this.set({ status: "paused" });
  }

  async resume() {
    if (this.state.status !== "paused") return;
    await this.speakFrom(this.index);
  }

  stop() {
    this.cancelEngine();
    this.items = [];
    this.onFinish = null;
    this.set({ status: "idle", current: null, label: "" });
  }

  private cancelEngine() {
    this.run++;
    this.alive = [];
    if (speechSupported()) window.speechSynthesis.cancel();
  }

  private async speakFrom(index: number) {
    if (!speechSupported()) return;
    const run = ++this.run;
    const voices = await loadVoices();
    if (run !== this.run) return;
    const voice = pickVoice(voices, this.opts.voiceURI);
    this.set({ status: "playing" });

    const speakItem = (i: number) => {
      if (run !== this.run) return;
      if (i >= this.items.length) {
        const finish = this.onFinish;
        this.items = [];
        this.onFinish = null;
        this.set({ status: "idle", current: null });
        finish?.();
        return;
      }
      this.index = i;
      this.set({ current: this.items[i].id });
      const chunks = splitForSpeech(cleanForSpeech(this.items[i].text));
      if (chunks.length === 0) return speakItem(i + 1);
      chunks.forEach((chunk, c) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = voice?.lang ?? "es-MX";
        if (voice) u.voice = voice;
        u.rate = this.opts.rate;
        if (c === chunks.length - 1) u.onend = () => speakItem(i + 1);
        u.onerror = (e) => {
          // "interrupted"/"canceled" llegan al pausar o detener: no son errores reales.
          if (e.error !== "interrupted" && e.error !== "canceled") console.error("Error de voz", e.error);
        };
        this.alive.push(u);
        window.speechSynthesis.speak(u);
      });
    };
    speakItem(index);
  }
}

export const speech = new SpeechController();

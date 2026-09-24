/**
 * Modo escuchar (Documento Maestro §2.11): lógica pura para el texto a voz.
 * La voz la pone el sistema (Web Speech API con las voces instaladas en Windows).
 */

export const SPEECH_RATES = [0.75, 1, 1.25, 1.5] as const;

/** Voz tal como la describe el navegador (solo lo que nos importa). */
export type VoiceInfo = { voiceURI: string; name: string; lang: string; localService: boolean };

/** Preferencia de acento: primero Latinoamérica (la app se usa en Costa Rica), luego España. */
const LANG_ORDER = ["es-MX", "es-US", "es-419", "es-CR", "es-CO", "es-AR", "es-CL", "es-ES"];

/**
 * Voces en español, de la más recomendable a la menos:
 * primero las instaladas (funcionan sin internet), después por acento.
 */
export function spanishVoices<V extends VoiceInfo>(voices: readonly V[]): V[] {
  const rank = (lang: string) => {
    const i = LANG_ORDER.findIndex((l) => l.toLowerCase() === lang.replace("_", "-").toLowerCase());
    return i === -1 ? LANG_ORDER.length : i;
  };
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith("es"))
    .sort(
      (a, b) =>
        Number(b.localService) - Number(a.localService) || rank(a.lang) - rank(b.lang) || a.name.localeCompare(b.name),
    );
}

/** La voz elegida en Ajustes si sigue existiendo; si no, la mejor en español; si no hay, null. */
export function pickVoice<V extends VoiceInfo>(voices: readonly V[], preferredURI: string): V | null {
  const es = spanishVoices(voices);
  return es.find((v) => v.voiceURI === preferredURI) ?? es[0] ?? null;
}

/**
 * Limpia el texto para leerlo en voz alta: quita los encabezados acrósticos del Salmo 119
 * ("ALEPH.", "NUN.") y las notas "(Selah.)", que suenan raro.
 */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/^[A-ZÁÉÍÓÚÑ]{2,}\.\s+/, "")
    .replace(/\(Selah\.?\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parte un texto largo en trozos que el motor de voz lee sin cortarse
 * (algunos motores se detienen con textos de más de ~200 caracteres).
 * Corta en finales de frase y, si hace falta, en comas o dos puntos.
 */
export function splitForSpeech(text: string, max = 200): string[] {
  const clean = text.trim();
  if (clean.length <= max) return clean ? [clean] : [];
  const pieces = clean.split(/(?<=[.;?!])\s+/);
  const out: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= max) {
      out.push(piece);
      continue;
    }
    // Frase muy larga: se corta por comas o dos puntos, juntando pedazos hasta el máximo.
    let buf = "";
    for (const part of piece.split(/(?<=[,:])\s+/)) {
      if (buf && buf.length + part.length + 1 > max) {
        out.push(buf);
        buf = part;
      } else {
        buf = buf ? `${buf} ${part}` : part;
      }
    }
    if (buf) out.push(buf);
  }
  // Junta frases cortas seguidas para que la lectura no suene entrecortada.
  const merged: string[] = [];
  for (const p of out) {
    const last = merged[merged.length - 1];
    if (last && last.length + p.length + 1 <= max) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p);
  }
  return merged;
}

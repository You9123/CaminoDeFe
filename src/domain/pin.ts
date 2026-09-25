/**
 * PIN del diario (Documento Maestro §2.9, ADR-0010).
 *
 * - Es un candado de la app, para que otra persona que use la computadora no lea tu diario.
 *   NO cifra la base de datos: quien tenga acceso a los archivos podría leerlos.
 * - El PIN nunca se guarda: se guarda su huella (PBKDF2-SHA256 con sal) en `settings`.
 * - Después de 5 intentos fallidos hay que esperar (30 s, luego 1 min, 2 min... hasta 15 min).
 * - Si lo olvidas, puedes pedir quitarlo y esperar 24 horas. Tus entradas no se borran.
 *   Si alguien lo pide y tú abres el diario con tu PIN antes de ese plazo, la solicitud se cancela.
 */

export const PIN_MIN = 4;
export const PIN_MAX = 6;
export const PIN_ITERATIONS = 150_000;
/** Intentos fallidos permitidos antes de empezar a esperar. */
export const FREE_TRIES = 5;
export const FIRST_WAIT_MS = 30_000;
export const MAX_WAIT_MS = 15 * 60_000;
/** Cuánto hay que esperar para quitar un PIN olvidado. */
export const RESET_WAIT_MS = 24 * 60 * 60_000;
/** Si sales del diario por más de este tiempo, se vuelve a cerrar. */
export const RELOCK_AFTER_MS = 10 * 60_000;

// ---------- Validar ----------

/** Qué le falta al PIN, o null si está bien. */
export function pinProblem(pin: string): string | null {
  if (!/^\d*$/.test(pin)) return "Usa solo números.";
  if (pin.length < PIN_MIN) return `Usa al menos ${PIN_MIN} números.`;
  if (pin.length > PIN_MAX) return `Usa como máximo ${PIN_MAX} números.`;
  return null;
}

/** PIN fácil de adivinar (1111, 1234, 4321...). Solo se avisa; no se prohíbe. */
export function isEasyPin(pin: string): boolean {
  if (pinProblem(pin)) return false;
  const d = [...pin].map(Number);
  const same = d.every((x) => x === d[0]);
  const up = d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10);
  const down = d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10);
  return same || up || down;
}

/** Solo números y hasta PIN_MAX: para limpiar lo que se escribe en el campo. */
export const cleanPinInput = (v: string) => v.replace(/\D/g, "").slice(0, PIN_MAX);

// ---------- Huella ----------

const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** "pbkdf2-sha256$150000$<sal>$<huella>" */
export async function hashPin(pin: string, iterations = PIN_ITERATIONS): Promise<string> {
  const problem = pinProblem(pin);
  if (problem) throw new Error(problem);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${toB64(salt)}$${toB64(hash)}`;
}

/** true si el PIN corresponde a la huella guardada. Una huella dañada nunca coincide. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [alg, iter, saltB64, hashB64] = stored.split("$");
  const iterations = Number(iter);
  if (alg !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 1 || !saltB64 || !hashB64) return false;
  if (pinProblem(pin)) return false;
  let salt: Uint8Array<ArrayBuffer>, expected: Uint8Array;
  try {
    salt = fromB64(saltB64);
    expected = fromB64(hashB64);
  } catch {
    return false;
  }
  const got = await derive(pin, salt, iterations);
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

export const isPinHash = (v: string | null | undefined): v is string => Boolean(v?.startsWith("pbkdf2-sha256$"));

// ---------- Intentos fallidos ----------

export type Failures = { count: number; until: number | null };
export const NO_FAILURES: Failures = { count: 0, until: null };

/** Cuánto hay que esperar después del intento fallido número `count`. */
export function waitAfter(count: number): number {
  if (count < FREE_TRIES) return 0;
  return Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (count - FREE_TRIES));
}

export function registerFailure(f: Failures, now: number): Failures {
  const count = f.count + 1;
  const wait = waitAfter(count);
  return { count, until: wait > 0 ? now + wait : null };
}

/** Milisegundos que faltan para poder intentar de nuevo (0 si ya se puede). */
export const lockRemaining = (f: Failures, now: number) => (f.until ? Math.max(0, f.until - now) : 0);

/** Se guarda como "3|1727190000000" (o "3|"). */
export const serializeFailures = (f: Failures) => `${f.count}|${f.until ?? ""}`;

export function parseFailures(v: string | null): Failures {
  if (!v) return NO_FAILURES;
  const [c, u] = v.split("|");
  const count = Number(c);
  const until = u ? Number(u) : null;
  if (!Number.isInteger(count) || count < 0) return NO_FAILURES;
  return { count, until: until !== null && Number.isFinite(until) ? until : null };
}

/** "30 segundos", "2 minutos"... */
export function waitLabel(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return s === 1 ? "1 segundo" : `${s} segundos`;
  const m = Math.ceil(s / 60);
  return m === 1 ? "1 minuto" : `${m} minutos`;
}

// ---------- PIN olvidado ----------

/** Cuándo se podrá quitar el PIN (ms), según cuándo se pidió. */
export const resetReadyAt = (requestedAt: number) => requestedAt + RESET_WAIT_MS;

export function canReset(requestedAt: number | null, now: number): boolean {
  return requestedAt !== null && now >= resetReadyAt(requestedAt);
}

// ---------- Volver a cerrar ----------

/** Si saliste del diario hace más de RELOCK_AFTER_MS, al volver hay que escribir el PIN otra vez. */
export function shouldRelock(leftAt: number | null, now: number): boolean {
  return leftAt !== null && now - leftAt >= RELOCK_AFTER_MS;
}

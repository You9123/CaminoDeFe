import Database from "@tauri-apps/plugin-sql";

/**
 * Conexiones a SQLite (vía tauri-plugin-sql).
 * - bible.db: texto bíblico, solo lectura (lo instala Rust al iniciar la app).
 * - user.db: progreso del usuario (las migraciones corren en Rust).
 *
 * Regla de arquitectura: las pantallas NUNCA usan SQL directamente;
 * siempre pasan por los repositorios (bibleRepo, progressRepo...).
 */
let bible: Promise<Database> | null = null;
let user: Promise<Database> | null = null;

export const bibleDb = () => (bible ??= Database.load("sqlite:bible.db"));
export const userDb = () => (user ??= Database.load("sqlite:user.db"));

/** true cuando corre dentro de Tauri (y no en un navegador normal con `pnpm dev`). */
export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const TRANSLATION_ID = "RV1909";

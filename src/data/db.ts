import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

/**
 * Conexiones a SQLite (vía tauri-plugin-sql).
 * - bible.db: texto bíblico, solo lectura (lo instala Rust al iniciar la app).
 * - user.db: progreso del usuario (las migraciones corren en Rust).
 *   Con `pnpm tauri dev` es user-dev.db: Rust decide cuál y el frontend lo pregunta.
 *
 * Regla de arquitectura: las pantallas NUNCA usan SQL directamente;
 * siempre pasan por los repositorios (bibleRepo, progressRepo...).
 */
let bible: Promise<Database> | null = null;
let user: Promise<Database> | null = null;

export const bibleDb = () => (bible ??= Database.load("sqlite:bible.db"));
export const userDbUrl = () => invoke<string>("user_db_url");
export const userDb = () => (user ??= userDbUrl().then((url) => Database.load(url)));

/** true cuando la app usa la base de datos de prueba (modo desarrollo). */
export const isDevDatabase = async () => (await userDbUrl()).includes("dev");

/** true cuando corre dentro de Tauri (y no en un navegador normal con `pnpm dev`). */
export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const TRANSLATION_ID = "RV1909";

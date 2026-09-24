import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { userDb } from "./db";
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  BACKUP_TABLES,
  parseBackup,
  TABLE_NAMES,
  type Backup,
  type BackupTable,
} from "../domain/backup";

/** Arma el respaldo con todas las tablas del usuario. */
export async function createBackup(): Promise<Backup> {
  const db = await userDb();
  const tables = {} as Record<BackupTable, unknown[]>;
  for (const t of TABLE_NAMES) {
    tables[t] = await db.select<unknown[]>(`SELECT * FROM ${t}`);
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exported_at: new Date().toISOString(),
    app_version: await getVersion(),
    tables: tables as Backup["tables"],
  };
}

export async function writeBackupFile(path: string, backup: Backup): Promise<void> {
  await invoke("write_backup_file", { path, contents: JSON.stringify(backup, null, 2) });
}

export async function readBackupFile(path: string): Promise<Backup> {
  const contents = await invoke<string>("read_backup_file", { path });
  return parseBackup(contents);
}

/** Guarda una copia automática (por ejemplo, antes de importar). Devuelve la ruta. */
export async function saveAutomaticBackup(reason: string): Promise<string> {
  const dir = await invoke<string>("auto_backups_dir");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sep = dir.includes("\\") ? "\\" : "/";
  const path = `${dir}${sep}${reason}-${stamp}.json`;
  await writeBackupFile(path, await createBackup());
  return path;
}

const CHUNK = 100;

/**
 * Reemplaza TODOS los datos del usuario por los del respaldo.
 * Antes de tocar nada guarda una copia automática de lo que había.
 */
export async function restoreBackup(backup: Backup): Promise<{ safetyCopy: string }> {
  const safetyCopy = await saveAutomaticBackup("antes-de-importar");
  const db = await userDb();

  for (const t of TABLE_NAMES) {
    await db.execute(`DELETE FROM ${t}`);
  }

  for (const t of TABLE_NAMES) {
    const rows = backup.tables[t] as Record<string, unknown>[];
    if (rows.length === 0) continue;
    const columns = Object.keys(BACKUP_TABLES[t].shape);
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const params: unknown[] = [];
      const values = chunk.map((row) => {
        const placeholders = columns.map((c) => {
          params.push(row[c] ?? null);
          return `$${params.length}`;
        });
        return `(${placeholders.join(", ")})`;
      });
      await db.execute(`INSERT INTO ${t} (${columns.join(", ")}) VALUES ${values.join(", ")}`, params);
    }
  }

  // El perfil siempre debe existir (id = 1).
  await db.execute("INSERT OR IGNORE INTO profile (id, name) VALUES (1, '')");
  return { safetyCopy };
}

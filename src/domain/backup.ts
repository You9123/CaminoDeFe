import { z } from "zod";

/**
 * Formato del archivo de respaldo (.json).
 * Guarda TODAS las tablas de user.db. La Biblia no se incluye: viene con la app.
 */
export const BACKUP_APP = "camino-de-fe";
/** 2: agrega challenge_runs (Sprint 2B). Los respaldos de formato 1 se siguen pudiendo importar. */
export const BACKUP_FORMAT = 2;

const text = z.string();
const nullableText = z.string().nullable();
const int = z.number().int();

export const BACKUP_TABLES = {
  profile: z.object({ id: int, name: text, created_at: text }),
  activity_log: z.object({
    id: int,
    type: text,
    ref: nullableText,
    xp: int,
    day: text,
    duration_sec: int.nullable(),
    created_at: text,
  }),
  chapter_progress: z.object({
    book_id: int,
    chapter: int,
    times_read: int,
    first_read_at: text,
    last_read_at: text,
  }),
  settings: z.object({ key: text, value: text }),
  journal_entries: z.object({
    id: int,
    day: text,
    ref: nullableText,
    kind: text,
    content: text,
    emotion: nullableText,
    created_at: text,
    updated_at: text,
  }),
  verse_marks: z.object({
    ref: text,
    color: nullableText,
    favorite: int,
    created_at: text,
    updated_at: text,
  }),
  challenge_runs: z.object({
    id: int,
    challenge_id: text,
    started_at: text,
    started_day: text,
    status: text,
    ended_at: nullableText,
  }),
} as const;

export type BackupTable = keyof typeof BACKUP_TABLES;
export const TABLE_NAMES = Object.keys(BACKUP_TABLES) as BackupTable[];

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  format: z.union([z.literal(1), z.literal(BACKUP_FORMAT)]),
  exported_at: text,
  app_version: text.optional(),
  tables: z.object({
    profile: z.array(BACKUP_TABLES.profile),
    activity_log: z.array(BACKUP_TABLES.activity_log),
    chapter_progress: z.array(BACKUP_TABLES.chapter_progress),
    settings: z.array(BACKUP_TABLES.settings),
    journal_entries: z.array(BACKUP_TABLES.journal_entries),
    verse_marks: z.array(BACKUP_TABLES.verse_marks),
    /** No existe en los respaldos de formato 1. */
    challenge_runs: z.array(BACKUP_TABLES.challenge_runs).default([]),
  }),
});

export type Backup = z.infer<typeof backupSchema>;
/** Lo que puede venir en el archivo (antes de completar valores por defecto). */
export type BackupInput = z.input<typeof backupSchema>;

/** Lee y valida un respaldo. Lanza un Error con un mensaje claro si algo no cuadra. */
export function parseBackup(json: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  const result = backupSchema.safeParse(data);
  if (!result.success) {
    const app = (data as { app?: unknown })?.app;
    if (app !== BACKUP_APP) throw new Error("Este archivo no es un respaldo de Camino de Fe.");
    throw new Error("El respaldo está incompleto o dañado.");
  }
  return result.data;
}

export type BackupSummary = {
  exportedAt: string;
  activities: number;
  chaptersRead: number;
  journalEntries: number;
  favorites: number;
  totalXp: number;
};

export function summarizeBackup(b: Backup): BackupSummary {
  return {
    exportedAt: b.exported_at,
    activities: b.tables.activity_log.length,
    chaptersRead: b.tables.chapter_progress.length,
    journalEntries: b.tables.journal_entries.length,
    favorites: b.tables.verse_marks.filter((m) => m.favorite === 1).length,
    totalXp: b.tables.activity_log.reduce((s, a) => s + a.xp, 0),
  };
}

export function backupFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `camino-de-fe-respaldo-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

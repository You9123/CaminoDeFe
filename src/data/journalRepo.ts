import { userDb } from "./db";
import { gameDay } from "../domain/day";

export type JournalKind = "reflection" | "application" | "free";

export type JournalEntry = {
  id: number;
  day: string;
  ref: string | null;
  kind: JournalKind;
  content: string;
  emotion: string | null;
  created_at: string;
  updated_at: string;
};

export async function addJournalEntry(input: {
  kind: JournalKind;
  content: string;
  ref?: string | null;
}): Promise<void> {
  const content = input.content.trim();
  if (!content) return;
  const db = await userDb();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO journal_entries (day, ref, kind, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)",
    [gameDay(), input.ref ?? null, input.kind, content, now],
  );
}

export async function listJournalEntries(
  filter: { search?: string; kind?: JournalKind | null } = {},
): Promise<JournalEntry[]> {
  const db = await userDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.kind) {
    params.push(filter.kind);
    where.push(`kind = $${params.length}`);
  }
  const search = filter.search?.trim();
  if (search) {
    params.push(`%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`content LIKE $${params.length} ESCAPE '\\'`);
  }
  const sql = `SELECT * FROM journal_entries ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
               ORDER BY day DESC, created_at DESC LIMIT 500`;
  return db.select<JournalEntry[]>(sql, params);
}

export async function updateJournalEntry(id: number, content: string): Promise<void> {
  const db = await userDb();
  await db.execute("UPDATE journal_entries SET content = $1, updated_at = $2 WHERE id = $3", [
    content.trim(),
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteJournalEntry(id: number): Promise<void> {
  const db = await userDb();
  await db.execute("DELETE FROM journal_entries WHERE id = $1", [id]);
}

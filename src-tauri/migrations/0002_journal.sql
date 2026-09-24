-- user.db · Migración 2 · Sprint 1A
-- Diario: reflexiones, aplicaciones y (en el Sprint 1B) entradas libres.

CREATE TABLE journal_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  day         TEXT NOT NULL,              -- 'YYYY-MM-DD' (día de juego)
  ref         TEXT,                       -- referencia bíblica relacionada, ej. 'JHN.3' o 'PSA.23.1'
  kind        TEXT NOT NULL,              -- 'reflection' | 'application' | 'free'
  content     TEXT NOT NULL,
  emotion     TEXT,                       -- V2: ¿Cómo me siento hoy?
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_journal_day ON journal_entries (day);

-- user.db · Migración 3 · Sprint 1B
-- Marcas de versículos: resaltado (color) y/o favorito.
-- Una fila por versículo; si no tiene color ni es favorito, se borra.

CREATE TABLE verse_marks (
  ref         TEXT PRIMARY KEY,         -- 'JHN.3.16'
  color       TEXT,                     -- 'yellow' | 'green' | 'blue' | 'rose' | NULL
  favorite    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_verse_marks_favorite ON verse_marks (favorite, updated_at);

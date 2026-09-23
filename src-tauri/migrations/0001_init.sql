-- user.db · Migración 1 · Sprint 0
-- activity_log es la FUENTE DE VERDAD: XP, rachas y estadísticas se calculan a partir de ella.
-- Las demás tablas del documento maestro (diario, misiones, logros...) llegan en migraciones futuras,
-- cuando se implemente cada función.

CREATE TABLE profile (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  name        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO profile (id, name) VALUES (1, '');

CREATE TABLE activity_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,            -- 'chapter_read', 'bonus_5_chapters', 'daily_verse', ...
  ref           TEXT,                     -- referencia bíblica, ej. 'JHN.3'
  xp            INTEGER NOT NULL DEFAULT 0,
  day           TEXT NOT NULL,            -- 'YYYY-MM-DD' (día de juego, termina a las 3:00 a. m.)
  duration_sec  INTEGER,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_activity_day ON activity_log (day);
CREATE INDEX idx_activity_type_day ON activity_log (type, day);

CREATE TABLE chapter_progress (
  book_id        INTEGER NOT NULL,
  chapter        INTEGER NOT NULL,
  times_read     INTEGER NOT NULL DEFAULT 0,
  first_read_at  TEXT NOT NULL,
  last_read_at   TEXT NOT NULL,
  PRIMARY KEY (book_id, chapter)
);

-- Ajustes y valores sueltos (última posición de lectura, tema, etc.)
CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

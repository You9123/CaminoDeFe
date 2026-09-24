-- user.db · Migración 5 · Sprint 2C
-- ¿Cómo me siento hoy? Una emoción por día de juego (se puede cambiar durante el día).

CREATE TABLE emotions_log (
  day         TEXT PRIMARY KEY,           -- 'YYYY-MM-DD' (día de juego)
  emotion     TEXT NOT NULL,              -- id de content/emotions.json
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

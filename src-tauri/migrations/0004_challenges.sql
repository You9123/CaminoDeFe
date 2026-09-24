-- user.db · Migración 4 · Sprint 2B
-- Desafíos de varios días (content/challenges.json). Una fila por intento.
-- La recompensa de XP NO va aquí: es una fila 'challenge' en activity_log (fuente de verdad).

CREATE TABLE challenge_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id  TEXT NOT NULL,
  started_at    TEXT NOT NULL,            -- ISO; cuenta lo que se haga desde este momento
  started_day   TEXT NOT NULL,            -- día de juego en que empezó (para el plazo en días)
  status        TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'abandoned' | 'expired'
  ended_at      TEXT
);
CREATE INDEX idx_challenge_runs_status ON challenge_runs (status);

-- Initial schema migration. Mirrors schema.sql at the repo root (kept there
-- too, per spec, as the canonical human-readable copy). Applied via:
--   wrangler d1 migrations apply chore-tracker --local
--   wrangler d1 migrations apply chore-tracker --remote

CREATE TABLE IF NOT EXISTS completions (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  person_id  TEXT NOT NULL,
  chore_id   TEXT NOT NULL,
  done_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);

CREATE TABLE IF NOT EXISTS extras (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  person_id  TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extras_date ON extras(date);

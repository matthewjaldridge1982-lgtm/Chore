-- Chore tracker schema.
--
-- Apply with:
--   wrangler d1 execute chore-tracker --remote --file=./schema.sql   (production)
--   wrangler d1 execute chore-tracker --local --file=./schema.sql    (local dev)
--
-- People and chores are NOT stored here — they live entirely in
-- public/config.js. This database only ever records which (date, person,
-- chore) combinations were completed, and free-text "extras".

CREATE TABLE IF NOT EXISTS completions (
  id         TEXT PRIMARY KEY,     -- `${date}|${person_id}|${chore_id}`
  date       TEXT NOT NULL,        -- 'YYYY-MM-DD', local Melbourne date
  person_id  TEXT NOT NULL,
  chore_id   TEXT NOT NULL,
  done_at    TEXT NOT NULL         -- ISO 8601 UTC timestamp
);
CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);

CREATE TABLE IF NOT EXISTS extras (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  person_id  TEXT NOT NULL,
  text       TEXT NOT NULL,        -- max 200 chars, trimmed, server-enforced
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extras_date ON extras(date);

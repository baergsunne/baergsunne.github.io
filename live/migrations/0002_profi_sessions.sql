-- Isolated professional timer sessions. Does not alter the existing championship tables.
CREATE TABLE IF NOT EXISTS profi_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK(mode IN ('official','free')),
  year INTEGER,
  round INTEGER,
  status TEXT NOT NULL CHECK(status IN ('setup','live','finished')),
  revision INTEGER NOT NULL DEFAULT 0,
  document TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS profi_sessions_status ON profi_sessions(status,updated_at);
CREATE INDEX IF NOT EXISTS profi_sessions_round ON profi_sessions(mode,year,round);

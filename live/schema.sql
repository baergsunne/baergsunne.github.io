CREATE TABLE IF NOT EXISTS owner (
  id INTEGER PRIMARY KEY CHECK (id=1), username TEXT NOT NULL,
  salt TEXT NOT NULL, password_hash TEXT NOT NULL, iterations INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  client_hash TEXT PRIMARY KEY, failures INTEGER NOT NULL, window_start INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tournaments (
  year INTEGER PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0,
  document TEXT NOT NULL, updated_at TEXT NOT NULL,
  actor TEXT NOT NULL, action TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL,
  revision INTEGER NOT NULL, recorded_at TEXT NOT NULL,
  actor TEXT NOT NULL, action TEXT NOT NULL,
  before_document TEXT, after_document TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS audit_tournament_insert AFTER INSERT ON tournaments
BEGIN
  INSERT INTO audit(year,revision,recorded_at,actor,action,before_document,after_document)
  VALUES(NEW.year,NEW.revision,NEW.updated_at,NEW.actor,NEW.action,NULL,NEW.document);
END;
CREATE TRIGGER IF NOT EXISTS audit_tournament_update AFTER UPDATE ON tournaments
BEGIN
  INSERT INTO audit(year,revision,recorded_at,actor,action,before_document,after_document)
  VALUES(NEW.year,NEW.revision,NEW.updated_at,NEW.actor,NEW.action,OLD.document,NEW.document);
END;

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

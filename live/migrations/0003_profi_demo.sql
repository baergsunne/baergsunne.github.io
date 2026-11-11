-- Ephemeral, unauthenticated *demo* rooms; never joined to championships or admin sessions.
CREATE TABLE IF NOT EXISTS profi_demo_sessions (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  document TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profi_demo_expires ON profi_demo_sessions(expires_at);
CREATE TABLE IF NOT EXISTS profi_demo_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

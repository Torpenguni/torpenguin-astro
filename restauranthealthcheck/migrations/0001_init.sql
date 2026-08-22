-- Restaurant Health Check — initial schema
-- Timestamps are unix seconds (INTEGER) so comparisons stay trivial.

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,   -- always stored lowercase + trimmed
  password_hash     TEXT NOT NULL,
  email_verified_at INTEGER,
  created_at        INTEGER NOT NULL,
  last_login_at     INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,              -- sha256 of the cookie token
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS tokens (
  id         TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,          -- sha256 of the emailed token
  user_id    TEXT NOT NULL,
  purpose    TEXT NOT NULL,                 -- 'verify' | 'reset'
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tokens_user_purpose ON tokens(user_id, purpose);

-- One row per completed (or abandoned) assessment. user_id is nullable: most
-- people at a booth never create an account, and their lead still matters.
CREATE TABLE IF NOT EXISTS assessments (
  id             TEXT PRIMARY KEY,
  user_id        TEXT,
  session_key    TEXT,                      -- browser-side id, dedupes retries
  email          TEXT,
  name           TEXT,
  shop           TEXT,
  contact        TEXT,
  shop_type      TEXT,
  branches       TEXT,
  age            TEXT,
  mode           TEXT,                      -- 'quick' | 'deep'
  completed      INTEGER NOT NULL DEFAULT 0,
  total_score    INTEGER,
  type_code      TEXT,
  type_name      TEXT,
  tier           TEXT,                      -- HOT | WARM | NURTURE
  scores_json    TEXT,
  answers_json   TEXT,
  intent_json    TEXT,
  financial_json TEXT,
  consent_at     INTEGER,
  user_agent     TEXT,
  referrer       TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(email);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created ON assessments(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_key);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

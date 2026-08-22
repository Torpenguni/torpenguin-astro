-- Adds the admin back office and tracks which result emails have gone out.

-- Set once the summary email for a finished assessment has been sent, so a
-- retried save never mails the same person twice.
ALTER TABLE assessments ADD COLUMN result_email_sent_at INTEGER;

-- Admins are not users: they never appear in `users`, cannot do a password
-- reset, and hold a separate cookie. One shared password from an environment
-- secret gates them.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         TEXT PRIMARY KEY,   -- sha256 of the cookie token
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

// Session and one-time-token handling.
//
// The cookie carries a random token; the database only ever stores its SHA-256
// hash. Same for verification and reset tokens — a database dump therefore
// cannot be replayed as a login or a password reset.

import { hashToken, randomToken, newId } from './crypto.js';
import { SESSION_COOKIE, SESSION_DAYS, now, readCookie } from './http.js';

export async function createSession(db, userId, request) {
  const token = randomToken(32);
  const id = await hashToken(token);
  const ts = now();
  await db
    .prepare('INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, ts, ts + SESSION_DAYS * 86400, (request.headers.get('user-agent') || '').slice(0, 300))
    .run();
  return token;
}

export async function getUser(db, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const id = await hashToken(token);
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.email_verified_at, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(id, now())
    .first();
  return row || null;
}

export async function destroySession(db, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(await hashToken(token)).run();
}

export async function destroyAllSessions(db, userId) {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

// purpose: 'verify' | 'reset'
export async function issueToken(db, userId, purpose, ttlSeconds) {
  // Only one live token per purpose — asking again invalidates the previous
  // link rather than leaving a trail of working ones in the inbox.
  await db.prepare('DELETE FROM tokens WHERE user_id = ? AND purpose = ? AND used_at IS NULL').bind(userId, purpose).run();

  const token = randomToken(32);
  const ts = now();
  await db
    .prepare('INSERT INTO tokens (id, token_hash, user_id, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId(), await hashToken(token), userId, purpose, ts + ttlSeconds, ts)
    .run();
  return token;
}

// Consumes the token: valid exactly once, and only before it expires.
export async function useToken(db, token, purpose) {
  if (!token) return null;
  const hash = await hashToken(token);
  const row = await db
    .prepare('SELECT id, user_id, expires_at, used_at FROM tokens WHERE token_hash = ? AND purpose = ?')
    .bind(hash, purpose)
    .first();
  if (!row || row.used_at || row.expires_at <= now()) return null;

  const res = await db
    .prepare('UPDATE tokens SET used_at = ? WHERE id = ? AND used_at IS NULL')
    .bind(now(), row.id)
    .run();
  // If another request consumed it first, the update matches nothing.
  if (!res.meta || res.meta.changes !== 1) return null;

  return row.user_id;
}

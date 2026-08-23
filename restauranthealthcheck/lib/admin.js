// Admin access.
//
// Admins are not users: no row in `users`, no password reset, a separate
// cookie. One shared password from an environment secret opens the back
// office, and the resulting session token is stored hashed like every other
// token here.

import { hashToken, randomToken } from './crypto.js';
import { now, readCookie } from './http.js';

export const ADMIN_COOKIE = 'rhc_admin';
export const ADMIN_HOURS = 12;

// Compares by digest so the check does not leak the password's length or a
// shared prefix through timing.
export async function passwordMatches(given, expected) {
  if (!expected) return false;
  const [a, b] = await Promise.all([hashToken(String(given || '')), hashToken(String(expected))]);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminSession(db, request) {
  const token = randomToken(32);
  const ts = now();
  await db
    .prepare('INSERT INTO admin_sessions (id, created_at, expires_at, ip) VALUES (?, ?, ?, ?)')
    .bind(await hashToken(token), ts, ts + ADMIN_HOURS * 3600, request.headers.get('cf-connecting-ip') || null)
    .run();
  return token;
}

export async function isAdmin(db, request) {
  const token = readCookie(request, ADMIN_COOKIE);
  if (!token) return false;
  const row = await db
    .prepare('SELECT id FROM admin_sessions WHERE id = ? AND expires_at > ?')
    .bind(await hashToken(token), now())
    .first();
  return !!row;
}

export async function endAdminSession(db, request) {
  const token = readCookie(request, ADMIN_COOKIE);
  if (!token) return;
  await db.prepare('DELETE FROM admin_sessions WHERE id = ?').bind(await hashToken(token)).run();
}

// SQLite refuses a LIKE pattern longer than 50 bytes with
// "LIKE or GLOB pattern too complex" — a hard limit, not a tunable. The cap is
// on BYTES, and Thai runs 3 bytes per character, so a shop name of ~17 Thai
// characters is already over it. Counting characters here would let a normal
// Thai search crash the whole page with a 500.
const LIKE_MAX_BYTES = 50;

// Cuts to a byte budget without splitting a character in half.
function truncateBytes(str, maxBytes) {
  const enc = new TextEncoder();
  if (enc.encode(str).length <= maxBytes) return str;
  let out = '';
  let used = 0;
  for (const ch of str) {
    const size = enc.encode(ch).length;
    if (used + size > maxBytes) break;
    out += ch;
    used += size;
  }
  return out;
}

// Shared filter builder for the list and the CSV export, so the file someone
// downloads always matches the rows they were looking at.
export function buildFilter(url) {
  const where = [];
  const binds = [];

  const tier = url.searchParams.get('tier');
  if (tier && ['HOT', 'WARM', 'NURTURE'].includes(tier)) {
    where.push('tier = ?');
    binds.push(tier);
  }

  const type = url.searchParams.get('type');
  if (type) {
    where.push('shop_type = ?');
    binds.push(type.slice(0, 40));
  }

  const status = url.searchParams.get('status');
  if (status === 'completed') where.push('completed = 1');
  if (status === 'partial') where.push('completed = 0');

  // คนที่กดปุ่ม "ให้ทีม CP ติดต่อกลับ" เอง — ความตั้งใจที่เขาประกาศออกมา ต่างจาก
  // tier ที่ระบบเดาให้จากคะแนน ทีมขายควรไล่กลุ่มนี้ก่อนแม้คะแนนจะไม่สูง
  if (url.searchParams.get('asked') === '1') where.push('contact_requested_at IS NOT NULL');

  const from = parseInt(url.searchParams.get('from') || '', 10);
  if (Number.isFinite(from)) {
    where.push('created_at >= ?');
    binds.push(from);
  }

  const to = parseInt(url.searchParams.get('to') || '', 10);
  if (Number.isFinite(to)) {
    where.push('created_at <= ?');
    binds.push(to);
  }

  const q = truncateBytes((url.searchParams.get('q') || '').trim(), LIKE_MAX_BYTES - 2);
  if (q) {
    where.push('(shop LIKE ? OR name LIKE ? OR email LIKE ? OR contact LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }

  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', binds };
}

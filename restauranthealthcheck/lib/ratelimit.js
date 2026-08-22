// Fixed-window rate limiting on top of D1.
//
// Every endpoint that accepts an email address is limited twice: once by IP
// (one machine cannot hammer the whole site) and once by the email itself (an
// attacker rotating IPs still cannot flood one person's inbox or grind their
// password). Sending mail costs money and burns sender reputation, so this is
// not optional decoration.

import { clientIp, json, now } from './http.js';

export async function rateLimit(db, key, limit, windowSeconds) {
  const ts = now();
  const cutoff = ts - windowSeconds;

  // Opportunistic cleanup — cheap on average, keeps the table from growing
  // without a scheduled job.
  if (Math.random() < 0.02) {
    await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(ts - 86400).run();
  }

  const row = await db.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?').bind(key).first();

  if (!row || row.window_start <= cutoff) {
    await db
      .prepare(
        `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`,
      )
      .bind(key, ts)
      .run();
    return { ok: true };
  }

  if (row.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, row.window_start + windowSeconds - ts) };
  }

  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return { ok: true };
}

// Applies the IP and email limits together and returns a ready-made 429 when
// either trips. Returns null when the request may proceed.
export async function guard(db, request, scope, email, limits) {
  const ip = clientIp(request);

  const byIp = await rateLimit(db, `${scope}:ip:${ip}`, limits.ip[0], limits.ip[1]);
  if (!byIp.ok) return tooMany(byIp.retryAfter);

  if (email && limits.email) {
    const byEmail = await rateLimit(db, `${scope}:email:${email}`, limits.email[0], limits.email[1]);
    if (!byEmail.ok) return tooMany(byEmail.retryAfter);
  }

  return null;
}

function tooMany(retryAfter) {
  return json(
    { ok: false, error: 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง', code: 'rate_limited' },
    429,
    { 'Retry-After': String(retryAfter || 60) },
  );
}

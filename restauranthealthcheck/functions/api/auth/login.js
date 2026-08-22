import { fakeVerify, hashPassword, needsRehash, verifyPassword } from '../../../lib/crypto.js';
import {
  SESSION_COOKIE, SESSION_DAYS, fail, json, normalizeEmail, now, readJson, sameOrigin, setCookie, validEmail,
} from '../../../lib/http.js';
import { guard } from '../../../lib/ratelimit.js';
import { createSession } from '../../../lib/session.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  if (!body) return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!validEmail(email) || !password) return fail('กรุณากรอกอีเมลและรหัสผ่าน', 400);

  const db = env.DB;
  const limited = await guard(db, request, 'login', email, { ip: [20, 900], email: [10, 900] });
  if (limited) return limited;

  const user = await db
    .prepare('SELECT id, email, password_hash, email_verified_at FROM users WHERE email = ?')
    .bind(email)
    .first();

  // Same message for "no such account" and "wrong password", and the same
  // amount of work either way.
  const ok = user ? await verifyPassword(password, user.password_hash) : await fakeVerify();
  if (!ok) return fail('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401, 'bad_credentials');

  if (!user.email_verified_at) {
    return fail(
      'บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันที่เราส่งไปให้ หรือกดขอลิงก์ใหม่',
      403,
      'email_not_verified',
    );
  }

  // Transparently upgrade hashes made with fewer iterations.
  if (needsRehash(user.password_hash)) {
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(password), user.id).run();
  }

  await db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now(), user.id).run();
  const token = await createSession(db, user.id, request);

  return json({ ok: true, email: user.email }, 200, {
    'Set-Cookie': setCookie(SESSION_COOKIE, token, SESSION_DAYS * 86400),
  });
}

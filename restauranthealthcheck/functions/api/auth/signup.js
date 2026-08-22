import { hashPassword, newId } from '../../../lib/crypto.js';
import { fail, json, normalizeEmail, now, passwordProblem, readJson, sameOrigin, siteUrl, validEmail } from '../../../lib/http.js';
import { sendAccountExistsEmail, sendVerifyEmail } from '../../../lib/email.js';
import { guard } from '../../../lib/ratelimit.js';
import { issueToken } from '../../../lib/session.js';

const VERIFY_TTL = 24 * 3600;

// The reply is identical whether or not the address already has an account.
// Telling a stranger "this email is registered" hands them a list of customers.
const GENERIC = {
  ok: true,
  message: 'ถ้าอีเมลนี้ใช้งานได้ เราได้ส่งลิงก์ยืนยันไปให้แล้ว กรุณาเช็คกล่องจดหมาย (รวมถึงโฟลเดอร์สแปม)',
};

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  if (!body) return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return fail('อีเมลไม่ถูกต้อง เช่น you@email.com', 400);

  const pwProblem = passwordProblem(body.password);
  if (pwProblem) return fail(pwProblem, 400);

  const db = env.DB;
  const limited = await guard(db, request, 'signup', email, { ip: [10, 3600], email: [5, 3600] });
  if (limited) return limited;

  const site = siteUrl(env, request);
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

  if (existing) {
    await sendAccountExistsEmail(env, email, `${site}/account`, `${site}/account?mode=forgot`);
    return json(GENERIC);
  }

  const id = newId();
  const hash = await hashPassword(body.password);

  try {
    await db
      .prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, email, hash, now())
      .run();
  } catch (e) {
    // Lost a race against a concurrent signup with the same address.
    if (String(e).includes('UNIQUE')) return json(GENERIC);
    throw e;
  }

  const token = await issueToken(db, id, 'verify', VERIFY_TTL);
  await sendVerifyEmail(env, email, `${site}/api/auth/verify?token=${encodeURIComponent(token)}`);

  return json(GENERIC);
}

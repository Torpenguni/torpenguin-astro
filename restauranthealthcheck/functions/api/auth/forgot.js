import { fail, json, normalizeEmail, readJson, sameOrigin, siteUrl, validEmail } from '../../../lib/http.js';
import { sendResetEmail, sendVerifyEmail } from '../../../lib/email.js';
import { guard } from '../../../lib/ratelimit.js';
import { issueToken } from '../../../lib/session.js';

const RESET_TTL = 30 * 60;
const VERIFY_TTL = 24 * 3600;

// Same answer for every address — otherwise this endpoint becomes a way to
// check whether someone is a customer.
const GENERIC = {
  ok: true,
  message: 'ถ้าอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว — ถ้าไม่เห็นภายใน 1-2 นาที ให้เปิดดูในกล่องสแปม/Junk แล้วกด "ไม่ใช่สแปม" ด้วย',
};

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  if (!body) return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return fail('อีเมลไม่ถูกต้อง เช่น you@email.com', 400);

  const db = env.DB;
  // Tight limits: this endpoint sends mail to an address the requester does
  // not have to prove they own.
  const limited = await guard(db, request, 'forgot', email, { ip: [60, 3600], email: [3, 3600] });
  if (limited) return limited;

  const user = await db.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').bind(email).first();
  if (!user) return json(GENERIC);

  const site = siteUrl(env, request);

  // An unverified account has never proved it owns this address, so send the
  // verification link instead of a password reset.
  if (!user.email_verified_at) {
    const token = await issueToken(db, user.id, 'verify', VERIFY_TTL);
    await sendVerifyEmail(env, email, `${site}/api/auth/verify?token=${encodeURIComponent(token)}`);
    return json(GENERIC);
  }

  const token = await issueToken(db, user.id, 'reset', RESET_TTL);
  await sendResetEmail(env, email, `${site}/account?mode=reset&token=${encodeURIComponent(token)}`);

  return json(GENERIC);
}

import { hashPassword } from '../../../lib/crypto.js';
import { fail, json, now, passwordProblem, readJson, sameOrigin, siteUrl } from '../../../lib/http.js';
import { sendPasswordChangedEmail } from '../../../lib/email.js';
import { guard } from '../../../lib/ratelimit.js';
import { destroyAllSessions, useToken } from '../../../lib/session.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  if (!body) return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);

  const pwProblem = passwordProblem(body.password);
  if (pwProblem) return fail(pwProblem, 400);

  const db = env.DB;
  const limited = await guard(db, request, 'reset', null, { ip: [100, 3600] });
  if (limited) return limited;

  // Single-use and time-limited; useToken consumes it atomically.
  const userId = await useToken(db, String(body.token || ''), 'reset');
  if (!userId) {
    return fail('ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง', 400, 'bad_token');
  }

  const hash = await hashPassword(body.password);
  await db
    .prepare('UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?')
    .bind(hash, now(), userId)
    .run();

  // Whoever was logged in before — including an attacker — is signed out.
  await destroyAllSessions(db, userId);

  const user = await db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
  if (user) {
    await sendPasswordChangedEmail(env, user.email, `${siteUrl(env, request)}/account?mode=forgot`);
  }

  return json({ ok: true, message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบด้วยรหัสใหม่ได้เลย' });
}

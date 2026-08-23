import { ADMIN_COOKIE, ADMIN_HOURS, createAdminSession, passwordMatches } from '../../../lib/admin.js';
import { fail, json, readJson, sameOrigin, setCookie } from '../../../lib/http.js';
import { guard } from '../../../lib/ratelimit.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  if (!body) return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);

  const db = env.DB;
  // Deliberately tight: one shared password protects every lead in the system.
  const limited = await guard(db, request, 'adminlogin', null, { ip: [8, 900] });
  if (limited) return limited;

  if (!env.ADMIN_PASSWORD) {
    console.error('[admin] ADMIN_PASSWORD is not set — refusing to allow access');
    return fail('ยังไม่ได้ตั้งรหัสผ่านผู้ดูแลระบบ', 503);
  }

  if (!(await passwordMatches(body.password, env.ADMIN_PASSWORD))) {
    return fail('รหัสผ่านไม่ถูกต้อง', 401);
  }

  const token = await createAdminSession(db, request);
  return json({ ok: true }, 200, { 'Set-Cookie': setCookie(ADMIN_COOKIE, token, ADMIN_HOURS * 3600) });
}

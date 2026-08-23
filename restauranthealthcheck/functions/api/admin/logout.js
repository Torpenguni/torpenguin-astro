import { ADMIN_COOKIE, endAdminSession } from '../../../lib/admin.js';
import { clearCookie, fail, json, sameOrigin } from '../../../lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);
  await endAdminSession(env.DB, request);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(ADMIN_COOKIE) });
}

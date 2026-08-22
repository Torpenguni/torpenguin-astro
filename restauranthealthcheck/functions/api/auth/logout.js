import { SESSION_COOKIE, clearCookie, fail, json, sameOrigin } from '../../../lib/http.js';
import { destroySession } from '../../../lib/session.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);
  await destroySession(env.DB, request);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });
}

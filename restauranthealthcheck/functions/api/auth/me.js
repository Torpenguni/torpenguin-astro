import { json } from '../../../lib/http.js';
import { getUser } from '../../../lib/session.js';

// Used by the front end to decide whether to show "เข้าสู่ระบบ" or the account
// menu. Returns 200 with user:null rather than 401 so a logged-out visitor
// does not produce a console error on every page load.
export async function onRequestGet({ request, env }) {
  const user = await getUser(env.DB, request);
  if (!user) return json({ ok: true, user: null });
  return json({
    ok: true,
    user: { email: user.email, verified: !!user.email_verified_at, createdAt: user.created_at },
  });
}

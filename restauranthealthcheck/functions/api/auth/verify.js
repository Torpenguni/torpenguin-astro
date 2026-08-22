import { SESSION_COOKIE, SESSION_DAYS, now, setCookie, siteUrl } from '../../../lib/http.js';
import { createSession, useToken } from '../../../lib/session.js';

// Opened straight from an email client, so this is a GET that redirects back
// into the site rather than a JSON endpoint.
export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const site = siteUrl(env, request);
  const token = new URL(request.url).searchParams.get('token');

  const userId = await useToken(db, token, 'verify');
  if (!userId) {
    return Response.redirect(`${site}/account?verified=expired`, 302);
  }

  await db
    .prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?')
    .bind(now(), userId)
    .run();

  // Verifying proves control of the inbox, so log them straight in — one less
  // step between the mail and the report they came back for.
  const sessionToken = await createSession(db, userId, request);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${site}/account?verified=1`,
      'Set-Cookie': setCookie(SESSION_COOKIE, sessionToken, SESSION_DAYS * 86400),
    },
  });
}

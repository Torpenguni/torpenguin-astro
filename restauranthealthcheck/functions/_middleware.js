// Security headers on every response, and a single place where an unexpected
// exception turns into a clean Thai error instead of a stack trace.
export async function onRequest(context) {
  let response;
  try {
    response = await context.next();
  } catch (e) {
    console.error('[unhandled]', e && e.stack ? e.stack : e);
    return new Response(
      JSON.stringify({ ok: false, error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Request/response helpers shared by every API route.

export const SESSION_COOKIE = 'rhc_session';
export const SESSION_DAYS = 30;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

// Thai-language error payload. `code` lets the front end react (e.g. offer to
// resend a verification mail) without parsing the message text.
export function fail(message, status = 400, code = null) {
  return json(code ? { ok: false, error: message, code } : { ok: false, error: message }, status);
}

export async function readJson(request, maxBytes = 64 * 1024) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// SameSite=Lax already blocks cross-site form posts; this closes the gap for
// requests a page could still make with fetch().
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin fetch may omit Origin entirely
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

// Deliberately permissive: length is the requirement that actually matters,
// and composition rules push people toward "Password1!" and a sticky note.
export function passwordProblem(password) {
  const pw = String(password || '');
  if (pw.length < 8) return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
  if (pw.length > 200) return 'รหัสผ่านยาวเกินไป';
  return null;
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || '0.0.0.0';
}

export function setCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join('; ');
}

export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export function now() {
  return Math.floor(Date.now() / 1000);
}

export function siteUrl(env, request) {
  const configured = String(env.SITE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// Password hashing and token generation.
//
// Workers has no bcrypt/argon2, so passwords use PBKDF2-HMAC-SHA256 through
// WebCrypto. Iterations follow the OWASP recommendation for that algorithm;
// raising this number later is safe — stored hashes carry their own iteration
// count, so old passwords keep verifying and get rehashed on next login.

const ITERATIONS = 210000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

const enc = new TextEncoder();

function toB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

// Constant-time compare. Length is not secret here (both are KEY_BYTES).
function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(key)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const key = await derive(password, fromB64(parts[2]), iterations);
  return equal(key, fromB64(parts[3]));
}

// Burn a comparable amount of CPU when the account does not exist, so that
// "no such user" and "wrong password" take about the same time to answer.
export async function fakeVerify() {
  await derive('placeholder', new Uint8Array(SALT_BYTES), ITERATIONS);
  return false;
}

export function needsRehash(stored) {
  const parts = String(stored || '').split('$');
  return parts.length !== 4 || parts[0] !== 'pbkdf2' || parseInt(parts[1], 10) < ITERATIONS;
}

// URL-safe random token for sessions, email verification and password resets.
export function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return toB64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Tokens are stored hashed, so a leaked database cannot be used to log in or
// reset anyone's password.
export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newId() {
  return randomToken(16);
}

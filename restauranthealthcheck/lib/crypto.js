// Password hashing and token generation.
//
// Workers has no bcrypt/argon2, so passwords use PBKDF2-HMAC-SHA256 through
// WebCrypto. Stored hashes carry their own iteration count, so raising the
// number later is safe — old passwords keep verifying and get rehashed on the
// next login.
//
// Cloudflare's WebCrypto refuses more than 100,000 iterations in a single
// deriveBits call:
//
//   NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not
//   supported (requested 210000).
//
// The local dev runtime does not enforce that cap, so this only ever failed on
// the deployed site — every signup and every login threw, while the whole test
// suite passed. Rather than drop to 100,000 and halve the work an attacker has
// to do, the derivation is split into chunks of at most 100,000 and chained:
// each chunk's output becomes the next chunk's input, so cracking one password
// still costs the full ITERATIONS of work. A count at or below the cap runs as
// a single call, exactly as before, which keeps old hashes verifiable.

const MAX_PER_CALL = 100000;   // เพดานของ Cloudflare ต่อการเรียกหนึ่งครั้ง
const ITERATIONS = 200000;
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
  let material = enc.encode(password);
  let out = null;
  for (let left = iterations; left > 0; left -= MAX_PER_CALL) {
    const key = await crypto.subtle.importKey('raw', material, 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: Math.min(left, MAX_PER_CALL) },
      key,
      KEY_BYTES * 8,
    );
    out = new Uint8Array(bits);
    material = out;   // ท่อนถัดไปกินผลของท่อนก่อนหน้าเป็นวัตถุดิบ
  }
  return out;
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

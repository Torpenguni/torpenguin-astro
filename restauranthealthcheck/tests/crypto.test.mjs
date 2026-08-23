import { hashPassword, verifyPassword, needsRehash, randomToken, hashToken, fakeVerify }
  from '../lib/crypto.js';

let pass = 0, failn = 0;
const t = (name, cond) => { cond ? (pass++, console.log('  ok  ', name)) : (failn++, console.log('  FAIL', name)); };

const h = await hashPassword('ร้านชาบูของเรา 2026');
t('hash format', /^pbkdf2\$\d+\$[^$]+\$[^$]+$/.test(h));
t('งานรวมไม่ต่ำกว่า 200,000 รอบ', parseInt(h.split('$')[1], 10) >= 200000);
t('correct password verifies', await verifyPassword('ร้านชาบูของเรา 2026', h));
t('wrong password rejected', !(await verifyPassword('ร้านชาบูของเรา 2025', h)));
t('empty password rejected', !(await verifyPassword('', h)));
t('two hashes of same pw differ (salted)', h !== await hashPassword('ร้านชาบูของเรา 2026'));
t('garbage hash rejected', !(await verifyPassword('x', 'not-a-hash')));
t('null hash rejected', !(await verifyPassword('x', null)));
t('fakeVerify is false', !(await fakeVerify()));
t('needsRehash: current false', !needsRehash(h));
t('needsRehash: weak true', needsRehash('pbkdf2$1000$a$b'));
t('needsRehash: junk true', needsRehash('bcrypt$x'));

const a = randomToken(), b = randomToken();
t('token url-safe', /^[A-Za-z0-9_-]+$/.test(a));
t('tokens unique', a !== b);
t('token length >= 40', a.length >= 40);
t('hashToken deterministic', (await hashToken(a)) === (await hashToken(a)));
t('hashToken differs per token', (await hashToken(a)) !== (await hashToken(b)));
t('hashToken is sha256 hex', /^[0-9a-f]{64}$/.test(await hashToken(a)));

// timing sanity: wrong-password and no-such-user should be in the same ballpark
const t0 = Date.now(); await verifyPassword('wrong', h); const real = Date.now() - t0;
const t1 = Date.now(); await fakeVerify(); const fake = Date.now() - t1;
t(`timing comparable (real ${real}ms vs fake ${fake}ms)`, Math.abs(real - fake) < Math.max(real, fake) * 0.6 + 15);

// ── เพดาน 100,000 รอบของ Cloudflare ────────────────────────────────────
// Cloudflare ปฏิเสธ PBKDF2 ที่เกิน 100,000 รอบต่อการเรียกหนึ่งครั้ง ในเครื่อง
// ไม่มีเพดานนี้ ของเดิมจึงผ่านเทสต์หมดแต่พังทุกครั้งบนเว็บจริง ชุดนี้ดักไว้
// ให้เห็นตั้งแต่ในเครื่อง ไม่ต้องรอไปเจอตอนมีคนกดสมัคร
const CF_MAX = 100000;
const asked = [];
const realDerive = crypto.subtle.deriveBits.bind(crypto.subtle);
crypto.subtle.deriveBits = (algo, key, len) => {
  if (algo && algo.name === 'PBKDF2') asked.push(algo.iterations);
  return realDerive(algo, key, len);
};

asked.length = 0;
const chained = await hashPassword('ทดสอบเพดานรอบ');
t('ไม่มีการเรียกครั้งไหนเกินเพดานของ Cloudflare',
  asked.length > 0 && asked.every((n) => n <= CF_MAX));
t('งานรวมเท่ากับที่ประกาศไว้ในตัวแฮช',
  asked.reduce((a, b) => a + b, 0) === parseInt(chained.split('$')[1], 10));
t('แฮชแบบต่อท่อนยืนยันรหัสถูกได้', await verifyPassword('ทดสอบเพดานรอบ', chained));
t('แฮชแบบต่อท่อนปฏิเสธรหัสผิด', !(await verifyPassword('ทดสอบเพดานรอบ!', chained)));

// แฮชเก่าที่รอบไม่เกินเพดานต้องยังยืนยันได้เหมือนเดิม เพราะรอบเดียวจบ
// โค้ดใหม่จะเรียก deriveBits ครั้งเดียว ได้ผลเท่ากับของเดิมทุกไบต์
const legacySalt = crypto.getRandomValues(new Uint8Array(16));
const legacyKey = await realDerive(
  { name: 'PBKDF2', hash: 'SHA-256', salt: legacySalt, iterations: 90000 },
  await crypto.subtle.importKey('raw', new TextEncoder().encode('รหัสเก่า'), 'PBKDF2', false, ['deriveBits']),
  256,
);
const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
const legacy = `pbkdf2$90000$${b64(legacySalt)}$${b64(legacyKey)}`;
t('แฮชเดิมที่รอบไม่เกินเพดานยังใช้ได้', await verifyPassword('รหัสเก่า', legacy));
t('แฮชเดิมยังปฏิเสธรหัสผิด', !(await verifyPassword('รหัสใหม่', legacy)));
t('แฮชเดิมถูกสั่งให้อัปเกรดตอนล็อกอินครั้งหน้า', needsRehash(legacy));

asked.length = 0;
await fakeVerify();
t('ตอนไม่มีบัญชีก็ไม่เรียกเกินเพดานเหมือนกัน',
  asked.length > 0 && asked.every((n) => n <= CF_MAX));

crypto.subtle.deriveBits = realDerive;

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);

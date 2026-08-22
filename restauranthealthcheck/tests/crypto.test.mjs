import { hashPassword, verifyPassword, needsRehash, randomToken, hashToken, fakeVerify }
  from '../lib/crypto.js';

let pass = 0, failn = 0;
const t = (name, cond) => { cond ? (pass++, console.log('  ok  ', name)) : (failn++, console.log('  FAIL', name)); };

const h = await hashPassword('ร้านชาบูของเรา 2026');
t('hash format', /^pbkdf2\$210000\$[^$]+\$[^$]+$/.test(h));
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

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);

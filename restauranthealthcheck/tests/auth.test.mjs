import fs from 'node:fs';
const BASE = 'http://127.0.0.1:8788';
const ORIGIN = { Origin: BASE };
let pass = 0, failed = 0;
const t = (n, c, extra='') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (extra?' — '+extra:''))); };

const mail = () => { try { return JSON.parse(fs.readFileSync(new URL('./mailbox.json', import.meta.url),'utf8')); } catch { return []; } };
const lastMailTo = (to) => [...mail()].reverse().find(m => m.to === to);
const linkIn = (m, re) => (m && (m.text.match(re) || [])[0]) || null;

async function call(path, { method='GET', body, cookie, redirect='manual' } = {}) {
  const res = await fetch(BASE + path, {
    method, redirect,
    headers: { ...ORIGIN, ...(body ? {'Content-Type':'application/json'} : {}), ...(cookie ? {Cookie: cookie} : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  const sc = res.headers.get('set-cookie');
  return { status: res.status, data, cookie: sc ? sc.split(';')[0] : null, location: res.headers.get('location'), setCookie: sc };
}

const EMAIL = `owner${Date.now()}@example.com`;
const PW = 'shabu-shop-2026';
const PW2 = 'new-password-9981';

console.log('\n— สมัครใช้งาน —');
let r = await call('/api/auth/signup', { method:'POST', body:{ email: EMAIL, password: PW }, });
t('signup returns 200', r.status === 200, `got ${r.status}`);
t('signup message is generic', /ถ้าอีเมลนี้ใช้งานได้/.test(r.data?.message || ''));
let m = lastMailTo(EMAIL);
t('verification email sent', !!m);
t('subject is the verify one', /ยืนยันอีเมล/.test(m?.subject || ''));
t('email has html and text parts', !!m?.html && !!m?.text);
const verifyLink = linkIn(m, /http:\/\/\S*\/api\/auth\/verify\?token=\S+/);
t('verify link present', !!verifyLink);

console.log('\n— ยังไม่ยืนยัน ห้ามเข้าระบบ —');
r = await call('/api/auth/login', { method:'POST', body:{ email: EMAIL, password: PW } });
t('login blocked before verify', r.status === 403, `got ${r.status}`);
t('code is email_not_verified', r.data?.code === 'email_not_verified');

console.log('\n— ยืนยันอีเมล —');
let res = await fetch(verifyLink, { redirect:'manual' });
const verifyCookie = (res.headers.get('set-cookie') || '').split(';')[0];
t('verify redirects', res.status === 302, `got ${res.status}`);
t('redirects to ?verified=1', /verified=1/.test(res.headers.get('location') || ''));
t('verify logs the user in', /^rhc_session=/.test(verifyCookie));
t('cookie is HttpOnly', /HttpOnly/i.test(res.headers.get('set-cookie') || ''));
t('cookie is Secure', /Secure/i.test(res.headers.get('set-cookie') || ''));
t('cookie is SameSite=Lax', /SameSite=Lax/i.test(res.headers.get('set-cookie') || ''));

r = await call('/api/auth/me', { cookie: verifyCookie });
t('me returns the user', r.data?.user?.email === EMAIL, JSON.stringify(r.data));
t('user shows as verified', r.data?.user?.verified === true);

console.log('\n— ลิงก์ยืนยันใช้ซ้ำไม่ได้ —');
res = await fetch(verifyLink, { redirect:'manual' });
t('second use rejected', /verified=expired/.test(res.headers.get('location') || ''));

console.log('\n— เข้าสู่ระบบ —');
r = await call('/api/auth/login', { method:'POST', body:{ email: EMAIL, password: 'wrong-password' } });
t('wrong password rejected', r.status === 401);
t('generic credential error', r.data?.code === 'bad_credentials');
t('error does not reveal the account exists', !/ไม่พบ|ไม่มีบัญชี/.test(r.data?.error || ''));

r = await call('/api/auth/login', { method:'POST', body:{ email: EMAIL, password: PW } });
t('correct password accepted', r.status === 200, `got ${r.status}`);
let session = r.cookie;
t('login sets a session', /^rhc_session=/.test(session || ''));

console.log('\n— ลืมรหัสผ่าน —');
r = await call('/api/auth/forgot', { method:'POST', body:{ email: EMAIL } });
t('forgot returns 200', r.status === 200);
t('forgot message is generic', /ถ้าอีเมลนี้มีบัญชีอยู่/.test(r.data?.message || ''));
m = lastMailTo(EMAIL);
t('reset email sent', /ตั้งรหัสผ่านใหม่/.test(m?.subject || ''));
const resetUrl = linkIn(m, /http:\/\/\S*\/account\?mode=reset&token=\S+/);
t('reset link present', !!resetUrl);
const resetToken = resetUrl && decodeURIComponent(new URL(resetUrl).searchParams.get('token'));

console.log('\n— ไม่มีบัญชีก็ตอบเหมือนกัน (กันไล่เดารายชื่อ) —');
const r2 = await call('/api/auth/forgot', { method:'POST', body:{ email:`nobody${Date.now()}@example.com` } });
t('same status for unknown email', r2.status === 200);
t('same message for unknown email', r2.data?.message === r.data?.message);

console.log('\n— ตั้งรหัสใหม่ —');
r = await call('/api/auth/reset', { method:'POST', body:{ token: resetToken, password: 'short' } });
t('short password rejected', r.status === 400);

r = await call('/api/auth/reset', { method:'POST', body:{ token: resetToken, password: PW2 } });
t('reset succeeds', r.status === 200, JSON.stringify(r.data));
m = lastMailTo(EMAIL);
t('password-changed email sent', /ถูกเปลี่ยนแล้ว/.test(m?.subject || ''));

r = await call('/api/auth/me', { cookie: session });
t('old session was revoked', r.data?.user === null, JSON.stringify(r.data));

r = await call('/api/auth/reset', { method:'POST', body:{ token: resetToken, password: 'another-one-123' } });
t('reset token cannot be reused', r.status === 400 && r.data?.code === 'bad_token');

r = await call('/api/auth/login', { method:'POST', body:{ email: EMAIL, password: PW } });
t('old password no longer works', r.status === 401);
r = await call('/api/auth/login', { method:'POST', body:{ email: EMAIL, password: PW2 } });
t('new password works', r.status === 200);
session = r.cookie;

console.log('\n— สมัครซ้ำด้วยอีเมลเดิม —');
const before = mail().length;
r = await call('/api/auth/signup', { method:'POST', body:{ email: EMAIL, password: 'yet-another-pw' } });
t('duplicate signup looks identical', r.status === 200 && /ถ้าอีเมลนี้ใช้งานได้/.test(r.data?.message || ''));
t('sends the "account exists" mail instead', /มีบัญชีอยู่แล้ว/.test(lastMailTo(EMAIL)?.subject || ''));
r = await call('/api/auth/login', { method:'POST', body:{ email: EMAIL, password: 'yet-another-pw' } });
t('duplicate signup did not overwrite the password', r.status === 401);

console.log('\n— บันทึกผลประเมิน —');
const sid = 'sess-' + Date.now();
r = await call('/api/assessments', { method:'POST', cookie: session, body:{
  sessionKey: sid, email: EMAIL, name:'ต่อ', shop:'ร้านชาบูของเรา', contact:'0812345678',
  shopType:'buffet', mode:'deep', consent:true } });
t('partial save accepted', r.status === 200, JSON.stringify(r.data));

r = await call('/api/assessments', { method:'POST', cookie: session, body:{
  sessionKey: sid, completed:true, total:72, typeCode:'TSMG', typeName:'Team',
  tier:'HOT', scores:{D1:70,D2:64,D3:80,D4:71,D5:75}, answers:[1,2,3],
  report:{ exec:'สรุปทดสอบ', plan:[] },
  snapshot:{ answers:[{oi:1,v:2}], fin:null, mode:'deep', reg:{ shop:'ร้านชาบูของเรา' } } } });
t('completion save accepted', r.status === 200);

r = await call('/api/assessments', { cookie: session });
t('own assessments listed', r.status === 200 && r.data?.assessments?.length === 1,
  JSON.stringify(r.data).slice(0,200));
const a = r.data?.assessments?.[0];
t('shop name kept from the first write', a?.shop === 'ร้านชาบูของเรา');
t('score kept from the second write', a?.total === 72 && a?.tier === 'HOT');
t('one row, not two', r.data?.assessments?.length === 1);

r = await call('/api/assessments');
t('assessment list requires login', r.status === 401);

console.log('\n— เปิดผลประเมินทีละรายการ —');
r = await call('/api/assessment?id=' + encodeURIComponent(a.id), { cookie: session });
t('เจ้าของเปิดผลของตัวเองได้', r.status === 200 && r.data?.assessment?.id === a.id,
  JSON.stringify(r.data).slice(0, 160));
t('มีคำตอบชุดเต็มไว้วาดรายงานคืน', !!r.data?.assessment?.snapshot,
  'snapshot=' + JSON.stringify(r.data?.assessment?.snapshot));
t('ต้องล็อกอินก่อนถึงเปิดได้', (await call('/api/assessment?id=' + a.id)).status === 401);
t('ไม่ระบุ id ตอบ 400', (await call('/api/assessment', { cookie: session })).status === 400);
t('id มั่ว ๆ ตอบ 404', (await call('/api/assessment?id=ไม่มีจริง', { cookie: session })).status === 404);

// ผลประเมินของคนอื่นต้องเปิดไม่ได้เด็ดขาด — id เป็นตัวสุ่มก็จริงแต่มันไปอยู่ใน
// ลิงก์ในอีเมล ซึ่งถูกส่งต่อ ถูกวางในแชต หรือหลุดอยู่ในประวัติเบราว์เซอร์ได้
{
  const other = `intruder${Date.now()}@example.com`;
  await call('/api/auth/signup', { method: 'POST', body: { email: other, password: 'intruder-pw-2026' } });
  const vlink = linkIn(lastMailTo(other), /http:\/\/\S*\/api\/auth\/verify\?token=\S+/);
  const vres = await fetch(vlink, { redirect: 'manual', headers: ORIGIN });
  const otherCookie = (vres.headers.get('set-cookie') || '').split(';')[0];
  const peek = await call('/api/assessment?id=' + encodeURIComponent(a.id), { cookie: otherCookie });
  t('คนอื่นเปิดผลประเมินของเราไม่ได้', peek.status === 404, `got ${peek.status}`);
  const list = await call('/api/assessments', { cookie: otherCookie });
  t('รายการย้อนหลังของคนอื่นก็ไม่เห็นของเรา',
    (list.data?.assessments || []).every((x) => x.id !== a.id));
}

console.log('\n— ออกจากระบบ —');
r = await call('/api/auth/logout', { method:'POST', cookie: session, body:{} });
t('logout ok', r.status === 200);
t('logout clears the cookie', /Max-Age=0/.test(r.setCookie || ''));
r = await call('/api/auth/me', { cookie: session });
t('session dead after logout', r.data?.user === null);

console.log('\n— กันยิงข้ามเว็บ —');
res = await fetch(BASE + '/api/auth/login', { method:'POST',
  headers:{ 'Content-Type':'application/json', Origin:'https://evil.example' },
  body: JSON.stringify({ email: EMAIL, password: PW2 }) });
t('cross-origin post refused', res.status === 403, `got ${res.status}`);

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

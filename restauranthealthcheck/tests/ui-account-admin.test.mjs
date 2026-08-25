// Browser coverage for the parts uiflow.mjs does not touch: the quick path,
// the account pages a returning owner uses, and the back office.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { ACCESS_CODE, seedAccess } from './access.mjs';

const BASE = 'http://127.0.0.1:8788';
let pass = 0, failed = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (x ? ' — ' + x : ''))); };
const mail = () => { try { return JSON.parse(fs.readFileSync(new URL('./mailbox.json', import.meta.url), 'utf8')); } catch { return []; } };
const lastTo = (to) => [...mail()].reverse().find((m) => m.to === to);

const browser = await puppeteer.launch({
  // ตั้ง CHROME_PATH ให้ชี้ไปที่ Chrome/Chromium ในเครื่อง เช่น
  // export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await seedAccess(page);
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(String(e)));
// การทดสอบชุดนี้ยิงเคสที่ "ต้องล้มเหลว" ด้วย (รหัสสั้น, รหัสผิด, ยังไม่ล็อกอิน)
// เบราว์เซอร์จะ log HTTP 4xx ลง console เสมอ — ไม่ใช่บั๊ก จึงไม่นับ
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (m.text().includes('Failed to load resource')) return;
  jsErrors.push('console: ' + m.text());
});

const visible = () => page.$eval('.screen.active', (el) => el.id);
const clickByOnclick = async (f) => {
  const h = await page.evaluateHandle((frag) => [...document.querySelectorAll('[onclick]')]
    .find((el) => el.getAttribute('onclick').includes(frag) && el.offsetParent !== null), f);
  const el = h.asElement();
  if (!el) throw new Error('ไม่เจอปุ่ม: ' + f);
  await el.click();
};

const EMAIL = `acct${Date.now()}@example.com`;
const PW = 'penguin-shabu-2026';

// ── โหมดด่วน ────────────────────────────────────────────────────────────
console.log('\n— โหมดด่วน (10 ข้อ) —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register');

await page.type('#r_name', 'ต่อ');
await page.type('#r_shop', 'คาเฟ่ทดสอบ');
await page.type('#r_contact', '0899999999');
await page.type('#r_email', EMAIL);
await page.select('#r_province', 'กรุงเทพมหานคร');
await page.click('#r_consent');
await clickByOnclick('startQuiz()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quiz');

let n = 0;
for (let g = 0; g < 60 && (await visible()) === 's-quiz'; g++) {
  for (let i = 0; i < 12; i++) {
    if (!(await page.$eval('#qNext', (el) => el.disabled))) break;
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#qBody button')]
        .filter((x) => x.offsetParent !== null && !x.className.includes('calc') && !x.classList.contains('sel'));
      if (!b.length) return false;
      b[Math.min(1, b.length - 1)].click();
      return true;
    });
    if (!clicked) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  await page.click('#qNext');
  n++;
  await new Promise((r) => setTimeout(r, 50));
}
t(`โหมดด่วนสั้นกว่าโหมดเต็มจริง (${n} ข้อ)`, n > 0 && n < 30, `ตอบ ${n} ข้อ`);
// ตอบข้อสุดท้ายแล้วต้องเห็นผลเลย ไม่มีหน้าคั่นถามว่าอยากให้ช่วยเรื่องอะไร
// (ตัดทิ้งเพราะทีม CP ยังไม่พร้อมเข้าไปช่วยเรื่องที่หน้านั้นถาม)
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quickresult', { timeout: 8000 });
t('ไม่มีหน้าคั่นถามความสนใจอีกแล้ว', await page.$('#s-intent') === null);
t('ได้ผลความพร้อมเบื้องต้น', await visible() === 's-quickresult');
t('มีคะแนนแสดง', await page.$eval('#qrPct', (el) => /\d/.test(el.textContent)));
t('ตัวนับ % ไม่ค้าง', await page.$eval('#progMini', (el) => el.textContent.trim() === ''));

// ── หน้าบัญชี ──────────────────────────────────────────────────────────
console.log('\n— สมัครบัญชีผ่านหน้าเว็บ —');
await page.goto(BASE + '/account?mode=signup', { waitUntil: 'networkidle0' });
t('หน้าสมัครมีช่องยืนยันรหัสผ่าน', await page.$('#password2') !== null);
t('หน้าสมัครมีทางไปหน้าลืมรหัสผ่าน',
  await page.$eval('.alt', (el) => /ลืมรหัสผ่าน/.test(el.textContent)));

// พิมพ์รหัสผ่านสองช่องไม่ตรงกัน ต้องถูกจับได้ตั้งแต่ในเบราว์เซอร์ ไม่ต้องยิงไปถึง
// เซิร์ฟเวอร์ เพราะถ้าปล่อยผ่าน คนจะสมัครด้วยรหัสที่ตัวเองพิมพ์ผิดโดยไม่รู้ตัว
// แล้วเข้าระบบไม่ได้ตลอดไป
await page.type('#email', EMAIL);
await page.type('#password', PW);
await page.type('#password2', PW + 'พิมพ์เกิน');
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('err'), { timeout: 5000 });
t('จับได้ว่ารหัสผ่านสองช่องไม่ตรงกัน',
  (await page.$eval('#msg', (el) => el.textContent)).includes('ไม่ตรงกัน'));
t('ยังไม่ได้สมัคร ปุ่มยังกดได้อยู่', await page.$eval('#go', (el) => !el.disabled));

// ล้างทั้งช่องรหัสและกล่องข้อความก่อนลองรอบใหม่ ถ้าไม่ล้างข้อความ error เก่า
// จะยังค้างอยู่ แล้ว waitForFunction จะเจอทันทีตั้งแต่ก่อนคำตอบรอบใหม่จะมาถึง
// กลายเป็นอ่านข้อความของรอบก่อนหน้า
const resetForm = () => page.evaluate(() => {
  document.getElementById('password').value = '';
  document.getElementById('password2').value = '';
  const m = document.getElementById('msg');
  m.textContent = '';
  m.className = '';
});

await resetForm();
await page.type('#password', 'sh0rt');
await page.type('#password2', 'sh0rt');
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('err'), { timeout: 5000 });
t('กันรหัสผ่านสั้นเกินไป', (await page.$eval('#msg', (el) => el.textContent)).includes('8 ตัวอักษร'));

await resetForm();
await page.type('#password', PW);
await page.type('#password2', PW);
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('ok'), { timeout: 8000 });
t('สมัครสำเร็จ ขึ้นข้อความยืนยัน', true);

const verifyMail = lastTo(EMAIL);
const verifyLink = verifyMail && (verifyMail.text.match(/http:\/\/\S*\/api\/auth\/verify\?token=\S+/) || [])[0];
t('ได้อีเมลยืนยัน', !!verifyLink);

console.log('\n— กดลิงก์ยืนยันจากในเมล —');
await page.goto(verifyLink, { waitUntil: 'networkidle0' });
t('ถูกพากลับมาหน้าบัญชี', page.url().includes('/account'));
t('ขึ้นข้อความว่ายืนยันแล้ว', (await page.$eval('#msg', (el) => el.textContent)).includes('ยืนยันอีเมลเรียบร้อย'));
await page.waitForSelector('#logout', { timeout: 5000 });
t('เข้าสู่ระบบให้อัตโนมัติ', await page.$('#logout') !== null);
t('เห็นอีเมลตัวเองบนหน้า', (await page.content()).includes(EMAIL));
t('เห็นผลประเมินที่เพิ่งทำ', (await page.content()).includes('คาเฟ่ทดสอบ'),
  await page.$eval('.card', (el) => el.textContent.slice(0, 80)));

console.log('\n— ออกจากระบบ แล้วล็อกอินใหม่ —');
await page.click('#logout');
await page.waitForFunction(() => location.pathname === '/', { timeout: 5000 });
await page.goto(BASE + '/account', { waitUntil: 'networkidle0' });
await page.waitForSelector('#go');
t('เด้งกลับหน้าเข้าสู่ระบบ', await page.$('#password') !== null);

await page.type('#email', EMAIL);
await page.type('#password', 'ผิดแน่นอน');
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('err'), { timeout: 8000 });
t('รหัสผิดเข้าไม่ได้', (await page.$eval('#msg', (el) => el.textContent)).includes('ไม่ถูกต้อง'));

await page.evaluate(() => { document.getElementById('password').value = ''; });
await page.type('#password', PW);
await page.click('#go');
await page.waitForSelector('#logout', { timeout: 8000 });
t('รหัสถูกเข้าได้', await page.$('#logout') !== null);

// แถบบนของหน้าแรกต้องบอกได้ว่ากำลังล็อกอินอยู่ในชื่อใคร ไม่ใช่ขึ้นคำว่า
// "เข้าสู่ระบบ" ค้างไว้เหมือนยังไม่ได้ล็อกอิน
console.log('\n— แถบบนหน้าแรกตอนล็อกอินอยู่ —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.querySelector('.cobrand .acct')?.classList.contains('in'), { timeout: 8000 })
  .catch(() => {});
const acct = await page.$('.cobrand .acct');
t('ปุ่มมุมขวาเปลี่ยนเป็นโหมดล็อกอินแล้ว',
  await page.$eval('.cobrand .acct', (el) => el.classList.contains('in')));
t('บอกอีเมลของคนที่ล็อกอินอยู่',
  (await page.$eval('.cobrand .acct', (el) => el.textContent)).includes(EMAIL));
t('กดแล้วไปหน้าบัญชี', await page.$eval('.cobrand .acct', (el) => el.getAttribute('href')) === '/account');
t('ไม่ขึ้นคำว่า "เข้าสู่ระบบ" ค้างไว้',
  !(await page.$eval('.cobrand .acct', (el) => el.textContent)).includes('เข้าสู่ระบบ'));
t('แถบบนไม่ล้นจอ', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));

// ออกจากระบบแล้วต้องกลับไปเป็นปุ่มชวนเข้าสู่ระบบเหมือนเดิม
await page.goto(BASE + '/account', { waitUntil: 'networkidle0' });
await page.waitForSelector('#logout', { timeout: 8000 });
await page.click('#logout');
await page.waitForFunction(() => location.pathname === '/', { timeout: 8000 });
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 600));
t('ออกจากระบบแล้วกลับเป็นปุ่ม "เข้าสู่ระบบ"',
  (await page.$eval('.cobrand .acct', (el) => el.textContent)).includes('เข้าสู่ระบบ')
  && !(await page.$eval('.cobrand .acct', (el) => el.classList.contains('in'))));

// ล็อกอินกลับเข้ามาเพื่อให้ชุดทดสอบที่เหลือทำงานต่อได้เหมือนเดิม
await page.goto(BASE + '/account', { waitUntil: 'networkidle0' });
await page.waitForSelector('#go');
await page.type('#email', EMAIL);
await page.type('#password', PW);
await page.click('#go');
await page.waitForSelector('#logout', { timeout: 8000 });

// คนที่ล็อกอินอยู่กรอกอีเมลไปตอนสมัครแล้ว ไม่ต้องถามซ้ำในฟอร์มเล่าเรื่องร้าน
// แต่ต้องบอกให้รู้ว่าสรุปผลจะไปโผล่ที่กล่องจดหมายไหน และอีเมลนั้นต้องติดไปกับ
// ลีดด้วย ไม่งั้นทีมขายจะได้ลีดที่ไม่มีอีเมลเลย
console.log('\n— ฟอร์มเล่าเรื่องร้านตอนล็อกอินอยู่ —');
const posted = [];
page.on('request', (r) => {
  if (r.url().includes('/api/assessments') && r.method() === 'POST') {
    try { posted.push(JSON.parse(r.postData() || '{}')); } catch (e) { /* ไม่ใช่ JSON ก็ข้าม */ }
  }
});
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.querySelector('.cobrand .acct')?.classList.contains('in'), { timeout: 8000 });
await page.evaluate(() => chooseMode('quick'));
await new Promise((r) => setTimeout(r, 300));
t('ไม่ถามอีเมลซ้ำเมื่อล็อกอินอยู่แล้ว', await page.$('#r_email') === null);
t('บอกว่าจะส่งสรุปผลไปที่อีเมลไหน',
  (await page.$eval('.acct-mail', (el) => el.textContent)).includes(EMAIL));

// กล่องบอกอีเมลมาแทนที่ช่องกรอก จึงต้องอยู่ในแนวเดียวกับช่องเบอร์ที่อยู่ข้าง ๆ
// ถ้าไปล้างทั้งกล่องรวมป้ายหัวช่องทิ้ง สองช่องจะเหลื่อมกันทันที
const align = await page.evaluate(() => {
  const c = document.getElementById('r_contact').getBoundingClientRect();
  const n = document.querySelector('.acct-mail').getBoundingClientRect();
  const labels = [...document.querySelectorAll('#s-register label')].filter((x) => x.offsetParent);
  const l1 = labels.find((x) => x.textContent.includes('เบอร์'));
  const l2 = labels.find((x) => x.textContent.trim() === 'อีเมล');
  // จอแคบ แถวนี้กลายเป็นคอลัมน์เดียว สองช่องจะเรียงบนล่างโดยตั้งใจ การวัด
  // ว่า "อยู่แนวเดียวกัน" จึงมีความหมายเฉพาะตอนที่มันอยู่ข้างกันจริง ๆ
  const cols = getComputedStyle(document.getElementById('r_contact').closest('.field-row'))
    .gridTemplateColumns.split(' ').length;
  return {
    sideBySide: cols >= 2,
    hasLabel: !!l2,
    box: Math.abs(c.top - n.top),
    label: l1 && l2 ? Math.abs(l1.getBoundingClientRect().top - l2.getBoundingClientRect().top) : -1,
  };
});
t('ป้ายหัวช่องอีเมลยังอยู่ ไม่ถูกล้างทิ้งไปด้วย', align.hasLabel);
if (align.sideBySide) {
  t('ป้ายหัวช่องตรงแนวกัน', align.label === 0, `ต่างกัน ${align.label}px`);
  t('กล่องบอกอีเมลตรงแนวกับช่องเบอร์', align.box <= 1, `ต่างกัน ${align.box}px`);
} else {
  t('จอแคบ สองช่องเรียงบนล่างตามที่ออกแบบไว้', align.box > 1, `ต่างกัน ${align.box}px`);
}

await page.evaluate(() => {
  document.getElementById('r_name').value = 'เจ้าของร้านล็อกอิน';
  document.getElementById('r_shop').value = 'ร้านของคนล็อกอิน';
  document.getElementById('r_contact').value = '089-999-1234';
  document.getElementById('r_province').value = 'เชียงใหม่';
  document.getElementById('r_consent').checked = true;
  startQuiz();
});
await new Promise((r) => setTimeout(r, 900));
t('ฟอร์มยังส่งได้ ไม่พังเพราะช่องอีเมลหายไป',
  await page.evaluate(() => document.getElementById('s-quiz').classList.contains('active')));
t('อีเมลของบัญชีติดไปกับลีดด้วย',
  posted.some((x) => x.email === EMAIL), JSON.stringify(posted.map((x) => x.email)));

console.log('\n— ลืมรหัสผ่านผ่านหน้าเว็บ —');
await page.goto(BASE + '/account?mode=forgot', { waitUntil: 'networkidle0' });
await page.type('#email', EMAIL);
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('ok'), { timeout: 8000 });
const resetLink = (lastTo(EMAIL).text.match(/http:\/\/\S*\/account\?mode=reset&token=\S+/) || [])[0];
t('ได้อีเมลลิงก์ตั้งรหัสใหม่', !!resetLink);

await page.goto(resetLink, { waitUntil: 'networkidle0' });
await page.type('#password', 'brand-new-pass-77');
await page.type('#password2', 'ไม่ตรงกัน-77');
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('err'), { timeout: 5000 });
t('กันกรอกรหัสใหม่สองช่องไม่ตรงกัน', (await page.$eval('#msg', (el) => el.textContent)).includes('ไม่ตรงกัน'));

await page.evaluate(() => { document.getElementById('password2').value = ''; });
await page.type('#password2', 'brand-new-pass-77');
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('ok'), { timeout: 8000 });
t('ตั้งรหัสใหม่สำเร็จ', true);

// ── หลังบ้าน ───────────────────────────────────────────────────────────
console.log('\n— หลังบ้าน —');
await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE + '/admin', { waitUntil: 'networkidle0' });
await page.waitForSelector('#pw');
t('ไม่ล็อกอินเห็นแค่หน้าใส่รหัส', await page.$('table') === null);

await page.type('#pw', 'รหัสมั่ว');
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg')?.className.includes('err'), { timeout: 8000 });
t('รหัสผิดเข้าไม่ได้', true);

await page.evaluate(() => { document.getElementById('pw').value = ''; });
await page.type('#pw', 'local-admin-pass');
await page.click('#go');
await page.waitForSelector('table', { timeout: 8000 });
t('เข้าหลังบ้านได้', await page.$('table') !== null);

const rows = await page.$$eval('tbody tr', (r) => r.length);
t('เห็นรายการ lead', rows > 0, `${rows} แถว`);
t('เห็นร้านที่เพิ่งทดสอบ', (await page.content()).includes('คาเฟ่ทดสอบ'));
t('ลิงก์ CSV ชี้ไปที่ endpoint ถูกต้อง',
  (await page.$eval('a.csv', (el) => el.getAttribute('href'))).startsWith('/api/admin/export'));

await page.type('#f_q', 'คาเฟ่ทดสอบ');
await page.click('#apply');
await page.waitForFunction((term) => {
  const rs = [...document.querySelectorAll('tbody tr')];
  return rs.length > 0 && rs.every((r) => r.textContent.includes(term));
}, { timeout: 8000 }, 'คาเฟ่ทดสอบ').catch(() => {});
const filtered = await page.$$eval('tbody tr', (r) => r.map((x) => x.textContent));
t('ค้นหาภาษาไทยกรองได้จริง', filtered.length > 0 && filtered.every((x) => x.includes('คาเฟ่ทดสอบ')),
  `${filtered.length} แถว, ตรงเงื่อนไข ${filtered.filter((x) => x.includes('คาเฟ่ทดสอบ')).length}`);

await page.evaluate(() => document.getElementById('clear').click());
await page.waitForFunction((n) => document.querySelectorAll('tbody tr').length >= n, { timeout: 8000 }, rows)
  .catch(() => {});
t('ล้างตัวกรองแล้วกลับมาครบ', (await page.$$eval('tbody tr', (r) => r.length)) >= rows,
  `เหลือ ${await page.$$eval('tbody tr', (r) => r.length)} จาก ${rows}`);

await page.evaluate(() => document.getElementById('out').click());
await page.waitForSelector('#pw', { timeout: 8000 });
t('ออกจากระบบหลังบ้านได้', await page.$('table') === null);

console.log('\n— ไม่มี JavaScript error ตลอดทาง —');
t('ไม่มี error หลุดออกมาเลย', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

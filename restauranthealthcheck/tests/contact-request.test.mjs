// ปุ่ม "ให้ทีม CP ติดต่อกลับ" ท้ายผลประเมิน
//
// จุดสำคัญของฟีเจอร์นี้คือ "ไม่ถามอะไรเพิ่มเลย" — ตอนกดปุ่ม ระบบมีชื่อ เบอร์
// อีเมล และผลประเมินของเขาครบแล้ว ปุ่มแค่ติดธงลงบนลีดแถวเดิม ชุดนี้จึงตรวจทั้ง
// ฝั่ง API และการกดจริงบนหน้าเว็บ รวมถึงว่าหลังบ้านเห็นและกรองได้จริง
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'local-admin-pass';   // ตรงกับ .dev.vars ที่ใช้รันในเครื่อง

let pass = 0, failn = 0;
const t = (n, c, x) => { c ? (pass++, console.log('  ok  ', n)) : (failn++, console.log('  FAIL', n, x === undefined ? '' : `— ${x}`)); };

const post = (path, body, origin = BASE) => fetch(BASE + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
  body: JSON.stringify(body),
});

console.log('\n— ฝั่ง API —');
const sid = `sid-contact-${Date.now()}`;
await post('/api/assessments', {
  sessionKey: sid, name: 'เจ้าของร้านทดสอบ', shop: 'ร้านขอให้ติดต่อ', contact: '0891112222',
  email: `contact${Date.now()}@example.com`, completed: true, total: 71, tier: 'HOT',
});

let r = await post('/api/contact-request', { sessionKey: sid });
let j = await r.json();
t('กดครั้งแรกบันทึกได้', r.ok && j.recorded === true, JSON.stringify(j));

r = await post('/api/contact-request', { sessionKey: sid });
j = await r.json();
t('กดซ้ำไม่พัง และรู้ว่าเคยกดแล้ว', r.ok && j.already === true, JSON.stringify(j));

r = await post('/api/contact-request', { sessionKey: `ไม่มีจริง-${Date.now()}` });
t('sessionKey ที่ไม่มีในระบบตอบ 404 ไม่ใช่ ok', r.status === 404, r.status);

r = await post('/api/contact-request', { sessionKey: sid }, 'https://evil.example');
t('คำขอข้ามเว็บถูกปฏิเสธ', r.status === 403, r.status);

r = await post('/api/contact-request', {});
t('ไม่ส่ง sessionKey มาถูกปฏิเสธ', r.status === 400, r.status);

console.log('\n— กดจริงบนหน้าเว็บ (โหมดด่วน) —');
const browser = await puppeteer.launch({
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const visible = () => page.$eval('.screen.active', (el) => el.id);
const clickByOnclick = async (frag) => {
  const h = await page.evaluateHandle((f) => [...document.querySelectorAll('[onclick]')]
    .find((el) => el.getAttribute('onclick').includes(f) && el.offsetParent !== null), frag);
  const el = h.asElement();
  if (!el) throw new Error('ไม่เจอปุ่ม: ' + frag);
  await el.click();
};

const PHONE = '0895554444';
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register');
await page.type('#r_name', 'เจ้าของร้านกดปุ่ม');
await page.type('#r_shop', 'ร้านกดขอให้ติดต่อ');
await page.type('#r_contact', PHONE);
await page.select('#r_province', 'กรุงเทพมหานคร');
await page.click('#r_consent');
await clickByOnclick('startQuiz()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quiz');

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
  await new Promise((r) => setTimeout(r, 50));
}
await page.evaluate(() => document.querySelectorAll('#intentChips button')[0].click());
await clickByOnclick('finishQuick()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quickresult', { timeout: 8000 });

const btn = await page.evaluateHandle(() => [...document.querySelectorAll('[onclick]')]
  .find((el) => el.getAttribute('onclick').includes('requestContact') && el.offsetParent !== null));
t('ผลแบบด่วนมีปุ่มขอให้ติดต่อกลับ', btn.asElement() !== null);
t('ป้ายปุ่มบอกตรง ๆ ว่าจะติดต่อกลับ',
  await page.evaluate((e) => /ติดต่อกลับ/.test(e.textContent), btn));

await btn.asElement().click();
await page.waitForFunction(() => {
  const d = [...document.querySelectorAll('.cta-done')].find((x) => x.offsetParent !== null);
  return d && d.textContent.trim().length > 0;
}, { timeout: 10000 });
const doneText = await page.evaluate(() =>
  [...document.querySelectorAll('.cta-done')].find((x) => x.offsetParent !== null).textContent.trim());
t('ขึ้นข้อความยืนยันว่ารับเรื่องแล้ว', doneText.includes('รับเรื่องแล้ว'), doneText);
t('บอกเบอร์ที่จะโทรกลับ ไม่ต้องเดาเอง', doneText.includes(PHONE), doneText);
t('ปุ่มหายไปแล้ว กดซ้ำไม่ได้',
  await page.evaluate(() => ![...document.querySelectorAll('[onclick]')]
    .some((el) => el.getAttribute('onclick').includes('requestContact') && el.offsetParent !== null)));

console.log('\n— หลังบ้านเห็นไหม —');
const login = await post('/api/admin/login', { password: ADMIN_PW });
const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
t('เข้าหลังบ้านได้', login.ok, login.status);

const get = (p) => fetch(BASE + p, { headers: { Cookie: cookie } });
const list = await (await get('/api/admin/leads?asked=1')).json();
t('กรองเฉพาะคนที่กดขอได้', list.ok && list.leads.length > 0, JSON.stringify(list.leads?.length));
t('ทุกแถวที่กรองมามีเวลาที่กดขอ', (list.leads || []).every((l) => l.askedAt), 'บางแถวไม่มี askedAt');
t('ตัวเลขสรุปนับคนที่กดขอ', typeof list.stats?.asked === 'number' && list.stats.asked > 0, list.stats?.asked);
t('ร้านที่เพิ่งกดอยู่ในผลการกรอง', (list.leads || []).some((l) => l.shop === 'ร้านกดขอให้ติดต่อ'));

const all = await (await get('/api/admin/leads')).json();
t('ไม่กรองต้องเห็นมากกว่าหรือเท่ากับตอนกรอง', all.total >= list.total, `${all.total} vs ${list.total}`);

const csv = await (await get('/api/admin/export?asked=1')).text();
t('CSV มีคอลัมน์ขอให้ติดต่อกลับ', csv.includes('ขอให้ติดต่อกลับ'));
t('CSV มีร้านที่เพิ่งกด', csv.includes('ร้านกดขอให้ติดต่อ'));

console.log(`\n${pass} passed, ${failn} failed`);
await browser.close();
process.exit(failn ? 1 : 0);

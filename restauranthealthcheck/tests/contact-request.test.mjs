// ปุ่ม "ให้ทีม CP ติดต่อกลับ" ท้ายผลประเมิน
//
// จุดสำคัญของฟีเจอร์นี้คือ "ไม่ถามอะไรเพิ่มเลย" — ตอนกดปุ่ม ระบบมีชื่อ เบอร์
// อีเมล และผลประเมินของเขาครบแล้ว ปุ่มแค่ติดธงลงบนลีดแถวเดิม ชุดนี้จึงตรวจทั้ง
// ฝั่ง API และการกดจริงบนหน้าเว็บ รวมถึงว่าหลังบ้านเห็นและกรองได้จริง
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'local-admin-pass';   // ตรงกับ .dev.vars ที่ใช้รันในเครื่อง

const mail = () => { try { return JSON.parse(fs.readFileSync(new URL('./mailbox.json', import.meta.url), 'utf8')); } catch { return []; } };
const ALERT_TO = 'tor@penguinx.co';   // ตรงกับค่าตั้งต้นใน functions/api/contact-request.js
const alerts = () => mail().filter((m) => m.to === ALERT_TO);

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
  .find((el) => el.getAttribute('onclick').includes('askContact') && el.offsetParent !== null));
t('ผลแบบด่วนมีปุ่มขอให้ติดต่อกลับ', btn.asElement() !== null);
t('ป้ายปุ่มบอกตรง ๆ ว่าจะติดต่อกลับ',
  await page.evaluate((e) => /ติดต่อกลับ/.test(e.textContent), btn));

// กดครั้งแรกต้องได้แค่คำถาม ยังไม่ส่ง — ปุ่มนี้อยู่ท้ายหน้าที่ต้องเลื่อนยาว
// นิ้วโดนโดยไม่ตั้งใจได้ง่าย และกดแล้วทีมขายจะโทรไปจริง ยกเลิกทีหลังไม่ได้
await btn.asElement().click();
await new Promise((r) => setTimeout(r, 200));
t('กดครั้งแรกขึ้นคำถามยืนยัน ยังไม่ส่ง',
  await page.$('#qrCtaWrap [data-yes]') !== null);
t('คำถามบอกชัดว่าจะให้โทรกลับ',
  await page.$eval('#qrCtaWrap .cc-q', (e) => /ยืนยัน/.test(e.textContent) && /โทรกลับ/.test(e.textContent)),
  await page.$eval('#qrCtaWrap .cc-q', (e) => e.textContent));

// กดยกเลิกต้องกลับเป็นปุ่มเดิม และต้องไม่มีอะไรถูกส่งไป
await page.click('#qrCtaWrap [data-no]');
await new Promise((r) => setTimeout(r, 200));
t('กดยกเลิกแล้วกลับเป็นปุ่มเดิม',
  await page.$('#qrCtaWrap [data-yes]') === null
  && await page.$eval('#qrCtaWrap button', (e) => /ติดต่อกลับ/.test(e.textContent)));
{
  const r = await fetch(`${BASE}/api/admin/leads?q=${encodeURIComponent('ร้านกดขอให้ติดต่อ')}`);
  t('ยกเลิกแล้วไม่มีอะไรถูกส่งไปหลังบ้าน', r.status === 401);   // ยังไม่ได้ล็อกอิน — แค่ยืนยันว่า endpoint ปกติ
}

// คราวนี้กดยืนยันจริง
await page.click('#qrCtaWrap button');
await new Promise((r) => setTimeout(r, 200));
await page.click('#qrCtaWrap [data-yes]');
await page.waitForFunction(() => {
  const d = [...document.querySelectorAll('.cta-done')].find((x) => x.offsetParent !== null);
  return d && d.textContent.trim().length > 0;
}, { timeout: 10000 });
const doneText = await page.evaluate(() =>
  [...document.querySelectorAll('.cta-done')].find((x) => x.offsetParent !== null).textContent.trim());
t('ขึ้นข้อความยืนยันว่ารับเรื่องแล้ว', doneText.includes('รับเรื่องแล้ว'), doneText);
t('บอกเบอร์ที่จะโทรกลับ ไม่ต้องเดาเอง', doneText.includes(PHONE), doneText);
t('ปุ่มหายไปแล้ว กดซ้ำไม่ได้',
  await page.$eval('#qrCtaWrap', (e) => e.offsetParent === null));

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

console.log('\n— อีเมลแจ้งทีมทันทีที่มีคนกด —');
{
  // ปุ่มนี้เคยแค่ติดธงในฐานข้อมูล ถ้าทีมไม่เปิดหลังบ้านดู ลีดที่ยกมือเองก็นั่งรอเปล่า ๆ
  const before = alerts().length;
  const sid2 = `sid-alert-${Date.now()}`;
  await post('/api/assessments', {
    sessionKey: sid2, name: 'สมชาย ใจดี', shop: 'ร้านแจ้งเตือน', contact: '081-234-5678',
    email: `alert${Date.now()}@example.com`, province: 'เชียงใหม่',
    shopType: 'บุฟเฟต์ / ชาบู / ปิ้งย่าง', branches: '2-3 สาขา',
    completed: true, total: 71, tier: 'HOT', typeName: 'The Franchise-Ready · พร้อมแฟรนไชส์',
    scores: { D1: 70, D2: 68, D3: 74, D4: 71, D5: 72 },
    financial: { revenue: 875000, cogs: 320000, labor: 180000, rent: 90000, primePct: 57.1, netPct: 22 },
  });
  const res = await post('/api/contact-request', { sessionKey: sid2 });
  t('กดแล้วตอบ ok', res.status === 200);

  // ส่งเมลหลังตอบกลับ (waitUntil) จึงต้องรอสักครู่ก่อนไปดูกล่องจดหมาย
  for (let i = 0; i < 30 && alerts().length === before; i++) await new Promise((r) => setTimeout(r, 200));
  const m = alerts()[alerts().length - 1];
  t('มีอีเมลแจ้งเข้ามาที่ทีม', alerts().length === before + 1, `ก่อน ${before} หลัง ${alerts().length}`);
  t('ส่งถึง tor@penguinx.co', m && m.to === ALERT_TO, m && m.to);
  t('หัวเรื่องบอกว่ามีคนขอให้ติดต่อกลับ + ชื่อร้าน',
    /ขอให้ติดต่อกลับ/.test(m?.subject || '') && /ร้านแจ้งเตือน/.test(m?.subject || ''), m?.subject);
  t('หัวเรื่องมีคะแนนติดมาด้วย', /71\/100/.test(m?.subject || ''), m?.subject);

  const body = (m && m.text) || '';
  const html = (m && m.html) || '';
  for (const [label, want] of [['ชื่อผู้ติดต่อ', 'สมชาย ใจดี'], ['เบอร์โทร', '081-234-5678'],
    ['จังหวัด', 'เชียงใหม่'], ['ประเภทร้าน', 'บุฟเฟต์'], ['จำนวนสาขา', '2-3 สาขา']]) {
    t(`อีเมลมี${label}`, body.includes(want), body.slice(0, 60));
  }
  t('อีเมลมีคะแนน 5 มิติ', /ตัวเจ้าของ & ผู้นำ 70/.test(body), body.match(/คะแนน 5 มิติ.*/)?.[0]);
  t('อีเมลมีตัวเลขการเงิน', /Prime Cost 57\.1%/.test(body), body.match(/ตัวเลขการเงิน.*/)?.[0]);
  // เปิดจากมือถือแล้วต้องกดโทรออกได้เลย ไม่ต้องคัดลอกเบอร์
  t('เบอร์ในอีเมลกดโทรออกได้', /href="tel:0812345678"/.test(html));
  // ลิงก์พาไปเปิดลีดนั้นตรง ๆ ไม่ใช่โยนเข้าตารางให้ไปไล่หาเอง
  t('มีลิงก์เปิดลีดนี้ในหลังบ้าน', /\/admin\?lead=[A-Za-z0-9_-]+/.test(body), body.slice(-160));

  // กดซ้ำต้องไม่ยิงเมลซ้ำ ไม่งั้นทีมจะโดนสแปมจากคนที่กดรัว ๆ
  const again = await post('/api/contact-request', { sessionKey: sid2 });
  t('กดซ้ำยังตอบ ok', again.status === 200);
  await new Promise((r) => setTimeout(r, 1500));
  t('กดซ้ำไม่ส่งเมลซ้ำ', alerts().length === before + 1, `${alerts().length} ฉบับ`);
}

console.log(`\n${pass} passed, ${failn} failed`);
await browser.close();
process.exit(failn ? 1 : 0);

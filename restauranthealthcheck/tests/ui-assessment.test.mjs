// End-to-end walkthrough of the real UI in a real browser — the journey a
// restaurant owner actually takes, which every earlier suite skipped by
// calling the API directly.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:8788';
let pass = 0, failed = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (x ? ' — ' + x : ''))); };
const mail = () => { try { return JSON.parse(fs.readFileSync(new URL('./mailbox.json', import.meta.url), 'utf8')); } catch { return []; } };

const DEVICE = process.argv[2] === 'mobile'
  ? { name: 'มือถือ (iPhone 14, 390×844)', viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } }
  : { name: 'เดสก์ท็อป (1280×900)', viewport: { width: 1280, height: 900 } };

const EMAIL = `ui${Date.now()}@example.com`;
const SHOP = 'ร้านชาบูต้นตำรับ';

const browser = await puppeteer.launch({
  // ตั้ง CHROME_PATH ให้ชี้ไปที่ Chrome/Chromium ในเครื่อง เช่น
  // export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport(DEVICE.viewport);
if (DEVICE.viewport.isMobile) {
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
}

// Any uncaught page error is a defect the user would hit; collect them all.
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
const clickByOnclick = async (fragment) => {
  const handle = await page.evaluateHandle((f) => [...document.querySelectorAll('[onclick]')]
    .find((el) => el.getAttribute('onclick').includes(f) && el.offsetParent !== null), fragment);
  const el = handle.asElement();
  if (!el) throw new Error('ไม่เจอปุ่ม: ' + fragment);
  await el.click();
};

console.log(`\n=== ${DEVICE.name} ===`);

console.log('\n— หน้าแรก —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
t('หน้าแรกโหลดได้', await visible() === 's-landing');
t('ไม่มีแถบเลื่อนแนวนอน', await page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  await page.evaluate(() => `scrollWidth=${document.documentElement.scrollWidth} clientWidth=${document.documentElement.clientWidth}`));
t('ฟอนต์ไทยโหลดจริง', await page.evaluate(() => document.fonts.check('600 16px Anuphan')));

console.log('\n— ลงทะเบียน —');
await clickByOnclick("chooseMode('deep')");
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register');
t('เข้าหน้าลงทะเบียน', await visible() === 's-register');

await clickByOnclick('startQuiz()');
t('กันไม่ให้ข้ามช่องบังคับ', await visible() === 's-register');
t('ขึ้นข้อความเตือน', await page.$eval('#regErr', (el) => el.style.display === 'block' && el.textContent.length > 0));

await page.type('#r_name', 'ธนพงศ์');
await page.type('#r_shop', SHOP);
await page.type('#r_contact', '0812345678');
await page.type('#r_email', EMAIL);
await page.select('#r_type', await page.$eval('#r_type option:nth-child(2)', (o) => o.value));
await clickByOnclick('startQuiz()');
t('กันไม่ให้ข้ามช่องยินยอม PDPA', await visible() === 's-register');

await page.click('#r_consent');
await clickByOnclick('startQuiz()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quiz', { timeout: 5000 });
t('เริ่มทำแบบประเมินได้', await visible() === 's-quiz');

console.log('\n— ตอบคำถามจนจบ —');
let answered = 0;
const seen = new Set();
for (let guard = 0; guard < 200; guard++) {
  const id = await visible();
  if (id !== 's-quiz') break;
  seen.add(await page.$eval('#qCount', (el) => el.textContent.trim()));

  // Click controls inside the question until "next" unlocks — this covers the
  // single, matrix and drill-down question types without special-casing them.
  for (let i = 0; i < 12; i++) {
    if (!(await page.$eval('#qNext', (el) => el.disabled))) break;
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#qBody button')]
        .filter((b) => b.offsetParent !== null && !b.className.includes('calc') && !b.classList.contains('sel'));
      if (!btns.length) return false;
      btns[Math.min(2, btns.length - 1)].click();
      return true;
    });
    if (!clicked) break;
    await new Promise((r) => setTimeout(r, 30));
  }
  const stillLocked = await page.$eval('#qNext', (el) => el.disabled);
  if (stillLocked) { t(`ตอบข้อ ${await page.$eval('#qCount', (e) => e.textContent)} ไม่ได้`, false); break; }

  await page.click('#qNext');
  answered++;
  await new Promise((r) => setTimeout(r, 60));
}
t(`ตอบครบทุกข้อ (${answered} ข้อ)`, answered >= 40, `ตอบได้ ${answered}`);
t('เลขข้อไม่ซ้ำ/ไม่วน', seen.size === answered, `unique=${seen.size} answered=${answered}`);
t('ตอบข้อสุดท้ายแล้วไปหน้าการเงิน', await visible() === 's-financial', await visible());

console.log('\n— การเงิน → ผลลัพธ์ —');

// ยอดขายเป็น dropdown ช่วงราคา (เลือกแล้วระบบเดาต้นทุนให้) ที่เหลือเป็นช่องตัวเลข
await page.select('#f_rev', '875000');
await new Promise((r) => setTimeout(r, 200));
t('เลือกยอดขายแล้วระบบเติมต้นทุนประมาณให้',
  await page.$eval('#f_cogs', (el) => el.value !== ''), 'f_cogs ว่างอยู่');

const setNum = async (id, v) => page.evaluate((i, val) => {
  const el = document.getElementById(i);
  el.value = val;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, id, v);
await setNum('f_cogs', '320000');
await setNum('f_labor', '180000');
await setNum('f_rent', '90000');
await setNum('f_coverval', '250');
await clickByOnclick('submitFinancial()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-result', { timeout: 8000 });
t('ได้หน้ารายงานผล', await visible() === 's-result');

// คะแนนบนเกจไล่ตัวเลขขึ้นทีละหน่วย — ต้องรอให้นิ่งก่อนค่อยอ่าน
await page.waitForFunction(() => {
  const el = document.getElementById('rScore');
  if (!el) return false;
  const v = el.textContent.trim();
  if (window.__lastScore === v) { window.__stable = (window.__stable || 0) + 1; }
  else { window.__lastScore = v; window.__stable = 0; }
  return window.__stable >= 5;
}, { polling: 120, timeout: 15000 });
const score = await page.$eval('#rScore', (el) => parseInt(el.textContent.trim(), 10));
const grade = await page.$eval('#rGrade', (el) => el.textContent.trim());
t('มีคะแนนรวมแสดงผล', Number.isInteger(score) && score >= 0 && score <= 100, `score=${score}`);
t('มีคำวินิจฉัยกำกับคะแนน', grade.length > 0, grade);
t('แสดงคะแนนราย 5 มิติ', await page.$eval('#barDims', (el) => el.children.length === 5),
  await page.$eval('#barDims', (el) => `มี ${el.children.length} แถว`));
t('มีรายงานฉบับเต็มด้านล่าง', await page.$eval('#reportDoc', (el) => el.textContent.trim().length > 200));
t('ไม่มี alert คำว่า Prototype', !(await page.content()).includes('Prototype:'));
// ปุ่มนี้เคยถูกซ่อนไว้เพราะรอลิงก์ Google Form ตอนนี้มันติดธงลงลีดโดยตรง
// ไม่ต้องรออะไรอีก จึงต้องแสดงเสมอ
t('ปุ่มขอให้ติดต่อกลับแสดงอยู่ท้ายรายงาน',
  await page.$eval('#ctaBtn', (el) => getComputedStyle(el).display !== 'none'));
t('ป้ายปุ่มบอกว่าจะติดต่อกลับ',
  await page.$eval('#ctaBtn', (el) => /ติดต่อกลับ/.test(el.textContent)));
t('ตัวนับ % ไม่ค้างอยู่บนหน้ารายงาน',
  await page.$eval('#progMini', (el) => el.textContent.trim() === ''),
  await page.$eval('#progMini', (el) => `ค้างอยู่ที่ "${el.textContent.trim()}"`));

// puppeteer รับเฉพาะ path แบบสตริง ส่ง URL object เข้าไปไม่ได้
await page.screenshot({ path: fileURLToPath(new URL(`./screenshot-${process.argv[2] || 'desktop'}.png`, import.meta.url)) });

console.log('\n— ข้อมูลถึงหลังบ้านจริงไหม —');
await new Promise((r) => setTimeout(r, 1200));
const cookie = (await (await fetch(BASE + '/api/admin/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ password: 'local-admin-pass' }),
})).headers).get('set-cookie').split(';')[0];
const leads = await (await fetch(`${BASE}/api/admin/leads?q=${encodeURIComponent(EMAIL)}`,
  { headers: { Cookie: cookie, Origin: BASE } })).json();
const lead = (leads.leads || [])[0];
t('lead ถูกบันทึกลงฐานข้อมูล', !!lead);
t('ชื่อร้านตรง', lead && lead.shop === SHOP, lead && lead.shop);
t('บันทึกว่าทำจบแล้ว', lead && lead.completed === true);
t('คะแนนในฐานข้อมูลตรงกับที่แสดงบนหน้าจอ', lead && lead.total === score, `db=${lead && lead.total} ui=${score}`);
t('มีคะแนนครบทั้ง 5 มิติ', lead && lead.scores && ['D1', 'D2', 'D3', 'D4', 'D5'].every((k) => lead.scores[k] != null));
t('จัดกลุ่ม tier ให้แล้ว', lead && ['HOT', 'WARM', 'NURTURE'].includes(lead.tier), lead && lead.tier);

const m = [...mail()].reverse().find((x) => x.to === EMAIL);
t('ส่งเมลสรุปผลให้อัตโนมัติ', !!m);
t('คะแนนในเมลตรงกับหน้าจอ', m && m.subject.includes(`${score}/100`), m && m.subject);

console.log('\n— ไม่มี JavaScript error ตลอดทาง —');
t('ไม่มี error หลุดออกมาเลย', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

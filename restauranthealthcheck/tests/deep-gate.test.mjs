// ประตูก่อนเข้าโหมดละเอียด
//
// แบบ 10 ข้อทำได้เลยไม่ต้องสมัคร — คนหน้าบูธส่วนใหญ่ใช้ทางนี้ ถ้ากั้นตรงนี้จะ
// เสียลีดที่ยังไม่ทันได้เบอร์ ส่วนแบบ 48 ข้อกับการดาวน์โหลดรายงานต้องมีบัญชี
// เพราะสองอย่างนั้นคือสิ่งที่บัญชีมีไว้ให้จริง ๆ
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const EMAIL = `deepgate${Date.now()}@example.com`;
const PW = 'a-good-long-password-2026';

let pass = 0, failn = 0;
const t = (n, c, x) => { c ? (pass++, console.log('  ok  ', n)) : (failn++, console.log('  FAIL', n, x === undefined ? '' : `— ${x}`)); };

const browser = await puppeteer.launch({
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(String(e)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const screen = () => page.$eval('.screen.active', (el) => el.id);
const gateShown = () => page.$eval('#gate', (el) => getComputedStyle(el).display !== 'none');

console.log('\n— ยังไม่มีบัญชี —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await settle(600);
await page.evaluate(() => chooseMode('quick'));
await settle();
t('แบบ 10 ข้อเข้าได้เลย ไม่ต้องสมัคร', await screen() === 's-register', await screen());
t('ไม่มีประตูมาขวาง', !(await gateShown()));

await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await settle(600);
await page.evaluate(() => chooseMode('deep'));
await settle();
t('แบบละเอียดเจอประตู', await gateShown());
t('ยังไม่พาไปหน้ากรอกข้อมูล', await screen() === 's-landing', await screen());
t('ประตูบอกเหตุผล ไม่ใช่กำแพงเปล่า',
  (await page.$eval('#gate', (el) => el.textContent)).includes('ดาวน์โหลด'));
t('ประตูมีทางออกให้ทำแบบ 10 ข้อ',
  (await page.$eval('.gate-alt', (el) => el.textContent)).includes('10 ข้อ'));

// ทางออกต้องพาไปทำแบบสั้นได้จริง ไม่ใช่ปุ่มหลอก
await page.click('.gate-alt');
await settle();
t('กดทางออกแล้วได้ทำแบบ 10 ข้อจริง', await screen() === 's-register' && !(await gateShown()),
  `${await screen()} · ประตู ${await gateShown()}`);

// ต่อยอดจากผลแบบสั้นก็ต้องเจอประตูเหมือนกัน
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await settle(600);
await page.evaluate(() => continueToDeep());
await settle();
t('กดต่อยอดจากผลแบบสั้นก็เจอประตู', await gateShown());

// ปุ่มดาวน์โหลดรายงานต้องกั้นด้วย
await page.evaluate(() => closeGate());
await page.evaluate(() => saveReport());
await settle();
t('ปุ่มดาวน์โหลดรายงานกั้นไว้เหมือนกัน', await gateShown());

console.log('\n— สมัครแล้วต้องพากลับมาทำต่อ —');
await page.evaluate(() => { closeGate(); rememberDeep(); });
await page.goto(BASE + '/account?mode=signup', { waitUntil: 'networkidle0' });
await page.type('#email', EMAIL);
await page.type('#password', PW);
await page.type('#password2', PW);
await page.click('#go');
await page.waitForFunction(() => document.getElementById('msg').className.includes('ok'), { timeout: 15000 });

const box = JSON.parse(fs.readFileSync(new URL('./mailbox.json', import.meta.url), 'utf8'));
const link = (box.filter((m) => (m.to || '').includes(EMAIL)).pop().text
  .match(/http:\/\/\S*\/api\/auth\/verify\?token=\S+/) || [])[0];
t('ได้ลิงก์ยืนยันในเมล', !!link);

await page.goto(link, { waitUntil: 'networkidle0' });
await settle(1500);
t('ถูกพากลับมาที่หน้าแรก ไม่ทิ้งไว้ที่หน้าบัญชี', new URL(page.url()).pathname === '/', page.url());
t('เข้าโหมดละเอียดให้ต่อทันที', await screen() === 's-register', await screen());
t('โหมดที่ตั้งไว้คือละเอียด', await page.evaluate(() => state.mode) === 'deep');
t('ประตูปิดแล้ว', !(await gateShown()));
t('ไม่มี ?start=deep ค้างอยู่บนแถบที่อยู่', !page.url().includes('start='));

console.log('\n— มีบัญชีแล้ว —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await settle(700);
await page.evaluate(() => chooseMode('deep'));
await settle();
t('กดแบบละเอียดผ่านฉลุย', await screen() === 's-register' && !(await gateShown()));

await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await settle(700);
await page.evaluate(() => continueToDeep());
await settle();
t('ต่อยอดจากผลแบบสั้นก็ผ่าน', await screen() === 's-quiz', await screen());
// คำถามประเภทร้านถูกตอบไว้จากฟอร์มแล้ว ตอนต่อยอดต้องไม่โผล่มาถามซ้ำ
t('ต่อยอดแล้วไม่ถามประเภทร้านซ้ำ',
  await page.evaluate(() => {
    const pi = QUESTIONS.findIndex((q) => q.type === 'profile');
    return !state.order.includes(pi);
  }));

t('ไม่มี error หลุดออกมาเลย', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

console.log(`\n${pass} passed, ${failn} failed`);
await browser.close();
process.exit(failn ? 1 : 0);

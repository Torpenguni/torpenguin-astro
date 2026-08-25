// ประตูรหัสเข้าใช้งาน
//
// CP แจกรหัสเดียวให้ร้านที่เขาเชิญมา ใครไม่มีรหัสต้องเริ่มทำแบบประเมินไม่ได้
// จุดที่ต้องระวังที่สุดคือ "กันแค่ในเบราว์เซอร์" ซึ่งไม่ใช่การกันเลย ชุดนี้จึงยิง
// ตรงเข้า API ด้วยว่าไม่มีรหัสแล้วบันทึกไม่ได้จริง และตรวจฝั่งหน้าเว็บว่าคนที่มี
// รหัสเข้าไปทำต่อได้ราบรื่น ไม่ใช่ติดประตูซ้ำทุกครั้ง
import puppeteer from 'puppeteer-core';
import { ACCESS_CODE } from './access.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
let pass = 0, failed = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (x ? ' — ' + x : ''))); };

const post = (path, body, ip = '203.0.113.90') => fetch(BASE + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE, 'CF-Connecting-IP': ip },
  body: JSON.stringify(body),
});

console.log('\n— ฝั่งเซิร์ฟเวอร์: บันทึกผลโดยไม่มีรหัสไม่ได้ —');
{
  const sid = 'nocode-' + Date.now();
  const r = await post('/api/assessments', { sessionKey: sid, name: 'ไม่มีรหัส', shop: 'ร้านไม่มีรหัส',
    contact: '0800000000', mode: 'deep', consent: true });
  const d = await r.json().catch(() => null);
  t('ไม่ส่งรหัสมา ถูกปฏิเสธ 403', r.status === 403, r.status);
  t('บอกเหตุผลด้วยรหัสให้หน้าเว็บอ่านได้', d && d.code === 'access_code', JSON.stringify(d));
}
{
  const r = await post('/api/assessments', { sessionKey: 'wrongcode-' + Date.now(), shop: 'ร้านรหัสผิด',
    accessCode: 'CPRESTECH9999' });
  t('รหัสผิดก็ถูกปฏิเสธ', r.status === 403, r.status);
}
{
  const sid = 'goodcode-' + Date.now();
  const r = await post('/api/assessments', { sessionKey: sid, shop: 'ร้านรหัสถูก', contact: '0811111111',
    accessCode: ACCESS_CODE });
  t('รหัสถูก บันทึกได้', r.status === 200, r.status);
  // พิมพ์ตัวเล็กและมีช่องว่างติดมา — คนกรอกจากกระดาษหรือจากไลน์เป็นแบบนี้จริง
  const messy = ACCESS_CODE.slice(0, 4).toLowerCase() + ' ' + ACCESS_CODE.slice(4);
  const r2 = await post('/api/assessments', { sessionKey: 'messy-' + Date.now(), shop: 'ร้านพิมพ์เลอะ',
    accessCode: messy });
  t('พิมพ์ตัวเล็กหรือมีช่องว่างติดมาก็ยังผ่าน', r2.status === 200, `${messy} → ${r2.status}`);
}

console.log('\n— ช่องตรวจรหัส /api/access-code —');
{
  const r = await fetch(BASE + '/api/access-code');
  const d = await r.json();
  t('หน้าเว็บถามได้ว่ายังต้องใช้รหัสอยู่ไหม', r.ok && d.required === true, JSON.stringify(d));
  t('บอกจำนวนวันที่ให้จำรหัสไว้', typeof d.days === 'number' && d.days > 0, JSON.stringify(d));
}
{
  const r = await post('/api/access-code', { code: ACCESS_CODE });
  const d = await r.json();
  t('รหัสถูก ตอบ ok พร้อมรหัสตัวจริง', r.ok && d.code === ACCESS_CODE, JSON.stringify(d));
}
{
  const r = await post('/api/access-code', { code: 'ไม่ใช่รหัส' }, '203.0.113.91');
  const d = await r.json();
  t('รหัสผิด ตอบ 403', r.status === 403, r.status);
  t('ข้อความบอกเป็นภาษาไทย ไม่ใช่ error ดิบ', d && /รหัส/.test(d.error || ''), JSON.stringify(d));
}
{
  const r = await post('/api/access-code', { code: ACCESS_CODE }, '198.51.100.77');
  t('คำขอข้ามเว็บถูกปฏิเสธ', (await fetch(BASE + '/api/access-code', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ code: ACCESS_CODE }),
  })).status === 403);
  t('ยิงจากเว็บเดียวกันยังผ่านตามปกติ', r.ok);
}
{
  // เดารหัสรัว ๆ จาก IP เดียว ต้องโดนหยุด — แต่คนที่กรอกถูกตั้งแต่แรกต้องไม่โดน
  const IP = '203.0.113.92';
  let blocked = 0;
  for (let i = 0; i < 130; i++) {
    const r = await post('/api/access-code', { code: 'GUESS' + i }, IP);
    if (r.status === 429) { blocked = i; break; }
  }
  t('เดารหัสรัว ๆ ถูกหยุดก่อนถึง 130 ครั้ง', blocked > 0, `หยุดที่ครั้งที่ ${blocked}`);
  const ok = await post('/api/access-code', { code: ACCESS_CODE }, '203.0.113.93');
  t('คนอื่นที่ IP ต่างกันไม่โดนหางเลข', ok.ok, ok.status);
}

console.log('\n— ฝั่งหน้าเว็บ —');
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

const gateShown = () => page.$eval('#codeGate', (e) => getComputedStyle(e).display !== 'none');
const clickByOnclick = async (f) => {
  const h = await page.evaluateHandle((f) => [...document.querySelectorAll('[onclick]')]
    .find((el) => el.getAttribute('onclick').includes(f) && el.offsetParent !== null), f);
  await h.asElement().click();
};

await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
t('หน้าแรกยังอ่านได้ตามปกติ ไม่ถูกบังตั้งแต่แรก', (await gateShown()) === false);
t('ยังเห็นว่าเครื่องมือนี้วัดอะไรบ้าง', (await page.$$('.lp-dim')).length === 5);

await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => getComputedStyle(document.getElementById('codeGate')).display !== 'none',
  { timeout: 5000 });
t('กดเริ่มแล้วเจอช่องใส่รหัส', await gateShown());
t('ยังไม่ได้เข้าไปหน้ากรอกข้อมูลร้าน', (await page.$eval('.screen.active', (e) => e.id)) === 's-landing');

await page.type('#codeInput', 'ไม่ใช่รหัสจริง');
await page.click('#codeGo');
await page.waitForFunction(() => getComputedStyle(document.getElementById('codeErr')).display !== 'none',
  { timeout: 5000 });
t('รหัสผิดขึ้นข้อความบอก ไม่ใช่เงียบ ๆ', await page.$eval('#codeErr', (e) => e.textContent.trim().length > 5));
t('รหัสผิดแล้วประตูยังปิดอยู่', await gateShown());

await page.$eval('#codeInput', (e) => { e.value = ''; });
await page.type('#codeInput', ACCESS_CODE.toLowerCase());
await page.click('#codeGo');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register',
  { timeout: 8000 });
t('รหัสถูก (พิมพ์ตัวเล็ก) พาไปต่อที่หน้ากรอกข้อมูลร้านทันที', true);
t('ประตูปิดไปแล้ว', (await gateShown()) === false);
t('เครื่องจำรหัสไว้ให้', await page.evaluate(() => !!JSON.parse(localStorage.getItem('rhc_access') || 'null')));

await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register',
  { timeout: 8000 });
t('กลับมาใหม่ไม่ต้องกรอกรหัสซ้ำ', (await gateShown()) === false);

// รหัสหมดอายุ = เหมือนไม่เคยกรอก ต้องเจอประตูอีกครั้ง ไม่ใช่ผ่านฉลุยตลอดกาล
await page.evaluate(() => localStorage.setItem('rhc_access',
  JSON.stringify({ code: 'CPRESTECH2026', exp: Date.now() - 1000 })));
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => getComputedStyle(document.getElementById('codeGate')).display !== 'none',
  { timeout: 5000 });
t('รหัสหมดอายุแล้วต้องกรอกใหม่', await gateShown());

t('ไม่มี error ค้างในหน้าเว็บ', errs.length === 0, errs.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} ผ่าน, ${failed} ไม่ผ่าน`);
process.exit(failed ? 1 : 0);

// หน้า "เล่าเรื่องร้าน" บนมือถือ
//
// สองเรื่องที่เคยพลาดมาแล้วและชุดนี้ดักไว้:
//
// 1. ระยะขอบข้าง — .wrap ตั้งไว้ 22px แต่คลาส .pad ที่ตามมาใช้คำสั่งย่อสี่ด้าน
//    เลยลบทิ้งเป็น 0 โดยไม่ตั้งใจ บนจอกว้างมองไม่ออกเพราะเนื้อหาจำกัดที่ 780px
//    อยู่แล้ว แต่บนมือถือตัวหนังสือชนขอบจอ
// 2. ช่องกรอกที่ถูกถอดออกตอนรัน — ตัวอ่านค่าเดิมพังทันทีถ้าช่องนั้นไม่มีอยู่
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const MIN_GUTTER = 16;   // ต่ำกว่านี้ถือว่าชิดขอบเกินไปสำหรับมือถือ

let pass = 0, failn = 0;
const t = (name, cond, extra) => {
  cond ? (pass++, console.log('  ok  ', name))
       : (failn++, console.log('  FAIL', name, extra === undefined ? '' : `— ${extra}`));
};

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

console.log('\n— ระยะขอบบนมือถือ —');
for (const width of [320, 360, 390, 430]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const land = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const r = document.querySelector('.lp-h1').getBoundingClientRect();
    return { left: r.left, right: vw - r.right, overflow: document.documentElement.scrollWidth > vw };
  });
  t(`${width}px หน้าแรกไม่ชิดขอบ`,
    land.left >= MIN_GUTTER && land.right >= MIN_GUTTER, `ซ้าย ${land.left} ขวา ${land.right}`);

  await page.evaluate(() => chooseMode('quick'));
  await new Promise((r) => setTimeout(r, 250));
  const reg = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const r = document.querySelector('#r_name').getBoundingClientRect();
    return { left: r.left, right: vw - r.right, overflow: document.documentElement.scrollWidth > vw };
  });
  t(`${width}px หน้าเล่าเรื่องร้านไม่ชิดขอบ`,
    reg.left >= MIN_GUTTER && reg.right >= MIN_GUTTER, `ซ้าย ${reg.left} ขวา ${reg.right}`);
  t(`${width}px ไม่ล้นจอ`, !land.overflow && !reg.overflow);
  await page.close();
}

console.log('\n— ช่องเบอร์มือถือ —');
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2 });
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.evaluate(() => chooseMode('quick'));
await new Promise((r) => setTimeout(r, 250));

t('ป้ายเขียนว่าเบอร์มือถือ ไม่มี LINE แล้ว',
  await page.$eval('#r_contact', (el) => {
    const s = el.closest('.field').querySelector('label').textContent;
    return s.includes('เบอร์มือถือ') && !s.includes('LINE');
  }));
t('เปิดแป้นตัวเลขให้บนมือถือ',
  await page.$eval('#r_contact', (el) => el.getAttribute('inputmode') === 'tel'));
t('ยังไม่ล็อกอินต้องมีช่องอีเมลให้กรอก', await page.$('#r_email') !== null);

const submit = (contact) => page.evaluate((c) => {
  document.getElementById('r_name').value = 'เจ้าของร้าน';
  document.getElementById('r_shop').value = 'ร้านทดสอบ';
  document.getElementById('r_contact').value = c;
  document.getElementById('r_consent').checked = true;
  const e = document.getElementById('regErr');
  e.textContent = ''; e.style.display = 'none';
  startQuiz();
  return { err: e.textContent.trim(), moved: document.getElementById('s-quiz').classList.contains('active') };
}, contact);

let r = await submit('line-id-ของร้าน');
t('กรอก LINE ID แทนเบอร์ถูกปฏิเสธ', !r.moved && r.err.includes('เบอร์โทร'), r.err || 'ผ่านไปเลย');
r = await submit('0812');
t('เบอร์สั้นเกินไปถูกปฏิเสธ', !r.moved && r.err.includes('เบอร์โทร'), r.err || 'ผ่านไปเลย');
r = await submit('081-234-5678');
t('เบอร์ที่ถูกต้องผ่านได้', r.moved, r.err);

console.log(`\n${pass} passed, ${failn} failed`);
await browser.close();
process.exit(failn ? 1 : 0);

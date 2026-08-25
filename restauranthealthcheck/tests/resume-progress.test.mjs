// ทำค้างไว้แล้วกลับมาทำต่อได้
//
// แบบละเอียดใช้เวลาเกือบครึ่งชั่วโมง ถ้าปิดแท็บแล้วต้องเริ่มข้อ 1 ใหม่
// คนจะไม่กลับมาอีกเลย ชุดนี้กันไม่ให้ความสามารถนี้พังเงียบ ๆ
//
// เคยพังมาแล้วครั้งหนึ่ง: ตัวเรียก showResumeBar() ถูกวางไว้ก่อนบรรทัดที่ประกาศ
// const ของมันเอง ทำให้ชน temporal dead zone แล้วโดน try/catch กลืนเป็น "ไม่มี
// ของค้าง" โดยไม่มี error ให้เห็นเลย — เทสนี้จับเคสนั้นได้
import puppeteer from 'puppeteer-core';
import { ACCESS_CODE, seedAccess } from './access.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
let pass = 0, failed = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (x ? ' — ' + x : ''))); };

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await seedAccess(page);
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load')) errs.push(m.text()); });

const screen = () => page.$eval('.screen.active', (e) => e.id);
const clickByOnclick = async (f) => {
  const h = await page.evaluateHandle((f) => [...document.querySelectorAll('[onclick]')]
    .find((el) => el.getAttribute('onclick').includes(f) && el.offsetParent !== null), f);
  await h.asElement().click();
};
const barShown = () => page.$eval('#resumeBar', (e) => getComputedStyle(e).display !== 'none');

console.log('\n— ยังไม่เคยทำ ไม่ต้องมีแถบมากวน —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
t('หน้าแรกสะอาด ไม่มีแถบชวนทำต่อ', (await barShown()) === false);

console.log('\n— ตอบไป 4 ข้อแล้วปิดแท็บ —');
await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register');
await page.type('#r_name', 'เจ้าของร้านทำค้าง');
await page.type('#r_shop', 'ร้านทำค้างไว้');
await page.type('#r_contact', '0812345678');
await page.select('#r_province', 'ตราด');
await page.click('#r_consent');
await clickByOnclick('startQuiz()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quiz');
for (let n = 0; n < 4; n++) {
  for (let i = 0; i < 12; i++) {
    if (!(await page.$eval('#qNext', (e) => e.disabled))) break;
    const c = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#qBody button')]
        .filter((b) => b.offsetParent !== null && !b.className.includes('calc') && !b.classList.contains('sel'));
      if (!b.length) return false;
      b[2 % b.length].click();
      return true;
    });
    if (!c) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  await page.click('#qNext');
  await new Promise((r) => setTimeout(r, 60));
}
const before = await page.evaluate(() => ({
  idx: state.idx, answered: state.answers.filter(Boolean).length,
  count: document.getElementById('qCount').textContent, shop: state.reg.shop, sid: state.sid,
}));
t('ตอบไปแล้วหลายข้อ', before.answered >= 4, JSON.stringify(before));

console.log('\n— กลับมาใหม่ —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 400));
t('หน้าแรกขึ้นแถบชวนทำต่อ', await barShown());
const msg = await page.$eval('#resumeBar .rb-txt', (e) => e.textContent.trim());
t('บอกด้วยว่าทำไปแล้วกี่ข้อ', /\d+ จาก \d+ ข้อ/.test(msg), msg);
t('ยังไม่เด้งไปไหนเอง — ให้เขาเลือกเอง', (await screen()) === 's-landing');

await page.click('#resumeBar .rb-go');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quiz', { timeout: 8000 });
const after = await page.evaluate(() => ({
  idx: state.idx, answered: state.answers.filter(Boolean).length,
  count: document.getElementById('qCount').textContent, shop: state.reg.shop, sid: state.sid,
}));
t('กลับมาที่ข้อเดิมเป๊ะ', after.idx === before.idx && after.count === before.count,
  `${after.count} vs ${before.count}`);
t('คำตอบเดิมอยู่ครบ', after.answered === before.answered, `${after.answered} vs ${before.answered}`);
t('ข้อมูลร้านที่กรอกไว้ยังอยู่ ไม่ต้องกรอกใหม่', after.shop === before.shop, after.shop);
// sid เดิมสำคัญ: ถ้าเปลี่ยน ลีดจะกลายเป็นสองแถวในฐานข้อมูลแทนที่จะอัปเดตแถวเดิม
t('ยังเป็นการทำชุดเดิม ไม่ใช่ชุดใหม่', after.sid === before.sid);

console.log('\n— กดเริ่มใหม่ —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300));
await page.click('#resumeBar .rb-no');
t('แถบหายทันที', (await barShown()) === false);
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300));
t('โหลดใหม่ก็ไม่กลับมาอีก', (await barShown()) === false);

console.log('\n— ของค้างที่ใช้ไม่ได้แล้ว ต้องไม่ชวนกลับมา —');
const stale = async (patch) => page.evaluate((patch) => {
  const base = {
    v: 1, ts: Date.now(), screen: 's-quiz', sid: 'x', mode: 'quick', reg: {},
    answers: Array(QUESTIONS.length).fill(null).map((_, i) => (i < 3 ? { oi: 1, v: 3 } : null)),
    order: [0, 1, 2, 3, 4], idx: 2, carriedOver: 0, costProfile: 'alacarte', fin: null,
  };
  localStorage.setItem('rhc_progress', JSON.stringify(Object.assign(base, patch)));
  return !!loadProgress();
}, patch);
t('เกิน 14 วันแล้วถือว่าเลิกทำ', (await stale({ ts: Date.now() - 15 * 24 * 3600 * 1000 })) === false);
t('จำนวนคำถามเปลี่ยนไปแล้ว ใช้ของเก่าต่อไม่ได้', (await stale({ answers: [null, null] })) === false);
t('ยังไม่ได้ตอบอะไรเลย ไม่ต้องชวน',
  (await stale({ answers: await page.evaluate(() => Array(QUESTIONS.length).fill(null)) })) === false);
t('ของค้างที่ยังใช้ได้ ต้องอ่านออก', (await stale({})) === true);

console.log('\n— ทำจนจบแล้วต้องไม่ชวนให้ทำต่ออีก —');
await page.evaluate(() => localStorage.removeItem('rhc_progress'));
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await clickByOnclick("chooseMode('quick')");
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-register');
await page.type('#r_name', 'ทำจนจบ');
await page.type('#r_shop', 'ร้านทำจนจบ');
await page.type('#r_contact', '0898887777');
await page.select('#r_province', 'ภูเก็ต');
await page.click('#r_consent');
await clickByOnclick('startQuiz()');
await page.waitForFunction(() => document.querySelector('.screen.active').id === 's-quiz');
for (let g = 0; g < 40 && (await screen()) === 's-quiz'; g++) {
  for (let i = 0; i < 12; i++) {
    if (!(await page.$eval('#qNext', (e) => e.disabled))) break;
    const c = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#qBody button')]
        .filter((b) => b.offsetParent !== null && !b.className.includes('calc') && !b.classList.contains('sel'));
      if (!b.length) return false;
      b[1 % b.length].click();
      return true;
    });
    if (!c) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  await page.click('#qNext');
  await new Promise((r) => setTimeout(r, 50));
}
t('ทำแบบด่วนจนจบ', (await screen()) === 's-quickresult', await screen());
t('ทำจบแล้วของค้างถูกล้างทิ้ง',
  await page.evaluate(() => localStorage.getItem('rhc_progress') === null));

console.log('\n— ไม่มี JavaScript error —');
t('ไม่มี error หลุดออกมา', errs.length === 0, errs.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

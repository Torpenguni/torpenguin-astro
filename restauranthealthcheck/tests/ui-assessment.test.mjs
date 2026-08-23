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
const PROVINCE = 'กรุงเทพมหานคร';
let reportLink = null;

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

// โหมดละเอียดต้องมีบัญชีแล้ว (แบบ 10 ข้อยังทำได้เลย) ชุดนี้เดินทางโหมดละเอียด
// จึงต้องมีบัญชีจริงก่อน สมัคร + กดลิงก์ยืนยันจากกล่องจดหมายจำลอง
console.log(`\n=== ${DEVICE.name} ===`);
console.log('\n— เตรียมบัญชีสำหรับโหมดละเอียด —');
{
  await page.goto(BASE + '/account?mode=signup', { waitUntil: 'networkidle0' });
  await page.type('#email', EMAIL);
  await page.type('#password', 'ui-suite-password-2026');
  await page.type('#password2', 'ui-suite-password-2026');
  await page.click('#go');
  await page.waitForFunction(() => document.getElementById('msg').className.includes('ok'), { timeout: 15000 });
  const link = ([...mail()].reverse().find((x) => x.to === EMAIL)?.text || '')
    .match(/http:\/\/\S*\/api\/auth\/verify\?token=\S+/)?.[0];
  t('สมัครและได้ลิงก์ยืนยัน', !!link);
  await page.goto(link, { waitUntil: 'networkidle0' });
}

console.log('\n— หน้าแรก —');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
t('หน้าแรกโหลดได้', await visible() === 's-landing');
t('ไม่มีแถบเลื่อนแนวนอน', await page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  await page.evaluate(() => `scrollWidth=${document.documentElement.scrollWidth} clientWidth=${document.documentElement.clientWidth}`));
// เช็คว่าไฟล์ฟอนต์ถูกโหลดจริง ไม่ใช่แค่ประกาศชื่อไว้ — document.fonts จะมีสมาชิก
// เฉพาะตัวที่โหลดสำเร็จเท่านั้น (เทียบกับ .check() ที่คืน true ให้ชื่อมั่ว ๆ ด้วย)
t('ฟอนต์ไทยโหลดจริง', await page.evaluate(async () => {
  await document.fonts.ready;
  return [...document.fonts].some((f) => f.family === 'IBM Plex Sans Thai' && f.status === 'loaded');
}));

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
// ล็อกอินอยู่แล้ว ช่องอีเมลถูกแทนด้วยข้อความบอกว่าจะส่งไปที่ไหน จึงไม่ต้องกรอก
t('ไม่ถามอีเมลซ้ำเพราะล็อกอินอยู่', await page.$('#r_email') === null);
t('บอกปลายทางที่จะส่งสรุปผล',
  (await page.$eval('.acct-mail', (el) => el.textContent)).includes(EMAIL));
await page.select('#r_type', await page.$eval('#r_type option:nth-child(2)', (o) => o.value));
await clickByOnclick('startQuiz()');
t('กันไม่ให้ข้ามช่องยินยอม PDPA', await visible() === 's-register');

await page.select('#r_province', PROVINCE);
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

// ลำดับบนหน้า: ปุ่มโหลดรายงานต้องมาก่อนตัวรายงาน และคำชวนคุยกับ CP อยู่ท้ายสุด
// ของที่เขาตอบ 48 ข้อมาเพื่อจะได้ ต้องเห็นก่อนคำชวนขาย
{
  const order = await page.evaluate(() => {
    const pos = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().top + window.scrollY : -1;
    };
    return { save: pos('.report-actions'), report: pos('#reportDoc'), cta: pos('#ctaCard') };
  });
  t('ปุ่มโหลดรายงานอยู่เหนือตัวรายงาน', order.save > 0 && order.save < order.report,
    JSON.stringify(order));
  t('คำชวนคุยกับ CP อยู่ท้ายสุด ใต้รายงาน', order.cta > order.report, JSON.stringify(order));
  t('ปุ่มโหลดรายงานเป็นปุ่มหลัก ไม่ใช่ปุ่มโครงจาง ๆ',
    await page.$eval('.report-actions .btn-save', (el) => el.classList.contains('btn-primary')));
  t('ป้ายปุ่มบอกตรง ๆ ว่าดาวน์โหลด',
    await page.$eval('.report-actions .btn-save', (el) => /ดาวน์โหลด/.test(el.textContent)));
}

console.log('\n— ถามยืนยันก่อนให้ทีม CP โทรกลับ —');
{
  // ปุ่มนี้อยู่ท้ายหน้าที่ต้องเลื่อนยาวมาก นิ้วโดนตอนเลื่อนได้ง่าย และกดแล้ว
  // ทีมขายจะโทรไปจริง ยกเลิกทีหลังไม่ได้
  await page.$eval('#ctaBtn', (el) => el.click());
  await new Promise((r) => setTimeout(r, 250));
  t('กดครั้งแรกได้แค่คำถาม ยังไม่ส่ง', await page.$('#ctaWrap [data-yes], #ctaYes') !== null);
  t('คำถามอ่านแล้วรู้ว่าจะเกิดอะไร',
    await page.$eval('#ctaWrap .cc-q', (el) => /ยืนยัน/.test(el.textContent) && /โทรกลับ/.test(el.textContent)),
    await page.$eval('#ctaWrap .cc-q', (el) => el.textContent));
  await page.$eval('#ctaNo, #ctaWrap [data-no]', (el) => el.click());
  await new Promise((r) => setTimeout(r, 250));
  t('กดยกเลิกแล้วกลับเป็นปุ่มเดิม',
    await page.$('#ctaWrap [data-yes], #ctaYes') === null
    && await page.$eval('#ctaBtn', (el) => /ติดต่อกลับ/.test(el.textContent)));
  t('ยกเลิกแล้วยังกดใหม่ได้', await page.$eval('#ctaBtn', (el) => !el.disabled));
}
t('ตัวนับ % ไม่ค้างอยู่บนหน้ารายงาน',
  await page.$eval('#progMini', (el) => el.textContent.trim() === ''),
  await page.$eval('#progMini', (el) => `ค้างอยู่ที่ "${el.textContent.trim()}"`));

// puppeteer รับเฉพาะ path แบบสตริง ส่ง URL object เข้าไปไม่ได้
await page.screenshot({ path: fileURLToPath(new URL(`./screenshot-${process.argv[2] || 'desktop'}.png`, import.meta.url)) });

console.log('\n— แผน 90 วันครอบคลุมครบทุกด้าน —');
{
  // เดิมแผนหยิบมาแค่ 3 ด้าน อีกสองด้านหายไปเงียบ ๆ คนอ่านเลยรู้สึกว่า
  // ประเมินตั้ง 5 ด้าน แต่ได้แผนมาไม่ครบ
  const plan = await page.$$eval('#repPlan .phase-block', (blocks) => blocks.map((b) => ({
    month: b.querySelector('.ph-month').textContent.trim(),
    dims: [...b.querySelectorAll('.pa-dim')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
  })));
  const all = plan.flatMap((p) => p.dims);
  const real = await page.evaluate(() => DIMS.map((d) => `${d.ico} ${ACTIONS[d.key].title}`));
  t('แผนแบ่งเป็น 3 เดือน', plan.length === 3, JSON.stringify(plan.map((p) => p.month)));
  t('แผน 90 วันมีครบทั้ง 5 ด้าน', all.length === 5, `มี ${all.length} ด้าน: ${all.join(' / ')}`);
  t('ไม่มีด้านไหนซ้ำในแผน', new Set(all).size === all.length, all.join(' / '));
  t('ชื่อด้านในแผนตรงกับ 5 มิติจริง',
    all.every((x) => real.includes(x)), `แผน: ${all.join(' / ')}`);
  t('เดือนแรกมีด้านเดียว ให้ลงแรงเต็มที่ก่อน', plan[0].dims.length === 1, JSON.stringify(plan[0].dims));
  t('ทุกด้านในแผนมีสิ่งที่ต้องทำรายสัปดาห์',
    await page.$$eval('#repPlan .phase-action', (a) => a.every((x) => x.querySelectorAll('.pa-weeks li').length > 0)));

  // บนหน้าจอจริงต้องเห็นบรรทัดที่อ้างกลับไปที่คำตอบของเขา ไม่ใช่มีแค่ในข้อมูล
  const why = await page.$$eval('#repPlan .phase-action', (acts) => acts.map((a) => {
    const el = a.querySelector('.pa-why');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }));
  t('ทุกงานในแผนบอกว่ามาจากคำตอบไหนของเขา',
    why.length === 5 && why.every((x) => /คุณตอบว่า/.test(x)), JSON.stringify(why));
  t('บรรทัดนั้นแสดงผลจริง ไม่ได้ถูกซ่อน',
    await page.$eval('#repPlan .pa-why', (el) => getComputedStyle(el).display !== 'none'));

  // ด้านที่เลือกต้องขึ้นเดือนแรก และเปลี่ยนตัวเลือกแล้วแผนต้องจัดใหม่จริง
  const other = await page.evaluate(() => {
    const cur = state.focus;
    const next = DIMS.map((d) => d.key).find((k) => k !== cur);
    setFocus(next);
    return { key: next, title: `${DIMS.find((d) => d.key === next).ico} ${ACTIONS[next].title}` };
  });
  await new Promise((r) => setTimeout(r, 400));
  const after = await page.$$eval('#repPlan .phase-block', (blocks) => blocks.map((b) =>
    [...b.querySelectorAll('.pa-dim')].map((e) => e.textContent.replace(/\s+/g, ' ').trim())));
  t('เลือกด้านอื่นแล้วด้านนั้นขึ้นเดือนแรก', after[0][0] === other.title, `${after[0][0]} vs ${other.title}`);
  t('เปลี่ยนตัวเลือกแล้วยังครบ 5 ด้านเหมือนเดิม', after.flat().length === 5, after.flat().join(' / '));

  // คืนค่าตัวเลือกเดิมก่อนไปต่อ ชุดถัดไปเทียบรายงานบนจอกับรายงานที่เปิดย้อนหลัง
  // ซึ่งเริ่มจากด้านที่ระบบแนะนำเสมอ ถ้าทิ้งไว้ตามที่เพิ่งกด สองอันจะไม่ตรงกัน
  await page.evaluate(() => setFocus(state.focusRec));
  await new Promise((r) => setTimeout(r, 400));
}

console.log('\n— หัวรายงานเป็นโลโก้จริง —');
{
  // รายงานนี้ถูกพิมพ์ออกกระดาษและส่งต่อกันในร้าน หัวกระดาษจึงต้องเป็นตราจริง
  // เหมือนหัวเว็บ ไม่ใช่ข้อความ "PenguinX × CP" ที่พิมพ์ด้วยฟอนต์เฉย ๆ
  const logos = await page.$$eval('.rep-head img', (els) => els.map((e) => ({
    src: e.getAttribute('src'), alt: e.alt,
    w: Math.round(e.getBoundingClientRect().width),
    h: Math.round(e.getBoundingClientRect().height),
    loaded: e.complete && e.naturalWidth > 0,
  })));
  t('หัวรายงานมีโลโก้สองอัน', logos.length === 2, JSON.stringify(logos));
  t('เป็นโลโก้ PenguinX กับ CP',
    logos.some((l) => /penguinx/.test(l.src)) && logos.some((l) => /cp/.test(l.src)), JSON.stringify(logos.map((l) => l.src)));
  // ไฟล์รูปที่ 404 ยังนับเป็น <img> อยู่ ต้องเช็คว่ามันโหลดขึ้นมาจริง
  t('ไฟล์โลโก้โหลดขึ้นจริง ไม่ใช่รูปเสีย', logos.every((l) => l.loaded), JSON.stringify(logos));
  t('โลโก้มีขนาดจริงบนหน้า', logos.every((l) => l.w > 10 && l.h > 10), JSON.stringify(logos));
  t('มีคำว่า Sponsored by กำกับ',
    await page.$eval('.rep-head', (el) => /Sponsored by/i.test(el.textContent)));
  t('ไม่เหลือข้อความ × CP แบบเก่า',
    await page.$eval('.rep-head', (el) => !/×\s*CP/.test(el.textContent)));
}

// เก็บรายงานที่เห็นบนจอไว้เทียบทีหลัง ตอนเปิดย้อนหลังต้องได้เหมือนกันทุกตัวอักษร
const reportOnScreen = await page.$eval('#reportDoc', (el) => el.textContent.replace(/\s+/g, ' ').trim());

console.log('\n— บันทึกรายงานเป็น PDF —');
{
  // ดักปุ่มพิมพ์ไว้ก่อน เบราว์เซอร์ headless เปิดกล่องพิมพ์จริงไม่ได้
  // เก็บ document.title ตอนที่ window.print() ถูกเรียก เพราะชื่อนั้นแหละ
  // คือชื่อไฟล์ PDF ที่ผู้ใช้จะได้
  await page.evaluate(() => {
    window.__printedTitle = null;
    window.print = () => { window.__printedTitle = document.title; };
  });
  const before = await page.evaluate(() => document.title);
  await clickByOnclick('saveReport()');
  await page.waitForFunction(() => window.__printedTitle !== null, { timeout: 5000 });
  const printed = await page.evaluate(() => window.__printedTitle);
  t('ชื่อไฟล์ PDF มีชื่อร้านอยู่ด้วย', printed.includes(SHOP), printed);
  t('ชื่อไฟล์ PDF มีวันที่กำกับ', /\d{4}-\d{2}-\d{2}/.test(printed), printed);
  t('ชื่อไฟล์ PDF ไม่มีอักขระต้องห้ามของระบบไฟล์', !/[\/\\:*?"<>|]/.test(printed), printed);

  // พิมพ์เสร็จแล้วต้องคืนชื่อหน้าเดิม ไม่งั้นแท็บจะค้างเป็นชื่อไฟล์
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  t('พิมพ์เสร็จแล้วคืนชื่อหน้าเว็บเดิม', await page.evaluate(() => document.title) === before);

  // สองร้านคนละชื่อต้องได้คนละชื่อไฟล์ — เดิมทุกคนได้ชื่อไฟล์เดียวกันหมด
  const other = await page.evaluate(() => {
    const keep = state.reg.shop;
    state.reg.shop = 'ร้านอื่นที่ไม่ซ้ำ';
    const n = reportFileName();
    state.reg.shop = keep;
    return n;
  });
  t('คนละร้านได้คนละชื่อไฟล์', other !== printed && other.includes('ร้านอื่นที่ไม่ซ้ำ'), other);
}

console.log('\n— หน้ากระดาษตอนพิมพ์ —');
{
  await page.emulateMediaType('print');
  // A4 แนวตั้ง 210mm ลบขอบกระดาษ @page 12mm สองข้าง = พื้นที่พิมพ์จริง 186mm
  const A4 = 794, PRINTABLE = Math.round(186 / 25.4 * 96);
  const saved = page.viewport();
  await page.setViewport({ width: PRINTABLE, height: 1123 });
  await new Promise((r) => setTimeout(r, 300));
  const fit = await page.evaluate(() => ({
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyW: getComputedStyle(document.body).width,
    widest: [...document.querySelectorAll('#reportDoc *')]
      .map((e) => Math.round(e.getBoundingClientRect().right))
      .reduce((a, b) => Math.max(a, b), 0),
    docRight: Math.round(document.getElementById('reportDoc').getBoundingClientRect().right),
  }));
  // เดิมสั่ง html,body{width:210mm} ไว้ ทั้งที่พิมพ์ได้แค่ 186mm เนื้อหาเลยถูก
  // ตัดหายที่ขอบขวาทุกหน้า ตารางเทียบเกณฑ์ต้นทุนโดนตัดคำว่า "เริ่มสูง" ขาดครึ่ง
  t('เนื้อหาไม่ล้นออกนอกพื้นที่พิมพ์', fit.over <= 1, `ล้นไป ${fit.over}px (body=${fit.bodyW})`);
  t('ไม่บังคับความกว้างเป็นขนาดกระดาษเต็มแผ่น', Math.round(parseFloat(fit.bodyW)) <= PRINTABLE + 1,
    `body กว้าง ${fit.bodyW} แต่พิมพ์ได้ ${PRINTABLE}px`);
  t('ไม่มีอะไรในรายงานยื่นเลยขอบกระดาษ', fit.widest <= PRINTABLE + 1, `กว้างสุด ${fit.widest}px`);

  const look = await page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('reportDoc'));
    return { border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor,
      cols: getComputedStyle(document.querySelector('.rep-2col')).gridTemplateColumns.split(' ').length };
  });
  // กล่องรายงานกินหลายหน้ากระดาษ ถ้ายังมีเส้นขอบกับมุมโค้งจะได้กรอบครึ่ง ๆ กลาง ๆ
  t('ตัดเส้นขอบการ์ดออกตอนพิมพ์', look.border === '0px', look.border);
  t('ตัดมุมโค้งออกตอนพิมพ์', look.radius === '0px', look.radius);
  t('พื้นหลังรายงานยังเป็นสีขาว', look.bg === 'rgb(255, 255, 255)', look.bg);
  // บนจอ "สุขภาพ 5 มิติ" กับ "เทียบมาตรฐานต้นทุน" อยู่คู่กันสองคอลัมน์
  // บนกระดาษก็ต้องอยู่คู่กันเหมือนกัน ไม่ใช่ยืดเต็มความกว้างทีละอัน
  t('ยังเรียงสองคอลัมน์เหมือนบนจอ', look.cols === 2, `${look.cols} คอลัมน์`);

  const breaks = await page.evaluate(() => {
    const need = ['.dim-deep', '.phase-block', '.syn-item', '.rep-plan-item', '.rep-h'];
    return need.filter((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.breakInside !== 'avoid' && cs.pageBreakInside !== 'avoid';
    });
  });
  t('การ์ดย่อยไม่ถูกหั่นคาหน้ากระดาษ', breaks.length === 0, breaks.join(', '));
  // หัวข้อใหญ่ทั้งก้อนต้องแตกหน้าได้ ไม่งั้นหัวข้อที่ยาวเกินหนึ่งหน้าจะดันตัวเอง
  // ไปขึ้นหน้าใหม่แล้วก็ยังล้นอยู่ดี เหลือหน้าเปล่าครึ่งหน้าเป็นพืด
  t('หัวข้อใหญ่ยังแตกหน้าได้', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.rep-section')).breakInside !== 'avoid'));

  await page.emulateMediaType(null);
  await page.setViewport(saved);
  await new Promise((r) => setTimeout(r, 200));
}

console.log('\n— เนื้อหาในอีเมลสรุปผล —');
{
  // เดิมอีเมลมีแค่คะแนนดิบห้าตัว คนอ่านแล้วไม่รู้ว่าต้องทำอะไรต่อ
  // ตอนนี้ต้องมีเนื้อหาเดียวกับรายงานที่เห็นบนจอ
  await new Promise((r) => setTimeout(r, 1500));
  const m = [...mail()].reverse().find((x) => x.to === EMAIL && /ผลตรวจ/.test(x.subject || ''));
  t('ได้อีเมลสรุปผล', !!m, m ? '' : 'ไม่มีเมลเข้ามา');
  const body = (m && m.text) || '';
  const html = (m && m.html) || '';
  for (const head of ['บทสรุปผู้บริหาร', 'วิเคราะห์การเงินจริง', 'เทียบมาตรฐานต้นทุน',
    'เจาะลึกราย 5 มิติ', 'แผนปฏิบัติ 90 วัน']) {
    t(`อีเมลมีหัวข้อ "${head}"`, body.includes(head) && html.includes(head));
  }
  t('อีเมลมีตัวเลขการเงินจริง ไม่ใช่แค่คะแนน', /กำไรสุทธิจริง/.test(body) && /Food Cost/.test(body), body.slice(0, 80));
  t('อีเมลมีชื่อร้าน', body.includes(SHOP));
  t('อีเมลไม่ขึ้นต้นว่า "ร้านร้าน"', !/ร้านร้าน/.test(body), body.split('\n')[0]);
  // ป้ายกำกับกับข้อความหลักเป็นคนละ span ถ้าอ่านมาต่อกันดื้อ ๆ จะได้ "สัปดาห์ 1เลือกคน…"
  t('ป้ายสัปดาห์ไม่ติดกับข้อความ', !/สัปดาห์ \d[ก-๙]/.test(body), (body.match(/สัปดาห์ \d[ก-๙][^\n]*/) || [''])[0]);
  t('บทสรุปผู้บริหารไม่ถูกยำติดกันเป็นก้อนเดียว', !/\)ร้านคุณ/.test(body));
  t('อีเมลมีลิงก์เปิดรายงานฉบับเต็ม', /\?report=[A-Za-z0-9_-]+/.test(body), body.slice(-200));
  t('อีเมลยาวกว่าเดิมมาก (มีเนื้อหาจริง)', body.length > 2000, `${body.length} ตัวอักษร`);
  reportLink = (body.match(/https?:\/\/\S*\?report=[A-Za-z0-9_-]+/) || [])[0] || null;
}

console.log('\n— เปิดรายงานเดิมย้อนหลัง —');
if (reportLink) {
  await page.goto(reportLink, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('.screen.active')
    && document.querySelector('.screen.active').id === 's-result', { timeout: 15000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  t('ลิงก์จากอีเมลพาไปหน้ารายงาน', await visible() === 's-result', await visible());
  const again = await page.$eval('#reportDoc', (el) => el.textContent.replace(/\s+/g, ' ').trim());
  // ไม่ได้แสดงข้อความที่เก็บไว้เฉย ๆ แต่ยกคำตอบชุดเดิมกลับมาแล้ววาดใหม่ด้วยโค้ดเดิม
  // รายงานจึงต้องออกมาเหมือนเดิมทุกตัวอักษร ไม่ใช่แค่ "คล้าย ๆ"
  t('รายงานที่เปิดย้อนหลังเหมือนของเดิมทุกตัวอักษร', again === reportOnScreen,
    `เดิม ${reportOnScreen.length} ตัวอักษร · ย้อนหลัง ${again.length} ตัวอักษร`);
  t('ยังโหลด PDF จากรายงานย้อนหลังได้',
    await page.$eval('#saveBtn, [onclick*="saveReport"]', (el) => getComputedStyle(el).display !== 'none')
      .catch(() => false));
  // เปิดดูย้อนหลังคือการอ่าน ห้ามไปเขียนทับแถวเดิมในฐานข้อมูล
  t('โหมดดูย้อนหลังไม่ยิงบันทึกซ้ำ', await page.evaluate(() => state.viewOnly === true));

  console.log('\n— หน้าบัญชี: กดที่ร้านแล้วเปิดรายงานได้ —');
  await page.goto(BASE + '/account', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 900));
  const links = await page.$$eval('a.row.link', (a) => a.map((x) => x.getAttribute('href')));
  t('แถวประวัติที่ทำจบแล้วกดได้', links.length > 0, `มี ${links.length} แถวที่กดได้`);
  // เจ้าของร้านเห็นป้ายนี้ในประวัติของตัวเอง คำว่า NURTURE ไม่ได้บอกอะไรเขาเลย
  const badges = await page.$$eval('.tier', (els) => els.map((e) => e.textContent.trim()));
  t('ป้ายในหน้าบัญชีเป็นภาษาไทย',
    badges.length > 0 && badges.every((b) => /พร้อมขยาย|มีจุดต้องเสริม|ต้องวางรากฐาน/.test(b)),
    JSON.stringify(badges));
  t('แถวประวัติชี้ไปที่รายงานฉบับเต็ม',
    links.every((h) => /^\/\?report=[A-Za-z0-9_-]+$/.test(h)), JSON.stringify(links));
  await page.click('a.row.link');
  await page.waitForFunction(() => document.querySelector('.screen.active')
    && document.querySelector('.screen.active').id === 's-result', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  t('กดจากหน้าบัญชีแล้วได้รายงานเต็ม', await visible() === 's-result', await visible());
  t('รายงานจากหน้าบัญชีก็เหมือนของเดิม',
    (await page.$eval('#reportDoc', (el) => el.textContent.replace(/\s+/g, ' ').trim())) === reportOnScreen);

} else {
  t('มีลิงก์รายงานให้เปิดย้อนหลัง', false, 'ไม่พบลิงก์ในอีเมล จึงข้ามชุดนี้');
}

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

console.log('\n— ผลเก่าที่ไม่มีคำตอบเก็บไว้ —');
// แถวที่บันทึกไว้ก่อนระบบเริ่มเก็บคำตอบชุดเต็ม วาดรายงานคืนไม่ได้ ต้องบอกให้รู้เรื่อง
// ไม่ใช่ค้างอยู่หน้าขาว ๆ และห้ามใช้ alert() ที่ขวางทั้งหน้าไว้เฉย ๆ
// ชุดนี้อยู่ท้ายสุดเพราะมันเพิ่มแถวใหม่ให้อีเมลเดียวกัน ถ้าวางไว้ก่อนหน้านี้จะไป
// กลบแถวจริงในชุดที่ตรวจข้อมูลหลังบ้าน (ซึ่งหยิบแถวล่าสุดของอีเมลนั้นมาดู)
{
  const legacy = 'legacy-' + Date.now();
  await fetch(BASE + '/api/assessments', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ sessionKey: legacy, email: EMAIL, shop: 'ร้านยุคก่อน', completed: true,
      total: 55, mode: 'deep', scores: { D1: 55, D2: 55, D3: 55, D4: 55, D5: 55 } }),
  });
  // ยิงจากในหน้าเว็บ คุกกี้เซสชันเป็น HttpOnly จึงอ่านจาก document.cookie ไม่ได้
  const old = await page.evaluate(async () => {
    const r = await fetch('/api/assessments', { credentials: 'same-origin' });
    const d = await r.json();
    return (d.assessments || []).find((x) => x.shop === 'ร้านยุคก่อน') || null;
  });
  t('เตรียมแถวเก่าไว้ทดสอบได้', !!old);
  if (old) {
    let alerted = false;
    page.once('dialog', async (d) => { alerted = true; await d.dismiss(); });
    await page.goto(`${BASE}/?report=${old.id}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));
    t('ไม่ค้างหน้าเปล่า — พากลับไปหน้าบัญชี', page.url().includes('/account'), page.url());
    t('บอกเหตุผลให้ผู้ใช้อ่านบนหน้าบัญชี',
      await page.$eval('#msg', (el) => el.className.includes('err') && el.textContent.length > 10)
        .catch(() => false));
    t('ไม่ใช้ alert() ที่ขวางทั้งหน้า', !alerted);
  }
}

console.log('\n— ไม่มี JavaScript error ตลอดทาง —');
t('ไม่มี error หลุดออกมาเลย', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

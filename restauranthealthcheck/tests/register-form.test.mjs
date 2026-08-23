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

console.log('\n— ประเภทร้าน & ช่วงยอดขาย —');
// คำถาม "ร้านคุณเป็นประเภทไหน?" ถูกตัดออกเพราะซ้ำกับฟอร์ม แต่คำถามนั้นเคยเป็น
// ตัวเลือกเกณฑ์ต้นทุนของทั้งรายงาน ถ้าตัวเลือกในฟอร์มครอบคลุมไม่ครบ ร้านชาบูจะ
// ถูกวินิจฉัยด้วยเกณฑ์ร้านตามสั่ง (food cost 30-35% แทนที่จะเป็น 40-55%) แบบ
// เงียบ ๆ ไม่มีใครรู้ ชุดนี้กันไม่ให้เกิด
const cover = await page.evaluate(() => {
  const opts = [...document.querySelectorAll('#r_type option')].map((o) => o.textContent);
  const reached = new Set(opts.map((o) => profileFromRegType(o)));
  return { keys: Object.keys(COST_PROFILE), reached: [...reached], opts: opts.length };
});
t(`ตัวเลือกประเภทร้านในฟอร์มพาไปได้ครบทุกเกณฑ์ต้นทุน (${cover.opts} ตัวเลือก)`,
  cover.keys.every((k) => cover.reached.includes(k)),
  `ไปไม่ถึง: ${cover.keys.filter((k) => !cover.reached.includes(k)).join(', ')}`);

const buffet = await page.evaluate(() => profileFromRegType('บุฟเฟต์ / ชาบู / ปิ้งย่าง'));
t('ร้านชาบูได้เกณฑ์บุฟเฟต์ ไม่ใช่ร้านตามสั่ง', buffet === 'buffet', buffet);
const bakery = await page.evaluate(() => profileFromRegType('เบเกอรี่ / ของหวาน'));
t('ร้านเบเกอรี่ได้เกณฑ์ของตัวเอง', bakery === 'bakery', bakery);

// ช่วงยอดขายแต่ละช่วงส่งค่ากลางของช่วงไปคำนวณ ค่าต้องอยู่ในช่วงจริง ไม่งั้น
// ตัวเลขที่ระบบเดาให้จะเพี้ยนตั้งแต่ต้นทาง
const bands = await page.evaluate(() => [...document.querySelectorAll('#f_rev option')]
  .filter((o) => o.value)
  .map((o) => ({ label: o.textContent.trim(), v: Number(o.value) })));
t('มีช่วง 100,000 – 250,000', bands.some((b) => b.label.includes('100,000 – 250,000')));
t('มีช่วง 250,000 – 500,000', bands.some((b) => b.label.includes('250,000 – 500,000')));
const bad = bands.filter((b) => {
  const n = (b.label.match(/[\d,]+/g) || []).map((x) => Number(x.replace(/,/g, '')));
  if (b.label.includes('ล้าน') || n.length < 2) return false;
  return b.v < n[0] || b.v > n[1];
});
t('ค่ากลางของทุกช่วงอยู่ในช่วงจริง', bad.length === 0, JSON.stringify(bad));

console.log('\n— ข้อความและสีบนการ์ดสีแดง —');
const html = await (await fetch(BASE + '/')).text();
// "ออกบูธ" เป็นตัวอย่างช่องทางรายได้ คนละเรื่องกับบูธงานอีเวนต์
const boothHits = (html.match(/บูธ/g) || []).length - (html.match(/ออกบูธ/g) || []).length;
t('ไม่เหลือข้อความชวนให้แวะมาที่บูธ', boothHits === 0, `เหลือ ${boothHits} จุด`);
t('เครดิตผู้ดำเนินการเหลือเฉพาะ PenguinX', !/ดำเนินการ[^<]*CP/.test(html));

const contrast = await page.evaluate(() => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).map(Number); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const d = document.createElement('div');
  d.className = 'cta-card';
  d.innerHTML = '<h3>x</h3><p>y</p>';
  document.body.appendChild(d);
  const bg = 'rgb(200,16,46)';
  const r = (c) => { const x = L(c), y = L(bg); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const out = { h: r(getComputedStyle(d.querySelector('h3')).color), p: r(getComputedStyle(d.querySelector('p')).color) };
  d.remove();
  return out;
});
t(`หัวข้อบนพื้นแดงอ่านออก (${contrast.h.toFixed(2)}:1)`, contrast.h >= 4.5);
t(`คำอธิบายบนพื้นแดงอ่านออก (${contrast.p.toFixed(2)}:1)`, contrast.p >= 4.5);

const btnContrast = await page.evaluate(() => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).map(Number); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const d = document.createElement('div');
  d.className = 'cta-card';
  d.innerHTML = '<button class="btn btn-ghost">x</button>';
  document.body.appendChild(d);
  const c = getComputedStyle(d.querySelector('button')).color;
  d.remove();
  const x = L(c), y = L('rgb(200,16,46)');
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
});
t(`ปุ่มเส้นขอบบนพื้นแดงอ่านออก (${btnContrast.toFixed(2)}:1)`, btnContrast >= 4.5);

console.log('\n— ข้อความสรุปและการนับเลข —');
// วลีของบางมิติมีคำว่า "และ" อยู่ในตัวเอง ถ้าเอามาต่อด้วย "และ" อีกจะได้
// "พร้อมขยายและผู้นำและทีมพร้อม" ซึ่งอ่านสะดุด ไล่ทุกคู่ของมิติที่เป็นไปได้
const doubled = await page.evaluate(() => {
  const keys = Object.keys(DIM_PHRASE);
  const bad = [];
  for (const a of keys) for (const b of keys) {
    if (a === b) continue;
    const sc = {}; keys.forEach((k) => { sc[k] = 20; });
    sc[a] = 95; sc[b] = 90;
    const tot = Math.round(keys.reduce((n, k) => n + sc[k], 0) / keys.length);
    const h = diagnose(sc, tot).headline.replace(/<[^>]+>/g, '');
    if (/และ[^\s·]*และ/.test(h)) bad.push(`${a}+${b}: ${h}`);
  }
  const all = {}; keys.forEach((k) => { all[k] = 90; });
  const h2 = diagnose(all, 90).headline.replace(/<[^>]+>/g, '');
  if (/และ[^\s·]*และ/.test(h2)) bad.push(`แข็งแรงรอบด้าน: ${h2}`);
  return bad;
});
t('ไม่มีคำว่า "และ" ซ้อนกันในบทสรุป ไม่ว่าคะแนนจะออกมาแบบไหน',
  doubled.length === 0, doubled.slice(0, 2).join(' | '));

// ของเดิมผูกความเร็วไว้กับจำนวนครั้งที่ setInterval ถูกเรียก พอหน้ารายงานวาด
// เนื้อหาหนัก ๆ พร้อมกัน เบราว์เซอร์หน่วง เลขเลยไต่ช้าเป็นหลายวินาที
const timing = await page.evaluate(() => new Promise((res) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const t0 = performance.now();
  countTo(el, 71);
  let at300 = null;
  setTimeout(() => { at300 = Number(el.textContent); }, 300);
  const iv = setInterval(() => {
    if (el.textContent === '71') { clearInterval(iv); el.remove(); res({ ms: performance.now() - t0, at300 }); }
  }, 10);
  setTimeout(() => { clearInterval(iv); el.remove(); res({ ms: 9999, at300 }); }, 4000);
}));
t(`นับเลขจบภายใน 1.5 วินาที (${Math.round(timing.ms)}ms)`, timing.ms <= 1500, `${Math.round(timing.ms)}ms`);
t(`ผ่านไป 300ms ต้องเข้าใกล้ค่าจริงแล้ว (${timing.at300}/71)`, timing.at300 >= 40, timing.at300);

const reduced = await page.evaluate(() => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const real = window.matchMedia;
  window.matchMedia = () => ({ matches: true });
  countTo(el, 71);
  window.matchMedia = real;
  const v = el.textContent; el.remove(); return v;
});
t('คนที่ปิดภาพเคลื่อนไหวเห็นเลขจริงทันที', reduced === '71', reduced);

console.log('\n— โฟกัสคีย์บอร์ด —');
// หน้าจอที่ยังไม่ถึงถูกซ่อนด้วย display:none ทั้งบล็อก ปุ่มข้างในจึงไม่อยู่ใน
// ลำดับ Tab และไม่ถูกอ่านโดย screen reader ชุดนี้ล็อกคุณสมบัตินั้นไว้ เผื่อวันหนึ่ง
// มีคนเปลี่ยนวิธีซ่อนหน้าจอเป็น opacity หรือ visibility ซึ่งยังโฟกัสได้
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
const reachable = await page.evaluate(() => {
  const bad = [];
  for (const b of document.querySelectorAll('button, a[href], input, select, textarea')) {
    const sc = b.closest('.screen');
    if (!sc || sc.classList.contains('active')) continue;
    b.focus();
    if (document.activeElement === b) bad.push((b.textContent || b.id || b.tagName).trim().slice(0, 24));
  }
  return bad;
});
t('ปุ่มบนหน้าจอที่ยังไม่ถึง โฟกัสไม่ได้', reachable.length === 0, reachable.slice(0, 4).join(', '));

console.log(`\n${pass} passed, ${failn} failed`);
await browser.close();
process.exit(failn ? 1 : 0);

// แผน 90 วันต้องเฉพาะเจาะจงกับร้านที่ตอบ ไม่ใช่ข้อความสำเร็จรูปที่ทุกคนได้เหมือนกัน
//
// สามอย่างที่ชุดนี้กันไว้:
//   1. แผนต้องอ้างกลับไปที่คำตอบของเขาเอง (ไม่ใช่บอกลอย ๆ ว่าให้ไปทำอะไร)
//   2. คนละสาเหตุต้องได้คนละแผน แม้คะแนนจะเท่ากันเป๊ะ — เดิมได้แผนเดียวกัน
//      เพราะโค้ดเก่าอ่านแค่ช่วงคะแนน ไม่เคยอ่านสาเหตุที่เขาระบุเลย
//   3. คำแนะนำที่ไม่เกี่ยวกับร้านเขาต้องไม่โผล่ (เรื่องหลายสาขากับร้านสาขาเดียว
//      ที่ไม่ได้คิดขยาย / เรื่องเดลิเวอรี่กับร้านที่ไม่มีเดลิเวอรี่)
//
// ชุดนี้ยิงเข้าไปที่ตัวคิดแผนโดยตรงด้วยคำตอบสังเคราะห์ จึงเร็วและได้ผลเดิมทุกครั้ง
// ไม่ต้องเดินตอบ 48 ข้อผ่านหน้าจอเหมือนชุด ui-assessment
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
let pass = 0, failed = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (x ? ' — ' + x : ''))); };

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });

// ตัวช่วยฝั่งหน้าเว็บ: สร้างคำตอบทั้งชุดจาก "เลือกตัวเลือกลำดับที่ pick" และ
// "เลือกสาเหตุย่อยลำดับที่ subPick" แล้วคืนแผนที่ได้
await page.evaluate(() => {
  window.__plan = (pick, subPick, fin, reg) => {
    state.reg = Object.assign({ shop: 'x', name: 'y', branch: '1 สาขา',
      type: 'อาหารตามสั่ง / à la carte ทั่วไป' }, reg || {});
    state.costProfile = profileFromRegType(state.reg.type);
    state.answers = Array(QUESTIONS.length).fill(null);
    QUESTIONS.forEach((q, i) => {
      if (q.type === 'profile') {
        const oi = q.o.findIndex((o) => o.pk === state.costProfile);
        state.answers[i] = { oi: oi < 0 ? 0 : oi, profile: state.costProfile };
        return;
      }
      const oi = Math.min(pick, q.o.length - 1);
      const o = q.o[oi];
      const a = { oi, v: o.v == null ? 3 : o.v };
      if (o.sub && o.sub.o.length) a.sub = o.sub.o[Math.min(subPick, o.sub.o.length - 1)].tag;
      state.answers[i] = a;
    });
    state.fin = fin || null;
    const sc = {}; DIMS.forEach((d) => { sc[d.key] = dimScore(d.key); });
    const total = Math.round(DIMS.reduce((a, d) => a + sc[d.key], 0) / DIMS.length);
    state.result = { sc, total };
    state.focusRec = [...DIMS].map((d) => ({ k: d.key, v: sc[d.key] })).sort((a, b) => a.v - b.v)[0].k;
    state.focus = state.focusRec;
    return { total, scores: sc, items: buildPlanItems(state.focus) };
  };
  window.__fin = (rev, cogs, labor, rent) =>
    ({ revenue: rev, cogs, labor, rent, other: rev * 0.1, covers: 80, avgBill: 250, days: 26 });
});

console.log('\n— แผนอ้างกลับไปที่คำตอบของเขาเอง —');
const A = await page.evaluate(() => window.__plan(4, 0, window.__fin(500000, 220000, 130000, 70000)));
t('แผนมีครบ 5 ด้าน', A.items.length === 5, `มี ${A.items.length}`);
t('ทุกด้านมีบรรทัดบอกว่าแผนนี้มาจากไหน',
  A.items.every((x) => x.because && x.because.length > 10),
  JSON.stringify(A.items.map((x) => x.because)));
t('บรรทัดนั้นยกคำตอบจริงของเขามาอ้าง',
  A.items.every((x) => /คุณตอบว่า/.test(x.because)),
  JSON.stringify(A.items.map((x) => x.because)));
t('ทุกด้านมีตัววัดผลเมื่อจบเฟส', A.items.every((x) => x.result && x.result.length > 10));
t('ทุกด้านมีงานรายสัปดาห์อย่างน้อย 2 ขั้น',
  A.items.every((x) => (x.how || []).length >= 2),
  JSON.stringify(A.items.map((x) => (x.how || []).length)));

console.log('\n— คนละสาเหตุ ต้องได้คนละแผน —');
const B = await page.evaluate(() => window.__plan(4, 2, window.__fin(500000, 220000, 130000, 70000)));
t('สองชุดนี้คะแนนเท่ากันเป๊ะ', A.total === B.total && JSON.stringify(A.scores) === JSON.stringify(B.scores),
  `${A.total} vs ${B.total}`);
const heads = (r) => r.items.map((x) => x.what);
const steps = (r) => r.items.flatMap((x) => x.how || []);
const overlap = (x, y) => { const s = new Set(y); return x.filter((v) => s.has(v)).length / Math.max(x.length, 1); };
// นี่คือหัวใจของการแก้: เดิมโค้ดอ่านแค่ช่วงคะแนน คะแนนเท่ากัน = แผนเหมือนกัน 100%
t('คะแนนเท่ากันแต่ระบุคนละสาเหตุ → หัวข้อแผนไม่ซ้ำกันเลย',
  overlap(heads(A), heads(B)) === 0,
  `ซ้ำกัน ${Math.round(overlap(heads(A), heads(B)) * 100)}% · A=${heads(A).join(' / ')} · B=${heads(B).join(' / ')}`);
t('งานรายสัปดาห์ก็ไม่ซ้ำกัน',
  overlap(steps(A), steps(B)) === 0,
  `ซ้ำกัน ${Math.round(overlap(steps(A), steps(B)) * 100)}%`);
t('ทั้งสองชุดเลือกแผนจากสาเหตุที่ระบุ ไม่ใช่จากช่วงคะแนน',
  A.items.every((x) => x.source === 'cause') && B.items.every((x) => x.source === 'cause'),
  JSON.stringify([A.items.map((x) => x.source), B.items.map((x) => x.source)]));

console.log('\n— ร้านที่แข็งได้แผนต่อยอด ไม่ใช่แผนแก้จุดอ่อน —');
const C = await page.evaluate(() => window.__plan(1, 0, window.__fin(1500000, 450000, 270000, 150000), { branch: '4-10 สาขา' }));
t('ร้านคะแนนสูงได้คนละแผนกับร้านคะแนนต่ำ', overlap(heads(A), heads(C)) === 0,
  `ซ้ำกัน ${Math.round(overlap(heads(A), heads(C)) * 100)}%`);
t('ด้านที่ได้ 62+ ใช้แผนต่อยอดจุดแข็ง ไม่ใช่แผนแก้จุดอ่อน',
  C.items.some((x) => x.source === 'strength'), JSON.stringify(C.items.map((x) => x.source)));
t('ร้านคะแนนต่ำไม่ได้แผนต่อยอดจุดแข็ง',
  A.items.every((x) => x.source !== 'strength'), JSON.stringify(A.items.map((x) => x.source)));

console.log('\n— ตัวเลขจริงของร้านต่อท้ายตัววัดผล —');
const money = A.items.filter((x) => /เป้าเป็นตัวเงิน/.test(x.result));
t('มีอย่างน้อยหนึ่งด้านที่ตั้งเป้าเป็นเงินบาท', money.length >= 1,
  JSON.stringify(A.items.map((x) => x.result)));
t('ตัวเลขนั้นเป็นจำนวนเงินจริง ไม่ใช่ช่องว่าง',
  money.every((x) => /฿[\d,]+/.test(x.result)), JSON.stringify(money.map((x) => x.result)));
// เป้าเป็นตัวเงินต้องผูกกับด้านที่แผนพูดถึงเงินจริง ๆ ไม่ใช่แปะมั่ว
t('เป้าเป็นตัวเงินไม่ไปโผล่ในด้านที่ไม่เกี่ยวกับเงิน',
  money.every((x) => x.dim.includes('การเงิน') || /ต้นทุน|กำไร|ค่าแรง|คุ้มทุน|ยอด/.test(x.what)),
  JSON.stringify(money.map((x) => `${x.dim}: ${x.what}`)));
const noFin = await page.evaluate(() => window.__plan(4, 0, null));
t('ร้านที่ข้ามการกรอกการเงิน ไม่มีเป้าเป็นตัวเงินโผล่มามั่ว ๆ',
  noFin.items.every((x) => !/เป้าเป็นตัวเงิน/.test(x.result)));

console.log('\n— ตัดคำแนะนำที่ไม่เกี่ยวกับร้านเขา —');
const rel = await page.evaluate(() => {
  const probe = (branch, expandTag, delivery) => {
    state.reg = { branch };
    state.answers = Array(QUESTIONS.length).fill(null);
    if (expandTag) {
      const qi = QUESTIONS.findIndex((q) => (q.o || []).some((o) => o.sub && o.sub.o.some((x) => x.tag === expandTag)));
      const oi = QUESTIONS[qi].o.findIndex((o) => o.sub && o.sub.o.some((x) => x.tag === expandTag));
      state.answers[qi] = { oi, v: 2, sub: expandTag };
    }
    const di = QUESTIONS.findIndex((q) => q.q.includes('กำไรสุทธิต่อช่องทาง'));
    if (di >= 0) state.answers[di] = { oi: delivery ? 1 : 4, v: 3 };
    return {
      branches: branchCount(), expand: wantsExpand(), delivery: hasDelivery(),
      branchStep: relevant('วางระบบ QC ข้ามสาขา'),
      franchiseStep: relevant('ทำ playbook สาขาให้ครบ'),
      deliveryStep: relevant('คุมเมนู/ราคาเดลิเวอรี่ให้ยังเหลือกำไร'),
      neutralStep: relevant('ตั้ง KPI + รีวิวรายสัปดาห์'),
      pruned: pruneSteps(['ทำ playbook สาขาให้ครบ', 'วางระบบ QC ข้ามสาขา', 'เทรนทีมหัวกะทิเป็นผู้ฝึกสอน', 'ตั้ง KPI รายสัปดาห์']),
      prunedThin: pruneSteps(['ทำ playbook สาขาให้ครบ', 'วางระบบ QC ข้ามสาขา', 'เทรนทีมหัวกะทิเป็นผู้ฝึกสอน']),
    };
  };
  return {
    solo: probe('1 สาขา', null, false),
    soloWantsToGrow: probe('1 สาขา', 'exp_branch', false),
    multi: probe('4-10 สาขา', null, true),
  };
});
t('ร้านสาขาเดียวที่ไม่ได้คิดขยาย ไม่ถูกสั่งให้วางระบบข้ามสาขา', rel.solo.branchStep === false);
t('ร้านสาขาเดียวที่ไม่ได้คิดขยาย ไม่ถูกสั่งให้ทำ playbook สาขา', rel.solo.franchiseStep === false);
t('ร้านที่ไม่มีเดลิเวอรี่ ไม่ถูกสั่งเรื่องเดลิเวอรี่', rel.solo.deliveryStep === false);
t('คำแนะนำทั่วไปไม่โดนตัดไปด้วย', rel.solo.neutralStep === true);
t('ร้านสาขาเดียวแต่คิดจะขยาย ยังได้คำแนะนำเรื่องสาขา',
  rel.soloWantsToGrow.branchStep === true && rel.soloWantsToGrow.franchiseStep === true);
t('ร้านหลายสาขาได้ครบทุกคำแนะนำ',
  rel.multi.branchStep && rel.multi.franchiseStep && rel.multi.deliveryStep);
t('ตัดขั้นตอนที่ไม่เกี่ยวออกจริง', rel.solo.pruned.length === 2, JSON.stringify(rel.solo.pruned));
// ตัดจนเหลือขั้นเดียวคือแผนกลวง ยอมปล่อยไว้ทั้งชุดดีกว่า
t('ถ้าตัดแล้วเหลือน้อยกว่า 2 ขั้น ให้คงของเดิมไว้ ไม่ปล่อยแผนกลวง',
  rel.solo.prunedThin.length === 3, JSON.stringify(rel.solo.prunedThin));

console.log('\n— ไม่มี JavaScript error —');
t('ไม่มี error หลุดออกมา', errs.length === 0, errs.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

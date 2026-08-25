import { ACCESS_CODE } from './access.mjs';
// รองรับคนเข้าพร้อมกันได้จริงไหม
//
// เน็ตมือถือไทย (AIS/True/dtac) ใช้ CGNAT — ผู้ใช้หลายร้อยคนออกเน็ตด้วย IP
// สาธารณะเดียวกัน โควตาต่อ IP ที่ตั้งไว้สำหรับ "หนึ่งเครื่อง" จึงกลายเป็นการ
// กันคนทั้งค่ายมือถือออกไป
//
// ตอนตั้งไว้ 60/ชม. ยิง 40 คนจาก IP เดียวกันแล้วหลุดไป 9 คน สมัครบัญชีหลุด 24 คน
// และคนที่หลุดจะ "เห็นรายงานครบปกติ" (เพราะคำนวณในเครื่องเขา) แต่ลีดไม่ถึง
// เซิร์ฟเวอร์ ไม่มีอีเมลสรุปผล และกดปุ่มขอให้ติดต่อกลับแล้วขึ้นว่าไม่พบผลประเมิน
// — พังแบบไม่มีใครรู้ ทั้งเขาและทีมขาย
//
// ชุดนี้กันไม่ให้ใครเผลอลดโควตาต่อ IP กลับลงไป และยืนยันว่าโควตาต่ออีเมล
// ซึ่งเป็นตัวกันสแปมจริง ๆ ยังแน่นเหมือนเดิม
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
let pass = 0, failed = 0;
const t = (n, c, x = '') => { c ? (pass++, console.log('  ok   ' + n)) : (failed++, console.log('  FAIL ' + n + (x ? ' — ' + x : ''))); };

// ยิงเป็นชุดละไม่กี่คำขอ ไม่ใช่รัวทีเดียวหมด — ที่ทดสอบคือ "โควตากันคนออกไหม"
// ไม่ใช่ความเร็วของเซิร์ฟเวอร์ และ wrangler ที่รันในเครื่องเป็น worker ตัวเดียว
// ต่างจากของจริงบน Cloudflare ที่กระจายไปหลายเครื่อง ยิงรัวเกินไปจะวัดข้อจำกัด
// ของเครื่องทดสอบแทนที่จะวัดโควตา
const pool = async (items, size, fn) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  }
  return out;
};

const post = (path, body, ip) => fetch(BASE + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE, 'CF-Connecting-IP': ip },
  body: JSON.stringify(path.startsWith('/api/assessments') ? { accessCode: ACCESS_CODE, ...body } : body),
});
// ทุกบล็อกใช้ IP ของตัวเอง จะได้ไม่กินโควตากันเอง
const ip = (tag) => `198.51.100.${tag}`;

console.log('\n— 60 คนจาก IP เดียวกัน ทำแบบประเมินพร้อมกัน —');
{
  const IP = ip(11);
  const N = 60;
  const t0 = Date.now();
  const results = await pool([...Array(N).keys()], 6, async (i) => {
    const sid = `cap-${Date.now()}-${i}`;
    // คนหนึ่งคนบันทึกสองครั้ง: ตอนกรอกข้อมูลร้าน และตอนทำจบ
    const a = await post('/api/assessments', { sessionKey: sid, name: 'x', shop: 'ร้าน' + i,
      contact: '0800000000', province: 'ตราด', mode: 'deep', consent: true }, IP);
    const b = await post('/api/assessments', { sessionKey: sid, completed: true, total: 60,
      tier: 'WARM', scores: { D1: 60, D2: 60, D3: 60, D4: 60, D5: 60 } }, IP);
    return a.status === 200 && b.status === 200;
  });
  const ok = results.filter(Boolean).length;
  t(`ผ่านครบทั้ง ${N} คน ไม่มีใครโดนบล็อก`, ok === N, `ผ่าน ${ok}/${N}`);
  t('ไม่ช้าจนผิดปกติ', Date.now() - t0 < 60000, `${Date.now() - t0}ms`);
}

console.log('\n— 25 คนจาก IP เดียวกัน สมัครบัญชีพร้อมกัน —');
{
  const IP = ip(12);
  // ตั้งไว้ 25 คน — เกินโควตาเดิม (10/ชม.) ชัดเจน แต่ไม่หนักเครื่องทดสอบเกินไป
  // เพราะแฮชรหัสผ่าน 200,000 รอบกินซีพียูมาก (ยิง 50 คนพร้อมกันในเครื่องเดียว
  // ใช้เวลาคนละ 5 วินาที — บนของจริง Cloudflare กระจายไปหลายเครื่องให้)
  const N = 25;
  const results = await pool([...Array(N).keys()], 4, (i) =>
    post('/api/auth/signup', { email: `cap${Date.now()}x${i}@example.com`, password: 'capacity-test-2026' }, IP)
      .then((r) => r.status));
  const ok = results.filter((s) => s === 200).length;
  const blocked = results.filter((s) => s === 429).length;
  t(`สมัครผ่านครบทั้ง ${N} คน`, ok === N, `ผ่าน ${ok} · โดนบล็อก ${blocked}`);
}

console.log('\n— 40 คนจาก IP เดียวกัน กดขอให้ติดต่อกลับพร้อมกัน —');
{
  const IP = ip(13);
  const N = 40;
  const results = await pool([...Array(N).keys()], 6, async (i) => {
    const sid = `capc-${Date.now()}-${i}`;
    await post('/api/assessments', { sessionKey: sid, shop: 'c' + i, contact: '0800000000',
      completed: true, total: 70, tier: 'HOT' }, IP);
    return (await post('/api/contact-request', { sessionKey: sid }, IP)).status;
  });
  const ok = results.filter((s) => s === 200).length;
  t(`กดผ่านครบทั้ง ${N} คน`, ok === N, `ผ่าน ${ok} · อื่น ๆ ${results.filter((s) => s !== 200).join(',')}`);
}

console.log('\n— โควตาต่ออีเมลต้องยังแน่นเหมือนเดิม —');
{
  // นี่คือตัวที่กันคนเอาอีเมลคนอื่นมาสแปม และกันเดารหัสผ่าน ห้ามคลายเด็ดขาด
  const victim = `victim${Date.now()}@example.com`;
  const codes = [];
  for (let i = 0; i < 6; i++) {
    // สลับ IP ทุกครั้ง เพื่อพิสูจน์ว่าโดนกันด้วยอีเมล ไม่ใช่ด้วย IP
    codes.push((await post('/api/auth/forgot', { email: victim }, ip(20 + i))).status);
  }
  t('ขอลิงก์ลืมรหัสด้วยอีเมลเดียวกันรัว ๆ ถูกกัน แม้จะเปลี่ยน IP',
    codes.includes(429), codes.join(','));

  const target = `grind${Date.now()}@example.com`;
  await post('/api/auth/signup', { email: target, password: 'real-password-2026' }, ip(30));
  const tries = [];
  for (let i = 0; i < 12; i++) {
    tries.push((await post('/api/auth/login', { email: target, password: 'wrong' + i }, ip(31 + i))).status);
  }
  t('เดารหัสผ่านของอีเมลเดียวรัว ๆ ถูกกัน แม้จะเปลี่ยน IP',
    tries.includes(429), tries.join(','));
}

console.log('\n— รหัสหลังบ้านต้องยังกันแน่นที่สุด —');
{
  const IP = ip(60);
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push((await post('/api/admin/login', { password: 'guess' + i }, IP)).status);
  }
  t('เดารหัสหลังบ้านเกิน 8 ครั้งถูกกัน', codes.includes(429), codes.join(','));
}

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

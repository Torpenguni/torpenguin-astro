// ประตูรหัสเข้าใช้งาน
//
// CP แจกโค้ดเดียวให้ร้านที่เขาเชิญมา ใครไม่มีโค้ดก็เปิดหน้าเว็บอ่านได้ แต่เริ่ม
// ทำแบบประเมินไม่ได้ เช็คฝั่งเบราว์เซอร์อย่างเดียวไม่นับเป็นประตู เพราะใครก็
// เปิดเครื่องมือนักพัฒนาแล้วข้ามได้ ตัวจริงจึงอยู่ที่ฝั่งเซิร์ฟเวอร์ตอนบันทึกผล
//
// ค่าโค้ดอ่านจาก env.ACCESS_CODE ตั้งได้จากหน้า Cloudflare โดยไม่ต้องแก้โค้ด
// (เปลี่ยนโค้ดกลางแคมเปญได้) ใส่ได้หลายค่าโดยคั่นด้วยจุลภาค และถ้าตั้งเป็น
// ค่าว่าง = ปิดประตูทิ้ง ทุกคนเข้าได้เหมือนเดิม
export const DEFAULT_ACCESS_CODE = 'CPRESTECH2026';

// คนพิมพ์โค้ดจากกระดาษหรือจากไลน์ จะติดช่องว่าง ขีด หรือพิมพ์เล็กมาด้วยเสมอ
// ปฏิเสธเพราะเรื่องพวกนี้คือด่านที่กันลูกค้าจริง ไม่ได้กันคนแปลกหน้า
export function normalizeCode(value) {
  return String(value == null ? '' : value).toUpperCase().replace(/[\s-]+/g, '').slice(0, 60);
}

export function accessCodes(env) {
  const raw = env && env.ACCESS_CODE !== undefined ? env.ACCESS_CODE : DEFAULT_ACCESS_CODE;
  return String(raw || '').split(',').map(normalizeCode).filter(Boolean);
}

export function gateEnabled(env) {
  return accessCodes(env).length > 0;
}

// คืนโค้ดตัวจริงที่ตรงกัน (ไม่ใช่ค่าที่ผู้ใช้พิมพ์) เพื่อเก็บลงฐานข้อมูลให้เป็น
// รูปแบบเดียวกันทุกแถว ถ้าไม่ตรงคืน null
export function matchCode(env, value) {
  const codes = accessCodes(env);
  if (!codes.length) return null;
  const given = normalizeCode(value);
  if (!given) return null;
  return codes.find((c) => c === given) || null;
}

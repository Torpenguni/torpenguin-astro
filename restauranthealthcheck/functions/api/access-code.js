import { fail, json, sameOrigin } from '../../lib/http.js';
import { gateEnabled, matchCode } from '../../lib/accesscode.js';
import { guard } from '../../lib/ratelimit.js';

// เบราว์เซอร์จำโค้ดที่ถูกไว้กี่วัน — นานพอให้คนทำค้างแล้วกลับมาต่อโดยไม่ต้อง
// ตามหาโค้ดใหม่ แต่ไม่ใช่ตลอดไป
export const REMEMBER_DAYS = 30;

// หน้าเว็บถามก่อนว่า "ยังต้องใช้โค้ดอยู่ไหม" ถ้าทีมปิดประตูจากหน้า Cloudflare
// ช่องกรอกโค้ดต้องหายไปด้วย ไม่ใช่ค้างอยู่แล้วไม่มีโค้ดไหนผ่าน
export function onRequestGet({ env }) {
  return json({ ok: true, required: gateEnabled(env), days: REMEMBER_DAYS });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  let body = null;
  try {
    body = await request.json();
  } catch {
    return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);
  }

  if (!gateEnabled(env)) return json({ ok: true, code: null, days: REMEMBER_DAYS });

  const matched = matchCode(env, body && body.code);
  if (matched) return json({ ok: true, code: matched, days: REMEMBER_DAYS });

  // นับเฉพาะครั้งที่กรอกผิด คนที่กรอกถูกตั้งแต่แรกจึงไม่มีวันโดนกั้น และเผื่อไว้
  // เยอะเพราะเน็ตมือถือไทยเอาคนหลายร้อยคนมาอยู่หลังไอพีเดียวกัน
  const limited = await guard(env.DB, request, 'accesscode', null, { ip: [120, 3600] });
  if (limited) return limited;

  return fail('รหัสไม่ถูกต้อง กรุณาตรวจสอบรหัสที่ได้รับอีกครั้ง', 403, 'bad_code');
}

import { fail, json, now, readJson, sameOrigin } from '../../lib/http.js';
import { guard } from '../../lib/ratelimit.js';

// รับคำขอ "ให้ทีม CP ติดต่อกลับ" จากท้ายรายงาน
//
// ไม่ถามอะไรเพิ่มเลยสักช่อง เพราะตอนนี้เรามีชื่อ เบอร์ อีเมล และผลประเมินของเขา
// ครบอยู่แล้ว หน้าที่ของ endpoint นี้คือติดธงลงบนแถวเดิม ไม่ใช่สร้างลีดใหม่
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  const sessionKey = body && typeof body.sessionKey === 'string' ? body.sessionKey.slice(0, 100) : '';
  if (!sessionKey) return fail('ไม่ได้ระบุว่าเป็นผลประเมินของใคร', 400);

  const db = env.DB;
  const limited = await guard(db, request, 'contactreq', null, { ip: [20, 3600] });
  if (limited) return limited;

  // เขียนเฉพาะตอนที่ยังไม่เคยกด กดซ้ำจะไม่ทับเวลาเดิม ทีมขายจะได้เห็นเวลาที่เขา
  // ตัดสินใจจริง ๆ ไม่ใช่เวลาที่เขาเผลอกดปุ่มซ้ำ
  const ts = now();
  const r = await db
    .prepare('UPDATE assessments SET contact_requested_at = ?, updated_at = ? WHERE session_key = ? AND contact_requested_at IS NULL')
    .bind(ts, ts, sessionKey)
    .run();

  if (((r.meta && r.meta.changes) || 0) > 0) return json({ ok: true, recorded: true });

  // ไม่มีแถวถูกแก้ = เคยกดไปแล้ว หรือยังไม่มีลีดแถวนี้ในระบบ แยกสองกรณีให้ชัด
  // เพราะกรณีหลังแปลว่าคำขอจะหายไปเงียบ ๆ ถ้าตอบ ok กลับไปเฉย ๆ
  const row = await db
    .prepare('SELECT contact_requested_at FROM assessments WHERE session_key = ?')
    .bind(sessionKey)
    .first();

  if (row) return json({ ok: true, recorded: true, already: true });
  return fail('ยังไม่พบผลประเมินนี้ในระบบ กรุณาลองใหม่อีกครั้ง', 404);
}

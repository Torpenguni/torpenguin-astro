import { fail, json } from '../../lib/http.js';
import { getUser } from '../../lib/session.js';

const parse = (v) => { if (!v) return null; try { return JSON.parse(v); } catch { return null; } };

// One stored assessment, in full — everything the browser needs to redraw the
// report exactly as it looked the day it was made. The listing endpoint stays
// lean on purpose; this is the one you call when someone opens a past result.
//
// Only the owner may read it. Rows made before the account existed are matched
// by email too, the same rule the listing uses, so a run finished at the booth
// still shows up once the person signs up with that address.
export async function onRequestGet({ request, env }) {
  const user = await getUser(env.DB, request);
  if (!user) return fail('กรุณาเข้าสู่ระบบ', 401, 'unauthenticated');

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('ไม่ได้ระบุว่าจะดูรายการไหน', 400);

  const r = await env.DB
    .prepare(
      `SELECT * FROM assessments
       WHERE id = ? AND (user_id = ? OR (email IS NOT NULL AND email = ?))`,
    )
    .bind(id, user.id, user.email)
    .first();

  // ไม่พบกับไม่ใช่ของเรา ตอบเหมือนกัน จะได้ไม่บอกใบ้ว่ามี id นี้อยู่จริงไหม
  if (!r) return fail('ไม่พบผลประเมินนี้ในบัญชีของคุณ', 404);

  return json({
    ok: true,
    assessment: {
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      shop: r.shop,
      contact: r.contact,
      email: r.email,
      shopType: r.shop_type,
      branches: r.branches,
      age: r.age,
      province: r.province,
      mode: r.mode,
      completed: !!r.completed,
      total: r.total_score,
      typeCode: r.type_code,
      typeName: r.type_name,
      tier: r.tier,
      scores: parse(r.scores_json),
      answers: parse(r.answers_json),
      financial: parse(r.financial_json),
      report: parse(r.report_json),
      // ใช้วาดรายงานฉบับเดิมขึ้นมาใหม่ทั้งหน้า
      snapshot: parse(r.state_json),
      // ให้ปุ่ม "ให้ทีม CP ติดต่อกลับ" ในรายงานที่เปิดย้อนหลังยังกดได้
      // ปุ่มนั้นอ้างถึงแถวนี้ด้วย session key และแถวนี้เป็นของผู้ใช้คนที่ขอมาอยู่แล้ว
      sessionKey: r.session_key,
      contactRequested: !!r.contact_requested_at,
    },
  });
}

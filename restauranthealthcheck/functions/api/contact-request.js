import { fail, json, now, readJson, sameOrigin, siteUrl } from '../../lib/http.js';
import { sendLeadAlertEmail } from '../../lib/email.js';
import { guard } from '../../lib/ratelimit.js';

// ปลายทางแจ้งเตือนทีมขาย ตั้งทับได้ด้วยตัวแปร LEAD_ALERT_TO ใน Cloudflare
// โดยไม่ต้องแก้โค้ด ตั้งเป็นค่าว่างเพื่อปิดการแจ้งเตือน
const DEFAULT_ALERT_TO = 'tor@penguinx.co';

// รับคำขอ "ให้ทีม CP ติดต่อกลับ" จากท้ายรายงาน
//
// ไม่ถามอะไรเพิ่มเลยสักช่อง เพราะตอนนี้เรามีชื่อ เบอร์ อีเมล และผลประเมินของเขา
// ครบอยู่แล้ว หน้าที่ของ endpoint นี้คือติดธงลงบนแถวเดิม ไม่ใช่สร้างลีดใหม่
export async function onRequestPost({ request, env, waitUntil }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request);
  const sessionKey = body && typeof body.sessionKey === 'string' ? body.sessionKey.slice(0, 100) : '';
  if (!sessionKey) return fail('ไม่ได้ระบุว่าเป็นผลประเมินของใคร', 400);

  const db = env.DB;
  const limited = await guard(db, request, 'contactreq', null, { ip: [200, 3600] });
  if (limited) return limited;

  // เขียนเฉพาะตอนที่ยังไม่เคยกด กดซ้ำจะไม่ทับเวลาเดิม ทีมขายจะได้เห็นเวลาที่เขา
  // ตัดสินใจจริง ๆ ไม่ใช่เวลาที่เขาเผลอกดปุ่มซ้ำ
  const ts = now();
  const r = await db
    .prepare('UPDATE assessments SET contact_requested_at = ?, updated_at = ? WHERE session_key = ? AND contact_requested_at IS NULL')
    .bind(ts, ts, sessionKey)
    .run();

  if (((r.meta && r.meta.changes) || 0) > 0) {
    // เพิ่งติดธงสำเร็จ = เป็นการกดครั้งแรกจริง ๆ จึงแจ้งทีมตรงนี้ที่เดียว
    // กดซ้ำจะไม่เข้ามาถึงบรรทัดนี้ ทีมจึงไม่โดนเมลซ้ำ
    const alertTo = env.LEAD_ALERT_TO === undefined ? DEFAULT_ALERT_TO : env.LEAD_ALERT_TO;
    if (alertTo) {
      const send = alertLead(env, db, sessionKey, alertTo, siteUrl(env, request), ts);
      // ส่งเมลหลังตอบกลับไปแล้ว ผู้ใช้จะได้ไม่ต้องนั่งรอผู้ให้บริการอีเมล
      // (ซึ่งตั้ง timeout ไว้ 10 วินาที) ธงถูกบันทึกไปแล้ว ลีดจึงไม่หายแน่นอน
      // ต่อให้เมลส่งไม่ออก
      if (typeof waitUntil === 'function') waitUntil(send);
      else await send;
    }
    return json({ ok: true, recorded: true });
  }

  // ไม่มีแถวถูกแก้ = เคยกดไปแล้ว หรือยังไม่มีลีดแถวนี้ในระบบ แยกสองกรณีให้ชัด
  // เพราะกรณีหลังแปลว่าคำขอจะหายไปเงียบ ๆ ถ้าตอบ ok กลับไปเฉย ๆ
  const row = await db
    .prepare('SELECT contact_requested_at FROM assessments WHERE session_key = ?')
    .bind(sessionKey)
    .first();

  if (row) return json({ ok: true, recorded: true, already: true });
  return fail('ยังไม่พบผลประเมินนี้ในระบบ กรุณาลองใหม่อีกครั้ง', 404);
}

// ดึงข้อมูลลีดเท่าที่ทีมขายต้องใช้ก่อนหยิบโทรศัพท์ แล้วส่งอีเมลแจ้ง
// ห้าม throw ออกไปเด็ดขาด — ตัวเรียกอยู่ใน waitUntil ถ้าพังจะไม่มีใครเห็น
// นอกจาก log และที่สำคัญคือมันต้องไม่กระทบคำตอบที่ส่งให้ผู้ใช้ไปแล้ว
async function alertLead(env, db, sessionKey, to, site, ts) {
  try {
    const r = await db
      .prepare(`SELECT id, name, shop, contact, email, province, shop_type, branches,
                       total_score, type_name, tier, scores_json, financial_json
                FROM assessments WHERE session_key = ?`)
      .bind(sessionKey)
      .first();
    if (!r) return;
    const parse = (v) => { if (!v) return null; try { return JSON.parse(v); } catch { return null; } };
    const sent = await sendLeadAlertEmail(env, to, {
      name: r.name, shop: r.shop, contact: r.contact, email: r.email,
      province: r.province, shopType: r.shop_type, branches: r.branches,
      total: r.total_score, typeName: r.type_name, tier: r.tier,
      scores: parse(r.scores_json), financial: parse(r.financial_json),
      askedAt: new Date(ts * 1000).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      adminUrl: `${site}/admin?lead=${encodeURIComponent(r.id)}`,
    });
    if (!sent.ok) console.error('[contact-request] แจ้งทีมทางอีเมลไม่สำเร็จ · ลีด', r.id);
  } catch (e) {
    console.error('[contact-request] แจ้งทีมทางอีเมลไม่สำเร็จ:', e && e.message ? e.message : e);
  }
}

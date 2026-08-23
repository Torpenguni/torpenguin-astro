import { isAdmin } from '../../../lib/admin.js';
import { fail, json } from '../../../lib/http.js';

// Everything stored about one assessment — what the team needs in hand before
// picking up the phone. The list endpoint deliberately does not carry this;
// it would multiply the payload of a 50-row page for data nobody reads until
// they open a single lead.
export async function onRequestGet({ request, env }) {
  const db = env.DB;
  if (!(await isAdmin(db, request))) return fail('กรุณาเข้าสู่ระบบผู้ดูแล', 401, 'unauthenticated');

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('ไม่ได้ระบุว่าจะดูรายการไหน', 400);

  const r = await db
    .prepare(
      `SELECT a.*, u.email AS account_email, u.created_at AS account_created_at,
              u.email_verified_at AS account_verified_at
       FROM assessments a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = ?`,
    )
    .bind(id)
    .first();

  if (!r) return fail('ไม่พบรายการนี้', 404);

  const parse = (v) => {
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  };

  return json({
    ok: true,
    lead: {
      id: r.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      name: r.name,
      shop: r.shop,
      contact: r.contact,
      email: r.email,
      shopType: r.shop_type,
      province: r.province,
      branches: r.branches,
      age: r.age,
      mode: r.mode,
      completed: !!r.completed,
      total: r.total_score,
      typeCode: r.type_code,
      typeName: r.type_name,
      tier: r.tier,
      scores: parse(r.scores_json),
      answers: parse(r.answers_json),
      intent: parse(r.intent_json),
      financial: parse(r.financial_json),
      consentAt: r.consent_at,
      resultEmailedAt: r.result_email_sent_at,
      askedAt: r.contact_requested_at || null,
      referrer: r.referrer,
      userAgent: r.user_agent,
      account: r.account_email
        ? { email: r.account_email, createdAt: r.account_created_at, verified: !!r.account_verified_at }
        : null,
    },
  });
}

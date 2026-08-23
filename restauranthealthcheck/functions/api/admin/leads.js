import { buildFilter, isAdmin } from '../../../lib/admin.js';
import { fail, json } from '../../../lib/http.js';

const PAGE_SIZE = 50;

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  if (!(await isAdmin(db, request))) return fail('กรุณาเข้าสู่ระบบผู้ดูแล', 401, 'unauthenticated');

  const url = new URL(request.url);
  const { sql, binds } = buildFilter(url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM assessments ${sql}`).bind(...binds).first();

  const { results } = await db
    .prepare(
      `SELECT id, created_at, name, shop, contact, email, shop_type, branches, age, mode,
              completed, total_score, type_code, type_name, tier, scores_json, financial_json,
              user_id, result_email_sent_at
       FROM assessments ${sql}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(...binds, PAGE_SIZE, offset)
    .all();

  // Headline numbers respect the same filters as the table below them.
  const stats = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN tier = 'HOT' THEN 1 ELSE 0 END) AS hot,
              SUM(CASE WHEN tier = 'WARM' THEN 1 ELSE 0 END) AS warm,
              SUM(CASE WHEN tier = 'NURTURE' THEN 1 ELSE 0 END) AS nurture,
              SUM(CASE WHEN email IS NOT NULL AND email <> '' THEN 1 ELSE 0 END) AS with_email,
              AVG(CASE WHEN completed = 1 THEN total_score END) AS avg_score
       FROM assessments ${sql}`,
    )
    .bind(...binds)
    .first();

  // Feeds the shop-type dropdown; unfiltered on purpose so choosing one type
  // does not make every other option disappear.
  const { results: types } = await db
    .prepare('SELECT DISTINCT shop_type FROM assessments WHERE shop_type IS NOT NULL AND shop_type <> "" ORDER BY shop_type')
    .all();

  return json({
    ok: true,
    page,
    pageSize: PAGE_SIZE,
    total: totalRow ? totalRow.n : 0,
    stats: {
      total: stats.total || 0,
      completed: stats.completed || 0,
      hot: stats.hot || 0,
      warm: stats.warm || 0,
      nurture: stats.nurture || 0,
      withEmail: stats.with_email || 0,
      avgScore: stats.avg_score != null ? Math.round(stats.avg_score) : null,
    },
    shopTypes: (types || []).map((t) => t.shop_type),
    leads: (results || []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      shop: r.shop,
      contact: r.contact,
      email: r.email,
      shopType: r.shop_type,
      branches: r.branches,
      age: r.age,
      mode: r.mode,
      completed: !!r.completed,
      total: r.total_score,
      typeCode: r.type_code,
      typeName: r.type_name,
      tier: r.tier,
      scores: r.scores_json ? JSON.parse(r.scores_json) : null,
      financial: r.financial_json ? JSON.parse(r.financial_json) : null,
      hasAccount: !!r.user_id,
      resultEmailed: !!r.result_email_sent_at,
    })),
  });
}

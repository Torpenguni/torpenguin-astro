import { newId } from '../../lib/crypto.js';
import { fail, json, normalizeEmail, now, readJson, sameOrigin, siteUrl, validEmail } from '../../lib/http.js';
import { sendResultEmail } from '../../lib/email.js';
import { guard } from '../../lib/ratelimit.js';
import { getUser } from '../../lib/session.js';

const str = (v, max = 300) => (v == null ? null : String(v).slice(0, max));
const jsonField = (v, max = 40000) => (v == null ? null : JSON.stringify(v).slice(0, max));

// Saves an assessment. Called more than once per visit: as soon as the person
// registers, and again when they finish. `sessionKey` keys the upsert so a
// half-finished run is a lead too, and finishing updates the same row instead
// of creating a duplicate.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail('คำขอไม่ถูกต้อง', 403);

  const body = await readJson(request, 256 * 1024);
  if (!body) return fail('รูปแบบข้อมูลไม่ถูกต้อง', 400);

  const db = env.DB;
  const limited = await guard(db, request, 'assessment', null, { ip: [60, 3600] });
  if (limited) return limited;

  const sessionKey = str(body.sessionKey, 80);
  if (!sessionKey) return fail('ข้อมูลไม่ครบ', 400);

  const email = normalizeEmail(body.email);
  const user = await getUser(db, request);
  const ts = now();

  const row = {
    user_id: user ? user.id : null,
    email: email && validEmail(email) ? email : null,
    name: str(body.name),
    shop: str(body.shop),
    contact: str(body.contact),
    shop_type: str(body.shopType, 80),
    branches: str(body.branches, 40),
    age: str(body.age, 40),
    mode: str(body.mode, 20),
    completed: body.completed ? 1 : 0,
    total_score: Number.isFinite(body.total) ? Math.round(body.total) : null,
    type_code: str(body.typeCode, 20),
    type_name: str(body.typeName, 120),
    tier: str(body.tier, 20),
    scores_json: jsonField(body.scores),
    answers_json: jsonField(body.answers),
    intent_json: jsonField(body.intent),
    financial_json: jsonField(body.financial),
    consent_at: body.consent ? ts : null,
    user_agent: str(request.headers.get('user-agent'), 300),
    referrer: str(body.referrer, 300),
  };

  await db
    .prepare(
      `INSERT INTO assessments (
         id, session_key, user_id, email, name, shop, contact, shop_type, branches, age, mode,
         completed, total_score, type_code, type_name, tier,
         scores_json, answers_json, intent_json, financial_json,
         consent_at, user_agent, referrer, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(session_key) DO UPDATE SET
         user_id        = COALESCE(excluded.user_id, assessments.user_id),
         email          = COALESCE(excluded.email, assessments.email),
         name           = COALESCE(excluded.name, assessments.name),
         shop           = COALESCE(excluded.shop, assessments.shop),
         contact        = COALESCE(excluded.contact, assessments.contact),
         shop_type      = COALESCE(excluded.shop_type, assessments.shop_type),
         branches       = COALESCE(excluded.branches, assessments.branches),
         age            = COALESCE(excluded.age, assessments.age),
         mode           = COALESCE(excluded.mode, assessments.mode),
         completed      = MAX(excluded.completed, assessments.completed),
         total_score    = COALESCE(excluded.total_score, assessments.total_score),
         type_code      = COALESCE(excluded.type_code, assessments.type_code),
         type_name      = COALESCE(excluded.type_name, assessments.type_name),
         tier           = COALESCE(excluded.tier, assessments.tier),
         scores_json    = COALESCE(excluded.scores_json, assessments.scores_json),
         answers_json   = COALESCE(excluded.answers_json, assessments.answers_json),
         intent_json    = COALESCE(excluded.intent_json, assessments.intent_json),
         financial_json = COALESCE(excluded.financial_json, assessments.financial_json),
         consent_at     = COALESCE(assessments.consent_at, excluded.consent_at),
         updated_at     = excluded.updated_at`,
    )
    .bind(
      newId(), sessionKey, row.user_id, row.email, row.name, row.shop, row.contact, row.shop_type,
      row.branches, row.age, row.mode, row.completed, row.total_score, row.type_code, row.type_name,
      row.tier, row.scores_json, row.answers_json, row.intent_json, row.financial_json,
      row.consent_at, row.user_agent, row.referrer, ts, ts,
    )
    .run();

  // Mail the summary once the run is finished — guarded by a stored timestamp
  // so a retried save (or a second device) never sends it twice.
  const saved = await db
    .prepare('SELECT id, email, shop, completed, total_score, type_name, tier, scores_json, result_email_sent_at FROM assessments WHERE session_key = ?')
    .bind(sessionKey)
    .first();

  if (saved && saved.completed !== 0 && saved.email && saved.total_score != null && !saved.result_email_sent_at) {
    const claimed = await db
      .prepare('UPDATE assessments SET result_email_sent_at = ? WHERE id = ? AND result_email_sent_at IS NULL')
      .bind(ts, saved.id)
      .run();

    if (claimed.meta && claimed.meta.changes === 1) {
      const sent = await sendResultEmail(env, saved.email, {
        shop: saved.shop,
        total: saved.total_score,
        typeName: saved.type_name,
        tier: saved.tier,
        scores: saved.scores_json ? JSON.parse(saved.scores_json) : null,
        site: siteUrl(env, request),
      });
      // Let a failed send be retried rather than silently swallowed.
      if (!sent.ok) {
        await db.prepare('UPDATE assessments SET result_email_sent_at = NULL WHERE id = ?').bind(saved.id).run();
      }
    }
  }

  return json({ ok: true });
}

// A logged-in user's own past assessments — the reason to have an account.
export async function onRequestGet({ request, env }) {
  const user = await getUser(env.DB, request);
  if (!user) return fail('กรุณาเข้าสู่ระบบ', 401, 'unauthenticated');

  // Rows saved before the account existed are matched by email as well.
  const { results } = await env.DB
    .prepare(
      `SELECT id, shop, shop_type, mode, completed, total_score, type_code, type_name, tier,
              scores_json, created_at
       FROM assessments
       WHERE user_id = ? OR (email IS NOT NULL AND email = ?)
       ORDER BY created_at DESC LIMIT 50`,
    )
    .bind(user.id, user.email)
    .all();

  return json({
    ok: true,
    assessments: (results || []).map((r) => ({
      id: r.id,
      shop: r.shop,
      shopType: r.shop_type,
      mode: r.mode,
      completed: !!r.completed,
      total: r.total_score,
      typeCode: r.type_code,
      typeName: r.type_name,
      tier: r.tier,
      scores: r.scores_json ? JSON.parse(r.scores_json) : null,
      createdAt: r.created_at,
    })),
  });
}

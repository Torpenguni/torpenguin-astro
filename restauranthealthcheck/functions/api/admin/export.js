import { buildFilter, isAdmin } from '../../../lib/admin.js';
import { fail } from '../../../lib/http.js';

const COLUMNS = [
  ['วันที่', (r) => new Date(r.created_at * 1000).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })],
  ['ชื่อ', (r) => r.name],
  ['ชื่อร้าน', (r) => r.shop],
  ['ช่องทางติดต่อ', (r) => r.contact],
  ['อีเมล', (r) => r.email],
  ['ประเภทร้าน', (r) => r.shop_type],
  ['จำนวนสาขา', (r) => r.branches],
  ['อายุร้าน', (r) => r.age],
  ['โหมด', (r) => (r.mode === 'quick' ? 'ด่วน' : 'ละเอียด')],
  ['ทำจบ', (r) => (r.completed ? 'จบ' : 'ไม่จบ')],
  ['คะแนนรวม', (r) => r.total_score],
  ['ประเภทที่ได้', (r) => r.type_name],
  ['Tier', (r) => r.tier],
  ['ผู้นำ (D1)', (r) => dim(r, 'D1')],
  ['การเงิน (D2)', (r) => dim(r, 'D2')],
  ['แบรนด์ (D3)', (r) => dim(r, 'D3')],
  ['ระบบ (D4)', (r) => dim(r, 'D4')],
  ['ขยาย (D5)', (r) => dim(r, 'D5')],
  ['มีบัญชี', (r) => (r.user_id ? 'มี' : '')],
  ['ส่งผลทางเมลแล้ว', (r) => (r.result_email_sent_at ? 'ส่งแล้ว' : '')],
  // คอลัมน์นี้อยู่ท้ายสุดโดยตั้งใจ ทีมขายเปิดไฟล์แล้วเรียงจากคอลัมน์นี้ได้ทันที
  // ว่าใครยกมือขอให้ติดต่อกลับเอง ซึ่งควรโทรก่อนใครแม้คะแนนจะไม่สูง
  ['ขอให้ติดต่อกลับ', (r) => (r.contact_requested_at
    ? new Date(r.contact_requested_at * 1000).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    : '')],
];

function dim(r, key) {
  if (!r.scores_json) return '';
  try {
    const s = JSON.parse(r.scores_json);
    return s && s[key] != null ? Math.round(s[key]) : '';
  } catch {
    return '';
  }
}

// Excel decides a CSV's separator from the locale, so a Thai copy of Excel
// reading a comma-separated file puts every row in one cell. Declaring the
// separator up front is the one thing that makes it open correctly everywhere.
function csvCell(value) {
  const s = value == null ? '' : String(value);
  // A leading =, +, - or @ makes Excel treat the cell as a formula.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  if (!(await isAdmin(db, request))) return fail('กรุณาเข้าสู่ระบบผู้ดูแล', 401, 'unauthenticated');

  const url = new URL(request.url);
  const { sql, binds } = buildFilter(url);

  const { results } = await db
    .prepare(
      `SELECT created_at, name, shop, contact, email, shop_type, branches, age, mode, completed,
              total_score, type_name, tier, scores_json, user_id, result_email_sent_at,
              contact_requested_at
       FROM assessments ${sql}
       ORDER BY created_at DESC LIMIT 10000`,
    )
    .bind(...binds)
    .all();

  const lines = ['sep=,', COLUMNS.map((c) => csvCell(c[0])).join(',')];
  for (const row of results || []) {
    lines.push(COLUMNS.map((c) => csvCell(c[1](row))).join(','));
  }

  // The BOM is what stops Excel from rendering Thai as mojibake.
  const body = '﻿' + lines.join('\r\n') + '\r\n';
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

import { hashPassword, newId } from '../../lib/crypto.js';
import { json, now } from '../../lib/http.js';

// หน้าตรวจสุขภาพระบบชั่วคราว
//
// มีไว้ตอบคำถามเดียว: ทำไมการสมัครสมาชิกถึงพังบนเว็บจริง ทั้งที่ในเครื่องผ่านหมด
// เพราะเข้าถึงเซิร์ฟเวอร์จริงไม่ได้ จึงต้องให้ระบบรายงานตัวเองออกมาแทน
//
// คืนเฉพาะที่จำเป็นต่อการวินิจฉัย: ชื่อตาราง ชื่อคอลัมน์ และชื่อความผิดพลาด
// ไม่คืนข้อมูลลูกค้า ไม่คืนค่าความลับใด ๆ — บอกแค่ว่าตั้งไว้แล้วหรือยัง
// ลบทิ้งทันทีที่หาสาเหตุเจอ
const TABLES = ['users', 'sessions', 'tokens', 'assessments', 'rate_limits', 'admin_sessions'];

const err = (e) => `${(e && e.name) || 'Error'}: ${String((e && e.message) || e).slice(0, 200)}`;

export async function onRequestGet({ env }) {
  const out = { ok: true, checks: {} };
  const db = env.DB;

  out.checks.binding = db ? 'ผูก D1 ไว้แล้ว' : 'ไม่ได้ผูก D1 — binding ชื่อ DB หายไป';
  if (!db) return json(out);

  const tables = {};
  for (const t of TABLES) {
    try { await db.prepare(`SELECT 1 FROM ${t} LIMIT 1`).all(); tables[t] = 'มี'; }
    catch (e) { tables[t] = err(e); }
  }
  out.checks.tables = tables;

  try {
    const r = await db.prepare('PRAGMA table_info(users)').all();
    out.checks.usersColumns = (r.results || []).map((c) => c.name);
  } catch (e) { out.checks.usersColumns = err(e); }

  // การเข้ารหัสรหัสผ่าน — ผู้ต้องสงสัยหลัก เพราะกินเวลาประมวลผลมากที่สุดในระบบ
  let hash = null;
  try {
    hash = await hashPassword('probe-value-not-a-real-password');
    out.checks.passwordHashing = 'ทำงานได้';
  } catch (e) { out.checks.passwordHashing = err(e); }

  // เขียนแถวจริงลงตาราง users แล้วลบทิ้ง เป็นคำสั่งเดียวกับตอนสมัครเป๊ะ ๆ
  if (hash) {
    const id = newId();
    try {
      await db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
        .bind(id, `diag-${id}@probe.invalid`, hash, now()).run();
      out.checks.insertUser = 'เขียนได้';
    } catch (e) { out.checks.insertUser = err(e); }
    try { await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run(); } catch (e) { /* เก็บกวาดไม่สำเร็จก็ไม่เป็นไร */ }
  }

  out.checks.settings = {
    RESEND_API_KEY: env.RESEND_API_KEY ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง',
    MAIL_FROM: env.MAIL_FROM ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง',
    SITE_URL: env.SITE_URL ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง',
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง',
  };

  return json(out);
}

// โค้ดที่ "รันผ่านในเครื่อง" ไม่ได้แปลว่า "ขึ้นเว็บจริง"
//
// Cloudflare Pages build จากสิ่งที่อยู่ใน git เท่านั้น ไฟล์ที่ .gitignore กลืนไว้
// จะหายไปเงียบ ๆ ตอน deploy โดยที่เทสต์ในเครื่องผ่านหมด — ซึ่งเกิดขึ้นมาแล้วจริง:
// .gitignore ที่ root ของ repo มีบรรทัด `admin/` (กัน build output ของ TinaCMS)
// แต่ pattern นั้นตรงกับโฟลเดอร์ชื่อ admin ที่ระดับไหนก็ได้ เลยกลืน
// functions/api/admin/ ไปทั้งก้อน ผลคือหน้า /admin โหลดได้ แต่ /api/admin/*
// เป็น 404 ทั้งหมดบนเว็บจริง ชุดนี้กันไม่ให้เกิดซ้ำ
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

let pass = 0, failn = 0;
const t = (name, cond) => { cond ? (pass++, console.log('  ok  ', name)) : (failn++, console.log('  FAIL', name)); };

const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

// ไฟล์ทุกไฟล์ในโฟลเดอร์พวกนี้ต้องขึ้น deploy ไปด้วยเสมอ
const SHIPPED = ['functions', 'lib', 'public', 'migrations'];

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(relative(root, p));
  }
  return out;
};

// รันด้วย cwd = โฟลเดอร์โปรเจกต์ ls-files จึงคืน path ที่อ้างอิงจากตรงนี้อยู่แล้ว
const tracked = new Set(git(['ls-files']).split('\n').filter(Boolean));
const key = (f) => f;

for (const dir of SHIPPED) {
  const files = walk(join(root, dir));
  t(`${dir}/ มีไฟล์ให้ตรวจ`, files.length > 0);
  const missing = files.filter((f) => !tracked.has(key(f)));
  t(`${dir}/ อยู่ใน git ครบทุกไฟล์ (${files.length} ไฟล์)`,
    missing.length === 0 || (console.log('       ตกหล่น:', missing.join(', ')), false));
}

// endpoint ที่หลังบ้านต้องใช้ — ระบุชื่อไว้ตรง ๆ เพราะนี่คือชุดที่เคยหายไปทั้งก้อน
for (const f of ['login.js', 'logout.js', 'leads.js', 'lead.js', 'export.js']) {
  t(`functions/api/admin/${f} อยู่ใน git`, tracked.has(key(`functions/api/admin/${f}`)));
}

// ด้านกลับกัน: ความลับต้องไม่หลุดขึ้น git เด็ดขาด
for (const secret of ['.dev.vars', 'tests/mailbox.json']) {
  t(`${secret} ไม่อยู่ใน git`, !tracked.has(key(secret)));
}

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);

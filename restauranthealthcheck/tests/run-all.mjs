// รันชุดทดสอบทั้งหมดตามลำดับ แล้วสรุปผลรวม
// ต้องมี dev server (npm run dev) และ mail catcher (npm run test:mail) รันอยู่ก่อน
import { spawn } from 'node:child_process';

const SUITES = [
  ['ไฟล์ที่จะขึ้น deploy ครบ',    'shipped-files.test.mjs'],
  ['แฮชรหัสผ่าน & token',        'crypto.test.mjs'],
  ['โดเมนหลัก www',              'canonical-host.test.mjs'],
  ['flow บัญชีผู้ใช้ (API)',      'auth.test.mjs'],
  ['หลังบ้าน · เมลผล · CSV',      'admin-email.test.mjs'],
  ['กรณีผู้ให้บริการอีเมลล่ม',    'mail-outage.test.mjs'],
  ['รายละเอียดราย lead (API)',   'admin-detail.test.mjs'],
  ['ใช้งานจริงบนเว็บ · เดสก์ท็อป', 'ui-assessment.test.mjs', 'desktop'],
  ['ใช้งานจริงบนเว็บ · มือถือ',    'ui-assessment.test.mjs', 'mobile'],
  ['ฟอร์มเล่าเรื่องร้าน',         'register-form.test.mjs'],
  ['ปุ่มขอให้ติดต่อกลับ',        'contact-request.test.mjs'],
  ['ประตูโหมดละเอียด',           'deep-gate.test.mjs'],
  ['ประตูรหัสเข้าใช้งาน',        'access-code.test.mjs'],
  ['แผน 90 วันเฉพาะร้าน',        'plan-specificity.test.mjs'],
  ['ทำค้างไว้แล้วกลับมาต่อ',      'resume-progress.test.mjs'],
  ['รองรับคนเข้าพร้อมกัน',        'capacity.test.mjs'],
  ['โหมดด่วน · บัญชี · หลังบ้าน',  'ui-account-admin.test.mjs'],
  ['แผงรายละเอียดใน UI',          'ui-lead-detail.test.mjs'],
];

// ทุกชุดยิงจาก 127.0.0.1 เหมือนกันหมด ถ้าไม่ล้างตัวนับ ชุดหลัง ๆ จะโดน
// rate limit ของชุดก่อนหน้า (ซึ่งเป็นฟีเจอร์ที่ถูกต้อง ไม่ใช่บั๊ก)
const resetLimits = () => new Promise((resolve) => {
  const p = spawn('npx', ['wrangler', 'd1', 'execute', 'restauranthealthcheck',
    '--local', '--command', 'DELETE FROM rate_limits', '--yes'],
    { stdio: 'ignore', shell: false });
  p.on('close', () => resolve());
  p.on('error', () => resolve());
});

const run = (file, arg) => new Promise((resolve) => {
  const p = spawn(process.execPath, [new URL(file, import.meta.url).pathname, ...(arg ? [arg] : [])],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { out += d; });
  p.on('close', (code) => resolve({ code, out }));
});

let totalPass = 0, totalFail = 0, broken = 0;

for (const [label, file, arg] of SUITES) {
  await resetLimits();
  const { code, out } = await run(file, arg);
  const m = out.match(/(\d+) (?:passed|ผ่าน)[\s,·]+(\d+) (?:failed|ไม่ผ่าน)/);
  if (!m) {
    broken++;
    console.log(`✗ ${label.padEnd(30)} ชุดทดสอบพัง (exit ${code})`);
    console.log(out.split('\n').slice(-12).join('\n'));
    continue;
  }
  const [, p, f] = m.map(Number);
  totalPass += p; totalFail += f;
  console.log(`${f ? '✗' : '✓'} ${label.padEnd(30)} ${String(p).padStart(3)} ผ่าน  ${f} ไม่ผ่าน`);
  if (f) console.log(out.split('\n').filter((l) => l.includes('FAIL')).join('\n'));
}

console.log('─'.repeat(56));
console.log(`รวม ${totalPass} ผ่าน · ${totalFail} ไม่ผ่าน${broken ? ` · ${broken} ชุดพัง` : ''}`);
process.exit(totalFail || broken ? 1 : 0);

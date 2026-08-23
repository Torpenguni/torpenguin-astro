// เว็บเปิดได้ทั้ง restauranthealthcheck.com และ www.restauranthealthcheck.com
// ซึ่ง Google นับเป็นสองเว็บที่เนื้อหาซ้ำกัน ตัวกลางจึงเด้งแบบไม่มี www ไปหา
// แบบมี www ให้ตรงกับที่ประกาศไว้ใน canonical / sitemap / robots / og:url
//
// เขียนชุดนี้เพราะเครื่องจำลองใส่ 127.0.0.1 ลงใน request.url เสมอ ถ้าโค้ดอ่าน
// โดเมนจากตรงนั้น จะทดสอบอะไรไม่ได้เลยและได้รู้ผลก็ต่อเมื่อขึ้นเว็บจริงไปแล้ว
const BASE = process.env.BASE || 'http://127.0.0.1:8788';

let pass = 0, failn = 0;
const t = (name, cond, extra) => {
  cond ? (pass++, console.log('  ok  ', name))
       : (failn++, console.log('  FAIL', name, extra === undefined ? '' : `— ${extra}`));
};

// fetch ของ Node ห้ามตั้งส่วนหัว Host เอง (เป็นส่วนหัวสงวน มันจะตัดทิ้งเงียบ ๆ)
// ต้องยิงผ่าน node:http ถึงจะปลอมโดเมนที่ขอเข้ามาได้ ซึ่งเป็นสิ่งเดียวที่ชุดนี้
// ต้องการทดสอบ
import http from 'node:http';

const target = new URL(BASE);
const hit = (host, path = '/', method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request(
    { host: target.hostname, port: target.port, path, method, headers: { Host: host } },
    (res) => { res.resume(); resolve({ status: res.statusCode, to: res.headers.location || null }); },
  );
  req.on('error', reject);
  req.end();
});

const APEX = 'restauranthealthcheck.com';
const WWW = 'www.restauranthealthcheck.com';

let r = await hit(APEX);
t('ไม่มี www ถูกเด้งแบบถาวร (301)', r.status === 301, r.status);
t('เด้งไปโดเมนที่มี www และเป็น https', r.to === `https://${WWW}/`, r.to);

r = await hit(APEX, '/account?mode=signup&utm_source=booth');
t('พา path กับ query ไปด้วยครบ',
  r.to === `https://${WWW}/account?mode=signup&utm_source=booth`, r.to);

// 301 อนุญาตให้เบราว์เซอร์เปลี่ยน POST เป็น GET ระหว่างทาง ซึ่งจะทำให้คำตอบ
// แบบประเมินที่กำลังส่งหายไปเงียบ ๆ วิธีที่ไม่ใช่ GET จึงต้องเป็น 308
r = await hit(APEX, '/api/assessments', 'POST');
t('POST ใช้ 308 เพื่อไม่ให้ข้อมูลที่ส่งมาหาย', r.status === 308, r.status);
t('POST เด้งไปที่ path เดิม', r.to === `https://${WWW}/api/assessments`, r.to);

for (const [label, host] of [
  ['โดเมนหลักไม่เด้งซ้ำ (กันวนไม่รู้จบ)', WWW],
  ['หน้า preview ของ Cloudflare เปิดได้ตามปกติ', 'torpenguin-astro.pages.dev'],
  ['รันในเครื่องเปิดได้ตามปกติ', '127.0.0.1:8788'],
]) {
  const x = await hit(host);
  t(label, x.status !== 301 && x.status !== 308, `ได้ ${x.status} -> ${x.to}`);
}

// เส้นทางที่คนใช้จริงต้องยังทำงานได้หลังใส่ตัวเด้ง
const ok = await hit(WWW, '/api/auth/me');
t('API ยังตอบปกติเมื่อเข้าด้วยโดเมนหลัก', ok.status === 200, ok.status);

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);

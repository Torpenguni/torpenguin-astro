// Security headers on every response, and a single place where an unexpected
// exception turns into a clean Thai error instead of a stack trace.
// เว็บเปิดได้ทั้งแบบมีและไม่มี www ซึ่ง Google จะนับเป็นสองเว็บที่เนื้อหาซ้ำกัน
// คะแนนเลยกระจายแทนที่จะรวมที่เดียว ทุกที่ในหน้าเว็บ (canonical, sitemap,
// robots, og:url) ประกาศ www เป็นตัวหลักไว้อยู่แล้ว ตรงนี้จึงบังคับให้ตรงกัน
//
// เด้งเฉพาะโดเมนจริงเท่านั้น — *.pages.dev ที่ใช้ดูตัวอย่างก่อนขึ้นจริง และ
// 127.0.0.1 ที่ใช้รันในเครื่อง ต้องเปิดได้ตามปกติ ไม่งั้นจะกลายเป็นว่าเปิด
// preview ทีไรก็ถูกลากไปเว็บจริงทุกที
const APEX = 'restauranthealthcheck.com';
const CANONICAL = 'www.restauranthealthcheck.com';

export async function onRequest(context) {
  // อ่านโดเมนจากส่วนหัว Host ไม่ใช่จาก request.url เพราะเครื่องจำลองที่ใช้รัน
  // ในเครื่องใส่ 127.0.0.1 ลงใน request.url เสมอ ทำให้เขียนเทสต์ตรงนี้ไม่ได้เลย
  // ส่วนหัว Host สะท้อนโดเมนที่คนพิมพ์จริงทั้งในเครื่องและบนเว็บจริง
  const host = (context.request.headers.get('host') || new URL(context.request.url).host)
    .toLowerCase().split(':')[0];
  if (host === APEX) {
    const url = new URL(context.request.url);
    url.host = CANONICAL;
    url.protocol = 'https:';
    // GET/HEAD ใช้ 301 ซึ่งเป็นรหัสที่เครื่องมือ SEO ทุกตัวเข้าใจตรงกัน
    // ส่วนวิธีอื่นใช้ 308 เพราะ 301 อนุญาตให้เบราว์เซอร์เปลี่ยน POST เป็น GET
    // ระหว่างทาง ซึ่งจะทำให้ข้อมูลที่ส่งมาหายไปเงียบ ๆ
    const m = context.request.method;
    return Response.redirect(url.toString(), m === 'GET' || m === 'HEAD' ? 301 : 308);
  }

  let response;
  try {
    response = await context.next();
  } catch (e) {
    console.error('[unhandled]', e && e.stack ? e.stack : e);
    return new Response(
      JSON.stringify({ ok: false, error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

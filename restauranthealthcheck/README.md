# restauranthealthcheck.com

Restaurant Health Check — เครื่องมือตรวจเช็คสุขภาพธุรกิจร้านอาหาร 5 มิติ (PenguinX × CP)
พร้อมระบบบัญชีผู้ใช้ และการเก็บ lead

## โครงสร้าง

```
public/           ← เว็บที่คนเห็น (Cloudflare Pages เสิร์ฟโฟลเดอร์นี้)
  index.html        ตัวเครื่องมือ 8 หน้าจอ
  account.html      สมัคร / เข้าสู่ระบบ / ลืมรหัสผ่าน / ดูผลย้อนหลัง
  fonts/            ฟอนต์ Anuphan (แยกออกมาแล้ว ไม่ได้ฝัง base64)
  og.png robots.txt sitemap.xml
functions/        ← API (Cloudflare Pages Functions)
  _middleware.js    security headers + กันไม่ให้ error หลุดเป็น stack trace
  api/auth/*.js     signup · login · logout · verify · forgot · reset · me
  api/assessments.js  บันทึกผลประเมิน + ดึงผลย้อนหลังของตัวเอง
lib/              ← โค้ดที่ใช้ร่วมกัน (อยู่นอก functions/ จึงไม่กลายเป็น URL)
  crypto.js         แฮชรหัสผ่าน (PBKDF2) + สร้าง/แฮช token
  session.js        session + token ใช้ครั้งเดียว
  ratelimit.js      จำกัดจำนวนครั้ง (ราย IP และรายอีเมล)
  email.js          ส่งอีเมลผ่าน Resend + เทมเพลตภาษาไทย 4 ฉบับ
  http.js           helper กลาง (JSON, cookie, ตรวจอีเมล/รหัสผ่าน)
migrations/       ← schema ของ D1
```

## ตั้งค่าครั้งแรก

```bash
npm install

# 1. สร้างฐานข้อมูล แล้วเอา database_id ที่ได้ไปใส่ใน wrangler.toml
npx wrangler d1 create restauranthealthcheck

# 2. สร้างตาราง
npm run db:remote        # บน Cloudflare
npm run db:local         # ในเครื่อง

# 3. ใส่ความลับ (ห้าม commit)
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put MAIL_FROM
npx wrangler pages secret put SITE_URL
```

โดเมนผู้ส่งอีเมลต้องยืนยันที่ Resend ก่อน (ใส่ DNS: SPF + DKIM) ไม่งั้นเมลจะเข้าสแปม

## รันในเครื่อง

สร้างไฟล์ `.dev.vars` (gitignore ไว้แล้ว):

```
RESEND_API_KEY=local-test-key
RESEND_API_URL=http://127.0.0.1:8025/emails   # ชี้ไป mail catcher จะได้ไม่ส่งเมลจริง
MAIL_FROM=Restaurant Health Check <noreply@localhost>
SITE_URL=http://127.0.0.1:8788
```

แล้ว `npm run dev` → http://127.0.0.1:8788

## Deploy — Cloudflare Pages

| ช่อง | ค่า |
|---|---|
| Framework preset | None |
| Build command | *(เว้นว่าง)* |
| Build output directory | `public` |
| Root directory | `restauranthealthcheck` |

ผูก D1 ที่ Settings → Bindings → D1 database binding ชื่อ **`DB`**

## ระบบบัญชีทำงานยังไง

- **รหัสผ่าน** แฮชด้วย PBKDF2-HMAC-SHA256 210,000 รอบ ผ่าน WebCrypto
  (Workers ใช้ bcrypt ไม่ได้) เก็บจำนวนรอบไว้ในตัวแฮช → เพิ่มรอบทีหลังได้
  โดยรหัสเดิมยังใช้ได้ และจะถูกอัปเกรดให้เองตอนล็อกอินครั้งถัดไป
- **token ทุกชนิดเก็บแบบแฮช** ทั้ง session, ลิงก์ยืนยันอีเมล และลิงก์รีเซ็ต
  → ต่อให้ฐานข้อมูลรั่ว ก็เอาไปสวมรอยล็อกอินหรือรีเซ็ตรหัสใครไม่ได้
- **ลิงก์ยืนยันอีเมล** อายุ 24 ชม. · **ลิงก์รีเซ็ตรหัสผ่าน** อายุ 30 นาที
  ทั้งคู่ใช้ได้ครั้งเดียว (ตัดจ่ายแบบ atomic กันกดพร้อมกันสองครั้ง)
- **ตั้งรหัสใหม่แล้วเตะทุกอุปกรณ์ออกจากระบบ** แล้วส่งเมลแจ้งเจ้าของบัญชี
- **ไม่บอกว่าอีเมลไหนมีบัญชี** — ทั้งหน้าสมัครและหน้าลืมรหัสผ่านตอบข้อความ
  เดียวกันเสมอ คนสมัครซ้ำด้วยอีเมลที่มีบัญชีแล้วจะได้เมลแจ้งแทน
- **เดารหัสผ่านผิดกับไม่มีบัญชี ตอบเหมือนกันและใช้เวลาเท่ากัน** (`fakeVerify`)
- **rate limit** ทุก endpoint ที่รับอีเมล นับทั้งราย IP และรายอีเมล
  สมัคร 10/ชม./IP · ลืมรหัส 3/ชม./อีเมล · ล็อกอิน 10/15นาที/อีเมล
- **cookie** `HttpOnly` + `Secure` + `SameSite=Lax` อายุ 30 วัน และ API ที่เขียน
  ข้อมูลจะปฏิเสธคำขอที่มาจากโดเมนอื่น

## การเก็บ lead

`submitLead()` ยิงไป `/api/assessments` **สองครั้งต่อหนึ่งคน**: ครั้งแรกทันทีที่
ลงทะเบียนเสร็จ อีกครั้งตอนได้ผลประเมิน ทั้งสองครั้งใช้ `sessionKey` เดียวกัน
จึงรวมเป็นแถวเดียว — **คนที่ทำไม่จบก็ยังถูกเก็บเป็น lead**

ถ้าเซิร์ฟเวอร์ล่มหรือเน็ตหลุด ข้อมูลจะถูกพักไว้ใน `localStorage` แล้วส่งใหม่
รอบหน้า (`flushLeads()` ทำงานตอนเปิดหน้าแรก) — ผู้ใช้ไม่มีทางติดค้าง

## ทดสอบแล้ว

รันจริงบน wrangler + D1 ในเครื่อง:
- 18 เคส — แฮชรหัสผ่าน, salt, ปฏิเสธรหัสผิด, timing, token
- 49 เคส — flow เต็มตั้งแต่สมัคร → ยืนยันเมล → ล็อกอิน → ลืมรหัส → ตั้งรหัสใหม่
  → เตะ session เก่า → ใช้ token ซ้ำไม่ได้ → บันทึก/ดึงผลประเมิน → ออกจากระบบ
  → กัน cross-origin
- rate limit ทริปตามที่ตั้งไว้จริง

## ยังค้างอยู่

1. **ปุ่ม CTA ท้ายรายงานยังเป็น `alert('Prototype: …')`** — ต้องตัดสินใจว่าจะให้
   ไปไหน (ลิงก์จองคิว / LINE OA / ฟอร์มติดต่อทีม CP)
2. **ยังไม่มีหน้า `/admin`** — ตอนนี้ต้องดู lead ผ่าน `wrangler d1 execute`
   ยังไม่มี UI และยัง export CSV ไม่ได้
3. **ยังไม่มีเมลสรุปผลส่งให้ผู้ใช้** หลังทำแบบประเมินเสร็จ
4. **`track()` ยังไม่ได้เก็บที่ไหน** — เขียนลง console อย่างเดียว ถ้าอยากได้
   funnel จริงต้องทำ `/api/events` เพิ่ม
5. **หน้า `/privacy`** ตามที่ PDPA ควรมี ยังไม่ได้ทำ (ตอนนี้เก็บ consent
   timestamp ไว้แล้ว แต่ยังไม่มีหน้าอธิบายนโยบาย)

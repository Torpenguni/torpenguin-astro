# เอาขึ้น www.restauranthealthcheck.com

ทำตามลำดับจากบนลงล่าง ข้ามขั้นไม่ได้ — แต่ละขั้นใช้ผลจากขั้นก่อนหน้า
ใช้เวลารวมประมาณ 30–45 นาที (ไม่รวมเวลารอ DNS กระจายตัว)

> ⚠️ **ตอนนี้เว็บไม่ใช่ static แล้ว** มีทั้งฐานข้อมูลและระบบส่งอีเมล
> วิธี "ลากไฟล์ zip เข้า Cloudflare" ที่เคยใช้ได้ตอนแรก **ใช้ไม่ได้แล้ว**
> เพราะต้องผูก D1 และใส่ secret ด้วย ให้ทำตามขั้นตอนด้านล่างแทน

---

## สิ่งที่ต้องมีก่อนเริ่ม

- [ ] บัญชี **Cloudflare** (ฟรี)
- [ ] บัญชี **Resend** (ฟรี 3,000 เมล/เดือน)
- [ ] สิทธิ์แก้ **DNS** ของ `restauranthealthcheck.com`
- [ ] **Node.js 18 ขึ้นไป** ในเครื่อง (เช็ค: `node -v`)

---

## 1. เตรียมโค้ดในเครื่อง

แตกไฟล์ zip แล้วเข้าไปในโฟลเดอร์นั้น จากนั้น:

```bash
npm install
npx wrangler login
```

`wrangler login` จะเปิดเบราว์เซอร์ให้กดอนุญาต — ทำครั้งเดียวจบ

---

## 2. สร้างโปรเจกต์ Pages + deploy ครั้งแรก

```bash
npx wrangler pages project create restauranthealthcheck --production-branch main
npx wrangler pages deploy
```

เสร็จแล้วจะได้ลิงก์ `https://restauranthealthcheck.pages.dev`

**ตอนนี้เปิดได้แล้ว แต่ยังใช้งานไม่ได้จริง** — ยังไม่มีฐานข้อมูล กดทำแบบประเมิน
แล้วจะ error นั่นถูกต้องแล้ว ไปขั้นถัดไป

---

## 3. สร้างฐานข้อมูล D1

```bash
npx wrangler d1 create restauranthealthcheck
```

จะได้ `database_id` เป็นชุดตัวอักษรยาว ๆ ออกมา **ก๊อปไปวางใน `wrangler.toml`**
แทนที่บรรทัดที่เป็นเลขศูนย์ทั้งหมด:

```toml
[[d1_databases]]
binding = "DB"
database_name = "restauranthealthcheck"
database_id = "เอาค่าที่ได้มาวางตรงนี้"
```

แล้วสร้างตาราง (ต้องรันทั้งสองไฟล์ ตามลำดับ):

```bash
npx wrangler d1 execute restauranthealthcheck --remote --file=migrations/0001_init.sql
npx wrangler d1 execute restauranthealthcheck --remote --file=migrations/0002_admin_and_result_email.sql
```

> `--remote` สำคัญมาก ถ้าลืมใส่จะไปสร้างในเครื่องตัวเอง ไม่ใช่บน Cloudflare

---

## 4. ตั้งค่าอีเมล (Resend)

1. สมัคร resend.com → **Domains** → **Add Domain** → ใส่ `restauranthealthcheck.com`
2. Resend จะให้ **DNS record มา 3 ตัว** (SPF + DKIM + ตัวติดตาม) → เอาไปใส่ที่ผู้ให้บริการ
   DNS ของโดเมน
3. รอจนสถานะขึ้น **Verified** (ปกติไม่กี่นาที)
4. ไปที่ **API Keys** → **Create API Key** → ก๊อปเก็บไว้ (จะเห็นครั้งเดียว)

> ข้ามขั้นนี้ไม่ได้ ถ้าโดเมนยังไม่ verified อีเมลยืนยันตัวตนกับลิงก์รีเซ็ตรหัสผ่าน
> จะเข้าโฟลเดอร์สแปมหรือส่งไม่ออกเลย

---

## 5. ใส่ค่าลับ 4 ตัว

```bash
npx wrangler pages secret put RESEND_API_KEY  --project-name restauranthealthcheck
npx wrangler pages secret put MAIL_FROM       --project-name restauranthealthcheck
npx wrangler pages secret put SITE_URL        --project-name restauranthealthcheck
npx wrangler pages secret put ADMIN_PASSWORD  --project-name restauranthealthcheck
```

แต่ละคำสั่งจะถามค่าให้พิมพ์ ใส่ตามนี้:

| ตัวแปร | ใส่ค่า |
|---|---|
| `RESEND_API_KEY` | คีย์จากขั้นที่ 4 |
| `MAIL_FROM` | `Restaurant Health Check <noreply@restauranthealthcheck.com>` |
| `SITE_URL` | `https://www.restauranthealthcheck.com` |
| `ADMIN_PASSWORD` | รหัสเข้าหลังบ้าน — **ตั้งให้ยาวและเดายาก** |

> `SITE_URL` ถูกใช้สร้างลิงก์ในอีเมล ถ้าใส่ผิด ลิงก์ยืนยันอีเมลกับลิงก์รีเซ็ตรหัสผ่าน
> จะพาไปผิดที่ ต้องเป็น `https://www.` และ **ห้ามมี `/` ปิดท้าย**
>
> `ADMIN_PASSWORD` เปิดประตูสู่ lead ทั้งหมดด้วยรหัสเดียว อย่าใช้รหัสที่ใช้ที่อื่น

---

## 6. Deploy อีกครั้งให้ค่าใหม่มีผล

```bash
npx wrangler pages deploy
```

เปิด `https://restauranthealthcheck.pages.dev` แล้ว**ทดสอบให้ครบก่อนต่อโดเมน**:

- [ ] ทำแบบประเมินได้จนจบ ไม่ error
- [ ] เข้า `/admin` ใส่รหัสแล้วเห็นรายการที่เพิ่งทำ
- [ ] กดปุ่ม CSV แล้วเปิดใน Excel ได้ ภาษาไทยอ่านออก
- [ ] สมัครบัญชีด้วยอีเมลจริง แล้ว**ได้รับเมลยืนยันจริง**
- [ ] กด "ลืมรหัสผ่าน" แล้วได้เมล ตั้งรหัสใหม่แล้วล็อกอินได้

ถ้าเมลไม่มา: ดู log ที่ Cloudflare → Workers & Pages → โปรเจกต์ → **Logs**
ข้อความจะขึ้นต้นด้วย `[email]` และบอกสาเหตุ

> **ถ้าเว็บขึ้นแต่กดทำแบบประเมินแล้ว error:** แปลว่า D1 ยังไม่ถูกผูกกับโปรเจกต์
> ปกติ `wrangler.toml` จะผูกให้เองตอน deploy แต่ถ้าไม่ ให้ไปที่
> Cloudflare → โปรเจกต์ → **Settings → Bindings** → เพิ่ม **D1 database binding**
> ชื่อ **`DB`** ชี้ไปที่ฐานข้อมูล `restauranthealthcheck` แล้ว deploy ใหม่

---

## 7. ต่อโดเมน

Cloudflare → **Workers & Pages** → `restauranthealthcheck` → **Custom domains**
→ **Set up a custom domain**

เพิ่ม **ทั้งสองตัว** ทีละอัน:
1. `www.restauranthealthcheck.com`
2. `restauranthealthcheck.com`

**ถ้า DNS อยู่บน Cloudflare อยู่แล้ว** → กดยืนยัน จบ Cloudflare ใส่ record ให้เอง

**ถ้า DNS ยังอยู่ที่ผู้ให้บริการที่จดโดเมน** เลือกทางใดทางหนึ่ง:

- **ย้าย nameserver มา Cloudflare** (แนะนำ) — Cloudflare จะให้ NS สองตัวมา
  เอาไปเปลี่ยนที่หน้าจัดการโดเมน
- **หรืออยู่ที่เดิม** แล้วเพิ่ม record เอง:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `restauranthealthcheck.pages.dev` |
| CNAME / ALIAS / ANAME | `@` | `restauranthealthcheck.pages.dev` |

SSL ออกอัตโนมัติ รอ 5–15 นาที (บางที่ DNS กระจายตัวถึง 24 ชม.)

**ให้ `www` เป็นตัวหลัก** แล้วตั้ง redirect จากตัวไม่มี `www` มาหา
(Cloudflare → Rules → Redirect Rules) เพราะ `SITE_URL` ตั้งเป็น `www` ไว้

---

## 8. ตรวจครั้งสุดท้าย

- [ ] เปิด `https://www.restauranthealthcheck.com` ติด และขึ้นกุญแจ (SSL)
- [ ] เปิดจาก **มือถือจริง** แล้วทำแบบประเมินได้จนจบ
- [ ] แชร์ลิงก์ลง LINE แล้วขึ้นรูปกับชื่อเว็บถูกต้อง
- [ ] `/privacy` เปิดได้ และลิงก์จากช่องยินยอมกดแล้วไปถึง
- [ ] ลองสมัครบัญชีใหม่จากโดเมนจริง แล้วลิงก์ในอีเมลชี้มาที่โดเมนจริง (ไม่ใช่ `.pages.dev`)

---

## เวลาจะแก้อะไรทีหลัง

```bash
npx wrangler pages deploy
```

รันในโฟลเดอร์โปรเจกต์ เท่านี้เว็บอัปเดต ไม่ต้องตั้งค่าอะไรใหม่

**พอได้ลิงก์ Google Form มา** ให้แก้ `public/index.html` หา `ctaUrl:''`
(อยู่ในบล็อก `const CONFIG` ประมาณบรรทัด 780) ใส่ลิงก์ลงไประหว่าง `''`
แล้ว deploy — ปุ่มท้ายรายงานจะโผล่มาเอง

---

## ถ้าอยากให้ deploy อัตโนมัติเวลา push

ต่อโปรเจกต์ Pages เข้ากับ GitHub repo ได้ที่ Settings → Builds & deployments
ตั้งค่าตามนี้:

| ช่อง | ค่า |
|---|---|
| Build command | *(เว้นว่าง)* |
| Build output directory | `public` |
| Root directory | `restauranthealthcheck` |

แล้วทุกครั้งที่ push เว็บจะอัปเดตเอง

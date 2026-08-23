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
- [ ] สิทธิ์เข้าบัญชี **GoDaddy** ที่จดโดเมน `restauranthealthcheck.com` ไว้
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
2. Resend จะให้ **DNS record มา 3 ตัว** (SPF + DKIM + ตัวติดตาม) → เอาไปใส่ใน
   **Cloudflare → DNS → Records** (ทำหลังย้าย nameserver ตามข้อ 7 แล้ว —
   ดูหมายเหตุเรื่องลำดับท้ายข้อ 7)
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

## 7. ต่อโดเมน (โดเมนอยู่ที่ GoDaddy)

> ✅ **ข้อ 7.1–7.4 ทำเสร็จแล้ว** (ตรวจเมื่อ 22 ส.ค. 2569)
> nameserver ของ `restauranthealthcheck.com` ชี้มาที่ Cloudflare แล้ว:
> `galilea.ns.cloudflare.com` · `wilson.ns.cloudflare.com`
> **ข้ามไปทำ 7.5 ได้เลย** (หลังจากมีโปรเจกต์ Pages แล้ว)
>
> ผลตรวจอื่นที่ควรรู้:
> - **ไม่มี MX record** → โดเมนนี้ไม่ได้ใช้รับอีเมล การย้ายจึงไม่ทำให้เมลพัง
> - **มี DMARC ค้างจาก GoDaddy** `p=quarantine` → ตอนตั้ง Resend (ข้อ 4)
>   ต้องใส่ SPF + DKIM ให้ครบและผ่าน Verified ไม่งั้นเมลเข้าสแปมทั้งหมด
> - **ยังไม่มี SPF/DKIM ของ Resend** → ข้อ 4 ยังไม่ได้ทำ

### 7.1 ทำไมต้องย้าย nameserver มา Cloudflare

**GoDaddy ไม่รองรับ CNAME ที่โดเมนหลัก (`@`)** และไม่มี ALIAS/ANAME ให้ใช้
แปลว่าถ้าทิ้ง DNS ไว้ที่ GoDaddy จะชี้ `restauranthealthcheck.com`
(แบบไม่มี www) มาที่ Cloudflare Pages **ไม่ได้เลย** ได้แค่ `www` อย่างเดียว

GoDaddy มีเมนู "Forwarding" ให้ปลอมเป็น redirect แต่ทำงานผ่านเซิร์ฟเวอร์ของ GoDaddy
ชนกับ SSL ของ Cloudflare บ่อย และพังเงียบ ๆ — **อย่าใช้**

ทางที่ถูกคือย้าย nameserver มา Cloudflare แล้วจัดการ DNS ทั้งหมดที่เดียว

### 7.2 เพิ่มโดเมนเข้า Cloudflare

1. dash.cloudflare.com → **Add a site** → พิมพ์ `restauranthealthcheck.com`
2. เลือกแพลน **Free**
3. Cloudflare จะสแกน DNS record เดิมจาก GoDaddy มาให้
   → **ตรวจให้ครบก่อนกดต่อ** โดยเฉพาะ **MX** (อีเมล) และ **TXT**
   ถ้ามีอีเมลใช้อยู่บนโดเมนนี้แล้ว record หาย = **อีเมลเข้าไม่ได้ทันทีที่ย้าย**
4. Cloudflare จะให้ **nameserver มา 2 ตัว** หน้าตาประมาณ
   `xxx.ns.cloudflare.com` — ก๊อปเก็บไว้

### 7.3 เปลี่ยน nameserver ที่ GoDaddy

1. เข้า godaddy.com → **My Products**
2. หาโดเมน `restauranthealthcheck.com` → กด **DNS** (หรือ **Manage DNS**)
3. เลื่อนลงหาหัวข้อ **Nameservers** → กด **Change** / **เปลี่ยน**
4. เลือก **I'll use my own nameservers** (บางหน้าเขียนว่า *Enter my own nameservers*)
5. ลบของเดิมออก แล้วใส่ 2 ตัวจาก Cloudflare
6. **Save** — GoDaddy อาจถามยืนยันอีกรอบว่าจะเลิกใช้ DNS ของเขา ให้กดยืนยัน

### 7.4 รอ

Cloudflare จะส่งอีเมลมาบอกเมื่อสถานะขึ้น **Active** ปกติ 5 นาที – 2 ชั่วโมง
(GoDaddy บอกไว้ว่าอาจถึง 48 ชม. แต่จริง ๆ มักเร็วกว่านั้นมาก)

ระหว่างรอ **เว็บเดิมยังทำงานปกติ** ทำเฟสอื่นต่อได้

### 7.5 ผูกโดเมนกับ Pages (ทำหลัง Cloudflare ขึ้น Active แล้ว)

Cloudflare → **Workers & Pages** → `restauranthealthcheck` → **Custom domains**
→ **Set up a custom domain** → เพิ่มทีละอัน:

1. `www.restauranthealthcheck.com`
2. `restauranthealthcheck.com`

พอ DNS อยู่บน Cloudflare แล้ว **ไม่ต้องใส่ record เอง** ระบบสร้างให้อัตโนมัติ
SSL ออกให้ภายใน 5–15 นาที

### 7.6 ให้ตัวไม่มี www เด้งไปหา www

`SITE_URL` ตั้งเป็น `https://www.` ไว้ ควรให้เหลือทางเข้าเดียวจะได้ไม่งง:

Cloudflare → **Rules** → **Redirect Rules** → **Create rule**

| ช่อง | ค่า |
|---|---|
| ชื่อ | `apex to www` |
| เงื่อนไข | Hostname **equals** `restauranthealthcheck.com` |
| ปลายทาง (Expression) | `concat("https://www.restauranthealthcheck.com", http.request.uri.path)` |
| ประเภท | **Dynamic** (ไม่ใช่ Static — ต้องส่ง path เดิมไปด้วย) |
| Status | 301 |

### ⚠️ ลำดับสำคัญ

**ย้าย nameserver ให้เสร็จก่อนทำเฟส 4 (Resend)** — ไม่งั้นจะต้องใส่ DNS record
ของ Resend ที่ GoDaddy ก่อน แล้วพอย้าย nameserver ต้องมาใส่ซ้ำที่ Cloudflare อีกรอบ
เสียเวลาสองเที่ยวโดยไม่จำเป็น

✅ ข้อนี้ผ่านไปแล้ว — DNS อยู่บน Cloudflare เรียบร้อย ทำข้อ 4 (Resend) ได้ทันที
โดยใส่ record ที่ **Cloudflare → DNS → Records**

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

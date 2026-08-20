# restauranthealthcheck.com

Restaurant Health Check — เครื่องมือตรวจเช็คสุขภาพธุรกิจร้านอาหาร 5 มิติ (PenguinX × CP)

เว็บ static ล้วน **ไฟล์เดียวจบ** ไม่มี dependency ไม่ต้อง build ไม่ต้องมี server
ฟอนต์ Anuphan ฝังเป็น base64 มาในไฟล์แล้ว เปิดออฟไลน์ก็ทำงานได้

## ไฟล์

| ไฟล์ | คืออะไร |
|---|---|
| `index.html` | ทั้งเว็บ — CSS + HTML 8 หน้าจอ + JS ตรรกะทั้งหมด |
| `og.png` | รูปตอนแชร์ลง LINE / Facebook (1200×630) |
| `robots.txt` · `sitemap.xml` | SEO |

ต้นทางของ `index.html` มาจาก Claude Artifact:
https://claude.ai/code/artifact/ffa3e5a1-5c42-4e11-841f-2a71c84c4b5e
(artifact ยังใช้เป็นตัว preview ภายในทีมได้ แต่ **ตัวจริงที่ขึ้นโดเมนคือไฟล์ในนี้**
แก้ที่ไหนต้อง sync อีกที่ด้วย ไม่งั้นสองตัวจะไม่ตรงกัน)

## Deploy — Cloudflare Pages

ตั้งครั้งเดียว จากนั้น `git push` = เว็บอัปเดตอัตโนมัติ

**Build settings ใน Cloudflare Pages:**

| ช่อง | ค่า |
|---|---|
| Framework preset | None |
| Build command | *(เว้นว่าง)* |
| Build output directory | `restauranthealthcheck` |
| Root directory | *(เว้นว่าง)* |

ไม่ต้องตั้ง Node version เพราะไม่มีขั้นตอน build

## โครงสร้างภายใน `index.html`

- **`<style>`** — CSS ทั้งหมด รวม `@font-face` ของ Anuphan (base64 ~72KB)
- **8 หน้าจอ** — `s-landing` → `s-register` → `s-quiz` → `s-review` → `s-intent`
  → `s-quickresult` → `s-financial` → `s-result`
- **`<script>`** — ตรรกะ:
  - `CONFIG.endpoint` — ปลายทางเก็บ lead **(ยังว่าง = ข้อมูลผู้ใช้ไม่ถูกส่งไปไหน)**
  - `DIMS` — 5 มิติ (ตัวเจ้าของ / การเงิน / แบรนด์ / ระบบ&ทีม / ความพร้อมขยาย)
  - `QUESTIONS` — 48 ข้อ (type: single / matrix / drill)
  - `COST_PROFILE` — เกณฑ์ต้นทุน 7 ประเภทร้าน อ้างอิงตำรา PenguinX
  - `AXES` / `TYPES` — จัดประเภทร้าน 4 แกน → tier HOT / WARM / NURTURE
  - `ACTIONS` / `ROOT_ACTION` / `DIM_PHRASE` — ข้อความแผน 90 วัน + คำวินิจฉัย

## ค้างอยู่ ยังไม่ได้ทำ

1. **`CONFIG.endpoint` ยังเป็น `''`** — กรอกอีเมลแล้ว lead หายหมด ต้องต่อปลายทางก่อนใช้งานจริง
2. **ปุ่ม CTA ท้ายรายงานยังเป็น `alert('Prototype: …')`** — ผู้ใช้กดแล้วเห็นคำว่า Prototype
3. ยังไม่ได้ทดสอบบนมือถือจริง — ควรลองบนเครื่องจริงหลัง deploy

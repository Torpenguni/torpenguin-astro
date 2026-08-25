// รหัสเข้าใช้งานที่ใช้ในชุดทดสอบ — ตรงกับค่าตั้งต้นใน lib/accesscode.js
// (ถ้าไม่ตั้ง ACCESS_CODE ไว้ใน environment ระบบจะใช้ค่านี้)
export const ACCESS_CODE = process.env.ACCESS_CODE || 'CPRESTECH2026';

// ชุดทดสอบเกือบทั้งหมดสนใจเรื่องอื่น ไม่ได้สนใจประตูรหัส จึงหยอดรหัสที่ถูกต้อง
// ไว้ในเบราว์เซอร์ตั้งแต่ก่อนหน้าเว็บเริ่มทำงาน เหมือนคนที่เคยใส่รหัสไปแล้ว
// ประตูตัวจริงถูกทดสอบแยกในชุด access-code.test.mjs
export const seedAccess = (page) => page.evaluateOnNewDocument((code) => {
  try {
    localStorage.setItem('rhc_access', JSON.stringify({ code, exp: Date.now() + 30 * 864e5 }));
  } catch (e) { /* โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ ปล่อยผ่าน */ }
}, ACCESS_CODE);

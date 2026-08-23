-- จังหวัดที่ตั้งร้าน — เก็บเป็นชื่อเต็มภาษาไทยตรงตามที่เลือกจาก dropdown
-- ในฟอร์ม (ไม่ใช่รหัสจังหวัด) เพราะฝั่งหลังบ้านและไฟล์ CSV ต้องอ่านออกทันที
-- โดยไม่ต้องมีตารางแปลรหัส แถวเก่าที่บันทึกไว้ก่อนหน้านี้จะเป็น NULL
ALTER TABLE assessments ADD COLUMN province TEXT;
CREATE INDEX IF NOT EXISTS idx_assessments_province ON assessments(province);

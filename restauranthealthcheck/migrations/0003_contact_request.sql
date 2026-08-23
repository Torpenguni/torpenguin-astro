-- ปุ่ม "ให้ทีม CP ติดต่อกลับ" ท้ายรายงาน
--
-- tier ที่ระบบจัดให้เป็นการ "เดา" ความสนใจจากคะแนน ส่วนคอลัมน์นี้คือความตั้งใจ
-- ที่เจ้าของร้าน "ประกาศ" ออกมาเอง ซึ่งเป็นสัญญาณที่แรงกว่ามาก ทีมขายควรไล่โทร
-- กลุ่มนี้ก่อนแม้คะแนนจะไม่สูง เก็บเป็นเวลาไม่ใช่ true/false จะได้รู้ด้วยว่ากด
-- ตอนไหน และกันกดซ้ำได้ด้วยการเช็คว่ามีค่าอยู่แล้วหรือยัง
ALTER TABLE assessments ADD COLUMN contact_requested_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_assessments_contact_req ON assessments(contact_requested_at);

// TorPenguin media — the 6 fixed topic silos.
// Order is fixed and must not be reordered (matches primary nav).
// `slug` drives URLs; `label` is the display label (English by default — flip
// `label` here in one place to switch to Thai). `intent` + `description` are
// used on each Pillar page and as the category meta description.

export interface Category {
  slug: string;
  label: string;
  /** One-line search intent — shown small under the pillar H1. */
  intent: string;
  /** 2–3 sentence intro that embeds the category keywords (Voice: ทุกคน/พวกเรา). */
  description: string;
}

export const categories: Category[] = [
  {
    slug: 'news',
    label: 'News',
    intent: 'สดใหม่ ทันเหตุการณ์',
    description:
      'ข่าวธุรกิจอาหารและร้านอาหารที่เพิ่งเกิดขึ้น เราคัดเฉพาะเรื่องที่ส่งผลกับคนทำร้านจริง แล้วเล่าให้เข้าใจเร็วในไม่กี่นาที ถ้าเรื่องไหนต้องวิเคราะห์ยาว เราแยกไปไว้ในหมวด Trends',
  },
  {
    slug: 'case-studies',
    label: 'Case Studies',
    intent: 'ถอดบทเรียนจากของจริง',
    description:
      'ถอดเคสแบรนด์และธุรกิจอาหารที่มีอยู่จริง ทำไมบางร้านโต บางร้านเจ๊ง เรามองย้อนกลับไปดูการตัดสินใจที่สำคัญ เพื่อให้ทุกคนหยิบไปใช้กับร้านตัวเองได้',
  },
  {
    slug: 'trends',
    label: 'Trends',
    intent: 'ทิศทางที่กำลังมา',
    description:
      'เทรนด์ธุรกิจอาหารที่เราสังเคราะห์จากหลายเหตุการณ์รวมกัน ไม่ใช่ข่าวเดี่ยว แต่เป็นภาพใหญ่ที่ช่วยให้ทุกคนมองออกว่าตลาดกำลังเคลื่อนไปทางไหน',
  },
  {
    slug: 'interviews',
    label: 'Interviews',
    intent: 'คุยกับคนตัวจริง',
    description:
      'บทสัมภาษณ์เจ้าของร้านและคนในวงการอาหาร ทั้งวิธีคิดและเส้นทางกว่าจะมาถึงวันนี้ เราถามในสิ่งที่ทุกคนอยากรู้แต่ไม่ค่อยมีใครถาม',
  },
  {
    slug: 'how-to',
    label: 'How-to',
    intent: 'ทำยังไง ลงมือได้จริง',
    description:
      'คู่มือลงมือทำสำหรับคนเปิดร้านแล้ว ตั้งแต่คุมต้นทุน เลือกทำเล จัดการคน วางระบบ ไปจนถึงการตลาด เราเขียนแบบที่เอาไปทำตามได้เลย',
  },
  {
    slug: 'feasibility',
    label: 'Feasibility',
    intent: 'ควรทำไหม ก่อนลงเงิน',
    description:
      'วิเคราะห์ความเป็นไปได้ก่อนตัดสินใจลงทุน เปิดร้านแบบนี้ใช้เงินเท่าไหร่ คืนทุนกี่ปี คุ้มไหม เรากางตัวเลขและความเสี่ยงให้ดูก่อนที่ทุกคนจะควักเงินจริง',
  },
];

export const categoryBySlug = (slug: string): Category | undefined =>
  categories.find((c) => c.slug === slug);

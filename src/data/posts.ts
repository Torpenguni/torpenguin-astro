// Phase 1 mock data. In Phase 2 this is replaced by TinaCMS-backed content.
// Shape mirrors the planned `post` content model so swapping the source later
// is a drop-in. Microcopy follows TorPenguin voice: ทุกคน/พวกเรา, ไม่ครับ/ค่ะ,
// ไม่มี em dash, เรียกตัวเองว่า "เรา".

export interface Author {
  slug: string;
  name: string;
  bio: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Source {
  label: string;
  url: string;
}

export interface Post {
  title: string;
  slug: string;
  category: string; // one of the 6 category slugs
  tags: string[];
  excerpt: string;
  metaTitle?: string;
  metaDescription?: string;
  author: string; // author slug
  publishedAt: string; // ISO
  updatedAt?: string; // ISO
  readingTime: number; // minutes
  youtubeUrl?: string;
  faq?: FaqItem[];
  sources: Source[]; // at least 1
  isSponsored?: boolean;
  sponsorName?: string;
  /** Lead paragraphs for the mock article body. */
  body: string[];
}

export const authors: Record<string, Author> = {
  torpenguin: {
    slug: 'torpenguin',
    name: 'ทีม TorPenguin',
    bio: 'เราเล่าเรื่องธุรกิจอาหารแบบเจาะลึก จากคนที่ลงมือทำจริงและคุยกับเจ้าของร้านตัวจริงทั่วประเทศ',
  },
  desk: {
    slug: 'desk',
    name: 'กองบรรณาธิการ',
    bio: 'โต๊ะข่าวธุรกิจอาหารของ TorPenguin คัดและตรวจสอบเรื่องที่ส่งผลกับคนทำร้านจริง',
  },
};

export const posts: Post[] = [
  {
    title: 'เปิดร้านชาบูลงทุนเท่าไหร่ คุ้มไหมในปี 2026',
    slug: 'open-shabu-cost-2026',
    category: 'feasibility',
    tags: ['ชาบู', 'ต้นทุนเปิดร้าน', 'คืนทุน'],
    excerpt:
      'อยากเปิดร้านชาบูแต่ไม่รู้ว่าต้องใช้เงินเท่าไหร่ เรากางตัวเลขจริงตั้งแต่ค่าเซ้ง ครัว วัตถุดิบ ไปจนถึงจุดคุ้มทุน ให้ทุกคนคิดให้จบก่อนลงเงิน',
    author: 'torpenguin',
    publishedAt: '2026-05-20T09:00:00+07:00',
    updatedAt: '2026-05-26T09:00:00+07:00',
    readingTime: 11,
    faq: [
      { q: 'เปิดร้านชาบูใช้เงินเท่าไหร่', a: 'ร้านขนาดกลาง 30-40 ที่นั่ง เริ่มต้นประมาณ 1.5-3 ล้านบาท ขึ้นกับทำเลและงานตกแต่ง' },
      { q: 'ร้านชาบูคืนทุนกี่ปี', a: 'ถ้าบริหารดีและทำเลใช่ มักคืนทุนใน 1.5-3 ปี แต่ถ้ายอดไม่ถึงเป้าอาจยืดเป็น 4-5 ปี' },
    ],
    sources: [
      { label: 'สำรวจต้นทุนวัตถุดิบชาบูจากผู้ประกอบการ 12 ร้าน (2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'คำถามแรกที่ทุกคนถามเราเสมอเวลาคิดจะเปิดร้านชาบูคือ ต้องใช้เงินเท่าไหร่ คำตอบสั้นๆคือมันขึ้นกับทำเลและขนาดร้านเป็นหลัก แต่เราจะกางตัวเลขจริงให้ดูทีละก้อน',
      'ก้อนแรกที่กินงบมากที่สุดมักเป็นค่าเซ้งและค่าตกแต่ง ไม่ใช่ค่าวัตถุดิบอย่างที่หลายคนเข้าใจ ก่อนเซ็นสัญญาเช่าใดๆเราอยากให้ทุกคนคำนวณค่าเช่าเทียบกับยอดขายที่เป็นไปได้จริงก่อน',
      'พอได้ตัวเลขครบแล้ว สิ่งที่ต้องดูต่อคือจุดคุ้มทุนต่อเดือน ว่าต้องขายกี่หัวต่อวันถึงจะอยู่รอด ถ้าตัวเลขนี้ดูไกลเกินจริงตั้งแต่บนกระดาษ นั่นคือสัญญาณให้คิดใหม่',
    ],
  },
  {
    title: 'ถอดบทเรียน Mixue ทำไมขยายเร็วทั่วไทยได้',
    slug: 'mixue',
    category: 'case-studies',
    tags: ['Mixue', 'แฟรนไชส์', 'ขยายสาขา'],
    excerpt:
      'Mixue โตจากศูนย์เป็นพันสาขาในเวลาไม่กี่ปี เราถอดดูว่าเบื้องหลังคือต้นทุนวัตถุดิบ ระบบแฟรนไชส์ หรือทำเล อะไรคือตัวจริงที่ทำให้ขยายได้เร็วขนาดนี้',
    author: 'torpenguin',
    publishedAt: '2026-05-18T09:00:00+07:00',
    readingTime: 9,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    sources: [
      { label: 'ข้อมูลจำนวนสาขาแฟรนไชส์เครื่องดื่มในไทย (2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'หลายคนมองว่า Mixue ชนะเพราะราคาถูก แต่ราคาถูกเป็นแค่ปลายทาง เบื้องหลังคือการคุมต้นทุนทั้งห่วงโซ่ตั้งแต่โรงงานวัตถุดิบของตัวเอง',
      'สิ่งที่เราอยากให้ทุกคนสังเกตคือโมเดลแฟรนไชส์ที่ทำให้คนตัวเล็กเข้ามาเปิดได้ง่าย พอจำนวนสาขามากพอ อำนาจต่อรองวัตถุดิบก็ยิ่งสูงขึ้นเป็นวงจร',
    ],
  },
  {
    title: 'คาเฟ่ยังน่าลงทุนอยู่ไหมเมื่อตลาดเริ่มอิ่มตัว',
    slug: 'cafe-market-saturation',
    category: 'trends',
    tags: ['คาเฟ่', 'ตลาดอิ่มตัว', 'การแข่งขัน'],
    excerpt:
      'ร้านกาแฟผุดขึ้นทุกหัวมุมถนน เราดูจากหลายสัญญาณรวมกันว่าตลาดคาเฟ่ไทยกำลังเข้าสู่จุดไหน และช่องว่างที่ยังเหลือสำหรับคนมาทีหลังอยู่ตรงไหน',
    author: 'desk',
    publishedAt: '2026-05-15T09:00:00+07:00',
    readingTime: 8,
    sources: [
      { label: 'จำนวนร้านกาแฟจดทะเบียนใหม่รายปี กรมพัฒนาธุรกิจการค้า', url: 'https://torpenguin.com' },
    ],
    body: [
      'ทุกคนคงเห็นเหมือนกันว่าร้านกาแฟเปิดใหม่เร็วมากในช่วงไม่กี่ปีนี้ คำถามคือตลาดอิ่มตัวจริงหรือยัง',
      'เรามองว่าสิ่งที่อิ่มตัวคือคาเฟ่แบบกลางๆที่ไม่มีจุดต่าง ส่วนร้านที่มีคาแรกเตอร์ชัดยังมีที่ยืนเสมอ',
    ],
  },
  {
    title: 'คุมต้นทุนวัตถุดิบร้านอาหารให้ไม่เกิน 35% ทำยังไง',
    slug: 'food-cost-control',
    category: 'how-to',
    tags: ['ต้นทุนอาหาร', 'บริหารร้าน', 'กำไร'],
    excerpt:
      'ต้นทุนวัตถุดิบกินกำไรร้านอาหารมากที่สุด เรารวมวิธีคุม food cost ให้อยู่ในกรอบที่ร้านอยู่รอด ตั้งแต่ตั้งสูตร คุมสต๊อก ไปจนถึงออกแบบเมนู',
    author: 'torpenguin',
    publishedAt: '2026-05-12T09:00:00+07:00',
    updatedAt: '2026-05-24T09:00:00+07:00',
    readingTime: 10,
    faq: [
      { q: 'food cost ที่ดีควรอยู่กี่เปอร์เซ็นต์', a: 'ส่วนใหญ่ควรคุมให้อยู่ราว 30-35% ของราคาขาย ถ้าเกินนี้กำไรจะบางมาก' },
    ],
    sources: [
      { label: 'แนวทางคำนวณ food cost สำหรับร้านอาหารขนาดเล็ก', url: 'https://torpenguin.com' },
    ],
    body: [
      'ถ้าให้เลือกตัวเลขเดียวที่ตัดสินว่าร้านอาหารจะรอดหรือไม่ เราจะเลือก food cost เพราะมันกินกำไรเงียบๆทุกวัน',
      'วิธีคุมที่ได้ผลที่สุดไม่ใช่การกดราคาวัตถุดิบ แต่คือการตั้งสูตรให้แม่นและคุมของเสียให้น้อยที่สุด',
    ],
  },
  {
    title: 'ทำเลแบบไหนที่ร้านอาหารเปิดแล้วรอด',
    slug: 'location-that-works',
    category: 'how-to',
    tags: ['ทำเล', 'เปิดร้าน', 'ค่าเช่า'],
    excerpt:
      'ทำเลดีไม่ได้แปลว่าคนเดินเยอะ เราแยกให้เห็นว่าคนเดินผ่านกับคนที่ตั้งใจมาซื้อต่างกันยังไง และทำเลแบบไหนที่ค่าเช่ายังคุ้มกับยอดขาย',
    author: 'torpenguin',
    publishedAt: '2026-05-10T09:00:00+07:00',
    readingTime: 9,
    sources: [
      { label: 'สำรวจค่าเช่าพื้นที่ค้าปลีกย่านธุรกิจกรุงเทพ (2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'ทุกคนมักถูกสอนว่าทำเลดีคือที่ที่คนเดินผ่านเยอะ แต่คนเดินผ่านกับลูกค้าจริงเป็นคนละเรื่องกัน',
      'สิ่งที่เราอยากให้ดูคือค่าเช่าเทียบกับยอดที่เป็นไปได้จริง ไม่ใช่แค่จำนวนคนที่เดินผ่านหน้าร้าน',
    ],
  },
  {
    title: 'เปิดร้านกาแฟแบบ Stand-Alone กับในห้าง อันไหนคุ้มกว่า',
    slug: 'standalone-vs-mall-cafe',
    category: 'feasibility',
    tags: ['คาเฟ่', 'ทำเล', 'ค่าเช่า'],
    excerpt:
      'เปิดคาเฟ่ในห้างได้คนเดินผ่านเยอะแต่ค่าเช่าและ GP สูง ส่วน stand-alone ค่าเช่าถูกกว่าแต่ต้องดึงคนเอง เรากางข้อดีข้อเสียและตัวเลขให้เทียบก่อนตัดสินใจ',
    author: 'desk',
    publishedAt: '2026-05-08T09:00:00+07:00',
    readingTime: 8,
    sources: [
      { label: 'เปรียบเทียบโครงสร้างค่าเช่าห้างและตึกแถว (2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'คำถามนี้ไม่มีคำตอบเดียว เพราะมันขึ้นกับคอนเซ็ปต์ร้านและเงินทุนของแต่ละคน',
      'เราจะเทียบให้เห็นทั้งค่าเช่า GP และความเสี่ยง เพื่อให้ทุกคนเลือกแบบที่เหมาะกับตัวเองจริงๆ',
    ],
  },
  {
    title: 'คุยกับเจ้าของร้านที่พลิกจากเกือบเจ๊งเป็นมีคิวรอ',
    slug: 'mindset-turnaround-owner',
    category: 'interviews',
    tags: ['MINDSET', 'พลิกธุรกิจ', 'เจ้าของร้าน'],
    excerpt:
      'เคยขาดทุนหนักจนเกือบปิดร้าน วันนี้กลับมามีคิวรอทุกวัน เราคุยกับเจ้าของร้านถึงจุดที่ตัดสินใจเปลี่ยน และบทเรียนที่อยากบอกคนกำลังท้อ',
    author: 'torpenguin',
    publishedAt: '2026-05-06T09:00:00+07:00',
    readingTime: 12,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    sources: [
      { label: 'บทสัมภาษณ์เจ้าของร้าน บันทึกโดยทีม TorPenguin (2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'ตอนที่ร้านเกือบไปไม่รอด สิ่งที่เปลี่ยนไม่ใช่เมนูแต่เป็นวิธีคิดเรื่องตัวเลข',
      'เราชอบประโยคหนึ่งที่เจ้าของร้านบอกเราว่า กำไรไม่ได้มาจากการขายให้ได้เยอะ แต่มาจากการรู้ต้นทุนของทุกจาน',
    ],
  },
  {
    title: 'ราคาวัตถุดิบพุ่ง ร้านอาหารปรับตัวยังไงไม่ให้ลูกค้าหนี',
    slug: 'ingredient-price-surge',
    category: 'news',
    tags: ['ต้นทุน', 'ราคาวัตถุดิบ', 'ปรับราคา'],
    excerpt:
      'ราคาวัตถุดิบหลายตัวขยับขึ้นพร้อมกันในเดือนนี้ เรารวมให้ดูว่าตัวไหนกระทบร้านมากสุด และร้านที่ปรับตัวได้เขาทำอะไรบ้าง',
    author: 'desk',
    publishedAt: '2026-05-27T09:00:00+07:00',
    readingTime: 5,
    sources: [
      { label: 'ดัชนีราคาวัตถุดิบอาหารรายเดือน (พ.ค. 2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'เดือนนี้ราคาวัตถุดิบหลายตัวขยับขึ้นพร้อมกัน ร้านที่ไม่ได้คุมต้นทุนไว้ก่อนจะเจ็บก่อน',
      'สิ่งที่เราเห็นว่าได้ผลคือการปรับเมนูและพอร์ชัน มากกว่าการขึ้นราคาตรงๆที่ทำให้ลูกค้าตกใจ',
    ],
  },
  {
    title: 'ระบบ POS ตัวไหนเหมาะกับร้านอาหารขนาดเล็ก',
    slug: 'pos-for-small-restaurant',
    category: 'how-to',
    tags: ['POS', 'ระบบร้าน', 'เทคโนโลยี'],
    excerpt:
      'ระบบ POS ที่ดีช่วยให้ทุกคนเห็นยอดและต้นทุนแบบเรียลไทม์ เรารวมสิ่งที่ควรดูก่อนเลือก และฟีเจอร์ที่จำเป็นจริงสำหรับร้านเล็ก',
    author: 'torpenguin',
    publishedAt: '2026-05-04T09:00:00+07:00',
    readingTime: 7,
    isSponsored: true,
    sponsorName: 'ตัวอย่างผู้สนับสนุน',
    sources: [
      { label: 'เปรียบเทียบฟีเจอร์ระบบ POS สำหรับร้านอาหาร (2026)', url: 'https://torpenguin.com' },
    ],
    body: [
      'POS ไม่ใช่แค่เครื่องคิดเงิน แต่เป็นแหล่งข้อมูลที่บอกเราว่าเมนูไหนทำกำไรและช่วงไหนขายดี',
      'ก่อนเลือก เราอยากให้ทุกคนดูที่รายงานต้นทุนและสต๊อกเป็นหลัก ไม่ใช่แค่หน้าตาที่สวย',
    ],
  },
];

// ---- helpers ----------------------------------------------------------------

const byNewest = (a: Post, b: Post) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export const allPosts = (): Post[] => [...posts].sort(byNewest);

export const postsByCategory = (slug: string): Post[] =>
  allPosts().filter((p) => p.category === slug);

export const postBySlug = (category: string, slug: string): Post | undefined =>
  posts.find((p) => p.category === category && p.slug === slug);

export const latestPosts = (n: number): Post[] => allPosts().slice(0, n);

// Related: same category first, then shared tags; never the post itself.
export const relatedPosts = (post: Post, n = 4): Post[] => {
  const others = posts.filter((p) => p.slug !== post.slug);
  const scored = others
    .map((p) => {
      let score = p.category === post.category ? 2 : 0;
      score += p.tags.filter((t) => post.tags.includes(t)).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.p, b.p));
  return scored.slice(0, n).map((x) => x.p);
};

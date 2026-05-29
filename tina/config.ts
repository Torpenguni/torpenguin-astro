import { defineConfig } from 'tinacms';

// Tina Cloud credentials — set via env vars in Railway (or .env locally)
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main';

export default defineConfig({
  branch,
  clientId: process.env.TINA_PUBLIC_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'images',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'post',
        label: 'บทความ',
        path: 'src/content/post',
        format: 'md',
        ui: {
          filename: {
            slugify: (values) =>
              (values?.title || 'untitled')
                .toLowerCase()
                .replace(/[^a-z0-9ก-๙]+/g, '-')
                .replace(/^-|-$/g, ''),
          },
        },
        fields: [
          { type: 'string', name: 'title', label: 'หัวข้อ', isTitle: true, required: true },
          {
            type: 'string',
            name: 'category',
            label: 'หมวด',
            required: true,
            options: [
              { value: 'news', label: 'News' },
              { value: 'case-studies', label: 'Case Studies' },
              { value: 'trends', label: 'Trends' },
              { value: 'interviews', label: 'Interviews' },
              { value: 'how-to', label: 'How-to' },
              { value: 'feasibility', label: 'Feasibility' },
            ],
          },
          {
            type: 'string',
            name: 'excerpt',
            label: 'เกริ่น / Meta description',
            required: true,
            ui: { component: 'textarea' },
          },
          { type: 'string', name: 'keyPoints', label: 'Key Points (สรุปต้นบทความ)', list: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'tags', label: 'แท็ก', list: true, description: 'How-to ใช้ cost / marketing / team / systems / menu' },
          { type: 'string', name: 'author', label: 'ผู้เขียน', options: ['torpenguin', 'desk'] },
          { type: 'datetime', name: 'publishedAt', label: 'วันที่เผยแพร่', required: true },
          { type: 'datetime', name: 'updatedAt', label: 'อัปเดตล่าสุด' },
          { type: 'string', name: 'metaTitle', label: 'SEO Title (override)' },
          { type: 'string', name: 'metaDescription', label: 'SEO Description (override)', ui: { component: 'textarea' } },
          { type: 'image', name: 'image', label: 'รูปหน้าปก' },
          { type: 'string', name: 'youtubeUrl', label: 'ลิงก์ YouTube (ฝังในบทความ)' },
          { type: 'boolean', name: 'isSponsored', label: 'เนื้อหาสนับสนุน' },
          { type: 'string', name: 'sponsorName', label: 'ชื่อผู้สนับสนุน' },
          {
            type: 'object',
            name: 'sources',
            label: 'แหล่งที่มา (อย่างน้อย 1)',
            list: true,
            ui: { itemProps: (i) => ({ label: i?.label || 'แหล่งที่มา' }) },
            fields: [
              { type: 'string', name: 'label', label: 'ชื่อ/คำอธิบาย' },
              { type: 'string', name: 'url', label: 'ลิงก์' },
            ],
          },
          {
            type: 'object',
            name: 'faq',
            label: 'คำถามที่พบบ่อย',
            list: true,
            ui: { itemProps: (i) => ({ label: i?.q || 'คำถาม' }) },
            fields: [
              { type: 'string', name: 'q', label: 'คำถาม' },
              { type: 'string', name: 'a', label: 'คำตอบ', ui: { component: 'textarea' } },
            ],
          },
          { type: 'boolean', name: 'draft', label: 'ฉบับร่าง (ซ่อนจากเว็บ)' },
          { type: 'rich-text', name: 'body', label: 'เนื้อหา', isBody: true },
        ],
      },
    ],
  },
});

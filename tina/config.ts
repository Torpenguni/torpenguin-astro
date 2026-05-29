import { defineConfig } from 'tinacms';

// Tina Cloud credentials — set via env vars in Railway (or .env locally)
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main';

// Phase 1: minimal `post` collection so Tina stays consistent with the Astro
// content config. Phase 2 fleshes out the full Section-4 schema (tags, author,
// sources, faq, sponsored, related, portable-text body, etc.).
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
        label: 'Posts',
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
          { type: 'string', name: 'excerpt', label: 'เกริ่น / Meta description', required: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'tags', label: 'แท็ก', list: true },
          { type: 'datetime', name: 'publishedAt', label: 'วันที่เผยแพร่', required: true },
          { type: 'datetime', name: 'updatedAt', label: 'อัปเดตล่าสุด' },
          { type: 'string', name: 'youtubeUrl', label: 'ลิงก์ YouTube (ถ้ามี)' },
          { type: 'boolean', name: 'isSponsored', label: 'เนื้อหาสนับสนุน' },
          { type: 'string', name: 'sponsorName', label: 'ชื่อผู้สนับสนุน' },
          { type: 'boolean', name: 'draft', label: 'ฉบับร่าง (ซ่อนจากเว็บ)' },
          { type: 'rich-text', name: 'body', label: 'เนื้อหา', isBody: true },
        ],
      },
    ],
  },
});

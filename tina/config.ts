import { defineConfig } from 'tinacms';

// Tina Cloud credentials — set via env vars in Railway (or .env locally)
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main';

export default defineConfig({
  branch,
  clientId: process.env.TINA_PUBLIC_CLIENT_ID || '',  // get from app.tina.io
  token: process.env.TINA_TOKEN || '',                // get from app.tina.io

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
      // ============================================================
      // ESSAYS — long-form writing by Torpenguin
      // ============================================================
      {
        name: 'essay',
        label: 'Essays',
        path: 'src/content/essays',
        format: 'md',
        ui: {
          filename: {
            // Auto-generate from title → kebab-case slug
            slugify: (values) =>
              (values?.title || 'untitled')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
          },
        },
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'dek',
            label: 'Dek / Subhead',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'topic',
            label: 'Topic',
            required: true,
            options: [
              { value: 'building',       label: 'Building' },
              { value: 'operations',     label: 'Operations' },
              { value: 'scaling',        label: 'Scaling' },
              { value: 'unit-economics', label: 'Unit Economics' },
              { value: 'f-and-b',        label: 'F&B Industry' },
            ],
          },
          {
            type: 'string',
            name: 'tag',
            label: 'Tag (display label)',
            required: true,
            description: 'Short label shown above the headline, e.g. "Scaling"',
          },
          {
            type: 'string',
            name: 'author',
            label: 'Author',
            required: true,
          },
          {
            type: 'datetime',
            name: 'date',
            label: 'Publish date',
            required: true,
          },
          {
            type: 'string',
            name: 'readTime',
            label: 'Read time',
            required: true,
            description: 'e.g. "8 min read"',
          },
          {
            type: 'image',
            name: 'image',
            label: 'Hero image',
          },
          {
            type: 'boolean',
            name: 'draft',
            label: 'Draft (hide from site)',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Body',
            isBody: true,
          },
        ],
      },
    ],
  },
});

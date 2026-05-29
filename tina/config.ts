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
      {
        name: 'article',
        label: 'Articles',
        path: 'src/content/articles',
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
            name: 'category',
            label: 'Category',
            required: true,
            options: [
              { value: 'unit-economics',     label: 'Unit Economics' },
              { value: 'neighborhood-alpha', label: 'Neighborhood Alpha' },
              { value: 'market-entry',       label: 'Market Entry' },
              { value: 'supplier-intel',     label: 'Supplier Intel' },
              { value: 'markets',            label: 'Markets' },
              { value: 'operators',          label: 'Operators' },
              { value: 'suppliers',          label: 'Suppliers' },
              { value: 'investment',         label: 'Investment' },
              { value: 'neighborhood',       label: 'Neighborhood' },
            ],
          },
          {
            type: 'string',
            name: 'tag',
            label: 'Tag (display label)',
            required: true,
            description: 'Short label shown above the headline, e.g. "Unit Economics"',
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
            description: 'e.g. "12 min read"',
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

      // ============================================================
      // MARKET WATCH — short-form stories, news, observations
      // ============================================================
      {
        name: 'marketWatch',
        label: 'Market Watch',
        path: 'src/content/market-watch',
        format: 'md',
        ui: {
          filename: {
            slugify: (values) =>
              (values?.headline || 'untitled')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
          },
        },
        fields: [
          {
            type: 'string',
            name: 'headline',
            label: 'Headline',
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
            name: 'tag',
            label: 'Tag',
            required: true,
            description: 'e.g. "Market Move", "Brand Watch", "Data Point", "Observation"',
          },
          {
            type: 'datetime',
            name: 'date',
            label: 'Publish date',
            required: true,
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

      // ============================================================
      // VIDEOS — episode metadata + YouTube ID
      // ============================================================
      {
        name: 'video',
        label: 'Videos',
        path: 'src/content/videos',
        format: 'md',
        ui: {
          filename: {
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
            name: 'episode',
            label: 'Episode #',
            required: true,
            description: 'Zero-padded, e.g. "01", "12"',
          },
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'youtubeId',
            label: 'YouTube video ID',
            required: true,
            description: 'Just the ID from the URL, e.g. "dQw4w9WgXcQ" (not the full URL)',
          },
          {
            type: 'string',
            name: 'duration',
            label: 'Duration',
            required: true,
            description: 'e.g. "13:42"',
          },
          {
            type: 'string',
            name: 'views',
            label: 'Views',
            description: 'Updated manually, e.g. "24K"',
          },
          {
            type: 'datetime',
            name: 'date',
            label: 'Publish date',
            required: true,
          },
          {
            type: 'boolean',
            name: 'draft',
            label: 'Draft (hide from site)',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Notes / Show description',
            isBody: true,
          },
        ],
      },
    ],
  },
});

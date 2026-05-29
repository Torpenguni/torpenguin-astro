import { defineCollection, z } from 'astro:content';

// TorPenguin posts. Editable via TinaCMS (/admin) — schema mirrors tina/config.ts.
const post = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum([
      'news',
      'case-studies',
      'trends',
      'interviews',
      'how-to',
      'feasibility',
    ]),
    tags: z.array(z.string()).default([]),
    excerpt: z.string(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    author: z.string().default('torpenguin'),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    isPillar: z.boolean().default(false),
    youtubeUrl: z.string().url().optional(),
    isSponsored: z.boolean().default(false),
    sponsorName: z.string().optional(),
    sources: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { post };

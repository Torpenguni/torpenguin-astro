import { defineCollection, z } from 'astro:content';

// Phase 1 uses mock data in src/data/posts.ts.
// Phase 2 wires the `post` collection to TinaCMS (Section 4 of the build spec).
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
    draft: z.boolean().default(false),
  }),
});

export const collections = { post };

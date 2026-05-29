import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    category: z.enum([
      'unit-economics',
      'neighborhood-alpha',
      'market-entry',
      'supplier-intel',
      'markets',
      'operators',
      'suppliers',
      'investment',
      'neighborhood',
      'founder-stories',
      'deals',
      'neighborhood-watch',
      'torpenguin',
    ]),
    tag: z.string(),
    author: z.string().default('SpoonAsia Desk'),
    date: z.coerce.date(),
    readTime: z.string(),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

const marketWatch = defineCollection({
  type: 'content',
  schema: z.object({
    headline: z.string(),
    dek: z.string(),
    tag: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

const videos = defineCollection({
  type: 'content',
  schema: z.object({
    episode: z.string(),
    title: z.string(),
    description: z.string(),
    duration: z.string(),
    views: z.string().default('0'),
    date: z.coerce.date(),
    youtubeId: z.string().default('dQw4w9WgXcQ'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, 'market-watch': marketWatch, videos };

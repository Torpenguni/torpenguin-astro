import { defineCollection, z } from 'astro:content';

// torpenguin.com — long-form essays by Torpenguin.
// Keep the `topic` enum in sync with src/data/topics.ts and tina/config.ts.
const essays = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    topic: z.enum([
      'building',
      'operations',
      'scaling',
      'unit-economics',
      'f-and-b',
    ]),
    tag: z.string(),
    author: z.string().default('Torpenguin'),
    date: z.coerce.date(),
    readTime: z.string(),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

export const collections = { essays };

import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'post'>;

// Flattened shape used by cards/lists (PostCard, PostGrid, archives).
export interface PostMeta {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  excerpt: string;
  author: string;
  publishedAt: Date;
  updatedAt?: Date;
  readingTime: number;
  isSponsored: boolean;
  sponsorName?: string;
}

export interface Author {
  slug: string;
  name: string;
  bio: string;
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

export const getAuthor = (slug: string): Author =>
  authors[slug] ?? authors.torpenguin;

// Thai reading-time estimate from the raw markdown body (~400 chars/min).
export function readingTime(entry: PostEntry): number {
  const chars = (entry.body ?? '').replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 400));
}

export function toMeta(entry: PostEntry): PostMeta {
  return {
    slug: entry.slug,
    title: entry.data.title,
    category: entry.data.category,
    tags: entry.data.tags,
    excerpt: entry.data.excerpt,
    author: entry.data.author,
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    readingTime: readingTime(entry),
    isSponsored: entry.data.isSponsored,
    sponsorName: entry.data.sponsorName,
  };
}

const byNewest = (a: PostEntry, b: PostEntry) =>
  b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

/** All published entries, newest first. */
export async function getAllEntries(): Promise<PostEntry[]> {
  const all = await getCollection('post', ({ data }) => !data.draft);
  return all.sort(byNewest);
}

export async function getAllPosts(): Promise<PostMeta[]> {
  return (await getAllEntries()).map(toMeta);
}

export async function getPostsByCategory(slug: string): Promise<PostMeta[]> {
  return (await getAllEntries()).filter((e) => e.data.category === slug).map(toMeta);
}

export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  return (await getAllEntries()).filter((e) => e.data.tags.includes(tag)).map(toMeta);
}

export async function getAllTags(): Promise<string[]> {
  const all = await getAllEntries();
  return [...new Set(all.flatMap((e) => e.data.tags))];
}

export async function howToCount(tag: string): Promise<number> {
  return (await getPostsByCategory('how-to')).filter((p) => p.tags.includes(tag)).length;
}

export async function getPostsByAuthor(slug: string): Promise<PostMeta[]> {
  return (await getAllEntries()).filter((e) => e.data.author === slug).map(toMeta);
}

/** Single article entry (full data + .render()). */
export async function getPostEntry(slug: string): Promise<PostEntry | undefined> {
  return getEntry('post', slug);
}

/** Related: same category first, then shared tags; never the post itself. */
export async function getRelated(entry: PostEntry, n = 4): Promise<PostMeta[]> {
  const all = await getAllEntries();
  return all
    .filter((e) => e.slug !== entry.slug)
    .map((e) => {
      let score = e.data.category === entry.data.category ? 2 : 0;
      score += e.data.tags.filter((t) => entry.data.tags.includes(t)).length;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.e, b.e))
    .slice(0, n)
    .map((x) => toMeta(x.e));
}

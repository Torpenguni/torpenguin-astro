import type { APIRoute } from 'astro';
import { getAllPosts } from '../lib/content';

const SITE = 'https://torpenguin.com';

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!),
  );

export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/${p.category}/${p.slug}</link>
      <guid>${SITE}/${p.category}/${p.slug}</guid>
      <description>${esc(p.excerpt)}</description>
      <pubDate>${p.publishedAt.toUTCString()}</pubDate>
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TorPenguin</title>
    <link>${SITE}</link>
    <description>สื่อธุรกิจอาหารและร้านอาหาร เจาะลึกเรื่องที่คนทำร้านต้องรู้</description>
    <language>th</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

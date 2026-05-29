import type { APIRoute } from 'astro';
import { getPostsByCategory } from '../lib/content';

const SITE = 'https://torpenguin.com';
const TWO_DAYS = 1000 * 60 * 60 * 24 * 2;

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!),
  );

// Google News sitemap: only /news articles published within the last 48 hours.
export const GET: APIRoute = async () => {
  const now = Date.now();
  const fresh = (await getPostsByCategory('news')).filter(
    (p) => now - p.publishedAt.getTime() < TWO_DAYS,
  );

  const urls = fresh
    .map(
      (p) => `  <url>
    <loc>${SITE}/${p.category}/${p.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>TorPenguin</news:name>
        <news:language>th</news:language>
      </news:publication>
      <news:publication_date>${p.publishedAt.toISOString()}</news:publication_date>
      <news:title>${esc(p.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

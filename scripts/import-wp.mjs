#!/usr/bin/env node
// import-wp.mjs — pull posts from the existing WordPress site into the Astro
// content collection. Downloads images into public/imported, maps WP categories
// to our 6 silos (+ How-to sub-topic tags), cleans the HTML body, and writes
// one markdown file per post.
//
//   node scripts/import-wp.mjs [limit]      # default 15 (pilot)
//
// Re-runnable: overwrites files for the same slugs.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const WP = 'https://torpenguin.com/wp-json/wp/v2';
const LIMIT = Number(process.argv[2] || 15);
const OUT_POSTS = 'src/content/post';
const OUT_IMG = 'public/imported';
const UA = { 'User-Agent': 'Mozilla/5.0 (TorPenguin importer)' };

// WP category slug -> our silo. First match (by PRIORITY) wins as primary.
const CAT_TO_SILO = {
  news: 'news', events: 'news',
  interview: 'interviews', mindset: 'interviews',
  casestudy: 'case-studies',
  restaurant: 'feasibility',
  management: 'how-to', staffmanagement: 'how-to', foodmanagement: 'how-to',
  marketing: 'how-to', restaurantmarketing: 'how-to', accounting: 'how-to',
  findcustomer: 'how-to', restauranttechnology: 'how-to',
};
const PRIORITY = [
  'interview', 'casestudy', 'news', 'events', 'restaurant',
  'marketing', 'restaurantmarketing', 'findcustomer', 'staffmanagement',
  'foodmanagement', 'accounting', 'management', 'restauranttechnology', 'mindset',
];
// WP category slug -> How-to sub-topic tag (cost/marketing/team/systems/menu)
const SUBTOPIC = {
  marketing: 'marketing', restaurantmarketing: 'marketing', findcustomer: 'marketing',
  staffmanagement: 'team',
  management: 'systems', restauranttechnology: 'systems',
  foodmanagement: 'cost', accounting: 'cost',
};
const SKIP_TAGS = new Set(['บทความ', 'article', 'uncategorized', 'Uncategorized']);

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&hellip;/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const yaml = (s) => '"' + String(s).replace(/"/g, "'").replace(/\n/g, ' ').trim() + '"';

async function downloadImage(url, base) {
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return null;
    const ext = (path.extname(new URL(url).pathname) || '.jpg').split('?')[0].toLowerCase();
    const file = `${base}${ext}`;
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(OUT_IMG, file), buf);
    return `/imported/${file}`;
  } catch {
    return null;
  }
}

function cleanHtml(html, title) {
  let h = html;
  // WordPress turns emojis into <img class="emoji" .../> (from s.w.org). Turn
  // them back into the actual character so they don't import as huge images.
  h = h.replace(/<img[^>]*\bclass="emoji"[^>]*>/gi, (m) => m.match(/alt="([^"]*)"/)?.[1] || '');
  h = h.replace(/<img[^>]*src="[^"]*(?:s\.w\.org|\/emoji\/)[^"]*"[^>]*>/gi, (m) => m.match(/alt="([^"]*)"/)?.[1] || '');
  // Strip noisy attributes (Elementor / pasted classes etc.)
  h = h.replace(/\s(class|style|id|dir|role|data-[\w-]+)="[^"]*"/gi, '');
  h = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  // Drop a leading heading that just repeats the title.
  h = h.replace(/^\s*<h[1-6]>([\s\S]*?)<\/h[1-6]>/i, (m, inner) =>
    stripTags(inner).slice(0, 30) === stripTags(title).slice(0, 30) ? '' : m);
  // Remove empty / nbsp-only paragraphs.
  h = h.replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '');
  return h.trim();
}

async function run() {
  await mkdir(OUT_POSTS, { recursive: true });
  await mkdir(OUT_IMG, { recursive: true });

  // id -> {slug,name} for categories
  const cats = await (await fetch(`${WP}/categories?per_page=100&_fields=id,slug,name`, { headers: UA })).json();
  const catById = new Map(cats.map((c) => [c.id, { slug: c.slug, name: decode(c.name) }]));

  const posts = await (await fetch(
    `${WP}/posts?per_page=${LIMIT}&orderby=date&_embed=wp:featuredmedia,wp:term&_fields=slug,date,modified,title,excerpt,content,categories,_links,_embedded`,
    { headers: UA },
  )).json();

  let imgCount = 0;
  for (const p of posts) {
    const slug = p.slug;
    const catSlugs = (p.categories || []).map((id) => catById.get(id)?.slug).filter(Boolean);
    const primary = PRIORITY.find((s) => catSlugs.includes(s));
    const silo = CAT_TO_SILO[primary] || 'how-to';

    // tags: sub-topic + Thai category names + WP tag names
    const subTags = catSlugs.map((s) => SUBTOPIC[s]).filter(Boolean);
    const thaiCatTags = (p.categories || [])
      .map((id) => catById.get(id)?.name).filter(Boolean).filter((n) => !SKIP_TAGS.has(n));
    const wpTerms = (p._embedded?.['wp:term'] || []).flat();
    const wpTags = wpTerms.filter((t) => t.taxonomy === 'post_tag').map((t) => decode(t.name));
    const tags = [...new Set([...subTags, ...thaiCatTags, ...wpTags])];

    // featured image
    const media = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    let image = null;
    if (media) { image = await downloadImage(media, `${slug}-cover`); if (image) imgCount++; }

    // body + inline images
    let body = cleanHtml(p.content.rendered, p.title.rendered);
    const imgUrls = [...body.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
    let n = 0;
    for (const url of [...new Set(imgUrls)]) {
      if (/s\.w\.org|\/emoji\//.test(url)) continue; // skip emoji / decorative
      const local = await downloadImage(url, `${slug}-${++n}`);
      if (local) { body = body.split(url).join(local); imgCount++; }
    }

    const excerpt = stripTags(p.excerpt.rendered) || stripTags(p.content.rendered).slice(0, 160);

    const fm = [
      '---',
      `title: ${yaml(decode(p.title.rendered))}`,
      `category: ${silo}`,
      `tags: [${tags.map(yaml).join(', ')}]`,
      `excerpt: ${yaml(excerpt)}`,
      'author: torpenguin',
      `publishedAt: ${p.date}`,
      `updatedAt: ${p.modified}`,
      ...(image ? [`image: ${yaml(image)}`] : []),
      '---',
      '',
      body,
      '',
    ].join('\n');

    await writeFile(path.join(OUT_POSTS, `${slug}.md`), fm);
    console.log(`✓ ${silo.padEnd(12)} ${slug}`);
  }
  console.log(`\nDone: ${posts.length} posts, ${imgCount} images → ${OUT_IMG}`);
}

run().catch((e) => { console.error(e); process.exit(1); });

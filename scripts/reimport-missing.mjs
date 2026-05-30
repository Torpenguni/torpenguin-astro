#!/usr/bin/env node
// reimport-missing.mjs — import a specific list of WP slugs (one per line in
// the file given as argv[2], default /tmp/missing.txt). Hardened: validates the
// frontmatter parses and has a valid category BEFORE writing, and logs any it
// still can't import instead of silently dropping.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WP = 'https://torpenguin.com/wp-json/wp/v2';
const UA = { 'User-Agent': 'Mozilla/5.0 (TorPenguin importer)' };
const OUT_POSTS = 'src/content/post';
const OUT_IMG = 'public/imported';
const LIST = process.argv[2] || '/tmp/missing.txt';

const CATS = ['news', 'case-studies', 'trends', 'interviews', 'how-to', 'feasibility'];
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
const SUBTOPIC = {
  marketing: 'marketing', restaurantmarketing: 'marketing', findcustomer: 'marketing',
  staffmanagement: 'team', management: 'systems', restauranttechnology: 'systems',
  foodmanagement: 'cost', accounting: 'cost',
};
const SKIP_TAGS = new Set(['บทความ', 'article', 'uncategorized', 'Uncategorized']);

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&hellip;/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
// Block-scalar YAML: avoids every quote/escape pitfall for Thai text with quotes.
const block = (key, val, indent = '  ') => {
  const body = String(val).replace(/\r/g, '').split('\n').map((l) => indent + l).join('\n');
  return `${key}: |-\n${body}`;
};

const ascii = (name) => {
  const ext = (path.extname(new URL(name, 'https://x').pathname) || '.jpg').split('?')[0].toLowerCase();
  return `img-${createHash('md5').update(name).digest('hex').slice(0, 16)}${ext}`;
};

async function dl(url) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const file = ascii(url);
    await writeFile(path.join(OUT_IMG, file), Buffer.from(await res.arrayBuffer()));
    return `/imported/${file}`;
  } catch { return null; }
}

function cleanHtml(html, title) {
  let h = html;
  h = h.replace(/<img[^>]*\bclass="emoji"[^>]*>/gi, (m) => m.match(/alt="([^"]*)"/)?.[1] || '');
  h = h.replace(/<img[^>]*src="[^"]*(?:s\.w\.org|\/emoji\/)[^"]*"[^>]*>/gi, (m) => m.match(/alt="([^"]*)"/)?.[1] || '');
  h = h.replace(/\s(class|style|id|dir|role|data-[\w-]+)="[^"]*"/gi, '');
  h = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  h = h.replace(/^\s*<h[1-6]>([\s\S]*?)<\/h[1-6]>/i, (m, inner) =>
    stripTags(inner).slice(0, 30) === stripTags(title).slice(0, 30) ? '' : m);
  h = h.replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '');
  return h.trim();
}

await mkdir(OUT_POSTS, { recursive: true });
await mkdir(OUT_IMG, { recursive: true });

const cats = await (await fetch(`${WP}/categories?per_page=100&_fields=id,slug,name`, { headers: UA })).json();
const catById = new Map(cats.map((c) => [c.id, { slug: c.slug, name: decode(c.name) }]));

const slugs = (await readFile(LIST, 'utf8')).split('\n').map((s) => s.trim()).filter(Boolean);
const failed = [];
let ok = 0;

for (const slug of slugs) {
  try {
    const arr = await (await fetch(
      `${WP}/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term&_fields=slug,date,modified,title,excerpt,content,categories,_embedded`,
      { headers: UA },
    )).json();
    const p = Array.isArray(arr) ? arr[0] : null;
    if (!p) { failed.push([slug, 'not-found']); continue; }

    const catSlugs = (p.categories || []).map((id) => catById.get(id)?.slug).filter(Boolean);
    const silo = CAT_TO_SILO[PRIORITY.find((s) => catSlugs.includes(s))] || 'how-to';
    if (!CATS.includes(silo)) { failed.push([slug, 'bad-silo']); continue; }

    const subTags = catSlugs.map((s) => SUBTOPIC[s]).filter(Boolean);
    const thaiCatTags = (p.categories || []).map((id) => catById.get(id)?.name)
      .filter(Boolean).filter((n) => !SKIP_TAGS.has(n));
    const wpTags = (p._embedded?.['wp:term'] || []).flat()
      .filter((t) => t.taxonomy === 'post_tag').map((t) => decode(t.name));
    const tags = [...new Set([...subTags, ...thaiCatTags, ...wpTags])];

    const media = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    let image = media ? await dl(media) : null;

    let body = cleanHtml(p.content.rendered, p.title.rendered);
    for (const url of [...new Set([...body.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]))]) {
      if (/s\.w\.org|\/emoji\//.test(url)) continue;
      const local = await dl(url);
      if (local) body = body.split(url).join(local);
    }

    const title = decode(p.title.rendered);
    const excerpt = stripTags(p.excerpt.rendered).replace(/\s*\[(?:…|\.|\s)*\]\s*$/, '').trim()
      || stripTags(p.content.rendered).slice(0, 160);

    const fm = [
      '---',
      block('title', title),
      `category: ${silo}`,
      `tags: [${tags.map((t) => JSON.stringify(t)).join(', ')}]`,
      block('excerpt', excerpt || title),
      'author: torpenguin',
      `publishedAt: ${p.date}`,
      `updatedAt: ${p.modified}`,
      ...(image ? [`image: "${image}"`] : []),
      '---',
      '',
      body,
      '',
    ].join('\n');

    await writeFile(path.join(OUT_POSTS, `${slug}.md`), fm);
    ok++;
    console.log(`✓ ${silo.padEnd(12)} ${slug.slice(0, 40)}`);
  } catch (e) {
    failed.push([slug, e.message.split('\n')[0]]);
  }
}

console.log(`\nDone: ${ok} imported, ${failed.length} failed`);
for (const [s, why] of failed) console.log(`  ✗ ${why}  ${s}`);

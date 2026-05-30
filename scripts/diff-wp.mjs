#!/usr/bin/env node
// diff-wp.mjs — list WP post slugs that are NOT present on disk, with a reason
// when we can tell. Read-only; writes nothing. Helps see what the import missed.

import { readdir } from 'node:fs/promises';

const WP = 'https://torpenguin.com/wp-json/wp/v2';
const UA = { 'User-Agent': 'Mozilla/5.0 (TorPenguin importer)' };
const POST_DIR = 'src/content/post';

const onDisk = new Set(
  (await readdir(POST_DIR)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')),
);

const all = [];
for (let page = 1; ; page++) {
  const res = await fetch(
    `${WP}/posts?per_page=100&page=${page}&orderby=date&_fields=slug,title,status`,
    { headers: UA },
  );
  if (!res.ok) break;
  const batch = await res.json();
  if (!Array.isArray(batch) || batch.length === 0) break;
  all.push(...batch);
  if (batch.length < 100) break;
}

const missing = all.filter((p) => !onDisk.has(p.slug));
console.log(`WP posts: ${all.length} | on disk: ${onDisk.size} | missing: ${missing.length}\n`);
for (const p of missing) console.log(`${p.slug}`);

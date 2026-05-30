#!/usr/bin/env node
// One-time fixer: rename every public/imported image to a pure-ASCII hashed
// name and rewrite all /imported/ references in src/content/post/*.md.
// Removes Thai / URL-encoded filenames that break Astro's static build.

import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const IMG_DIR = 'public/imported';
const POST_DIR = 'src/content/post';

const ascii = (name) => {
  const ext = path.extname(name).toLowerCase() || '.jpg';
  const h = createHash('md5').update(name).digest('hex').slice(0, 16);
  return `img-${h}${ext}`;
};

// Build rename map for every file on disk.
const files = await readdir(IMG_DIR);
const map = new Map(); // oldRef (encoded, as in md) -> new ascii name
const renames = [];
for (const f of files) {
  if (f.startsWith('img-')) continue; // already fixed
  const next = ascii(f);
  renames.push([f, next]);
  // md references use the same encoded string that's on disk
  map.set(`/imported/${f}`, `/imported/${next}`);
}

for (const [from, to] of renames) {
  await rename(path.join(IMG_DIR, from), path.join(IMG_DIR, to));
}
console.log(`Renamed ${renames.length} images.`);

// Rewrite references in markdown.
let touched = 0;
for (const f of (await readdir(POST_DIR)).filter((x) => x.endsWith('.md'))) {
  const p = path.join(POST_DIR, f);
  let s = await readFile(p, 'utf8');
  let changed = false;
  for (const [from, to] of map) {
    if (s.includes(from)) { s = s.split(from).join(to); changed = true; }
  }
  if (changed) { await writeFile(p, s); touched++; }
}
console.log(`Rewrote refs in ${touched} posts.`);

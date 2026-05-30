#!/usr/bin/env node
// gen-redirects.mjs — build public/serve.json so the Railway static server
// (`serve`) issues real 301s from each old flat WordPress URL (/<slug>) to the
// new structured URL (/<category>/<slug>). WP was flat; the new site nests by
// category. Keys are DECODED (real Thai) to match the request path.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'src/content/post';
const RESERVED = new Set([
  'news', 'case-studies', 'trends', 'interviews', 'how-to', 'feasibility',
  'about', 'partner', 'contact', 'privacy', 'terms', 'search', 'watch',
  'tag', 'author', 'admin', 'imported', 'page',
]);

const files = (await readdir(DIR)).filter((f) => f.endsWith('.md'));
const redirects = [];
let skipped = 0;

for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  const body = await readFile(path.join(DIR, f), 'utf8');
  const cat = body.match(/^category:\s*(\S+)/m)?.[1];
  if (!cat) { skipped++; continue; }

  let decoded;
  try { decoded = decodeURIComponent(slug); } catch { decoded = slug; }
  if (RESERVED.has(decoded) || RESERVED.has(slug)) { skipped++; continue; }

  redirects.push({ source: `/${decoded}`, destination: `/${cat}/${decoded}`, type: 301 });
}

// serve (serve-handler) config. `trailingSlash:false` keeps canonical URLs tidy.
const config = { trailingSlash: false, redirects };
await writeFile('public/serve.json', JSON.stringify(config, null, 0) + '\n');
console.log(`Wrote public/serve.json with ${redirects.length} 301s (skipped ${skipped}).`);

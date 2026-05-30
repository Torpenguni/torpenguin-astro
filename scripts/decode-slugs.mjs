#!/usr/bin/env node
// decode-slugs.mjs — rename post files whose name is URL-encoded (%e0%b8...)
// to real Thai characters (NFC-normalised). Astro strips '%' from slugs, which
// mangles these URLs; decoded Thai builds clean /<cat>/<ไทย> URLs that also
// match the old WordPress URLs exactly.

import { readdir, rename } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'src/content/post';
const files = (await readdir(DIR)).filter((f) => f.endsWith('.md') && f.includes('%'));
let n = 0;
for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  let decoded;
  try { decoded = decodeURIComponent(slug).normalize('NFC'); } catch { continue; }
  if (decoded === slug) continue;
  await rename(path.join(DIR, f), path.join(DIR, `${decoded}.md`));
  n++;
}
console.log(`Renamed ${n} encoded slugs to Thai.`);

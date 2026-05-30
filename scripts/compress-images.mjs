#!/usr/bin/env node
// compress-images.mjs — shrink everything in public/imported in place.
// Resizes to max 1200px wide and re-encodes (webp q72 / jpeg q72 / png q80),
// keeping the same filename+extension. Skips files that don't get smaller.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'public/imported';
const MAX_W = 1200;

const files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
let before = 0, after = 0, done = 0, skipped = 0;

for (const f of files) {
  const p = path.join(DIR, f);
  const orig = (await stat(p)).size;
  before += orig;
  try {
    const ext = path.extname(f).toLowerCase();
    let img = sharp(await readFile(p), { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    if (meta.width && meta.width > MAX_W) img = img.resize({ width: MAX_W });
    if (ext === '.png') img = img.png({ quality: 80, compressionLevel: 9 });
    else if (ext === '.webp') img = img.webp({ quality: 72 });
    else img = img.jpeg({ quality: 72, mozjpeg: true });

    const out = await img.toBuffer();
    if (out.length < orig) { await writeFile(p, out); after += out.length; done++; }
    else { after += orig; skipped++; }
  } catch (e) {
    after += orig; skipped++;
    console.warn('skip', f, e.message);
  }
  if ((done + skipped) % 200 === 0) console.log(`  ${done + skipped}/${files.length}`);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB';
console.log(`\nDone. ${done} compressed, ${skipped} kept. ${mb(before)} → ${mb(after)}`);

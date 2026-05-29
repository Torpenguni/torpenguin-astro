// One-time migration: src/data/market-watch.ts + src/data/content.ts (videos)
// → src/content/market-watch/*.md + src/content/videos/*.md
// Run: npx tsx scripts/migrate-market-watch-videos.ts
import { stories } from '../src/data/market-watch';
import { videos } from '../src/data/content';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MW_OUT = resolve(process.cwd(), 'src', 'content', 'market-watch');
const VIDEO_OUT = resolve(process.cwd(), 'src', 'content', 'videos');
mkdirSync(MW_OUT, { recursive: true });
mkdirSync(VIDEO_OUT, { recursive: true });

function escapeYaml(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function dateToISO(humanDate: string): string {
  const d = new Date(humanDate);
  if (Number.isNaN(d.getTime())) return humanDate;
  return d.toISOString().slice(0, 10);
}

// ========== MARKET WATCH (stories) ==========
let mwCount = 0;
for (const s of stories) {
  const fm = [
    '---',
    `headline: "${escapeYaml(s.headline)}"`,
    `dek: "${escapeYaml(s.dek)}"`,
    `tag: "${escapeYaml(s.tag)}"`,
    `date: ${dateToISO(s.date)}`,
    'draft: false',
    '---',
    '',
    s.body,
    '',
  ].join('\n');

  writeFileSync(resolve(MW_OUT, `${s.slug}.md`), fm);
  mwCount++;
  console.log(`  market-watch/${s.slug}.md`);
}

// ========== VIDEOS ==========
let vidCount = 0;
for (const v of videos) {
  const fm = [
    '---',
    `episode: "${escapeYaml(v.episode)}"`,
    `title: "${escapeYaml(v.title)}"`,
    `description: "${escapeYaml(v.description)}"`,
    `duration: "${escapeYaml(v.duration)}"`,
    `views: "${escapeYaml(v.views)}"`,
    `date: ${dateToISO(v.date)}`,
    'youtubeId: "dQw4w9WgXcQ"',
    'draft: false',
    '---',
    '',
    v.description,
    '',
  ].join('\n');

  writeFileSync(resolve(VIDEO_OUT, `${v.slug}.md`), fm);
  vidCount++;
  console.log(`  videos/${v.slug}.md`);
}

console.log(`\n[migrate] Wrote ${mwCount} market-watch entries to ${MW_OUT}`);
console.log(`[migrate] Wrote ${vidCount} videos to ${VIDEO_OUT}`);

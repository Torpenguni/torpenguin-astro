// One-time migration: src/data/content.ts → src/content/articles/*.md
// Run: npx tsx scripts/migrate-articles.ts
import { articles } from '../src/data/content';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'src', 'content', 'articles');
mkdirSync(OUT, { recursive: true });

function escapeYaml(s: string): string {
  // Use double-quoted YAML string; escape backslashes and double quotes.
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function dateToISO(humanDate: string): string {
  // '13 May 2026' -> '2026-05-13'
  const d = new Date(humanDate);
  if (Number.isNaN(d.getTime())) return humanDate;
  return d.toISOString().slice(0, 10);
}

let count = 0;
for (const a of articles) {
  const fm = [
    '---',
    `title: "${escapeYaml(a.title)}"`,
    `dek: "${escapeYaml(a.dek)}"`,
    `category: ${a.category}`,
    `tag: "${escapeYaml(a.tag)}"`,
    `author: "${escapeYaml(a.author)}"`,
    `date: ${dateToISO(a.date)}`,
    `readTime: "${escapeYaml(a.readTime)}"`,
    'draft: false',
    '---',
    '',
    a.body,
    '',
  ].join('\n');

  const path = resolve(OUT, `${a.slug}.md`);
  writeFileSync(path, fm);
  count++;
  console.log(`  ${a.slug}.md`);
}

console.log(`\n[migrate] Wrote ${count} articles to ${OUT}`);

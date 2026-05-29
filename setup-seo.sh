#!/usr/bin/env bash
#
# setup-seo.sh — apply the full SEO + AI-crawler setup to torpenguin.com (Astro 4).
# Run from the project root:  bash setup-seo.sh
#
# Idempotent: safe to run more than once. Writes robots.txt, llms.txt,
# astro.config.mjs, BaseLayout.astro, patches essays/[slug].astro, installs
# the sitemap integration, and builds to verify.

set -euo pipefail

# --- sanity check: must run from the project root ---
if [ ! -f package.json ] || [ ! -d src/layouts ]; then
  echo "ERROR: run this from the torpenguin-astro project root (package.json + src/layouts not found)." >&2
  exit 1
fi

echo "==> 1/6  Installing @astrojs/sitemap@3.2.1 (Astro 4 compatible)"
npm install @astrojs/sitemap@3.2.1

echo "==> 2/6  Writing astro.config.mjs"
cat > astro.config.mjs <<'CONFIG_EOF'
// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://torpenguin.com',

  build: {
    inlineStylesheets: 'auto',
  },

  vite: {
    preview: {
      allowedHosts: true,
    },
  },

  integrations: [sitemap()],
});
CONFIG_EOF

echo "==> 3/6  Writing public/robots.txt"
mkdir -p public
cat > public/robots.txt <<'ROBOTS_EOF'
# torpenguin.com — open to all crawlers, including AI.
# We *want* this content surfaced in search and AI answers.

User-agent: *
Allow: /

# Keep crawlers out of the CMS admin only.
Disallow: /admin/

# AI / LLM crawlers — explicitly welcome.
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://torpenguin.com/sitemap-index.xml
ROBOTS_EOF

echo "==> 4/6  Writing public/llms.txt"
cat > public/llms.txt <<'LLMS_EOF'
# Torpenguin

> Essays on building, operating, and scaling food & beverage businesses in Asia — by Torpenguin, founder of Penguin Eat Shabu (40+ outlets, Bangkok).

Torpenguin writes long-form, first-hand essays drawn from a decade of building a
restaurant group from one shop to forty-plus outlets. The focus is the decisions
that actually decide whether an F&B business lives or dies: unit economics,
leasing, hiring and firing, operations, and the failure modes of growth.

## Essays

- [Why I'm writing about the business I spent a decade building](https://torpenguin.com/essays/why-i-write): Why these lessons never made it into a deck — and why he's writing them down now.
- [Unit economics before the lease](https://torpenguin.com/essays/unit-economics-before-the-lease): Pricing a lease against realistic table turns, and the math most restaurant plans get wrong.
- [Forty outlets: what scaling actually changed](https://torpenguin.com/essays/forty-outlets-scaling): What breaks when one outlet becomes forty — systems, hiring, and growth failure modes.

## Topics

- [Building](https://torpenguin.com/essays/building): Starting things from zero — brands, teams, and the messy first years.
- [Operations](https://torpenguin.com/essays/operations): The daily craft of running outlets.
- [Scaling](https://torpenguin.com/essays/scaling): What changes when one outlet becomes forty.
- [Unit Economics](https://torpenguin.com/essays/unit-economics): Rent, labor, margin, and the numbers underneath a restaurant.
- [F&B Industry](https://torpenguin.com/essays/f-and-b): Reading the wider food-and-beverage landscape in Thailand and across Asia.

## More

- [All essays](https://torpenguin.com/essays)
- [About](https://torpenguin.com/about)
- [Contact](https://torpenguin.com/contact)
LLMS_EOF

echo "==> 5/6  Writing src/layouts/BaseLayout.astro"
cat > src/layouts/BaseLayout.astro <<'BASE_EOF'
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description: string;
  /** Page type — drives og:type and JSON-LD shape. */
  type?: 'website' | 'article';
  /** Social-share image path (absolute or site-relative). Falls back to the site default. */
  image?: string;
  /** ISO date — only used for articles. */
  publishedDate?: string;
  /** Author name — only used for articles. */
  author?: string;
  /** Section/tag — only used for articles. */
  section?: string;
  /** Set true to keep this page out of search indexes. */
  noindex?: boolean;
}

const {
  title,
  description,
  type = 'website',
  image = '/penguin.png',
  publishedDate,
  author = 'Torpenguin',
  section,
  noindex = false,
} = Astro.props;

const SITE = 'https://torpenguin.com';
// Canonical URL for the current page, normalised against the configured site.
const canonical = new URL(Astro.url.pathname, Astro.site ?? SITE).href;
const imageUrl = new URL(image, Astro.site ?? SITE).href;

// Author identity reused across JSON-LD blocks.
const person = {
  '@type': 'Person',
  name: 'Torpenguin',
  url: SITE,
  description:
    'Founder of Penguin Eat Shabu (40+ outlets, Bangkok). Writes about building, operating, and scaling F&B businesses in Asia.',
};

// Structured data: a WebSite node on every page, plus a BlogPosting on articles.
const jsonLd: Record<string, unknown>[] = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Torpenguin',
    url: SITE,
    description:
      'Essays on building, operating, and scaling food & beverage businesses in Asia.',
    author: person,
  },
];

if (type === 'article') {
  jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title.replace(/ — Torpenguin$/, ''),
    description,
    url: canonical,
    mainEntityOfPage: canonical,
    image: imageUrl,
    author: { '@type': 'Person', name: author, url: SITE },
    publisher: person,
    ...(publishedDate ? { datePublished: publishedDate } : {}),
    ...(section ? { articleSection: section } : {}),
  });
}
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  {noindex
    ? <meta name="robots" content="noindex, nofollow" />
    : <meta name="robots" content="index, follow, max-image-preview:large" />}
  <link rel="canonical" href={canonical} />
  <meta name="theme-color" content="#faf6ef" />

  {/* Open Graph */}
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonical} />
  <meta property="og:site_name" content="Torpenguin" />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:locale" content="en_US" />
  {type === 'article' && publishedDate && (
    <meta property="article:published_time" content={publishedDate} />
  )}
  {type === 'article' && <meta property="article:author" content={author} />}
  {type === 'article' && section && (
    <meta property="article:section" content={section} />
  )}

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

  <link rel="icon" type="image/png" href="/penguin.png" />

  {jsonLd.map((node) => (
    <script type="application/ld+json" set:html={JSON.stringify(node)} />
  ))}
</head>
<body>
  <Nav />
  <slot />
  <Footer />
</body>
</html>
BASE_EOF

echo "==> 6/6  Patching src/pages/essays/[slug].astro (BaseLayout props)"
node - <<'PATCH_EOF'
const fs = require('fs');
const file = 'src/pages/essays/[slug].astro';
let src = fs.readFileSync(file, 'utf8');

if (src.includes("type={isTopic ? 'website' : 'article'}")) {
  console.log('   already patched — skipping');
  process.exit(0);
}

const oldBlock =
`  description={isTopic ? topic!.description : essay!.dek}
>`;
const newBlock =
`  description={isTopic ? topic!.description : essay!.dek}
  type={isTopic ? 'website' : 'article'}
  publishedDate={!isTopic ? entry!.data.date.toISOString() : undefined}
  author={!isTopic ? essay!.author : undefined}
  section={!isTopic ? essay!.tag : undefined}
  image={!isTopic && entry!.data.image ? entry!.data.image : undefined}
>`;

if (!src.includes(oldBlock)) {
  console.error('   ERROR: could not find the BaseLayout block to patch. Patch manually.');
  process.exit(1);
}

src = src.replace(oldBlock, newBlock);
fs.writeFileSync(file, src);
console.log('   patched');
PATCH_EOF

echo "==> Building to verify"
npm run build

echo
echo "DONE. Verify these exist in dist/:"
echo "  dist/robots.txt  dist/llms.txt  dist/sitemap-index.xml  dist/sitemap-0.xml"
echo
echo "Optional next steps:"
echo "  - Add a 1200x630 public/og-default.png and change the BaseLayout default image to '/og-default.png'"
echo "  - Submit https://torpenguin.com/sitemap-index.xml in Google Search Console after deploy"

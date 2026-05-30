#!/usr/bin/env bash
#
# setup-all.sh — one-shot setup for torpenguin.com: SEO assets + "Yellow Pop" theme.
# Run from the project root:  bash setup-all.sh
#
# SAFE & IDEMPOTENT — run it as many times as you like:
#   • skips work that is already done (sitemap install, astro.config)
#   • does NOT overwrite BaseLayout.astro (it already carries the live SEO)
#
# What it does:
#   1. Ensures @astrojs/sitemap is installed + wired into astro.config.


#   3. Yellow Pop theme — rewrites the colour variables in src/styles/global.css.
#   4. Sweeps `color: var(--accent)` -> `--accent-ink` (yellow text on white is unreadable).
#   5. Fixes the 3 buttons that put light text on a yellow fill -> dark text.
#   6. Colours article headings (h2/h3) with --accent-heading (dark yellow #D9920A).
#   7. Builds to verify.

set -euo pipefail

if [ ! -f package.json ] || [ ! -f src/styles/global.css ]; then
  echo "ERROR: run this from the torpenguin-astro project root." >&2
  exit 1
fi

# ----------------------------------------------------------------------------
echo "==> 1/7  Sitemap integration"
if node -e "require.resolve('@astrojs/sitemap')" 2>/dev/null; then
  echo "   @astrojs/sitemap already installed"
else
  echo "   installing @astrojs/sitemap@3.2.1 (Astro 4 compatible)"
  npm install @astrojs/sitemap@3.2.1
fi
if ls astro.config.* >/dev/null 2>&1 && grep -q "sitemap" astro.config.* ; then
  echo "   astro.config already wires sitemap()"
else
  echo "   NOTE: add  import sitemap from '@astrojs/sitemap'  and  integrations: [sitemap()]  to astro.config manually"
fi

# ----------------------------------------------------------------------------
echo "==> 2/7  Writing public/robots.txt"
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
echo "   done"

# ----------------------------------------------------------------------------
echo "==> 3/7  Rewriting colour variables in src/styles/global.css"
node - <<'NODE_EOF'
const fs = require('fs');
const file = 'src/styles/global.css';
let css = fs.readFileSync(file, 'utf8');

// Yellow Pop palette.
const vars = {
  'paper':           '#FFFFFF',
  'paper-pure':      '#FFFFFF',
  'paper-warm':      '#FFFBEA',
  'paper-mute':      '#FFF7D1',
  'paper-soft':      '#FFFBEA',
  'ink':             '#0A0A0A',
  'ink-soft':        '#2E2E33',
  'ink-faint':       '#6B6B72',
  'ink-mute':        '#9A9AA2',
  'hairline':        '#F1E7B0',
  'hairline-strong': '#E3D078',
  'accent':          '#FFD400',
  'accent-deep':     '#E6B800',
  'accent-soft':     '#FFE680',
  'accent-ink':      '#7A5E00',
  'accent-heading':  '#D9920A',
  'on-accent':       '#0A0A0A',
  'signal-warning':  '#E6B800',
};

// Replace any existing `--name: value;` (whatever the current value is).
for (const [name, val] of Object.entries(vars)) {
  const re = new RegExp(`(--${name}\\s*:\\s*)[^;]+;`);
  if (re.test(css)) css = css.replace(re, `$1${val};`);
}

// These may not exist on the original (orange) theme — insert them after --accent-soft.
const ensure = (name, val) => {
  if (new RegExp(`--${name}\\s*:`).test(css)) return;
  css = css.replace(/(--accent-soft\s*:\s*[^;]+;\n)/, `$1  --${name}: ${val};\n`);
};
ensure('accent-ink', '#7A5E00');
ensure('accent-heading', '#D9920A');
ensure('on-accent', '#0A0A0A');

fs.writeFileSync(file, css);
console.log('   colour variables set');
NODE_EOF

# ----------------------------------------------------------------------------
echo "==> 4/7  Sweeping accent text colour -> --accent-ink across src/"
# `background: var(--accent)` has no "color:" prefix, so fills stay bright yellow.
# `|| true`: on a re-run there may be no matches left, and grep exits 1 under pipefail.
grep -rl "color: var(--accent)" src --include="*.astro" --include="*.css" 2>/dev/null | while read -r f; do
  sed -i '' 's/color: var(--accent)/color: var(--accent-ink)/g' "$f"
done || true
echo "   done"

# ----------------------------------------------------------------------------
echo "==> 5/7  Fixing light-text-on-yellow buttons -> dark text"
node - <<'NODE_EOF'
const fs = require('fs');
const fixes = [
  ['src/styles/global.css',
    /(\.btn-inverted:hover\s*\{[^}]*?color:\s*)var\(--paper\)/, '$1var(--on-accent)'],
  ['src/components/Footer.astro',
    /(\.tp-news-btn\s*\{[^}]*?background:\s*var\(--accent\);\s*\n\s*color:\s*)#fff/, '$1var(--on-accent)'],
  ['src/pages/404.astro',
    /(\.nf-home\s*\{[^}]*?background:\s*var\(--accent\);\s*color:\s*)#fff/, '$1var(--on-accent)'],
];
for (const [file, re, rep] of fixes) {
  if (!fs.existsSync(file)) { console.log('   skip (missing):', file); continue; }
  let s = fs.readFileSync(file, 'utf8');
  if (re.test(s)) { fs.writeFileSync(file, s.replace(re, rep)); console.log('   fixed:', file); }
  else console.log('   already ok:', file);
}
NODE_EOF

# ----------------------------------------------------------------------------
echo "==> 6/7  Colouring article headings (h2/h3) -> --accent-heading"
node - <<'NODE_EOF'
const fs = require('fs');
const file = 'src/pages/[category]/[slug].astro';
if (!fs.existsSync(file)) { console.log('   skip (missing):', file); process.exit(0); }
let s = fs.readFileSync(file, 'utf8');
let changed = 0;
for (const tag of ['h2', 'h3']) {
  const re = new RegExp(`(\\.prose :global\\(${tag}\\)\\s*\\{[^}]*?color:\\s*)var\\(--[a-z-]+\\)`);
  if (re.test(s)) { s = s.replace(re, '$1var(--accent-heading)'); changed++; }
}
fs.writeFileSync(file, s);
console.log(changed ? `   set ${changed} heading rule(s)` : '   no .prose h2/h3 rules found (skipped)');
NODE_EOF

# ----------------------------------------------------------------------------
echo "==> 7/7  Building to verify"
npm run build

echo
echo "DONE — SEO assets + Yellow Pop theme applied. Preview with:  npm run dev"

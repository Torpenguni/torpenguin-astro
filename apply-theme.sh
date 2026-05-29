#!/usr/bin/env bash
#
# apply-theme.sh — apply the "Yellow Pop" theme (ขาว + ดำ + เหลือง) to torpenguin.com.
# Run from the project root:  bash apply-theme.sh
#
# What it does (idempotent — safe to run more than once):
#   1. Rewrites the colour variables in src/styles/global.css
#      (adds --accent-ink / --on-accent if the file doesn't have them yet).
#   2. Sweeps `color: var(--accent)` -> `var(--accent-ink)` across src
#      (bright yellow as TEXT on white is unreadable; gold reads fine).
#   3. Fixes the 3 buttons that put light text on a yellow fill -> dark text.
#   4. Colours article headings (h2/h3) with --accent-heading (dark yellow).
#   5. Builds to verify.

set -euo pipefail

if [ ! -f package.json ] || [ ! -f src/styles/global.css ]; then
  echo "ERROR: run this from the torpenguin-astro project root." >&2
  exit 1
fi

echo "==> 1/5  Rewriting colour variables in src/styles/global.css"
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
  css = css.replace(
    /(--accent-soft\s*:\s*[^;]+;\n)/,
    `$1  --${name}: ${val};\n`
  );
};
ensure('accent-ink', '#7A5E00');
ensure('accent-heading', '#D9920A');
ensure('on-accent', '#0A0A0A');

fs.writeFileSync(file, css);
console.log('   colour variables set');
NODE_EOF

echo "==> 2/5  Sweeping accent text colour -> --accent-ink across src/"
# `background: var(--accent)` has no "color:" prefix, so fills stay bright yellow.
# `|| true`: on a re-run there may be no matches left, and grep exits 1 under pipefail.
grep -rl "color: var(--accent)" src --include="*.astro" --include="*.css" 2>/dev/null | while read -r f; do
  sed -i '' 's/color: var(--accent)/color: var(--accent-ink)/g' "$f"
done || true
echo "   done"

echo "==> 3/5  Fixing light-text-on-yellow buttons -> dark text"
node - <<'NODE_EOF'
const fs = require('fs');
const fixes = [
  // [file, search, replace]
  ['src/styles/global.css',
    /(\.btn-inverted:hover\s*\{[^}]*?color:\s*)var\(--paper\)/,
    '$1var(--on-accent)'],
  ['src/components/Footer.astro',
    /(\.tp-news-btn\s*\{[^}]*?background:\s*var\(--accent\);\s*\n\s*color:\s*)#fff/,
    '$1var(--on-accent)'],
  ['src/pages/404.astro',
    /(\.nf-home\s*\{[^}]*?background:\s*var\(--accent\);\s*color:\s*)#fff/,
    '$1var(--on-accent)'],
];
for (const [file, re, rep] of fixes) {
  if (!fs.existsSync(file)) { console.log('   skip (missing):', file); continue; }
  let s = fs.readFileSync(file, 'utf8');
  if (re.test(s)) { fs.writeFileSync(file, s.replace(re, rep)); console.log('   fixed:', file); }
  else console.log('   already ok:', file);
}
NODE_EOF

echo "==> 4/5  Colouring article headings (h2/h3) -> --accent-heading"
node - <<'NODE_EOF'
const fs = require('fs');
const file = 'src/pages/[category]/[slug].astro';
if (!fs.existsSync(file)) { console.log('   skip (missing):', file); process.exit(0); }
let s = fs.readFileSync(file, 'utf8');
// Set the colour of the h2/h3 rules inside .prose, whatever it currently is.
let changed = 0;
for (const tag of ['h2', 'h3']) {
  const re = new RegExp(`(\\.prose :global\\(${tag}\\)\\s*\\{[^}]*?color:\\s*)var\\(--[a-z-]+\\)`);
  if (re.test(s)) { s = s.replace(re, '$1var(--accent-heading)'); changed++; }
}
fs.writeFileSync(file, s);
console.log(changed ? `   set ${changed} heading rule(s)` : '   no .prose h2/h3 rules found (skipped)');
NODE_EOF

echo "==> 5/5  Building to verify"
npm run build

echo
echo "DONE — Yellow Pop theme applied. Preview with:  npm run dev"

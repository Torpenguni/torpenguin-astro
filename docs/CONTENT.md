# SpoonAsia — Content Guide

How to add, edit, and publish content on SpoonAsia. Three workflows depending on who you are and what you're doing.

---

## 1. The three content types

| Type | URL | Schema | Edited via |
|---|---|---|---|
| **Article** | `/analysis/<slug>` | [src/content/config.ts](../src/content/config.ts) — `articles` | TinaCMS (recommended) or Markdown |
| **Market Watch** | `/market-watch/<slug>` | `market-watch` collection | TinaCMS or Markdown |
| **Video** | `/videos/<slug>` | `videos` collection | TinaCMS or Markdown |

Tickers update automatically via a GitHub Actions cron (no editing required).

---

## 2. Three ways to add content

### A. Via TinaCMS admin (best for editors)

1. Go to `https://spoonasia.com/admin/` (or production URL during DNS setup)
2. Click **Log in** → authenticate via TinaCloud
3. Sidebar → click **Articles**, **Market Watch**, or **Videos**
4. Click **+ Create New** or edit an existing entry
5. Fill the visual form, write body in the rich-text editor
6. Toggle **Draft** to hide from site while editing
7. Click **Save** — commits to GitHub `main`, Railway redeploys in 2–3 min

**Pros:** visual, no git knowledge needed, drag-drop images via Media Manager.
**Cons:** can't bulk-edit or copy-paste between entries easily.

### B. Via Claude Code slash commands (best for fast drafts)

If you're in this repo with Claude Code (VS Code extension), use:

| Command | Purpose |
|---|---|
| `/draft-article <topic>` | Generate a 900–1,400 word Analysis draft |
| `/draft-story <topic>` | Generate a 250–500 word Market Watch story |
| `/draft-video <ep> \| <title> \| <youtube ID> \| <duration>` | Add a video entry |

Each command:
1. Generates the `.md` file with correct frontmatter
2. Runs `npm run build` to verify
3. Asks before committing + pushing
4. Defaults to `draft: true` so it appears in /admin as Draft

You can then refine in /admin and uncheck Draft to publish.

**Pros:** AI does the formatting, frontmatter, and house-style enforcement.
**Cons:** still requires you to review before publish.

### C. Via direct VS Code (best for power users)

Edit `.md` files directly under `src/content/<collection>/`. Frontmatter must match the schema in [src/content/config.ts](../src/content/config.ts). Commit and push — TinaCloud reindexes within ~30 seconds.

**Pros:** total control, easy to bulk-edit.
**Cons:** manual schema discipline, no visual preview.

---

## 3. Frontmatter reference

### Articles (`src/content/articles/<slug>.md`)

```yaml
---
title: "Why foreign coffee chains keep failing in Thailand"
dek: "Three international chains entered in 2023. Two are closing outlets in 2025."
category: unit-economics      # see list below
tag: "Unit Economics"         # display label (Title Case)
author: "SpoonAsia Desk"
date: 2026-05-13              # YYYY-MM-DD
readTime: "12 min read"
draft: false                  # true = hide from site
image: "/images/hero.jpg"     # optional, leave out if none
---
```

Valid categories:
- `unit-economics` · `neighborhood-alpha` · `market-entry` · `supplier-intel`
- `markets` · `operators` · `suppliers` · `investment` · `neighborhood`

### Market Watch (`src/content/market-watch/<slug>.md`)

```yaml
---
headline: "Starbucks closes 4 Bangkok outlets in Q1 2026"
dek: "Locations on Silom, Asok, and Phrom Phong."
tag: "Market Move"            # Market Move | Brand Watch | Data Point | Observation | Field Note
date: 2026-05-11
draft: false
---
```

### Videos (`src/content/videos/<slug>.md`)

```yaml
---
episode: "03"                 # zero-padded
title: "How Bangkok rent prices a brand out of existence"
description: "A walkthrough of three failed Sukhumvit flagships..."
youtubeId: "dQw4w9WgXcQ"      # 11-char ID from YouTube URL
duration: "13:42"             # MM:SS
views: "24K"                  # manually updated
date: 2026-05-10
draft: false
---
```

---

## 4. Voice & style guide

The SpoonAsia voice has four rules:

1. **Operator-first.** Write like someone who has lived the P&L.
2. **Terse.** Sentences average 12–18 words. Cut every clause that doesn't carry information.
3. **Specific.** Real neighborhoods (Ari, Thonglor, Phra Khanong), real tickers (MINT, CPF, AU), real numbers with sources.
4. **No hype.** No "leverage", "ecosystem", "synergies", "in the X space", "is poised to".

### Good opening

> Three foreign coffee chains entered Thailand in 2023. By Q4 2025, two are quietly closing outlets across Bangkok. One is expanding into Chiang Mai and Phuket.

### Bad opening

> Thailand's F&B sector is undergoing a transformation as international brands seek to leverage local opportunities in this dynamic market.

### Formatting conventions

- **Em-dashes** for ranges and asides: ` — ` (spaced)
- **Currency**: `฿21.50`, `$95/sqm` (no spaces)
- **Percentages**: `34%`, `−22 pts` (use proper minus character)
- **Dates in body**: `13 May 2026` (DD MMM YYYY)
- **Pull quote**: `> "quote text" — attribution` in Markdown blockquote
- **Internal links**: `[text](/analysis/<slug>)` — relative paths only
- **Headings in body**: `## H2` for section breaks; avoid H1 (page title is the H1)

---

## 5. Images

### Upload via TinaCMS

1. /admin sidebar → **Media Manager** → drag-drop or upload
2. Files save to `public/images/` and commit to git automatically
3. Reference in frontmatter: `image: "/images/<filename>"`

### Sizes

| Use case | Recommended dimensions | Format |
|---|---|---|
| Hero (article header) | 1600 × 900 (16:9) | WebP or JPG, < 300KB |
| Inline figure | 1200 × 800 | WebP or JPG |
| Avatar/portrait | 200 × 200 (square) | WebP |

### Caption pattern (in markdown body)

```markdown
![Sukhumvit Road, 09:00. Foot traffic doesn't equal customer traffic.](/images/sukhumvit-morning.webp)
```

---

## 6. Publishing flow

```
Draft created
  ↓
draft: true → visible in /admin only
  ↓
Editor reviews + refines
  ↓
Toggle draft: false → Save
  ↓
TinaCMS commits to GitHub main
  ↓
Railway redeploys (2-3 min)
  ↓
Live on spoonasia.com
```

To unpublish: re-edit, toggle `draft: true`, Save. Article 404s but file stays in repo.

To delete permanently: remove the .md file from `src/content/<collection>/`, commit, push.

---

## 7. Common pitfalls

| Problem | Cause | Fix |
|---|---|---|
| Article shows but body is blank | Forgot blank line between frontmatter `---` and body | Add a blank line after closing `---` |
| Date shows as "Invalid Date" | Frontmatter date in wrong format | Use `YYYY-MM-DD` only, not `13 May 2026` |
| Category page 404 | Category slug in frontmatter doesn't match the 9 allowed values | Check list in section 3 |
| Build fails after Save in /admin | Schema validation error in frontmatter | Check Railway build logs; fix the offending field |
| Slug change breaks shared links | Editing slug after publish = URL change | Don't change slug post-publish; create redirect instead |
| Two editors save same entry | Last save wins (no conflict UI) | Communicate; use Event Log to see who edited what |

---

## 8. When in doubt

- **Style question:** read 2–3 existing articles in `src/content/articles/` and match their voice
- **Schema question:** check `src/content/config.ts` (the source of truth for fields and types)
- **TinaCMS bug:** check TinaCloud event log at `https://app.tina.io/projects/<project-id>/events`
- **Build failing:** Railway → Deployments → click the failed deploy → read build logs

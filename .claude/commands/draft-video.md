---
description: Add a new Video episode entry — frontmatter + show notes — saved to src/content/videos/
---

You are adding a new Video episode for SpoonAsia. This is for an episode that already exists on YouTube (or will be uploaded), not for generating the video itself.

## Input

$ARGUMENTS

Expected format: `<episode#> | <title> | <youtube ID> | <duration>` — e.g.
> `04 | The Phra Khanong land grab, decoded | abc123XYZ | 14:08`

If the user gives free-form input, parse what you can and ask for missing fields.

## What to produce

A new entry in `src/content/videos/<slug>.md`. Default **draft: true** so the editor can review notes before publishing.

## Steps

1. **Generate slug** from title — kebab-case, max 60 chars.

2. **Frontmatter:**
   ```
   ---
   episode: "<zero-padded number — 01, 02, 12>"
   title: "<sentence case, no period>"
   description: "<1–2 sentence summary of what the episode covers>"
   youtubeId: "<11-char YouTube video ID, e.g. dQw4w9WgXcQ>"
   duration: "<MM:SS or H:MM:SS>"
   views: "0"
   date: <YYYY-MM-DD>
   draft: true
   ---
   ```

3. **Body** — optional show notes (markdown). If the user didn't provide notes, generate a 100–200 word description that:
   - Names what the episode covers
   - Lists 3–5 key takeaways as bullet points
   - References any Analysis articles the episode supports

4. **Verify** with `npm run build`. If errors, fix and re-run.

5. **Summarize and ask** "Commit + push as draft? (yes/no)". Commit message: `draft(video): EP. <NN> <title>`.

## Style notes

Episode titles should match Analysis voice — specific, contrarian, P&L-grounded. Avoid:
- Generic "Top 5..." / "How to..." / "The future of..."
- Brand promotions
- Vague "deep dive"

Good: "How Bangkok rent prices a brand out of existence" · "Reading Ari like an urban architect"
Bad: "Top 10 Bangkok restaurants" · "The future of Thai F&B"

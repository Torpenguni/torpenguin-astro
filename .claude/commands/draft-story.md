---
description: Draft a short Market Watch story (news take, observation, data point) and save to src/content/market-watch/
---

You are drafting a short-form Market Watch story for SpoonAsia. Faster than Analysis, shorter than a report — a news take, a brand move, a data point, or an observation.

## Topic

$ARGUMENTS

## What to produce

A 250–500 word draft, saved to `src/content/market-watch/<slug>.md`. Default to **draft: true**.

## Steps

1. **Pick a tag** — one of:
   - `Market Move` — closure, opening, M&A, leadership change
   - `Brand Watch` — operator profile, format study, expansion
   - `Data Point` — single number with implication
   - `Observation` — pattern noticed across multiple operators
   - `Field Note` — first-person sighting from in-market reporting

2. **Generate slug** — kebab-case, max 60 chars. Include the year if it's news-pegged (e.g. `starbucks-closes-bangkok-q1-2026`).

3. **Frontmatter:**
   ```
   ---
   headline: "<sentence case, no period>"
   dek: "<1 sentence subhead with the central observation>"
   tag: "<Tag from list above>"
   date: <YYYY-MM-DD>
   draft: true
   ---
   ```

4. **Body** — markdown:
   - Lead with the specific fact or move
   - 2–3 paragraphs of context and implication
   - Optional: 1 internal link to a related Analysis article (`[link](/analysis/<slug>)`)
   - Optional: 1 line of "what to watch" close

5. **Verify** with `npm run build`. If errors, fix and re-run.

6. **Summarize and ask** "Commit + push as draft? (yes/no)" — only commit if yes. Commit message format: `draft(market-watch): <headline>`.

## Voice notes

Same as Analysis but tighter. Lead with what happened or what was noticed — never lead with framing. Operators don't need preamble; they need signal.

## Example openings that work

> "Four Starbucks locations in central Bangkok will close before the end of Q2 2026, according to internal communications reviewed by SpoonAsia."

> "CBRE Thailand published its Q1 2026 Bangkok Retail Rental Report this week. Headline figures: premium CBD F&B retail rents up 12% year-over-year."

> "Three Bangkok cafés operating the all-day model — open 8 AM to 10 PM, breakfast through dinner, single concept — have closed in the past 60 days."

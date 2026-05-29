---
description: Draft a long-form Analysis article and save as Markdown in src/content/articles/
---

You are drafting a new long-form Analysis article for SpoonAsia — F&B intelligence for international operators evaluating Thailand.

## Topic

$ARGUMENTS

## What to produce

A 900–1,400 word draft, saved to `src/content/articles/<slug>.md` with the frontmatter schema below. Default to **draft: true** so it appears in /admin but not on the public site until the editor unchecks it.

## Steps

1. **Parse the topic.** Pick the best category from this list (the slug must match exactly):
   - `unit-economics` — rent, labor, COGS, payback, margin
   - `neighborhood-alpha` — Bangkok zones, rent curves, location strategy
   - `market-entry` — partner structures, license traps, foreign-operator playbooks
   - `supplier-intel` — importers, duopolies, ingredient flow
   - `markets` — macro signals (rents, vacancies, REIT yields, ticker movements)
   - `operators` — chain profiles, growth playbooks, format studies
   - `suppliers` — supply chain dynamics, distributor analyses
   - `investment` — family office, PE, cross-border deal flow
   - `neighborhood` — street-level reads of specific zones

2. **Generate slug** — kebab-case from the title, max 60 chars. Avoid stop words. Examples: `why-foreign-coffee-chains-fail-thailand`, `phra-khanong-frontier`.

3. **Write frontmatter** exactly like this:
   ```
   ---
   title: "<headline, sentence case, no period>"
   dek: "<1–2 sentence subhead with the central tension>"
   category: <category-slug>
   tag: "<Display label, Title Case — e.g. Unit Economics>"
   author: "SpoonAsia Desk"
   date: <today's date as YYYY-MM-DD>
   readTime: "<N> min read"
   draft: true
   ---
   ```

4. **Write the body** in markdown. Include:
   - Opening paragraph that names a specific tension (numbers > generalizations)
   - At least one `## H2 subhead` breaking the piece into 2–3 sections
   - At least one pull quote in blockquote form: `> "quote text" — attribution`
   - At least one internal link to another article if the topic connects (`[link text](/analysis/<slug>)`)
   - Closing line that leaves the reader with a verdict or a question

5. **Verify** — run `npm run build` and report any errors. If build fails, fix and re-run before reporting back.

6. **Summarize for the user** — one paragraph: what the article argues, where the draft sits, what's missing (image, sources, etc.). Then ASK:
   > "Commit + push as draft? (yes/no)"

7. **If yes** — commit with message `draft(<category>): <title>` and push. The editor will see it in /admin under Articles, marked Draft, ready to refine and publish.

## Voice & style guide

- **Operator-first.** Write like someone who has lived the P&L, not someone summarizing a report.
- **Terse.** Cut every clause that doesn't carry information. Sentences average 12–18 words.
- **Specific.** Use real Bangkok neighborhood names (Ari, Thonglor, Phra Khanong, not "Bangkok"). Real ticker symbols (MINT, CPF, AU) where relevant.
- **Data with caveats.** If you state a number, say where it came from (CBRE, operator interview, field obs) or label it an estimate.
- **Em-dashes for ranges and asides** — like this. Spaced ` — ` not `—`.
- **No**: consultancy-speak ("leverage", "ecosystem", "synergies"), TED phrasing, generic startup language, "X is poised to Y", "in the F&B space".
- **Yes**: P&L language, neighborhood names, dollar/baht figures with `$` or `฿`, specific dates, operator anecdotes (anonymized).

## Example opening that works

> "Three foreign coffee chains entered Thailand in 2023. By Q4 2025, two are quietly closing outlets across Bangkok. One is expanding into Chiang Mai and Phuket. The brands had similar capital, similar coffee, and similar marketing budgets."

## Example opening that doesn't

> "Thailand's F&B sector is undergoing a transformation as international brands seek to leverage local opportunities in this dynamic market."

# torpenguin.com

Astro-based personal site for **Torpenguin** — essays on building, operating, and scaling F&B in Asia.

Torpenguin built Penguin Eat Shabu (40+ outlets in Bangkok) and runs SpoonAsia. This is his personal site, separate from SpoonAsia.

## 🚀 Quick Start (Local Development)

### First-time setup

Open Terminal, `cd` into this folder, then run:

```bash
npm install
```

(This downloads all the components Astro needs. Takes ~1–2 minutes the first time.)

### Run the dev server

```bash
npm run dev
```

Open your browser to **http://localhost:4321** — that's your site running locally.

Any change you save to a file will **automatically refresh the browser**.

To stop the server: press **Ctrl + C** in the Terminal.

> `npm run dev` runs TinaCMS alongside Astro. The visual editor lives at **http://localhost:4321/admin** once Tina Cloud credentials are set (see below).

## 📁 Folder Structure

```
torpenguin-astro/
├── public/                  ← Static files (logo, images, robots.txt)
│   └── logo.svg
├── src/
│   ├── pages/               ← Each file = one URL on your site
│   │   ├── index.astro      → /
│   │   ├── essays/
│   │   │   ├── index.astro  → /essays
│   │   │   └── [slug].astro → /essays/<essay-or-topic>
│   │   ├── topics.astro     → /topics
│   │   ├── about.astro      → /about
│   │   ├── contact.astro    → /contact
│   │   ├── privacy.astro · terms.astro · colophon.astro
│   │   └── 404.astro
│   ├── content/
│   │   ├── config.ts        ← Content collection schema (essays)
│   │   └── essays/          ← Essay markdown files
│   ├── data/
│   │   └── topics.ts        ← Topic definitions (slugs, labels, descriptions)
│   ├── layouts/
│   │   └── BaseLayout.astro ← Shared <head>, nav, footer
│   ├── components/
│   │   ├── Nav.astro
│   │   └── Footer.astro
│   └── styles/
│       └── global.css       ← All design tokens & component styles
├── tina/
│   └── config.ts            ← TinaCMS schema (essays)
├── astro.config.mjs
├── package.json
└── README.md (this file)
```

## ✏️ How to edit content

- **Essays** → add a `.md` file to `src/content/essays/` (or use `/admin` once Tina is configured)
- **Topics** → `src/data/topics.ts` (keep in sync with the `topic` enum in `src/content/config.ts` and the options in `tina/config.ts`)
- **Homepage text** → `src/pages/index.astro`
- **Nav links** → `src/components/Nav.astro`
- **Footer** → `src/components/Footer.astro`
- **Colors / fonts / spacing** → `src/styles/global.css` (top of file)

### Essay frontmatter

```yaml
---
title: "Your essay title"
dek: "One-sentence subhead."
topic: scaling          # building | operations | scaling | unit-economics | f-and-b
tag: "Scaling"          # short display label above the headline
author: Torpenguin
date: 2026-05-20
readTime: "8 min read"
draft: false            # set true to hide from the site
---
```

## 🧩 TinaCMS (visual editing)

The `/admin` editor is gated on a `TINA_TOKEN`:

1. Create a project at [app.tina.io](https://app.tina.io)
2. Set `TINA_PUBLIC_CLIENT_ID` and `TINA_TOKEN` as environment variables (locally in `.env`, or in Railway)
3. `npm run build` will then build the admin UI; without the token it's skipped and `/admin` 404s (the rest of the site builds fine)

## 🚢 Deploying to Railway

Railway will automatically:

1. Detect this as a Node.js project
2. Run `npm install`
3. Run `npm run build` (creates the production `dist/` folder)
4. Serve it via `npm start`

Make sure in Railway settings:
- **Build command**: `npm run build`
- **Start command**: `npm start`

## 🎨 Design Tokens

All color, type, and spacing tokens live as CSS variables at the top of `src/styles/global.css`:

```css
:root {
  --paper: #FAF7F5;        /* warm cream background */
  --ink: #0A0A0A;          /* near-black foreground */
  --accent: #B85A2A;       /* terracotta accent */
  /* ... */
}
```

Change once → applies site-wide.

## 📚 Useful Commands

| Command            | What it does                                |
|--------------------|---------------------------------------------|
| `npm install`      | Install dependencies (first time only)      |
| `npm run dev`      | Run local dev server at localhost:4321      |
| `npm run build`    | Build production site into `dist/`          |
| `npm run preview`  | Preview the built production site           |

## ⚠️ Things to know

- Astro pages end in `.astro`, not `.html`. The syntax is HTML + a small `---` block at the top for JavaScript ("frontmatter").
- The site is static by default — fast & cheap to host.
- Fonts load from Google Fonts (Plus Jakarta Sans, Source Serif 4, JetBrains Mono).

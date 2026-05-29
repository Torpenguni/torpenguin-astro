# SpoonAsia Website

Astro-based marketing & editorial website for SpoonAsia.

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

Open your browser to **http://localhost:4321** — that's your website running locally.

Any change you save to a file will **automatically refresh the browser**.

To stop the server: press **Ctrl + C** in the Terminal.

## 📁 Folder Structure

```
spoonasia/
├── public/                  ← Static files (logo, images, robots.txt)
│   └── logo.svg
├── src/
│   ├── pages/               ← Each file = one URL on your site
│   │   ├── index.astro      → /
│   │   ├── decoded/
│   │   │   └── index.astro  → /decoded
│   │   ├── watch.astro      → /watch
│   │   ├── stories.astro    → /stories
│   │   ├── about.astro      → /about
│   │   └── penguin-x.astro  → /penguin-x
│   ├── layouts/
│   │   └── BaseLayout.astro ← Shared <head>, ribbon, nav, footer
│   ├── components/
│   │   ├── Logo.astro
│   │   ├── Ribbon.astro
│   │   ├── Nav.astro
│   │   └── Footer.astro
│   └── styles/
│       └── global.css       ← All design tokens & component styles
├── astro.config.mjs
├── package.json
└── README.md (this file)
```

## ✏️ How to edit content

- **Homepage text** → `src/pages/index.astro`
- **Nav links** → `src/components/Nav.astro`
- **Footer** → `src/components/Footer.astro`
- **Colors / fonts / spacing** → `src/styles/global.css` (top of file)

## 🚢 Deploying to Railway

Railway will automatically:

1. Detect this as a Node.js project
2. Run `npm install`
3. Run `npm run build` (creates the production `dist/` folder)
4. Run `npm run preview` (serves it on the port Railway provides)

Make sure in Railway settings:
- **Build command**: `npm run build`
- **Start command**: `npm run preview`

That's already configured in `package.json` — Railway should pick it up automatically.

## 🎨 Design Tokens

All color, type, and spacing tokens live as CSS variables at the top of `src/styles/global.css`:

```css
:root {
  --ink: #0E0E0E;          /* warm near-black background */
  --paper: #FAFAF7;        /* primary foreground */
  --orange: #E07A47;       /* accent (from logo) */
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

- Astro pages end in `.astro`, not `.html`. The syntax is HTML + a small `---` block at the top for JavaScript (called "frontmatter").
- The site is static by default — Railway just serves files. Fast & cheap.
- Fonts load from Google Fonts (Inter, IBM Plex Mono, Source Serif 4).

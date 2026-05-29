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

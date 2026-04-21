// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://rednegra.net',
  integrations: [mdx(), sitemap(), react()],
  markdown: {
    syntaxHighlight: 'prism',
  },
  redirects: {
    "/sylvainlesage/": "/",
    "/sylvainlesage/en/": "/",
    "/sylvainlesage/fr/": "/",
    "/sylvainlesage/es/": "/",
  }
});

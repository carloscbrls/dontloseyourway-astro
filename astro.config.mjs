import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://dontloseyourway.com',
  integrations: [sitemap()],
  vite: {
    build: {
      cssMinify: true,
    }
  }
});
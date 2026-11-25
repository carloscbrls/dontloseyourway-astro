import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://dontloseyourway.cc3po.com',
  integrations: [sitemap()],
});

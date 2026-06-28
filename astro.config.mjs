// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
 
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  site: 'https://shmelcoffee.com',
  integrations: [sitemap()],
  // Prodamus шлёт POST без Origin — иначе Astro отвечает 403 CSRF
  security: {
    checkOrigin: false,
  },
});

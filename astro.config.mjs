// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import blogSitemapDates from './src/data/blogSitemapDates.json' with { type: 'json' };

const SITEMAP_EXCLUDE = [
  '/account',
  '/add-cup',
  '/add-shelf',
  '/cup',
  '/login',
  '/auth/callback',
  '/generate',
  '/metrics',
  '/api/',
];

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  site: 'https://shmelcoffee.com',
  integrations: [
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDE.some((p) => page.includes(p)),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const lastmod = blogSitemapDates[path] || blogSitemapDates[`${path.replace(/\/$/, '')}/`];
        if (lastmod) {
          return { ...item, lastmod: new Date(lastmod).toISOString() };
        }
        if (path.startsWith('/blog/')) {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }
        if (path === '/blog/' || path === '/blog') {
          return { ...item, changefreq: 'weekly', priority: 0.9 };
        }
        return item;
      },
    }),
  ],
  security: {
    checkOrigin: false,
  },
});

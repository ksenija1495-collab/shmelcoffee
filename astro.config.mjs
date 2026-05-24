// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  server: { port: parseInt(process.env.PORT || '4321'), host: true },
  site: 'https://shmelcoffee.com',
});

import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://labs.boyaomgame.xyz',
  base: '/blog',
  trailingSlash: 'never',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
});

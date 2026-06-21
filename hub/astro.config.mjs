import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://labs.boyaomgame.xyz',
  base: '/',
  trailingSlash: 'never',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
});

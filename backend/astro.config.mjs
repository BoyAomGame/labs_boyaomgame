import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://labs.boyaomgame.xyz',
  base: '/backend',
  trailingSlash: 'never',
  output: 'static',
  srcDir: './frontend/src',
  publicDir: './frontend/public',
  outDir: './frontend/dist',
  build: { format: 'file' },
});

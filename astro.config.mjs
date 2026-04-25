import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://power-in-numbers.net',
  output: 'static',
  build: {
    format: 'directory',
  },
  trailingSlash: 'ignore',
});

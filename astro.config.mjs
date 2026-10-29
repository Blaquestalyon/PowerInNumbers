import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://power-in-numbers.net',
  output: 'static',
  build: {
    format: 'directory',
  },
  trailingSlash: 'ignore',
  // Astro 7's compressor drops the line break between text and an inline tag, so "is <em>decision"
  // rendered as "isdecision" (and the nav ran together). Uncompressed output reads as Astro 4's did.
  compressHTML: false,
  // Vite 8 minifies CSS with Lightning CSS, which under Astro's `esnext` build target writes
  // `(max-width: 720px)` as `(width<=720px)`; Safari/iOS before 16.4 ignore that form and lose the
  // mobile layout. A browser CSS target keeps `max-width` (Astro 4's esbuild minifier never rewrote it).
  vite: {
    build: { cssTarget: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'] },
  },
});

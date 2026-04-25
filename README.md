# Power In Numbers — pre-built deployment

This is the **pre-built** static site for power-in-numbers.net. It contains the
generated `dist/` directory directly, with no Astro source. Railway (or any
static host) only needs to install `serve` and run it against `dist/`.

## What's inside

- `dist/` — the built site (HTML, CSS, JS, images, PDF)
- `package.json` — declares `serve` as the only runtime dependency
- `nixpacks.toml` — tells Railway to skip the build phase

## To deploy on Railway

1. Push this folder to GitHub
2. Connect the repo to a Railway service
3. Railway will install `serve` and run `npm start` — that's it

No Astro, no TypeScript, no build step. The site is already built.

## To update content

To change content, edit the source repo (the one with `src/`), rebuild
locally with `npm run build`, and copy the resulting `dist/` here.

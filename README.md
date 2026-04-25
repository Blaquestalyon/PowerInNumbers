# Power In Numbers

The public site for Power In Numbers — a research and decision-engineering firm operating under the CROWD POWERED framework and the 22-gate VERIDEX validation standard.

Built with [Astro 5](https://astro.build/) as a fully static site. No backend, no database. Content collections power the methodology, track-record, case-studies, and library sections.

---

## Quick start

```bash
# Use the Node version pinned in .nvmrc
nvm use

# Install
npm install

# Local dev — http://localhost:4321
npm run dev

# Production build → ./dist
npm run build

# Preview the production build
npm run preview
```

Requires Node 20+ (see `.nvmrc`).

---

## What the site is

Five canonical sections:

- **`/methodology`** — the firm's discipline, made legible.
  - `/methodology/framework` — CROWD POWERED, the 12-step operating framework.
  - `/methodology/curriculum` — the eight-phase Power In Numbers University curriculum.
  - `/methodology/validation` — VERIDEX, the 22-gate validation standard plus engine extensions.
- **`/track-record`** — six documented patterns the firm implemented before the field caught up (2001 → 2026), with primary-source artefacts where available.
- **`/case-studies`** — sovereign, enterprise, and firm-built. Includes the Ghana market-entry interactive cartography embedding the AI Mirror Stage-3 report and four Sovereign Mirror briefings.
- **`/library`** — the firm's publishing engine. Ten v1 entries across six editorial categories.
- **`/engage` · `/about` · `/press` · `/contact`** — the four canonical receiving pages.

---

## Project structure

```
PowerInNumbers/
├── astro.config.mjs        # Astro configuration
├── nixpacks.toml           # Deployment build hint
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript path aliases (@/* → src/*)
├── public/
│   ├── artifacts/          # Embedded primary-source artefacts:
│   │   ├── go-local/       #   Go Local Magazine PDF (Vol. 1, Editions 1 & 2)
│   │   ├── case-studies/ghana/    # AI Mirror + 4 Sovereign Mirror reports
│   │   └── case-studies/masters-chair/  # VERIDEX BI USA full report
│   ├── favicon.svg
│   └── robots.txt
└── src/
    ├── content/            # Astro content collections (markdown)
    │   ├── case-studies/   # 6 entries
    │   ├── library/        # 10 v1 entries
    │   └── track-record/   # 6 entries
    ├── content.config.ts   # Collection schemas
    ├── components/         # Header, Footer, PageHero, SectionMarker, etc.
    ├── layouts/            # BaseLayout
    ├── pages/              # Routes
    │   ├── case-studies/   # index.astro + [...slug].astro + ghana interactive
    │   ├── methodology/    # index, framework, curriculum, validation
    │   ├── track-record/   # index + [...slug]
    │   ├── library/        # index + [...slug]
    │   ├── engage/         # three intake paths
    │   ├── about.astro
    │   ├── press.astro
    │   ├── contact.astro
    │   └── index.astro     # Home
    └── styles/
        └── global.css      # Design tokens, base reset, prose styles
```

---

## Design system

Locked tokens (defined in `src/styles/global.css`):

| Token            | Value      | Use                       |
| ---------------- | ---------- | ------------------------- |
| `--ink`          | `#0F1F2E`  | Body text, dark surfaces  |
| `--paper`        | `#F5F1E8`  | Page background           |
| `--paper-deep`   | `#EDE6D6`  | Card surfaces, callouts   |
| `--oxblood`      | `#8B2A2A`  | Eyebrows, accents         |
| `--rule`         | `#C5BBA8`  | Hairline rules, borders   |
| `--subtext`      | `#5A6470`  | Secondary copy            |

Typography (Google Fonts):

- **Spectral** — display / headlines
- **IBM Plex Sans** — body
- **IBM Plex Mono** — eyebrows, mono labels, code

---

## Editing content

All content lives in `src/content/`. Each file is markdown with YAML frontmatter validated against `src/content.config.ts`.

**Library entry types** (six categories):
`white-paper`, `framework`, `press-essay`, `track-record-essay`, `firm-built-essay`, `methodology-note`.

**Case-study tiers:**
`sovereign`, `enterprise`, `firm-built`.

**Track-record entries** carry a year, mainstream-emergence comparator, and an artefacts array.

To add a new library entry, drop a markdown file into `src/content/library/`. The route is generated automatically at `/library/<slug>/`.

---

## Deployment

The site is fully static. After `npm run build`, the contents of `dist/` can be uploaded to any static host (S3 + CloudFront, Netlify, Cloudflare Pages, Vercel, GitHub Pages with a workflow, etc.).

The included `nixpacks.toml` is a deployment hint for platforms that auto-detect the build (Railway, Render, Fly).

---

## License & ownership

© 2026 Power In Numbers. All rights reserved.

The methodology names — **CROWD POWERED**, **VERIDEX**, **AI Mirror**, **VERIDEX BI USA**, **Sovereign Mirror**, **Decision Cartography** — are part of the firm's audit trail. Public references to the framework should match the firm's canonical naming.

Source available for editorial collaboration. Press, citation, and engagement: `admin@power-in-numbers.net`.

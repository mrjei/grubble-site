# Grubble Eats — Marketing Site

Phase 1 MVP marketing landing page for **Grubble Eats**, the food-decision app built for groups (not solo discovery). Lives at the apex domain **grubbleeats.com**.

> The Flutter PWA demo lives separately at `app.grubbleeats.com` (different repo). This repo is the investor-facing front door only.

## Stack

- **Astro 4.x** (static-first) + **Tailwind CSS**
- **Cloudflare Pages** (hosting) + a single **Pages Function** (`functions/api/waitlist.ts`) → **Brevo** for the waitlist
- **Cloudflare Web Analytics** (privacy-first, cookieless)
- **Fontshare**: Cabinet Grotesk (display) + Satoshi (body)

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static build → dist/
npm run preview    # preview the production build
```

> Note: `npm run dev` (Astro) serves the static site but **not** the `/api/waitlist`
> Pages Function. Submitting the waitlist form in plain `astro dev` shows a clean
> error (the endpoint 404s) — that's expected. To exercise the function locally,
> use `npx wrangler pages dev dist` after a build, or just rely on the Cloudflare
> Pages preview deploy.

## Brand assets

Raster assets (`public/og-image.png`, `public/apple-touch-icon.png`, `public/favicon.ico`)
are generated from the locked Fork-G mark:

```bash
npm run gen:assets
```

`public/favicon.svg` is the vector source used by modern browsers first. The OG
image wordmark currently renders with a system-font fallback (Cabinet Grotesk is
not installed on the build machine); regenerate with the brand font installed for
final fidelity.

## Environment variables

Set in the Cloudflare Pages dashboard → Settings → Environment variables. See `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `BREVO_API_KEY` | Yes (prod) | Adds waitlist contacts to Brevo. The function degrades gracefully (logs + 200) if unset. |
| `BREVO_LIST_ID` | Optional | Brevo contact list id to add signups to. |
| `ALLOWED_ORIGIN` | Optional | CORS origin for `/api/waitlist`. Defaults to `https://grubbleeats.com`. |

## Project structure

```
src/
├── pages/        index · privacy · terms · 404
├── components/   Hero · WhatItDoes · EmailCapture · Footer · BrandMark · SEO · Button
├── layouts/      BaseLayout
├── data/         config.json (names, URLs, contact — single source of truth)
└── styles/       tokens.css (--gr-* brand tokens) · global.css
functions/api/    waitlist.ts (Cloudflare Pages Function → Brevo)
public/           _headers · robots.txt · favicon · og-image · apple-touch-icon
rules/            Project conventions, Cloudflare patterns, design system, security, SEO, perf, deployment
scripts/          generate-assets.mjs
```

## Deployment

Deployed to Cloudflare Pages (project `grubble-site`, repo `mrjei/grubble-site`).
Push to `main` → production; any other branch → preview. The custom domain
`grubbleeats.com` is attached manually in the Cloudflare dashboard. See
`rules/07-deployment-process.md` for the full process.

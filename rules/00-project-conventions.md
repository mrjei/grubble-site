# 00 — Project Conventions

**Purpose:** This file defines the conventions for the **Grubble Eats marketing site** (`grubbleeats.com`). It is read by Claude Code and Cursor on every session. Read this first, then the other rules files as needed.

**Scope:** A single-product, static-first marketing landing page for the Grubble Eats app. This is NOT a multi-client agency build — there is one project, one brand, one domain. The Flutter app and the sessions backend live in separate repos and are out of scope here.

**Brand naming (LOCKED 2026-05-28):** Formal name is **Grubble Eats**, casual short form is **Grubble**. Hero headline, page `<title>`, and Open Graph metadata use the formal "Grubble Eats." Body copy after the first mention may use the casual "Grubble."

---

## Stack (non-negotiable)

| Layer | Technology | Version |
|---|---|---|
| Framework | Astro | 4.x (latest stable) |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS + CSS custom properties | v3.x |
| Hosting | Cloudflare Pages | — |
| API layer | Cloudflare Pages Functions (`functions/`) | — |
| Email (outbound / waitlist) | Brevo API | — |
| Analytics | Cloudflare Web Analytics | — |
| Fonts | Cabinet Grotesk + Satoshi via Fontshare | — |
| Package manager | npm | — |
| Deploy | Cloudflare Pages (Git-connected) | — |

**No standalone Workers. No D1. No chatbot/LLM inference.** The only server-side code is the Pages Function that forwards waitlist signups to Brevo. If a need genuinely requires something outside this stack, document the reason in `decisions/` before adding it.

---

## File structure (mandatory)

```
grubble-site/
├── rules/                          # These rule files
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions (Pages-only) — optional, Pages Git integration is primary
├── README.md                       # Setup / local dev / deploy notes
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── .env.example                    # Template for secrets (never commit real secrets)
├── src/
│   ├── pages/                      # Astro pages (routes): index, privacy, terms, 404
│   ├── components/                 # Reusable Astro components (Hero, WhatItDoes, EmailCapture, Footer, BrandMark, SEO, Button)
│   ├── layouts/                    # Page layouts (BaseLayout)
│   ├── data/                       # Editable config (site name, contact, URLs, brand)
│   │   └── config.json             # Single source of truth for names/URLs/contact
│   ├── lib/                        # Utility functions, small helpers
│   ├── styles/
│   │   ├── tokens.css              # Design tokens (CSS custom properties) — mirrors the app
│   │   └── global.css              # Global styles, Tailwind imports, font-face
│   └── types/                      # Shared TypeScript types
├── functions/
│   └── api/
│       └── waitlist.ts             # Cloudflare Pages Function — POST email → Brevo
├── public/                         # Static assets (favicon, og-image, apple-touch-icon, _headers, robots.txt)
└── decisions/                      # ADRs for any deviation from these rules
```

**If a file doesn't fit this structure, stop and ask before creating it.**

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `email-capture.astro` |
| Components | PascalCase | `EmailCapture.astro` |
| Variables / functions | camelCase | `submitWaitlist` |
| Constants | SCREAMING_SNAKE_CASE | `BREVO_LIST_ID` |
| Types / interfaces | PascalCase | `WaitlistSubmission` |
| CSS custom properties | `--gr-kebab-case` | `--gr-primary` (mirror the app's `--gr-*` namespace) |
| Routes | kebab-case | `/api/waitlist`, `/privacy` |
| Environment variables | SCREAMING_SNAKE_CASE | `BREVO_API_KEY` |
| Git branches | `type/kebab-description` | `feat/hero-headline`, `fix/form-validation` |

---

## Git conventions

**Commit message format:** Conventional Commits

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`

Examples:
- `feat(hero): add headline variant comments for review`
- `fix(waitlist): handle missing BREVO_API_KEY gracefully`
- `refactor(seo): extract SoftwareApplication schema to SEO.astro`

**Branch strategy:**
- `main` — production, auto-deploys to Cloudflare Pages
- `feat/*`, `fix/*`, `refactor/*` — feature branches → Pages preview deployments
- No direct commits to `main` after initial scaffolding once the repo is connected.

---

## Content-vs-code separation (critical)

**Anything you might want to edit without touching component logic lives in `src/data/config.json`.**

(Note: Astro reserves `src/content/` for content collections, so editable config lives in `src/data/` instead.)

This means:
- Site name, contact email, social/app URLs → `src/data/config.json`
- Brand colors / feature flags → `src/data/config.json`
- Page copy that's long-form or likely to be reworded → keep it readable and centralized; never bury client-specific strings deep in nested markup.

Components read from content/config. Never hardcode values that belong in config.

Bad:
```astro
<a href="https://app.grubbleeats.com">Try the demo</a>
```

Good:
```astro
---
import config from '../data/config.json';
---
<a href={config.urls.appDemo}>Try the demo</a>
```

**Reasoning:** It keeps the single source of truth obvious and makes copy/URL changes a one-file edit. This site is small — don't over-engineer a CMS — but do keep names, URLs, and colors out of deep markup.

---

## Environment variables and secrets

**Never commit secrets.** Ever. Not even "just for a minute."

**Local development:**
- Copy `.env.example` to `.env` (git-ignored)
- Populate with dev values

**Production (Cloudflare Pages):**
- Secrets stored in the Cloudflare **Pages dashboard** → project → Settings → Environment variables (encrypted). There is no `wrangler secret put` here — this is a Pages project, not a standalone Worker.

**Required secret for this site:**
- `BREVO_API_KEY` — for adding waitlist contacts to Brevo. This is the **only** secret the site needs.

The waitlist Pages Function must degrade gracefully when `BREVO_API_KEY` is unset (log + return 200), so local dev and preview don't crash. See `02-cloudflare-patterns.md`.

**Optional public/config values** (safe to keep in `src/content/config.json`, not secrets):
- `SITE_URL` — `https://grubbleeats.com`
- `APP_DEMO_URL` — `https://app.grubbleeats.com`
- `CONTACT_EMAIL` — `hello@grubbleeats.com`

---

## Testing requirements (baseline)

**Required before considering work done / before a production deploy:**

1. **`npm run build`** — Astro static build succeeds with no errors.
2. **`npm run dev`** — site renders locally; manually exercise the waitlist form. Without `BREVO_API_KEY` it must fail *gracefully* (clear message, HTTP 200, no crash), not throw.
3. **Lighthouse** (run on the home page at minimum):
   - Performance ≥ 95
   - Accessibility ≥ 95
   - Best Practices ≥ 95
   - SEO ≥ 95
4. **Mobile responsiveness** — verify at 375px and 414px viewports.
5. **Sharing preview** — confirm OG tags + `og-image.png` render correctly (Facebook debugger / Twitter card validator) before launch.

**Not required (yet):** automated test suite. For this MVP, manual QA is acceptable.

---

## What the agent should always do

- Read this file and the relevant rule files before starting work.
- Use the locked brand tokens (see `03-design-system.md`) — never hardcode hexes in components.
- Respect the formal/casual brand-naming split.
- Prefer editing existing files over creating new ones.
- Match existing patterns in the codebase — consistency > cleverness.
- Flag any deviation from these rules explicitly: "This is outside the standard pattern because..."

## What the agent should never do

- Install a new npm package without confirming with James.
- Commit secrets or API keys, even temporarily.
- Add D1, a standalone Worker, a chatbot, or any LLM inference — out of scope for this site.
- Deploy to `grubbleeats.com` root — James handles DNS + custom domain attachment manually.
- Touch the Flutter app (`E:\Projects\Grubble\`), the sessions backend, or tenvaro.ai.
- Disable TypeScript strict mode or linting rules to "make it work."
- Use `any` types — use `unknown` and narrow, or define proper types.

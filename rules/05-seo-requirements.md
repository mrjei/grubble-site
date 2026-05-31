# 05 — SEO Requirements

**Purpose:** The Grubble Eats marketing site ships with a solid SEO foundation. This is an investor-facing front door and a launch-list builder — it must be findable, shareable, and crawlable. This file defines the non-negotiables.

**Read after:** `00-project-conventions.md`

**Note on scope:** Grubble Eats has **no physical presence** and is **not a local business**. There is no `LocalBusiness` / `RealEstateAgent` schema, no NAP, no neighborhood or city pages. The product being marketed is a mobile **app**, so the structured-data centerpiece is `SoftwareApplication` (see below).

---

## The baseline every page must have

### 1. Title tag

- 50–60 characters maximum.
- Format: `Grubble Eats — <short descriptor>` (homepage uses the hero tagline James picks).
- Unique per page.
- Location: `<title>` in `<head>`, set via the `SEO.astro` component.

Homepage example: `Grubble Eats — Decide what to eat, together.`

### 2. Meta description

- 140–160 characters maximum.
- Communicates the wedge (group food decisions, not solo discovery).
- Ends with an implicit or explicit CTA.
- Unique per page.

### 3. Canonical URL

Every page has a canonical link tag pointing to its preferred URL on `grubbleeats.com`:

```html
<link rel="canonical" href="https://grubbleeats.com/" />
```

### 4. Open Graph tags

For social sharing (this matters — the site will be shared in investor DMs and group chats):

```html
<meta property="og:title" content="Grubble Eats" />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://grubbleeats.com/og-image.png" />
<meta property="og:url" content="https://grubbleeats.com/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Grubble Eats" />
```

`og:image` is a 1200×630 PNG with the Fork-G + tagline + brand colors, at `public/og-image.png`.

### 5. Twitter card tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Grubble Eats" />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://grubbleeats.com/og-image.png" />
```

### 6. Structured data (JSON-LD)

Minimum required schemas:

- **Homepage:** `Organization` + `WebSite` + **`SoftwareApplication`** (the app being marketed).
- **Privacy / Terms:** none required (these are utility pages).

#### `SoftwareApplication` schema (the centerpiece)

The homepage includes a `SoftwareApplication` JSON-LD block describing the Grubble Eats app:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Grubble Eats",
  "applicationCategory": "FoodAndDrinkApplication",
  "operatingSystem": "iOS, Android",
  "description": "Grubble Eats helps groups decide where to eat — swipe together, match in real time, and let Grubble's AI break the tie.",
  "url": "https://grubbleeats.com",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

**Notes:**
- `applicationCategory` is `"FoodAndDrinkApplication"` (a recognized schema.org value).
- `operatingSystem` reflects "coming soon to iOS and Android."
- Include `offers` with `price: "0"` (free to download) — omit `aggregateRating` until there are real reviews (Phase 2). Don't fabricate ratings.
- Validate with the [Rich Results test](https://search.google.com/test/rich-results) before launch.

---

## Centralized SEO component

Create a `SEO.astro` component that every page uses. Never set meta tags manually per page.

```astro
---
// src/components/SEO.astro
import config from '../content/config.json';

interface Props {
  title: string;
  description: string;
  image?: string;
  canonical?: string;
  type?: 'website' | 'article';
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const {
  title,
  description,
  image = config.seo.defaultOgImage,
  canonical = new URL(Astro.url.pathname, config.urls.site).href,
  type = 'website',
  structuredData,
} = Astro.props;

const jsonLd = structuredData
  ? (Array.isArray(structuredData) ? structuredData : [structuredData])
  : [];
---

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />

<meta property="og:title" content="Grubble Eats" />
<meta property="og:description" content={description} />
<meta property="og:image" content={image} />
<meta property="og:url" content={canonical} />
<meta property="og:type" content={type} />
<meta property="og:site_name" content="Grubble Eats" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Grubble Eats" />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={image} />

{jsonLd.map((data) => (
  <script type="application/ld+json" set:html={JSON.stringify(data)} />
))}
```

---

## Sitemap

### `sitemap.xml`

Generated at build time. Use `@astrojs/sitemap`:

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://grubbleeats.com',
  integrations: [sitemap()],
});
```

Include all indexable pages (`/`, `/privacy`, `/terms`). Exclude the 404 page.

### `robots.txt`

At `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://grubbleeats.com/sitemap-index.xml
```

For any pre-launch / preview environment that should not be indexed, use:

```
User-agent: *
Disallow: /
```

---

## Heading hierarchy

- **One `<h1>` per page.** The homepage `<h1>` is the hero headline (the variant James picks).
- Heading levels don't skip: h1 → h2 → h3.
- Descriptive headings — the "What It Does" word-headings (Swipe / Match / Ask) sit as `<h3>` under a section `<h2>`.

---

## URL structure

- **Lowercase, kebab-case.** `/privacy`, `/terms`.
- **Flat hierarchy.** Single-page site plus two utility pages — no nesting.
- **Trailing slash consistency** — pick one (no trailing slash recommended for Astro) and enforce via Pages redirects if needed.

---

## Internal linking

- The footer links to `/privacy` and `/terms` and the contact email.
- The "Try the demo" CTA links to `https://app.grubbleeats.com` (separate subdomain, `target="_self"`).
- No orphan pages — every page is reachable from the home page.

---

## Image SEO

- **Descriptive filenames** — `grubble-og-image.png`, not `img1.png`.
- **`alt` on every meaningful image**; `alt=""` for purely decorative marks (e.g. a background Fork-G).
- **Explicit `width`/`height`** to prevent layout shift.
- **Lazy-load below the fold.**
- Prefer SVG for the brand mark and illustrations; AVIF/WebP for any photos.

---

## Performance = SEO

Core Web Vitals affect ranking. Targets (see `06-performance-standards.md`):

- **LCP:** < 2.5s
- **INP:** < 200ms
- **CLS:** < 0.1

---

## Pre-launch SEO checklist

- [ ] Every page has a unique title and meta description.
- [ ] Homepage title leads with "Grubble Eats" + tagline.
- [ ] Canonical URLs set on every page (absolute, `grubbleeats.com`).
- [ ] OG tags + Twitter card configured; `og-image.png` (1200×630) present.
- [ ] `SoftwareApplication` + `Organization` + `WebSite` JSON-LD present and valid (Rich Results test).
- [ ] `sitemap.xml` generated and accessible.
- [ ] `robots.txt` allows crawling of production (blocks any preview-only env).
- [ ] One H1 per page, hierarchy correct.
- [ ] All images have alt text and descriptive filenames.
- [ ] Favicon + apple-touch-icon set from the Fork-G mark.
- [ ] Core Web Vitals passing (PageSpeed Insights).
- [ ] No broken links.

---

## Post-launch SEO setup

Within 48 hours of the production domain going live (James's manual steps):

1. **Google Search Console:** add `grubbleeats.com`, verify via DNS, submit the sitemap.
2. **Bing Webmaster Tools:** add the domain.
3. **Monitor Core Web Vitals** for the first 30 days via Cloudflare Web Analytics + PageSpeed Insights.

---

## What the agent should always do

- Use the `SEO.astro` component on every page.
- Set unique, descriptive titles and meta descriptions per page.
- Include the `SoftwareApplication` + `Organization` + `WebSite` JSON-LD on the homepage.
- Generate `sitemap.xml` at build time.
- Use semantic HTML with proper heading hierarchy.

## What the agent should never do

- Add `LocalBusiness`, `RealEstateAgent`, or any physical-presence schema — Grubble has no physical location.
- Fabricate `aggregateRating` or review counts in `SoftwareApplication` — omit until real data exists (Phase 2).
- Duplicate title tags or meta descriptions across pages.
- Block crawling of the production site in `robots.txt`.
- Skip heading levels or use generic `alt="image"` / filenames like `img1.png`.

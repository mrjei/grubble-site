# 06 — Performance Standards

**Purpose:** Every Tenvaro site is fast. Fast is a feature we sell. This rule file defines the performance floor and how to hit it.

**Read after:** `00-project-conventions.md`, `05-seo-requirements.md`

---

## Performance targets (non-negotiable)

### Lighthouse scores (desktop AND mobile)

- **Performance:** ≥ 95
- **Accessibility:** ≥ 95
- **Best Practices:** ≥ 95
- **SEO:** ≥ 95

Run against 3 representative pages: home, a content page, a form page.

### Core Web Vitals

- **LCP (Largest Contentful Paint):** < 2.5s — ideally < 1.5s
- **INP (Interaction to Next Paint):** < 200ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Other metrics

- **Time to First Byte (TTFB):** < 400ms globally (Cloudflare edge handles this)
- **Total Blocking Time (TBT):** < 200ms
- **First Contentful Paint (FCP):** < 1.5s
- **Speed Index:** < 2.0s

### Total page weight

- **Homepage:** < 1 MB total transfer (uncompressed).
- **Typical content page:** < 800 KB.
- **Listing/detail pages:** < 1.5 MB (allowing for high-quality imagery).

If you're over these budgets, something is wrong. Revisit image compression, fonts, or scripts.

---

## Image optimization

### Formats and delivery

- **Primary format:** AVIF (best compression, modern browser support)
- **Fallback:** WebP
- **Final fallback:** JPEG for photos, PNG for graphics with transparency

Use Astro's built-in `<Image>` component:

```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---

<Image
  src={heroImage}
  alt="Waterfront home at sunset"
  width={2400}
  height={1600}
  widths={[640, 1024, 1600, 2400]}
  sizes="(min-width: 1024px) 80vw, 100vw"
  formats={['avif', 'webp']}
  loading="eager"
  fetchpriority="high"
/>
```

### Loading strategy

- **Above the fold:** `loading="eager"`, `fetchpriority="high"` for the LCP image
- **Below the fold:** `loading="lazy"`
- **Always include `width` and `height`** — prevents CLS
- **Use `<picture>`** with `media` attributes for art direction (different crops per breakpoint)

### Compression targets

- **Photos:** 70-80% quality AVIF, 80% quality WebP/JPEG
- **Graphics/screenshots:** Use SVG when possible, PNG otherwise

### File size budgets

- Hero images: < 200 KB at the widest served size
- Inline content images: < 100 KB
- Thumbnails: < 30 KB

---

## Font optimization

### Loading strategy

- **Self-host fonts.** Don't rely on Google Fonts CDN — extra DNS, TLS, potential privacy issues.
- **Preload critical fonts:**

```html
<link rel="preload" href="/fonts/Outfit-Variable.woff2" as="font" type="font/woff2" crossorigin />
```

- **Use `font-display: swap`** to avoid invisible text during font load:

```css
@font-face {
  font-family: 'Outfit';
  src: url('/fonts/Outfit-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
```

### Variable fonts

Use variable fonts when possible — one file covers all weights and reduces total payload.

### Font subsetting

If the site is English-only, subset fonts to Latin characters. Can reduce font file size by 50-70%.

Tools: `pyftsubset` or `glyphhanger`.

---

## JavaScript budgets

### Zero-JS by default

Astro's superpower is shipping zero JS. Most pages need no client-side JavaScript at all.

### When JS is needed

- **Keep islands small.** A chatbot, a photo carousel, a mobile menu toggle — each is an island.
- **Prefer Astro's built-in `<script>` tags** over framework islands when the interactivity is simple.
- **Use framework islands (React/Vue/Svelte) only for complex stateful UI.**

### JS size budgets

- **Homepage total JS:** < 100 KB compressed (gzipped or Brotli)
- **Typical page:** < 50 KB compressed
- **Per island:** aim for < 30 KB compressed

### Third-party scripts

Every third-party script is a performance tax. Before adding:

1. Is there a first-party alternative? (Cloudflare Web Analytics instead of GA4, for example)
2. Can it load async/defer?
3. Can it load only on user interaction? (e.g., chat widgets load only when clicked)

**Never** load third-party scripts synchronously in `<head>`. Ever.

---

## CSS performance

### Tailwind purging

Production builds automatically purge unused Tailwind classes. Verify `tailwind.config.js` `content` paths include all source files.

### Critical CSS

Astro inlines critical CSS automatically. Don't fight it.

### Avoid @import in CSS

Each `@import` is a render-blocking request. Put all CSS in `global.css` or use `<link>` in HTML.

### CSS size budget

- **Total CSS per page:** < 50 KB compressed

---

## Caching strategy

### Static assets

Cloudflare Pages handles this well by default:

- Hashed asset filenames (images, CSS, JS): `cache-control: public, max-age=31536000, immutable`
- HTML: `cache-control: public, max-age=0, must-revalidate`

### API responses (Workers)

- **Listings / IDX data:** Cache for 5-15 minutes via `cf.cacheTtl`
- **Contact/chatbot endpoints:** No caching (dynamic per user)

Example:

```ts
return new Response(JSON.stringify(listings), {
  headers: {
    'content-type': 'application/json',
    'cache-control': 'public, max-age=300',
  },
});
```

---

## Preloading and preconnecting

### Preload what you need immediately

- Critical font
- LCP image
- Critical CSS (Astro handles this)

### Preconnect to critical third-party origins

```html
<link rel="preconnect" href="https://clientslug-api.workers.dev" />
```

### Don't over-preload

Every `<link rel="preload">` competes for bandwidth. Reserve for truly critical resources (1-3 items max).

---

## Lazy loading strategy

### Images below the fold

```html
<img src="..." loading="lazy" decoding="async" />
```

### iframes (maps, embeds)

```html
<iframe src="..." loading="lazy"></iframe>
```

### Chatbot widget

Load the chatbot script only when the user clicks "Chat with us":

```ts
// On button click:
const script = document.createElement('script');
script.src = '/chatbot.js';
script.async = true;
document.body.appendChild(script);
```

Saves ~30-50 KB of JS on pages the user never interacts with.

---

## Layout shift prevention (CLS)

### Reserve space for dynamic content

- **Images:** always include `width` and `height`
- **Ads / embeds:** use `aspect-ratio` CSS or explicit dimensions
- **Web fonts:** use `size-adjust` and `ascent-override` to match fallback metrics
- **Lazy-loaded content:** use skeleton placeholders with the same dimensions as the loaded content

### Avoid injecting content above existing content

- Banners, cookie notices, notifications → fixed position or bottom-of-page, not pushing content down
- Dynamic lists → load placeholders first, fade in real content

---

## Hosting and edge

### Cloudflare Pages is the baseline

All sites deploy to Cloudflare Pages. Free tier covers 99% of client sites:

- 500 builds/month
- Unlimited bandwidth
- Unlimited sites
- Global edge (300+ cities)

### Worker performance

- **Cold start:** < 5ms (isolates, not containers)
- **First byte from Worker:** < 100ms globally
- **Avoid Node.js-specific APIs** unless `nodejs_compat` is enabled

### D1 performance

- **Reads:** < 10ms at edge
- **Writes:** < 30ms
- **Index all commonly queried columns** — see `02-cloudflare-patterns.md`

---

## Monitoring

### Cloudflare Web Analytics

Enabled on every site. Privacy-preserving, no cookies, no banner required. Provides:

- Page views
- Unique visitors (approximate, cookieless)
- Top pages, referrers, countries
- Core Web Vitals (real user monitoring)

### Real User Monitoring (RUM) for CWV

Cloudflare RUM gives field data for LCP, INP, CLS. This is what Google uses for rankings — more important than lab scores.

### Budget alerts

Set up email alerts if:
- Site is down > 5 minutes
- Worker errors exceed 1% of requests
- D1 queries exceed expected volume (possible bug or abuse)

---

## Performance debugging workflow

When a site is slow:

1. **Run Lighthouse** on the affected page (both desktop and mobile)
2. **Check the waterfall** in Chrome DevTools Network tab — what's blocking?
3. **Check the main thread** in Performance tab — what's blocking JS?
4. **Test on 3G throttled connection** — how does it feel?
5. **Check CWV field data** via Cloudflare Analytics — is this a real-user issue or just a lab anomaly?
6. **Fix the biggest blocker first.** One 500 KB unoptimized image is more impactful than 10 CSS tweaks.

---

## What Claude Code should always do

- Use Astro's `<Image>` component for images with explicit width/height
- Self-host fonts with `font-display: swap`
- Default to zero client-side JS; add islands only when needed
- Lazy-load below-the-fold content
- Measure with Lighthouse before declaring work done

## What Claude Code should never do

- Load third-party scripts synchronously in `<head>`
- Use images without `width` and `height` attributes
- Ship unoptimized images (> 200 KB for hero, > 100 KB for content)
- Use CSS `@import` chains
- Animate `width`, `height`, `top`, `left` (use `transform` instead)
- Add a JS framework when Astro islands or vanilla scripts would suffice

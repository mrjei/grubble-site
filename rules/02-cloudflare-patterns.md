# 02 — Cloudflare Patterns

**Purpose:** Standard patterns for this site's Cloudflare footprint. The Grubble Eats marketing site is **Cloudflare Pages only** — static Astro output plus a single **Pages Function** for the waitlist endpoint. There is no standalone Worker and no D1 database.

**Read after:** `00-project-conventions.md`

---

## Architecture at a glance

- **Static site:** Astro builds to `dist/`, served from Cloudflare Pages' global edge.
- **One serverless endpoint:** `functions/api/waitlist.ts` → a Pages Function bound automatically to the route `/api/waitlist`. It validates an email and forwards it to Brevo.
- **No database.** Waitlist storage lives in Brevo's contact list. If persistence beyond Brevo is ever needed, that's a future ADR — not part of this build.

---

## Pages Functions

### Directory layout

Cloudflare Pages maps files under `functions/` to routes automatically (file-based routing):

```
functions/
└── api/
    └── waitlist.ts        # → POST /api/waitlist
```

No router entry point, no manual route table. Each file exports HTTP-method handlers.

### Handler pattern

A Pages Function exports `onRequest` or per-method handlers (`onRequestPost`, `onRequestOptions`, …). Handlers receive a single `context` object: `{ request, env, params, waitUntil, next }`.

```ts
// functions/api/waitlist.ts
import { z } from 'zod';

interface Env {
  // Set in the Cloudflare Pages dashboard → Settings → Environment variables.
  // Optional at runtime: the handler degrades gracefully if unset.
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  ALLOWED_ORIGIN?: string; // e.g. https://grubbleeats.com
}

const waitlistSchema = z.object({
  email: z.string().trim().email().max(200),
  // Honeypot: must be empty. See 04-security-practices.md.
  website: z.string().max(0).optional(),
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // ... validate, rate-limit, forward to Brevo, return JSON
};

export const onRequestOptions: PagesFunction<Env> = async ({ env }) =>
  new Response(null, { headers: corsHeaders(env) });
```

### Env bindings (typed)

Define a minimal `Env` interface per function. For this site it is small and every secret is **optional at the type level** so the handler can degrade gracefully:

```ts
interface Env {
  BREVO_API_KEY?: string;   // secret — Pages dashboard
  BREVO_LIST_ID?: string;   // config — Pages dashboard (or hardcode the list id in config.json)
  ALLOWED_ORIGIN?: string;  // config — defaults to the production origin
}
```

There is **no D1 binding**, no KV binding, no Worker `Env` with a database. Don't add one.

---

## Request validation

**Every request body is validated before use.** No exceptions.

Use a Zod schema co-located with the function (or in `src/lib/validation.ts` if shared):

```ts
const result = waitlistSchema.safeParse(await request.json().catch(() => null));
if (!result.success) {
  return jsonError('validation_failed', 'Please enter a valid email address.', 400);
}
const { email, website } = result.data;

// Honeypot tripped → pretend success, store nothing.
if (website && website.length > 0) {
  return jsonSuccess({ message: 'Thanks!' });
}
```

---

## Graceful Brevo fallback (required for this site)

The function must never crash when `BREVO_API_KEY` is missing — local dev and preview deploys won't have it.

```ts
if (!env.BREVO_API_KEY) {
  console.log(`[waitlist] BREVO_API_KEY not set — would have added: ${email}`);
  // TODO: set BREVO_API_KEY in the Cloudflare Pages dashboard.
  return jsonSuccess({ message: "You're on the list!" });
}
```

When the key IS present, forward to Brevo with error handling and a timeout:

```ts
const res = await fetch('https://api.brevo.com/v3/contacts', {
  method: 'POST',
  headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({
    email,
    listIds: env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : undefined,
    updateEnabled: true, // re-signup is idempotent, not an error
  }),
  signal: AbortSignal.timeout(8000),
});
```

Treat Brevo's "contact already exists" as success, not an error.

---

## CORS

The form is same-origin, but configure CORS explicitly anyway. Never use `Access-Control-Allow-Origin: *` on an endpoint that accepts user data.

```ts
function corsHeaders(env: Env): HeadersInit {
  const origin = env.ALLOWED_ORIGIN ?? 'https://grubbleeats.com';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
```

---

## Rate limiting

The waitlist endpoint forwards to a paid email service, so it's worth a light limit even at MVP scale.

**v1 approach (sufficient here):** lean on Cloudflare's edge protections — enable a **Rate Limiting Rule** in the Cloudflare dashboard for `/api/waitlist` (e.g. 5 requests / minute / IP) and rely on the honeypot + email validation in the function. No D1/KV counter table is needed for a single low-traffic endpoint.

**If abuse appears:** add Cloudflare Turnstile to the form and verify the token server-side before calling Brevo (see `04-security-practices.md`). Escalate to a KV-backed counter only if Turnstile is insufficient.

---

## Observability

### Logging

- `console.log` for informational events, `console.warn` for recoverable issues, `console.error` for failures.
- Structure messages for grep-ability: `[waitlist] added email=user@example.com` (consider redacting/hashing the local-part in long-lived logs — see `04-security-practices.md`).

### Viewing logs

Pages Function logs are visible in the Cloudflare dashboard (Pages project → Functions → real-time logs / Logs). `wrangler pages deployment tail` can also stream them if needed. There is no standalone Worker to `wrangler tail`.

### Analytics

Site traffic is measured with **Cloudflare Web Analytics** (privacy-first, cookieless, no banner required). The beacon script tag is added to the base layout; James pastes the real beacon token after the first deploy.

---

## Cloudflare Pages configuration

### Build settings

- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`
- **Node version:** 20 (set via `.nvmrc` or the `NODE_VERSION` env var)

Pages automatically detects and bundles `functions/` alongside the static output — no extra config to "enable" the waitlist endpoint.

### `public/_headers`

Custom headers ship via `public/_headers` (copied verbatim into `dist/`):

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' https://cdn.fontshare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

**Notes:**
- `connect-src 'self'` covers the same-origin `/api/waitlist` fetch — no external Worker origin to allow.
- `font-src` allows Fontshare's CDN. `script-src` allows Cloudflare Insights (Web Analytics). Tighten if a resource turns out unused.

### `public/_redirects`

Only if needed (legacy URLs, etc.):

```
/old-url  /new-url  301
```

---

## GitHub Actions deploy (optional)

The primary deploy path is **Cloudflare Pages' built-in Git integration** (connect the repo, push to `main` → production, push to a branch → preview). A GitHub Actions workflow is optional and, if used, deploys **Pages only** — there is no Worker job.

```yaml
# .github/workflows/deploy.yml — optional; Pages Git integration is the primary path
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=grubble-site
```

---

## What the agent should always do

- Validate every request body with a Zod schema before use.
- Make the waitlist function degrade gracefully when `BREVO_API_KEY` is unset.
- Type the `Env` interface for each Pages Function (secrets optional).
- Return structured JSON with appropriate status codes.
- Set secrets in the Pages dashboard — never in code or committed files.

## What the agent should never do

- Add a standalone Worker, a `wrangler.toml` Worker config, or D1/KV bindings.
- Use `*` for `Access-Control-Allow-Origin` on the waitlist endpoint.
- Call Brevo without validation, error handling, and a timeout.
- Crash the function (throw / 500) when an env var is missing — degrade gracefully.
- Commit a `BREVO_API_KEY` value anywhere.

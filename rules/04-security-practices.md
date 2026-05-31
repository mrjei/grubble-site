# 04 — Security Practices

**Purpose:** Baseline security requirements for the Grubble Eats marketing site. Non-negotiable. These rules protect users, their data, and the brand's reputation.

**Read after:** `00-project-conventions.md`, `02-cloudflare-patterns.md`

> **Scope note for this site (v1):** This site has **no D1 database** and **no authentication** — the only server-side surface is the waitlist Pages Function that forwards an email to Brevo. The **SQL injection prevention** and **Authentication** sections below are therefore *aspirational* for v1: there's nothing to inject into and nothing to log into yet. They're kept here intact because the principles still apply the moment the site grows (e.g. a Phase 2 D1-backed feature, a restaurant-onboarding form, or an admin surface). Everywhere this file says "Worker," read "Pages Function." Everywhere it says "D1," treat it as guidance for if/when persistence is added.

---

## Secrets management

### Never commit secrets

Ever. Not in code, not in comments, not in `.env` files that accidentally get tracked, not in `wrangler.toml`.

**Pre-commit check:** Every project includes a pre-commit hook or GitHub Action that scans for secrets before commits land on `main`.

### Where secrets live

- **Local dev:** `.env` (git-ignored)
- **Production Worker:** `wrangler secret put SECRET_NAME`
- **Production Pages:** Cloudflare dashboard → Pages project → Settings → Environment variables → encrypted

### Secret naming

Use SCREAMING_SNAKE_CASE and name by purpose, not value:

Good: `ANTHROPIC_API_KEY`, `BREVO_API_KEY`, `LEAD_WEBHOOK_SECRET`
Bad: `API_KEY`, `KEY1`, `SECRET`

### Secret rotation

- Document every secret in `docs/secrets-inventory.md` (purpose, rotation schedule, owner)
- Rotate on any suspected exposure, contractor offboarding, or at minimum annually

---

## Input validation

**Every input from outside the Worker is untrusted.** This includes:

- Form submissions
- URL parameters
- Request headers (yes, even `User-Agent`)
- Webhook payloads (even from "trusted" services)
- IDX/MLS API responses (treat as external data)

### Validate with schemas

Use Zod schemas in `src/lib/validation.ts`. Never trust `request.json()` output directly.

See `02-cloudflare-patterns.md` for patterns.

### Sanitize before rendering

When displaying user-generated content (rare in Tenvaro sites, but possible with reviews, form echoes, etc.):

- **Never** render raw HTML from user input.
- Escape all interpolated values by default (Astro does this).
- If rich text is genuinely needed, use a battle-tested sanitizer (`DOMPurify` on server side or via a Worker).

---

## SQL injection prevention

**All D1 queries use prepared statements with bindings.** No exceptions.

Already covered in `02-cloudflare-patterns.md` but repeated here because it's critical:

Bad: `db.prepare(\`SELECT * FROM leads WHERE email = '${email}'\`)`
Good: `db.prepare('SELECT * FROM leads WHERE email = ?').bind(email)`

---

## Cross-site scripting (XSS)

### Default escaping

Astro auto-escapes interpolated values: `{userInput}` is safe.

### Danger zones

- `set:html={}` — bypasses escaping. Never use on user input.
- `innerHTML` in client scripts — same rule.
- URL parameters rendered into links — validate that URLs are safe (http/https, no `javascript:`).

### Content Security Policy

Every site ships with a CSP header via `public/_headers`:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://CLIENT-api.workers.dev; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

**Review and tighten per client.** `'unsafe-inline'` for scripts/styles is a concession for Astro's inline hydration — evaluate whether it can be removed.

---

## Cross-site request forgery (CSRF)

### For same-origin forms

- Set `SameSite=Lax` cookies (default in modern browsers)
- Verify `Origin` header on state-changing requests

```ts
const origin = request.headers.get('Origin');
const allowedOrigins = env.ALLOWED_ORIGINS.split(',');
if (!origin || !allowedOrigins.includes(origin)) {
  return jsonError('forbidden', 'Invalid origin', 403);
}
```

### For webhook endpoints

- Require a shared secret in a header (`X-Webhook-Secret`)
- Or verify HMAC signatures on the payload

---

## Rate limiting and abuse prevention

### Every public endpoint has a limit

Contact forms, chatbots, anything that costs money or storage:

- Per-IP limits: see `02-cloudflare-patterns.md`
- Consider per-email and per-session limits for chatbot

### Honeypot fields

Every form includes a hidden field that must be empty:

```html
<input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;" />
```

Server side:

```ts
if (input.website && input.website.length > 0) {
  // Bot detected. Return success (don't alert bot). Don't actually store.
  return jsonSuccess({ message: 'Thank you.' });
}
```

### Time-based checks

Forms submitted within 2 seconds of page load are almost certainly bots:

```ts
// Client side: set a timestamp when form renders
// Server side: reject if time delta < 2000ms
```

### Captcha (optional)

For high-abuse targets, add Cloudflare Turnstile:

```html
<div class="cf-turnstile" data-sitekey="SITE_KEY"></div>
```

Verify the token server-side before processing the form.

---

## Anthropic API protection

### Never expose API keys to the browser

The `ANTHROPIC_API_KEY` lives only in the Worker. The browser calls your Worker; your Worker calls Anthropic.

### Prompt injection awareness

Chatbot system prompts are authoritative. User messages are untrusted.

- Keep the system prompt simple and explicit
- Don't echo user input into later system-prompt interpolations
- Limit conversation length (truncate old messages)
- Rate-limit to prevent prompt-injection-based API abuse

### Cost controls

- Cap response length: `max_tokens: 512` for chatbot
- Track usage per session and cut off runaway conversations
- Monitor spend via Anthropic console; set budget alerts

---

## HTTPS and transport security

- **All traffic HTTPS.** Cloudflare handles this, but verify "Always Use HTTPS" is enabled per domain.
- **HSTS header** via `public/_headers`:

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Warning:** HSTS is sticky. Don't enable on domains where you might need to serve HTTP (dev subdomains, etc.).

---

## Authentication (when needed)

**Most Tenvaro client sites don't have auth in v1.** When they do (admin dashboards, team portals):

### Use established patterns

- JWT with short expiry (1 hour access, 7 day refresh) signed with HMAC-SHA256
- OR session cookies with D1 or KV storage
- Never roll your own crypto

### Password requirements

- Minimum 12 characters
- No dictionary-only passwords (use a zxcvbn check)
- Hash with `bcrypt` (cost factor 12+) or `argon2` — never SHA of any kind
- Never log passwords, even hashed

### Session security

- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`
- Rotate session tokens on privilege change (login, role change)
- Invalidate all sessions on password reset

---

## Dependency security

### Lock files committed

`package-lock.json` committed to git. No `^1.2.3` surprises in production.

### Automated scanning

- GitHub Dependabot enabled on every repo
- Review and merge security updates within 7 days of alert

### Minimize dependencies

Every dependency is a potential vulnerability. Before adding a package:

1. Can we do this without it? (Often yes for small utilities)
2. Is the package maintained? (Check last commit, open issues)
3. Does it have a reasonable surface area? (Beware of kitchen-sink libraries)

---

## Privacy and data handling

### Data minimization

Collect only what's needed. A contact form needs name, email, message. It does not need birthdate, location, or device fingerprint.

### Retention policy

Document retention in `docs/privacy-policy.md`:

- Leads: retained indefinitely unless client requests deletion (it's their business data)
- Chat sessions: 90 days, then purged via scheduled Worker
- Analytics: 30 days of detailed, aggregate forever

### GDPR / CCPA basics

Even if the client doesn't think they have EU/CA traffic, build as if they do:

- Privacy policy linked in footer
- "Contact us to delete your data" mechanism
- No third-party tracking without consent (we use Cloudflare Analytics, which is privacy-preserving and doesn't require a cookie banner)

### Cookie consent

**Tenvaro sites should default to no-tracking-cookies.** Cloudflare Web Analytics doesn't set cookies. If the client insists on Google Analytics, add a proper consent banner.

---

## Logging and data exposure

### Never log

- Secrets, API keys, tokens
- Passwords (even hashed)
- Full credit card numbers (we shouldn't handle these anyway)
- Social security numbers, government IDs
- Health information

### Carefully log

- Emails: consider hashing or redacting for aggregate analytics
- IPs: fine for rate limiting, redact in long-term logs

### Log scrubbing

Before shipping, grep the codebase for:

```bash
grep -r "console.log.*password\|console.log.*token\|console.log.*secret" src/
```

---

## Incident response

### Preparation

Before first client launches:

1. Write `playbooks/incident-response.md` with contact info, escalation path
2. Set up monitoring/alerting (Cloudflare native alerts are a good start)
3. Document rollback procedure for each project

### If something goes wrong

1. **Contain first.** Disable the compromised endpoint, rotate secrets.
2. **Communicate.** Client gets a call within 1 hour of discovery.
3. **Fix.** Don't rush — verify the fix before deploying.
4. **Document.** Post-incident writeup in `decisions/` with root cause and prevention.

---

## Security checklist before launch

- [ ] All secrets in Wrangler/Pages, not in code
- [ ] CSP header configured
- [ ] HSTS header configured (only after confirming no HTTP needs)
- [ ] CORS limited to client domains
- [ ] All forms have honeypot + time check
- [ ] All Worker routes validate input with Zod
- [ ] Rate limiting on public endpoints
- [ ] Dependabot enabled
- [ ] `.env` is in `.gitignore`
- [ ] Secrets scan passes (manual or tool)
- [ ] Privacy policy page live
- [ ] No console.log of sensitive data
- [ ] `admin` / `login` routes (if any) behind auth with proper session handling

---

## What Claude Code should always do

- Validate every input with a Zod schema
- Use prepared statements for D1 queries
- Put secrets in Wrangler secrets, not code
- Add honeypot and time checks to forms
- Default to restrictive CORS and CSP

## What Claude Code should never do

- Commit secrets, even temporarily "to test"
- Render unescaped user input
- Use `Access-Control-Allow-Origin: *` on endpoints that handle data
- Store passwords in plain text or with fast hashes (SHA/MD5)
- Log sensitive data
- Disable security features to "make something work" without a documented ADR

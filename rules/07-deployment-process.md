# 07 — Deployment Process

**Purpose:** How the Grubble Eats marketing site goes from "built on my machine" to "live at `grubbleeats.com`." One project, one Cloudflare Pages app, one domain.

**Read after:** `00-project-conventions.md`, `02-cloudflare-patterns.md`, `04-security-practices.md`

---

## Project facts (LOCKED)

| Thing | Value |
|---|---|
| Cloudflare Pages project name | `grubble-site` |
| GitHub repo | `mrjei/grubble-site` |
| Production custom domain | `grubbleeats.com` (apex) |
| App demo (separate repo, do not touch) | `app.grubbleeats.com` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 |
| Only secret | `BREVO_API_KEY` (set in Pages dashboard) |

---

## The three environments

| Environment | URL pattern | Purpose |
|---|---|---|
| Local | `http://localhost:4321` | Active development (`npm run dev`) |
| Preview | `<hash>.grubble-site.pages.dev` | Cloudflare Pages preview deploys (any non-`main` branch / PR) |
| Production | `grubbleeats.com` | Live, public — custom domain attached manually by James |

---

## Branch mapping

- **`main` branch** → Production. Pushes to `main` trigger a production Pages build/deploy once the repo is connected.
- **Any other branch / PR** → automatic Pages **preview** deployment at a `*.pages.dev` URL.

No dedicated `dev`/preview branch is needed initially — Pages gives every branch a preview URL out of the box. Add a long-lived staging branch later only if the workflow demands it.

---

## What triggers a deploy

Once the Pages project is connected to the GitHub repo:

1. Push to `main` → production build.
2. The build runs `npm run build`; Pages bundles `dist/` + the `functions/` waitlist endpoint automatically.
3. Preview deploys happen for every other branch/PR with zero extra config.

---

## First-time setup (James's manual steps — done once)

The agent's job ends at "scaffold committed to local git, builds clean, ready for the repo + Pages connection." The following are **manual steps James performs** — the agent does NOT run these:

1. **Create the GitHub repo** `mrjei/grubble-site` and push the local scaffold.
2. **Create / connect the Cloudflare Pages project** `grubble-site` to that repo:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Output directory: `dist`
   - Production branch: `main`
   - `NODE_VERSION` = `20`
3. **Set the environment variable** `BREVO_API_KEY` (and optionally `BREVO_LIST_ID`) in the Pages dashboard → Settings → Environment variables (Production + Preview as desired).
4. **Attach the custom domain** `grubbleeats.com`:
   - Pages project → Custom domains → add `grubbleeats.com` (and `www` redirect if desired).
   - DNS already lives in James's Cloudflare account; add/confirm the CNAME (apex via CNAME flattening) Pages prescribes.
   - Enable "Always Use HTTPS"; enable HSTS once confirmed stable.
5. **Paste the Cloudflare Web Analytics beacon token** into the base layout placeholder.

> **Do NOT deploy to the apex domain from the agent.** Leave the site "live in a Pages preview, ready for custom domain attachment." James owns DNS + domain attachment.

---

## Pre-deploy checklist (every production deploy)

Before pushing to `main`:

- [ ] `npm run build` succeeds locally.
- [ ] `npm run dev` — waitlist form tested; fails *gracefully* without `BREVO_API_KEY` (no crash).
- [ ] Lighthouse ≥ 95 across Performance / Accessibility / Best Practices / SEO on the home page.
- [ ] Mobile layout verified at 375px and 414px.
- [ ] No console errors on any page.
- [ ] No broken links.
- [ ] No `console.log` of sensitive data.
- [ ] No launch-blocking TODO/FIXME.
- [ ] `BREVO_API_KEY` is in the Pages dashboard, not in code.
- [ ] Git diff reviewed — no accidental commits, no `.env`.

For the **first-ever production deploy** also:

- [ ] DNS for `grubbleeats.com` resolves and the custom domain is attached.
- [ ] SSL certificate active.
- [ ] `robots.txt` allows crawling of production.
- [ ] `sitemap.xml` accessible.
- [ ] OG image + sharing preview verified (Facebook debugger / Twitter validator).
- [ ] Cloudflare Web Analytics beacon token pasted and reporting.
- [ ] `SoftwareApplication` JSON-LD validates (Rich Results test).

---

## Rollback procedures

### Rolling back a Pages deploy

Cloudflare Pages keeps deployment history. To roll back:

1. Cloudflare dashboard → Pages → `grubble-site` → Deployments.
2. Find the last known-good deployment.
3. "..." → "Rollback to this deployment."

Propagates globally in ~30 seconds.

### Rolling back code

Since deploys are Git-driven, reverting is also a normal Git revert + push to `main`:

```bash
git revert <bad-commit>
git push origin main
```

There is no Worker or D1 to roll back separately — the waitlist function is part of the same Pages deployment, so a Pages rollback reverts it too.

---

## Deployment troubleshooting

### "Build failed in Cloudflare Pages"

1. Check the build logs in the Pages dashboard.
2. Verify `NODE_VERSION` = `20`.
3. Ensure `package-lock.json` is committed.
4. Reproduce locally: `npm ci && npm run build`.

### "Site loads but the waitlist form doesn't work"

1. Browser DevTools → Network → inspect the `/api/waitlist` response.
2. Confirm `BREVO_API_KEY` is set in the Pages dashboard (Production scope). Without it, the function returns a graceful success but stores nothing — that's expected behavior, not a bug.
3. Check Pages Function logs (Pages project → Functions → real-time logs, or `wrangler pages deployment tail`).
4. Confirm the CSP `connect-src 'self'` allows the same-origin POST (it does) and `form-action 'self'` isn't blocking.

### "Site is slow / SSL error"

1. Purge Cloudflare cache: dashboard → Caching → Purge Everything.
2. Check SSL/TLS encryption mode is "Full (strict)".
3. Verify the custom domain DNS record is correct and proxied (orange cloud).

### "Custom domain not working"

1. Verify the DNS record matches what the Pages custom-domain UI prescribes.
2. Confirm `grubbleeats.com` is in the same Cloudflare account as the Pages project.
3. Wait 5–10 minutes after attaching the domain for SSL provisioning.

---

## Ongoing monitoring

- **Traffic / CWV:** Cloudflare Web Analytics (cookieless, real-user metrics).
- **Uptime:** Cloudflare alerts (or a free external check like UptimeRobot).
- **Waitlist health:** spot-check Brevo periodically to confirm new contacts are landing.
- **SSL expiration:** Cloudflare renews automatically; verify occasionally.

---

## What the agent should always do

- Use the locked project facts (`grubble-site`, `mrjei/grubble-site`, `grubbleeats.com`) consistently.
- Stop at "ready for repo + Pages connection" — leave DNS/domain attachment to James.
- Test the waitlist form end-to-end locally before declaring work done.
- Keep `main` clean; never commit `.env` or secrets.

## What the agent should never do

- Deploy to `grubbleeats.com` root or attach the custom domain — that's James's manual step.
- Run `gh repo create`, `wrangler d1 create`, or `wrangler deploy` for a Worker — none apply to this site.
- Commit secrets "just to test the deploy."
- Push directly to `main` from a feature branch without review once the repo is connected.

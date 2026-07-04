/**
 * POST /api/waitlist — Cloudflare Pages Function.
 *
 * Reads { email, source? } from a JSON body, validates it, and adds the contact
 * to a Brevo list (the "Grubble Eats waitlist", list id 4 in prod via
 * BREVO_LIST_ID). The optional `source` records which funnel surface the signup
 * came from and is persisted as the Brevo contact attribute SOURCE so the funnel
 * can be split by origin.
 *
 * Storage lives in Brevo — there is no D1 and no standalone Worker. The handler
 * degrades gracefully when BREVO_API_KEY is unset (logs + returns 200) so local
 * dev and preview deploys never crash.
 *
 * CORS: the same-origin landing form (grubbleeats.com) and the Flutter app origin
 * (app.grubbleeats.com) are allowlisted; OPTIONS preflight is handled below.
 *
 * Secrets/config are set in the Cloudflare Pages dashboard → Settings →
 * Environment variables.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-TIME BREVO SETUP (so `source` actually persists):
 *   Create a contact attribute named SOURCE (type: Text) in Brevo →
 *   Contacts → Settings → Contact attributes. Until it exists, Brevo rejects the
 *   attribute and this handler falls back to storing the email WITHOUT the source
 *   (the signup is never lost — see addToBrevo below).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { z } from 'zod';

interface Env {
  // Configured in the Cloudflare Pages dashboard. Brevo handles storage and the
  // double opt-in / confirmation email — no repo changes needed for that flow.
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  ALLOWED_ORIGIN?: string; // landing origin, defaults to https://grubbleeats.com
  APP_ORIGIN?: string; // Flutter app origin, defaults to https://app.grubbleeats.com
}

// Funnel surfaces a signup can originate from. Persisted to Brevo as SOURCE.
// `landing` is the default so the existing same-origin landing form — which
// sends no `source` — keeps working unchanged.
const SOURCES = ['landing', 'app-gate', 'post-match'] as const;

const waitlistSchema = z.object({
  email: z.string().trim().email().max(200),
  // Optional funnel source. Defaults to 'landing' when omitted or invalid input
  // would otherwise be rejected — the enum guards against arbitrary values.
  source: z.enum(SOURCES).default('landing'),
  // Honeypot: real users never fill this. We allow it through validation so a
  // tripped honeypot can be answered with a fake success (don't tip off bots) —
  // the emptiness check happens in the handler below.
  website: z.string().max(256).optional(),
});

const DEFAULT_LANDING_ORIGIN = 'https://grubbleeats.com';
const DEFAULT_APP_ORIGIN = 'https://app.grubbleeats.com';

function allowedOrigins(env: Env): string[] {
  return [
    env.ALLOWED_ORIGIN ?? DEFAULT_LANDING_ORIGIN,
    env.APP_ORIGIN ?? DEFAULT_APP_ORIGIN,
  ];
}

function corsHeaders(
  env: Env,
  requestOrigin: string | null,
): Record<string, string> {
  const allowed = allowedOrigins(env);
  // Reflect the caller's Origin only when it's allowlisted (never '*' on a data
  // endpoint). For same-origin / no-Origin requests — like the landing form —
  // CORS isn't enforced anyway, so falling back to the landing origin is safe
  // and keeps that flow unchanged.
  const origin =
    requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    // Response varies by request Origin, so caches must key on it.
    Vary: 'Origin',
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  env: Env,
  requestOrigin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(env, requestOrigin),
    },
  });
}

// --- Light, best-effort per-IP rate limiting --------------------------------
// In-memory fixed window, scoped to a single edge isolate — no KV/D1, no new
// infrastructure. It blunts trivial bursts from one IP; the durable limit is the
// Cloudflare dashboard Rate Limiting Rule on /api/waitlist (see
// rules/02-cloudflare-patterns.md). Fails open, so a real user is never wrongly
// blocked if this misbehaves.
const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string | null, now: number): boolean {
  if (!ip) return false; // no IP header → don't block
  const entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Opportunistically prune expired entries so the map can't grow unbounded
    // across a long-lived isolate.
    if (hits.size > 5000) {
      for (const [key, value] of hits) {
        if (now >= value.resetAt) hits.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

/**
 * Adds/updates the contact in Brevo, persisting the funnel surface as SOURCE.
 * `updateEnabled` makes a re-signup idempotent (Brevo returns 204, not an error),
 * which is what the app gate needs when it retries. Returns true on success.
 *
 * Resilience: if the SOURCE attribute hasn't been created in Brevo yet, Brevo
 * rejects the attribute (invalid_parameter). We never lose a signup over that —
 * we retry once without attributes so the email is still captured.
 */
async function addToBrevo(
  env: Env,
  email: string,
  source: string,
): Promise<boolean> {
  const post = (withAttributes: boolean): Promise<Response> =>
    fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : undefined,
        updateEnabled: true, // re-signup is idempotent, not an error
        ...(withAttributes ? { attributes: { SOURCE: source } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });

  try {
    const res = await post(true);

    // 201 created, 204 updated → success.
    if (res.ok) {
      console.log(`[waitlist] added email=${email} source=${source}`);
      return true;
    }

    const data = (await res.json().catch(() => null)) as {
      code?: string;
    } | null;

    // Re-signup: "contact already exists" is a success for us, not an error.
    if (data?.code === 'duplicate_parameter') {
      console.log(`[waitlist] existing email=${email} source=${source}`);
      return true;
    }

    // SOURCE attribute not defined in Brevo yet → don't drop the signup.
    if (data?.code === 'invalid_parameter') {
      console.warn(
        `[waitlist] Brevo rejected attributes (create the SOURCE attribute) — retrying without source. email=${email}`,
      );
      const retry = await post(false);
      if (retry.ok) return true;
      const retryData = (await retry.json().catch(() => null)) as {
        code?: string;
      } | null;
      if (retryData?.code === 'duplicate_parameter') return true;
      console.error(
        `[waitlist] Brevo retry failed status=${retry.status} code=${retryData?.code ?? 'unknown'}`,
      );
      return false;
    }

    console.error(
      `[waitlist] Brevo error status=${res.status} code=${data?.code ?? 'unknown'}`,
    );
    return false;
  } catch (error) {
    console.error('[waitlist] request failed:', error);
    return false;
  }
}

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) =>
  new Response(null, {
    status: 204,
    headers: corsHeaders(env, request.headers.get('Origin')),
  });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestOrigin = request.headers.get('Origin');

  // Light per-IP guard (best-effort; see rateLimited above).
  if (rateLimited(request.headers.get('CF-Connecting-IP'), Date.now())) {
    return json(
      { ok: false, message: 'Too many requests. Please try again in a minute.' },
      429,
      env,
      requestOrigin,
    );
  }

  const payload = await request.json().catch(() => null);
  const result = waitlistSchema.safeParse(payload);

  if (!result.success) {
    return json(
      { ok: false, message: 'Please enter a valid email address.' },
      400,
      env,
      requestOrigin,
    );
  }

  const { email, source, website } = result.data;

  // Honeypot tripped — pretend success, store nothing.
  if (website && website.length > 0) {
    return json({ ok: true, message: 'Thanks!' }, 200, env, requestOrigin);
  }

  // Graceful fallback for local dev / preview where the key isn't bound.
  // Production has BREVO_API_KEY set, so this branch doesn't run there.
  if (!env.BREVO_API_KEY) {
    console.log(
      `[waitlist] BREVO_API_KEY not set — would have added: ${email} (source=${source})`,
    );
    return json(
      { ok: true, message: "You're on the list!" },
      200,
      env,
      requestOrigin,
    );
  }

  const ok = await addToBrevo(env, email, source);
  if (ok) {
    return json(
      { ok: true, message: "You're on the list!" },
      200,
      env,
      requestOrigin,
    );
  }

  return json(
    { ok: false, message: 'Something went wrong. Please try again.' },
    502,
    env,
    requestOrigin,
  );
};

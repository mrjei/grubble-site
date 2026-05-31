/**
 * POST /api/waitlist — Cloudflare Pages Function.
 *
 * Reads { email } from a JSON body, validates it, and adds the contact to a
 * Brevo list. Degrades gracefully when BREVO_API_KEY is unset (logs + returns
 * 200) so local dev and preview deploys never crash.
 *
 * Secrets are set in the Cloudflare Pages dashboard → Settings → Environment
 * variables. There is no D1 and no standalone Worker — storage lives in Brevo.
 */
import { z } from 'zod';

interface Env {
  // TODO: set BREVO_API_KEY in the Cloudflare Pages dashboard after deploy.
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  ALLOWED_ORIGIN?: string;
}

const waitlistSchema = z.object({
  email: z.string().trim().email().max(200),
  // Honeypot: real users never fill this. We allow it through validation so a
  // tripped honeypot can be answered with a fake success (don't tip off bots) —
  // the emptiness check happens in the handler below.
  website: z.string().max(256).optional(),
});

function corsHeaders(env: Env): Record<string, string> {
  const origin = env.ALLOWED_ORIGIN ?? 'https://grubbleeats.com';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  env: Env,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(env) },
  });
}

export const onRequestOptions: PagesFunction<Env> = async ({ env }) =>
  new Response(null, { status: 204, headers: corsHeaders(env) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const payload = await request.json().catch(() => null);
  const result = waitlistSchema.safeParse(payload);

  if (!result.success) {
    return json(
      { ok: false, message: 'Please enter a valid email address.' },
      400,
      env,
    );
  }

  const { email, website } = result.data;

  // Honeypot tripped — pretend success, store nothing.
  if (website && website.length > 0) {
    return json({ ok: true, message: 'Thanks!' }, 200, env);
  }

  // Graceful fallback: no key configured yet (local dev / preview).
  if (!env.BREVO_API_KEY) {
    // TODO: set BREVO_API_KEY in the Cloudflare Pages dashboard.
    console.log(`[waitlist] BREVO_API_KEY not set — would have added: ${email}`);
    return json({ ok: true, message: "You're on the list!" }, 200, env);
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : undefined,
        updateEnabled: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    // 201 created, 204 updated. "Contact already exists" (400 duplicate_parameter)
    // is a re-signup — treat as success, not an error.
    if (res.ok) {
      console.log(`[waitlist] added email=${email}`);
      return json({ ok: true, message: "You're on the list!" }, 200, env);
    }

    const data = (await res.json().catch(() => null)) as { code?: string } | null;
    if (data?.code === 'duplicate_parameter') {
      return json({ ok: true, message: "You're already on the list!" }, 200, env);
    }

    console.error(`[waitlist] Brevo error status=${res.status} code=${data?.code ?? 'unknown'}`);
    return json(
      { ok: false, message: 'Something went wrong. Please try again.' },
      502,
      env,
    );
  } catch (error) {
    console.error('[waitlist] request failed:', error);
    return json(
      { ok: false, message: 'Something went wrong. Please try again.' },
      502,
      env,
    );
  }
};

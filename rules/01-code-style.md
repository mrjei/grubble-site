# 01 — Code Style

**Purpose:** Code style rules for TypeScript, Astro, and CSS. Keeps every client build readable and maintainable.

**Read after:** `00-project-conventions.md`

---

## TypeScript

### Strict mode is non-negotiable

`tsconfig.json` must have:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true
  }
}
```

Do not disable strict mode to silence errors. Fix the types.

### Type definitions

- **Never use `any`.** Use `unknown` and narrow, or define a proper type.
- **Prefer `interface` for object shapes, `type` for unions/intersections.**
- **Export types from `src/types/` when shared across files.**
- **Co-locate types when used in only one file.**

Good:
```ts
interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: 'contact_form' | 'chatbot' | 'listing_inquiry';
}
```

Bad:
```ts
const lead: any = { /* ... */ };
```

### Function signatures

- **All exported functions have explicit return types.**
- **Prefer named parameters via object destructuring for 3+ arguments.**

Good:
```ts
export function createLead({
  name,
  email,
  source,
  phone,
}: {
  name: string;
  email: string;
  source: LeadSource;
  phone?: string;
}): Promise<Lead> { /* ... */ }
```

### Null and undefined handling

- **Use optional chaining (`?.`) and nullish coalescing (`??`).**
- **Don't check `if (x)` when you mean `if (x !== undefined)`** — it fails for `0`, `""`, `false`.

### Async code

- **Always `await` promises or return them.** Never fire-and-forget unless explicitly annotated.
- **Wrap async operations that can fail in try/catch, or use a Result pattern.**
- **Don't mix callbacks and promises.**

---

## Astro components

### File structure

Every `.astro` component follows this order:

```astro
---
// 1. Imports
import Button from './Button.astro';
import type { Listing } from '../types/listing';

// 2. Props interface
interface Props {
  listing: Listing;
  featured?: boolean;
}

// 3. Destructure props with defaults
const { listing, featured = false } = Astro.props;

// 4. Local computation
const formattedPrice = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(listing.price);
---

<!-- 5. Markup -->
<article class="listing-card">
  <h3>{listing.address}</h3>
  <p class="price">{formattedPrice}</p>
  {featured && <span class="badge">Featured</span>}
</article>

<!-- 6. Scoped styles (prefer Tailwind classes, use <style> only for complex cases) -->
<style>
  .listing-card {
    container-type: inline-size;
  }
</style>
```

### Component naming

- One component per file.
- File name matches component name (`ListingCard.astro` exports `ListingCard`).
- Components that are pages live in `src/pages/`, never imported elsewhere.
- Components that are reused live in `src/components/`.

### Client-side JavaScript

- **Default to zero JS.** Astro's strength is static HTML.
- **Use `<script>` tags only when interactivity is required.**
- **Scope scripts to the component** — don't create global state.
- **For complex interactivity, extract to a TypeScript module in `src/lib/` and import.**

Avoid React/Vue/Svelte islands unless genuinely needed (e.g., a complex chatbot UI). Astro's built-in `<script>` tags handle 90% of cases.

---

## CSS and Tailwind

### Design tokens over hardcoded values

**Never hardcode colors, fonts, spacing, or shadows in components.** Always reference design tokens.

Bad:
```astro
<div class="bg-[#0a0a0a] text-[#5cb97a]">
```

Good:
```astro
<div class="bg-surface-base text-brand-primary">
```

Design tokens are defined in `src/styles/tokens.css` and mapped to Tailwind via `tailwind.config.js`. See `03-design-system.md` for the full token system.

### Tailwind conventions

- **Prefer utility classes for 95% of styling.**
- **Group utilities logically:** layout → spacing → typography → color → effects.
- **Use `@apply` in `<style>` blocks only for complex repeated patterns.**
- **Never mix utility classes with arbitrary values** like `w-[347px]` unless solving a very specific design constraint. If you find yourself reaching for arbitrary values, check whether a token is missing.

### Responsive design

- **Mobile-first.** Base styles = mobile. Add breakpoint prefixes for larger screens.
- **Standard breakpoints:** `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px). Don't invent new ones without a reason.

Example:
```astro
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

### Accessibility-first class choices

- Use `sr-only` for screen-reader-only text.
- Use `focus-visible:` for focus styles, not `focus:` — only show focus rings on keyboard nav.
- Use `motion-safe:` / `motion-reduce:` for animations.

---

## Comments

**Comment the why, not the what.**

Bad:
```ts
// Increment counter
counter++;
```

Good:
```ts
// Retry up to 3 times because the MLS API occasionally returns 503
// during their nightly maintenance window (2-3am ET).
const MAX_RETRIES = 3;
```

### Required comment locations

- **Every exported function:** JSDoc with purpose, params, return, and any surprising behavior.
- **Any non-obvious workaround:** link to the issue or explain the constraint.
- **Any magic number or string:** explain where it came from.

### TODO and FIXME

- `// TODO:` followed by a short description and (if possible) a ticket or issue link.
- `// FIXME:` only for known bugs that must be fixed before deploy.
- Grep for TODOs before deploying. Don't ship FIXMEs.

---

## Imports

### Order

1. Node/runtime built-ins
2. External packages
3. Internal absolute imports (`@/lib/...`)
4. Relative imports (`./...`, `../...`)
5. Type-only imports (use `import type`)

### No wildcard imports

Bad: `import * as utils from './utils';`
Good: `import { formatPrice, slugify } from './utils';`

### Absolute imports for `src/`

Configure `tsconfig.json` paths:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Then use `@/components/...` instead of `../../components/...`.

---

## Error handling

### Never swallow errors silently

Bad:
```ts
try {
  await doThing();
} catch (e) {
  // ignore
}
```

Good:
```ts
try {
  await doThing();
} catch (error) {
  console.error('Failed to doThing:', error);
  // Decide explicitly: rethrow, return fallback, or notify user
  throw new Error('Could not complete operation', { cause: error });
}
```

### User-facing errors

- Never expose stack traces or internal error messages to users.
- Return friendly, actionable messages: "We couldn't send your message. Please try again or email us directly at [email]."

### Worker error responses

Always return structured JSON errors with appropriate status codes:

```ts
return new Response(
  JSON.stringify({ error: 'invalid_email', message: 'Please enter a valid email address.' }),
  { status: 400, headers: { 'content-type': 'application/json' } }
);
```

---

## What Claude Code should always do

- Match existing code style before introducing new patterns
- Run `tsc --noEmit` mentally (or actually) before declaring work done
- Prefer small, focused functions over large ones
- Extract repeated logic into utilities in `src/lib/`

## What Claude Code should never do

- Use `any` — use `unknown` and narrow, or define a proper type
- Disable lint rules inline without a comment explaining why
- Create deeply nested ternaries — use early returns or extracted functions
- Mix concerns in a single file (e.g., DB queries + email sending + HTTP handling)

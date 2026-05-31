# 03 — Design System

**Purpose:** The design token system for the Grubble Eats marketing site. The tokens below are the **locked Grubble brand tokens** (mirrored from the app's `--gr-*` system) so the site reads as the same brand as the app. The *system* (tokens-not-hardcoded, the scales, the a11y rules) is universal; the *values* are Grubble's.

**Read after:** `00-project-conventions.md`, `01-code-style.md`

**Canonical source:** `D:\AI Knowledge Base\Projects\Grubble\grubble-v2-design-system.md` and `design-source/exports/grubble-tokens.css`. When in doubt, defer to those.

---

## Core principle: tokens, not hardcoded values

Every color, font, size, spacing value, shadow, and radius comes from a token. Tokens live in `src/styles/tokens.css` as CSS custom properties (the `--gr-*` namespace, matching the app) and are mapped to Tailwind in `tailwind.config.mjs`.

**This is the single most important design rule.** Never hardcode a hex, font name, or spacing value in a component.

---

## Default theme: LIGHT (warm cream)

The marketing site is **light-mode default** — warm cream page, soft-ink text, forest-green brand accent. (The app supports full dark/light parity; the website ships the light/cream system as its baseline.) The cream is intentional: it reads as warm/food-forward (DoorDash / Resy / Eater), not clinical white.

---

## Token categories

### 1. Colors (LOCKED Grubble values)

Semantic naming, `--gr-*` namespace to match the app.

```css
:root {
  /* Brand */
  --gr-primary:         #1F5B3F;   /* Grubble forest green — primary accent, CTAs */
  --gr-primary-hover:   #1A4D35;
  --gr-primary-pressed: #143E2B;
  --gr-primary-subtle:  #E6F0EA;   /* tinted green wash for soft backgrounds */
  --gr-primary-border:  #CFE0D5;
  --gr-on-primary:      #0A0A0A;   /* near-black content on brand green */

  /* Cream — the brand's "icon on dark/green" color, also the Fork-G fill */
  --gr-cream:           #F5F1EB;   /* a.k.a. --gr-icon-on-dark; cream Fork-G on green ground */

  /* Surfaces (light/cream system) */
  --gr-bg:              #FAF7F2;   /* page background — warm cream (LOCKED) */
  --gr-bg-raised:       #FFFFFF;   /* cards/sheets — pure white lifts off cream */
  --gr-surface:         #FFFFFF;
  --gr-surface-muted:   #F4F0E7;
  --gr-surface-sunken:  #EDE7DA;

  /* Text */
  --gr-text-primary:    #1A1A18;   /* soft ink, not pure black (LOCKED) */
  --gr-text-secondary:  #5B544A;   /* warm muted — subheads, helper text */
  --gr-text-tertiary:   #8A8278;
  --gr-text-on-brand:   #F5F1EB;   /* cream text on green ground */

  /* Borders */
  --gr-border-subtle:   #EFE9DC;   /* dividers, hairlines */
  --gr-border-default:  #E2DBCB;   /* card edges, input borders */
  --gr-border-strong:   #1A1A18;

  /* Feedback */
  --gr-success: #1F8A4F;
  --gr-warning: #D98E22;
  --gr-danger:  #C8392A;
  --gr-info:    #2E5BC8;

  /* Focus ring */
  --gr-focus-ring: var(--gr-primary);
}
```

> **Reconciliation note:** the page background is **`#FAF7F2`** and primary text is **`#1A1A18`** — the values locked for this site. The app's canonical `tokens.jsx` carries `#FBF8F2` / `#1A1612` for the in-app surfaces; the difference is imperceptible and the website uses the values above. The brand green `#1F5B3F` and cream `#F5F1EB` are identical to the app.

### 2. Typography (LOCKED — Cabinet Grotesk + Satoshi)

Two families, matching the app. Loaded via **Fontshare** (see `06-performance-standards.md` for loading strategy). `-apple-system, system-ui` fallback so a Fontshare outage never surfaces blank text.

```css
:root {
  /* Font families */
  --gr-font-display: 'Cabinet Grotesk', -apple-system, system-ui, sans-serif;  /* display headlines */
  --gr-font-body:    'Satoshi', -apple-system, system-ui, sans-serif;          /* body + UI text */
  --gr-font-mono:    ui-monospace, 'SFMono-Regular', Menlo, monospace;

  /* Font sizes (fluid: scale between viewport min/max) */
  --gr-text-xs:   clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem);
  --gr-text-sm:   clamp(0.875rem, 0.825rem + 0.25vw, 0.9375rem);
  --gr-text-base: clamp(1rem, 0.95rem + 0.25vw, 1.0625rem);
  --gr-text-lg:   clamp(1.125rem, 1.05rem + 0.4vw, 1.25rem);
  --gr-text-xl:   clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --gr-text-2xl:  clamp(1.5rem, 1.3rem + 1vw, 2rem);
  --gr-text-3xl:  clamp(1.875rem, 1.5rem + 1.875vw, 2.75rem);
  --gr-text-4xl:  clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem);
  --gr-text-5xl:  clamp(3rem, 2.25rem + 3.75vw, 5rem);

  /* Font weights — Cabinet Grotesk Extrabold (800) for display; Satoshi 300–900 */
  --gr-weight-light:    300;
  --gr-weight-regular:  400;
  --gr-weight-medium:   500;
  --gr-weight-bold:     700;
  --gr-weight-extrabold:800;
  --gr-weight-black:    900;

  /* Line heights */
  --gr-leading-tight:   1.1;
  --gr-leading-snug:    1.25;
  --gr-leading-normal:  1.5;
  --gr-leading-relaxed: 1.625;

  /* Letter spacing */
  --gr-tracking-tight:  -0.02em;
  --gr-tracking-normal: 0em;
  --gr-tracking-wide:   0.04em;
  --gr-tracking-widest: 0.15em;   /* "EATS" subtitle treatment */
}
```

**Usage:** Cabinet Grotesk for display headlines and the three "What It Does" headline words (Swipe / Match / Ask). Satoshi for everything else — body, subheads, buttons, labels.

### 3. Spacing

Mirror the app's 4/8/12/16/24/32/48/64 progression.

```css
:root {
  --gr-space-1: 0.25rem;  /* 4px  */
  --gr-space-2: 0.5rem;   /* 8px  */
  --gr-space-3: 0.75rem;  /* 12px */
  --gr-space-4: 1rem;     /* 16px */
  --gr-space-6: 1.5rem;   /* 24px */
  --gr-space-8: 2rem;     /* 32px */
  --gr-space-12: 3rem;    /* 48px */
  --gr-space-16: 4rem;    /* 64px */
  --gr-space-24: 6rem;    /* 96px */
  --gr-space-32: 8rem;    /* 128px */
}
```

### 4. Radii

The app's personality default is **`--gr-radius-sm` (4px)** — "soft confident," not pillowy.

```css
:root {
  --gr-radius-xs:   2px;
  --gr-radius-sm:   4px;    /* default — buttons, cards, inputs */
  --gr-radius-md:   8px;
  --gr-radius-lg:   12px;
  --gr-radius-xl:   16px;
  --gr-radius-2xl:  24px;
  --gr-radius-pill: 999px;
}
```

### 5. Shadows

Warm-tinted (not pure black) to match the cream foundation. Premium = restrained.

```css
:root {
  --gr-elev-xs: 0 1px 2px 0 rgba(20,14,8,0.06);
  --gr-elev-sm: 0 2px 6px -1px rgba(20,14,8,0.08), 0 1px 2px 0 rgba(20,14,8,0.04);
  --gr-elev-md: 0 8px 20px -4px rgba(20,14,8,0.10), 0 2px 6px -1px rgba(20,14,8,0.05);
  --gr-elev-lg: 0 16px 32px -8px rgba(20,14,8,0.14), 0 6px 12px -4px rgba(20,14,8,0.06);
  --gr-elev-xl: 0 32px 64px -16px rgba(20,14,8,0.22), 0 12px 24px -8px rgba(20,14,8,0.08);
}
```

### 6. Motion (durations + easings, from the app's locked tokens)

```css
:root {
  --gr-dur-instant: 80ms;
  --gr-dur-fast:    140ms;
  --gr-dur-base:    220ms;
  --gr-dur-slow:    360ms;

  --gr-ease-standard:   cubic-bezier(0.2, 0.0, 0, 1);
  --gr-ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
  --gr-ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1);
  --gr-ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 7. Layout

```css
:root {
  --gr-container-sm: 40rem;
  --gr-container-md: 48rem;
  --gr-container-lg: 64rem;
  --gr-container-xl: 80rem;
  --gr-content-max-width: 72ch;
}
```

---

## Tailwind configuration

Map tokens to Tailwind utilities in `tailwind.config.mjs`. Light-mode default — no `darkMode` flip needed for this site.

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts,md}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--gr-primary)',
        'primary-hover': 'var(--gr-primary-hover)',
        'primary-pressed': 'var(--gr-primary-pressed)',
        'primary-subtle': 'var(--gr-primary-subtle)',
        'on-primary': 'var(--gr-on-primary)',
        cream: 'var(--gr-cream)',
        bg: 'var(--gr-bg)',
        'bg-raised': 'var(--gr-bg-raised)',
        surface: 'var(--gr-surface)',
        'surface-muted': 'var(--gr-surface-muted)',
        'text-primary': 'var(--gr-text-primary)',
        'text-secondary': 'var(--gr-text-secondary)',
        'text-tertiary': 'var(--gr-text-tertiary)',
        'text-on-brand': 'var(--gr-text-on-brand)',
        'border-subtle': 'var(--gr-border-subtle)',
        'border-default': 'var(--gr-border-default)',
      },
      fontFamily: {
        display: 'var(--gr-font-display)',
        body: 'var(--gr-font-body)',
        mono: 'var(--gr-font-mono)',
      },
      fontSize: {
        xs: 'var(--gr-text-xs)',
        sm: 'var(--gr-text-sm)',
        base: 'var(--gr-text-base)',
        lg: 'var(--gr-text-lg)',
        xl: 'var(--gr-text-xl)',
        '2xl': 'var(--gr-text-2xl)',
        '3xl': 'var(--gr-text-3xl)',
        '4xl': 'var(--gr-text-4xl)',
        '5xl': 'var(--gr-text-5xl)',
      },
      borderRadius: {
        xs: 'var(--gr-radius-xs)',
        sm: 'var(--gr-radius-sm)',
        md: 'var(--gr-radius-md)',
        lg: 'var(--gr-radius-lg)',
        xl: 'var(--gr-radius-xl)',
        '2xl': 'var(--gr-radius-2xl)',
        pill: 'var(--gr-radius-pill)',
      },
      boxShadow: {
        xs: 'var(--gr-elev-xs)',
        sm: 'var(--gr-elev-sm)',
        md: 'var(--gr-elev-md)',
        lg: 'var(--gr-elev-lg)',
        xl: 'var(--gr-elev-xl)',
      },
      transitionDuration: {
        instant: '80ms',
        fast: '140ms',
        base: '220ms',
        slow: '360ms',
      },
      transitionTimingFunction: {
        standard: 'var(--gr-ease-standard)',
        decelerate: 'var(--gr-ease-decelerate)',
        accelerate: 'var(--gr-ease-accelerate)',
        spring: 'var(--gr-ease-spring)',
      },
    },
  },
};
```

---

## Component patterns

### Buttons

Three variants: primary, secondary, ghost. Two sizes: default, small. Default radius `sm` (4px).

```astro
---
// src/components/Button.astro
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'small';
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  target?: '_self' | '_blank';
}

const { variant = 'primary', size = 'default', href, type = 'button', target } = Astro.props;
const Tag = href ? 'a' : 'button';

const baseClasses =
  'inline-flex items-center justify-center gap-2 font-body font-bold rounded-sm transition-colors duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses = {
  // Brand green CTA → near-black content (--gr-on-primary)
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-surface text-text-primary border border-border-default hover:border-border-strong',
  ghost: 'text-text-primary hover:bg-surface-muted',
};

const sizeClasses = {
  default: 'px-6 py-3 text-base',
  small: 'px-4 py-2 text-sm',
};
---

<Tag
  class:list={[baseClasses, variantClasses[variant], sizeClasses[size]]}
  href={href}
  target={href ? target : undefined}
  type={href ? undefined : type}
>
  <slot />
</Tag>
```

**Note:** the primary CTA puts near-black (`--gr-on-primary` `#0A0A0A`) content on the brand green — that's the locked contrast pairing from the design system, not white-on-green.

### Forms

- Label every input.
- Error states use `--gr-danger` and `aria-invalid`.
- Submit buttons show a loading state.
- Honeypot field (name: `website`) on every form — see `04-security-practices.md`.

---

## Accessibility requirements (non-negotiable)

### Color contrast

- Body text: minimum 4.5:1 against background (WCAG AA). `--gr-text-primary #1A1A18` on `--gr-bg #FAF7F2` passes comfortably.
- Large text (18pt+ / 14pt+ bold): minimum 3:1.
- UI elements and graphics: minimum 3:1. Verify cream-on-green (`#F5F1EB` on `#1F5B3F`) and near-black-on-green pairings — both pass per the locked design system.

**Test every color pair with a contrast checker. Don't eyeball it.**

### Focus states

- Every interactive element has a visible focus state using `--gr-focus-ring`.
- Use `focus-visible:` not `focus:`.

### Semantic HTML

- Use `<nav>`, `<main>`, `<section>`, `<footer>`.
- One `<h1>` per page. Don't skip heading levels.
- `<button>` for actions, `<a>` for navigation.

### Images

- Meaningful `alt` text, or `alt=""` for purely decorative marks.
- Lazy-load below-the-fold images.

---

## Motion and animation

- **Default to no animation.** Add motion only when it reinforces meaning.
- **Always respect `prefers-reduced-motion`.**
- **Transitions: 80–360ms** (use the `--gr-dur-*` ladder). Anything longer feels sluggish.
- **Animate `transform` and `opacity` only.** Never `width`/`height`/`top`/`left`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Brand mark + icons

### Fork-G brand mark

The Fork-G squircle (cream Fork-G letterform on a `#1F5B3F` green ground) is the canonical brand mark — see `BrandMark.astro`. Path data is sourced from the locked `g-ref.svg` / `BrandMarkH`. Cream fill is `--gr-cream` (`#F5F1EB`); green ground is `--gr-primary`.

### Icon system

- Use **Phosphor icons** (Regular weight default, Bold for active/emphasis) — matches the Flutter app's locked icon family. Inherit `currentColor`; never hardcode icon colors.
- Standard sizes: 20px (default), 16px (small), 24px (large).

---

## What the agent should always do

- Reference design tokens via Tailwind classes or `--gr-*` custom properties.
- Use Cabinet Grotesk for display, Satoshi for body — never substitute.
- Test color contrast before shipping.
- Use semantic HTML first, ARIA second.
- Respect `prefers-reduced-motion`.

## What the agent should never do

- Hardcode colors, sizes, or spacing values in components.
- Invent new tokens without adding them to `tokens.css`.
- Put white text on the brand green CTA (use near-black `--gr-on-primary`).
- Ship animations longer than 360ms or animate layout properties.
- Use a pure-white page background — the page is warm cream (`#FAF7F2`).

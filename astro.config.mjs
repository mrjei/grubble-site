import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Grubble Eats marketing site — static-first Astro build, deployed to Cloudflare Pages.
// Domain locked to grubbleeats.com (overrides the older grubble.app reference in the build plan).
export default defineConfig({
  site: 'https://grubbleeats.com',
  integrations: [
    tailwind({
      // Tokens drive everything via tailwind.config.mjs; Astro injects its own base reset.
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
});

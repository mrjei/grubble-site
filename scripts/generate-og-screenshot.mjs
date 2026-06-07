/**
 * Generates the social-share Open Graph card from a REAL PWA screenshot:
 *   public/og-image-session.png   1200×630
 *
 * Composites the live group-session capture (public/screenshots/Sessions.png —
 * a 3-person session landing on Fonda Mariachi) onto a branded 1200×630 canvas
 * so Twitter/Facebook/LinkedIn previews render at the correct ratio instead of
 * cropping a tall phone screenshot.
 *
 * Run with `npm run gen:og`. Uses sharp (bundled with Astro's image service).
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const PRIMARY = '#1F5B3F';
const CREAM = '#F5F1EB';
const BG = '#FAF7F2';
const INK = '#1A1A18';

const SQUIRCLE =
  'M296.885 138.718C305.29 138.219 317.907 138.56 326.547 138.546L382.516 138.478L557.869 138.545L673.345 138.524C697.975 138.52 731.842 137.221 755.141 141.563C783.079 147.007 809.095 159.702 830.578 178.373C865.594 208.596 885.929 251.846 886.769 298.1C886.928 306.882 886.909 315.671 886.926 324.454L886.993 380.715L887.001 556.058L886.881 678.599C886.856 694.456 887.193 710.387 886.892 726.233C885.214 814.557 817.311 882.47 730.512 888.473C697.286 888.883 663.376 888.531 630.081 888.529L430.041 888.499L342.754 888.595C319.387 888.643 296.894 890.071 273.789 885.846C201.276 872.583 143.723 810.939 139.159 736.744C138.44 725.052 138.897 712.561 138.924 700.811L138.986 643.507L138.971 459.847L138.943 346.884C138.933 324.011 137.615 290.611 141.73 269.004C147.224 240.39 160.497 213.843 180.092 192.28C203.43 166.848 234.076 149.275 267.813 141.978C278.256 139.82 286.467 139.212 296.885 138.718Z';

const FORK_G =
  'M558.037 268.71C560.525 268.438 563.283 268.485 565.798 268.389C625.021 266.184 685.909 284.206 727.298 328.211C741.829 343.66 747.627 358.999 738.537 379.505C732.815 392.206 722.251 402.092 709.199 406.962C694.754 412.356 677.795 410.793 665.561 401.293C660.154 397.095 655.487 392.372 650.11 388.126C643.694 382.977 636.642 378.677 629.127 375.33C592.292 358.905 553.536 362.467 516.877 376.402L516.96 418.654C517.002 446.095 518.008 467.11 503.992 492.238C487.324 522.121 466.908 536.773 434.699 546.452C436.57 556.816 442.523 573.257 446.865 582.804C461.569 615.141 486.834 640.558 520.462 652.9C568.513 670.536 613.614 660.111 658.545 639.457C658.965 617.351 658.532 593.697 658.504 571.49C635.773 571.426 612.97 571.608 590.243 571.518C578.079 571.47 565.783 566.608 557.348 557.605C549.017 548.698 544.62 536.814 545.146 524.63C545.461 512.18 550.788 500.384 559.92 491.915C574.395 478.555 589.259 479.947 607.525 479.966L641.72 479.998L690.006 479.982C709.354 479.962 728.844 476.869 743.141 492.908C748.221 498.67 751.539 505.77 752.7 513.364C753.585 518.94 753.258 531.33 753.246 537.427L753.149 579.39L753.194 641.646C753.194 692.45 755.331 697.808 707.845 721.781C653.831 749.049 606.428 759.526 546.38 755.395C499.523 751.428 454.759 734.219 417.311 705.776C363.744 664.53 340.381 606.967 331.841 541.72C297.443 526.968 276.988 500.2 272.022 462.514C270.047 447.528 270.607 432.024 270.6 416.905L270.583 356.867L270.549 314.496C270.542 307.82 270.209 295.719 271.063 289.594C271.669 285.069 273.524 280.801 276.418 277.269C283.839 268.118 295.54 266.548 304.609 274.241C314.008 282.214 313.312 292.285 313.386 303.407C313.432 310.256 313.427 317.042 313.44 323.847L313.44 409.872C313.474 421.363 313.23 433.135 313.39 444.625C313.445 448.523 314.908 452.071 318.012 454.604C321.028 457.091 324.951 458.193 328.82 457.641C344.84 455.498 340.465 439.34 341.018 427.853C341.147 425.172 341.007 422.286 341.004 419.584L341.007 328.46L340.969 305.053C340.945 300.148 340.697 293 341.383 288.352C342.033 284.03 343.809 279.955 346.534 276.537C357.374 262.992 378.601 270.854 380.649 285.913C382.147 296.927 381.145 312.73 381.199 324.184L381.442 408.274C381.478 419.736 381.338 431.193 381.35 442.652C381.355 447.081 382.339 451.274 385.815 454.269C388.845 456.838 392.769 458.104 396.73 457.79C406.319 457.033 409.197 449.539 408.879 441.172C408.631 434.67 408.672 427.804 408.688 421.283L408.581 328.371L408.597 303.344C408.611 294.13 407.497 283.513 413.938 276.093C417.455 272.046 422.51 269.66 427.87 269.518C438.984 269.227 446.988 277.905 448.802 288.421C449.721 293.749 449.416 299.762 449.405 305.188L449.379 328.843L449.553 409.88C449.57 421.355 449.639 432.9 449.45 444.378C449.389 448.046 451.319 452.071 454.065 454.578C457.218 457.449 461.413 458.898 465.667 458.586C476.371 457.872 478.426 448.889 477.911 440.087C477.577 434.382 477.881 427.786 477.88 422.002L477.796 338.479C477.74 326.149 477.514 313.813 477.66 301.483C477.764 292.824 479.086 286.587 484.896 279.862C492.025 271.612 501.312 268.076 512.154 270.058C516.363 270.828 521.421 271.763 525.758 271.595C536.519 270.31 547.233 269.511 558.037 268.71Z';

const FONT = "'Cabinet Grotesk', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Phone screenshot placement on the 1200×630 canvas.
const SHOT_H = 548;
const SHOT_SRC = join(PUBLIC, 'screenshots', 'Sessions.png');

async function run() {
  // Resize the real screenshot to fit the card height, keeping aspect ratio.
  // Resize to a buffer first so we can read the ACTUAL output dimensions before
  // building the rounded-corner mask (metadata() on a pending pipeline returns
  // the source dimensions, not the resized ones).
  const resizedBuffer = await sharp(SHOT_SRC)
    .resize({ height: SHOT_H })
    .png()
    .toBuffer();
  const meta = await sharp(resizedBuffer).metadata();
  const shotW = meta.width ?? 264;
  const shotH = meta.height ?? SHOT_H;

  const shotX = 1200 - shotW - 96; // right-aligned with a 96px gutter
  const shotY = Math.round((630 - shotH) / 2);
  const radius = 28;

  // Rounded-corner mask for the screenshot.
  const mask = Buffer.from(
    `<svg width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  const roundedShot = await sharp(resizedBuffer)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Branded background: cream canvas, left-side text, soft shadow + green frame
  // behind the phone on the right.
  const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#140E08" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="${shotX - 28}" y="${shotY - 28}" width="${shotW + 56}" height="${shotH + 56}" rx="44" fill="${PRIMARY}" opacity="0.10"/>
  <rect x="${shotX}" y="${shotY}" width="${shotW}" height="${shotH}" rx="${radius}" fill="${INK}" filter="url(#shadow)"/>
  <g transform="translate(96 92) scale(0.115)">
    <path d="${SQUIRCLE}" fill="${PRIMARY}"/>
    <path d="${FORK_G}" fill="${CREAM}"/>
  </g>
  <text x="190" y="138" font-family="${FONT}" font-size="58" font-weight="800" letter-spacing="-2" fill="${INK}">Grubble Eats</text>
  <text x="96" y="288" font-family="${FONT}" font-size="62" font-weight="800" letter-spacing="-2" fill="${INK}">Swipe together.</text>
  <text x="96" y="364" font-family="${FONT}" font-size="62" font-weight="800" letter-spacing="-2" fill="${INK}">Match together.</text>
  <text x="96" y="440" font-family="${FONT}" font-size="62" font-weight="800" letter-spacing="-2" fill="${PRIMARY}">Eat together.</text>
  <text x="98" y="512" font-family="${FONT}" font-size="27" font-weight="500" fill="#5B544A">Real restaurants. Real AI. Real-time group decisions.</text>
</svg>`;

  await sharp(Buffer.from(bg))
    .composite([{ input: roundedShot, left: shotX, top: shotY }])
    .png()
    .toFile(join(PUBLIC, 'og-image-session.png'));

  console.log(`✓ og-image-session.png (1200×630, screenshot ${shotW}×${shotH})`);
}

run().catch((err) => {
  console.error('OG screenshot generation failed:', err);
  process.exit(1);
});

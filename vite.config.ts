// The game's build (vite build; `npm run dev` too). Tests read vitest.config.ts, the leaderboard
// function vite.function.config.ts. Load-speed sweep, 24 Sept 2026 (docs/sops/performance.md).
import { defineConfig, type Plugin } from 'vite';

/**
 * Preload the two font files the title screen draws with (Lilita One for the logo and the menu,
 * Fredoka 600 for "Press Enter"), so they come down beside the script instead of after it: the
 * title waited up to 1.5 s for them on a slow line (the game's font timeout) and then swapped
 * fonts in front of the player. The files are found in the bundle, so their hashed names are right.
 */
function preloadTitleFonts(): Plugin {
  let base = '/';
  return {
    name: 'rascal:preload-title-fonts',
    apply: 'build',
    configResolved(c) { base = c.base; },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((f) => /\/(lilita-one-latin-400|fredoka-latin-600)-normal-[\w-]+\.woff2$/.test(f))
          .sort()
          .map((f) => ({ tag: 'link', attrs: { rel: 'preload', href: base + f, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' as const }));
      },
    },
  };
}

export default defineConfig({
  plugins: [preloadTitleFonts()],
  build: {
    // font files stay files: inlined, the rarely used latin-ext faces put 29 KB of base64 into the
    // stylesheet that blocks the first paint (a browser only fetches a face when the page uses it)
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
});

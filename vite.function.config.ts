// Bundles the leaderboard server core (the real sim + rules) into one ES module for Deno.
// npm run build:function → supabase/functions/submit-score/core.js
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    lib: { entry: 'src/backend-leaderboard/server.ts', formats: ['es'], fileName: () => 'core.js' },
    outDir: 'supabase/functions/submit-score',
    emptyOutDir: false,
    target: 'es2022',
    minify: true,
    sourcemap: false,
    rolldownOptions: { output: { minify: { compress: true, mangle: true, codegen: { removeWhitespace: false } } } }, // minified, but kept on many short lines
  },
});

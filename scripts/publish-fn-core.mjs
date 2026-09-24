// Copies the score function's core (supabase/functions/submit-score/core.js) into public/fn/ under
// its content hash, so the site serves an immutable copy the Edge Function can import at deploy
// time (a function deployed through the Supabase connector cannot carry a 240 KB file inline).
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';

const src = 'supabase/functions/submit-score/core.js';
const hash = createHash('sha256').update(readFileSync(src)).digest('hex').slice(0, 16);
mkdirSync('public/fn', { recursive: true });
for (const f of readdirSync('public/fn')) if (/^core-[0-9a-f]+\.js$/.test(f)) rmSync(`public/fn/${f}`);
copyFileSync(src, `public/fn/core-${hash}.js`);
console.log(`public/fn/core-${hash}.js`);

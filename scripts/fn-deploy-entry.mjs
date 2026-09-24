// Prints the score function's entry for a deploy through the Supabase connector (no CLI login):
// index.ts with './core.js' swapped for the published core (public/fn/core-<hash>.js), pinned on
// jsDelivr to the last pushed commit that added it. The Supabase bundler refuses github.io imports.
// Usage: node scripts/fn-deploy-entry.mjs > /tmp/index.ts (then deploy that file as index.ts)
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const core = readdirSync('public/fn').find((f) => /^core-[0-9a-f]+\.js$/.test(f));
if (!core) throw new Error('no public/fn/core-*.js: run npm run build:function');
const commit = execSync(`git log -1 --format=%H origin/main -- public/fn/${core}`).toString().trim();
if (!commit) throw new Error(`public/fn/${core} is not pushed yet`);
const url = `https://cdn.jsdelivr.net/gh/AdamWebsiteFormula/kart-racer@${commit}/public/fn/${core}`;
process.stdout.write(readFileSync('supabase/functions/submit-score/index.ts', 'utf8').replace("from './core.js'", `from '${url}'`));

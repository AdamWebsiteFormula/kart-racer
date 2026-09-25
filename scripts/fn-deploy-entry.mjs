// Prints the score function's entry for a deploy through the Supabase connector (no CLI login):
// index.ts with './core.js' swapped for the published core (public/fn/core-<hash>.js), pinned on
// jsDelivr to the last pushed commit that added it. The Supabase bundler refuses github.io imports.
// Usage: node scripts/fn-deploy-entry.mjs > /tmp/index.ts (then deploy that file as index.ts)
// The deploy bundles whatever jsDelivr serves at that moment, so the served bytes are checked first
// against the file built here (its name carries their SHA-256): a swapped copy stops the deploy
// (red-team 24 Sept 2026). The pin is a full commit hash, which no branch or tag can shadow on GitHub.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const core = readdirSync('public/fn').find((f) => /^core-[0-9a-f]+\.js$/.test(f));
if (!core) throw new Error('no public/fn/core-*.js: run npm run build:function');
const commit = execSync(`git log -1 --format=%H origin/main -- public/fn/${core}`).toString().trim();
if (!commit) throw new Error(`public/fn/${core} is not pushed yet`);
const url = `https://cdn.jsdelivr.net/gh/AdamWebsiteFormula/kart-racer@${commit}/public/fn/${core}`;
const sha = (b) => createHash('sha256').update(b).digest('hex');
const built = sha(readFileSync(`public/fn/${core}`));
const res = await fetch(url);
const served = res.ok ? sha(Buffer.from(await res.arrayBuffer())) : `HTTP ${res.status}`;
if (!core.includes(built.slice(0, 16)) || served !== built) throw new Error(`jsDelivr serves ${served} for ${url}, not the built ${built}: do not deploy`);
process.stdout.write(readFileSync('supabase/functions/submit-score/index.ts', 'utf8').replace("from './core.js'", `from '${url}'`));

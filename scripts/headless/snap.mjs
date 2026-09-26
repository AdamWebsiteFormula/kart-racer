// Runs JavaScript steps in the dev game (silent headless Chrome) and screenshots after each step.
//   node scripts/headless/snap.mjs <name> '<js step>' ['<js step>' ...] [--url=http://localhost:5173/] [--out=dir] [--size=1920x1080@1]
// Steps run in the page, so the dev `kart` helper and kart.ui.dispatch are there; each gets 1.2 s to settle.
// --size (fps.mjs's own convention, WxH@dpr) defaults to the old fixed 1600x900@1 window.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [name, ...steps] = args.filter((a) => !a.startsWith('--'));
const out = flag('out', join(tmpdir(), 'rascal-shots'));
mkdirSync(out, { recursive: true });
const [wh, dpr] = flag('size', '1600x900@1').split('@');
const [width, height] = wh.split('x').map(Number);
const c = await openChrome({ width, height, dpr: Number(dpr ?? 1) });
try {
  await c.goto(flag('url', 'http://localhost:5173/'));
  for (let i = 0; i < steps.length; i++) {
    try { await c.eval(`(async () => { ${steps[i]}; await new Promise((r) => setTimeout(r, 1200)); })()`); } catch (e) { console.log(`step ${i}: ${e.message}`); }
    const file = join(out, `${name}-${i}.jpg`);
    writeFileSync(file, await c.jpeg());
    console.log(file);
  }
} finally { await c.close(); }

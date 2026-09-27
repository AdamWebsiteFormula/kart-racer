// Renders the Kart screen's tile pictures from our own 3D kart models (src/game/kartIcons.ts) in silent
// headless Chrome on a running dev server (muted: ?mute), and writes them to public/art/karts/<name>.webp.
//   node scripts/headless/kart-icons.mjs [--url=http://localhost:5173/]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const out = join(dirname(fileURLToPath(import.meta.url)), '../../public/art/karts');
mkdirSync(out, { recursive: true });
const c = await openChrome({ width: 800, height: 600 });
try {
  await c.goto(flag('url', 'http://localhost:5173/'));
  const icons = await c.eval(`(async () => { const m = await import('/src/game/kartIcons.ts'); return await m.renderKartIcons(); })()`);
  let n = 0;
  for (const [name, url] of Object.entries(icons)) {
    if (!url) { console.log(`${name}: no model`); continue; }
    const file = join(out, `${name}.webp`);
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    n++;
  }
  console.log(`${n} pictures in ${out}`);
} finally { await c.close(); }

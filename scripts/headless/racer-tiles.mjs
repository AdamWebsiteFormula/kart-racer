// Renders the Racer screen's tile pictures from the racers' own rigged 3D models, each standing alone at the height of
// its own flourish (src/game/racerIcons.ts, art-pipeline stand.ts), in silent headless Chrome on a running dev server
// (muted: ?mute), and writes them to public/art/racers/tiles/<id>.webp. Re-run after a racer's model or pose changes.
//   node scripts/headless/racer-tiles.mjs [--url=http://localhost:5173/]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const out = join(dirname(fileURLToPath(import.meta.url)), '../../public/art/racers/tiles');
mkdirSync(out, { recursive: true });
const c = await openChrome({ width: 800, height: 600 });
try {
  await c.goto(flag('url', 'http://localhost:5173/'));
  const tiles = await c.eval(`(async () => { const m = await import('/src/game/racerIcons.ts'); return await m.renderRacerTiles(); })()`);
  let n = 0;
  for (const [id, url] of Object.entries(tiles)) {
    if (!url) { console.log(`${id}: no model`); continue; }
    writeFileSync(join(out, `${id}.webp`), Buffer.from(url.split(',')[1], 'base64'));
    n++;
  }
  console.log(`${n} pictures in ${out}`);
} finally { await c.close(); }

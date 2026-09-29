// Renders the HUD's item pictures from our own 3D item models (src/game/itemIcons.ts) in silent headless
// Chrome on a running dev server (muted: ?mute), and writes them as public/art/items/<id>.webp (256 px,
// trimmed to the item, through scripts/items/prepare-icons.py). --preview=dir writes the full-size PNGs
// there instead, and leaves the game's pictures alone.
//   node scripts/headless/item-icons.mjs [--url=http://127.0.0.1:5196/] [--preview=dir] [--only=beachBall,strikeBall]
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const here = dirname(fileURLToPath(import.meta.url));
const preview = flag('preview', '');
const only = flag('only', '');
const dir = preview || mkdtempSync(join(tmpdir(), 'rascal-item-icons-'));
mkdirSync(dir, { recursive: true });
const c = await openChrome({ width: 800, height: 600 });
try {
  await c.goto(flag('url', 'http://127.0.0.1:5196/'));
  const pics = await c.eval(`(async () => { const m = await import('/src/game/itemIcons.ts'); return await m.renderItemIcons(${only ? JSON.stringify(only.split(',')) : 'undefined'}); })()`);
  for (const [id, url] of Object.entries(pics)) writeFileSync(join(dir, `${id}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${Object.keys(pics).length} pictures in ${dir}`);
} finally { await c.close(); }
if (!preview) {
  console.log(execFileSync('python3', [join(here, '../items/prepare-icons.py'), dir], { encoding: 'utf8' }));
  rmSync(dir, { recursive: true, force: true });
}

// The cup and track screens' pictures (design §12, 26 Sept 2026: big pictures, as Mario Kart World shows each
// course): each track's own establishing shot from its course intro (game/intro.ts: the high sweep toward the far
// landmark, the glide along the signature stretch), shot silently on a dev server (?mute) with the menus hidden.
//   node scripts/headless/track-cards.mjs [--url=http://localhost:5173/] [--out=public/art/tracks] ['harbour-loop:1.4,...'] [--try]
// Each entry is a track and the intro's second to hold; --try shoots every track at several seconds into --out to choose from.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const out = flag('out', join(dirname(fileURLToPath(import.meta.url)), '../../public/art/tracks'));
mkdirSync(out, { recursive: true });
/** the shots chosen (26 Sept 2026), the intro's seconds: see docs/sops/ui-hud.md Decisions */
const CHOSEN = 'harbour-loop:1.4,meadow-run:1.4,canyon-rush:2.4,frostbite-pass:1.4,boardwalk-nights:2.4,skyline-circuit:1.4';
const TRY = [0.8, 1.4, 2.4, 3.2];
const list = (args.find((a) => !a.startsWith('--')) ?? CHOSEN).split(',').map((s) => s.split(':'));
const trying = args.includes('--try');
const c = await openChrome({ width: 1600, height: 900 });
try {
  await c.goto(flag('url', 'http://localhost:5173/'));
  await c.eval(`document.getElementById('ui').style.visibility = 'hidden'`);
  for (const [track, at] of list) {
    await c.eval(`kart.introAt(0.1); kart.race('${track}', 'pip', { intro: 'full' })`);
    await sleep(7000); // the race loaded, its shaders compiled
    for (const s of trying ? TRY : [Number(at)]) {
      await c.eval(`kart.introAt(${s})`);
      await sleep(900);
      // a 960 x 540 picture, the size the cards load (the screenshot scaled on the page's own canvas)
      const url = await c.eval(`new Promise((res) => requestAnimationFrame(() => { const src = kart.renderer.domElement; const k = document.createElement('canvas'); k.width = 960; k.height = 540;
        const g = k.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, 960, 540); res(k.toDataURL('image/webp', 0.86)); }))`);
      const file = join(out, trying ? `${track}-${s}.webp` : `${track}.webp`);
      writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log(file);
    }
  }
} finally { await c.close(); }

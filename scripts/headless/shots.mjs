// Screenshots of the dev game at track positions, in silent headless Chrome (needs `npm run dev` or any
// dev server; the `kart` console helper is dev only).
//   node scripts/headless/shots.mjs 'frostbite-pass:0.42,canyon-rush:0.09' [--url=http://localhost:5173/] [--out=dir]
// Each shot: a Quick Race as Pip on autopilot, stepped until the player passes track t on lap 1.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const out = flag('out', join(tmpdir(), 'rascal-shots'));
mkdirSync(out, { recursive: true });
const list = args.find((a) => !a.startsWith('--')).split(',').map((s) => s.split(':'));
const c = await openChrome();
try {
  await c.goto(flag('url', 'http://localhost:5173/'));
  for (const [track, t] of list) {
    // a breath between steps: the race waits at its countdown until the warm-up (shaders, sky) is done, and that needs the page's own turns
    const info = await c.eval(`(async () => { kart.race('${track}', 'pip'); kart.autopilot(true); const S = () => kart.session;
      const breathe = () => new Promise((r) => setTimeout(r, 0));
      for (let n = 0; n < 4000; n++) { if (kart.ui.paused) kart.ui.dispatch({ type: 'resume' }); kart.step(30); await breathe();
        const k = S().state.karts[S().playerIndex]; if (S().state.phase !== 'countdown' && k.lap === 1 && k.t >= ${t}) break; }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { t: +S().state.karts[S().playerIndex].t.toFixed(3), ...kart.stats() }; })()`);
    const file = join(out, `${track}-${t}.jpg`);
    writeFileSync(file, await c.jpeg());
    console.log(JSON.stringify({ file, ...info }));
  }
} finally { await c.close(); }

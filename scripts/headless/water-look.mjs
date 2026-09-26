// Silent water check 2: the shore from an overview height (the course intro and title cameras), and a
// low, still camera on a boat's waterline, 4 frames 0.4 s apart to see the swell move.
//   node water-look2.mjs <url> <outdir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const c = await openChrome({ width: 1600, height: 900, dpr: 1 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { const f = join(out, `${name}.jpg`); writeFileSync(f, await c.jpeg()); console.log(f); };
try {
  await c.goto(url);
  await c.eval(`kart.race('harbour-loop', 'pip')`);
  await wait(6000);
  // the shore nearest the first boat: walk from the boat toward the start line until the ground rises out of the sea
  const shore = await c.eval(`(() => {
    const s = kart.session, k = s.views[0].root.position, b = { x: -31.2, z: 32.4 };
    return { kx: +k.x.toFixed(1), kz: +k.z.toFixed(1), bx: b.x, bz: b.z };
  })()`);
  console.log(JSON.stringify(shore));
  const mx = (shore.kx + shore.bx) / 2, mz = (shore.kz + shore.bz) / 2;
  // overview: 14 m up, looking down at the waterline between the grid and the boat
  await c.eval(`kart.photo({ pos: [${mx + 4}, 14, ${mz - 14}], look: [${mx - 6}, 0, ${mz}], fov: 55 })`);
  await wait(1500); await shot('overview-a');
  await c.eval(`kart.photo({ pos: [${mx - 20}, 22, ${mz - 20}], look: [${mx}, 0, ${mz + 4}], fov: 55 })`);
  await wait(1500); await shot('overview-b');
  // low and still on the boat's waterline: the swell should lift and drop the water against the hull
  await c.eval(`kart.photo({ pos: [${shore.bx + 5}, 0.9, ${shore.bz + 3}], look: [${shore.bx}, 0.1, ${shore.bz}], fov: 40 })`);
  await wait(1500);
  for (let i = 0; i < 4; i++) { await shot(`swell-${i}`); await wait(400); }
  await c.eval('kart.photo(null)');
} finally { await c.close(); }

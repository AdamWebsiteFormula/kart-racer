// Gridded flat views of one kart body (and its wheels, when the fit entry has hubs) to read off its fit points.
//   RACERS_DIR=<dir> node scripts/models/fit/run.mjs scripts/models/fit/measure.mjs <fit.json> <racer> [win u,v,half]
// Writes <R>/<racer>/m-side.jpg, m-front.jpg, m-top.jpg (and m-zoom.jpg with a window [u, v, half] on the side view).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async ({ ev, save, R, args }) => {
  const [fitFile, id, win] = args;
  const e = JSON.parse(readFileSync(fitFile, 'utf8'))[id];
  await ev(`window.assembleFit(${JSON.stringify(e)}, { noDriver: true, noWheels: ${!(e.wheel?.hubs?.length)} })`);
  await ev(`window.marks(${JSON.stringify(e)}, true)`);
  for (const [side, name] of [['x', 'side'], ['z', 'front'], ['y', 'top']]) save(join(R, id, `m-${name}.jpg`), await ev(`window.ortho2('${side}', { label: '${id} ${name}' })`));
  if (win) save(join(R, id, 'm-zoom.jpg'), await ev(`window.ortho2('x', { win: [${win}], label: '${id} zoom' })`));
  console.log(JSON.stringify(await ev('(() => { const b = window.freshBox(window.bodyObj); return { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) }; })()')));
};

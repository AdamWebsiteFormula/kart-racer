// Height profiles of a kart body: the first hit straight down along the centreline (x = 0) and at x = ±0.15,
// every 5 cm from tail to nose, to find the seat pan, the floor under the feet and the dash.
//   RACERS_DIR=<dir> node scripts/models/fit/run.mjs scripts/models/fit/probe.mjs <fit.json> <racer>
import { readFileSync } from 'node:fs';

export default async ({ ev, args }) => {
  const [fitFile, id] = args;
  const e = JSON.parse(readFileSync(fitFile, 'utf8'))[id];
  await ev(`window.assembleFit(${JSON.stringify(e)}, { noDriver: true, noWheels: true })`);
  for (const x of [0, 0.15]) {
    const rows = await ev(`window.profile([${x}, 2, -1.05], [0, 0, 0.05], 42, [0, -1, 0])`);
    console.log(`x=${x}: ` + rows.map(([o, h]) => `${o[2].toFixed(2)}:${h ? h[1].toFixed(2) : '-'}`).join(' '));
  }
};

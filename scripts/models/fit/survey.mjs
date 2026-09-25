// A body survey sheet (no driver, no wheels): side, front, rear, top, under; 2 columns, half size.
//   node tools/run.mjs tools/survey.mjs <id> <entry.json> [name]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export default async ({ ev, save, R, args }) => {
  const [id, file, name = 'survey'] = args;
  const e = JSON.parse(readFileSync(file, 'utf8'));
  const info = await ev(`window.assembleFit(${JSON.stringify(e)}, { noDriver: true, noWheels: ${!e.wheel.hubs?.length} })`);
  console.log(JSON.stringify(info));
  await ev(`window.marks(${JSON.stringify(e)}, true)`);
  const views = [];
  for (const s of ['x', 'z', 'rz', 'y', 'ny', 'rx']) views.push(await ev(`window.ortho2('${s}', {})`));
  const sheet = await ev(`(async () => { const ims = await Promise.all(${JSON.stringify(views)}.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1350; const g = cv.getContext('2d'); ims.forEach((im, k) => g.drawImage(im, (k % 2) * 800, Math.floor(k / 2) * 450, 800, 450));
    return cv.toDataURL('image/jpeg', 0.9); })()`);
  save(join(R, id, `${name}.jpg`), sheet);
};

// Measurement and proof views of one racer.
//   node tools/run.mjs tools/views.mjs <id> <entry.json | - (fit.json)> '<views json>' ['<assemble opts json>']
// views: [{ n: name, s: 'x'|'rx'|'z'|'rz'|'y'|'ny', win: [h, v, half], clip: [[nx,ny,nz,c]], m: 1 (markers), step },
//         { n, p: [dx,dy,dz] (perspective from that direction), fill, size }, { n, chase: 1 }, { n, game: 1 },
//         { n, rays: [[origin, dir], ...] } (prints hits), { n, eval: 'js' } (prints the value)]
// Writes R/<id>/m-<name>.jpg.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async ({ ev, save, R, args, fit }) => {
  const [id, entryArg, viewsArg, optsArg] = args;
  const entry = entryArg === '-' ? fit[id] : entryArg.trim().startsWith('{') ? JSON.parse(entryArg) : JSON.parse(readFileSync(entryArg, 'utf8'));
  const views = JSON.parse(viewsArg ?? '[]');
  const opts = JSON.parse(optsArg ?? '{}');
  const info = await ev(`window.assembleFit(${JSON.stringify(entry)}, ${JSON.stringify(opts)})`);
  console.log('assembled:', JSON.stringify(info));
  await ev(`window.E = ${JSON.stringify(entry)}; true`);
  if (opts.shadow !== false) await ev('window.groundShadow(true)');
  for (const v of views) {
    await ev(`window.marks(${JSON.stringify(entry)}, ${v.m ? 'true' : 'false'})`);
    if (v.pose) console.log(v.n, 'pose:', JSON.stringify(await ev(`(() => { const b = window.bones; ${v.pose}; window.root.updateMatrixWorld(true); return 'ok'; })()`)));
    let url = null;
    if (v.s) url = await ev(`window.ortho2('${v.s}', ${JSON.stringify({ win: v.win, clip: v.clip, step: v.step, label: v.n })})`);
    else if (v.p) url = await ev(`window.persp(${JSON.stringify(v.p)}, ${JSON.stringify({ fill: v.fill, size: v.size, fov: v.fov, box: v.box })})`);
    else if (v.chase) url = await ev(`window.persp([0, 1.8, -5.5], ${JSON.stringify({ fill: v.fill ?? 0.8, size: v.size ?? [1200, 900], fov: 24 })})`);
    else if (v.game) url = await ev(`window.gameChase(${JSON.stringify({ size: v.size })})`);
    else if (v.rays) {
      for (const [o, d] of v.rays) console.log(v.n, JSON.stringify(o), JSON.stringify(d), JSON.stringify(await ev(`window.ray(${JSON.stringify(o)}, ${JSON.stringify(d)})`)));
    } else if (v.eval) console.log(v.n, JSON.stringify(await ev(v.eval)));
    if (url) save(join(R, id, `m-${v.n}.jpg`), url);
  }
};

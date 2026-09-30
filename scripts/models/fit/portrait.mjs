// The roster portraits (public/art/racers/<id>.webp, 512 x 512: the Racer cards' art and, cropped to the head, every
// face icon, ui-hud data/faces.ts): each racer seated in their own kart, three-quarters from the front, on the
// plain grey the old art had, from the 3D models the race draws (the fitted parts in R/out). Prints where the head
// sits in each picture (fractions across and down) for faces.ts HEADS.
//   RACERS_DIR=<dir> node scripts/models/fit/run.mjs scripts/models/fit/portrait.mjs <fit.json> <out dir> [ids...]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default async ({ ev, R, args }) => {
  const [fitFile, outDir, ...ids] = args;
  const fit = JSON.parse(readFileSync(fitFile, 'utf8'));
  const heads = {};
  for (const id of ids.length ? ids : Object.keys(fit)) {
    await ev(`window.assembleFit(${JSON.stringify(fit[id])}, {})`);
    await ev('window.groundShadow(true); window.marks({}, false); window.grid.visible = false');
    const url = await ev(`window.persp([-0.85, 0.42, 1], { size: [512, 512], fill: 0.86, fov: 26 })`);
    // persp leaves the camera where it shot from, with its own lens put back: shoot's lens again for the head
    const head = await ev(`(() => { const c = window.cam; c.aspect = 1; c.fov = 26; c.updateProjectionMatrix(); c.updateMatrixWorld(true);
      const p = new window.THREE_V3(); const h = window.bones.Head ?? window.bones.head_end; h.getWorldPosition(p);
      const e = new window.THREE_V3(); (window.bones.head_end ?? h).getWorldPosition(e); p.lerp(e, 0.35).project(c);
      c.aspect = 1600 / 900; c.fov = 30; c.updateProjectionMatrix(); window.grid.visible = true;
      return [+((p.x + 1) / 2).toFixed(2), +((1 - p.y) / 2).toFixed(2)]; })()`);
    heads[id] = head;
    writeFileSync(join(outDir, `${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(id, JSON.stringify(head));
  }
  console.log('HEADS', JSON.stringify(heads));
};

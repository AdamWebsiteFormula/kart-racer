// Proof sheets from a fit file in the game's manifest format (urls models/racers/<id>/<part>.glb are read
// from R/out/<id>/, the web-optimized files the game will load). The driver is seated by the game's own
// IK (viewer.html seatIK mirrors rigged.ts seatDriver). Per racer: R/<id>/fit-review.jpg (front, 3/4,
// side, back by window.shots, a chase view from behind and above, and the fit points on a side view);
// with --all, R/fit-all-chase.jpg: every racer through the game's own chase camera (one camera for all).
//   node tools/run.mjs tools/proof.mjs <fit.json> [ids...] [--all]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default async ({ ev, save, R, args }) => {
  const [fitFile, ...rest] = args;
  const fit = JSON.parse(readFileSync(fitFile, 'utf8'));
  const poses = existsSync(join(R, 'poses.json')) ? JSON.parse(readFileSync(join(R, 'poses.json'), 'utf8')) : {};
  const all = rest.includes('--all');
  const ids = rest.filter((a) => !a.startsWith('--'));
  const chase = [];
  for (const id of ids.length ? ids : Object.keys(fit)) {
    const e = { ...fit[id], pose: poses[id] ?? {} };
    const info = await ev(`window.assembleFit(${JSON.stringify(e)}, {})`);
    await ev('window.groundShadow(true)');
    await ev('window.marks({}, false)');
    const ik = info.ik;
    // four views round the racer (window.shots), framed to fill
    // zoom so the whole racer fits: the side view's width (the kart's length) and every view's height
    const zoom = await ev(`(() => { const b = window.freshBox(window.root), s = b.getSize(new window.THREE_V3()); const m = Math.max(s.x, s.y, s.z);
      const d = Math.max(s.x, s.z) / 2; // the near side is this much closer than the centre, so it looks bigger
      return Math.max((1.1 * s.z / 0.953 + d) / (2.1 * m), (1.1 * s.x / 0.953 + d) / (2.1 * m), (1.15 * s.y / 0.536 + d) / (2.1 * m)); })()`);
    const shots = await ev(`window.shots(${zoom}, 0.5)`);
    // behind and above, like the chase camera, filling the frame
    const chaseZoom = await ev('window.persp([0, 0.43, -1], { size: [1600, 900], fill: 0.86, fov: 30 })');
    // the game's own chase framing (5.5 m back, 2.4 up, 60°), for the size overview
    chase.push([id, await ev('window.gameChase({ size: [1600, 900] })')]);
    // the fit points on a side view (driver hidden): seat, grips, feet, hubs, steering ring, exhaust
    await ev('window.driver.visible = false');
    await ev(`window.marks(${JSON.stringify(e)}, true)`);
    const pts = await ev(`window.ortho2('x', { label: '${id}: seat magenta, grips red, feet blue, hubs green, steering yellow, exhaust orange' })`);
    await ev('window.marks({}, false)');
    await ev('window.driver.visible = true');
    const b = e.body, w = e.wheel;
    const f3 = (v) => `[${v.map((x) => +x.toFixed(3)).join(', ')}]`;
    const lines = [
      `${id}   driver ${e.driver.height} m   body yaw ${b.yaw} length ${b.length} y ${b.y}   wheel r ${w.radius}  hubs ${w.hubs.map(f3).join(' ')}`,
      `seat ${f3(b.seat)}  grips ${b.grips.map(f3).join(' ')}  feet ${b.feet.map(f3).join(' ')}  ${b.steering ? `steering c ${f3(b.steering.center)} axis ${f3(b.steering.axis)} r ${b.steering.radius}` : 'no steering wheel (handlebars)'}`,
      `exhaust ${b.exhaust.ports.length} ports dir ${f3(b.exhaust.dir)}   IK: lean ${ik.leanDeg}°, arm reach used ${ik.tries[ik.tries.length - 1][1].map((x) => Math.round(x * 100) + '%').join(' / ')}, legs ${[ik.LeftUpLeg, ik.RightUpLeg].map((l) => (l.short > 0 ? `${Math.round(l.short * 100)} cm short` : `knee ${l.inner}°`)).join(' / ')}${e.pose?.turns?.length ? `   pose turns ${JSON.stringify(e.pose.turns)}` : ''}`,
    ];
    const sheet = await ev(`(async () => {
      const urls = ${JSON.stringify([...shots, chaseZoom, pts])};
      const ims = await Promise.all(urls.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
      const cw = 800, ch = 450, top = 96, cv = document.createElement('canvas'); cv.width = cw * 3; cv.height = top + ch * 2; const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      const at = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
      ims.forEach((im, k) => g.drawImage(im, at[k][0] * cw, top + at[k][1] * ch, cw, ch));
      g.fillStyle = '#111'; g.font = 'bold 22px sans-serif'; g.fillText(${JSON.stringify(lines[0])}, 12, 28);
      g.font = '17px monospace'; g.fillText(${JSON.stringify(lines[1])}, 12, 56); g.fillText(${JSON.stringify(lines[2])}, 12, 82);
      g.font = 'bold 18px sans-serif'; g.fillStyle = '#333';
      ['front', 'three-quarter', 'side (from +X, the driver\\'s left)', 'back', 'chase (behind and above)', 'fit points'].forEach((t, k) => g.fillText(t, at[k][0] * cw + 10, top + at[k][1] * ch + 24));
      return cv.toDataURL('image/jpeg', 0.88); })()`);
    save(join(R, id, 'fit-review.jpg'), sheet);
    console.log(id, 'lean', ik.leanDeg, 'reach', JSON.stringify(ik.tries[ik.tries.length - 1][1]), 'legs', ik.LeftUpLeg.short, ik.RightUpLeg.short, 'head', JSON.stringify(ik.head));
  }
  if (all) {
    const sheet = await ev(`(async () => { const list = ${JSON.stringify(chase)};
      const ims = await Promise.all(list.map(([, u]) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
      const cw = 600, ch = 450, cols = 4, cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * Math.ceil(ims.length / cols); const g = cv.getContext('2d');
      ims.forEach((im, k) => { g.drawImage(im, 560, 440, 480, 360, (k % cols) * cw, Math.floor(k / cols) * ch, cw, ch);
        g.font = 'bold 26px sans-serif'; g.fillStyle = '#111'; g.fillText(list[k][0], (k % cols) * cw + 12, Math.floor(k / cols) * ch + 34); });
      g.font = '16px sans-serif'; g.fillStyle = '#333'; g.fillText('the game camera (5.5 m back, 2.4 m up, 60°), the same for every racer: sizes compare', 12, cv.height - 12);
      return cv.toDataURL('image/jpeg', 0.9); })()`);
    save(join(R, 'fit-all-chase.jpg'), sheet);
  }
};

// Silent chase-camera check (27 Sept 2026, the MKW gap review's items 2 and 5: "the camera keeps your kart
// small", "your racer barely shows"): one race on autopilot, frame-exact (the page's own loop stopped, every
// frame one kart.step, as storm-look does), muted headless Chrome on ?mute. The race's seed is pinned
// (--seed), so every run is the same race, and the moments are picked from the sim's state, never the
// camera's: a camera change leaves them on the very same ticks, for before-and-after stills.
//   grid      a moment before GO, the camera at rest behind the kart
//   straight  near full speed on a straight road: no drift, and no boost for 2 s
//   boost     0.1 s into the player's first boost after 8 s of racing, not a slipstream (the punch's peak)
//   drift     a drift at its second tier (orange sparks)
//   bend      in a bend (the road 20° or more round 12 m ahead), not drifting
//   loop      (only when asked for: --only=loop --track=boardwalk-nights) over the top of a loop-the-loop
// For each: <tag>-<moment>.jpg, and one line of JSON: the kart's box on screen (every vertex of the player's
// kart as drawn, skinned), its width in px and as a share of the frame, the racer's head box (the vertices
// on the Head bone), the horizon's height (a share of the frame from the top), the view's field of view.
//   node scripts/headless/chase-look.mjs <url> <outdir> [--track=harbour-loop] [--racer=juniper] [--kart=<kartId>]
//     [--tag=a] [--seed=424242] [--size=1600x900] [--only=grid,straight,boost,drift,bend]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [url, out] = args.filter((a) => !a.startsWith('--'));
if (!url || !out) { console.error('usage: chase-look.mjs <url> <outdir> [--track=] [--racer=] [--kart=] [--tag=] [--seed=]'); process.exit(1); }
const [width, height] = flag('size', '1600x900').split('x').map(Number);
const track = flag('track', 'harbour-loop'), racer = flag('racer', 'juniper'), kartId = flag('kart', ''), tag = flag('tag', `${racer}`);
const only = flag('only', 'grid,straight,boost,drift,bend').split(',');
const seed = Number(flag('seed', '424242'));
mkdirSync(out, { recursive: true });

// each moment: its condition on the sim's state (C.b: ticks since the player's boost began, -1 with none;
// C.calm: ticks since the player last had a boost running)
const MOMENTS = {
  grid: 'C.s.state.tick >= 330',
  straight: 'C.s.state.tick > 360 + 120 * 6 && Math.abs(C.k.speed) > 22 && !C.k.drift.active && C.calm > 240 && C.bend() < 4 && C.plain()',
  boost: "C.s.state.tick > 360 + 120 * 8 && C.b >= 12 && C.k.boost.source !== 'slipstream' && C.plain()",
  drift: 'C.s.state.tick > 360 + 120 * 4 && C.k.drift.active && C.k.drift.tier >= 2 && C.plain()',
  bend: 'C.s.state.tick > 360 + 120 * 4 && C.bend() > 20 && !C.k.drift.active && C.plain() && Math.abs(C.k.speed) > 12',
  // (not in the default list) over the top of a loop-the-loop, seen from the side view (Boardwalk Nights)
  loop: 'C.k.status.loopIndex >= 0 && Math.abs(C.k.status.loopAngle - Math.PI) < 0.3',
};

const HELPERS = `
window.requestAnimationFrame = () => 0;
// the page's clock runs with the frames: a boost's punch, the drift roll and the shake ease on it, and a
// stepped frame takes a few real milliseconds, not 16.7 (on the real clock a 0.1 s punch spread over 30 frames)
let clock = performance.now();
performance.now = () => clock;
const C = window.__chase = {
  cv: document.querySelector('canvas'),
  breathe: () => new Promise((r) => setTimeout(r, 0)),
  step() { clock += 1000 / 60; kart.step(1); },
  async until(cond, max = 4000) { for (let i = 0; i < max && !cond(); i++) { C.step(); if (i % 6 === 0) await C.breathe(); } return cond(); },
  grab() { return C.cv.toDataURL('image/jpeg', 0.9).slice(23); },
  get s() { return kart.session; },
  get k() { return C.s.state.karts[C.s.playerIndex]; },
  b: -1, boostFrom: -1, calm: 0, lastBoost: 0,
  /** on its wheels on the road: not in the air, a Strike Ball, a loop, a fall or the claw */
  plain() { const k = C.k, st = k.status; return k.grounded && !(st.rideRemaining > 0) && st.loopIndex < 0 && !st.falling && !st.held; },
  /** the road's turn (degrees) from the kart to 12 m up it */
  bend() {
    const s = C.s, k = C.k, tr = s.track, a = tr.sample(k.t, 0, k.branch), b = tr.sample(k.t + 12 / tr.length, 0, k.branch);
    const h = (x) => Math.atan2(x.tangent[0], x.tangent[2]);
    let d = h(b) - h(a); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d) * 180 / Math.PI;
  },
  async start(track, racer, kartId, seed) {
    kart.photo(null);
    const sc = kart.ui.app.screen;
    if (sc === 'racing') { kart.ui.dispatch({ type: 'pause' }); kart.ui.dispatch({ type: 'quit' }); }
    for (let i = 0; i < 20; i++) { C.step(); await C.breathe(); }
    // a Quick Race's seed is Date.now() % 1e6 (main.ts configFor): pinned, so every run is the same race
    const now = Date.now; Date.now = () => 1759e9 + seed;
    try { kart.race(track, racer, kartId ? { kartId } : {}); } finally { Date.now = now; }
    kart.autopilot(true);
    for (let i = 0; i < 30; i++) await C.breathe();
    // the player's own model files in (a code-built stand-in would measure wrong)
    return C.until(() => kart.session && kart.session.def.id === track && !kart.warmup.active && kart.session.views[kart.session.playerIndex].rigged, 3000);
  },
  /** frames until every moment has come (or maxFrames): each one measured and read back on its own frame */
  async run(conds, maxFrames) {
    const got = {}, left = new Set(Object.keys(conds));
    for (let i = 0; i < maxFrames && left.size; i++) {
      C.step();
      const t = C.s.state.tick;
      if (C.k.boost.remaining > 0) { if (C.boostFrom < 0) C.boostFrom = t; C.lastBoost = t; } else C.boostFrom = -1;
      C.calm = t - C.lastBoost;
      C.b = C.boostFrom < 0 ? -1 : t - C.boostFrom;
      for (const m of [...left]) if (conds[m]()) { got[m] = { ...C.measure(), img: C.grab() }; left.delete(m); }
      if (i % 6 === 0) await C.breathe();
    }
    return got;
  },
  /** the player's kart and head on screen now (px), the horizon's height, the field of view */
  measure() {
    const s = C.s, v = s.views[s.playerIndex], cam = kart.camera, V = cam.position.constructor;
    const W = C.cv.clientWidth, H = C.cv.clientHeight, p = new V();
    v.root.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const kb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }, hb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    const add = (b, q) => { const x = (q.x + 1) / 2 * W, y = (1 - q.y) / 2 * H; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); };
    let meshes = 0;
    v.chassis.traverse((o) => {
      if (!o.isSkinnedMesh || !o.visible) return;
      meshes++;
      const g = o.geometry, n = g.getAttribute('position').count, J = g.getAttribute('skinIndex'), Wt = g.getAttribute('skinWeight');
      const bones = o.skeleton.bones, head = new Set();
      bones.forEach((b, i) => { for (let x = b; x; x = x.parent) if (/^head$/i.test(x.name)) { head.add(i); break; } });
      for (let i = 0; i < n; i++) {
        o.getVertexPosition(i, p); p.applyMatrix4(o.matrixWorld);
        const q = p.clone().project(cam);
        if (q.z > 1) continue;
        add(kb, q);
        let best = 0, bi = -1; for (let k = 0; k < 4; k++) { const w = Wt.getComponent(i, k); if (w > best) { best = w; bi = J.getComponent(i, k); } }
        if (head.has(bi)) add(hb, q);
      }
    });
    // the horizon: a point far off straight ahead, level with the lens
    const d = new V(); cam.getWorldDirection(d); d.y = 0; d.normalize();
    const hz = cam.position.clone().addScaledVector(d, 5000).project(cam);
    const r = (x) => Math.round(x);
    return {
      tick: s.state.tick, speed: +Math.abs(C.k.speed).toFixed(1), fov: +cam.fov.toFixed(1), meshes,
      boost: C.k.boost.remaining > 0 ? C.k.boost.source : undefined,
      kart: { x0: r(kb.x0), x1: r(kb.x1), y0: r(kb.y0), y1: r(kb.y1), w: r(kb.x1 - kb.x0), share: +((kb.x1 - kb.x0) / W).toFixed(3), cx: r((kb.x0 + kb.x1) / 2), bottom: +(kb.y1 / H).toFixed(3) },
      head: hb.x0 < 1e9 ? { w: r(hb.x1 - hb.x0), h: r(hb.y1 - hb.y0), top: r(hb.y0) } : null,
      horizon: +(((1 - hz.y) / 2 * H) / H).toFixed(3),
      lens: +cam.position.distanceTo(v.root.position).toFixed(2),
    };
  },
};
return true;`;

const c = await openChrome({ width, height, dpr: 1 });
const js = (code) => c.eval(`(async () => { ${code} })()`);

try {
  await c.goto(url, 8000);
  // High, not Auto: a busy machine can send Auto to Low (no post chain)
  await js(`const s = kart.ui.save.settings; s.quality = 'high'; kart.ui.host.settingsChanged({ ...s }); await new Promise((r) => setTimeout(r, 500)); return true;`);
  await js(HELPERS);
  if (!(await js(`return await window.__chase.start(${JSON.stringify(track)}, ${JSON.stringify(racer)}, ${JSON.stringify(kartId)}, ${seed});`))) throw new Error('the race did not load');
  const conds = `{ ${only.map((m) => `${m}: () => !!(${MOMENTS[m]})`).join(', ')} }`;
  const got = await js(`const C = window.__chase; return await C.run(${conds}, 120 * 60);`);
  for (const m of only) {
    const g = got[m];
    if (!g) { console.log(JSON.stringify({ tag, moment: m, found: false })); continue; }
    const { img, ...meas } = g;
    const f = join(out, `${tag}-${m}.jpg`);
    writeFileSync(f, Buffer.from(img, 'base64'));
    console.log(JSON.stringify({ tag, moment: m, file: f, ...meas }));
  }
} finally { await c.close(); }

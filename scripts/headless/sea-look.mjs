// Silent sea check (26 Sept 2026, Adam: "The water still looks solid and blue and does not look like it
// has waves"): the same cameras before and after a water change, frame-exact and silent (muted headless
// Chrome on ?mute; the page's own loop is stopped and every frame is one kart.step, as the promo capture
// does). For each sea track:
//   chase-<t>-live   the race's own chase camera on lap 1 as the player passes track t (autopilot)
//   chase-<t>-a/-b   that same view held still (kart.photo at the chase camera's pose), 0.5 s apart:
//                    the water must visibly move between the two
//   shore-a/-b       a shore camera (Harbor: the overview between the grid and the first boat; Boardwalk: low
//                    over the sea off the pier near the start, looking back at its posts), 0.5 s apart
//   boat-a/-b        Harbor only: low and still on a boat's waterline
//   pier-a/-b        Harbor only: the pier ramp (the beacon's anchor) from over the bay
//   intro-<s>        the course intro held at s seconds (the sweep, then the signature glide)
//   node scripts/headless/sea-look.mjs <url> <outdir> [--only=harbour-loop,boardwalk-nights] [--parts=chase,fixed,intro] [--quality=high|low] [--size=1600x900]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [url, out] = args.filter((a) => !a.startsWith('--'));
if (!url || !out) { console.error('usage: sea-look.mjs <url> <outdir> [--only=track,track]'); process.exit(1); }
const only = new Set(flag('only', 'harbour-loop,boardwalk-nights').split(','));
const parts = new Set(flag('parts', 'chase,fixed,intro').split(','));
const quality = flag('quality', 'high');
const [width, height] = flag('size', '1600x900').split('x').map(Number);
mkdirSync(out, { recursive: true });

const HELPERS = `
window.requestAnimationFrame = () => 0;
const C = window.__sea = {
  cv: document.querySelector('canvas'),
  breathe: () => new Promise((r) => setTimeout(r, 0)),
  P: () => kart.session.state.karts[kart.session.playerIndex],
  async until(cond, max = 4000, n = 1) { for (let i = 0; i < max && !cond(); i++) { kart.step(n); if (i % 6 === 0) await C.breathe(); } return cond(); },
  /** back to the menus, so the next kart.race loads a fresh race even on the same track */
  async quit() {
    kart.photo(null);
    const s = kart.ui.app.screen;
    if (s === 'racing') { kart.ui.dispatch({ type: 'pause' }); kart.ui.dispatch({ type: 'quit' }); }
    else if (s === 'results') kart.ui.dispatch({ type: 'continue' });
    for (let i = 0; i < 20; i++) { kart.step(1); await C.breathe(); }
  },
  async race(track, racer, opts = {}) {
    await C.quit(); kart.introAt(null);
    kart.race(track, racer, opts); kart.autopilot(true);
    for (let i = 0; i < 30; i++) await C.breathe();
    await C.until(() => kart.session && kart.session.def.id === track && !kart.warmup.active, 3000, 1);
  },
  async go() { await C.until(() => kart.session.state.phase !== 'countdown', 1200, 5); },
  /** one frame, then the canvas as JPEG (base64) while the drawing buffer still holds it */
  grab(n = 1) { for (let i = 0; i < n; i++) kart.step(1, 1000 / 60); return C.cv.toDataURL('image/jpeg', 0.9).slice(23); },
  /** hold the camera where it is now (the chase camera's own pose and lens) */
  hold() { const cam = kart.camera, d = new cam.position.constructor(); cam.getWorldDirection(d);
    kart.photo({ pos: [cam.position.x, cam.position.y, cam.position.z], look: [cam.position.x + d.x * 30, cam.position.y + d.y * 30, cam.position.z + d.z * 30], fov: cam.fov }); },
  /** whether a ray straight down at (x, z) meets the sea before anything else */
  async overWater(x, z) {
    if (!C.T) { const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\\/deps\\/three\\.js/.test(n)); C.T = await import(u); }
    const rc = new C.T.Raycaster(new C.T.Vector3(x, 60, z), new C.T.Vector3(0, -1, 0));
    const hit = rc.intersectObjects(kart.session.trackScene.group.children, true).find((h) => h.object.visible);
    return !!hit && /^ground-water/.test(hit.object.name);
  },
  /** a camera over the sea \`dist\` m from \`at\` (the first of 16 bearings over water), \`up\` m over the sea, looking at \`at\` */
  async seaCam(at, dist, up, fov) {
    const gy = kart.session.def.environment.ground.y;
    for (const d of [dist, dist * 1.4, dist * 1.9]) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = at[0] + Math.cos(a) * d, z = at[2] + Math.sin(a) * d;
      if (await C.overWater(x, z) && await C.overWater(at[0] + (x - at[0]) * 0.75, at[2] + (z - at[2]) * 0.75)) return { pos: [x, gy + up, z], look: at, fov }; }
    return null;
  },
};
return true;`;

const c = await openChrome({ width, height, dpr: 1 });
const js = (code) => c.eval(`(async () => { ${code} })()`);
const save = (name, b64) => { const f = join(out, `${name}.jpg`); writeFileSync(f, Buffer.from(b64, 'base64')); console.log(f); };
/** a held camera's pair, 0.5 s (30 frames at 60 Hz) apart */
async function pair(prefix) {
  save(`${prefix}-a`, await js('return window.__sea.grab(2);'));
  save(`${prefix}-b`, await js('return window.__sea.grab(30);'));
}

const TRACKS = {
  'harbour-loop': { racer: 'pip', chase: [0.25, 0.55, 0.75], intro: [0.8, 2.4] },
  'boardwalk-nights': { racer: 'nova', chase: [0.15, 0.45, 0.8], intro: [0.8, 2.4] },
};

try {
  await c.goto(url, 8000);
  // High (or --quality), not Auto: a busy machine can send Auto to Low (no post chain, so no see-through shallows)
  await js(`const s = kart.ui.save.settings; s.quality = '${quality}'; kart.ui.host.settingsChanged({ ...s }); await new Promise((r) => setTimeout(r, 500)); return true;`);
  await js(HELPERS);
  for (const [track, cfg] of Object.entries(TRACKS)) {
    if (!only.has(track)) continue;
    const tag = track.split('-')[0];
    // the race's own chase camera, live, then held still for a pair
    if (parts.has('chase')) await js(`const C = window.__sea; await C.race('${track}', '${cfg.racer}'); await C.go(); return true;`);
    for (const t of parts.has('chase') ? cfg.chase : []) {
      const ok = await js(`const C = window.__sea; return await C.until(() => { const k = C.P(); return k.lap === 1 && k.t >= ${t}; }, 20000, 2);`);
      if (!ok) { console.log(`${tag} chase ${t}: not reached`); continue; }
      save(`${tag}-chase-${t}-live`, await js('return window.__sea.grab(1);'));
      await js('window.__sea.hold(); return true;');
      await pair(`${tag}-chase-${t}`);
      await js('kart.photo(null); return true;');
    }
    // fixed cameras on a fresh race (karts still on the grid, so the spots are the same every run)
    if (parts.has('fixed')) await js(`const C = window.__sea; await C.race('${track}', '${cfg.racer}'); return true;`);
    if (!parts.has('fixed')) { /* skipped */ } else if (track === 'harbour-loop') {
      // (scripts/headless/water-look.mjs's cameras: the shore nearest the first boat, and its waterline)
      await js(`const S = kart.session, k = S.views[0].root.position, b = { x: -31.2, z: 32.4 }, mx = (k.x + b.x) / 2, mz = (k.z + b.z) / 2;
        window.__sea.cams = { shore: { pos: [mx + 4, 14, mz - 14], look: [mx - 6, 0, mz], fov: 55 }, boat: { pos: [b.x + 5, 0.9, b.z + 3], look: [b.x, 0.1, b.z], fov: 40 } };
        // the pier ramp (the beacon's anchor) from over the bay
        window.__sea.cams.pier = await window.__sea.seaCam(S.trackScene.stage.anchors.beacon, 34, 7, 50);
        return true;`);
      for (const cam of ['shore', 'boat', 'pier']) {
        if (!(await js(`return !!window.__sea.cams.${cam};`))) { console.log(`${tag} ${cam}: no spot over the sea`); continue; }
        await js(`kart.photo(window.__sea.cams.${cam}); window.__sea.grab(20); return true;`);
        await pair(`${tag}-${cam}`);
      }
    } else {
      // over the sea off the pier near the start, low, looking back at the posts and the water round them
      await js(`const S = kart.session, L = S.manager.track.branches.main.lut, i = Math.floor(L.n * 0.1);
        window.__sea.cams = { shore: await window.__sea.seaCam([L.px[i], S.def.environment.ground.y + 0.4, L.pz[i]], 24, 2.8, 50) };
        return true;`);
      if (await js('return !!window.__sea.cams.shore;')) {
        await js('kart.photo(window.__sea.cams.shore); window.__sea.grab(20); return true;');
        await pair(`${tag}-shore`);
      } else console.log(`${tag} shore: no spot over the sea`);
    }
    // the course intro, held at each second listed
    for (const s of parts.has('intro') ? cfg.intro : []) {
      await js(`const C = window.__sea; await C.race('${track}', '${cfg.racer}', { intro: 'full' }); kart.introAt(${s});
        await C.until(() => kart.intro && kart.intro.moving, 2000, 1); return true;`);
      save(`${tag}-intro-${s}`, await js('return window.__sea.grab(8);'));
    }
    await js('kart.introAt(null); kart.photo(null); return true;');
  }
} finally { await c.close(); }

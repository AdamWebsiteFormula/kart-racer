// Silent storm check (26 Sept 2026, Adam: "the rain, when it falls, it does not splash when it hits the
// ground"): Meadow Run's Final Lap Shift storm, frame-exact and silent (muted headless Chrome on ?mute;
// the page's own loop is stopped and every frame is one kart.step, as the promo capture does). A race is
// fast-forwarded on autopilot to its last lap; once the rain is fully in (4 s into the shift):
//   storm-live-0..2   the race's own chase camera, 0.1 s apart
//   storm-held-a/-b   that view held still, 0.25 s apart (the splashes come and go; the rain moves on)
//   storm-low-a/-b    a low camera riding beside the player's kart, looking along the wet road
//   storm-reduced-*   the same with reduced motion on (it should stay calm)
//   node scripts/headless/storm-look.mjs <url> <outdir> [--size=1600x900] [--racer=gus]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [url, out] = args.filter((a) => !a.startsWith('--'));
if (!url || !out) { console.error('usage: storm-look.mjs <url> <outdir>'); process.exit(1); }
const [width, height] = flag('size', '1600x900').split('x').map(Number);
const racer = flag('racer', 'gus');
mkdirSync(out, { recursive: true });

const HELPERS = `
window.requestAnimationFrame = () => 0;
const C = window.__storm = {
  cv: document.querySelector('canvas'),
  breathe: () => new Promise((r) => setTimeout(r, 0)),
  async until(cond, max = 4000, n = 1) { for (let i = 0; i < max && !cond(); i++) { kart.step(n); if (i % 6 === 0) await C.breathe(); } return cond(); },
  grab(n = 1) { for (let i = 0; i < n; i++) kart.step(1, 1000 / 60); return C.cv.toDataURL('image/jpeg', 0.9).slice(23); },
  hold() { const cam = kart.camera, d = new cam.position.constructor(); cam.getWorldDirection(d);
    kart.photo({ pos: [cam.position.x, cam.position.y, cam.position.z], look: [cam.position.x + d.x * 30, cam.position.y + d.y * 30, cam.position.z + d.z * 30], fov: cam.fov }); },
  reduced(on) { const s = kart.ui.save.settings; s.reducedMotion = on ? 'on' : 'off'; kart.ui.host.settingsChanged({ ...s }); },
  /** a Meadow race on autopilot, run on until its storm has been in \`secs\` seconds */
  async storm(racer, secs) {
    kart.photo(null);
    const s = kart.ui.app.screen;
    if (s === 'racing') { kart.ui.dispatch({ type: 'pause' }); kart.ui.dispatch({ type: 'quit' }); }
    else if (s === 'results') kart.ui.dispatch({ type: 'continue' });
    for (let i = 0; i < 20; i++) { kart.step(1); await C.breathe(); }
    kart.race('meadow-run', racer); kart.autopilot(true);
    for (let i = 0; i < 30; i++) await C.breathe();
    await C.until(() => kart.session && kart.session.def.id === 'meadow-run' && !kart.warmup.active, 3000, 1);
    return C.until(() => kart.session.trackScene.stage.since >= secs, 30000, 4);
  },
};
return true;`;

const c = await openChrome({ width, height, dpr: 1 });
const js = (code) => c.eval(`(async () => { ${code} })()`);
const save = (name, b64) => { const f = join(out, `${name}.jpg`); writeFileSync(f, Buffer.from(b64, 'base64')); console.log(f); };

try {
  await c.goto(url, 8000);
  // High, not Auto: a busy machine can send Auto to Low (no post chain)
  await js(`const s = kart.ui.save.settings; s.quality = 'high'; kart.ui.host.settingsChanged({ ...s }); await new Promise((r) => setTimeout(r, 500)); return true;`);
  await js(HELPERS);
  for (const [tag, reduced] of [['storm', false], ['storm-reduced', true]]) {
    await js(`window.__storm.reduced(${reduced}); return true;`);
    if (!(await js(`return await window.__storm.storm('${racer}', 4);`))) { console.log(`${tag}: the storm never came`); continue; }
    for (let i = 0; i < 3; i++) save(`${tag}-live-${i}`, await js(`return window.__storm.grab(${i ? 6 : 1});`));
    await js('window.__storm.hold(); return true;');
    save(`${tag}-held-a`, await js('return window.__storm.grab(2);'));
    save(`${tag}-held-b`, await js('return window.__storm.grab(15);'));
    // low beside the player's kart (its frame: +X its left, +Z its nose), looking along the road ahead
    await js('kart.photo({ pos: [1.6, 0.9, -1.5], look: [0.4, 0.2, 9], fov: 55, kart: kart.session.playerIndex }); return true;');
    save(`${tag}-low-a`, await js('return window.__storm.grab(2);'));
    save(`${tag}-low-b`, await js('return window.__storm.grab(15);'));
    await js('kart.photo(null); return true;');
  }
  await js('window.__storm.reduced(false); return true;');
} finally { await c.close(); }

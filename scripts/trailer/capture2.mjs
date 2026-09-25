// Trailer footage, pass 2: items used on cue, and "hero" tracking shots from beside or ahead of the
// player's kart (the dev photo camera moved every frame). Muted headless Chrome (?mute, --mute-audio).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openChrome, sleep } from '../headless/cdp.mjs';
import { tmpdir } from 'node:os';
const TRAILER_DIR = process.env.TRAILER_DIR ?? join(tmpdir(), 'rascal-trailer');

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const only = flag('only', '') ? new Set(flag('only', '').split(',')) : null;
const OUT = join(TRAILER_DIR, 'shots');
mkdirSync(OUT, { recursive: true });
const c = await openChrome({ width: 1920, height: 1080 });
const js = (code) => c.eval(`(async () => { ${code} })()`);
const W = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`;
const BREATHE = `await new Promise((r) => setTimeout(r, 0));`;
const want = (n) => !only || only.has(n);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function rec(name, secs, { ready = 'true', during = '', timeout = 30000 } = {}) {
  const r = await js(`
    const t0 = performance.now();
    while (!(${ready})) { if (performance.now() - t0 > ${timeout}) return { skipped: true }; await new Promise((r) => requestAnimationFrame(r)); }
    const canvas = document.querySelector('canvas.game') || document.querySelector('canvas');
    const mr = new MediaRecorder(canvas.captureStream(60), { mimeType: 'video/mp4;codecs=avc1.640028', videoBitsPerSecond: 24e6 });
    const chunks = []; mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => (mr.onstop = r));
    let frames = 0, on = true; const count = () => { if (!on) return; frames++; requestAnimationFrame(count); }; requestAnimationFrame(count);
    const t1 = performance.now();
    mr.start(250);
    ${during}
    await new Promise((r) => setTimeout(r, Math.max(0, ${secs * 1000} - (performance.now() - t1))));
    mr.stop(); await stopped; on = false;
    const fps = frames / ((performance.now() - t1) / 1000);
    const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/mp4' }).arrayBuffer());
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { fps: +fps.toFixed(1), b64: btoa(s) };`);
  if (r.skipped) { log(`${name}: skipped (never ready)`); return; }
  const raw = join(OUT, `${name}.raw.mp4`), fin = join(OUT, `${name}.mp4`);
  writeFileSync(raw, Buffer.from(r.b64, 'base64'));
  execFileSync('avconvert', ['--source', raw, '--output', fin, '--preset', 'Preset1920x1080', '--replace'], { stdio: 'ignore' });
  rmSync(raw);
  log(`${name}.mp4 ${r.fps} fps`);
}

const QUIT = `window.__hero = false; kart.photo(null); if (kart.ui.app.screen === 'racing' || kart.ui.app.screen === 'results') { if (kart.ui.app.screen === 'racing') { kart.ui.dispatch({type:'pause'}); kart.ui.dispatch({type:'quit'}); } else { kart.ui.dispatch({type:'continue'}); } ${W(500)} }`;
const race = (track, racer) => `${QUIT} kart.introAt(null); kart.race('${track}', '${racer}'); kart.autopilot(true);
  for (let i = 0; i < 600 && kart.session.state.phase === 'countdown'; i++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); kart.step(20); ${BREATHE} }`;
const ff = (secs) => `for (let i = 0; i < ${Math.round(secs * 60 / 10)}; i++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); kart.step(10); ${BREATHE} }`;
const P = `kart.session.state.karts[kart.session.playerIndex]`;
/** the AI presses the player's item button on the next tick and lets go on the one after: a tap, used at once */
const TAP = `(() => { const ai = kart.session.ai, orig = ai.fill.bind(ai); let n = 0;
  ai.fill = (st, hz, inputs) => { orig(st, hz, inputs); const i = kart.session.playerIndex; if (n < 2) { inputs[i] = { ...inputs[i], item: n === 0 }; n++; } else ai.fill = orig; }; })();`;
/**
 * A hero camera, moved every frame: offset from the player's drawn kart in its own frame (right, up,
 * forward metres), looking at the kart (+lookUp). `orbit` swings it round the kart (radians a second).
 */
const HERO = (right, up, fwd, lookUp = 0.9, fov = 42, orbit = 0) => `
  window.__hero = true; const v = kart.session.views[kart.session.playerIndex]; const t0 = performance.now();
  const tick = () => { if (!window.__hero) return;
    const p = v.root.position, h = v.root.rotation.y, a = h + ${orbit} * (performance.now() - t0) / 1000;
    const fx = Math.sin(a), fz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
    kart.photo({ pos: [p.x + rx * ${right} + fx * ${fwd}, p.y + ${up}, p.z + rz * ${right} + fz * ${fwd}], look: [p.x + Math.sin(h) * 1.5, p.y + ${lookUp}, p.z + Math.cos(h) * 1.5], fov: ${fov} });
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);`;

try {
  await c.send('Page.navigate', { url: 'http://localhost:5173/?mute' });
  await sleep(7000);
  await js(`const s = kart.ui.save.settings; s.quality = 'high'; kart.ui.host.settingsChanged({ ...s }); ${W(300)}`);

  // items, used 0.5 s into the shot; the player placed where the item works (Fog Bank from 5th back)
  for (const [item, track, racer, after, lead] of [
    ['strikeBall', 'meadow-run', 'boulder', 20, 0.5], ['pogoSpring', 'canyon-rush', 'pip', 9, 0.5], ['airHorn', 'harbour-loop', 'gus', 5, 0.6],
    ['grappleAnchor', 'skyline-circuit', 'otto', 12, 0.5], ['tripleFizz', 'frostbite-pass', 'nova', 10, 0.5], ['fogBank', 'boardwalk-nights', 'sprocket', 18, 0.5],
    ['windUpMouse', 'harbour-loop', 'juniper', 16, 0.5], ['homingKite', 'meadow-run', 'momo', 12, 0.5], ['beachBall', 'canyon-rush', 'otto', 11, 0.5], ['bubble', 'boardwalk-nights', 'gus', 9, 0.5]]) {
    if (!want(`use-${item}`)) continue;
    await js(`${race(track, racer)} ${ff(after)} const k = ${P}; k.item.held = '${item}'; k.item.charges = ${item === 'tripleFizz' ? 3 : 1}; k.item.rouletteRemaining = 0;`);
    await rec(`use-${item}`, 5.5, { during: `${W(lead * 1000)} ${TAP}` });
  }
  // hero tracking shots
  for (const [name, track, racer, after, cam] of [
    ['hero-boardwalk-front', 'boardwalk-nights', 'nova', 14, HERO(-2.2, 0.9, 6.5, 0.8, 40)],
    ['hero-canyon-side', 'canyon-rush', 'boulder', 20, HERO(4.2, 1.1, 1.0, 0.9, 46)],
    ['hero-skyline-front', 'skyline-circuit', 'juniper', 16, HERO(2.4, 1.0, 7.0, 0.8, 40)],
    ['hero-harbor-orbit', 'harbour-loop', 'pip', 24, HERO(0, 1.3, 5.5, 0.9, 44, 0.55)],
    ['hero-frost-low', 'frostbite-pass', 'momo', 18, HERO(-3.0, 0.5, 3.5, 0.9, 44)],
    ['hero-meadow-front', 'meadow-run', 'sprocket', 22, HERO(1.8, 0.8, 6.0, 0.8, 40)]]) {
    if (!want(name)) continue;
    await js(`${race(track, racer)} ${ff(after)} ${cam}`);
    await rec(name, 5.5);
    await js(`window.__hero = false; kart.photo(null);`);
  }
} finally { await c.close(); }

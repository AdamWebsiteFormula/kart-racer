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
  const COUNTING = `kart.session && kart.session.state.phase === 'countdown' && kart.session.state.tick > 12`;
  /** the pole-sitter's kart view (grid slot 0) */
  const POLE = `(() => { const S = kart.session; const i = S.state.trackers.findIndex((t) => t.gridSlot === 0); return S.views[i]; })()`;
  if (want('cd-front')) {
    // the grid from the front, low: the pole kart revving, the field lined up behind it
    await js(`${QUIT} kart.introAt(null); kart.race('harbour-loop', 'juniper'); kart.autopilot(true);
      for (let i = 0; i < 400 && !(${COUNTING}); i++) await new Promise((r) => requestAnimationFrame(r));
      const f = kart.session.fader, far = { matrixWorld: { elements: [1,0,0,0, 0,1,0,0, 0,0,1,0, 1e6,1e6,1e6,1] } }, upd = f.update.bind(f); f.update = () => upd(far); // rivals stay solid for this shot
      const v = ${POLE}; const p = v.root.position, h = v.root.rotation.y, fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
      kart.photo({ pos: [p.x + fx * 4.2 + rx * 1.3, p.y + 0.55, p.z + fz * 4.2 + rz * 1.3], look: [p.x - fx * 2, p.y + 0.9, p.z - fz * 2], fov: 46 });`);
    await rec('cd-front', 3.4);
    await js(`kart.photo(null);`);
  }
  if (want('cd-lamps')) {
    // the lamps close, from the grid below: red, red, red, then green
    await js(`${QUIT} kart.introAt(null); kart.race('harbour-loop', 'otto'); kart.autopilot(true);
      for (let i = 0; i < 400 && !(${COUNTING}); i++) await new Promise((r) => requestAnimationFrame(r));
      const L = kart.scene.getObjectByName('start-lamps'); L.updateWorldMatrix(true, false);
      const c = new L.position.constructor(); const m = new L.matrixWorld.constructor(); const tmp = new L.position.constructor();
      let n = 0; for (let k = 0; k < L.count; k++) { L.getMatrixAt(k, m); tmp.setFromMatrixPosition(m).applyMatrix4(L.matrixWorld); c.add(tmp); n++; } c.multiplyScalar(1 / n);
      const v = ${POLE}; const h = v.root.rotation.y, fx = Math.sin(h), fz = Math.cos(h);
      kart.photo({ pos: [c.x - fx * 7, c.y - 2.4, c.z - fz * 7], look: [c.x, c.y, c.z], fov: 30 });`);
    await rec('cd-lamps', 3.6);
    await js(`kart.photo(null);`);
  }
  if (want('podium2')) {
    await js(`${race('skyline-circuit', 'juniper')} kart.ceremony(['juniper', 'pip', 'gus']); ${W(300)}`);
    await rec('podium2', 9.5);
  }
  // the Final Lap Shift from a hero camera ahead of the leader (the player), through the change
  for (const [name, track, racer, cam] of [
    ['hero-storm', 'meadow-run', 'gus', HERO(1.8, 0.9, 6.2, 0.9, 44)],
    ['hero-sunset', 'canyon-rush', 'juniper', HERO(-2.0, 0.9, 6.4, 0.9, 44)]]) {
    if (!want(name)) continue;
    await js(`${race(track, racer)}
      for (let attempt = 0; attempt < 8; attempt++) {
        for (let n = 0; n < 9000; n++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); const S = kart.session, K = S.state.karts[S.playerIndex], L = S.manager.track.length; if (K.distanceAlong >= (S.state.lapsTotal - 1) * L - 1.3 * Math.max(12, K.speed)) break; kart.step(4); ${BREATHE} }
        if (kart.session.leader() === kart.session.playerIndex) break;
        ${race(track, racer)}
      }
      ${cam}`);
    await rec(name, 6.5);
    await js(`window.__hero = false; kart.photo(null);`);
  }
} finally { await c.close(); }

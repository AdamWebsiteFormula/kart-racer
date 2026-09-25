// Trailer footage: silent 1080p60 canvas recordings of the game (muted headless Chrome, ?mute, --mute-audio).
//   node capture.mjs [--only=a,b] [--dev=http://localhost:5173/]
// Each shot is a raw MediaRecorder MP4 in shots/, made a standard MP4 by avconvert. Nothing is heard.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
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

/** Records the game canvas for `secs` once `ready` holds, while `during` runs; returns fps. */
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
    await new Promise((r) => setTimeout(r, ${secs * 1000} - (performance.now() - t1)));
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

const QUIT = `if (kart.ui.app.screen === 'racing' || kart.ui.app.screen === 'results') { if (kart.ui.app.screen === 'racing') { kart.ui.dispatch({type:'pause'}); kart.ui.dispatch({type:'quit'}); } else { kart.ui.dispatch({type:'continue'}); } ${W(500)} }`;
/** a race on autopilot, run through the countdown (no intro) */
const race = (track, racer) => `${QUIT} kart.introAt(null); kart.race('${track}', '${racer}'); kart.autopilot(true);
  for (let i = 0; i < 600 && kart.session.state.phase === 'countdown'; i++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); kart.step(20); ${BREATHE} }`;
/** fast-forward sim seconds (keeps the page breathing so warm-ups and swaps finish) */
const ff = (secs) => `for (let i = 0; i < ${Math.round(secs * 60 / 10)}; i++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); kart.step(10); ${BREATHE} }`;
const P = `kart.session.state.karts[kart.session.playerIndex]`;
/** on until the player is `lead` s from starting the last lap; `mustLead`: restart until the player leads then */
const toFinal = (track, racer, lead, mustLead) => `
  for (let attempt = 0; attempt < 8; attempt++) {
    for (let n = 0; n < 9000; n++) {
      if (kart.ui.paused) kart.ui.dispatch({type:'resume'});
      const S = kart.session, K = S.state.karts[S.playerIndex], L = S.manager.track.length;
      if (K.distanceAlong >= (S.state.lapsTotal - 1) * L - ${lead} * Math.max(12, K.speed)) break;
      kart.step(4); ${BREATHE}
    }
    if (!${mustLead} || kart.session.leader() === kart.session.playerIndex) break;
    ${race(track, racer)}
  }`;

try {
  await c.send('Page.navigate', { url: `${flag('dev', 'http://localhost:5173/')}?mute` });
  await sleep(7000);
  await js(`const s = kart.ui.save.settings; s.quality = 'high'; kart.ui.host.settingsChanged({ ...s }); ${W(300)}`);

  // 1. every track's course intro (the game's own flyover), whole
  for (const [track, racer] of [['harbour-loop', 'otto'], ['meadow-run', 'gus'], ['canyon-rush', 'boulder'], ['frostbite-pass', 'pip'], ['boardwalk-nights', 'nova'], ['skyline-circuit', 'juniper']]) {
    if (!want(`intro-${track}`)) continue;
    await js(`${QUIT} kart.introAt(null); kart.race('${track}', '${racer}', { intro: 'full' });`);
    await rec(`intro-${track}`, 6.0, { ready: 'kart.intro && kart.intro.moving' });
  }
  // 2. the start: the lamps count down over the grid, GO, the pack launches (the player on autopilot)
  if (want('start')) {
    await js(`${QUIT} kart.race('harbour-loop', 'juniper'); kart.autopilot(true);`);
    await rec('start', 6.5, { ready: `kart.session && kart.session.state.phase === 'countdown' && kart.session.state.tick > 20` });
  }
  // 3. drifts: from a purple-bound drift to its release
  for (const [track, racer] of [['canyon-rush', 'momo'], ['boardwalk-nights', 'pip'], ['frostbite-pass', 'boulder'], ['meadow-run', 'nova']]) {
    if (!want(`drift-${track}`)) continue;
    await js(`${race(track, racer)} ${ff(8)}`);
    await rec(`drift-${track}`, 4.5, { ready: `${P}.drift.phase === 'drifting' && ${P}.drift.charge > 60`, timeout: 40000 });
  }
  // 4. items in action: the player is handed one, the autopilot uses it
  for (const [item, track, racer, after] of [['strikeBall', 'meadow-run', 'boulder', 20], ['pogoSpring', 'canyon-rush', 'pip', 14], ['airHorn', 'harbour-loop', 'gus', 6], ['grappleAnchor', 'skyline-circuit', 'otto', 16], ['tripleFizz', 'frostbite-pass', 'nova', 10], ['fogBank', 'boardwalk-nights', 'sprocket', 22], ['windUpMouse', 'harbour-loop', 'juniper', 25], ['homingKite', 'meadow-run', 'momo', 12]]) {
    if (!want(`item-${item}`)) continue;
    await js(`${race(track, racer)} ${ff(after)} const k = ${P}; k.item.held = '${item}'; k.item.charges = ${item === 'tripleFizz' ? 3 : 1}; k.item.rouletteRemaining = 0;`);
    await rec(`item-${item}`, 6.5);
  }
  // 5. the loop-the-loop, from just before the ring
  if (want('loop')) {
    await js(`${race('boardwalk-nights', 'juniper')}
      for (let n = 0; n < 4000; n++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); if (${P}.status.loopIndex >= 0) break; kart.step(2); ${BREATHE} }`);
    await rec('loop', 5.5);
  }
  // 6. Final Lap Shifts, the player leading so the set piece plays in front of the camera
  for (const [track, racer, secs] of [['meadow-run', 'gus', 10], ['canyon-rush', 'juniper', 10], ['boardwalk-nights', 'sprocket', 10], ['frostbite-pass', 'pip', 9], ['skyline-circuit', 'nova', 9], ['harbour-loop', 'otto', 9]]) {
    if (!want(`shift-${track}`)) continue;
    await js(`${race(track, racer)} ${toFinal(track, racer, 1.2, true)}`);
    await rec(`shift-${track}`, secs);
  }
  // 7. a win: the finish swing in slow motion and the racer's leap (the player must win)
  if (want('win')) {
    await js(`${race('harbour-loop', 'pip')}
      for (let attempt = 0; attempt < 8; attempt++) {
        for (let n = 0; n < 9000; n++) { if (kart.ui.paused) kart.ui.dispatch({type:'resume'}); const K = ${P}, L = kart.session.manager.track.length; if (K.distanceAlong >= kart.session.state.lapsTotal * L - 40) break; kart.step(4); ${BREATHE} }
        if (kart.session.leader() === kart.session.playerIndex) break;
        ${race('harbour-loop', 'pip')}
      }`);
    await rec('win', 6.5);
  }
} finally { await c.close(); }

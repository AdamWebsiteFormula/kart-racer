// Stills of every item in use in a real race, in silent headless Chrome on a running dev server (muted:
// ?mute): a Quick Race on autopilot, and at a set moment a kart is handed the item and presses (or holds)
// its button, the AI's own inputs taken over for that one button (the sim decides the rest). Frames are
// captured at chosen ticks after the press, from the chase camera or a close-up in a kart's own frame
// (kart.photo). The race's seed is pinned, so a run is the same race every time.
//   node scripts/headless/item-shots.mjs <outdir> [--url=http://127.0.0.1:5196/] [--only=beachBall,strikeBall]
//     [--track=harbour-loop] [--racer=pip] [--size=1280x720] [--seed=424242]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openChrome } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [out] = args.filter((a) => !a.startsWith('--'));
if (!out) { console.error('usage: item-shots.mjs <outdir> [--only=...]'); process.exit(1); }
mkdirSync(out, { recursive: true });
const [width, height] = flag('size', '1280x720').split('x').map(Number);
const track = flag('track', 'harbour-loop'), racer = flag('racer', 'pip'), seed = Number(flag('seed', '424242'));

/**
 * Each item's shots. `who`: the kart that uses it ('me', or 'ahead': the nearest kart in front of me);
 * `hold`: frames to keep the button down (a trailed item; 0 a tap, then `press2` a second tap at that frame);
 * `at`: the frames after the press to capture; `photo`: a close-up (kart.photo in a kart's frame: +z its nose,
 * +x its left) instead of the chase camera; `from`: seconds of racing before the press; `rank`: wait until I am
 * at least this far back (the EMP Blast works from 5th back).
 */
const SHOTS = {
  beachBall: [{ who: 'me', at: [3, 8, 14] }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
  homingKite: [{ who: 'me', at: [6, 16, 30, 45, 60, 75, 90] }],
  oilCan: [{ who: 'me', at: [30], photo: { pos: [2.4, 2.2, 3.5], look: [0, 0.3, -3.5], kart: 'me' } }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
  decoyBalloon: [{ who: 'ahead', at: [20, 60, 90, 110, 130] }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
  airHorn: [{ who: 'me', at: [2, 5, 9, 14], photo: { pos: [5, 5.5, -7], look: [0, 0.5, 0], kart: 'me' } }],
  bubble: [{ who: 'me', at: [4, 10, 40] }, { who: 'me', at: [60], photo: { pos: [3.5, 1.6, 4.5], look: [0, 0.8, 0], kart: 'me' }, tag: 'front' }],
  fizzPop: [{ who: 'me', at: [3, 10, 30] }],
  tripleFizz: [{ who: 'me', hold: -1, at: [20], photo: { pos: [3.6, 2.4, 4.8], look: [0, 0.8, 0], kart: 'me' } }, { who: 'me', at: [4, 20] , tag: 'chase', hold: -1 }],
  fogBank: [{ who: 'me', rank: 5, at: [2, 8, 20, 60, 120] }],
  strikeBall: [{ who: 'me', from: 16, at: [2, 6, 12, 40, 200, 560, 596, 604, 612, 625] }, { who: 'me', from: 16, at: [60, 120], photo: { pos: [4, 2.2, 6], look: [0, 1, 0], kart: 'me' }, tag: 'front' }],
  pogoSpring: [{ who: 'me', at: [8, 24, 40], press2: 46, then: [50, 54, 58, 62, 66, 72] }, { who: 'me', at: [14, 30], photo: { pos: [5, 1.6, 2], look: [0, 1.6, 0], kart: 'me' }, tag: 'side' }],
  grappleAnchor: [{ who: 'me', near: 30, at: [4, 12, 30, 50] }],
  windUpMouse: [{ who: 'me', at: [8, 20, 40] }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
};
const only = flag('only', '');
const list = Object.entries(SHOTS).filter(([id]) => !only || only.split(',').includes(id));

const c = await openChrome({ width, height });
try {
  await c.goto(flag('url', 'http://127.0.0.1:5196/'));
  for (const [itemId, shots] of list) {
    for (const [n, shot] of shots.entries()) {
      const tag = `${itemId}${shot.tag ? `-${shot.tag}` : shots.length > 1 ? `-${n}` : ''}`;
      // a fresh race on autopilot, to `from` seconds of racing (and far enough back / near enough behind a kart)
      const ready = await c.eval(`(async () => {
        kart.photo(null);
        kart.race('${track}', '${racer}'); kart.autopilot(true);
        const S = () => kart.session;
        S().state.seed = ${seed};
        const breathe = () => new Promise((r) => setTimeout(r, 0));
        const me = () => S().state.karts[S().playerIndex];
        const ahead = () => { const ks = S().state.karts, m = me(); let best = -1, gap = 1; ks.forEach((k, i) => { if (i === S().playerIndex) return; const g = ((k.t - m.t) % 1 + 1) % 1; if (g > 0 && g < gap && k.branch === m.branch) { gap = g; best = i; } }); return { i: best, m: gap * S().track.length }; };
        for (let f = 0; f < 6000; f++) {
          if (kart.ui.paused) kart.ui.dispatch({ type: 'resume' });
          kart.step(1); if (f % 30 === 0) await breathe();
          const st = S().state;
          if (st.phase !== 'racing' && st.phase !== 'finalLap') continue;
          if (st.time < ${shot.from ?? 4}) continue;
          ${shot.rank ? `if (me().rank < ${shot.rank}) continue;` : ''}
          ${shot.near ? `const a = ahead(); if (a.i < 0 || a.m > ${shot.near} || a.m < 8) continue;` : ''}
          ${shot.who === 'ahead' ? `const a2 = ahead(); if (a2.i < 0 || a2.m > 40 || a2.m < 15) continue;` : ''}
          return { t: st.time, rank: me().rank };
        }
        return null;
      })()`);
      if (!ready) { console.log(`${tag}: no moment found`); continue; }
      // hand the item over and take over its button
      const who = shot.who === 'ahead' ? 'ahead().i' : 'S().playerIndex';
      await c.eval(`(() => {
        const S = () => kart.session;
        const me = () => S().state.karts[S().playerIndex];
        const ahead = () => { const ks = S().state.karts, m = me(); let best = -1, gap = 1; ks.forEach((k, i) => { if (i === S().playerIndex) return; const g = ((k.t - m.t) % 1 + 1) % 1; if (g > 0 && g < gap && k.branch === m.branch) { gap = g; best = i; } }); return { i: best }; };
        const k = ${who};
        const def = S().items.cfg.items.find((d) => d.id === '${itemId}');
        S().state.karts[k].item = { held: '${itemId}', charges: def.behaviour.charges ?? 1, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0 };
        window.__who = k; window.__press = { frame: 0, hold: ${shot.hold ?? 0}, press2: ${shot.press2 ?? -1} };
        const ai = S().ai;
        if (!ai.__fill) { ai.__fill = ai.fill.bind(ai); }
        ai.fill = (st, hz, inputs) => {
          ai.__fill(st, hz, inputs);
          const p = window.__press;
          if (!p || window.__who < 0) return;
          // the AI never presses this kart's button on its own meanwhile
          const i = window.__who;
          const f = p.tick ?? 0;
          p.tick = f + 1;
          const hold = p.hold;
          inputs[i].item = hold < 0 ? false : f === 0 || (hold > 0 && f < hold * 2) || (p.press2 >= 0 && f === p.press2 * 2);
        };
        return k;
      })()`);
      if (shot.photo) {
        const kp = shot.photo.kart === 'me' ? 'kart.session.playerIndex' : 'window.__who';
        await c.eval(`kart.photo({ pos: ${JSON.stringify(shot.photo.pos)}, look: ${JSON.stringify(shot.photo.look)}, fov: 55, kart: ${kp} })`);
      }
      const frames = [...shot.at, ...(shot.then ?? [])];
      let at = 0;
      for (const f of frames) {
        await c.eval(`(async () => { kart.step(${f - at}); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
        at = f;
        const file = join(out, `${tag}-${String(f).padStart(3, '0')}.jpg`);
        writeFileSync(file, await c.jpeg(82));
      }
      const stats = await c.eval('kart.stats()');
      console.log(`${tag}: t ${ready.t.toFixed(1)} s, rank ${ready.rank}, ${frames.length} frames, ${stats.drawCalls} draw calls`);
      await c.eval('(() => { window.__who = -1; kart.photo(null); })()');
    }
  }
} finally { await c.close(); }

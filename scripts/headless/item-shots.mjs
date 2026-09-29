// Stills of every item in use in a real race, in silent headless Chrome on a running dev server (muted:
// ?mute): a Quick Race on autopilot, and at a set moment a kart is handed the item and presses (or holds)
// its button, the AI's own inputs taken over for that one button (the sim decides the rest). Frames are
// captured at chosen frames after the press (kart.step: 60 a second), from the chase camera or a view in a
// kart's own frame (kart.photo). The race's seed is pinned, so a run is the same race every time. A dev tool.
// Never edit the game's files while it runs: the dev server reloads the page under it.
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

/** A chase view in a kart's own frame (+z its nose, +x its left): behind it and up, looking up the road past it. */
const CHASE = { pos: [0, 2.6, -6], look: [0, 1.2, 6] };
/**
 * Each item's shots. `who`: 'me' (the player, the chase camera) or 'shooter' (any kart with another on its road
 * `gap` metres ahead, (min, max), seen from a chase view of its own unless `photo` says); `hold`: frames to keep
 * the button down (a trailed item; -1 never pressed: the item is only shown; 0 a tap, `press2` a second tap at
 * that frame); `at`: the frames after the press to capture, `then` more after `press2`; `pop`: then on to the
 * frame the kart's shot ends and these frames after it; `photo`: a view in a kart's frame (`kart`: 'me', 'who',
 * or 'behind', the kart behind it); `rank`: the kart at least this far back (the EMP Blast works from 5th back);
 * `from`: seconds of racing first (8: after the GO! banner).
 */
const SHOTS = {
  beachBall: [{ who: 'shooter', gap: [14, 40], at: [3, 8, 14, 22] }, { who: 'me', hold: 200, at: [60], tag: 'held', photo: { pos: [1.6, 1.4, -5.2], look: [0, 0.4, -1.9], kart: 'me' } }],
  homingKite: [{ who: 'shooter', gap: [18, 40], at: [6, 14, 22], pop: [0, 2, 4, 8, 16] }],
  oilCan: [{ who: 'me', at: [30], photo: { pos: [2.4, 2.2, 3.5], look: [0, 0.3, -3.5], kart: 'me' } }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
  decoyBalloon: [{ who: 'me', at: [60], photo: { pos: [2.6, 2.4, 2], look: [0, 1.4, -4.4], kart: 'me' } }, { who: 'shooter', gap: [10, 25], photo: { ...CHASE, kart: 'behind' }, at: [30, 50, 70], pop: [0, 3, 8], tag: 'hit' }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
  airHorn: [{ who: 'me', at: [2, 5, 9, 14], photo: { pos: [5, 5.5, -7], look: [0, 0.5, 0], kart: 'me' } }, { who: 'me', at: [4, 8], tag: 'chase' }],
  bubble: [{ who: 'me', at: [4, 10, 40] }, { who: 'me', at: [60], photo: { pos: [3.5, 1.6, 4.5], look: [0, 0.8, 0], kart: 'me' }, tag: 'front' }],
  fizzPop: [{ who: 'me', at: [2, 6, 12, 30] }],
  tripleFizz: [{ who: 'me', hold: -1, at: [20], photo: { pos: [3.6, 2.4, 4.8], look: [0, 0.8, 0], kart: 'me' } }, { who: 'me', at: [4, 20], tag: 'chase', hold: -1 }],
  fogBank: [{ who: 'me', rank: 5, at: [2, 8, 20, 60, 120] }],
  strikeBall: [{ who: 'me', from: 16, at: [2, 6, 12, 40, 150, 285, 297, 301, 304, 308, 314, 325] }, { who: 'me', from: 16, at: [30, 90], photo: { pos: [4, 2.2, 6], look: [0, 1, 0], kart: 'me' }, tag: 'front' }],
  pogoSpring: [{ who: 'me', at: [4, 12, 20, 28], press2: 32, then: [34, 36, 38, 41, 44, 50] }, { who: 'me', at: [8, 16], photo: { pos: [5, 1.6, 2], look: [0, 1.6, 0], kart: 'me' }, tag: 'side' }],
  grappleAnchor: [{ who: 'shooter', gap: [14, 35], at: [4, 12, 30, 50] }],
  windUpMouse: [{ who: 'shooter', gap: [14, 40], at: [8, 20, 40] }, { who: 'me', hold: 200, at: [60], tag: 'held' }],
};
const only = flag('only', '');
const list = Object.entries(SHOTS).filter(([id]) => !only || only.split(',').includes(id));

/** In the page: the nearest kart ahead (dir 1) or behind (-1) of kart i on its own road within half a lap (index and metres); whether a kart can use an item. */
const HELPERS = `
  const S = () => kart.session;
  const me = () => S().state.karts[S().playerIndex];
  const near = (i, dir) => { const ks = S().state.karts, m = ks[i]; let best = -1, gap = 0.5; ks.forEach((k, j) => { if (j === i || k.branch !== m.branch) return; const g = (((k.t - m.t) * dir) % 1 + 1) % 1; if (g > 0 && g < gap) { gap = g; best = j; } }); return { i: best, m: gap * S().track.length }; };
  const fine = (k) => k.status.spinRemaining <= 0 && k.status.intangibleRemaining <= 0 && k.speed > 15 && k.finishTick === undefined;`;

const c = await openChrome({ width, height });
try {
  await c.goto(flag('url', 'http://127.0.0.1:5196/'));
  for (const [itemId, shots] of list) {
    for (const [n, shot] of shots.entries()) {
      const tag = `${itemId}${shot.tag ? `-${shot.tag}` : shots.length > 1 ? `-${n}` : ''}`;
      // a fresh race on autopilot, on to the moment: `from` seconds in, the kart that uses it fine, the gap right
      const ready = await c.eval(`(async () => {
        ${HELPERS}
        kart.photo(null);
        // a fresh race every time (naming the kart makes kart.race load again, even on the same track)
        const own = S()?.manager.consts[S().playerIndex]?.kartId;
        kart.race('${track}', '${racer}', own ? { kartId: own } : {}); kart.autopilot(true);
        S().state.seed = ${seed};
        const breathe = () => new Promise((r) => setTimeout(r, 0));
        // (never to the finish: a finished race's results would stay over the next one)
        for (let f = 0; f < 3000; f++) {
          if (kart.ui.paused) kart.ui.dispatch({ type: 'resume' });
          kart.step(1); if (f % 30 === 0) await breathe();
          const st = S().state;
          if (st.phase !== 'racing' && st.phase !== 'finalLap') continue;
          if (st.time < ${shot.from ?? 8}) continue;
          const late = st.time > 50;
          ${shot.who === 'shooter' ? `
          // a kart with one on its road ${shot.gap[0]} to ${shot.gap[1]} m ahead (the player's if it can: it has the chase camera)
          const order = [S().playerIndex, ...st.karts.map((_, j) => j).filter((j) => j !== S().playerIndex)];
          for (const i of order) {
            const k = st.karts[i], a = near(i, 1);
            if (!fine(k) || a.i < 0 || a.m < ${shot.gap[0]} || a.m > ${shot.gap[1]} || !fine(st.karts[a.i])) continue;
            return { who: i, me: S().playerIndex, behind: near(i, -1).i, t: st.time, rank: k.rank };
          }
          if (late) return { who: S().playerIndex, me: S().playerIndex, behind: near(S().playerIndex, -1).i, t: st.time, rank: me().rank, fallback: true };` : `
          if (!fine(me()) && !late) continue;
          ${shot.rank ? `if (me().rank < ${shot.rank} && !late) continue;` : ''}
          return { who: S().playerIndex, me: S().playerIndex, behind: near(S().playerIndex, -1).i, t: st.time, rank: me().rank, fallback: late };`}
        }
        return null;
      })()`);
      if (!ready) { console.log(`${tag}: no moment found`); continue; }
      // hand the item over and take over its button
      await c.eval(`(() => {
        const S = kart.session, k = ${ready.who};
        const def = S.items.cfg.items.find((d) => d.id === '${itemId}');
        S.state.karts[k].item = { held: '${itemId}', charges: def.behaviour.charges ?? 1, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0 };
        window.__who = k; window.__press = { hold: ${shot.hold ?? 0}, press2: ${shot.press2 ?? -1} };
        const ai = S.ai;
        if (!ai.__fill) ai.__fill = ai.fill.bind(ai);
        ai.fill = (st, hz, inputs) => {
          ai.__fill(st, hz, inputs);
          const p = window.__press;
          if (!p || window.__who < 0) return;
          const f = p.tick ?? 0;
          p.tick = f + 1;
          // one tick up first (the AI may have been holding it: the press must be an edge), then the press (ticks: 2 a frame)
          const hold = p.hold;
          inputs[window.__who].item = hold < 0 ? false : f === 1 || (hold > 0 && f >= 1 && f < 1 + hold * 2) || (p.press2 >= 0 && f === 1 + p.press2 * 2);
        };
      })()`);
      const view = shot.photo ?? (ready.who !== ready.me ? { ...CHASE, kart: 'who' } : null);
      if (view) {
        const idx = view.kart === 'me' ? String(ready.me) : view.kart === 'behind' ? String(ready.behind) : String(ready.who);
        await c.eval(`kart.photo({ pos: ${JSON.stringify(view.pos)}, look: ${JSON.stringify(view.look)}, fov: 55, kart: ${idx} })`);
      }
      const frames = [...shot.at, ...(shot.then ?? [])];
      let at = 0;
      for (const f of frames) {
        await c.eval(`(async () => { kart.step(${f - at}); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
        at = f;
        writeFileSync(join(out, `${tag}-${String(f).padStart(3, '0')}.jpg`), await c.jpeg(82));
      }
      if (shot.pop) {
        // on to the frame its shot or drop ends (hits, is blocked or runs out), then `pop` frames after it
        const gone = await c.eval(`(() => {
          const S = kart.session, id = S.state.karts[window.__who]?.racerId;
          for (let f = 0; f < 900; f++) {
            const st = S.items.state;
            const live = st.projectiles.some((p) => p.ownerId === id && p.itemId === '${itemId}') || st.groundItems.some((g) => g.ownerId === id && g.itemId === '${itemId}');
            if (!live) return f;
            kart.step(1);
          }
          return -1;
        })()`);
        let was = 0;
        for (const f of shot.pop) {
          await c.eval(`(async () => { kart.step(${f - was}); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
          was = f;
          writeFileSync(join(out, `${tag}-pop${gone}+${f}.jpg`), await c.jpeg(82));
        }
      }
      const stats = await c.eval('kart.stats()');
      console.log(`${tag}: kart ${ready.who}${ready.fallback ? ' (no ideal moment)' : ''}, t ${ready.t.toFixed(1)} s, rank ${ready.rank}, ${frames.length} frames, ${stats.drawCalls} draw calls`);
      await c.eval('(() => { window.__who = -1; kart.photo(null); })()');
    }
  }
} finally { await c.close(); }

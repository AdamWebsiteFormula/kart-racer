// A bug sweep in silent headless Chrome (?mute, --mute-audio): every track with the AI driving the player
// (kart.autopilot, dev only), run by hand (kart.step) for `--frames` frames, then every mode started from
// the menus; collects page errors, rejected promises and console errors, and the race's state at the end.
//   node scripts/headless/soak.mjs [--url=http://localhost:5173/] [--frames=1800] [--tracks=a,b]
import { openChrome, muted } from './cdp.mjs';

const args = process.argv.slice(2);
const flag = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=').slice(1).join('=');
const url = flag('url', 'http://localhost:5173/'), frames = Number(flag('frames', 1800));
const c = await openChrome({ width: 1280, height: 720 });
const report = [];
try {
  await c.goto(muted(url));
  await c.eval(`(() => { window.__errs = []; const push = (k, m) => window.__errs.push(k + ': ' + String(m).slice(0, 300));
    addEventListener('error', (e) => push('error', e.message)); addEventListener('unhandledrejection', (e) => push('rejection', e.reason?.stack ?? e.reason));
    const ce = console.error; console.error = (...a) => { push('console', a.join(' ')); ce(...a); }; })()`);
  await c.eval('new Promise((r) => setTimeout(r, 4000))');
  const all = ['harbour-loop', 'meadow-run', 'canyon-rush', 'frostbite-pass', 'boardwalk-nights', 'skyline-circuit'];
  const tracks = flag('tracks', '') ? flag('tracks', '').split(',') : all;
  const racers = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i], who = racers[(all.indexOf(t) + i) % racers.length];
    const r = await c.eval(`(async () => { kart.autopilot(true); kart.race('${t}', '${who}'); await new Promise((r) => setTimeout(r, 2500));
      for (let k = 0; k < ${frames}; k += 60) kart.step(60);
      const s = kart.session, p = s?.state?.karts?.find?.((k) => k.isPlayer) ?? s?.state?.karts?.[0];
      const ks = s?.state?.karts ?? [], bad = ks.filter((k) => !(k.position ?? []).every(Number.isFinite)).length;
      return { track: '${t}', racer: '${who}', screen: kart.ui?.app?.screen, lap: p?.lap, laps: ks.map((k) => k.lap).join(''), t: +(s?.state?.time ?? 0).toFixed?.(1), nanKarts: bad, errs: window.__errs.splice(0) }; })()`);
    report.push(r); console.log(JSON.stringify(r));
  }
  {
    const r = await c.eval(`(async () => { kart.autopilot(false); const ui = kart.ui, out = [];
      for (const mode of ['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']) {
        try { for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode }]) ui.dispatch(a); out.push(mode + ' -> ' + ui.app.screen); } catch (e) { out.push(mode + ' threw ' + e.message); }
        await new Promise((r) => setTimeout(r, 600));
      }
      return { modes: out, errs: window.__errs.splice(0) }; })()`);
    report.push(r); console.log(JSON.stringify(r));
  }
} finally { await c.close(); }

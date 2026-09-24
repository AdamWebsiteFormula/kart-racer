// Per-asset measurement, as the game plays each one (its cut start, its level gain, its MIX level).
import { it } from 'vitest';
import fs from 'node:fs';
import { OUT, ROOT, wavFor } from './paths.ts';
import { decodeWav } from './webaudio.ts';
import { filter, hopPower, kCoefs, lufs, db, pdb, integrated } from './dsp.ts';
import { cutSfx, cutSong, mixLevel } from '../../../src/audio/samples.ts';

const TAG = process.env.TAG ?? 'before';
const FS = 44100;
const CAT: [string, RegExp][] = [
  ['race', /^(count|go|lap|finalLap|finish|finishLow|shift|koOut|koSafe)$/],
  ['ui', /^(uiMove|uiConfirm|uiBack|gainPlace|losePlace|wrongWay|respawn|itemReady|rouletteTick|coin|balloon|denied)$/],
  ['items', /^(throw|kite|drop|shieldUp|shieldPop|shieldEnd|airHorn|fog|fizz|strikeRoll|strike|boing|slam|anchor|slingshot|mouse|blocked|trail|bounce|pop|hitConfirm)$/],
  ['hits', /^(hit|spin)$/],
  ['boost', /^(boost1|boost2|boost3|boostPad|boostTrick|boostStart|slipstream|tierUp|tierUp2|tierUp3|trick)$/],
  ['driving', /^(hop|land|wall|bump|loop|claw|clawDrop)$/],
  ['creatures', /^(roar|stomp|yetiThrow|snowThud|krakenRise|krakenSlam|crabClack|honk|whaleSong|tailSlap|ventWarn|geyser|steamVent)$/],
  ['horns', /^horn:/], ['yelps', /^yelp:/], ['loops', /^(engine-|drift|offroad|road-|rail-|sparks)/],
];
const catOf = (id: string) => CAT.find(([, r]) => r.test(id))?.[0] ?? '?';
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-inf');

it('assets', () => {
  const man = JSON.parse(fs.readFileSync(`${ROOT}public/audio/manifest.json`, 'utf8'));
  const kc = kCoefs(FS);
  const rows: any[] = [];
  for (const [id, m] of Object.entries<any>(man.sfx)) {
    const f = wavFor(m.url)!;
    const b = decodeWav(fs.readFileSync(f), FS);
    const raw = b.chs.map((c) => Float32Array.from(c));
    const s = cutSfx(b as any, !!m.loop, id);
    const g = s.gain * (m.loop ? 1 : mixLevel(id));
    const i0 = Math.round(s.start * FS), n0 = raw[0].length;
    const i1 = m.loop ? n0 : Math.round(s.end * FS);
    // what plays: the shaped buffer from its cut start to its cut end
    const shaped = b.chs.map((c) => c.subarray(0, i1)), n = i1;
    const played = shaped.map((c) => c.subarray(i0));
    // 10 ms K-weighted hops of the played sound, at its played gain
    const kh = hopPower(filter(played, kc), 441).map((p) => p * g * g);
    let best = 0; for (let i = 0; i + 10 <= kh.length || i === 0; i++) { let a = 0; for (let j = i; j < Math.min(kh.length, i + 10); j++) a += kh[j]; best = Math.max(best, a / Math.min(10, kh.length)); if (i + 10 > kh.length) break; }
    // mean loudness for loops
    const meanK = kh.reduce((x, y) => x + y, 0) / kh.length;
    // envelope 1 ms
    const env: number[] = []; for (let i = 0; i + 44 <= played[0].length; i += 44) { let a = 0; for (const c of played) for (let j = i; j < i + 44; j++) a += c[j] * c[j]; env.push(Math.sqrt(a / 88)); }
    const emax = Math.max(...env);
    const onset = env.findIndex((e) => e >= emax * Math.pow(10, -12 / 20)); // ms to within 12 dB of the peak
    let rawLead = 0; outer: for (let i = 0; i < n; i++) for (const c of raw) if (Math.abs(c[i]) > 0.003) { rawLead = i / FS; break outer; }
    const dc = Math.max(...shaped.map((c) => Math.abs(c.reduce((x, y) => x + y, 0) / c.length)));
    const pk50 = (() => { let bst = 0; for (let i = 0; i + 5 <= kh.length; i++) { let a = 0; for (let j = i; j < i + 5; j++) a += kh[j]; bst = Math.max(bst, a / 5); } return bst; })();
    // raw RMS per 20 ms for floor/tail
    const r20: number[] = []; for (let i = 0; i + 882 <= n; i += 882) { let a = 0; for (const c of shaped) for (let j = i; j < i + 882; j++) a += c[j] * c[j]; r20.push(Math.sqrt(a / (882 * raw.length))); }
    const rmax = Math.max(...r20);
    const nz = r20.filter((x) => x > 1e-7).sort((x, y) => x - y);
    const floor = nz.length ? nz[Math.floor(nz.length * 0.05)] : 0;
    const last50 = (() => { let a = 0; const k = Math.round(0.05 * FS); for (const c of shaped) for (let j = n - k; j < n; j++) a += c[j] * c[j]; return Math.sqrt(a / (k * shaped.length)); })();
    const lastSample = Math.max(...shaped.map((c) => Math.abs(c[n - 1])));
    const firstSample = Math.max(...shaped.map((c) => Math.abs(c[i0])));
    const peakAbs = Math.max(...played.map((c) => c.reduce((x, y) => Math.max(x, Math.abs(y)), 0))) * g;
    rows.push({
      id, cat: catOf(id), dur: n / FS, rawDur: n0 / FS, loop: !!m.loop, gain: s.gain, mix: m.loop ? 1 : mixLevel(id),
      L100: lufs(best), L50: lufs(pk50), Lmean: lufs(meanK), onsetMs: onset, rawLeadMs: rawLead * 1000, trimMs: s.start * 1000,
      dcDb: db(dc), floorDb: db(floor), floorRel: db(floor / rmax), tailRel: db(last50 / rmax), lastSample, firstSample, peak: peakAbs,
    });
  }
  const out: string[] = [];
  const P = (s: string) => out.push(s);
  P(`=== assets ${TAG} (as played, gain 1 cue, before bus/master) ===`);
  for (const [cat] of CAT) {
    const r = rows.filter((x) => x.cat === cat);
    const key = cat === 'loops' ? 'Lmean' : 'L100';
    const vals = r.map((x) => x[key]).sort((a, b) => a - b);
    const medv = vals[Math.floor(vals.length / 2)];
    P(`[${cat}] n=${r.length} ${key} median ${f1(medv)} LUFS, spread ${f1(vals[vals.length - 1] - vals[0])} LU`);
    for (const x of r.sort((a, b) => a[key] - b[key])) {
      const flags = [
        Math.abs(x[key] - medv) > 2 ? `LEVEL ${x[key] - medv > 0 ? '+' : ''}${f1(x[key] - medv)}` : '',
        !x.loop && x.onsetMs > 25 ? `LATE ${x.onsetMs}ms` : '',
        x.dcDb > -50 ? `DC ${f1(x.dcDb)}` : '',
        x.floorDb > -60 && !x.loop ? `FLOOR ${f1(x.floorDb)}` : '',
        !x.loop && x.tailRel > -30 ? `TAILCUT ${f1(x.tailRel)}` : '',
        !x.loop && x.lastSample > 0.01 ? `ENDCLICK ${x.lastSample.toFixed(3)}` : '',
        !x.loop && x.firstSample > 0.05 ? `STARTJUMP ${x.firstSample.toFixed(3)}` : '',
        x.gain >= 5.99 ? 'GAINCAPPED' : '',
      ].filter(Boolean).join(' ');
      P(`  ${x.id.padEnd(14)} ${f1(x[key]).padStart(6)} dur ${x.dur.toFixed(2)} gain ${x.gain.toFixed(2)}×mix ${x.mix} onset ${x.onsetMs}ms rawLead ${x.rawLeadMs.toFixed(0)}ms trim ${x.trimMs.toFixed(0)}ms floor ${f1(x.floorDb)} tail ${f1(x.tailRel)} ${flags}`);
    }
  }
  // songs
  for (const [id, m] of Object.entries<any>(man.music)) {
    const b = decodeWav(fs.readFileSync(wavFor(m.url)!), FS);
    const s = cutSong(b as any, m.bpm);
    const i0 = Math.round(s.loopStart! * FS), i1 = Math.round(s.loopEnd! * FS);
    const seg = b.chs.map((c) => { const o = c.slice(i0, i1); for (let i = 0; i < o.length; i++) o[i] *= s.gain; return o; });
    const kh = hopPower(filter(seg, kc), 4410);
    P(`[song] ${id.padEnd(15)} gain ${s.gain.toFixed(2)} integrated ${f1(integrated(kh))} LUFS (loop ${((i1 - i0) / FS).toFixed(1)} s)`);
  }
  const txt = out.join('\n');
  fs.writeFileSync(`${OUT}/assets-${TAG}.txt`, txt + '\n');
  fs.writeFileSync(`${OUT}/assets-${TAG}.json`, JSON.stringify(rows));
}, 600_000);

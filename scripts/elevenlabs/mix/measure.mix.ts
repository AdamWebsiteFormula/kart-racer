// Measure a render (mix + stems + cue log) the way a mix engineer would. Prints a report and
// writes a JSON summary next to the render.
import { it } from 'vitest';
import fs from 'node:fs';
import { OUT, ROOT, wavFor } from './paths.ts';
import { decodeWav } from './webaudio.ts';
import { bandCoefs, filter, hopPower, integrated, kCoefs, lra, lufs, octaveBands, OCTAVES, pdb, db, stereo, truePeak, welch } from './dsp.ts';
import { busGains } from '../../../src/audio/bus.ts';

const TRACK = process.env.TRACK ?? 'harbour-loop';
const TAG = process.env.TAG ?? 'before';
const FS = 44100, HOP = 441;
/** reference octave curve for a bright cartoon game mix, dB re the 1 kHz octave (assumed; ±4 dB tolerance) */
const TARGET = [2, 3, 2, 1, 0, -2, -4.5, -8, -15];

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-inf');
const med = (a: number[]) => { const s = [...a].filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : -Infinity; };
const pct = (a: number[], p: number) => { const s = [...a].filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : -Infinity; };

it(`measure ${TAG} ${TRACK}`, () => {
  const log = JSON.parse(fs.readFileSync(`${OUT}/${TAG}-${TRACK}.json`, 'utf8'));
  const rd = (n: string) => decodeWav(fs.readFileSync(`${OUT}/${TAG}-${TRACK}-${n}.wav`), FS).chs;
  const g = busGains(process.env.FULL ? { master: 1, music: 1, sfx: 1 } : { master: 0.8, music: 0.7, sfx: 0.8 });
  const M = log.masterGain as number;
  const scale = (chs: Float32Array[], k: number) => chs.map((c) => { const o = new Float32Array(c.length); for (let i = 0; i < c.length; i++) o[i] = c[i] * k; return o; });
  const out = rd('out');
  // stems at the dynamics' input: music already has its bus gain; engines and cues get the sfx bus
  const music = scale(rd('music'), M), engine = scale(rd('engine'), M * g.sfx), cuesS = scale(rd('cues'), M * g.sfx);
  const kc = kCoefs(FS);
  const kp = (chs: Float32Array[]) => hopPower(filter(chs, kc), HOP);
  const [kOut, kMus, kEng, kCue] = [out, music, engine, cuesS].map(kp);
  const to100 = (h: Float64Array) => { const n = Math.floor(h.length / 10), o = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < 10; j++) s += h[i * 10 + j]; o[i] = s / 10; } return o; };
  const I = (h: Float64Array) => integrated(to100(h));
  const tp = truePeak(out);
  const L = lra(to100(kOut));
  const mk = log.marks;
  const secs = (a: number, b: number, h: Float64Array) => h.subarray(Math.floor(a * 100), Math.floor(b * 100));
  const phases: [string, number, number][] = [['countdown', 0, mk.go], ['race', mk.go, mk.finalLap], ['final lap', mk.finalLap, mk.finish], ['after line', mk.finish, mk.results], ['results', mk.results, log.seconds]];
  const rep: string[] = [];
  const P = (s: string) => rep.push(s);
  P(`=== ${TAG} ${TRACK} (${log.seconds.toFixed(1)} s, player ${log.player}) ===`);
  P(`Integrated ${f1(I(kOut))} LUFS | true peak ${f1(db(tp.tp))} dBTP | sample peak ${f1(db(tp.sp))} dBFS | clipped samples ${tp.clips} | LRA ${f1(L.lra)} LU | short-term max ${f1(Math.max(...L.st))} LUFS`);
  P(`Race-only (go→finish) integrated ${f1(I(secs(mk.go, mk.finish, kOut)))} LUFS`);
  P(`Stems at the dynamics input (integrated, go→finish): music ${f1(I(secs(mk.go, mk.finish, kMus)))} | engines ${f1(I(secs(mk.go, mk.finish, kEng)))} | cues ${f1(I(secs(mk.go, mk.finish, kCue)))} LUFS`);
  // momentary balance (400 ms) per phase
  const mom = (h: Float64Array) => { const a: number[] = []; for (let i = 0; i + 40 <= h.length; i += 10) { let s = 0; for (let j = i; j < i + 40; j++) s += h[j]; a.push(lufs(s / 40)); } return a; };
  for (const [name, a, b] of phases) {
    if (!(b > a)) continue;
    const m = mom(secs(a, b, kMus)), e = mom(secs(a, b, kEng)), c = mom(secs(a, b, kCue)), o = mom(secs(a, b, kOut));
    P(`  ${name.padEnd(10)} ${f1(a)}–${f1(b)} s  momentary median: out ${f1(med(o))} | music ${f1(med(m))} | engines ${f1(med(e))} | cues ${f1(med(c))} (cues p90 ${f1(pct(c, 0.9))})`);
  }
  // music vs engine over time
  const me = mom(secs(mk.go, mk.finish, kMus)).map((x, i) => x - mom(secs(mk.go, mk.finish, kEng))[i]);
  P(`Music minus engines (momentary, race): median ${f1(med(me))} dB, p10 ${f1(pct(me, 0.1))}, p90 ${f1(pct(me, 0.9))}`);
  const gr = (a: number[]) => { const s = a.map(Math.abs); return { mean: s.reduce((x, y) => x + y, 0) / s.length, max: Math.max(...s), over3: s.filter((x) => x > 3).length / s.length, over1: s.filter((x) => x > 1).length / s.length }; };
  const gc = gr(log.grComp), gl = gr(log.grLim);
  P(`Compressor GR mean ${gc.mean.toFixed(1)} dB, max ${gc.max.toFixed(1)}, >3 dB ${(gc.over3 * 100).toFixed(0)}% of time (makeup +${f1(db(log.makeup.comp))} dB) | limiter GR mean ${gl.mean.toFixed(2)}, max ${gl.max.toFixed(1)}, >1 dB ${(gl.over1 * 100).toFixed(1)}% (makeup +${f1(db(log.makeup.lim))} dB)`);
  // spectrum, race only
  const sp = octaveBands(welch(out, FS, 8192, Math.floor(mk.go * FS), Math.floor(mk.finish * FS)));
  P(`Octave balance re 1 kHz (race):  ${OCTAVES.map((f, i) => `${f >= 1000 ? f / 1000 + 'k' : f}:${f1(sp[i])}(${f1(sp[i] - TARGET[i])})`).join(' ')}`);
  const lowX = (sp[0] + sp[1] + sp[2]) / 3 - (TARGET[0] + TARGET[1] + TARGET[2]) / 3, presX = (sp[6] - TARGET[6]);
  P(`  low (63-250) vs target ${f1(lowX)} dB; 4k octave vs target ${f1(presX)} dB`);
  for (const [n, s] of [['music', music], ['engine', engine], ['cues', cuesS]] as const) {
    const o = octaveBands(welch(s, FS, 8192, Math.floor(mk.go * FS), Math.floor(mk.finish * FS)));
    P(`  ${n.padEnd(7)} ${OCTAVES.map((f, i) => `${f >= 1000 ? f / 1000 + 'k' : f}:${f1(o[i])}`).join(' ')}`);
  }
  // engine voice: spectral centroid of the engine stem over the race, and just after each of the player's boosts
  const centroid = (a: number, b: number) => { const w = welch(engine, FS, 4096, Math.floor(a * FS), Math.floor(b * FS)); let s1 = 0, s0 = 0; for (let k = 1; k < w.p.length; k++) { const f = k * w.df; if (f > 60 && f < 8000) { s1 += f * w.p[k]; s0 += w.p[k]; } } return s0 ? s1 / s0 : NaN; };
  const boosts = log.cues.filter((c: any) => c.played && /^(boost1|boost2|boost3|boostPad|boostStart|boostTrick)$/.test(c.id)).map((c: any) => c.start);
  const ratio = boosts.map((t: number) => centroid(t + 0.02, t + 0.4) / centroid(t - 0.5, t - 0.1)).filter(Number.isFinite);
  P(`Engine voice: centroid ${centroid(mk.go, mk.finish).toFixed(0)} Hz over the race; after a boost vs before ×${(ratio.reduce((a: number, b: number) => a + b, 0) / Math.max(1, ratio.length)).toFixed(2)} (n=${ratio.length})`);
  P(`Wheel/spark layers: ${Object.entries(log.extras ?? {}).map(([k, v]: any) => `${k} ${v.seconds.toFixed(1)} s at ${v.meanDb.toFixed(1)} dBFS`).join('; ') || 'none'}`);
  const stw = stereo(out.map((c) => c.subarray(Math.floor(mk.go * FS), Math.floor(mk.finish * FS))));
  P(`Stereo (race): L/R correlation ${stw.corr.toFixed(2)}, side/mid ${f1(stw.sideMid)} dB`);

  // ---- per cue: loudest 100 ms of the cue vs the bed (music + engines) over the same 100 ms
  const bedK = new Float64Array(kMus.length), bedB = new Float64Array(kMus.length);
  const bc = bandCoefs(FS);
  const bM = hopPower(filter(music, bc), HOP), bE = hopPower(filter(engine, bc), HOP);
  for (let i = 0; i < bedK.length; i++) { bedK[i] = kMus[i] + kEng[i]; bedB[i] = bM[i] + bE[i]; }
  const s2 = M * M * g.sfx * g.sfx;
  const rows: { id: string; cls: string; t: number; lvl: number; bed: number; d: number; dBand: number }[] = [];
  let unplayed = 0;
  for (const c of log.cues) {
    if (!c.played) { unplayed++; continue; }
    const kh: number[] = c.kh.map((x: number | null) => (x ?? 0) * s2), bh: number[] = c.bh.map((x: number | null) => (x ?? 0) * s2);
    let best = -1, bi = 0;
    for (let i = 0; i < Math.max(1, kh.length - 9); i++) { let s = 0; for (let j = i; j < Math.min(kh.length, i + 10); j++) s += kh[j]; if (s > best) { best = s; bi = i; } }
    const w = Math.min(10, kh.length);
    const h0 = Math.round(c.start * 100) + bi;
    let bed = 0, bedb = 0, cb = 0;
    for (let j = 0; j < w; j++) { bed += bedK[h0 + j] ?? 0; bedb += bedB[h0 + j] ?? 0; cb += bh[bi + j] ?? 0; }
    const lvl = lufs(best / w), bl = lufs(bed / w);
    rows.push({ id: c.id, cls: c.cls, t: c.start, lvl, bed: bl, d: lvl - bl, dBand: pdb(cb / Math.max(bedb, 1e-12)) });
  }
  const buried = rows.filter((r) => r.d < -12), weak = rows.filter((r) => r.d >= -12 && r.d < -6);
  const byCls = (k: string) => rows.filter((r) => r.cls === k);
  P(`Cues: ${log.cues.length} asked, ${rows.length} played, ${unplayed} refused by caps/not played`);
  for (const k of ['player', 'rival', 'world']) { const r = byCls(k); P(`  ${k.padEnd(6)} n=${r.length}  cue-to-bed median ${f1(med(r.map((x) => x.d)))} dB (p10 ${f1(pct(r.map((x) => x.d), 0.1))}), in 1-4 kHz median ${f1(med(r.map((x) => x.dBand)))} dB; level median ${f1(med(r.map((x) => x.lvl)))} LUFS(100ms)`); }
  P(`  inaudible (<-12 dB under bed): ${buried.length} [${[...new Set(buried.map((r) => `${r.id}/${r.cls}`))].join(', ')}]`);
  P(`  weak (-12..-6 dB): ${weak.length} [${[...new Set(weak.map((r) => `${r.id}/${r.cls}`))].join(', ')}]`);
  const pl = byCls('player').filter((r) => !/^(count|go|lap|finalLap|finish|finishLow|shift|gainPlace|losePlace)$/.test(r.id));
  const ids = [...new Set(pl.map((r) => r.id))].sort();
  P(`  player gameplay cues (median cue-to-bed dB, 1-4k dB, n): ${ids.map((id) => { const r = pl.filter((x) => x.id === id); return `${id} ${f1(med(r.map((x) => x.d)))}/${f1(med(r.map((x) => x.dBand)))}/${r.length}`; }).join('; ')}`);
  const rv = byCls('rival'); const rids = [...new Set(rv.map((r) => r.id))].sort();
  P(`  rival cues: ${rids.map((id) => { const r = rv.filter((x) => x.id === id); return `${id} ${f1(med(r.map((x) => x.d)))}/${r.length}`; }).join('; ')}`);
  const stings = rows.filter((r) => /^(count|go|lap|finalLap|finish|finishLow|shift)$/.test(r.id));
  P(`  stings: ${stings.map((r) => `${r.id}@${r.t.toFixed(1)} ${f1(r.d)}dB (${f1(r.lvl)} LUFS)`).join('; ')}`);
  const txt = rep.join('\n');
  console.log(txt);
  fs.writeFileSync(`${OUT}/${TAG}-${TRACK}.report.txt`, txt + '\n');
  fs.writeFileSync(`${OUT}/${TAG}-${TRACK}.rows.json`, JSON.stringify(rows));
}, 600_000);

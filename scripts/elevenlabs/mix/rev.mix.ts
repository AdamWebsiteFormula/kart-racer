// The engine on the grid, measured without a sound (docs/sops/audio.md): the real GameAudio's engines
// (each kart's rev ticked as KartView ticks it, kart-controller rev.ts) through the offline Web Audio
// over a race's countdown and first seconds, the player's gas scripted (never pressed, held from the 2,
// held from the 3, tapped, let off after a rev). Per scenario it writes the stems as WAV (<TAG>-<name>-
// mine: the player's engine loops; -rivals; -pops: the engines' pops; -cues) and, in <TAG>-rev.json,
// every 100 ms of the player's engine: its level, the loops' playback rate and the rpm it stands for
// (the pitch the graph plays at), the spectral centroid, the rivals' and the pops' level. Nothing plays.
//   ./node_modules/.bin/vitest run --config scripts/elevenlabs/mix/vitest.config.mts rev
// TRACK, PLAYER, TAG and MIX_OUT as render.mix.ts; SCENARIOS=idle,held2 picks some; NOREV=1 leaves the revs out (the engines follow the speed alone, as before 26 Sept 2026).
import { it } from 'vitest';
import fs from 'node:fs';
import { OUT, ROOT, wavFor } from './paths.ts';
import { OfflineCtx, setTag, writeWav, QUANTUM, type Node } from './webaudio.ts';
import { AiDriver } from '../../../src/ai-driver/index.ts';
import { simTick, type SimParts } from '../../../src/game/simtick.ts';
import { Items } from '../../../src/items/items.ts';
import { SIM_DT } from '../../../src/kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type Vec3 } from '../../../src/kart-controller/types.ts';
import { makeConstants } from '../../../src/kart-controller/constants.ts';
import { EngineRev } from '../../../src/kart-controller/rev.ts';
import { GO_TICK, RaceManager } from '../../../src/race-manager/index.ts';
import type { RaceConfig } from '../../../src/race-manager/types.ts';
import { buildTrack } from '../../../src/track-builder/track.ts';
import { CAST } from '../../../src/ui-hud/data/cast.ts';
import { GameAudio } from '../../../src/audio/audio.ts';
import { AudioBus } from '../../../src/audio/bus.ts';
import { finishLine, type Listener } from '../../../src/audio/director.ts';
import { songForTrack } from '../../../src/audio/music/patterns.ts';
import { ENGINE_BANDS, SampleBank } from '../../../src/audio/samples.ts';

const TRACK = process.env.TRACK ?? 'harbour-loop';
const PLAYER = process.env.PLAYER ?? 'pip';
const TAG = process.env.TAG ?? 'rev';
const FS = 44100;
const GO = GO_TICK * SIM_DT;
const AFTER = 3;

/** The player's gas at `t` seconds from the countdown's start (GO at 3 s): 0..1. */
type Gas = (t: number) => number;
const on = (spans: [number, number][]): Gas => (t) => (spans.some(([a, b]) => t >= a && t < b) ? 1 : 0);
const SCENARIOS: Record<string, Gas> = {
  /** no gas on the grid; away 0.3 s after the go */
  idle: on([[GO + 0.3, 99]]),
  /** held from the 2 (the start boost) */
  held2: on([[1.0, 99]]),
  /** held from the 3: too early, no boost */
  held3: on([[0.05, 99]]),
  /** four taps on the grid, then held 0.4 s before the go (too late for the boost) */
  taps: on([[0.4, 0.55], [1.0, 1.12], [1.5, 1.7], [2.1, 2.2], [2.6, 99]]),
  /** revved, let off at 1.6 s (a pop), back on 0.6 s before the go */
  letoff: on([[0.3, 1.6], [2.4, 99]]),
};

const handlers: Record<string, (() => void)[]> = {};
(globalThis as any).addEventListener = (ev: string, f: () => void) => { (handlers[ev] ??= []).push(f); };
(globalThis as any).document = { hidden: false };
const manifest = JSON.parse(fs.readFileSync(`${ROOT}public/audio/manifest.json`, 'utf8'));
const fakeFetch = async (url: string) => {
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => manifest };
  const f = wavFor(url.replace(/^\//, ''));
  if (!f) return { ok: false };
  const b = fs.readFileSync(f);
  return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};

/** In-place radix-2 FFT (re, im of length a power of two). */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], xr = re[i + k + len / 2], xi = im[i + k + len / 2];
        const vr = xr * cr - xi * ci, vi = xr * ci + xi * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** RMS in dBFS and the spectral centroid (Hz, 60 Hz to 8 kHz) of `x` (mono) from `a` for `n` samples. */
function measure(x: Float32Array, a: number, n: number): { db: number; centroid: number } {
  const N = 4096, re = new Float64Array(N), im = new Float64Array(N);
  let p = 0;
  for (let i = 0; i < n; i++) p += x[a + i] * x[a + i];
  for (let i = 0; i < N && i < n; i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (Math.min(N, n) - 1)));
  fft(re, im);
  let num = 0, den = 0;
  for (let k = Math.ceil((60 * N) / FS); k < (8000 * N) / FS; k++) { const m = Math.hypot(re[k], im[k]); num += m * (k * FS) / N; den += m; }
  return { db: 10 * Math.log10(p / n + 1e-12), centroid: den > 0 ? num / den : 0 };
}

it(`rev ${TRACK}`, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const def = JSON.parse(fs.readFileSync(`${ROOT}src/track-builder/tracks/${TRACK}.json`, 'utf8'));
  const cast = [...CAST.filter((c) => c.id === PLAYER), ...CAST.filter((c) => c.id !== PLAYER)];
  const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed: 11, racers: cast.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === PLAYER })) };
  const track = buildTrack(def);
  const pick = process.env.SCENARIOS?.split(',') ?? Object.keys(SCENARIOS);
  const report: Record<string, unknown> = {};
  for (const name of pick) {
    const gas = SCENARIOS[name];
    const manager = new RaceManager(track, config);
    const items = new Items(track, manager);
    const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
    const pi = manager.playerIndex, st = manager.state;
    const parts: SimParts = { manager, items, ai, inputs: st.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: pi, playerSlot: { ...NEUTRAL_INPUT } };
    const topSpeed = makeConstants(config.racers[pi].archetype, 150).topSpeed;
    // each kart's engine rev, ticked as the game's views tick it (KartView.onTick; game/session.ts)
    const revs = st.karts.map((_, i) => new EngineRev(makeConstants(config.racers[i].archetype, 150)));
    const ear: Vec3 = [0, 0, 0];
    const l: Listener = { playerId: PLAYER, position: ear, heading: 0, positionOf: (id) => st.karts.find((k) => k.racerId === id)?.position };
    for (const k of Object.keys(handlers)) delete handlers[k];
    const Ctor = class extends OfflineCtx { constructor() { super(FS); } };
    const bus = new AudioBus(Ctor as any);
    const bank = new SampleBank('/', fakeFetch as any);
    const audio = new GameAudio(bus, bank);
    audio.setVolumes({ master: 0.8, music: 0.7, sfx: 0.8 });
    handlers.keydown[0]();
    const ctx = bus.ctx as unknown as OfflineCtx;
    await bank.load(ctx as any);
    // the song stays out of it: only the engines and the cues are wanted here
    audio.newRace(songForTrack(def.id), def.id, st.trackers[pi].shownRank, finishLine(config), true);
    const seconds = GO + AFTER, maxQ = Math.ceil((seconds * FS) / QUANTUM), N = maxQ * QUANTUM;
    // stems: the player's engine loops, the rivals' loops, the engines' pops (and any wheel loop), everything else
    const mine = new Float32Array(N), rivals = new Float32Array(N), pops = new Float32Array(N), cues = new Float32Array(N);
    let q = 0;
    (bus.sfx as unknown as Node).onInput = (from, b) => {
      const o = q * QUANTUM, lp = (audio as any).loopPlayer, ais: any[] = (audio as any).loopAi ?? [];
      const dst = from.tag !== 'engine' ? cues : lp && from === lp.lp ? mine : ais.some((v) => from === v.pan || from === v.lp) ? rivals : pops;
      for (let c = 0; c < b.length; c++) for (let i = 0; i < QUANTUM; i++) dst[o + i] += b[c][i] / b.length;
    };
    const rates: number[] = [], gains: number[] = [], rpms: number[] = [];
    const input: InputState = { ...NEUTRAL_INPUT };
    for (let tick = 0; q < maxQ; tick++) {
      const t = tick * SIM_DT;
      input.throttle = gas(t);
      simTick(parts, input);
      for (let i = 0; i < revs.length; i++) revs[i].tick(st.karts[i], parts.inputs[i], SIM_DT, st.goTick - (st.tick - 1));
      const k = st.karts[pi];
      ear[0] = k.position[0] - Math.sin(k.heading) * 6; ear[1] = k.position[1]; ear[2] = k.position[2] - Math.cos(k.heading) * 6;
      l.heading = k.heading;
      if (tick % 2 === 0) {
        setTag('engine');
        audio.engines(k, parts.inputs[pi].throttle, topSpeed, st.karts, l, true, process.env.NOREV ? undefined : revs);
        setTag('misc');
      }
      while (q * QUANTUM < (tick + 1) * SIM_DT * FS && q < maxQ) { ctx.renderQuantum(); q++; }
      // the loops' pitch as the graph plays it: each band's playback rate, weighted by its gain, and the rpm
      // that stands for (each loop's recorded rpm, ENGINE_BANDS, times its rate: the class pitch included)
      const lp = (audio as any).loopPlayer;
      if (lp) {
        let w = 0, r = 0, m = 0;
        for (const b of lp.bands) { const g = b.g.gain.value; w += g; r += g * b.src.playbackRate.value; m += g * b.src.playbackRate.value * ENGINE_BANDS[b.band]; }
        rates[tick] = w > 0 ? r / w : 0;
        rpms[tick] = w > 0 ? m / w : 0;
        gains[tick] = lp.out.gain.value;
      }
    }
    clearInterval((audio as any).timer);
    writeWav(`${OUT}/${TAG}-${name}-mine.wav`, [mine], FS, fs);
    writeWav(`${OUT}/${TAG}-${name}-rivals.wav`, [rivals], FS, fs);
    writeWav(`${OUT}/${TAG}-${name}-pops.wav`, [pops], FS, fs);
    writeWav(`${OUT}/${TAG}-${name}-cues.wav`, [cues], FS, fs);
    const rows: { t: number; db: number; centroid: number; rate: number; rpm: number; gain: number; rivals: number; pops: number }[] = [];
    const W = Math.round(0.1 * FS);
    for (let a = 0; a + W <= N; a += W) {
      const t = a / FS, m = measure(mine, a, W), tick = Math.min(rates.length - 1, Math.round((t + 0.05) / SIM_DT));
      rows.push({ t: +t.toFixed(1), db: +m.db.toFixed(1), centroid: Math.round(m.centroid), rate: +(rates[tick] ?? 0).toFixed(3), rpm: Math.round(rpms[tick] ?? 0), gain: +(gains[tick] ?? 0).toFixed(3), rivals: +measure(rivals, a, W).db.toFixed(1), pops: +measure(pops, a, W).db.toFixed(1) });
    }
    report[name] = rows;
  }
  fs.writeFileSync(`${OUT}/${TAG}-rev.json`, JSON.stringify(report));
}, 1_800_000);

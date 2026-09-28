// The live engine (28 Sept 2026): its core fires at the rpm, crossfades its pools as it climbs, coasts darker, cuts
// its spark at the limiter; its grain table splits back into pools whatever delay a decoder adds; the bank loads the
// table only when the manifest names it. Nothing is played: the core renders into arrays.
import { describe, expect, it } from 'vitest';
import { GrainEngine, LIVE_ENGINE, type GrainPool } from './engineCore.ts';
import { splitGrains, type GrainMap } from './liveEngine.ts';
import { SampleBank } from './samples.ts';

const SR = 48000;
/** a pool of grains, each a sharp decaying pulse ringing at `hz` (a firing) */
function pool(rate: number, hz: number, n = 6, len = 0.06): GrainPool {
  const grains = Array.from({ length: n }, (_, k) => Float32Array.from({ length: Math.round(len * SR) }, (_, i) => Math.exp(-i / (0.004 * SR)) * Math.sin((2 * Math.PI * hz * i) / SR) * (1 + 0.05 * k)));
  return { rate, sampleRate: SR, grains };
}
const IDLE = pool(15, 300), REV = pool(37, 900);

function render(e: GrainEngine, seconds: number, p: { rpm: number; load: number; limit: number; size: number }): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let a = 0; a < out.length; a += 128) e.render(out, a, Math.min(128, out.length - a), p);
  return out;
}
/** firings a second: onsets of the 1 ms envelope rising through a quarter of its peak */
function firings(x: Float32Array): number {
  const hop = SR / 1000, env: number[] = [];
  for (let a = 0; a + hop <= x.length; a += hop) { let s = 0; for (let i = a; i < a + hop; i++) s = Math.max(s, Math.abs(x[i])); env.push(s); }
  const top = Math.max(...env), th = top * 0.25;
  let n = 0;
  for (let i = 1; i < env.length; i++) if (env[i] >= th && env[i - 1] < th) n++;
  return n / (x.length / SR);
}
/** where the energy sits: the zero-crossing rate, Hz */
const zcr = (x: Float32Array) => { let z = 0; for (let i = 1; i < x.length; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) z++; return (z / 2) / (x.length / SR); };

describe('the live engine core', () => {
  it('fires rpm / 60 times a second, whatever the rpm, and renders the same engine for the same seed', () => {
    for (const rpm of [1400, 3000, 6600]) {
      const x = render(new GrainEngine([IDLE, REV], SR, 7), 2, { rpm, load: 1, limit: 0, size: 1 });
      expect(firings(x), `${rpm} rpm`).toBeGreaterThan((rpm / 60) * 0.85);
      expect(firings(x), `${rpm} rpm`).toBeLessThan((rpm / 60) * 1.15);
      for (const v of x) expect(Number.isFinite(v)).toBe(true);
    }
    const a = render(new GrainEngine([IDLE, REV], SR, 7), 0.5, { rpm: 4000, load: 1, limit: 0, size: 1 });
    const b = render(new GrainEngine([IDLE, REV], SR, 7), 0.5, { rpm: 4000, load: 1, limit: 0, size: 1 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('plays the idle firings at idle and the held rev\'s once it climbs (their resonances stay put: 300 Hz, then 900 Hz)', () => {
    const idle = render(new GrainEngine([IDLE, REV], SR, 3), 1, { rpm: 1400, load: 1, limit: 0, size: 1 });
    const high = render(new GrainEngine([IDLE, REV], SR, 3), 1, { rpm: 6000, load: 1, limit: 0, size: 1 });
    expect(zcr(idle)).toBeLessThan(450);
    expect(zcr(high)).toBeGreaterThan(700);
    // a smaller engine (a light kart) reads its firings faster: brighter at the same rpm
    const small = render(new GrainEngine([IDLE, REV], SR, 3), 1, { rpm: 1400, load: 1, limit: 0, size: 1.3 });
    expect(zcr(small)).toBeGreaterThan(zcr(idle) * 1.15);
  });

  it('coasts darker and softer off the gas, and cuts its spark at the limiter', () => {
    const pull = render(new GrainEngine([REV], SR, 5), 1, { rpm: 5000, load: 1, limit: 0, size: 1 });
    const coast = render(new GrainEngine([REV], SR, 5), 1, { rpm: 5000, load: 0, limit: 0, size: 1 });
    const rms = (x: Float32Array) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
    expect(rms(coast)).toBeLessThan(rms(pull) * 0.6);
    const limited = render(new GrainEngine([REV], SR, 5), 1, { rpm: 5000, load: 1, limit: 1, size: 1 });
    expect(firings(limited)).toBeLessThan(firings(pull) * 0.7);
    expect(LIVE_ENGINE.limitHz).toBe(11);
  });

  it('never rings more than eight firings at once, even at a screaming rpm', () => {
    const e = new GrainEngine([IDLE, REV], SR, 9);
    render(e, 0.5, { rpm: 20000, load: 1, limit: 0, size: 0.25 });
    expect(e.voices).toBeLessThanOrEqual(8);
  });
});

describe('the grain table', () => {
  // a table of 4 grains in two pools, 20 ms of silence between them, at 32 kHz
  const RATE = 32000;
  const map: GrainMap = { sampleRate: RATE, gap: 0.02, gain: 0.5, pools: [{ name: 'idle', rate: 15, grains: [[640, 3200], [4480, 3200]] }, { name: 'rev', rate: 37, grains: [[8320, 1600], [10560, 1600]] }] };
  const table = new Float32Array(12800);
  for (const p of map.pools) for (const [s, len] of p.grains) for (let i = 0; i < len; i++) table[s + i] = 0.5 * Math.sin(i / 3) * Math.exp(-i / 800);

  it('splits back into its pools, at the table\'s level undone', () => {
    const pools = splitGrains(table, RATE, map);
    expect(pools.map((p) => [p.rate, p.grains.length])).toEqual([[15, 2], [37, 2]]);
    expect(pools[0].grains[0].length).toBe(3200);
    expect(pools[0].grains[0][10]).toBeCloseTo(table[640 + 10] / 0.5, 6);
  });

  it('finds each grain again when a decoder adds delay in front (an MP3\'s encoder delay) and resamples', () => {
    const delayed = new Float32Array(table.length + 1057);
    delayed.set(table, 1057);
    const pools = splitGrains(delayed, RATE, map);
    // within a millisecond of the true start
    const g = pools[1].grains[0];
    let best = 0, err = 0;
    for (let d = -40; d <= 40; d++) { let c = 0; for (let i = 0; i < 400; i++) c += g[i] * (table[8320 + i + d] ?? 0); if (c > best) { best = c; err = d; } }
    expect(Math.abs(err)).toBeLessThanOrEqual(32);
    // at another rate, the grains come at that rate
    const up = new Float32Array(table.length * 1.5);
    for (let i = 0; i < up.length; i++) up[i] = table[Math.floor(i / 1.5)] ?? 0;
    const pools48 = splitGrains(up, 48000, map);
    expect(pools48[0].sampleRate).toBe(48000);
    expect(pools48[0].grains[0].length).toBe(4800);
  });

  it('the bank loads the table only when the manifest names it', async () => {
    const data = new Float32Array(table);
    const buffer = { duration: data.length / RATE, sampleRate: RATE, numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer;
    const ctx = { decodeAudioData: async () => buffer } as unknown as BaseAudioContext;
    const plain = new SampleBank('/', (async () => ({ ok: true, json: async () => ({ sfx: {}, music: {} }) })) as unknown as typeof fetch);
    await plain.load(ctx);
    expect(plain.livePools()).toBeNull();
    const manifest = { sfx: {}, music: {}, engine: { grains: 'audio/engine-grains.mp3', map: 'audio/engine-grains.json' } };
    const f = (async (u: string) => ({ ok: true, json: async () => (String(u).endsWith('engine-grains.json') ? map : manifest), arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
    const bank = new SampleBank('/', f);
    await bank.load(ctx);
    expect(bank.livePools()?.map((p) => p.grains.length)).toEqual([2, 2]);
  });
});

import { describe, expect, it } from 'vitest';
import { AUDIO } from './constants.ts';
import { direct, resetDirector, type Listener } from './director.ts';
import {
  bandRate, bandWeights, barLength, ENGINE_BANDS, envelope, FANFARE_SECONDS, leadIn, levelGain, loopPoints, meanRms,
  mixLevel, onsets, peakRms, RACE_THEME, SampleBank, SongPlayer, themeForTrack, type Sample,
} from './samples.ts';
import { PATCHES } from './sfx.ts';

const HOP = 0.01;

/** An envelope (10 ms hops) of a beat: a spike on every beat, a bigger one on each downbeat, a fade at the end. */
function beatEnv(bpm: number, seconds: number, opts: { silence?: number; fadeFrom?: number } = {}): Float32Array {
  const n = Math.round(seconds / HOP), env = new Float32Array(n);
  const beat = 60 / bpm, t0 = opts.silence ?? 0;
  for (let i = 0; i < n; i++) {
    const t = i * HOP;
    if (t < t0) continue;
    const b = (t - t0) / beat, phase = b - Math.floor(b);
    env[i] = 0.2 + (phase < 0.05 ? (Math.floor(b) % 4 === 0 ? 0.6 : 0.3) : 0);
    if (opts.fadeFrom !== undefined && t > opts.fadeFrom) env[i] *= Math.max(0, 1 - (t - opts.fadeFrom) / 3);
  }
  return env;
}

describe('sample analysis', () => {
  it('measures level, lead-in silence and the loudest moment', () => {
    const rate = 1000, ch = new Float32Array(1000);
    for (let i = 100; i < 1000; i++) ch[i] = i % 2 ? 0.5 : -0.5;
    expect(leadIn([ch], rate)).toBeCloseTo(0.096, 3);
    const env = envelope([ch], rate);
    expect(env.length).toBe(100);
    expect(env[50]).toBeCloseTo(0.5, 5);
    expect(meanRms(env)).toBeCloseTo(0.5 * Math.sqrt(0.9), 3);
    const spike = new Float32Array(100).fill(0.05);
    spike.fill(0.8, 40, 45);
    expect(peakRms(spike)).toBeCloseTo(0.8, 3);
  });

  it('levels never blow up near-silence; the mix puts big moments over frequent ones', () => {
    expect(levelGain(0.1, 0.2)).toBeCloseTo(2);
    expect(levelGain(0.001, 0.2)).toBe(6);
    expect(levelGain(0, 0.2)).toBe(1);
    expect(mixLevel('uiMove')).toBeLessThan(mixLevel('finish'));
    expect(mixLevel('boost1')).toBeLessThan(mixLevel('boost3'));
    for (const id of Object.keys(PATCHES)) { expect(mixLevel(id), id).toBeGreaterThanOrEqual(0.45); expect(mixLevel(id), id).toBeLessThanOrEqual(1.2); }
  });

  it('finds the real bar length when the song drifts from the tempo it was asked for', () => {
    const env = beatEnv(146, 60);
    expect(barLength(onsets(env), 150)).toBeCloseTo(240 / 146, 2);
    // too short to measure: the asked-for bar
    expect(barLength(onsets(beatEnv(150, 5)), 150)).toBeCloseTo(1.6, 5);
  });

  it('loops on a whole phrase before the fade, starting on the first beat', () => {
    const env = beatEnv(150, 40, { silence: 0.5, fadeFrom: 36 });
    const { start, end, bar } = loopPoints(env, 150);
    expect(start).toBeCloseTo(0.5, 1);
    expect(bar).toBeCloseTo(1.6, 2);
    const bars = (end - start) / bar;
    expect(Math.abs(bars - Math.round(bars))).toBeLessThan(0.03);
    expect(Math.round(bars) % 4).toBe(0);
    expect(end).toBeLessThanOrEqual(36);
    expect(end).toBeGreaterThan(30);
  });

  it('crossfades the engine loops at equal power and keeps rates sane', () => {
    for (let rpm = 0; rpm <= 8000; rpm += 250) {
      const w = bandWeights(rpm);
      expect(w[0] ** 2 + w[1] ** 2 + w[2] ** 2).toBeCloseTo(1, 5);
      for (let b = 0; b < 3; b++) { expect(bandRate(rpm, b)).toBeGreaterThanOrEqual(0.5); expect(bandRate(rpm, b)).toBeLessThanOrEqual(2); }
    }
    expect(bandWeights(AUDIO.idleRpm)).toEqual([1, 0, 0]);
    expect(bandWeights(ENGINE_BANDS[1])[1]).toBeCloseTo(1, 5);
    expect(bandRate(ENGINE_BANDS[2], 2)).toBe(1);
  });
});

describe('music map', () => {
  it('every track has a race theme, and the cup finales share one (design §11)', () => {
    const files = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, { id: string }>;
    const ids = Object.values(files).map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) expect(RACE_THEME[id], id).toBeDefined();
    expect(themeForTrack('canyon-rush')).toBe(themeForTrack('skyline-circuit'));
    expect(new Set(Object.values(RACE_THEME)).size).toBe(5);
    expect(themeForTrack('no-such-track')).toBe('race-harbour');
  });

  it('the shipped manifest has a recording for every sound and song the game asks for', async () => {
    const fs = (await import('node:fs' as string)) as { existsSync(p: URL): boolean; readFileSync(p: URL, enc: 'utf8'): string };
    const path = new URL('../../public/audio/manifest.json', import.meta.url);
    if (!fs.existsSync(path)) return; // a checkout without recordings plays the synth
    const m = JSON.parse(fs.readFileSync(path, 'utf8')) as { sfx: Record<string, { url: string }>; music: Record<string, { url: string }> };
    for (const id of Object.keys(PATCHES)) expect(m.sfx[id], id).toBeDefined();
    for (const id of ['engine-idle', 'engine-mid', 'engine-high', 'drift']) expect(m.sfx[id], id).toBeDefined();
    for (const key of [...new Set(Object.values(RACE_THEME)), 'title', 'results']) expect(m.music[key], key).toBeDefined();
    for (const e of [...Object.values(m.sfx), ...Object.values(m.music)]) expect(fs.existsSync(new URL(`../../public/${e.url}`, import.meta.url)), e.url).toBe(true);
  });
});

describe('hit yelps', () => {
  it('a hit racer yelps in their own voice; strangers do not', () => {
    resetDirector();
    const l: Listener = { playerId: 'pip', position: [0, 0, 0], heading: 0, positionOf: () => [0, 0, 0] };
    const hit = (id: string) => ({ type: 'hit' as const, racerId: id, byRacerId: 'x', itemId: 'beachBall', spun: true, coinsLost: 0 });
    expect(direct([], [hit('pip'), hit('boulder'), hit('ghost')], l).cues.map((c) => c.sfx)).toEqual(['spin', 'yelp:pip', 'spin', 'yelp:boulder', 'spin']);
  });
});

// ---------------------------------------------------------------- players, on a fake audio clock

interface FakeSource { buffer: unknown; loop: boolean; playbackRate: { value: number }; startedAt?: number; offset?: number; stoppedAt?: number }
function fakeCtx() {
  const sources: FakeSource[] = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect: (n: unknown) => n });
  const ctx = {
    sources,
    createBufferSource() {
      const s: FakeSource & ReturnType<typeof node> & { start(w: number, o?: number): void; stop(w: number): void } = {
        ...node(), buffer: null, loop: false, playbackRate: { ...param(), value: 1 },
        start(w, o) { s.startedAt = w; s.offset = o; }, stop(w) { s.stoppedAt = w; },
      };
      sources.push(s);
      return s;
    },
    createGain: () => ({ ...node(), gain: param() }),
  };
  return ctx;
}

describe('song player', () => {
  const song: Sample = { buffer: { duration: 40 } as AudioBuffer, start: 0.5, end: 32.5, gain: 1 };

  it('loops on the audio clock and comes back faster after the final-lap fanfare', () => {
    const ctx = fakeCtx();
    const p = new SongPlayer(ctx as unknown as BaseAudioContext, {} as AudioNode);
    p.start(song, 1);
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0].startedAt).toBe(1);
    expect(ctx.sources[0].offset).toBe(0.5);
    p.pump(10);
    expect(ctx.sources).toHaveLength(1); // not due yet
    p.pump(32.8); // the loop end is at 1 + 32 = 33
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources[1].startedAt).toBeCloseTo(33, 6);
    expect(ctx.sources[1].offset).toBe(0.5);
    expect(ctx.sources[0].stoppedAt).toBeGreaterThan(33); // the old pass rings on a moment
    p.pump(33.1);
    expect(ctx.sources).toHaveLength(2); // booked once
    p.lift(40);
    expect(ctx.sources[1].stoppedAt).toBeLessThan(40.5);
    expect(ctx.sources).toHaveLength(3);
    expect(ctx.sources[2].startedAt).toBeCloseTo(40 + FANFARE_SECONDS, 6);
    expect(ctx.sources[2].playbackRate.value).toBe(AUDIO.liftTempo);
    // the faster pass is shorter in real time
    p.pump(40 + FANFARE_SECONDS + 32 / AUDIO.liftTempo - 0.1);
    expect(ctx.sources[3].startedAt).toBeCloseTo(40 + FANFARE_SECONDS + 32 / AUDIO.liftTempo, 6);
    p.stop(80);
    p.pump(200);
    expect(ctx.sources).toHaveLength(4);
  });
});

describe('sample bank', () => {
  it('fails soft with no manifest and decodes what the manifest lists', async () => {
    const offline = new SampleBank('/', (() => Promise.reject(new Error('offline'))) as typeof fetch);
    await offline.load({} as BaseAudioContext);
    expect(offline.hasSong('title')).toBe(false);
    expect(offline.get('go')).toBeUndefined();

    const manifest = { sfx: { go: { url: 'audio/sfx/go.mp3' }, 'engine-mid': { url: 'audio/sfx/engine-mid.mp3', loop: true } }, music: { title: { url: 'audio/music/title.mp3', bpm: 128 } } };
    const f = (async (u: string) => ({ ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(8), url: u })) as unknown as typeof fetch;
    const data = new Float32Array(4410);
    data.fill(0.4, 441);
    const buffer = { duration: 0.1, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer;
    const ctx = { decodeAudioData: async () => buffer } as unknown as BaseAudioContext;
    const bank = new SampleBank('/', f);
    let ready = 0;
    bank.onLoaded = () => ready++;
    await bank.load(ctx);
    await bank.load(ctx);
    expect(ready).toBe(1);
    expect(bank.hasSong('title')).toBe(true);
    expect(bank.get('go')!.start).toBeCloseTo(0.006, 3); // the 10 ms of silence is skipped, less pre-roll
    expect(bank.get('go')!.gain).toBeCloseTo(0.2 / 0.4, 3);
    expect(bank.get('engine-mid')!.start).toBe(0); // loops play whole
    expect(await bank.song(ctx, 'nope')).toBeNull();
  });
});

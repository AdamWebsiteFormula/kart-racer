import { describe, expect, it } from 'vitest';
import { AUDIO } from './constants.ts';
import { direct, resetDirector, type Listener } from './director.ts';
import {
  bakeLoop, bandRate, bandWeights, barLength, cutSfx, ENGINE_BANDS, envelope, FANFARE_SECONDS, kWeight, leadIn, LEVELS, levelGain, loopPhase, loopPoints, meanRms,
  evenLoop, cutDb, mixDb, mixLevel, onset, onsets, peakRms, peakSafe, RACE_THEME, removeDc, samplePeak, SampleBank, SFX_TIERS, sfxTier, shapeEdges, SONG_TIER, songLevel, SongPlayer, STING_SECONDS, themeForTrack, TIGHT, type Sample,
} from './samples.ts';
import { LoadQueue } from '../performance/loadQueue.ts';
import MANIFEST from '../../public/audio/manifest.json';
import { engineCutoff, OFFROAD_BY_TRACK, racerPitch, ROAD_BY_TRACK } from './engine.ts';
import { PATCHES } from './sfx.ts';
import { LYRIA_SONGS, MOMENT, SFX, sfxBody, SONG_MOMENT, songBody, SONGS } from '../../scripts/elevenlabs/catalog.ts';

const HOP = 0.01;
/** the loops the wheels can ask for (engine.ts wheelSound, sparkLayer) */
const LOOPS_UNDER_WHEELS = [...new Set([...Object.values(OFFROAD_BY_TRACK), ...Object.values(ROAD_BY_TRACK), 'road-ice', 'rail-grind', 'sparks'])];

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
    // nothing set so far back it vanishes, nothing pushed so far up it pumps the limiter
    for (const id of Object.keys(PATCHES)) { expect(mixDb(id), id).toBeGreaterThanOrEqual(-8); expect(mixDb(id), id).toBeLessThanOrEqual(1); }
    expect(mixLevel('go')).toBeCloseTo(Math.pow(10, 1 / 20), 6);
  });

  it('no recording is levelled past the peak ceiling: a quiet average with a loud click is held down', () => {
    expect(samplePeak([Float32Array.from([0.1, -0.5]), Float32Array.from([0.3, 0])])).toBe(0.5);
    expect(peakSafe(6, 0.5)).toBeCloseTo(AUDIO.peakCeiling / 0.5);
    expect(peakSafe(0.8, 0.5)).toBe(0.8);
    expect(peakSafe(2, 0)).toBe(2);
    // a sound whose loudest 50 ms is quiet but whose one sample peaks high (the old drop: × 1.58 over full scale)
    const rate = 1000, d = new Float32Array(1000).fill(0.02);
    d[500] = 0.8;
    const s = cutSfx({ duration: 1, sampleRate: rate, numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer, false);
    expect(s.gain * samplePeak([d])).toBeLessThanOrEqual(AUDIO.peakCeiling + 1e-9);
  });

  it('K-weighting hears as the loudness meters do: +0.7 dB at 1 kHz, +4 dB up top, the deep bass cut', () => {
    const rate = 44100, rms = (x: Float32Array) => Math.sqrt(x.subarray(rate >> 1).reduce((a, v) => a + v * v, 0) / (x.length - (rate >> 1)));
    const tone = (hz: number) => Float32Array.from({ length: rate }, (_, i) => Math.sin((2 * Math.PI * hz * i) / rate));
    const gainAt = (hz: number) => 20 * Math.log10(rms(kWeight([tone(hz)], rate)[0]) / rms(tone(hz)));
    expect(gainAt(1000)).toBeCloseTo(0.7, 0);
    expect(gainAt(10000)).toBeGreaterThan(3.5);
    expect(gainAt(10000)).toBeLessThan(4.5);
    expect(gainAt(25)).toBeLessThan(-3);
    // a sample rate too low for the shelf still measures (the tests' 1 kHz buffers)
    expect(kWeight([tone(50)], 1000)[0].length).toBe(rate);
  });

  it('two sounds of equal RMS: the bright one is heard louder, so it is levelled lower', () => {
    const rate = 44100, n = rate / 2;
    const mk = (hz: number) => { const d = Float32Array.from({ length: n }, (_, i) => 0.3 * Math.sin((2 * Math.PI * hz * i) / rate)); return { duration: 0.5, sampleRate: rate, numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer; };
    const low = cutSfx(mk(150), false), high = cutSfx(mk(5000), false);
    expect(20 * Math.log10(low.gain / high.gain)).toBeGreaterThan(3);
    // a quiet copy of a sound comes up to the same level as a loud one
    const q = (k: number) => { const d = Float32Array.from({ length: n }, (_, i) => k * Math.sin((2 * Math.PI * 800 * i) / rate)); return cutSfx({ duration: 0.5, sampleRate: rate, numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer, false).gain * k; };
    expect(q(0.1)).toBeCloseTo(q(0.4), 4);
  });

  it('cuts to the sound: a soft lead-in is skipped for a thud, kept for a swell; DC goes', () => {
    const rate = 10000, d = new Float32Array(3000);
    for (let i = 0; i < 1000; i++) d[i] = (i % 2 ? 1 : -1) * 0.02; // scrape noise, 34 dB under the thud
    for (let i = 1000; i < 3000; i++) d[i] = (i % 2 ? 1 : -1) * 1;
    expect(onset([d], rate, -36)).toBeCloseTo(0, 3);
    expect(onset([d], rate, -20)).toBeCloseTo(0.1 - 0.003, 4);
    expect(TIGHT.has('bump') && !TIGHT.has('shift')).toBe(true);
    // the boosts surge at once: cut closest of all; a swell (the Final Lap Shift) keeps its build
    expect(cutDb('boost3')).toBe(-12);
    expect(cutDb('bump')).toBe(-20);
    expect(cutDb('shift')).toBe(-36);
    const swell = Float32Array.from({ length: 3000 }, (_, i) => (i % 2 ? 1 : -1) * Math.min(1, Math.pow(10, (-30 + (30 * i) / 2000) / 20)));
    expect(onset([swell], rate, cutDb('boost3'))).toBeGreaterThan(onset([swell], rate, cutDb('bump')));
    const off = Float32Array.from({ length: 100 }, (_, i) => 0.05 + (i % 2 ? 0.1 : -0.1));
    removeDc([off]);
    expect(off.reduce((a, v) => a + v, 0)).toBeCloseTo(0, 5);
  });

  it('shapes the edges: no click in, the trailing silence cut, a clipped-off tail faded long', () => {
    const rate = 10000;
    const quietEnd = Float32Array.from({ length: 3000 }, (_, i) => (i < 2000 ? Math.sin(i) * Math.exp(-i / 200) : 0));
    const end = shapeEdges([quietEnd], rate, 0);
    expect(end).toBeLessThan(0.2); // the decay reaches −60 dB well before the file ends
    expect(Math.abs(quietEnd[0])).toBe(0);
    const loudEnd = Float32Array.from({ length: 3000 }, (_, i) => Math.sin(i));
    expect(shapeEdges([loudEnd], rate, 0.01)).toBeCloseTo(0.3, 3);
    expect(Math.abs(loudEnd[2999])).toBe(0);
    // the long fade: 50 ms from the end it is still well under full level
    const k = 2999 - 500;
    expect(Math.abs(loudEnd[k]) / Math.max(1e-9, Math.abs(Math.sin(k)))).toBeLessThan(0.9);
    // before the cut start nothing is touched; the first sample after is faded from zero
    expect(loudEnd[50]).toBeCloseTo(Math.sin(50), 6);
    expect(Math.abs(loudEnd[100])).toBe(0);
  });

  it('evens a loop that swells: a 12 dB swing between seconds comes to a few dB; a steady loop is untouched', () => {
    const rate = 8000, n = 32000;
    // loud and quiet seconds, as a crunchy recording swells and dips
    const d = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.9) * (Math.floor(i / 8000) % 2 ? 1 : 0.25));
    // the level in the middle of each second (away from the steps)
    const mids = (x: Float32Array) => [0, 1, 2, 3].map((k) => Math.sqrt(x.subarray(k * 8000 + 3000, k * 8000 + 5000).reduce((a, v) => a + v * v, 0) / 2000));
    const swing = (x: Float32Array) => { const m = mids(x); return 20 * Math.log10(Math.max(...m) / Math.min(...m)); };
    expect(swing(d)).toBeCloseTo(12, 0);
    evenLoop([d], rate);
    expect(swing(d)).toBeLessThan(5);
    // the gain curve is read round the loop: the wrap is no bigger a step than any other
    let seam = 0;
    for (let i = 1; i < n; i++) seam = Math.max(seam, Math.abs(d[i] - d[i - 1]));
    expect(Math.abs(d[0] - d[n - 1])).toBeLessThanOrEqual(seam + 1e-6);
    // a steady loop (an engine lope of a few tenths of a dB) is left exactly as it was
    const steady = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.9) * (1 + 0.05 * Math.sin(i / 200)));
    const copy = steady.slice();
    evenLoop([steady], rate);
    expect(steady).toEqual(copy);
  });

  it('reads a song level from four stretches of its loop: the same as the whole to a quarter of a dB', () => {
    const rate = 8000, n = 60 * rate;
    // a groove whose level wanders a little bar to bar, as a song does
    const d = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.37) * (0.3 + 0.05 * Math.sin(i / 9000)));
    const whole = meanRms(envelope(kWeight([d], rate), rate, 0.1));
    expect(Math.abs(20 * Math.log10(songLevel([d], rate, 0, 60) / whole))).toBeLessThan(0.25);
    // a loop shorter than the four stretches is read whole
    const short = songLevel([d], rate, 1, 9);
    const k = kWeight([d.subarray(rate - 400, 9 * rate)], rate)[0].subarray(400);
    expect(short).toBeCloseTo(Math.sqrt(k.reduce((a, v) => a + v * v, 0) / k.length), 4);
    expect(songLevel([new Float32Array(100)], rate, 0, 0)).toBe(0);
  });

  it('bakes a seamless wrap into a loop: the sample before the loop end carries on into the loop start', () => {
    const rate = 1000, n = 1000;
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = Math.sin(i * 0.37) * 0.2 + 0.7 * (i / n); // it drifts: the wrap jumps back down, a click
    let natural = 0;
    for (let i = 1; i < n; i++) natural = Math.max(natural, Math.abs(ch[i] - ch[i - 1]));
    expect(Math.abs(ch[n - 1] - ch[0])).toBeGreaterThan(5 * natural);
    const w = bakeLoop([ch], rate, 0, 1, 0.02);
    const a = Math.round(w.start * rate), b = Math.round(w.end * rate);
    expect(a).toBe(20); // a loop from the file's start moves in by the fade (the audio before it is the blend's other side)
    expect(b).toBe(n);
    // the wrap is now the step the audio itself takes into the loop start
    expect(Math.abs(ch[a] - ch[b - 1])).toBeCloseTo(Math.abs(ch[a] - ch[a - 1]), 2);
    expect(Math.abs(ch[a] - ch[b - 1])).toBeLessThanOrEqual(natural);
    // a song's loop well inside the file keeps its bar length exactly
    const song = new Float32Array(5000).map((_, i) => Math.sin(i * 0.1));
    const s = bakeLoop([song], rate, 0.5, 4.5, 0.012);
    expect(s).toEqual({ start: 0.5, end: 4.5 });
    const t = bakeLoop([song], rate, 0.004, 4.004, 0.012); // too near the start: both ends move, the length holds
    expect(t.end - t.start).toBeCloseTo(4, 9);
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

  it('the engine low-pass opens with the revs; every engine and band starts at its own point, each rival at its own pitch', () => {
    expect(engineCutoff(AUDIO.idleRpm)).toBe(AUDIO.engineCutoff.base);
    expect(engineCutoff(AUDIO.redlineRpm)).toBeGreaterThan(engineCutoff(4000));
    expect(engineCutoff(4000)).toBeGreaterThan(engineCutoff(AUDIO.idleRpm));
    // the player's five layers (seed 0) and three rivals' mid loops (seeds 1..3): no two alike
    const phases = [0, 1, 2, 3, 4].map((k) => loopPhase(k, 0)).concat([1, 2, 3].map((seed) => loopPhase(0, seed)));
    for (const p of phases) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThan(1); }
    for (let i = 0; i < phases.length; i++) for (let j = i + 1; j < phases.length; j++) expect(Math.abs(phases[i] - phases[j]), `${i}/${j}`).toBeGreaterThan(0.02);
    const pitches = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'].map(racerPitch);
    for (const p of pitches) { expect(p).toBeGreaterThanOrEqual(1 - AUDIO.racerPitch); expect(p).toBeLessThanOrEqual(1 + AUDIO.racerPitch); }
    expect(new Set(pitches.map((p) => p.toFixed(4))).size).toBe(pitches.length);
    expect(racerPitch('pip')).toBe(racerPitch('pip'));
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
    for (const id of ['engine-idle', 'engine-mid', 'engine-high', 'drift', 'offroad', ...LOOPS_UNDER_WHEELS]) expect(m.sfx[id], id).toBeDefined();
    for (const key of [...new Set(Object.values(RACE_THEME)), 'title', 'results']) expect(m.music[key], key).toBeDefined();
    for (const e of [...Object.values(m.sfx), ...Object.values(m.music)]) expect(fs.existsSync(new URL(`../../public/${e.url}`, import.meta.url)), e.url).toBe(true);
  });
});

describe('no singing and no human voices (Adam, 24 Sept 2026)', () => {
  it('every song asks for no vocals, and every song request forces an instrumental', () => {
    expect(SONGS.length + LYRIA_SONGS.length).toBeGreaterThanOrEqual(7);
    for (const s of LYRIA_SONGS) {
      expect(s.prompt, s.id).toMatch(/\binstrumental only: no vocals of any kind, no singing, humming, shouts or vocal chops\b/i);
      expect(s.loop[1] - s.loop[0], s.id).toBeGreaterThan(30);
      expect(SONGS.some((x) => x.id === s.id), `${s.id}: one maker only`).toBe(false);
    }
    for (const s of SONGS) {
      expect(s.prompt, s.id).toMatch(/\binstrumental, no vocals\b/i);
      expect(s.prompt, s.id).not.toMatch(/\b(sing(s|ing|ers?)?|sung|vocal(?!s\b)\w*|voices?|choir|chant\w*|lyrics?|humming)\b/i);
      expect(songBody(s, 'music_v2_5').force_instrumental, s.id).toBe(true);
      expect(songBody(s, 'music_v2_5').prompt).toBe(s.prompt);
    }
  });

  it('generate.ts sends exactly the catalog request bodies', async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: URL, enc: 'utf8'): string };
    const src = fs.readFileSync(new URL('../../scripts/elevenlabs/generate.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/post\(key, '\/v1\/music[^']*', songBody\(s, /);
    expect(src).toMatch(/post\(key, '\/v1\/sound-generation[^']*', sfxBody\(s\)\)/);
    expect(src).not.toMatch(/force_instrumental/); // only songBody sets it
    expect(sfxBody(SFX[0]).text).toBe(SFX[0].prompt);
  });

  it('no sound effect asks for a human voice: no crowd, cheer, chant, shout or singing', () => {
    // the racers' yelps and horns are their own creature and toy noises (design §5, §11)
    for (const s of SFX) {
      expect(s.prompt, s.id).not.toMatch(/\b(crowds?|cheer(s|ing)?|chant\w*|shout\w*|sing(s|ing|ers?)?|sung|choir|vocal\w*|people|person|announcer|laugh\w*|scream\w*)\b|"[a-z]+!?"/i);
    }
  });

  it('every sound the game can cue has a catalog entry, the rumble loops, and the stings fit their wait', () => {
    const ids = new Map(SFX.map((s) => [s.id, s]));
    for (const id of Object.keys(PATCHES)) expect(ids.has(id), id).toBe(true);
    expect(ids.get('offroad')?.loop).toBe(true);
    // every loop under the wheels (each course's surfaces, the sparks) is made as a loop
    for (const id of LOOPS_UNDER_WHEELS) expect(ids.get(id)?.loop, id).toBe(true);
    // every sound and song says where it plays: the brief the ears judge a recording against
    for (const x of SFX) expect(MOMENT[x.id]?.length, x.id).toBeGreaterThan(20);
    for (const x of SONGS) expect(SONG_MOMENT[x.id]?.length, x.id).toBeGreaterThan(20);
    expect(STING_SECONDS.finish).toBeGreaterThanOrEqual(ids.get('finish')!.seconds);
    expect(STING_SECONDS.finishLow).toBeGreaterThanOrEqual(ids.get('finishLow')!.seconds);
    expect(STING_SECONDS.koOut).toBeGreaterThanOrEqual(ids.get('koOut')!.seconds);
    expect(STING_SECONDS.koSafe).toBeGreaterThanOrEqual(ids.get('koSafe')!.seconds);
    // the design has no rockets (design §8): the old firework sound is gone everywhere
    expect(ids.has('rocket')).toBe(false);
    expect('rocket' in PATCHES).toBe(false);
    // the drift tiers stand out more as they climb
    expect(mixLevel('tierUp2')).toBeGreaterThan(mixLevel('tierUp'));
    expect(mixLevel('tierUp3')).toBeGreaterThan(mixLevel('tierUp2'));
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

interface FakeSource { buffer: unknown; loop: boolean; loopStart?: number; loopEnd?: number; playbackRate: { value: number }; startedAt?: number; offset?: number; stoppedAt?: number }
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
  const song: Sample = { buffer: { duration: 40 } as AudioBuffer, start: 0.5, end: 32.5, loopStart: 0.5, loopEnd: 32.5, gain: 1 };

  it('loops sample-accurately on one source (no second pass to overlap) and comes back faster after the final-lap fanfare', () => {
    const ctx = fakeCtx();
    const p = new SongPlayer(ctx as unknown as BaseAudioContext, {} as AudioNode);
    p.start(song, 1);
    expect(ctx.sources).toHaveLength(1);
    const first = ctx.sources[0];
    expect([first.startedAt, first.offset, first.loop, first.loopStart, first.loopEnd]).toEqual([1, 0.5, true, 0.5, 32.5]);
    expect(first.stoppedAt).toBeUndefined(); // it wraps on its own, however long it plays
    p.lift(40);
    expect(first.stoppedAt).toBeLessThan(40.5);
    expect(ctx.sources).toHaveLength(2);
    const lifted = ctx.sources[1];
    expect(lifted.startedAt).toBeCloseTo(40 + FANFARE_SECONDS, 6);
    expect(lifted.offset).toBe(0.5); // from the top
    expect(lifted.loop).toBe(true);
    expect(lifted.playbackRate.value).toBe(AUDIO.liftTempo);
    p.stop(80);
    expect(lifted.stoppedAt).toBeLessThan(81);
    p.lift(90); // stopped: nothing comes back
    expect(ctx.sources).toHaveLength(2);
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
    for (let i = 441; i < data.length; i++) data[i] = i % 2 ? 0.4 : -0.4;
    // each decode its own buffer (a loop's wrap is baked into its samples)
    const decode = () => { const d = data.slice(); return { duration: 0.1, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer; };
    const ctx = { decodeAudioData: async () => decode() } as unknown as BaseAudioContext;
    const bank = new SampleBank('/', f);
    let ready = 0;
    bank.onLoaded = () => ready++;
    await bank.load(ctx);
    await bank.load(ctx);
    expect(ready).toBe(1);
    expect(bank.hasSong('title')).toBe(true);
    expect(bank.get('go')!.start).toBeCloseTo(0.007, 3); // the 10 ms of silence is skipped, less pre-roll
    // levelled on its loudness as heard: the K-weighted level of the sound times the gain is the target
    const heard = peakRms(envelope(kWeight([data], 44100), 44100), 0.01, 0.1);
    expect(bank.get('go')!.gain * heard).toBeCloseTo(LEVELS.sfx, 2);
    // a loop plays whole but for the few ms its wrap blends into
    expect(bank.get('engine-mid')!.start).toBeCloseTo(AUDIO.loopFade, 6);
    expect(bank.get('engine-mid')!.loopStart).toBeCloseTo(AUDIO.loopFade, 6);
    expect(await bank.song(ctx, 'nope')).toBeNull();
    // a loop's wrap is baked seamless and its loop points set
    expect(bank.get('engine-mid')!.loopEnd).toBeCloseTo(0.1, 6);
  });

  it('asks for every file through its schedule, in turn: the menus\' clicks, the race start, the items and hits, the rest; songs when asked', async () => {
    const ids = ['roar', 'hit', 'uiBack', 'yelp:pip', 'engine-mid', 'horn:gus', 'go', 'balloon', 'uiMove', 'road-wood', 'count', 'drift'];
    const manifest = { sfx: Object.fromEntries(ids.map((id) => [id, { url: `audio/sfx/${id}.mp3` }])), music: { title: { url: 'audio/music/title.mp3', bpm: 128 }, 'race-meadow': { url: 'audio/music/race-meadow.mp3', bpm: 146 } } };
    const fetched: string[] = [];
    const f = (async (u: string) => {
      fetched.push(String(u).replace(/^\/audio\/(sfx\/|music\/)?|\.(mp3|json)$/g, ''));
      return { ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(8) };
    }) as unknown as typeof fetch;
    const data = new Float32Array(4410);
    const ctx = { decodeAudioData: async () => ({ duration: 0.1, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => data.slice() }) as unknown as AudioBuffer } as unknown as BaseAudioContext;
    // the real line, one file at a time: the order it runs them in is the order they are wanted in
    const line = new LoadQueue(1);
    const asked: { tier: number; song?: string }[] = [];
    const bank = new SampleBank('/', f);
    bank.schedule = (job, tier, song) => { asked.push({ tier, song }); return line.add(job, tier); };
    let manifestIn = 0;
    // as GameAudio does: the title's recording is asked for the moment the list is in
    bank.onManifest = () => { manifestIn++; void bank.song(ctx, 'title'); };
    await bank.load(ctx);
    expect(manifestIn).toBe(1);
    expect(bank.isReady('title')).toBe(true);
    expect(bank.isReady('race-meadow'), 'a race\'s song only when it is asked for').toBe(false);
    expect(fetched).not.toContain('race-meadow');
    await bank.song(ctx, 'race-meadow');
    expect(bank.isReady('race-meadow')).toBe(true);
    expect(fetched).toEqual(['manifest', 'title', 'uiBack', 'uiMove', 'engine-mid', 'go', 'count', 'drift', 'hit', 'yelp:pip', 'balloon', 'roar', 'horn:gus', 'road-wood', 'race-meadow']);
    // each file once; the songs at their own turn, flagged as songs
    expect(asked).toHaveLength(ids.length + 2);
    expect(asked.filter((a) => a.song).map((a) => [a.song, a.tier])).toEqual([['title', SONG_TIER], ['race-meadow', SONG_TIER]]);
    expect(asked.filter((a) => !a.song).map((a) => a.tier)).toEqual([0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
    for (const id of ids) expect(bank.get(id), id).toBeDefined();
  });

  it('every sound the game ships has a turn: the menus\' first, then the race start (countdown, go, engines, drift, boosts), the items and hits, the rest', () => {
    const ids = Object.keys(MANIFEST.sfx);
    for (const tier of SFX_TIERS) for (const id of tier) expect(ids, `${id} is a shipped sound`).toContain(id);
    expect(SFX_TIERS[0]).toEqual(['uiMove', 'uiConfirm', 'uiBack']);
    for (const id of ['count', 'go', 'engine-idle', 'engine-mid', 'engine-high', 'drift', 'boost1', 'boost2', 'boost3', 'boostStart']) expect(sfxTier(id), id).toBe(1);
    for (const id of ['balloon', 'rouletteTick', 'itemReady', 'throw', 'hit', 'spin', 'hitConfirm', 'yelp:gus']) expect(sfxTier(id), id).toBe(2);
    for (const id of ['roar', 'krakenRise', 'honk', 'whaleSong', 'geyser', 'horn:pip', 'road-wood', 'finish', 'shift']) expect(sfxTier(id), id).toBe(3);
    // the first two turns are small: a few hundred KB between them, so a race's first seconds come early
    const counts = [0, 1, 2, 3].map((t) => ids.filter((id) => sfxTier(id) === t).length);
    expect(counts[0] + counts[1]).toBeLessThan(25);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(ids.length);
  });

  it('keeps title and results decoded always, and the two most recent race songs', async () => {
    const keys = ['title', 'results', 'race-a', 'race-b', 'race-c'];
    const manifest = { sfx: {}, music: Object.fromEntries(keys.map((k) => [k, { url: `audio/music/${k}.mp3`, bpm: 120 }])) };
    let decodes = 0;
    const f = (async () => ({ ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
    const data = new Float32Array(8000);
    const buffer = { duration: 1, sampleRate: 8000, numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer;
    const ctx = { decodeAudioData: async () => { decodes++; return buffer; } } as unknown as BaseAudioContext;
    const bank = new SampleBank('/', f);
    await bank.load(ctx);
    for (const k of ['title', 'race-a', 'results', 'race-b', 'race-c']) await bank.song(ctx, k);
    expect(decodes).toBe(5);
    await bank.song(ctx, 'title');
    await bank.song(ctx, 'results');
    await bank.song(ctx, 'race-b');
    await bank.song(ctx, 'race-c');
    expect(decodes).toBe(5); // none of these were dropped
    await bank.song(ctx, 'race-a'); // the oldest race song was
    expect(decodes).toBe(6);
  });
});

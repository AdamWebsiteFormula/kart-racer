import { describe, expect, it } from 'vitest';
import { AUDIO } from './constants.ts';
import { direct, resetDirector, type Listener } from './director.ts';
import {
  bakeLoop, bandRate, bandWeights, barLength, cutSfx, ENGINE_BANDS, envelope, FANFARE_SECONDS, leadIn, levelGain, loopPhase, loopPoints, meanRms,
  mixLevel, onsets, peakRms, peakSafe, RACE_THEME, samplePeak, SampleBank, SongPlayer, STING_SECONDS, themeForTrack, type Sample,
} from './samples.ts';
import { engineCutoff, racerPitch } from './engine.ts';
import { PATCHES } from './sfx.ts';
import { SFX, sfxBody, SONGS, songBody } from '../../scripts/elevenlabs/catalog.ts';

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

  it('no recording is levelled past the peak ceiling: a quiet average with a loud click is held down', () => {
    expect(samplePeak([Float32Array.from([0.1, -0.5]), Float32Array.from([0.3, 0])])).toBe(0.5);
    expect(peakSafe(6, 0.5)).toBeCloseTo(AUDIO.peakCeiling / 0.5);
    expect(peakSafe(0.8, 0.5)).toBe(0.8);
    expect(peakSafe(2, 0)).toBe(2);
    // a sound whose loudest 50 ms is quiet but whose one sample peaks high (the old drop: × 1.58 over full scale)
    const rate = 1000, d = new Float32Array(1000).fill(0.02);
    d[500] = 0.8;
    const s = cutSfx({ duration: 1, sampleRate: rate, numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer, false);
    expect(s.gain * 0.8).toBeLessThanOrEqual(AUDIO.peakCeiling + 1e-9);
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
    for (const id of ['engine-idle', 'engine-mid', 'engine-high', 'drift', 'offroad']) expect(m.sfx[id], id).toBeDefined();
    for (const key of [...new Set(Object.values(RACE_THEME)), 'title', 'results']) expect(m.music[key], key).toBeDefined();
    for (const e of [...Object.values(m.sfx), ...Object.values(m.music)]) expect(fs.existsSync(new URL(`../../public/${e.url}`, import.meta.url)), e.url).toBe(true);
  });
});

describe('no singing and no human voices (Adam, 24 Sept 2026)', () => {
  it('every song asks for no vocals, and every song request forces an instrumental', () => {
    expect(SONGS.length).toBeGreaterThanOrEqual(7);
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
    data.fill(0.4, 441);
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
    expect(bank.get('go')!.start).toBeCloseTo(0.006, 3); // the 10 ms of silence is skipped, less pre-roll
    expect(bank.get('go')!.gain).toBeCloseTo(0.2 / 0.4, 3);
    // a loop plays whole but for the few ms its wrap blends into
    expect(bank.get('engine-mid')!.start).toBeCloseTo(AUDIO.loopFade, 6);
    expect(bank.get('engine-mid')!.loopStart).toBeCloseTo(AUDIO.loopFade, 6);
    expect(await bank.song(ctx, 'nope')).toBeNull();
    // a loop's wrap is baked seamless and its loop points set
    expect(bank.get('engine-mid')!.loopEnd).toBeCloseTo(0.1, 6);
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

// GameAudio on a fake audio clock: what the music does at the finish line and under the pause menu.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createKartState, NEUTRAL_INPUT } from '../kart-controller/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { GameAudio } from './audio.ts';
import { AudioBus, busGains } from './bus.ts';
import { AUDIO } from './constants.ts';
import type { Listener } from './director.ts';
import { STING_SECONDS, type Sample, type SampleBank } from './samples.ts';

// ---- a tiny fake Web Audio: every node the game builds, sources remember when they start and stop ----
class Param {
  value = 0;
  setValueAtTime(v: number) { this.value = v; return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  setTargetAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
interface Source { kind: string; startedAt?: number; offset?: number; stoppedAt?: number; buffer?: unknown; frequency?: Param }
class FakeCtx {
  static last: FakeCtx;
  state = 'running';
  currentTime = 1;
  sampleRate = 8000;
  destination = {};
  sources: Source[] = [];
  constructor() { FakeCtx.last = this; }
  private node<T extends object>(extra: T) { return Object.assign({ connect: (n: unknown) => n }, extra); }
  private source(kind: string, extra: object) {
    const s: Source & { start(w: number, o?: number): void; stop(w: number): void } = Object.assign(this.node(extra), {
      kind, start(w: number, o?: number) { s.startedAt = w; s.offset = o; }, stop(w: number) { s.stoppedAt = w; },
    });
    this.sources.push(s);
    return s;
  }
  createGain() { return this.node({ gain: new Param() }); }
  createBiquadFilter() { return this.node({ type: '', frequency: new Param(), Q: new Param(), gain: new Param() }); }
  createDynamicsCompressor() { return this.node({ threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() }); }
  createStereoPanner() { return this.node({ pan: new Param() }); }
  createOscillator() { return this.source('osc', { type: '', frequency: new Param(), detune: new Param() }); }
  createBufferSource() { return this.source('buffer', { buffer: null as unknown, loop: false, playbackRate: new Param() }); }
  createBuffer(_c: number, n: number, rate: number) { const d = new Float32Array(n); return { sampleRate: rate, getChannelData: () => d }; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  addEventListener() { /* no events here */ }
}

const SONG: Sample = { buffer: { duration: 40 } as AudioBuffer, start: 0.5, end: 32.5, gain: 1 };
/** The recorded race and results songs, or none (the synth plays). */
function bank(recorded: boolean): SampleBank {
  return { onLoaded: null, load: async () => undefined, get: () => undefined, hasSong: (k: string) => recorded && (k === 'race-harbour' || k === 'results'), song: async () => SONG } as unknown as SampleBank;
}
const L: Listener = { playerId: 'p', position: [0, 0, 0], heading: 0, positionOf: () => undefined };
const finish = (rank: number): RaceEvent => ({ type: 'finish', racerId: 'p', rank, tick: 1, dnf: false });
const flush = () => new Promise((ok) => setTimeout(ok, 0));

function game(recorded: boolean) {
  const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
  const audio = new GameAudio(bus, bank(recorded));
  bus.unlock();
  const ctx = FakeCtx.last;
  // the song players' sources (not the one-shots' oscillators and noise)
  const songs = () => ctx.sources.filter((s) => s.kind === 'buffer' && s.offset === SONG.start);
  return { audio, bus, ctx, songs };
}

const g = globalThis as unknown as { addEventListener?: unknown };
const had = g.addEventListener;
beforeAll(() => { g.addEventListener ??= () => undefined; });
afterAll(() => { g.addEventListener = had; });

describe('the finish line (the sting plays alone, then the results song)', () => {
  it('the recorded race song fades at the line and the results song waits for the fanfare\'s last chord', async () => {
    const { audio, ctx, songs } = game(true);
    audio.newRace('raceSunrise', 'harbour-loop', 8);
    audio.tick([{ type: 'go' }], [], L);
    await flush();
    expect(songs()).toHaveLength(1);
    const race = songs()[0];
    ctx.currentTime = 50;
    audio.tick([finish(1)], [], L);
    expect(race.stoppedAt, 'the race song is out within its fade').toBeLessThanOrEqual(50 + AUDIO.finishFade + 0.05);
    // the recordings arriving late never bring the race song back under the sting
    (audio as unknown as { samplesReady(): void }).samplesReady();
    await flush();
    expect(songs()).toHaveLength(1);
    ctx.currentTime = 52.5; // main.ts opens the results RESULTS_AFTER (2.5 s) after the line
    audio.play('results');
    await flush();
    expect(songs()).toHaveLength(2);
    expect(songs()[1].startedAt).toBeCloseTo(50 + STING_SECONDS.finish, 6);
  });

  it('a lower place waits only for the shorter jingle; a results song with no finish before it starts at once', async () => {
    const { audio, ctx, songs } = game(true);
    audio.newRace('raceSunrise', 'harbour-loop', 8);
    audio.tick([{ type: 'go' }], [], L);
    await flush();
    ctx.currentTime = 20;
    audio.tick([finish(6)], [], L);
    ctx.currentTime = 21;
    audio.play('results');
    await flush();
    expect(songs().at(-1)!.startedAt).toBeCloseTo(20 + STING_SECONDS.finishLow, 6);
    // the next race resets it: quitting to results with no finish plays the song straight away
    audio.newRace('raceSunrise', 'harbour-loop', 8);
    ctx.currentTime = 30;
    audio.play('results');
    await flush();
    expect(songs().at(-1)!.startedAt).toBeCloseTo(30.05, 6);
  });

  it('the synth song stops at the line too, and its results song books no note before the sting ends', () => {
    const { audio, ctx } = game(false);
    audio.newRace('raceSunrise', 'harbour-loop', 8);
    const inner = audio as unknown as { seq: { take(until: number): { time: number }[] } | null };
    expect(inner.seq).not.toBeNull();
    ctx.currentTime = 40;
    audio.tick([finish(2)], [], L);
    expect(inner.seq).toBeNull();
    ctx.currentTime = 42.5;
    audio.play('results');
    const notes = inner.seq!.take(40 + STING_SECONDS.finish + 1);
    expect(notes.length).toBeGreaterThan(0);
    expect(Math.min(...notes.map((n) => n.time))).toBeGreaterThanOrEqual(40 + STING_SECONDS.finish - 1e-9);
  });
});

describe('the pause menu', () => {
  it('drops the music behind a low-pass and brings it back on resume; the sounds bus stays open', () => {
    const { audio, bus } = game(true);
    const v = { master: 1, music: 0.8, sfx: 0.6 };
    audio.setVolumes(v);
    const music = () => (bus.music as unknown as { gain: Param }).gain.value;
    const cutoff = () => (bus.musicFilter as unknown as { frequency: Param }).frequency.value;
    const sfx = () => (bus.sfx as unknown as { gain: Param }).gain.value;
    expect(music()).toBeCloseTo(busGains(v).music);
    audio.pause(true);
    expect(music()).toBeCloseTo(busGains(v).music * AUDIO.pause.music);
    expect(cutoff()).toBe(AUDIO.pause.hz);
    expect(sfx()).toBeCloseTo(busGains(v).sfx);
    // a volume change from the pause menu's settings keeps the pause
    const w = { ...v, music: 1 };
    audio.setVolumes(w);
    expect(music()).toBeCloseTo(busGains(w).music * AUDIO.pause.music);
    audio.pause(false);
    expect(music()).toBeCloseTo(busGains(w).music);
    expect(cutoff()).toBe(AUDIO.openHz);
  });

  it('a pause before the first gesture holds once the context is built', () => {
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    bus.setPaused(true);
    bus.unlock();
    expect((bus.musicFilter as unknown as { frequency: Param }).frequency.value).toBe(AUDIO.pause.hz);
    expect(() => AudioBus.silent().setPaused(true)).not.toThrow();
  });
});

describe('the Knockout cut', () => {
  it('plays safe or out, and the results song waits for its last note', async () => {
    for (const out of [false, true]) {
      const { audio, ctx, songs } = game(true);
      audio.newRace('raceSunrise', 'harbour-loop', 8);
      audio.tick([{ type: 'go' }], [], L);
      await flush();
      ctx.currentTime = 50;
      audio.tick([finish(out ? 7 : 1)], [], L);
      ctx.currentTime = 52.5; // main.ts raceOver: the cut is shown
      const before = ctx.sources.length;
      audio.knockout(out);
      expect(ctx.sources.length, 'the sting plays').toBeGreaterThan(before);
      audio.play('results');
      await flush();
      expect(songs().at(-1)!.startedAt).toBeCloseTo(52.5 + STING_SECONDS[out ? 'koOut' : 'koSafe'], 6);
    }
  });
});

describe('the sounds on the bus', () => {
  const oscs = (ctx: FakeCtx, from: number) => ctx.sources.slice(from).filter((x) => x.kind === 'osc');

  it('musical and menu cues play at their written pitch; the rest vary a little', () => {
    const { audio, ctx } = game(false);
    const pitches = (id: 'go' | 'uiMove' | 'hop') => [0, 1, 2].map(() => { const n = ctx.sources.length; audio.sfx(id); ctx.currentTime += 1; return oscs(ctx, n)[0].frequency!.value; });
    expect(new Set(pitches('go'))).toEqual(new Set([1047]));
    expect(new Set(pitches('uiMove'))).toEqual(new Set([1200]));
    expect(new Set(pitches('hop')).size).toBe(3);
  });

  it('a loud big sound dips the music; a quiet one far off does not', () => {
    const { audio, bus } = game(false);
    let ducks = 0;
    bus.musicDuck = () => { ducks++; };
    audio.sfx('hop');
    expect(ducks).toBe(0);
    audio.sfx('go');
    audio.tick([{ type: 'trackChanged', event: { label: 'X' } as never }], [], L); // the Final Lap Shift
    expect(ducks).toBe(2);
    audio.sfx('roar', 0.2);
    expect(ducks).toBe(2);
  });

  it('the Final Lap Shift holds the music down for most of its length; a slam dips it for a moment', () => {
    const SHIFT: Sample = { buffer: { duration: 3.5 } as AudioBuffer, start: 0, end: 3.4, gain: 1 };
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    const audio = new GameAudio(bus, { onLoaded: null, load: async () => undefined, get: (id: string) => (id === 'shift' ? SHIFT : undefined), hasSong: () => false, song: async () => null } as unknown as SampleBank);
    bus.unlock();
    const calls: [number, number][] = [];
    bus.musicDuck = (hold = 0, depth = AUDIO.musicDuck.gain) => { calls.push([hold, depth]); };
    audio.sfx('shift');
    expect(calls[0][0]).toBeCloseTo(3.4 * AUDIO.shiftDuck.hold, 6);
    expect(calls[0][1]).toBe(AUDIO.shiftDuck.gain);
    expect(20 * Math.log10(AUDIO.shiftDuck.gain)).toBeLessThan(20 * Math.log10(AUDIO.musicDuck.gain));
    audio.sfx('slam');
    expect(calls[1]).toEqual([0, AUDIO.musicDuck.gain]);
  });

  it('no more than three of one sound at once, and one of each a tick', () => {
    const { audio, ctx } = game(false);
    const n = ctx.sources.length;
    for (let i = 0; i < 5; i++) audio.sfx('bump');
    expect(oscs(ctx, n)).toHaveLength(3);
    ctx.currentTime += 5;
    const m = ctx.sources.length;
    const k = (other: string): RaceEvent => ({ type: 'kart', racerId: 'p', event: { type: 'bump', otherId: other } });
    audio.tick([k('a'), k('b')], [], L);
    expect(oscs(ctx, m)).toHaveLength(1);
  });

  it('a cut tick frees its voice: a quick roll never runs into the cap of three', () => {
    const TICK: Sample = { buffer: { duration: 0.5 } as AudioBuffer, start: 0, end: 0.5, gain: 1 };
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    const audio = new GameAudio(bus, { onLoaded: null, load: async () => undefined, get: (id: string) => (id === 'rouletteTick' ? TICK : undefined), hasSong: () => false, song: async () => null } as unknown as SampleBank);
    bus.unlock();
    const ctx = FakeCtx.last;
    const k = createKartState({ racerId: 'p' });
    let asked = 0;
    for (let t = 0; t <= 0.5; t += 0.005) {
      ctx.currentTime = 10 + t;
      k.item.rouletteRemaining = 1.5 - t; // the quick start of the roll: a tick every 60-70 ms
      const before = ctx.sources.length;
      audio.input(k, NEUTRAL_INPUT);
      if (ctx.sources.length > before) asked++;
    }
    // every tick due in the first half second played (it was three, then silence till one rang out)
    expect(asked).toBeGreaterThanOrEqual(7);
  });

  it('the roulette ticks quick then slow, each tick cutting the one before', () => {
    const TICK: Sample = { buffer: { duration: 0.5 } as AudioBuffer, start: 0, end: 0.5, gain: 1 };
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    const audio = new GameAudio(bus, { onLoaded: null, load: async () => undefined, get: (id: string) => (id === 'rouletteTick' ? TICK : undefined), hasSong: () => false, song: async () => null } as unknown as SampleBank);
    bus.unlock();
    const ctx = FakeCtx.last;
    const k = createKartState({ racerId: 'p' });
    for (let t = 0; t <= 1.5; t += 0.005) {
      ctx.currentTime = 10 + t;
      k.item.rouletteRemaining = Math.max(0, 1.5 - t);
      audio.input(k, NEUTRAL_INPUT);
    }
    const ticks = ctx.sources.filter((x) => x.buffer === TICK.buffer);
    const gaps = ticks.slice(1).map((x, i) => x.startedAt! - ticks[i].startedAt!);
    expect(gaps[0]).toBeLessThan(0.08);
    expect(gaps.at(-1)!).toBeGreaterThan(0.15);
    // every tick but the last was cut when the next began
    for (let i = 0; i + 1 < ticks.length; i++) expect(ticks[i].stoppedAt!).toBeLessThanOrEqual(ticks[i + 1].startedAt! + 0.03);
  });
});

describe('the wheels and sparks under the recorded engine', () => {
  const S = (d: number): Sample => ({ buffer: { duration: d } as AudioBuffer, start: 0.03, end: d, loopStart: 0.03, loopEnd: d, gain: 1 });
  const ENGINE = S(4), WOOD = S(3), SAND = S(3.1), SPARKS = S(2.9);
  function rig(track: string) {
    const lib: Record<string, Sample> = { 'engine-idle': ENGINE, 'engine-mid': ENGINE, 'engine-high': ENGINE, 'road-wood': WOOD, 'offroad-sand': SAND, offroad: SAND, sparks: SPARKS };
    const b = { onLoaded: null, load: async () => undefined, get: (id: string) => lib[id], hasSong: () => false, song: async () => null } as unknown as SampleBank;
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    const audio = new GameAudio(bus, b);
    bus.unlock();
    audio.newRace('raceSunrise', track);
    return { audio, ctx: FakeCtx.last };
  }
  const kart = () => { const k = createKartState({ racerId: 'pip' }); k.speed = 20; k.grounded = true; return k; };
  const of = (ctx: FakeCtx, s: Sample) => ctx.sources.filter((x) => x.buffer === s.buffer);

  it('a course runs only the surfaces it has, started the first time the wheels touch one', () => {
    const board = rig('boardwalk-nights');
    const k = kart();
    board.audio.engines(k, 1, 25, [k], L, true);
    expect(of(board.ctx, WOOD)).toHaveLength(1);
    expect(of(board.ctx, SAND)).toHaveLength(0);
    board.audio.engines(k, 1, 25, [k], L, true);
    expect(of(board.ctx, WOOD)).toHaveLength(1); // started once, then kept
    const harbour = rig('harbour-loop');
    const h = kart();
    harbour.audio.engines(h, 1, 25, [h], L, true);
    expect(of(harbour.ctx, WOOD)).toHaveLength(0);
    expect(of(harbour.ctx, SAND)).toHaveLength(0); // on the road: no sand yet
    h.surface = 'dirt';
    harbour.audio.engines(h, 1, 25, [h], L, true);
    expect(of(harbour.ctx, SAND)).toHaveLength(1);
  });

  it('the sparks start at the first tier and climb in pitch with each', () => {
    const { audio, ctx } = rig('harbour-loop');
    const k = kart();
    k.drift.active = true;
    k.drift.tier = 0;
    audio.engines(k, 1, 25, [k], L, true);
    expect(of(ctx, SPARKS)).toHaveLength(0);
    const rate = () => (of(ctx, SPARKS)[0] as unknown as { playbackRate: Param }).playbackRate.value;
    k.drift.tier = 1;
    audio.engines(k, 1, 25, [k], L, true);
    expect(rate()).toBeCloseTo(AUDIO.tierRates[0]);
    k.drift.tier = 3;
    audio.engines(k, 1, 25, [k], L, true);
    expect(rate()).toBeCloseTo(AUDIO.tierRates[2]);
  });
});

describe('the engines', () => {
  const LOOP: Sample = { buffer: { duration: 4 } as AudioBuffer, start: 0.03, end: 4, loopStart: 0.03, loopEnd: 4, gain: 1 };
  function rig() {
    let recorded = false;
    const b = { onLoaded: null, load: async () => undefined, get: (id: string) => (recorded && id.startsWith('engine') ? LOOP : undefined), hasSong: () => false, song: async () => null } as unknown as SampleBank;
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    const audio = new GameAudio(bus, b);
    bus.unlock();
    return { audio, ctx: FakeCtx.last, record: () => { recorded = true; } };
  }
  const me = createKartState({ racerId: 'p' });
  const rivals = ['pip', 'momo', 'nova'].map((id, i) => { const k = createKartState({ racerId: id }); k.position = [i + 2, 0, 0]; k.speed = 20; return k; });

  it('nothing is built outside a race; the synth stands in, then stops and leaves when the recordings arrive', () => {
    const { audio, ctx, record } = rig();
    audio.engines(me, 0, 25, rivals, L, false);
    expect(ctx.sources).toHaveLength(0);
    audio.engines(me, 1, 25, [me, ...rivals], L, true);
    const synth = ctx.sources.slice();
    expect(synth.length).toBeGreaterThan(0);
    record();
    ctx.currentTime = 5;
    audio.engines(me, 1, 25, [me, ...rivals], L, true);
    for (const x of synth) expect(x.stoppedAt, x.kind).toBeLessThanOrEqual(5.2);
    // the recorded rivals each start at their own point in the loop
    const loops = ctx.sources.filter((x) => x.buffer === LOOP.buffer);
    expect(loops.length).toBe(3 + 3);
    expect(new Set(loops.map((x) => x.offset!.toFixed(3))).size).toBe(loops.length);
  });
});

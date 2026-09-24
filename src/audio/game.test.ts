// GameAudio on a fake audio clock: what the music does at the finish line and under the pause menu.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
interface Source { kind: string; startedAt?: number; offset?: number; stoppedAt?: number }
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
  createBiquadFilter() { return this.node({ type: '', frequency: new Param(), Q: new Param() }); }
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

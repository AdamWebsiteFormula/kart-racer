// From picking a race to the GO (Adam, 28 Sept 2026: "There should be music when clicking to start a new race that
// happens before the race begins, like Mario Kart World does"), on a fake audio clock, fed as main.ts feeds it: the
// pick (raceChosen), the race loading (newRace), the course intro's flight (courseIntro at its first frame,
// introOver at its end or on a skip), then the countdown's real schedule (race-manager STEP_TICKS, GO_TICK) into
// tick(). Which cue starts when, and that the intro's music is silent before the countdown's first beep. Nothing is
// heard: the context is a fake that records every call.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { GO_TICK, STEP_TICKS } from '../race-manager/index.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { INTRO } from '../game/intro.ts';
import { GameAudio } from './audio.ts';
import { AudioBus } from './bus.ts';
import { AUDIO } from './constants.ts';
import type { Listener } from './director.ts';
import type { Sample, SampleBank } from './samples.ts';

// ---- a fake Web Audio: sources remember when they start and stop, params their automation ----
interface Ev { k: 'set' | 'lin' | 'target'; t: number; v: number; tc: number }
class Param {
  value = 0;
  evs: Ev[] = [];
  setValueAtTime(v: number, t = 0) { this.evs.push({ k: 'set', t, v, tc: 0 }); this.value = v; return this; }
  linearRampToValueAtTime(v: number, t = 0) { this.evs.push({ k: 'lin', t, v, tc: 0 }); return this; }
  exponentialRampToValueAtTime(v: number, t = 0) { return this.linearRampToValueAtTime(v, t); }
  setTargetAtTime(v: number, t = 0, tc = 0.01) { this.evs.push({ k: 'target', t, v, tc }); return this; }
  cancelScheduledValues(t = 0) { this.evs = this.evs.filter((e) => e.t < t); return this; }
  /** The value at `t` as Web Audio reads these events: set, linear ramps (from the event before), targets. */
  at(t: number): number {
    let v = this.value, t0 = -Infinity;
    let x: { v: number; tc: number; t: number; from: number } | null = null;
    const now = (u: number) => (x ? x.v + (x.from - x.v) * Math.exp(-(u - x.t) / x.tc) : v);
    const evs = [...this.evs].sort((a, b) => a.t - b.t);
    if (evs.length && evs[0].k === 'set') v = 0; // a fresh gain's automation starts from its first set
    for (const e of evs) {
      if (e.k === 'lin') {
        const from = now(t0);
        if (t < e.t) return from + ((e.v - from) * (t - t0)) / (e.t - t0);
        v = e.v; t0 = e.t; x = null;
        continue;
      }
      if (e.t > t) break;
      if (e.k === 'set') { v = e.v; x = null; } else x = { v: e.v, tc: e.tc, t: e.t, from: now(e.t) };
      t0 = e.t;
    }
    return now(t);
  }
}
interface Src { kind: string; loop: boolean; buffer: unknown; startedAt?: number; offset?: number; stoppedAt?: number; to: Node[] }
interface Node { to: Node[]; gain?: Param }
class FakeCtx {
  static last: FakeCtx;
  state = 'running';
  currentTime = 1;
  sampleRate = 8000;
  destination = { to: [] };
  sources: Src[] = [];
  constructor() { FakeCtx.last = this; }
  private node<T extends object>(extra: T) { const n = Object.assign({ to: [] as Node[], connect: (d: Node) => { n.to.push(d); return d; }, disconnect: () => undefined }, extra); return n; }
  private source(kind: string, extra: object) {
    const s = Object.assign(this.node(extra), {
      kind, loop: false, buffer: null as unknown, start(w: number, o?: number) { s.startedAt = w; s.offset = o; }, stop(w: number) { s.stoppedAt = w; },
    }) as unknown as Src & { start(w: number, o?: number): void; stop(w: number): void };
    this.sources.push(s);
    return s;
  }
  createGain() { return this.node({ gain: new Param() }); }
  createBiquadFilter() { return this.node({ type: '', frequency: new Param(), Q: new Param(), gain: new Param() }); }
  createDynamicsCompressor() { return this.node({ threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() }); }
  createStereoPanner() { return this.node({ pan: new Param() }); }
  createOscillator() { return this.source('osc', { type: '', frequency: new Param(), detune: new Param() }); }
  createBufferSource() { return this.source('buffer', { playbackRate: new Param() }); }
  createBuffer(_c: number, n: number, rate: number) { const d = new Float32Array(n); return { sampleRate: rate, getChannelData: () => d }; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  addEventListener() { /* no events here */ }
}

// ---- the recordings: the courses' race songs as cutSong leaves them (first beat, bar), an intro piece, the pick sting ----
const song = (bpm: number, start = 0.2): Sample => ({ buffer: { duration: 90 } as AudioBuffer, start, end: 80, loopStart: start, loopEnd: 80, gain: 0.8, beat0: start, bar: 240 / bpm });
const SONGS: Record<string, Sample> = {
  'race-harbour': song(150, 0.47), 'race-meadow': song(146, 0.01), 'race-frost': song(146, 0.2), 'race-finale': song(160, 0.57), 'race-mesa': song(135, 0.01), 'race-boardwalk': song(140, 0.01),
};
/** a piece composed for the flight: 5.2 s from its first sound to the end of its ring */
const PIECE: Sample = { buffer: { duration: 6 } as AudioBuffer, start: 0.03, end: 5.23, gain: 0.7, beat0: 0.03, bar: 1.6 };
const PICK: Sample = { buffer: { duration: 1 } as AudioBuffer, start: 0, end: 0.9, gain: 1 };

interface BankOpts { songs?: Record<string, Sample>; intro?: Record<string, Sample>; pick?: boolean; landAfter?: Record<string, number> }
/** A fake bank: what the manifest lists, decoded at once (or after `landAfter` context seconds: the test lands it). */
function bank(ctx: () => FakeCtx, o: BankOpts = {}) {
  const all: Record<string, Sample> = { ...(o.songs ?? SONGS), ...(o.intro ?? {}) };
  const asked: string[] = [];
  const pending = new Map<string, (s: Sample) => void>();
  const b = {
    onLoaded: null, onManifest: null, load: async () => undefined, loadVoices: async () => undefined, voiceCount: () => 0, voiceLine: () => undefined,
    readyIn: () => Infinity, bed: async () => undefined, get: (id: string) => (id === 'pick' && o.pick ? PICK : undefined),
    hasSong: (k: string) => k in all, isReady: (k: string) => k in all && !(o.landAfter && k in o.landAfter),
    song: (_c: unknown, k: string) => {
      asked.push(k);
      if (!(k in all)) return Promise.resolve(null);
      if (o.landAfter && k in o.landAfter) return new Promise<Sample>((r) => pending.set(k, r));
      return Promise.resolve(all[k]);
    },
  };
  /** the file `k` lands now (at the fake clock's time) */
  const land = (k: string) => { delete o.landAfter![k]; pending.get(k)?.(all[k]); };
  void ctx;
  return { b: b as unknown as SampleBank, asked, land };
}

const L: Listener = { playerId: 'p', position: [0, 0, 0], heading: 0, positionOf: () => undefined };
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((ok) => setTimeout(ok, 0)); };
/**
 * The flights the camera flies (game/intro.ts): the full one, and Time Trial's and the Daily's short one. Every
 * course flies every move (game/intro.test.ts: each has its flight authored and a grandstand by the start), so a
 * flight is its moves' seconds: 6.75 s and 2.9 s since 29 Sept 2026, when the intro gained the front shot (5.9 and
 * 2.5 s before). main.ts passes the plan's own length (CourseIntro.plan.duration) to audio.courseIntro.
 */
const FULL = Object.values(INTRO.full).reduce((a, b) => a + b, 0), SHORT = Object.values(INTRO.short).reduce((a, b) => a + b, 0);
/**
 * Whole bars of a race song's first bars under each flight (its room: the flight less the breath and the 20 ms the
 * cue starts after the flight's first frame): the full one's 6.33 s holds four at 160 BPM (race-finale, 1.5 s a bar)
 * and three at 140 to 150; the short one's 2.48 s holds one. (29 Sept 2026, the front shot: race-finale's went 3 → 4.)
 */
const BARS: Record<'full' | 'short', Record<string, number>> = {
  full: { 'race-harbour': 3, 'race-meadow': 3, 'race-finale': 4, 'race-mesa': 3, 'race-frost': 3, 'race-boardwalk': 3 },
  short: { 'race-harbour': 1, 'race-meadow': 1, 'race-finale': 1, 'race-mesa': 1, 'race-frost': 1, 'race-boardwalk': 1 },
};

function game(o: BankOpts = {}) {
  const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
  let c: FakeCtx | null = null;
  const bk = bank(() => c!, o);
  const audio = new GameAudio(bus, bk.b);
  bus.unlock();
  c = FakeCtx.last;
  const ctx = c;
  // every sound effect asked for, and when (the countdown's beeps among them)
  const heard: { id: string; t: number }[] = [];
  const sfx = audio.sfx.bind(audio);
  (audio as unknown as { sfx: typeof sfx }).sfx = (id, ...rest) => { heard.push({ id, t: ctx.currentTime }); return sfx(id, ...rest); };
  /** the intro's cue: the one-shot from a song's or a piece's first sound (a race song loops) */
  const cues = () => ctx.sources.filter((s) => s.kind === 'buffer' && !s.loop && s.offset !== undefined && s.buffer !== null && (s.buffer as { duration: number }).duration >= 6);
  /** the songs playing: a looping source over a song's buffer (a synth patch's noise loops too, over a buffer with no length) */
  const raceSongs = () => ctx.sources.filter((s) => s.kind === 'buffer' && s.loop && ((s.buffer as { duration?: number } | null)?.duration ?? 0) >= 6);
  const gainOf = (s: Src) => s.to[0].gain!;
  return { audio, bus, ctx, heard, cues, raceSongs, gainOf, ...bk };
}

/**
 * main.ts from the flight's first frame: courseIntro, the flight's seconds on the clock (a skip at `skipAt`), then
 * introOver and the countdown on its real schedule into tick(). Returns the first beep's and the go's times.
 */
async function flyAndCount(g: ReturnType<typeof game>, flight: number, opts: { skipAt?: number; landAt?: [string, number] } = {}) {
  const { audio, ctx } = g;
  const t0 = ctx.currentTime;
  audio.courseIntro(flight);
  await flush();
  let end = t0 + flight;
  if (opts.landAt) { ctx.currentTime = t0 + opts.landAt[1]; g.land(opts.landAt[0]); await flush(); }
  if (opts.skipAt !== undefined) end = t0 + opts.skipAt;
  ctx.currentTime = end;
  audio.introOver(); // main.ts endIntro: the flight over (or skipped), the countdown this frame
  const beeps: number[] = [];
  let go = NaN;
  for (let tick = 0; tick <= GO_TICK; tick++) {
    ctx.currentTime = end + tick * SIM_DT;
    const ev: RaceEvent[] = [];
    if (tick < GO_TICK && tick % STEP_TICKS === 0) ev.push({ type: 'countdown', stepsLeft: GO_TICK / STEP_TICKS - tick / STEP_TICKS });
    if (tick === GO_TICK) ev.push({ type: 'go' });
    audio.tick(ev, [], L);
    if (ev.length && ev[0].type === 'countdown') beeps.push(ctx.currentTime);
    if (tick === GO_TICK) go = ctx.currentTime;
  }
  await flush();
  return { t0, first: beeps[0], go, beeps };
}

const g0 = globalThis as unknown as { addEventListener?: unknown };
const had = g0.addEventListener;
beforeAll(() => { g0.addEventListener ??= () => undefined; });
afterAll(() => { g0.addEventListener = had; });

describe('from the pick to the GO: the course intro\'s music', () => {
  for (const [track, key] of [['harbour-loop', 'race-harbour'], ['meadow-run', 'race-meadow'], ['canyon-rush', 'race-mesa'], ['frostbite-pass', 'race-frost'], ['boardwalk-nights', 'race-boardwalk'], ['skyline-circuit', 'race-finale']] as const) for (const kind of ['full', 'short'] as const) {
    it(`${track} (${kind} flight): its race song's first bars under the flight, out on a bar line before the first beep; the song from its top on the go`, async () => {
      const flight = kind === 'full' ? FULL : SHORT;
      const g = game();
      g.audio.newRace('raceSunrise', track, 8);
      await flush();
      expect(g.raceSongs(), 'silent while it loads').toHaveLength(0);
      // (a race waiting for its models (main.ts beginRace) is built, and its flight begins, only once they are in:
      // no intro music before the flight's first frame calls courseIntro)
      expect(g.cues(), 'no intro music before the flight').toHaveLength(0);
      const { t0, first, go } = await flyAndCount(g, flight);
      const s = SONGS[key];
      const [cue] = g.cues();
      expect(cue, 'a cue under the flight').toBeDefined();
      expect(cue.startedAt!, 'from the flight\'s first frame').toBeCloseTo(t0 + 0.02, 9);
      expect(cue.offset, 'from the song\'s first sound').toBe(s.start);
      // its end: the last bar line of the song's own grid that leaves the breath before the countdown
      const gain = g.gainOf(cue), end = gain.evs.at(-1)!.t, bars = (end - cue.startedAt!) / s.bar!;
      expect(Math.abs(bars - Math.round(bars)), `${bars} bars`).toBeLessThan(1e-6);
      expect(Math.round(bars)).toBe(BARS[kind][key]);
      expect(end, 'silent at least the breath (0.4 s) before the first beep').toBeLessThanOrEqual(first - AUDIO.intro.breath + 1e-9);
      const fadeFrom = gain.evs.filter((e) => e.k === 'set').at(-1)!.t;
      expect(end - fadeFrom, 'a fade of at least 0.6 s, never a cut').toBeGreaterThanOrEqual(0.6 - 1e-9);
      expect(gain.at(fadeFrom - 0.1), 'full level before the fade').toBeCloseTo(s.gain, 9);
      expect(gain.at(first), 'silent at the first beep').toBeCloseTo(0, 6);
      expect(cue.stoppedAt!, 'stopped before the first beep').toBeLessThan(first);
      expect(first).toBeCloseTo(t0 + flight, 9);
      // the race song on the go, from its top, looping
      const [race] = g.raceSongs();
      expect(race.startedAt!).toBeGreaterThanOrEqual(go);
      expect(race.startedAt!).toBeLessThan(go + 0.1);
      expect(race.offset).toBe(s.start);
      expect(g.heard.map((h) => h.id)).toEqual(['count', 'count', 'count', 'go']);
    });
  }

  it('the course\'s own intro piece when the manifest has one (intro:<trackId>): played whole, and not the race song', async () => {
    const g = game({ intro: { 'intro:harbour-loop': PIECE } });
    g.audio.newRace('raceSunrise', 'harbour-loop', 8);
    await flush();
    expect(g.asked, 'the piece and the race song decode as the race loads').toEqual(['intro:harbour-loop', 'race-harbour']);
    const { t0, first } = await flyAndCount(g, FULL);
    const cues = g.ctx.sources.filter((s) => s.buffer === PIECE.buffer);
    expect(cues).toHaveLength(1);
    expect([cues[0].startedAt, cues[0].offset]).toEqual([t0 + 0.02, PIECE.start]);
    expect(g.gainOf(cues[0]).evs.map((e) => e.k), 'no fade over a piece that fits').toEqual(['set', 'lin']);
    expect(cues[0].stoppedAt!).toBeCloseTo(t0 + 0.02 + PIECE.end - PIECE.start + 0.02, 9);
    expect(cues[0].stoppedAt!).toBeLessThan(first - 0.1);
    expect(g.cues().filter((s) => s.buffer === SONGS['race-harbour'].buffer), 'the stand-in is not played').toHaveLength(0);
  });

  it('Time Trial\'s and the Daily\'s short intro (2.9 s): the first bar, faded, silent before the first beep; a piece too long is cut on a bar line too', async () => {
    for (const intro of [{}, { 'intro:frostbite-pass': PIECE }] as Record<string, Sample>[]) {
      const g = game({ intro });
      g.audio.newRace('raceSummit', 'frostbite-pass', 1);
      await flush();
      const { t0, first } = await flyAndCount(g, SHORT);
      const [cue] = g.ctx.sources.filter((s) => s.kind === 'buffer' && !s.loop && s.startedAt === t0 + 0.02);
      const gain = g.gainOf(cue), end = gain.evs.at(-1)!.t, bar = (Object.keys(intro).length ? PIECE : SONGS['race-frost']).bar!;
      expect((end - cue.startedAt!) / bar).toBeCloseTo(1, 6);
      expect(end - gain.evs.filter((e) => e.k === 'set').at(-1)!.t).toBeGreaterThanOrEqual(0.6 - 1e-9);
      expect(gain.at(first)).toBeCloseTo(0, 6);
      expect(cue.stoppedAt!).toBeLessThan(first);
    }
  });

  it('a skip: the music fades out fast as the countdown comes at once; a file landing after it never starts', async () => {
    const g = game();
    g.audio.newRace('raceSunrise', 'meadow-run', 8);
    await flush();
    const { t0, first } = await flyAndCount(g, FULL, { skipAt: 2 });
    const [cue] = g.cues();
    expect(first).toBeCloseTo(t0 + 2, 9);
    const gain = g.gainOf(cue);
    expect(gain.evs.at(-1)).toMatchObject({ k: 'target', t: first, v: 0, tc: AUDIO.intro.skipFade / 4 });
    expect(gain.at(first + AUDIO.intro.skipFade), 'about 35 dB down by the end of the skip\'s fade').toBeLessThan(0.02 * SONGS['race-meadow'].gain);
    expect(cue.stoppedAt!).toBeCloseTo(first + AUDIO.intro.skipFade + 0.05, 9);
    // a file still coming down when the player skips never starts
    const late = game({ landAfter: { 'race-meadow': 1 } });
    late.audio.newRace('raceSunrise', 'meadow-run', 8);
    await flush();
    const lt = late.ctx.currentTime;
    late.audio.courseIntro(FULL);
    late.ctx.currentTime = lt + 1;
    late.audio.introOver();
    late.land('race-meadow');
    await flush();
    expect(late.cues()).toHaveLength(0);
  });

  it('a file still coming down starts as it lands if enough of the flight is left, still out on a bar line before the countdown; too late, not at all', async () => {
    const g = game({ landAfter: { 'race-boardwalk': 1 } });
    g.audio.newRace('raceSummit', 'boardwalk-nights', 8);
    await flush();
    const { t0, first } = await flyAndCount(g, FULL, { landAt: ['race-boardwalk', 2] });
    const [cue] = g.cues();
    expect(cue.startedAt!).toBeCloseTo(t0 + 2 + 0.02, 9);
    const end = g.gainOf(cue).evs.at(-1)!.t, bars = (end - cue.startedAt!) / SONGS['race-boardwalk'].bar!;
    expect(bars).toBeCloseTo(2, 6); // 4.33 s of room (6.75 s flight since 29 Sept 2026): two bars at 140 BPM
    expect(end).toBeLessThanOrEqual(first - AUDIO.intro.breath + 1e-9);
    const late = game({ landAfter: { 'race-boardwalk': 1 } });
    late.audio.newRace('raceSummit', 'boardwalk-nights', 8);
    await flush();
    await flyAndCount(late, FULL, { landAt: ['race-boardwalk', FULL - AUDIO.intro.breath - AUDIO.intro.minPlay + 0.1] });
    expect(late.cues(), 'less than minPlay of room left: silence rather than a scrap').toHaveLength(0);
  });

  it('a restart (no intro): no intro music, silence till the go, then the race song', async () => {
    const g = game();
    g.audio.play('raceSunrise', 'race-harbour'); // the race song playing when the pause's Restart is picked
    await flush();
    g.audio.newRace('raceSunrise', 'harbour-loop', 8);
    const playing = g.raceSongs()[0];
    expect(playing.stoppedAt, 'the old race song fades as the race reloads').toBeDefined();
    // main.ts: no flight, straight to the countdown
    const t = g.ctx.currentTime;
    for (let tick = 0; tick <= GO_TICK; tick++) {
      g.ctx.currentTime = t + tick * SIM_DT;
      g.audio.tick(tick === GO_TICK ? [{ type: 'go' }] : tick % STEP_TICKS === 0 ? [{ type: 'countdown', stepsLeft: 3 - tick / STEP_TICKS }] : [], [], L);
    }
    await flush();
    expect(g.cues()).toHaveLength(0);
    expect(g.raceSongs()).toHaveLength(2);
    expect(g.raceSongs()[1].startedAt!).toBeGreaterThanOrEqual(t + GO_TICK * SIM_DT);
  });

  it('a Grand Prix\'s next race: the results song fades, and the next course flies under its own music', async () => {
    const g = game({ songs: { ...SONGS, results: song(103, 0.1) } });
    g.audio.play('results');
    await flush();
    const results = g.raceSongs()[0];
    g.audio.newRace('raceSummit', 'frostbite-pass', 3);
    expect(results.stoppedAt, 'the results song fades as the next race loads').toBeLessThan(g.ctx.currentTime + 0.5);
    await flush();
    await flyAndCount(g, FULL);
    const [cue] = g.cues();
    expect(cue.buffer).toBe(SONGS['race-frost'].buffer);
  });

  it('the pick: the music lab\'s pick sting when the manifest has it, else the slipstream\'s falling whoosh; the menu song fades at the press', async () => {
    const lab = game({ pick: true });
    lab.audio.raceChosen();
    expect(lab.ctx.sources.filter((s) => s.buffer === PICK.buffer)).toHaveLength(1);
    expect(lab.heard, 'the lab\'s sting alone').toEqual([]);
    const g = game({ songs: { ...SONGS, title: song(128, 0.1) } });
    g.audio.play('title');
    await flush();
    const title = g.raceSongs()[0], t = g.ctx.currentTime;
    g.audio.raceChosen();
    expect(g.heard.map((h) => h.id)).toEqual([AUDIO.sting.standIn]);
    expect(title.stoppedAt, 'the menu song fades at the press, as World\'s stops').toBeCloseTo(t + 0.45, 6);
    // the race is built (main.ts load: about 0.6 s of the main thread), and nothing brings the menu song back
    g.ctx.currentTime = t + 0.6;
    g.audio.newRace('raceSunrise', 'harbour-loop', 8);
    (g.audio as unknown as { samplesReady(): void }).samplesReady();
    await flush();
    expect(g.raceSongs()).toHaveLength(1);
  });

  it('no recordings at all (the synth): no intro music under the flight, and the synth\'s race song on the go', async () => {
    const g = game({ songs: {} });
    g.audio.newRace('raceSunrise', 'harbour-loop', 8);
    await flush();
    const inner = g.audio as unknown as { seq: { drums: boolean } | null };
    const { go } = await flyAndCount(g, FULL);
    expect(g.cues()).toHaveLength(0);
    expect(inner.seq?.drums).toBe(true);
    expect(g.heard.at(-1)).toEqual({ id: 'go', t: go });
  });

  it('?mute: the pick, the flight and the countdown make no context and play nothing', async () => {
    const bus = AudioBus.silent();
    const audio = new GameAudio(bus, bank(() => null as unknown as FakeCtx).b);
    FakeCtx.last = undefined as unknown as FakeCtx;
    audio.raceChosen();
    audio.newRace('raceSunrise', 'harbour-loop', 8);
    audio.courseIntro(FULL);
    audio.introOver();
    audio.tick([{ type: 'countdown', stepsLeft: 3 }], [], L);
    await flush();
    expect(bus.ctx).toBeNull();
    expect(FakeCtx.last).toBeUndefined();
  });
});

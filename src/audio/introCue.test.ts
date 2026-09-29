// The course intro's music, pure and on a fake clock (introCue.ts): where a cue ends inside its room, and what
// its player books. Nothing is heard: the context is a fake that records every call.
import { describe, expect, it } from 'vitest';
import { AUDIO } from './constants.ts';
import { IntroCue, introKey, introPlan, introSources, isIntroKey, planGain } from './introCue.ts';
import { INTRO } from '../game/intro.ts';
import type { Sample } from './samples.ts';

/** The flights (game/intro.ts): the full one and Time Trial's and the Daily's short one. */
const FULL = Object.values(INTRO.full).reduce((a, b) => a + b, 0), SHORT = Object.values(INTRO.short).reduce((a, b) => a + b, 0);
/** The race songs' tempos (public/audio/manifest.json): the stand-in is each course's own. */
const SONGS: Record<string, number> = { 'race-harbour': 150, 'race-meadow': 146, 'race-finale': 160, 'race-frost': 146, 'race-boardwalk': 140 };
/**
 * Whole bars each song's first bars get in the full flight (6.35 s of room): four at 160 BPM (1.5 s a bar), three at
 * 140 to 150; one in the short flight (2.5 s of room). (29 Sept 2026: the intro gained the front shot, 5.9 → 6.75 s
 * and 2.5 → 2.9 s, so race-finale's first bars went from three to four.)
 */
const BARS_FULL: Record<string, number> = { 'race-harbour': 3, 'race-meadow': 3, 'race-finale': 4, 'race-frost': 3, 'race-boardwalk': 3 };
const whole = (x: number, step: number) => Math.abs(x / step - Math.round(x / step)) < 1e-6;

describe('where a course intro\'s music ends (introPlan)', () => {
  // 29 Sept 2026: the intro gained the front shot (the player's racer seen from the front before the swing round
  // behind it), so the full flight went from 5.9 s to 6.75 s and the short one from 2.5 s to 2.9 s. The music reads
  // the flight's own length (main.ts passes CourseIntro.plan.duration to audio.courseIntro); these read INTRO too.
  it('the flights are the ones the camera flies: 6.75 s, and 2.9 s in Time Trial and the Daily', () => {
    expect(FULL).toBeCloseTo(6.75, 6);
    expect(SHORT).toBeCloseTo(2.9, 6);
  });

  for (const [song, bpm] of Object.entries(SONGS)) {
    it(`${song}'s first bars (${bpm} BPM) fade out on a bar line, over two beats, before the countdown, in both flights`, () => {
      const bar = 240 / bpm, beat = bar / 4;
      for (const flight of [FULL, SHORT]) {
        const room = flight - AUDIO.intro.breath;
        const p = introPlan(room, 80, bar)!;
        expect(p, `${flight} s`).not.toBeNull();
        expect(p.end, 'silent before the breath before the countdown').toBeLessThanOrEqual(room + 1e-9);
        expect(whole(p.end, bar), `${p.end} s is a bar line`).toBe(true);
        expect(room - p.end, 'the last bar line that fits: no whole bar more would').toBeLessThan(bar);
        const fade = p.end - p.fadeFrom;
        expect(fade, 'never cut mid-note: a fade of at least 0.6 s').toBeGreaterThanOrEqual(AUDIO.intro.fadeMin - 1e-9);
        expect(fade).toBeCloseTo(Math.min(AUDIO.intro.fadeMax, Math.max(AUDIO.intro.fadeMin, 2 * beat)), 9);
        expect(p.fadeFrom, 'some of it at full level first').toBeGreaterThanOrEqual(AUDIO.intro.minFull - 1e-9);
      }
      // the full flight has room for three bars (four at 160 BPM), the short one for one
      expect(introPlan(FULL - AUDIO.intro.breath, 80, bar)!.end / bar).toBeCloseTo(BARS_FULL[song], 9);
      expect(introPlan(SHORT - AUDIO.intro.breath, 80, bar)!.end / bar).toBeCloseTo(1, 9);
    });
  }

  it('a piece composed for the flight plays whole, with no fade: it resolves on its own', () => {
    expect(introPlan(5.5, 5.2, 1.6)).toEqual({ fadeFrom: 5.2, end: 5.2 });
    expect(introPlan(5.5, 5.5, 1.6)).toEqual({ fadeFrom: 5.5, end: 5.5 });
    // the same piece in the short flight: its first bar, faded
    expect(introPlan(2.1, 5.2, 1.6)).toEqual({ fadeFrom: 0.8, end: 1.6 });
  });

  it('the bar grid runs from the first beat (a pickup before it moves every bar line)', () => {
    const p = introPlan(5.5, 80, 1.6, 0.3)!;
    expect(p.end).toBeCloseTo(0.3 + 3 * 1.6, 9);
  });

  it('with no bar line in the room, the last beat; with no grid, the room\'s end; with too little room, nothing', () => {
    // 1.3 s of room at 150 BPM: no bar line leaves any of it at full level, the third beat does
    expect(introPlan(1.3, 80, 1.6)).toEqual({ fadeFrom: expect.closeTo(0.4, 9), end: expect.closeTo(1.2, 9) });
    expect(introPlan(3, 80, 0)).toEqual({ fadeFrom: 3 - AUDIO.intro.fadeMin, end: 3 });
    expect(introPlan(0.9, 80, 1.6)).toBeNull();
    expect(introPlan(0, 80, 1.6)).toBeNull();
    expect(introPlan(-1, 80, 1.6)).toBeNull();
  });

  it('the level along a plan: in fast, full, then an equal-power fade to silence at its end', () => {
    const p = { fadeFrom: 4, end: 4.8 };
    expect(planGain(p, 0.9, 10, 9.99)).toBe(0);
    expect(planGain(p, 0.9, 10, 10.004)).toBeCloseTo(0.45, 6);
    expect(planGain(p, 0.9, 10, 12)).toBe(0.9);
    expect(planGain(p, 0.9, 10, 14.4)).toBeCloseTo(0.9 * Math.SQRT1_2, 6);
    expect(planGain(p, 0.9, 10, 14.8)).toBe(0);
  });

  it('the music is chosen by its id in the manifest: the course\'s own intro piece, then its race song', () => {
    expect(introKey('harbour-loop')).toBe('intro:harbour-loop');
    expect(introSources('harbour-loop', 'race-harbour')).toEqual(['intro:harbour-loop', 'race-harbour']);
    expect([isIntroKey('intro:meadow-run'), isIntroKey('race-meadow'), isIntroKey('title')]).toEqual([true, false, false]);
  });
});

// ---- a fake context: every node remembers what it feeds and every param its automation ----
interface Ev { k: string; t: number; v: number; tc?: number }
class Param {
  value = 0;
  evs: Ev[] = [];
  setValueAtTime(v: number, t: number) { this.evs.push({ k: 'set', t, v }); return this; }
  linearRampToValueAtTime(v: number, t: number) { this.evs.push({ k: 'lin', t, v }); return this; }
  setTargetAtTime(v: number, t: number, tc: number) { this.evs.push({ k: 'target', t, v, tc }); return this; }
  cancelScheduledValues(t: number) { this.evs = this.evs.filter((e) => e.t < t); this.evs.push({ k: 'cancel', t, v: NaN }); return this; }
}
class Ctx {
  currentTime = 0;
  sources: { startedAt?: number; offset?: number; stoppedAt?: number; buffer?: unknown }[] = [];
  createGain() { const n = { gain: new Param(), to: [] as unknown[], connect: (d: unknown) => { n.to.push(d); return d; } }; return n; }
  createBufferSource() {
    const s = {
      buffer: null as unknown, startedAt: undefined as number | undefined, offset: undefined as number | undefined, stoppedAt: undefined as number | undefined, to: [] as unknown[],
      connect: (d: unknown) => { s.to.push(d); return d; }, start(w: number, o?: number) { s.startedAt = w; s.offset = o; }, stop(w: number) { s.stoppedAt = w; },
    };
    this.sources.push(s);
    return s;
  }
}

describe('the intro cue\'s player (IntroCue)', () => {
  const song: Sample = { buffer: { duration: 80 } as AudioBuffer, start: 0.47, end: 70, gain: 0.8, beat0: 0.47, bar: 1.6 };

  it('plays from the first sound at its start, full level to the fade, silent and stopped by its end', () => {
    const ctx = new Ctx(), bus = ctx.createGain();
    const cue = new IntroCue(ctx as unknown as BaseAudioContext, bus as unknown as AudioNode);
    cue.start(song, 2, { fadeFrom: 4, end: 4.8 });
    const [src] = ctx.sources as { startedAt: number; offset: number; stoppedAt: number; to: { gain: Param; to: unknown[] }[] }[];
    expect([src.startedAt, src.offset]).toEqual([2, 0.47]);
    const g = src.to[0];
    expect(g.to[0], 'on the music bus').toBe(bus);
    expect(g.gain.evs[0]).toEqual({ k: 'set', t: 2, v: 0 });
    expect(g.gain.evs.find((e) => e.k === 'set' && e.t === 6)?.v, 'full level till the fade').toBe(0.8);
    const last = g.gain.evs.at(-1)!;
    expect(last.t).toBeCloseTo(6.8, 9);
    expect(last.v).toBeCloseTo(0, 9);
    // the curve falls all the way, never back up
    const fade = g.gain.evs.filter((e) => e.t >= 6);
    for (let i = 1; i < fade.length; i++) expect(fade[i].v).toBeLessThanOrEqual(fade[i - 1].v);
    expect(src.stoppedAt).toBeCloseTo(6.82, 9);
    expect([cue.sounding(6.79), cue.sounding(6.8)]).toEqual([true, false]);
  });

  it('a piece that plays whole has no fade over it, and stops at its end', () => {
    const ctx = new Ctx(), bus = ctx.createGain();
    const cue = new IntroCue(ctx as unknown as BaseAudioContext, bus as unknown as AudioNode);
    const piece: Sample = { buffer: { duration: 6 } as AudioBuffer, start: 0.02, end: 5.22, gain: 0.7 };
    cue.start(piece, 1, { fadeFrom: 5.2, end: 5.2 });
    const src = ctx.sources[0] as { stoppedAt: number; to: { gain: Param }[] };
    expect(src.to[0].gain.evs.map((e) => e.k)).toEqual(['set', 'lin']);
    expect(src.stoppedAt).toBeCloseTo(6.22, 9);
  });

  it('a skip fades it out fast; a stop after its own fade ends sooner changes nothing', () => {
    const ctx = new Ctx(), bus = ctx.createGain();
    const cue = new IntroCue(ctx as unknown as BaseAudioContext, bus as unknown as AudioNode);
    cue.start(song, 2, { fadeFrom: 4, end: 4.8 });
    const src = ctx.sources[0] as { stoppedAt: number; to: { gain: Param }[] };
    cue.stop(3, AUDIO.intro.skipFade);
    const evs = src.to[0].gain.evs;
    expect(evs.at(-1)).toEqual({ k: 'target', t: 3, v: 0, tc: AUDIO.intro.skipFade / 4 });
    expect(evs.some((e) => e.t > 3 && e.k !== 'target'), 'the planned fade is dropped').toBe(false);
    expect(src.stoppedAt).toBeCloseTo(3 + AUDIO.intro.skipFade + 0.05, 9);
    expect([cue.sounding(3.1), cue.sounding(3 + AUDIO.intro.skipFade)]).toEqual([true, false]);
    // a second cue: stopped in its own fade's last moments, its fade is left to finish
    cue.start(song, 10, { fadeFrom: 2, end: 2.8 });
    const b = ctx.sources[1] as { stoppedAt: number; to: { gain: Param }[] };
    const n = b.to[0].gain.evs.length;
    cue.stop(12.7, AUDIO.intro.skipFade);
    expect(b.to[0].gain.evs).toHaveLength(n);
    expect(b.stoppedAt).toBeCloseTo(12.82, 9);
  });
});

// The course intro's music (Adam, 28 Sept 2026: "There should be music when clicking to start a new race that
// happens before the race begins, like Mario Kart World does"). World flies the course under a piece in the
// course's own key and style (a cup's opening, a next race's short flyover) that ends on a held chord as the
// flyover ends; its countdown has only the beeps; the course theme starts on GO (docs/sops/audio.md, 28 Sept 2026).
// Ours plays the course's own intro piece when the manifest has one (`intro:<trackId>`, the music lab's), else the
// first bars of the course's race song, faded out on a bar line before the countdown. Every sound is chosen by its
// id in the manifest, so a new file swaps in with no code. The plan is pure; the player is thin Web Audio.
import { AUDIO } from './constants.ts';
import type { Sample } from './samples.ts';

/** The manifest's music key for a course's own intro piece (the music lab's, 28 Sept 2026). */
export const introKey = (trackId: string): string => `intro:${trackId}`;
/** Whether a music key is a course's intro piece (a one-shot, not a looping song). */
export const isIntroKey = (key: string): boolean => key.startsWith('intro:');

/**
 * The music a course's intro plays, by manifest key, first choice first: its own intro piece, then the first bars
 * of its race song (`raceKey`: samples.ts themeForTrack). The first the manifest has is played.
 */
export const introSources = (trackId: string, raceKey: string): readonly string[] => [introKey(trackId), raceKey];

/** When a cue sounds, in seconds from its start: at full level until `fadeFrom`, silent from `end`. */
export interface IntroPlan { fadeFrom: number; end: number }

/**
 * Where a cue ends when it has `room` seconds (its flight left, less the breath before the countdown). `length`:
 * the recording from its first sound to the end of its ring; `bar`: its bar (seconds); `lead`: its first beat after
 * its first sound. One that fits plays whole, no fade: a piece composed for the flight resolves on its own. Else it
 * fades out over two beats (AUDIO.intro.fadeMin to fadeMax) ending on its last bar line in the room that leaves at
 * least `minFull` at full level before the fade; with none, its last beat that does; with no grid, at the room's
 * end. Null: too little room for any of it.
 */
export function introPlan(room: number, length: number, bar: number, lead = 0): IntroPlan | null {
  const I = AUDIO.intro;
  if (!(room > 0) || !(length > 0)) return null;
  if (length <= room) return { fadeFrom: length, end: length };
  const beat = bar / 4;
  const fade = Math.min(I.fadeMax, Math.max(I.fadeMin, beat > 0 ? I.fadeBeats * beat : 0));
  if (bar > 0) {
    for (const grid of [bar, beat]) {
      const end = lead + Math.floor((room - lead) / grid + 1e-9) * grid;
      if (end - fade >= I.minFull - 1e-9) return { fadeFrom: end - fade, end };
    }
    return null;
  }
  return room - fade >= I.minFull - 1e-9 ? { fadeFrom: room - fade, end: room } : null;
}

/** Straight segments the fade's curve is drawn with (every renderer and fake plays them). */
const CURVE = 8;
/** a cue fades in this fast from its first sound (no click), as a song does */
const FADE_IN = 0.008;

/**
 * Fade `p` from `level` at `from` to silence at `to` along a quarter cosine (equal power: it thins, then leaves, with
 * no sudden drop), in straight segments.
 */
export function fadeOut(p: AudioParam, level: number, from: number, to: number): void {
  p.setValueAtTime(level, from);
  for (let i = 1; i <= CURVE; i++) p.linearRampToValueAtTime(level * Math.cos((i / CURVE) * (Math.PI / 2)), from + ((to - from) * i) / CURVE);
}

/** The level a cue's gain has at `t` under its plan (0 before its start and after its end): what a test reads. */
export function planGain(plan: IntroPlan, level: number, start: number, t: number): number {
  const x = t - start;
  if (x < 0 || x >= plan.end) return 0;
  if (x < FADE_IN) return (level * x) / FADE_IN;
  if (x <= plan.fadeFrom) return level;
  return level * Math.cos(((x - plan.fadeFrom) / (plan.end - plan.fadeFrom)) * (Math.PI / 2));
}

/**
 * One course intro's music: a recording played once from its first sound, as its plan says, on the music bus. A
 * skip (or a new race, or the countdown come early) fades it out fast. Silent from `endsAt` (context time).
 */
export class IntroCue {
  private readonly ctx: BaseAudioContext;
  private readonly dest: AudioNode;
  private src: AudioBufferSourceNode | null = null;
  private out: GainNode | null = null;
  /** context time it is silent from (0: none started) */
  endsAt = 0;

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
  }

  /** Play `s` from its first sound at context time `when`, as `plan` says. One still sounding fades out fast. */
  start(s: Sample, when: number, plan: IntroPlan): void {
    this.stop(when, AUDIO.intro.skipFade);
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(s.gain, when + FADE_IN);
    const end = when + plan.end;
    if (plan.end - plan.fadeFrom > 1e-3) fadeOut(g.gain, s.gain, when + plan.fadeFrom, end);
    src.connect(g).connect(this.dest);
    src.start(when, s.start);
    src.stop(end + 0.02);
    this.src = src;
    this.out = g;
    this.endsAt = end;
  }

  /** Whether it still sounds at context time `t`. */
  sounding(t: number): boolean { return t < this.endsAt; }

  /**
   * Fade out from `now` over `seconds` (a skip, a new race, the countdown come early). Nothing to do when none
   * plays or its own fade ends sooner.
   */
  stop(now: number, seconds: number): void {
    const src = this.src, g = this.out;
    if (!src || !g || now + seconds >= this.endsAt) return;
    this.src = null;
    this.out = null;
    // hold the level it has now (where the browser can), then fall away from it
    const p = g.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else p.cancelScheduledValues(now);
    p.setTargetAtTime(0, now, seconds / 4);
    src.stop(now + seconds + 0.05);
    this.endsAt = now + seconds;
  }
}

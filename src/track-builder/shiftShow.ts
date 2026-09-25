// The Final Lap Shift as a show (design §2, §6, "the world changes in one readable way"). The sim's
// part is shift.ts: the route, surface and shortcut changes land on the tick the leader starts the
// last lap. This is the rest, the part players see and hear: what each kind of shift plays out in its
// first seconds, drawn by the scene (mesh/shiftStage.ts), felt through the camera (vfx-juice) and heard
// through the game's own sounds. Pure: seconds since the shift in, numbers out; the sim never reads it.
//
// Every beat is timed from the shift's own tick (`since` = 0 on it) and reads within 2 to 3 s from the
// chase camera. Flashes (lightning, a firework over the road) stay at most three in any second
// (WCAG 2.3.1); reduced motion keeps every beat but cuts instead of sweeping and flashes gently.
import type { ShiftKind } from './types.ts';

/** When each kind's beats fall, seconds after the shift ([from, to] is a move's span). */
export const SHOW = Object.freeze({
  /** everyone: the camera widens a little and shakes once as the world changes (none with reduced motion) */
  pulse: Object.freeze({ fov: 5, back: 0.35, trauma: 0.3, in: 0.12, out: 0.9 }),
  /** Harbor Loop: the sea comes up over the beach road (the tide rolls in from the bay side), the pier ramp lights up */
  flood: Object.freeze({ rise: [0.2, 2.4] as const, sea: 0.7, over: 0.22, beacon: 1.2 }),
  /** Meadow Run: storm clouds sweep over, rain, lightning strikes the oak at the shortcut and it falls across it */
  storm: Object.freeze({ clouds: [0, 2.4] as const, rain: [0.3, 2.2] as const, strike: 0.7, fall: [0.9, 2.05] as const }),
  /** Canyon Rush: the rope bridge breaks in the middle, its planks falling away plank by plank; the mine's lanterns flicker on */
  collapse: Object.freeze({ snap: 0.45, gap: 0.032, lamps: [0.35, 1.9] as const }),
  /** Frostbite Pass: the fog closes in, the snow thickens, the lake freezes out from the crossing */
  blizzard: Object.freeze({ fog: [0, 3.2] as const, snow: [0, 2.4] as const, freeze: [0.25, 2.5] as const, flurries: 0.3 }),
  /** Boardwalk Nights: two big bursts over the road, the Ferris spokes swing down into the ramp, the racing line lights up */
  fireworks: Object.freeze({ salvo: [0.55, 2.0] as const, spokes: [0.3, 1.35] as const, deck: [0.7, 1.35] as const, path: [0.2, 2.6] as const }),
  /** Skyline Circuit: the finish line lights, the old sky bridges retract, the rail lights up as the only road */
  sunset: Object.freeze({ finish: [0.35, 1.3] as const, retract: [0.4, 2.4] as const, rail: [1.3, 2.6] as const }),
});

/** Linear fog before and in a blizzard (main.ts draws the scene's fog from these), metres. */
export const FOG = Object.freeze({ near: 140, far: 850, blizzardNear: 26, blizzardFar: 230 });

/** 0 → 1 across [from, to] (clamped). */
export function span(since: number, from: number, to: number): number {
  if (since <= from) return 0;
  if (since >= to) return 1;
  return (since - from) / (to - from);
}

/** Smooth 0 → 1 across [from, to]. */
export function ease(since: number, from: number, to: number): number {
  const k = span(since, from, to);
  return k * k * (3 - 2 * k);
}

// ---------------------------------------------------------------- lightning (Meadow Run's storm)

/**
 * The storm's strikes: the first on the oak at the shortcut, then one far off every 5 to 8.5 s for
 * the rest of the race (a fixed sequence, so every race has the same storm). Each strike is a double
 * flash (the stroke and its return, 0.17 s apart); with reduced motion a single, gentler one.
 */
export const LIGHTNING = Object.freeze({ restrike: 0.17, first: SHOW.storm.strike, gap: [5, 8.5] as const, attack: 0.025, decay: 0.16, reducedAmp: 0.35, count: 40 });

/** The strike times, seconds after the shift (the first is the oak's). */
export const STRIKES: readonly number[] = (() => {
  const out: number[] = [LIGHTNING.first];
  let seed = 0x2f6b1d;
  for (let i = 1; i < LIGHTNING.count; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const k = seed / 0x100000000;
    out.push(out[i - 1] + LIGHTNING.gap[0] + k * (LIGHTNING.gap[1] - LIGHTNING.gap[0]));
  }
  return Object.freeze(out);
})();

/** Every flash onset of the storm up to `until` seconds (reduced motion: one per strike). */
export function lightningOnsets(until: number, reduced: boolean): number[] {
  const out: number[] = [];
  for (const s of STRIKES) {
    if (s > until) break;
    out.push(s);
    if (!reduced) out.push(s + LIGHTNING.restrike);
  }
  return out;
}

/** The last strike at or before `since` (index into STRIKES), or -1. */
export function lastStrike(since: number): number {
  let i = -1;
  for (let k = 0; k < STRIKES.length && STRIKES[k] <= since; k++) i = k;
  return i;
}

/** How bright the lightning is at `since` (0..1): a quick rise and a fast fall per flash. */
export function lightning(since: number, reduced: boolean): number {
  const i = lastStrike(since);
  if (i < 0) return 0;
  const amp = reduced ? LIGHTNING.reducedAmp : 1;
  let v = 0;
  const flashes = reduced ? 1 : 2;
  for (let f = 0; f < flashes; f++) {
    const d = since - (STRIKES[i] + f * LIGHTNING.restrike);
    if (d < 0) continue;
    const a = d < LIGHTNING.attack ? d / LIGHTNING.attack : Math.exp(-(d - LIGHTNING.attack) / (LIGHTNING.decay * 0.45));
    // the return stroke is a little weaker; far strikes after the first are dimmer
    v = Math.max(v, a * (f ? 0.7 : 1) * (i ? 0.75 : 1));
  }
  return v < 0.004 ? 0 : v * amp;
}

// ---------------------------------------------------------------- flashes (WCAG 2.3.1)

/** The show's own flash onsets for `kind` up to `until` seconds (the far vista's fireworks are the art's; the test adds them). */
export function flashOnsets(kind: ShiftKind, reduced: boolean, until = 60): number[] {
  if (kind === 'storm') return lightningOnsets(until, reduced);
  // each salvo is its bursts at one instant: one flash
  if (kind === 'fireworks') return SHOW.fireworks.salvo.filter((t) => t <= until && (!reduced || t === SHOW.fireworks.salvo[0]));
  return [];
}

/** The most onsets in any `window`-second span. */
export function mostInWindow(onsets: readonly number[], window = 1): number {
  const s = [...onsets].sort((a, b) => a - b);
  let best = 0;
  for (let i = 0, j = 0; i < s.length; i++) {
    while (s[i] - s[j] >= window) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
}

// ---------------------------------------------------------------- fog

/** The fog's near and far at `since` for `kind` (a blizzard closes in; nothing else moves it). */
export function fogAt(kind: ShiftKind, since: number, out: { near: number; far: number }): { near: number; far: number } {
  const k = kind === 'blizzard' && since >= 0 ? ease(since, SHOW.blizzard.fog[0], SHOW.blizzard.fog[1]) : 0;
  out.near = FOG.near + (FOG.blizzardNear - FOG.near) * k;
  out.far = FOG.far + (FOG.blizzardFar - FOG.far) * k;
  return out;
}

// ---------------------------------------------------------------- sounds

/**
 * The game's own sounds under the shift's sting (audio 'shift', which every kind plays on its tick):
 * `at` seconds after it, `sfx` at `gain`, heard from the set piece (`where: 'piece'`, fading with
 * distance) or everywhere. No new recordings: the sea rising is the kraken's, thunder the
 * Rumblesaur's stomp, the tree's fall a ground pound, the spokes' clank the anchor's chain.
 */
export interface ShowCue { at: number; sfx: string; gain: number; where: 'piece' | 'global'; reach?: number }
export const CUES: Readonly<Partial<Record<ShiftKind, readonly ShowCue[]>>> = Object.freeze({
  flood: [{ at: 0.25, sfx: 'krakenRise', gain: 0.55, where: 'global' }],
  storm: [{ at: SHOW.storm.strike + 0.05, sfx: 'stomp', gain: 0.8, where: 'global' }, { at: SHOW.storm.fall[1], sfx: 'slam', gain: 0.9, where: 'piece', reach: 140 }],
  collapse: [{ at: SHOW.collapse.snap, sfx: 'stomp', gain: 0.9, where: 'piece', reach: 260 }],
  blizzard: [{ at: 0.1, sfx: 'tailSlap', gain: 0.5, where: 'global' }],
  fireworks: [{ at: SHOW.fireworks.spokes[1], sfx: 'anchor', gain: 0.8, where: 'piece', reach: 120 }],
  sunset: [{ at: SHOW.sunset.retract[0], sfx: 'claw', gain: 0.6, where: 'piece', reach: 200 }],
});

/** Thunder after each later strike: the stomp again, fainter, a beat after its flash. */
export const THUNDER = Object.freeze({ sfx: 'stomp', gain: 0.4, delay: 0.6 });

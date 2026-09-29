// Render side, pure maths (no Three.js): a trick's stunt in the air (second MKW gap review, 28 Sept 2026,
// item 4: "a trick barely shows ... the kart tips a little and levels out", where Mario Kart World's kart
// "spins right over"). The sim's trick is untouched (its timing, its landing and its +30 % for 0.7 s:
// drift.ts, ground.ts); this is only what the kart and its driver do on screen between the press and the
// touchdown. What Mario Kart World does (docs/sops/kart-controller.md Decisions, 28 Sept 2026, with the
// sources): a trick held with the stick left or right is a spin that way, held down a backflip ("If you
// hold down a directional input at the same time you press R to do a Trick, [you] will perform a spin (left
// or right) or a flip (up or down)", gamerant.com; the Super Mario Wiki's Jump Boost page: stick down a
// backflip, forward a frontflip, left and right a spin); with the stick centred, "a quick animation unique
// to them" (each racer has five in MKW: mariowiki.com/Jump_Boost). In its footage the whole kart turns over
// in about 0.4 s and is upright again, wheels down, as it lands into the boost (OSU-aguh1AY 1:38.7 to
// 1:39.3, stills a tenth of a second apart). So here: one whole turn, a spin, a roll or a flip, timed from
// a forecast of the air still to come so it always ends upright a moment before the wheels touch, however
// long or short the flight; a flight too short for a whole turn gets a flick over and back; the racer's own
// flourish (driverAnim.ts) rides on top.
import { jumpLift, lateralOffset } from './ground.ts';
import type { InputState, KartState, TrackQuery } from './types.ts';

/** A stunt: a flat spin (about the up axis), a barrel roll (about the nose), a flip (about the axles), or a flick over and back. */
export type StuntKind = 'spin' | 'roll' | 'flip' | 'flick';

export const STUNT = Object.freeze({
  /** s: the longest one whole turn takes (MKW's: about 0.4 s) */
  maxSeconds: 0.42,
  /** s: the shortest whole turn; a shorter flight gets a flick */
  minSeconds: 0.24,
  /** s: the turn is done this long before the forecast touchdown, so the kart lands on its wheels */
  margin: 0.05,
  /** s: the shortest flick */
  flickMin: 0.1,
  /** rad: a flick tips over this far and back */
  flick: 0.85,
  /** m: the turn is about a point this far over the wheels' contact (the middle of the kart and driver) */
  pivot: 0.55,
  /** m: the kart rises this much at the middle of its turn (render only: clear of the road as it goes over) */
  lift: 0.22,
  /** rad: a spin banks into its turn this much at its middle */
  spinBank: 0.3,
  /** the stick past this at the press: a spin that way (MKW's left or right trick) */
  stick: 0.5,
  /** the brake past this at the press (the stick held back): a backflip */
  back: 0.5,
  /** s: a turn cut short (a forecast gone wrong, a hit) is brought upright this fast, the nearer way */
  settle: 0.1,
  /** s: the furthest ahead the touchdown is looked for */
  lookAhead: 2,
  /** s: the forecast's step (the sim's own tick) */
  step: 1 / 120,
  /** m: a kart this close over the road lands on it (the sim's groundStick) */
  stickHeight: 0.12,
  /** m/s: a kart rising faster than this does not land yet (the sim's groundLaunchVy) */
  landVy: 1,
  /** reduced motion: a tip this far over and back instead of a whole turn (rad) */
  reducedTip: 0.22,
});

/**
 * Each racer's own stunts with the stick centred, taken in turn trick by trick (MKW: each racer's own
 * animations); a racer not listed takes DEFAULT_STUNTS. The flourish that goes with them is the driver's
 * (driverAnim.ts FLOURISH).
 */
export const RACER_STUNTS: Readonly<Record<string, readonly StuntKind[]>> = Object.freeze({
  pip: ['roll', 'flip', 'roll', 'spin'],
  momo: ['roll', 'spin'],
  nova: ['roll', 'flip'],
  juniper: ['flip', 'roll'],
  otto: ['spin', 'roll'],
  sprocket: ['flip', 'spin'],
  boulder: ['spin', 'flip'],
  gus: ['flip', 'spin'],
});
export const DEFAULT_STUNTS: readonly StuntKind[] = Object.freeze(['roll', 'flip', 'spin']);

/**
 * The stunt for a trick pressed with `input`: the stick left or right, a spin that way; held back (the
 * brake), a backflip; centred, the racer's own, the `n`-th of their list, turning one way or the other by
 * turns (each time round the list the other way from the last). `dir`: +1 toward the kart's +X (the sim's
 * right), −1 the other way; a flip is always a backflip (−1: the nose comes up at the chase camera and
 * over). Pure.
 */
export function pickStunt(racerId: string, input: Readonly<InputState>, n: number): { kind: StuntKind; dir: 1 | -1 } {
  if (Math.abs(input.steer) >= STUNT.stick) return { kind: 'spin', dir: input.steer > 0 ? 1 : -1 };
  if (input.brake >= STUNT.back) return { kind: 'flip', dir: -1 };
  const list = RACER_STUNTS[racerId] ?? DEFAULT_STUNTS;
  const i = Math.max(0, Math.floor(n));
  const kind = list[i % list.length];
  const odd = (i % 2 === 1) !== (Math.floor(i / list.length) % 2 === 1);
  return { kind, dir: kind === 'flip' ? -1 : odd ? -1 : 1 };
}

const wrap01 = (t: number) => ((t % 1) + 1) % 1;

/**
 * Seconds until a kart in the air touches down, forecast from this tick (render only: the sim never
 * reads it): its fall under the sim's own `gravity` against the road ahead of it along the course at its
 * speed, a ramp's or a bump's own rise included (ground.ts jumpLift), landing as the sim lands (within
 * stickHeight over the road, no longer rising faster than landVy). With no track (a menu), the height it
 * took off from. Past a cliff's edge there is no road; nothing found within lookAhead: lookAhead.
 */
export function airLeft(s: Readonly<KartState>, track: TrackQuery | null, gravity: number): number {
  const S = STUNT, y0 = s.position[1], vy = s.verticalVelocity, g = Math.max(1e-3, gravity);
  if (!track) {
    const h = Math.max(0, y0 - s.airborne.lineY);
    return Math.min(S.lookAhead, (vy + Math.sqrt(vy * vy + 2 * g * h)) / g);
  }
  const L = Math.max(1e-6, track.length);
  const lat = lateralOffset(track, s.t, s.position, s.branch).lateral;
  for (let tau = S.step; tau <= S.lookAhead; tau += S.step) {
    if (vy - g * tau > S.landVy) continue; // still rising: no touchdown yet
    const t = wrap01(s.t + (Math.max(0, s.speed) * tau) / L);
    const at = track.sample(t, lat, s.branch);
    if (at.overCliff || !Number.isFinite(at.groundY)) continue;
    const ground = at.groundY + (track.jumps.length ? jumpLift(track, t, s.branch, lat, at.halfWidth, at.open ?? 0) : 0);
    if (y0 + vy * tau - 0.5 * g * tau * tau <= ground + S.stickHeight) return tau;
  }
  return S.lookAhead;
}

/**
 * How long a stunt with `air` s of flight left runs, and whether it is a whole turn: a whole turn over the
 * air less the margin, never longer than maxSeconds; under minSeconds a flick instead, over what there is
 * (at least flickMin). Pure.
 */
export function stuntSeconds(air: number): { seconds: number; whole: boolean } {
  const S = STUNT, room = air - S.margin;
  if (room >= S.minSeconds) return { seconds: Math.min(S.maxSeconds, room), whole: true };
  return { seconds: Math.max(S.flickMin, room), whole: false };
}

/** A smooth 0..1 over 0..1 that starts and ends at rest (quintic smootherstep): the turn winds up, whips round and settles. */
export function stuntEase(u: number): number {
  const x = u <= 0 ? 0 : u >= 1 ? 1 : u;
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** A stunt's angles and rise at one instant (rad and m; the kart's frame: + roll lifts +X, + pitch dips the nose, + yaw turns the nose to +X). */
export interface StuntPose { roll: number; pitch: number; yaw: number; lift: number }

/**
 * A stunt's pose `u` (0..1) of the way through, into `out`: a whole turn of `kind` toward `dir`, or a flick
 * over and back; the kart rises a little over its middle, and a spin banks into its turn. Pure.
 */
export function stuntPose(kind: StuntKind, dir: 1 | -1, u: number, out: StuntPose): StuntPose {
  const S = STUNT, k = u <= 0 ? 0 : u >= 1 ? 1 : u;
  const turn = 2 * Math.PI * stuntEase(k), hump = Math.sin(Math.PI * k);
  out.roll = 0; out.pitch = 0; out.yaw = 0;
  out.lift = S.lift * hump;
  switch (kind) {
    // toward +X: the nose swings right and the kart banks into it (the right side down)
    case 'spin': out.yaw = dir * turn; out.roll = -dir * S.spinBank * hump; break;
    // toward +X: the right side goes down first and the kart rolls on over its roof
    case 'roll': out.roll = -dir * turn; break;
    // −1 a backflip: the nose comes up and over
    case 'flip': out.pitch = dir * turn; break;
    case 'flick': out.roll = -dir * S.flick * hump; out.lift *= 0.5; break;
  }
  return out;
}

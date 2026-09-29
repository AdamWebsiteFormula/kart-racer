// A trick's stunt in the air (stunt.ts, anim.ts; second MKW gap review, 28 Sept 2026, item 4): which stunt,
// how long, its pose, the flight forecast, and that the kart animation turns it whole and lands it upright.
import { describe, expect, it } from 'vitest';
import { KartAnim, newPose } from './anim.ts';
import { makeConstants } from './constants.ts';
import { SIM_DT } from './step.ts';
import { airLeft, DEFAULT_STUNTS, pickStunt, RACER_STUNTS, STUNT, stuntEase, stuntPose, stuntSeconds, type StuntPose } from './stunt.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartState, type TrackQuery, type TrackSample } from './types.ts';

const c = makeConstants('medium', 150);
const TAU = 2 * Math.PI;
const upright = (a: number) => Math.abs(a - Math.round(a / TAU) * TAU);

/** A straight, flat course along +Z at height `y` (or rising `slope` m per m), long enough never to wrap in a test. */
function flat(y = 0, slope = 0): TrackQuery {
  const length = 10000;
  return {
    length, jumps: [], boostPads: [], voidY: -100,
    sample: (t: number, lateral: number): TrackSample => ({
      position: [lateral, y + slope * t * length, t * length], tangent: [0, 0, 1], normal: [0, 1, 0],
      groundY: y + slope * t * length, halfWidth: 8, surface: 'road', gripScale: 1,
    }),
    nearestT: () => 0,
    nearest: (_p, hint) => hint,
  };
}

/** A kart launched off the road at `vy` m/s at `speed`, heading +Z, `h` m over the road. */
function launched(vy: number, speed = 20, h = 0, racerId = 'juniper'): KartState {
  const s = createKartState({ racerId, position: [0, h, 100] });
  s.t = 100 / 10000;
  s.speed = speed;
  s.verticalVelocity = vy;
  s.grounded = false;
  return s;
}

describe('which stunt (MKW: the stick left or right a spin that way, held back a backflip, centred the racer\'s own)', () => {
  it('the stick picks a spin its way; the brake a backflip', () => {
    expect(pickStunt('pip', { ...NEUTRAL_INPUT, steer: 0.8 }, 0)).toEqual({ kind: 'spin', dir: 1 });
    expect(pickStunt('pip', { ...NEUTRAL_INPUT, steer: -1 }, 3)).toEqual({ kind: 'spin', dir: -1 });
    expect(pickStunt('gus', { ...NEUTRAL_INPUT, brake: 1 }, 0)).toEqual({ kind: 'flip', dir: -1 });
    // a light touch of the stick is still centred
    expect(pickStunt('juniper', { ...NEUTRAL_INPUT, steer: 0.3 }, 0).kind).toBe(RACER_STUNTS.juniper[0]);
  });

  it('centred: each racer\'s own, taken in turn, every one of the eight with a list of its own, turning each way by turns', () => {
    for (const id of ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus']) {
      const list = RACER_STUNTS[id];
      expect(list, id).toBeDefined();
      expect(new Set(list).size, `${id}: more than one stunt`).toBeGreaterThan(1);
      for (let n = 0; n < 2 * list.length; n++) expect(pickStunt(id, NEUTRAL_INPUT, n).kind).toBe(list[n % list.length]);
    }
    expect(pickStunt('someone-new', NEUTRAL_INPUT, 1).kind).toBe(DEFAULT_STUNTS[1]);
    // the same stunt comes round again the other way (Momo: roll, spin, roll the other way, spin the other way)
    for (const id of ['momo', 'pip', 'otto']) {
      const rolls = Array.from({ length: 8 }, (_, n) => pickStunt(id, NEUTRAL_INPUT, n)).filter((p) => p.kind === 'roll');
      expect(new Set(rolls.map((p) => p.dir)).size, id).toBe(2);
    }
    // a flip is always a backflip: the nose comes up at the chase camera
    for (let n = 0; n < 6; n++) { const p = pickStunt('gus', NEUTRAL_INPUT, n); if (p.kind === 'flip') expect(p.dir).toBe(-1); }
  });
});

describe('how long: a whole turn over the flight, done a moment before the wheels touch', () => {
  it('a long flight: one whole turn in MKW\'s time (about 0.4 s), no longer', () => {
    expect(stuntSeconds(1.2)).toEqual({ seconds: STUNT.maxSeconds, whole: true });
    expect(STUNT.maxSeconds).toBeGreaterThanOrEqual(0.35);
    expect(STUNT.maxSeconds).toBeLessThanOrEqual(0.45);
  });

  it('a shorter one: a whole turn squeezed to fit, the margin kept; too short: a flick over and back', () => {
    const p = stuntSeconds(0.34);
    expect(p.whole).toBe(true);
    expect(p.seconds).toBeCloseTo(0.34 - STUNT.margin, 9);
    expect(stuntSeconds(STUNT.minSeconds + STUNT.margin - 0.01).whole).toBe(false);
    expect(stuntSeconds(0.2).seconds).toBeCloseTo(0.2 - STUNT.margin, 9);
    expect(stuntSeconds(0.02)).toEqual({ seconds: STUNT.flickMin, whole: false });
  });
});

describe('the pose: a whole turn about one axis, rising a little over its middle', () => {
  const out: StuntPose = { roll: 0, pitch: 0, yaw: 0, lift: 0 };
  it('starts and ends at rest (a smooth ease), whole', () => {
    expect(stuntEase(0)).toBe(0);
    expect(stuntEase(1)).toBe(1);
    expect(stuntEase(0.5)).toBeCloseTo(0.5, 9);
    for (const kind of ['spin', 'roll', 'flip'] as const) {
      stuntPose(kind, 1, 0, out);
      expect(Math.abs(out.roll) + Math.abs(out.pitch) + Math.abs(out.yaw) + Math.abs(out.lift)).toBe(0);
      stuntPose(kind, 1, 1, out);
      expect(Math.abs(out.roll) + Math.abs(out.pitch) + Math.abs(out.yaw), kind).toBeCloseTo(TAU, 9);
      expect(out.lift).toBeCloseTo(0, 9);
      stuntPose(kind, 1, 0.5, out);
      expect(out.lift).toBeCloseTo(STUNT.lift, 9);
    }
  });

  it('the axes and ways: a spin turns the nose to its side and banks into it; a roll goes over its side; a backflip lifts the nose', () => {
    stuntPose('spin', 1, 0.25, out);
    expect(out.yaw).toBeGreaterThan(0);
    expect(out.roll).toBeLessThan(0);
    stuntPose('roll', -1, 0.25, out);
    expect(out.roll).toBeGreaterThan(0);
    stuntPose('flip', -1, 0.25, out);
    expect(out.pitch).toBeLessThan(0);
    // a flick tips over and comes back
    stuntPose('flick', 1, 0.5, out);
    expect(Math.abs(out.roll)).toBeCloseTo(STUNT.flick, 9);
    stuntPose('flick', 1, 1, out);
    expect(out.roll).toBeCloseTo(0, 9);
  });
});

describe('the flight forecast (render only)', () => {
  it('over flat road: the fall under the sim\'s gravity, to a tick', () => {
    const g = c.gravity;
    for (const vy of [3.25, 5, 6, 14]) {
      const s = launched(vy);
      expect(airLeft(s, flat(), g), `vy ${vy}`).toBeCloseTo((2 * vy) / g, 1);
      // no track: the ground it took off from
      expect(airLeft(s, null, g)).toBeCloseTo((2 * vy) / g, 6);
    }
  });

  it('over a road that falls away the flight is longer, one that rises shorter; nothing below: the most it looks ahead', () => {
    const g = c.gravity, s = launched(5, 20);
    const level = airLeft(s, flat(), g);
    expect(airLeft(s, flat(0, -0.3), g)).toBeGreaterThan(level + 0.05);
    expect(airLeft(s, flat(0, 0.3), g)).toBeLessThan(level - 0.05);
    const s2 = launched(5, 20, 0);
    s2.position[1] = 0;
    expect(airLeft(s2, flat(-1000), g)).toBe(STUNT.lookAhead);
  });
});

/** Flies a kart ballistically over `track` (flat), a trick pressed at `pressAt` s, the animation ticked; its pose each tick. */
function fly(vy: number, pressAt: number, input: InputState = NEUTRAL_INPUT, racerId = 'juniper', reduced = false) {
  const track = flat(), a = new KartAnim(c), s = launched(0, 20, 0, racerId);
  s.grounded = true;
  const poses: { t: number; roll: number; pitch: number; yaw: number; lift: number; air: boolean; stunt: string | null }[] = [];
  const pose = newPose();
  let landedAt = -1;
  for (let i = 0; i < 400; i++) {
    const t = i * SIM_DT;
    if (i === 10) { s.grounded = false; s.verticalVelocity = vy; }
    if (!s.grounded) {
      s.verticalVelocity -= c.gravity * SIM_DT;
      s.position[1] += s.verticalVelocity * SIM_DT;
      if (s.position[1] <= 0 && s.verticalVelocity < 0) { s.position[1] = 0; s.verticalVelocity = 0; s.grounded = true; s.airborne.trickQueued = false; landedAt = t; }
      else if (t >= 10 * SIM_DT + pressAt) s.airborne.trickQueued = true;
    }
    s.position[2] += s.speed * SIM_DT;
    s.t = s.position[2] / track.length;
    a.tick(s, input, SIM_DT, undefined, track);
    a.pose(1, reduced, pose);
    poses.push({ t, roll: pose.stuntRoll, pitch: pose.stuntPitch, yaw: pose.stuntYaw, lift: pose.stuntLift, air: !s.grounded, stunt: a.stuntKind });
  }
  return { poses, landedAt };
}

describe('the kart animation\'s stunt (anim.ts): whole in the air, upright as it lands, never unwinding', () => {
  it('off a ramp (5 m/s: 0.38 s of air), pressed at the lip: one whole turn, done before the wheels touch', () => {
    const { poses, landedAt } = fly(5, 0);
    const air = poses.filter((p) => p.air);
    const most = Math.max(...air.map((p) => Math.abs(p.roll) + Math.abs(p.pitch) + Math.abs(p.yaw)));
    expect(most).toBeGreaterThan(0.9 * TAU);
    const land = poses.find((p) => p.t >= landedAt)!;
    expect(upright(land.roll) + upright(land.pitch) + upright(land.yaw)).toBeLessThan(1e-9);
    expect(land.stunt).toBeNull();
    // the last airborne ticks already upright: it was done before the touchdown
    const last = air[air.length - 1];
    expect(Math.abs(last.roll) + Math.abs(last.pitch) + Math.abs(last.yaw)).toBeLessThan(0.05);
  });

  it('once done it drops its whole turn from both ends at once: no frame ever unwinds it', () => {
    const { poses } = fly(6, 0);
    for (let i = 1; i < poses.length; i++) {
      const d = Math.abs(poses[i].roll - poses[i - 1].roll) + Math.abs(poses[i].pitch - poses[i - 1].pitch) + Math.abs(poses[i].yaw - poses[i - 1].yaw);
      // a tick's turn at the stunt's fastest (MKW's ~0.4 s whole turn, smootherstep's peak 1.875x) or the drop of a whole turn to 0
      expect(d < 0.4 || Math.abs(d - TAU) < 0.4, `tick ${i}: ${d}`).toBe(true);
    }
  });

  it('pressed late with little air left: a flick over and back, upright as it lands', () => {
    const { poses, landedAt } = fly(5, 0.26);
    const air = poses.filter((p) => p.air && p.stunt);
    expect(air.length).toBeGreaterThan(0);
    expect(air.every((p) => p.stunt === 'flick')).toBe(true);
    const land = poses.find((p) => p.t >= landedAt)!;
    expect(Math.abs(land.roll) + Math.abs(land.pitch) + Math.abs(land.yaw)).toBeLessThan(0.05);
  });

  it('a long flight (a Pogo Spring, 14 m/s): one whole turn, then it rides level to the landing', () => {
    const { poses, landedAt } = fly(14, 0.1);
    const turning = poses.filter((p) => p.stunt !== null);
    expect(turning.length * SIM_DT).toBeLessThanOrEqual(STUNT.maxSeconds + 2 * SIM_DT);
    expect(poses.filter((p) => p.air && p.t > landedAt - 0.4).every((p) => p.stunt === null)).toBe(true);
  });

  it('the stick to the right spins it to the right; reduced motion only tips it', () => {
    const right = fly(6, 0, { ...NEUTRAL_INPUT, steer: 1 });
    expect(Math.max(...right.poses.map((p) => p.yaw))).toBeGreaterThan(0.9 * TAU);
    const calm = fly(6, 0, NEUTRAL_INPUT, 'juniper', true);
    expect(Math.max(...calm.poses.map((p) => Math.abs(p.roll) + Math.abs(p.pitch) + Math.abs(p.yaw)))).toBeLessThanOrEqual(STUNT.reducedTip + 1e-9);
  });
});

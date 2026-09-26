// The rigged driver's animation (driverAnim.ts): the wheels' roll, where the eyes go (the camera, a
// rival, a look back, idle glances) and how far, the arms leaving the wheel for a hit, a trick, an
// item and the finish, and that it only reads the sim.
import { describe, expect, it } from 'vitest';
import { KartAnim, type Reaction } from './anim.ts';
import { makeConstants } from './constants.ts';
import {
  bearing, DRIVER_ANIM, DriverAnim, EYE_TIMING, gestureFor, hash01, itemArm, newDriverPose, reactionArms, rivalToWatch, type DriverContext, type DriverPose,
} from './driverAnim.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartState, type Vec3 } from './types.ts';

const c = makeConstants('medium', 150);
const dt = SIM_DT;
const T = DRIVER_ANIM;

/** A kart and its two animations, ticked together as KartView does; `racerId` picks the eyes' own timing too (EYE_TIMING). */
function rig(seed = 0, racerId = 'juniper') {
  const anim = new KartAnim(c, seed), driver = new DriverAnim(seed, undefined, racerId);
  const s = createKartState({ racerId });
  const pose = newDriverPose();
  const tick = (n: number, input: InputState = NEUTRAL_INPUT, ctx?: DriverContext, each?: (i: number) => void): DriverPose => {
    for (let i = 0; i < n; i++) {
      each?.(i);
      s.position[2] += s.speed * dt;
      anim.tick(s, input, dt);
      driver.tick(s, input, dt, anim, ctx);
    }
    return driver.pose(1, false, pose);
  };
  return { anim, driver, s, tick };
}

const at = (x: number, y: number, z: number): Vec3 => [x, y, z];

describe('bearing and the rival to watch', () => {
  it('a point to the kart\'s +X side has a positive yaw, one behind about ±π, one ahead 0; pitch is + below the eyes', () => {
    const k = createKartState({ racerId: 'a', heading: 0 });
    const b = { yaw: 0, pitch: 0, dist: 0 };
    expect(bearing(k, 5, 1.05, -0.05, b).yaw).toBeCloseTo(Math.PI / 2, 3);
    expect(bearing(k, -5, 1.05, -0.05, b).yaw).toBeCloseTo(-Math.PI / 2, 3);
    expect(bearing(k, 0, 1.05, 10, b).yaw).toBeCloseTo(0, 6);
    expect(Math.abs(bearing(k, 0, 1.05, -10, b).yaw)).toBeCloseTo(Math.PI, 3);
    expect(bearing(k, 0, 0, 5, b).pitch).toBeGreaterThan(0);
    expect(bearing(k, 0, 3, 5, b).pitch).toBeLessThan(0);
    // turned: heading π/2 faces +X, so a point further along +X is dead ahead
    const t = createKartState({ racerId: 'a', heading: Math.PI / 2 });
    expect(bearing(t, 10, 1.05, 0, b).yaw).toBeCloseTo(0, 2);
  });

  it('picks the nearest rival close beside or just behind; never one far off, ahead, a ghost or on another level', () => {
    const me = createKartState({ racerId: 'me' });
    const beside = createKartState({ racerId: 'b', position: at(3, 0, 0.5) });
    const behind = createKartState({ racerId: 'c', position: at(0.5, 0, -6) });
    const ahead = createKartState({ racerId: 'd', position: at(0, 0, 6) });
    const far = createKartState({ racerId: 'e', position: at(12, 0, 0) });
    const ghost = createKartState({ racerId: 'f', position: at(1.5, 0, 0), isGhost: true });
    const above = createKartState({ racerId: 'g', position: at(2, 6, 0) });
    expect(rivalToWatch([me, ahead, far, ghost, above], 0)).toBe(-1);
    expect(rivalToWatch([me, behind, ahead], 0)).toBe(1);
    expect(rivalToWatch([me, behind, beside], 0)).toBe(2); // the nearer
  });

  it('hash01 is repeatable and spread over [0, 1)', () => {
    const xs = Array.from({ length: 200 }, (_, i) => hash01(3, i));
    expect(hash01(3, 7)).toBe(hash01(3, 7));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.filter((x) => x < 0.5).length).toBeGreaterThan(70);
    expect(xs.filter((x) => x >= 0.5).length).toBeGreaterThan(70);
  });
});

describe('DriverAnim: the wheels', () => {
  it('roll at speed over their radius, backward in reverse, never past spinMax', () => {
    const r = rig();
    r.driver.radius = 0.29;
    r.s.speed = 5;
    const p = r.tick(120);
    expect(p.spin).toBeCloseTo((5 / 0.29) * 120 * dt, 3);
    const b = rig();
    b.driver.radius = 0.29;
    b.s.speed = -3;
    expect(b.tick(60).spin).toBeCloseTo((-3 / 0.29) * 60 * dt, 3);
    const f = rig();
    f.driver.radius = 0.29;
    f.s.speed = 30;
    expect(f.tick(120).spin).toBeCloseTo(T.spinMax * 120 * dt, 3);
    // interpolated between ticks, and the same with reduced motion
    const mid = f.driver.pose(0.5, true, newDriverPose()).spin;
    expect(mid).toBeCloseTo(T.spinMax * 119.5 * dt, 3);
  });

  it('keeps the angle small over a long race without a jump between frames', () => {
    const r = rig();
    r.driver.radius = 0.3;
    r.s.speed = 25;
    let last = r.tick(1).spin, maxStep = 0;
    for (let i = 0; i < 120 * 60 * 3; i++) {
      const p = r.tick(1);
      const step = p.spin - last;
      if (step > 0) maxStep = Math.max(maxStep, step);
      last = p.spin;
      // between the two ticks the interpolation never unwinds
      const half = r.driver.pose(0.5, false, newDriverPose()).spin;
      expect(Math.abs(half - (r.driver.prev.spin + r.driver.curr.spin) / 2)).toBeLessThan(1e-9);
    }
    expect(Math.abs(last)).toBeLessThan(2e4);
    expect(maxStep).toBeLessThanOrEqual(T.spinMax * dt + 1e-9);
  });
});

describe('DriverAnim: where the eyes go', () => {
  it('turns to the camera when asked, clamped to the head and the spine, and never snaps', () => {
    const r = rig();
    // the camera behind and to the +X side: the head turns that way as far as it can, the spine helps
    const ctx: DriverContext = { eye: at(3, 2.5, -5), faceEye: true, karts: null, self: -1 };
    let last = 0, maxStep = 0;
    const p = r.tick(240, NEUTRAL_INPUT, ctx, () => {
      const y = r.driver.curr.headYaw + r.anim.curr.look + r.driver.curr.spineTwist;
      maxStep = Math.max(maxStep, Math.abs(y - last));
      last = y;
    });
    const total = p.headYaw + r.anim.curr.look + p.spineTwist;
    const want = Math.atan2(3, -5.05);
    expect(total).toBeCloseTo(Math.min(want, T.headMax + T.twistMax), 1);
    expect(p.headYaw + r.anim.curr.look).toBeLessThanOrEqual(T.headMax + 1e-6);
    expect(p.spineTwist).toBeGreaterThan(0.1);
    expect(p.headPitch).toBeLessThan(0); // the camera is above the eyes
    expect(maxStep).toBeLessThanOrEqual((T.headSpeed + T.twistSpeed) * dt + 1e-9); // springs with a top speed: never a snap
  });

  it('looks straight back over one shoulder and does not flip sides while it does', () => {
    const r = rig();
    const ctx: DriverContext = { eye: at(0.01, 2, -6), faceEye: true, karts: null, self: -1 };
    r.tick(200, NEUTRAL_INPUT, ctx);
    const side = Math.sign(r.driver.curr.headYaw + r.driver.curr.spineTwist);
    for (let i = 0; i < 60; i++) {
      ctx.eye = at(i % 2 ? 0.02 : -0.02, 2, -6); // wobbling across dead astern
      r.tick(1, NEUTRAL_INPUT, ctx);
      expect(Math.sign(r.driver.curr.headYaw + r.driver.curr.spineTwist)).toBe(side);
    }
  });

  it('glances at a rival close beside for a moment, then not again for a while', () => {
    const r = rig(4);
    r.s.speed = 20;
    const rival = createKartState({ racerId: 'x', position: at(-3, 0, 0.5) });
    const ctx: DriverContext = { eye: null, faceEye: false, karts: [r.s, rival], self: 0 };
    let looked = 0, first = -1, back = -1;
    r.tick(900, { ...NEUTRAL_INPUT, throttle: 1 }, ctx, (i) => {
      rival.position[2] = r.s.position[2] + 0.5; // keeps pace beside
      const y = r.driver.curr.headYaw;
      if (y < -0.5) { looked++; if (first < 0) first = i; } else if (first >= 0 && back < 0 && y > -0.1) back = i;
    });
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(120); // soon
    expect(back - first).toBeLessThan((T.rival.hold + 0.8) / dt); // and back after about `hold`
    expect(looked).toBeLessThan(900 * 0.6); // not the whole time
  });

  it('looks back over the shoulder with the look-back button', () => {
    const r = rig();
    const p = r.tick(240, { ...NEUTRAL_INPUT, lookBack: true, steer: -1 });
    expect(p.headYaw + r.anim.curr.look + p.spineTwist).toBeLessThan(-T.headMax);
  });

  it('glances about now and then on a straight, small and brief', () => {
    const r = rig(2);
    r.s.speed = 20;
    let most = 0, off = 0;
    r.tick(120 * 20, { ...NEUTRAL_INPUT, throttle: 1 }, undefined, () => {
      const y = Math.abs(r.driver.curr.headYaw);
      most = Math.max(most, y);
      if (y > 0.15) off++;
    });
    expect(most).toBeGreaterThan(T.glance.yaw[0] * 0.7);
    expect(most).toBeLessThan(T.glance.yaw[1] * 1.3);
    expect(off / (120 * 20)).toBeLessThan(0.35);
  });
});

describe('DriverAnim: body and arms', () => {
  it('leans forward on the gas and back on a boost', () => {
    const gas = rig().tick(240, { ...NEUTRAL_INPUT, throttle: 1 });
    expect(gas.spinePitch).toBeGreaterThan(T.throttleLean * 0.8);
    const b = rig();
    b.s.boost = { source: 'item', remaining: 5, multiplier: 1.4 };
    expect(b.tick(240, { ...NEUTRAL_INPUT, throttle: 1 }).spinePitch).toBeLessThan(0);
  });

  it('a hit throws both arms off the wheel while the kart spins, and puts them back once it is done', () => {
    const r = rig();
    r.s.status.spinRemaining = 1;
    let off = 1;
    const spin = () => { r.s.status.spinRemaining = Math.max(0, r.s.status.spinRemaining - dt); };
    r.tick(100, NEUTRAL_INPUT, undefined, () => { spin(); off = Math.min(off, r.driver.curr.armR.wheel); });
    expect(off).toBeLessThan(0.1);
    expect(r.driver.curr.armL.upper[1]).toBeGreaterThan(0.5); // up
    r.tick(160, NEUTRAL_INPUT, undefined, spin);
    expect(r.driver.curr.armR.wheel).toBeGreaterThan(0.95);
    expect(r.driver.curr.armL.wheel).toBeGreaterThan(0.95);
  });

  it('an item: the right arm throws it forward (or tosses it back), then takes the wheel again', () => {
    expect(gestureFor('forward', false)).toBe('throw');
    expect(gestureFor('forward', true)).toBe('toss');
    expect(gestureFor('rearDrop', false)).toBe('toss');
    expect(gestureFor('speed', false)).toBe('raise');
    const r = rig();
    r.driver.itemUsed('throw');
    let off = 1, forward = 0;
    r.tick(Math.round(T.throwSeconds / dt), NEUTRAL_INPUT, undefined, () => { off = Math.min(off, r.driver.curr.armR.wheel); forward = Math.max(forward, r.driver.curr.armR.fore[2]); });
    expect(off).toBeLessThan(0.2);
    expect(forward).toBeGreaterThan(0.9); // the forearm swings out ahead
    expect(r.driver.curr.armL.wheel).toBeGreaterThan(0.99); // the other hand drives
    r.tick(60);
    expect(r.driver.curr.armR.wheel).toBeGreaterThan(0.95);
    // the throw winds up behind the head first
    const a = newDriverPose().armR;
    itemArm('throw', 0.1 * T.throwSeconds, a);
    expect(a.upper[2]).toBeLessThan(0);
  });

  it('the finish: arms up and pumping for the champion, a wave for 2nd, palms up for a shrug, hands on the wheel when deflated', () => {
    const arms = (k: Reaction, t: number) => { const R = newDriverPose().armR, L = newDriverPose().armL; reactionArms(k, t, R, L, 3); return { R, L }; };
    expect(arms('champion', 0.6).R.wheel).toBe(0);
    expect(arms('champion', 0.6).R.upper[1]).toBeGreaterThan(0.8);
    const pumps = [1.4, 1.5, 1.6, 1.7].map((t) => arms('champion', t).R.upper[1]);
    expect(Math.max(...pumps) - Math.min(...pumps)).toBeGreaterThan(0.3);
    const waves = [1.2, 1.4, 1.6, 1.8].map((t) => arms('cheer', t).R.fore[0]);
    expect(Math.max(...waves) - Math.min(...waves)).toBeGreaterThan(0.3);
    expect(arms('cheer', 1.4).L.wheel).toBe(1);
    expect(arms('shrug', 0.5).R.wheel).toBe(0);
    expect(arms('deflated', 1).R.wheel).toBe(1);
    // through KartAnim: the reaction drives the arms and the look faces the camera
    const r = rig();
    r.anim.react('champion');
    const p = r.tick(Math.round(1.6 / dt), NEUTRAL_INPUT, { eye: at(0, 1.5, 4), faceEye: false, karts: null, self: -1 });
    expect(p.armR.wheel).toBeLessThan(0.1);
    expect(Math.abs(p.headYaw + r.anim.curr.look)).toBeLessThan(0.3); // the camera is dead ahead
  });

  it('never writes the kart state or the input, and a tick of no time moves nothing', () => {
    const r = rig();
    r.s.speed = 12;
    const frozen = structuredClone(r.s) as KartState;
    const deep = <T>(o: T): T => { Object.freeze(o); for (const v of Object.values(o as object)) if (v && typeof v === 'object') deep(v); return o; };
    deep(frozen);
    const input = deep({ ...NEUTRAL_INPUT, throttle: 1, steer: 0.4 });
    const ctx = deep({ eye: at(1, 2, -4), faceEye: true, karts: [frozen], self: 0 } as DriverContext);
    const anim = new KartAnim(c), d = new DriverAnim();
    for (let i = 0; i < 50; i++) { anim.tick(frozen, input, dt); d.tick(frozen, input, dt, anim, ctx); }
    const before = JSON.stringify(d.curr);
    d.tick(frozen, input, 0, anim, ctx);
    expect(JSON.stringify(d.curr)).toBe(before);
    expect(Number.isFinite(d.curr.headYaw)).toBe(true);
  });
});

describe('DriverAnim: the eyes', () => {
  it('blinks now and then while idling: deterministic per seed, bounded, and not the same seed twice over', () => {
    const sample = (seed: number, ticks: number) => {
      const r = rig(seed);
      const out: number[] = [];
      r.tick(ticks, NEUTRAL_INPUT, undefined, () => out.push(r.driver.curr.eyelid));
      return out;
    };
    const a = sample(11, 120 * 20), b = sample(11, 120 * 20), c2 = sample(12, 120 * 20);
    expect(a).toEqual(b); // same seed, same render clock: byte for byte
    expect(a).not.toEqual(c2); // a different seed blinks at different moments
    for (const v of a) { expect(v).toBeLessThanOrEqual(1 + 1e-6); expect(v).toBeGreaterThanOrEqual(-1); }
    // at least one full blink (near 1) and mostly open in between, over 20 s at DRIVER_ANIM.blink.every [2.6, 6.4]
    expect(Math.max(...a)).toBeGreaterThan(0.9);
    expect(a.filter((v) => v > 0.5).length / a.length).toBeLessThan(0.15);
  });

  it('a racer\'s own timing (EYE_TIMING) changes how it blinks: Momo\'s own hold (2.4x) outweighs her rarer rate (1.7x), so over many blinks she spends more of her time fully shut than Juniper\'s default eyes', () => {
    const shutFraction = (racerId: string, seed: number) => {
      const r = rig(seed, racerId);
      let shut = 0, n = 0;
      r.tick(120 * 60, NEUTRAL_INPUT, undefined, () => { n++; if (r.driver.curr.eyelid > 0.99) shut++; });
      return shut / n;
    };
    expect(shutFraction('momo', 3)).toBeGreaterThan(shutFraction('juniper', 3));
  });

  it('squints on a boost, held near EYE_TIMING\'s own amount once eased in', () => {
    const r = rig();
    r.s.boost = { source: 'item', remaining: 5, multiplier: 1.4 };
    let minLate = 1;
    r.tick(120, { ...NEUTRAL_INPUT, throttle: 1 }, undefined, (i) => { if (i > 90) minLate = Math.min(minLate, r.driver.curr.eyelid); });
    expect(minLate).toBeGreaterThan(T.blink.squint * 0.7);
  });

  it('a joyful finish reaction squints too; a shrug or a deflated one does not', () => {
    const r = rig();
    r.anim.react('champion');
    let minLate = 1;
    r.tick(90, NEUTRAL_INPUT, undefined, (i) => { if (i > 60) minLate = Math.min(minLate, r.driver.curr.eyelid); });
    expect(minLate).toBeGreaterThan(0.1);
    const d = rig();
    d.anim.react('deflated');
    let maxLate = -1;
    d.tick(90, NEUTRAL_INPUT, undefined, (i) => { if (i > 60) maxLate = Math.max(maxLate, d.driver.curr.eyelid); });
    expect(maxLate).toBeLessThan(0.15);
  });

  it('wide eyes through a hit or a spin, easing back to neutral once wideHold has passed', () => {
    const r = rig();
    r.s.status.spinRemaining = 0.2; // a short spin: it clearly ends inside this test's own window
    let duringSpin = 1;
    // an epsilon snap, as every countdown timer in the sim needs (kart-controller SOP Lessons, 2026-09-15):
    // repeated subtraction lands on a tiny positive residue, not exactly 0, and `spinning` reads it as still spinning
    const spin = () => { r.s.status.spinRemaining = Math.max(0, r.s.status.spinRemaining - dt); if (r.s.status.spinRemaining < 1e-9) r.s.status.spinRemaining = 0; };
    r.tick(Math.round(0.2 / dt), NEUTRAL_INPUT, undefined, () => { spin(); duringSpin = Math.min(duringSpin, r.driver.curr.eyelid); });
    expect(duringSpin).toBeLessThan(T.blink.wide * 0.6); // clearly wide (negative), not neutral
    // wideHold (0.5 s) plus room for the ease (1/easeRate ≈ 0.07 s) to settle back near neutral
    r.tick(Math.round((T.blink.wideHold + 0.4) / dt));
    // well past wideHold now: sample a short window and take the least (a blink can only push it up, never down)
    let recovered = 1;
    r.tick(30, NEUTRAL_INPUT, undefined, () => { recovered = Math.min(recovered, r.driver.curr.eyelid); });
    expect(recovered).toBeGreaterThan(T.blink.wide * 0.3);
  });

  it('a hard landing wrings the eyes shut for a moment (a wince), gentler hops do not', () => {
    const r = rig();
    r.s.grounded = false;
    r.s.verticalVelocity = -12; // falling fast, past landMinFall
    r.tick(10); // a few airborne ticks so the fall speed is on record
    r.s.grounded = true; // touches down this tick
    let peak = 0;
    r.tick(30, NEUTRAL_INPUT, undefined, () => { peak = Math.max(peak, r.driver.curr.eyelid); });
    expect(peak).toBeGreaterThan(0.9);

    const hop = rig();
    hop.s.grounded = false;
    hop.s.verticalVelocity = -1.5; // a gentle hop's landing: under landMinFall
    hop.tick(10);
    hop.s.grounded = true;
    let peakHop = 0;
    hop.tick(30, NEUTRAL_INPUT, undefined, () => { peakHop = Math.max(peakHop, hop.driver.curr.eyelid); });
    expect(peakHop).toBeLessThan(0.5);
  });

  it('Sprocket\'s shutter never idle-blinks, but still reacts (dims) to a hit, the opposite sign of an organic racer\'s wide eyes', () => {
    expect(EYE_TIMING.sprocket?.noIdle).toBe(true);
    const s = rig(9, 'sprocket');
    let maxIdle = 0;
    s.tick(120 * 20, NEUTRAL_INPUT, undefined, () => { maxIdle = Math.max(maxIdle, s.driver.curr.eyelid); });
    expect(maxIdle).toBeLessThan(0.05); // no idle blink at all over 20 s
    s.s.status.spinRemaining = 1;
    let duringHit = 0;
    s.tick(30, NEUTRAL_INPUT, undefined, () => { duringHit = Math.max(duringHit, s.driver.curr.eyelid); });
    expect(duringHit).toBeGreaterThan((EYE_TIMING.sprocket?.wide ?? 0) * 0.5); // positive (dims), not negative like an organic racer's wide eyes
  });

  it('never writes the kart state, and reduced motion leaves it untouched (it is not a flourish)', () => {
    const r = rig(), reduced = rig();
    r.s.speed = 10; reduced.s.speed = 10;
    const pFull = r.tick(150, { ...NEUTRAL_INPUT, throttle: 1 });
    const pReduced = newDriverPose();
    for (let i = 0; i < 150; i++) {
      reduced.s.position[2] += reduced.s.speed * dt;
      reduced.anim.tick(reduced.s, { ...NEUTRAL_INPUT, throttle: 1 }, dt);
      reduced.driver.tick(reduced.s, { ...NEUTRAL_INPUT, throttle: 1 }, dt, reduced.anim);
    }
    reduced.driver.pose(1, true, pReduced);
    expect(pReduced.eyelid).toBeCloseTo(pFull.eyelid, 9);
  });
});

// The rigged driver's animation (driverAnim.ts): the wheels' roll, where the eyes go (the camera, a
// rival, a look back, idle glances) and how far, the arms leaving the wheel for a hit, a trick, an
// item and the finish, and that it only reads the sim.
import { describe, expect, it } from 'vitest';
import { KartAnim, SAD_BEATS, type Reaction } from './anim.ts';
import { makeConstants } from './constants.ts';
import {
  bearing, DRIVER_ANIM, DriverAnim, gestureFor, hash01, itemArm, newDriverPose, reactionArms, rivalToWatch, SAD_HANDS, sadBody, type DriverContext, type DriverPose, type SadBody,
} from './driverAnim.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartState, type Vec3 } from './types.ts';

const c = makeConstants('medium', 150);
const dt = SIM_DT;
const T = DRIVER_ANIM;

/** A kart and its two animations, ticked together as KartView does. */
function rig(seed = 0) {
  const anim = new KartAnim(c, seed), driver = new DriverAnim(seed);
  const s = createKartState({ racerId: 'juniper' });
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

  it('the finish: arms up and pumping for the champion, a wave for 2nd, palms up for a shrug, one hand on the wheel when deflated', () => {
    const arms = (k: Reaction, t: number) => { const R = newDriverPose().armR, L = newDriverPose().armL; reactionArms(k, t, R, L, 3); return { R, L }; };
    expect(arms('champion', 0.6).R.wheel).toBe(0);
    expect(arms('champion', 0.6).R.upper[1]).toBeGreaterThan(0.8);
    const pumps = [1.4, 1.5, 1.6, 1.7].map((t) => arms('champion', t).R.upper[1]);
    expect(Math.max(...pumps) - Math.min(...pumps)).toBeGreaterThan(0.3);
    const waves = [1.2, 1.4, 1.6, 1.8].map((t) => arms('cheer', t).R.fore[0]);
    expect(Math.max(...waves) - Math.min(...waves)).toBeGreaterThan(0.3);
    expect(arms('cheer', 1.4).L.wheel).toBe(1);
    expect(arms('shrug', 0.5).R.wheel).toBe(0);
    expect(arms('deflated', 1).L.wheel).toBe(1);
    // through KartAnim: the reaction drives the arms and the look faces the camera
    const r = rig();
    r.anim.react('champion');
    const p = r.tick(Math.round(1.6 / dt), NEUTRAL_INPUT, { eye: at(0, 1.5, 4), faceEye: false, karts: null, self: -1 });
    expect(p.armR.wheel).toBeLessThan(0.1);
    expect(Math.abs(p.headYaw + r.anim.curr.look)).toBeLessThan(0.3); // the camera is dead ahead
  });

  it('4th and below: sigh pulls a fist down ("darn!"); deflated puts a hand over the brow (the hand nearer the camera); dejected slumps over the wheel; all clap', () => {
    const arms = (k: Reaction, t: number, near: 1 | -1 = 1) => { const R = newDriverPose().armR, L = newDriverPose().armL; reactionArms(k, t, R, L, 4, near); return { R, L }; };
    // sigh: the fist up by the face, then pulled down, then back on the wheel
    const S = SAD_BEATS.sigh;
    const up = arms('sigh', S.tap - 0.2);
    expect(up.R.wheel).toBe(0);
    expect(up.R.fore[1]).toBeGreaterThan(0.8); // the forearm up: the fist by the face
    expect(up.L.wheel).toBe(1);
    const down = arms('sigh', S.tap + 0.15);
    expect(down.R.wheel).toBe(0);
    expect(down.R.fore[1]).toBeLessThan(0); // pulled down
    expect(arms('sigh', S.tap + 0.35).R.wheel).toBe(1);
    // the camera on the left's side: the left hand does it
    expect(arms('sigh', S.tap - 0.2, -1).L.wheel).toBe(0);
    expect(arms('sigh', S.tap - 0.2, -1).R.wheel).toBe(1);
    // deflated: a hand over the brow and the eyes through the shake, the other keeps the wheel: the elbow forward,
    // the forearm up and in across the face and back toward it (27 Sept 2026: the elbow out and up at the temple
    // read as a salute from the finish camera)
    const palm = arms('deflated', 1.6, -1);
    expect(palm.L.wheel).toBe(0);
    expect(palm.L.upper[2]).toBeGreaterThan(0.8); // the elbow forward, in front of the chest
    expect(Math.abs(palm.L.upper[0])).toBeLessThan(0.45); // not out to the side
    expect(palm.L.fore[0]).toBeGreaterThan(0.5); // the forearm in, across the face (the right arm's frame; the caller mirrors)
    expect(palm.L.fore[1]).toBeGreaterThan(0.5); // and up to the brow
    expect(palm.L.fore[2]).toBeLessThan(0); // and back toward the face
    expect(palm.R.wheel).toBe(1);
    expect(arms('deflated', 1.6).R.wheel).toBe(0);
    // Sprocket (SAD_HANDS): both hands up on top of the head, where they show over his steering wheel
    expect(SAD_HANDS.sprocket).toBe('head');
    expect(SAD_HANDS.nova).toBeUndefined();
    const R2 = newDriverPose().armR, L2 = newDriverPose().armL;
    reactionArms('deflated', 1.6, R2, L2, 4, 1, 'head');
    for (const a of [R2, L2]) { expect(a.wheel).toBe(0); expect(a.upper[1]).toBeGreaterThan(0.8); expect(a.fore[1]).toBeGreaterThan(0.85); }
    // dejected: both hands keep the wheel as the body slumps over it (the elbows fold: the IK)
    const over = arms('dejected', 2);
    expect(over.R.wheel + over.L.wheel).toBe(2);
    // every one claps: both hands off the wheel, the forearms swinging in and out, then the wheel again
    for (const k of ['sigh', 'deflated', 'dejected'] as const) {
      const c = SAD_BEATS[k].clap;
      const ins = [0, 0.1, 0.2, 0.3, 0.4].map((u) => arms(k, c[0] + u).R.fore[0]);
      expect(Math.max(...ins) - Math.min(...ins), k).toBeGreaterThan(0.4);
      expect(arms(k, c[0] + 0.3).L.wheel, k).toBe(0);
      expect(arms(k, c[1] + 0.2).R.wheel, k).toBe(1);
    }
  });

  it('4th and below: the body slumps and the shoulders sag, more toward the back; the eyes stay down until the chin comes up', () => {
    const b: SadBody = { spine: 0, shoulders: 0, eye: 1 };
    const most = (k: Reaction) => {
      let spine = 0, shoulders = 0, eye = 0;
      const B = SAD_BEATS[k as 'sigh' | 'deflated' | 'dejected'];
      for (let t = 0; t < B.up[0]; t += dt) { sadBody(k, t, b); spine = Math.max(spine, b.spine); shoulders = Math.min(shoulders, b.shoulders); eye = Math.max(eye, b.eye); }
      return { spine, shoulders, eye };
    };
    const [s, d, j] = (['sigh', 'deflated', 'dejected'] as const).map(most);
    expect(s.spine).toBeLessThan(d.spine);
    expect(d.spine).toBeLessThan(j.spine);
    expect(j.shoulders).toBeLessThan(d.shoulders);
    expect(d.shoulders).toBeLessThan(0);
    for (const m of [s, d, j]) expect(m.eye).toBeLessThan(0.05);
    expect(sadBody('deflated', SAD_BEATS.deflated.clap[0] + 0.2, b).eye).toBeGreaterThan(0.9);
    expect(sadBody('champion', 1, b)).toEqual({ spine: 0, shoulders: 0, eye: 1 });
    // through KartAnim: slumped and not looking at the camera in the shake, then looking at it for the clap
    const r = rig();
    r.anim.react('dejected');
    const eye: DriverContext = { eye: at(0, 1.4, 4.4), faceEye: false, karts: null, self: -1 };
    const low = r.tick(Math.round(2 / dt), NEUTRAL_INPUT, eye);
    expect(low.spinePitch).toBeGreaterThan(0.4); // over the wheel
    expect(low.shrug).toBeLessThan(-0.5);
    expect(Math.abs(low.headPitch)).toBeLessThan(0.05);
    expect(low.armR.wheel + low.armL.wheel).toBeGreaterThan(1.9);
    const clap = r.tick(Math.round((SAD_BEATS.dejected.clap[0] + 0.4 - 2) / dt), NEUTRAL_INPUT, eye);
    expect(clap.spinePitch).toBeLessThan(0.15);
    expect(Math.abs(clap.headYaw + r.anim.curr.look)).toBeLessThan(0.3); // the camera is dead ahead
    expect(clap.armR.wheel).toBeLessThan(0.1);
  });

  it('the hand to the forehead is the one nearer the camera, kept once the move starts', () => {
    for (const side of [1, -1]) {
      const r = rig();
      r.anim.react('deflated');
      // the camera ahead and off to one side (+X is the left's side), crossing over after the hand is up
      const ctx: DriverContext = { eye: at(side * 3, 1.4, 4), faceEye: false, karts: null, self: -1 };
      r.tick(Math.round(1.2 / dt), NEUTRAL_INPUT, ctx);
      ctx.eye = at(-side * 3, 1.4, 4);
      const p = r.tick(Math.round(0.4 / dt), NEUTRAL_INPUT, ctx);
      const near = side > 0 ? p.armL : p.armR, far = side > 0 ? p.armR : p.armL;
      expect(near.wheel, `camera ${side > 0 ? '+X' : '−X'}`).toBeLessThan(0.1);
      expect(far.wheel).toBeGreaterThan(0.9);
    }
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

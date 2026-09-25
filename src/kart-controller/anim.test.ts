// The kart's secondary animation (anim.ts): the spring maths, what each event does to the pose,
// and that it only reads the sim (it never writes the kart state or the input).
import { describe, expect, it } from 'vitest';
import { KART_ANIM, KartAnim, newPose, stepSpring, type AnimPose, type Spring } from './anim.ts';
import { makeConstants } from './constants.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartState } from './types.ts';

const c = makeConstants('medium', 150);
const dt = SIM_DT;
const T = KART_ANIM;

/** A kart driving along +Z at `speed`, turning at `yawRate` (rad/s, + toward +X), for `ticks` ticks; returns the last pose. */
function drive(a: KartAnim, s: KartState, input: InputState, ticks: number, yawRate = 0, each?: (s: KartState, i: number) => void): AnimPose {
  for (let i = 0; i < ticks; i++) {
    s.heading += yawRate * dt;
    s.position[0] += Math.sin(s.heading) * s.speed * dt;
    s.position[2] += Math.cos(s.heading) * s.speed * dt;
    each?.(s, i);
    a.tick(s, input, dt);
  }
  return a.pose(1, false, newPose());
}

function cruising(speed = 25): KartState {
  const s = createKartState({ racerId: 'x' });
  s.speed = speed;
  return s;
}

describe('stepSpring', () => {
  it('settles on its target; under-damped overshoots, critically damped does not', () => {
    const bouncy: Spring = { x: 0, v: 0 }, firm: Spring = { x: 0, v: 0 };
    let peakB = 0, peakF = 0;
    for (let i = 0; i < 240; i++) {
      stepSpring(bouncy, 1, [3, 0.3], dt);
      stepSpring(firm, 1, [3, 1], dt);
      peakB = Math.max(peakB, bouncy.x);
      peakF = Math.max(peakF, firm.x);
    }
    expect(bouncy.x).toBeCloseTo(1, 2);
    expect(firm.x).toBeCloseTo(1, 3);
    // a damping ratio of 0.3 overshoots by about exp(-pi 0.3 / sqrt(1 - 0.09)) = 37 %
    expect(peakB).toBeGreaterThan(1.3);
    expect(peakB).toBeLessThan(1.45);
    expect(peakF).toBeLessThanOrEqual(1 + 1e-6);
  });

  it('stays stable and lands the same at any step size', () => {
    const fine: Spring = { x: 0, v: 3 }, coarse: Spring = { x: 0, v: 3 };
    for (let i = 0; i < 120; i++) stepSpring(fine, 0, [7, 0.85], 1 / 120);
    for (let i = 0; i < 4; i++) stepSpring(coarse, 0, [7, 0.85], 0.25);
    expect(Number.isFinite(coarse.x)).toBe(true);
    expect(Math.abs(coarse.x - fine.x)).toBeLessThan(1e-3);
  });
});

describe('KartAnim: turning and drifting', () => {
  it('a grip turn toward +X leans the body out a few degrees; the driver leans in; head and wheels turn with the stick', () => {
    const a = new KartAnim(c);
    const p = drive(a, cruising(), { ...NEUTRAL_INPUT, throttle: 1, steer: 1 }, 180, 0.8);
    // lean-out: the inside (+X) lifts
    expect(p.roll).toBeGreaterThan(0.03);
    expect(p.roll).toBeLessThanOrEqual(T.rollTurnMax + 1e-9);
    expect(p.lean).toBeGreaterThan(0.08); // the driver leans toward the inside
    expect(p.look).toBeCloseTo(T.lookSteer, 2);
    expect(p.steer).toBeCloseTo(T.steerAngle, 2);
    expect(Math.abs(p.yaw)).toBeLessThan(0.01); // no slip in a grip turn
    // the other way round, the other way round
    const b = new KartAnim(c);
    const q = drive(b, cruising(), { ...NEUTRAL_INPUT, throttle: 1, steer: -1 }, 180, -0.8);
    expect(q.roll).toBeCloseTo(-p.roll, 6);
    expect(q.lean).toBeCloseTo(-p.lean, 6);
    expect(q.steer).toBeCloseTo(-p.steer, 6);
  });

  it('a drift leans out further than a grip turn and hangs the tail out, more on the tight line', () => {
    const grip = drive(new KartAnim(c), cruising(), { ...NEUTRAL_INPUT, throttle: 1, steer: 0.5 }, 180, 0.6);
    const drifting = (yawK: number) => {
      const s = cruising();
      Object.assign(s.drift, { active: true, phase: 'drifting', direction: 1, yawK });
      return drive(new KartAnim(c), s, { ...NEUTRAL_INPUT, throttle: 1, drift: true, steer: 0.5 }, 180, 0.6);
    };
    const wide = drifting(0), tight = drifting(1);
    expect(wide.roll).toBeGreaterThan(grip.roll + 0.05);
    expect(wide.roll).toBeLessThanOrEqual(T.rollMax + 1e-9);
    expect(wide.yaw).toBeCloseTo(c.driftVisualSlip, 2);
    expect(tight.yaw).toBeCloseTo(c.driftVisualSlip + T.driftYawExtra, 2);
    expect(wide.lean).toBeGreaterThan(grip.lean);
    expect(wide.look).toBeCloseTo(T.lookDrift, 2);
  });

  it('a wall impact turn (a one-tick heading snap) is not read as a turn', () => {
    const a = new KartAnim(c), s = cruising();
    drive(a, s, NEUTRAL_INPUT, 30);
    s.heading += 0.5; // the impact turn
    a.tick(s, NEUTRAL_INPUT, dt);
    const p = drive(a, s, NEUTRAL_INPUT, 30);
    expect(Math.abs(p.roll)).toBeLessThan(0.005);
  });
});

describe('KartAnim: suspension and squash', () => {
  /** squash over time after `setup` changes the kart once, sampled each tick */
  function squashTrace(setup: (s: KartState, a: KartAnim) => void, ticks = 240): number[] {
    const a = new KartAnim(c), s = cruising(20);
    drive(a, s, NEUTRAL_INPUT, 60);
    setup(s, a);
    const out: number[] = [];
    for (let i = 0; i < ticks; i++) { drive(a, s, NEUTRAL_INPUT, 1); out.push(a.curr.squash); }
    return out;
  }

  it('a landing squashes, rebounds past rest, then settles', () => {
    const tr = squashTrace((s, a) => {
      // a second in the air, falling at 10 m/s
      s.grounded = false;
      for (let i = 0; i < 12; i++) { s.verticalVelocity = -10; s.position[1] -= 10 * dt; drive(a, s, NEUTRAL_INPUT, 1); }
      s.grounded = true;
      s.verticalVelocity = 0;
    });
    const low = Math.min(...tr), at = tr.indexOf(low);
    expect(low).toBeLessThan(-0.08);
    expect(low).toBeGreaterThanOrEqual(-T.squashMax);
    expect(at).toBeLessThan(20); // within about 0.15 s
    expect(Math.max(...tr.slice(at))).toBeGreaterThan(0.01); // the rebound
    expect(Math.abs(tr[tr.length - 1])).toBeLessThan(0.003);
  });

  it('a hop stretches as it leaves the road and squashes as it lands', () => {
    const tr = squashTrace((s, a) => {
      s.grounded = false;
      s.drift.phase = 'hopping';
      let vy = c.hopVelocity;
      for (let i = 0; i < Math.round(c.hopSeconds / dt); i++) {
        s.verticalVelocity = vy;
        s.position[1] += vy * dt;
        vy -= c.gravity * dt;
        drive(a, s, NEUTRAL_INPUT, 1);
        if (i === 5) expect(a.curr.squash).toBeGreaterThan(0.02);
      }
      s.grounded = true;
      s.verticalVelocity = 0;
      s.drift.phase = 'idle';
    }, 60);
    expect(Math.min(...tr)).toBeLessThan(-0.02);
  });

  it('a bump in the road squashes the kart at its foot and stretches it over the crest; flat road leaves it still', () => {
    const flat = squashTrace(() => {});
    expect(Math.max(...flat.map(Math.abs))).toBeLessThan(1e-9);
    // the road rises 0.4 m and falls again over 0.6 s (the kart stays on it)
    const a = new KartAnim(c), s = cruising(20);
    drive(a, s, NEUTRAL_INPUT, 60);
    const tr: number[] = [];
    for (let i = 0; i <= 72; i++) { s.position[1] = 0.4 * Math.sin((Math.PI * i) / 72) ** 2; drive(a, s, NEUTRAL_INPUT, 1); tr.push(a.curr.squash); }
    // squash as the road starts to rise, stretch over the crest, squash again where it flattens out
    expect(Math.min(...tr.slice(0, 30))).toBeLessThan(-0.002);
    expect(Math.max(...tr.slice(24, 54))).toBeGreaterThan(0.005);
    expect(Math.min(...tr.slice(54))).toBeLessThan(-0.005);
  });
});

describe('KartAnim: shoves', () => {
  it('a bump from the side tips the body away and jolts it, then it settles; steering never counts as one', () => {
    const a = new KartAnim(c), s = cruising();
    drive(a, s, NEUTRAL_INPUT, 60);
    s.lateralVelocity = c.bumpForce; // shoved toward +X in one tick
    let roll = 0, lean = 0, squash = 0;
    for (let i = 0; i < 40; i++) {
      s.lateralVelocity *= 0.9;
      drive(a, s, NEUTRAL_INPUT, 1);
      roll = Math.max(roll, a.curr.roll); lean = Math.min(lean, a.curr.lean); squash = Math.min(squash, a.curr.squash);
    }
    expect(roll).toBeGreaterThan(0.05); // the pushed-toward side lifts
    expect(lean).toBeLessThan(-0.05); // the driver jerks away from the push
    expect(squash).toBeLessThan(-0.01);
    const p = drive(a, s, NEUTRAL_INPUT, 240);
    expect(Math.abs(p.roll)).toBeLessThan(0.002);
    // rear-ended: shoved on at 3 m/s in one tick, the nose lifts and the driver's head goes back
    const r = new KartAnim(c), q = cruising(15);
    drive(r, q, NEUTRAL_INPUT, 60);
    q.speed += 3;
    let nose = 0, head = 0;
    for (let i = 0; i < 30; i++) { drive(r, q, NEUTRAL_INPUT, 1); nose = Math.min(nose, r.curr.pitch); head = Math.min(head, r.curr.nod); }
    expect(nose).toBeLessThan(-0.02);
    expect(head).toBeLessThan(-0.02);
    // a hard turn-in changes the sideways speed a little each tick: no jolt
    const b = new KartAnim(c), t = cruising();
    drive(b, t, NEUTRAL_INPUT, 60, 0, (k, i) => { k.lateralVelocity = -Math.min(i, 30) * 0.3; });
    expect(Math.abs(b.curr.squash)).toBeLessThan(1e-9);
  });
});

describe('KartAnim: pitch', () => {
  it('a boost lifts the nose (the rear squats); hard braking dips it', () => {
    const a = new KartAnim(c), s = cruising();
    drive(a, s, NEUTRAL_INPUT, 60);
    s.boost = { source: 'drift', remaining: c.boostSeconds[1], multiplier: c.boostMultiplier };
    let lowest = 0;
    for (let i = 0; i < 40; i++) { drive(a, s, NEUTRAL_INPUT, 1); s.boost.remaining -= dt; lowest = Math.min(lowest, a.curr.pitch); }
    expect(lowest).toBeLessThan(-0.03);

    const b = new KartAnim(c), t = cruising();
    drive(b, t, NEUTRAL_INPUT, 60);
    let highest = 0;
    for (let i = 0; i < 60; i++) { t.speed = Math.max(0, t.speed - c.brake * dt); drive(b, t, { ...NEUTRAL_INPUT, brake: 1 }, 1); highest = Math.max(highest, b.curr.pitch); }
    expect(highest).toBeGreaterThan(0.04);
    expect(highest).toBeLessThanOrEqual(T.pitchMax * 1.5);
  });

  it('revving on the grid squats the rear and shivers the kart; idling only shivers it a hair', () => {
    const rev = new KartAnim(c, 3), s = cruising(0);
    let pitch = 0, shiver = 0;
    for (let i = 0; i < 240; i++) { drive(rev, s, { ...NEUTRAL_INPUT, throttle: 1 }, 1); pitch = Math.min(pitch, rev.curr.pitch); shiver = Math.max(shiver, Math.abs(rev.curr.squash)); }
    expect(pitch).toBeLessThan(-0.015);
    expect(shiver).toBeGreaterThan(0.005);
    const idle = new KartAnim(c, 3), t = cruising(0);
    let calm = 0;
    for (let i = 0; i < 240; i++) { drive(idle, t, NEUTRAL_INPUT, 1); calm = Math.max(calm, Math.abs(idle.curr.squash)); }
    expect(calm).toBeLessThan(T.idleSquash * 1.5);
    expect(calm).toBeGreaterThan(0);
  });
});

describe('KartAnim: hits', () => {
  it('a hit spins the kart one whole turn with the sim spin timer and never pops', () => {
    const a = new KartAnim(c), s = cruising(15);
    drive(a, s, NEUTRAL_INPUT, 30);
    s.status.spinRemaining = c.hitSpinSeconds;
    const pose = newPose();
    let last = 0, biggestStep = 0, most = 0;
    for (let i = 0; i < 180; i++) {
      drive(a, s, NEUTRAL_INPUT, 1);
      s.status.spinRemaining = Math.max(0, s.status.spinRemaining - dt);
      for (const alpha of [0.25, 0.5, 0.75, 1]) {
        const y = a.pose(alpha, false, pose).spin;
        // on screen a whole turn is no turn: the step between frames, wrapped
        const step = Math.abs(((y - last + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        biggestStep = Math.max(biggestStep, step);
        most = Math.max(most, Math.abs(y));
        last = y;
      }
    }
    expect(most).toBeCloseTo(2 * Math.PI * T.spinTurns, 3);
    expect(biggestStep).toBeLessThan(0.1); // no frame jumps (0.1 rad is a fast spin's step at 4 samples a tick)
    expect(a.pose(1, false, pose).spin).toBe(0); // done: the whole turn is dropped from both ends
  });

  it('reduced motion scales everything down and swaps the spin for a small wobble', () => {
    const a = new KartAnim(c), s = cruising();
    drive(a, s, { ...NEUTRAL_INPUT, steer: 1 }, 120, 0.8);
    const full = a.pose(1, false, newPose()), calm = a.pose(1, true, newPose());
    expect(calm.roll).toBeCloseTo(full.roll * T.reducedScale, 9);
    expect(calm.lean).toBeCloseTo(full.lean * T.reducedScale, 9);
    s.status.spinRemaining = c.hitSpinSeconds;
    let spin = 0, wobble = 0;
    for (let i = 0; i < 60; i++) {
      drive(a, s, NEUTRAL_INPUT, 1);
      s.status.spinRemaining -= dt;
      const r = a.pose(1, true, newPose());
      spin = Math.max(spin, Math.abs(r.spin));
      wobble = Math.max(wobble, Math.abs(r.wobble));
    }
    expect(spin).toBe(0);
    expect(wobble).toBeGreaterThan(0.05);
    expect(wobble).toBeLessThanOrEqual(T.spinWobble);
  });
});

describe('KartAnim reads the sim and writes nothing', () => {
  function deepFreeze<X>(o: X): X {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
    return o;
  }

  it('ticks through turns, drifts, hops, landings, boosts and hits on a frozen kart and input', () => {
    const a = new KartAnim(c, 1);
    const s = cruising();
    const frames: KartState[] = [];
    // a scripted run of states, each frozen before the animation sees it
    for (let i = 0; i < 600; i++) {
      const k: KartState = structuredClone(frames[frames.length - 1] ?? s);
      k.heading += (i % 200 < 100 ? 0.7 : -0.5) * dt;
      k.position[0] += Math.sin(k.heading) * k.speed * dt;
      k.position[2] += Math.cos(k.heading) * k.speed * dt;
      k.grounded = !(i % 150 > 120 && i % 150 < 140);
      k.verticalVelocity = k.grounded ? 0 : 4 - (i % 150 - 120) * 0.5;
      k.position[1] += k.verticalVelocity * dt;
      Object.assign(k.drift, i % 300 > 60 && i % 300 < 200 ? { active: true, phase: 'drifting', direction: 1, yawK: 0.6 } : { active: false, phase: 'idle', direction: 0 });
      k.boost.remaining = i % 250 === 0 ? 1 : Math.max(0, k.boost.remaining - dt);
      k.status.spinRemaining = i === 400 ? c.hitSpinSeconds : Math.max(0, k.status.spinRemaining - dt);
      frames.push(k);
      const before = JSON.stringify(k);
      const input = deepFreeze({ ...NEUTRAL_INPUT, throttle: 1, steer: Math.sin(i / 40), drift: k.drift.active });
      a.tick(deepFreeze(k), input, dt);
      expect(JSON.stringify(k)).toBe(before);
      const p = a.pose(0.5, false, newPose());
      for (const v of Object.values(p)) expect(Number.isFinite(v)).toBe(true);
    }
  });
});

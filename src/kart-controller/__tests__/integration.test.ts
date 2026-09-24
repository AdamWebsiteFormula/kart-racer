// The SOP gate tests: determinism, drift tier timing, boost cap, lap time,
// archetype fairness, surface caps and bypass, bump, coin shield in a race.
import { describe, expect, it } from 'vitest';
import { makeConstants, type KartConstants } from '../constants.ts';
import { targetSpeed } from '../speed.ts';
import { applyHit, SIM_DT, stepKart, stepKarts } from '../step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type Archetype, type InputState, type KartEvent, type KartState, type TrackQuery } from '../types.ts';
import { makeOval } from './oval-stub.ts';

const DT = SIM_DT;

function spawn(track: ReturnType<typeof makeOval>, t: number, id = 'x', coins = 0): KartState {
  const { p, tan } = track.centre(t);
  return createKartState({ racerId: id, position: [p[0], 0, p[2]], heading: headingOf(tan), t, coins });
}

/**
 * The scripted driver: a pure function of state, so it is an input log in
 * disguise. Looks ahead on the spline and steers toward it; drifts on corners.
 */
function driver(s: KartState, track: TrackQuery, lookAhead = 0.03, useDrift = true): InputState {
  const ahead = track.sample(s.t + lookAhead, 0).position;
  const dx = ahead[0] - s.position[0], dz = ahead[2] - s.position[2];
  const want = Math.atan2(dx, dz);
  let err = want - s.heading;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  const steer = Math.max(-1, Math.min(1, err * 3));
  const corner = Math.abs(err) > 0.12;
  const drift = useDrift && (corner || s.drift.phase !== 'idle') && Math.abs(err) > 0.03;
  return { ...NEUTRAL_INPUT, throttle: 1, steer, drift };
}

/** Drive until t wraps once. Returns ticks and the recorded input log. */
function driveLap(s: KartState, track: ReturnType<typeof makeOval>, c: KartConstants, maxTicks = 120 * 60, useDrift = true) {
  const log: InputState[] = [];
  let ticks = 0;
  let prevT = s.t;
  let armed = false;
  while (ticks < maxTicks) {
    const input = driver(s, track, 0.03, useDrift);
    log.push(input);
    stepKart(s, input, track, c, DT);
    ticks++;
    if (s.t > 0.5) armed = true;
    if (armed && prevT > 0.9 && s.t < 0.1) break;
    prevT = s.t;
  }
  return { ticks, log };
}

function replay(s: KartState, log: InputState[], track: TrackQuery, c: KartConstants, chunk = 1): string {
  for (let i = 0; i < log.length; i += chunk) {
    for (let j = i; j < Math.min(i + chunk, log.length); j++) stepKart(s, log[j], track, c, DT);
  }
  return JSON.stringify(s);
}

describe('integration on the flat oval', () => {
  const track = makeOval();
  const c = makeConstants('medium', 150);

  it('determinism: same log twice → identical state; two chunk sizes → identical', () => {
    const { log } = driveLap(spawn(track, 0.01), track, c);
    const a = replay(spawn(track, 0.01), log, track, c, 1);
    const b = replay(spawn(track, 0.01), log, track, c, 1);
    const d = replay(spawn(track, 0.01), log, track, c, 7);
    expect(a).toBe(b);
    expect(a).toBe(d);
  });

  it('lap time on the oval is within ±2% of the recorded time', () => {
    const RECORDED_TICKS = 2185; // re-recorded 21 Sept 2026 at driftSteerMax 0.4 (2160 on 14 Sept), medium 150cc, 18.2 s
    const { ticks } = driveLap(spawn(track, 0.01), track, c);
    expect(Math.abs(ticks - RECORDED_TICKS) / RECORDED_TICKS).toBeLessThan(0.02);
  });

  // Fairness is track-shaped: heavy's top speed wins long straights, light's
  // handling wins tight corners. Measured 14 Sept 2026 (see SOP Decisions); re-measured
  // 24 Sept 2026 when the speed spread narrowed to −1 % / +1 % so the classes race level on
  // the real tracks (game/balance.e2e.test.ts is the gate now; these ovals keep the trade honest)
  // grip handling only: a scripted driver drifting on a 12–14 m oval is chaos now that a
  // drift starts loose and slides (2026-09-21), and these two tests are about the class trade
  const lapsOn = (oval: ReturnType<typeof makeOval>) =>
    Object.fromEntries((['light', 'medium', 'heavy'] as Archetype[]).map(
      (a) => [a, driveLap(spawn(oval, 0.01), oval, makeConstants(a, 150), 120 * 90, false).ticks],
    )) as Record<Archetype, number>;

  it('archetype fairness: within 3% on a balanced oval', () => {
    // L150 R35 measured 2643 / 2646 / 2658 ticks (24 Sept 2026)
    const laps = lapsOn(makeOval({ straight: 150, radius: 35 }));
    const lo = Math.min(...Object.values(laps)), hi = Math.max(...Object.values(laps));
    expect((hi - lo) / lo, `balanced ${JSON.stringify(laps)}`).toBeLessThan(0.03);
  });

  it('archetype trade: heavy wins the fast oval, light wins the tight oval', () => {
    // 500 m straights and 80 m bends, all flat out: top speed alone decides (7090 / 7125 / 7166 ticks)
    const fast = lapsOn(makeOval({ straight: 500, radius: 80 }));
    expect(fast.heavy, `fast ${JSON.stringify(fast)}`).toBeLessThan(fast.medium);
    expect(fast.medium, `fast ${JSON.stringify(fast)}`).toBeLessThan(fast.light);
    // 12 m is a corner nobody makes flat out: the wall slide decides (wallDeflect, 2026-09-21),
    // a no-brake driver on a 12 m oval is wall-limited, so only the ends of the trade are stable
    const tight = lapsOn(makeOval({ straight: 40, radius: 12 }));
    expect(tight.light, `tight ${JSON.stringify(tight)}`).toBeLessThan(tight.heavy);
  });

  it('boost cap: multiplier ≤ 1.4 and speed ≤ 1.4 × V_eff over a whole lap with tricks and drifts', () => {
    const jumpy = makeOval({ jumps: [{ id: 'j', t: 0.2, launch: 5 }] });
    const s = spawn(jumpy, 0.01, 'x', 10);
    for (let i = 0; i < 120 * 40; i++) {
      const input = driver(s, jumpy);
      if (s.airborne.fromJumpId) input.drift = i % 2 === 0; // mash for a trick
      stepKart(s, input, jumpy, c, DT);
      const { effective } = targetSpeed(s, c);
      expect(s.boost.multiplier).toBeLessThanOrEqual(1.4);
      expect(s.speed).toBeLessThanOrEqual(1.4 * effective + 1e-9);
    }
  });

  it('drift tiers fire at 0.83 / 1.83 / 2.83 s of full-stick drift in a real tick', () => {
    const wide = makeOval({ halfWidth: 60 }); // room to hold a full-lock drift circle
    const s = spawn(wide, 0.01);
    s.speed = 25;
    const hold: InputState = { ...NEUTRAL_INPUT, throttle: 1, steer: -1, drift: true };
    let driftStart = -1;
    const tierTicks: number[] = [];
    for (let i = 0; i < 600 && tierTicks.length < 3; i++) {
      const ev = stepKart(s, hold, wide, c, DT);
      if (ev.some((e) => e.type === 'driftStart')) driftStart = i;
      const up = ev.find((e) => e.type === 'driftTierUp');
      if (up) tierTicks.push(i - driftStart);
    }
    expect(driftStart).toBeGreaterThan(0);
    expect(tierTicks.map((t) => Math.round(t / 1.2) / 100)).toEqual([0.83, 1.83, 2.83]);
  });

  it('surface cap: mud settles at 0.6 V over ~0.4 s, dirt at 0.7 V, ice slides more', () => {
    const run = (surface: 'mud' | 'dirt') => {
      const t2 = makeOval({ surfaceAt: (t) => (t > 0.05 ? surface : 'road') });
      const s = spawn(t2, 0.04);
      s.speed = 25;
      const speeds: number[] = [];
      for (let i = 0; i < 240; i++) { stepKart(s, driver(s, t2, 0.03, false), t2, c, DT); speeds.push(s.speed); }
      return speeds;
    };
    const mud = run('mud');
    expect(mud.at(-1)).toBeCloseTo(15, 2);
    const firstMud = mud.findIndex((v) => v < 24.9);
    const settled = mud.findIndex((v, i) => i > firstMud && v <= 15.01);
    expect((settled - firstMud) * DT).toBeGreaterThan(0.3);
    expect(run('dirt').at(-1)).toBeCloseTo(17.5, 2);
  });

  it('cap bypass: a live boost and a hop over the patch both keep full speed', () => {
    const patch = makeOval({ surfaceAt: (t) => (t > 0.05 && t < 0.058 ? 'mud' : 'road') });
    // boost
    const b = spawn(patch, 0.045);
    b.speed = 25; b.boost.source = 'item'; b.boost.multiplier = 1.4; b.boost.remaining = 3;
    for (let i = 0; i < 60; i++) stepKart(b, driver(b, patch, 0.03, false), patch, c, DT);
    expect(b.speed).toBeGreaterThanOrEqual(25);
    // hop
    const h = spawn(patch, 0.049);
    h.speed = 25;
    let min = 25;
    for (let i = 0; i < 40; i++) {
      const input = driver(h, patch, 0.03, false);
      input.drift = i === 0;
      stepKart(h, input, patch, c, DT);
      min = Math.min(min, h.speed);
    }
    expect(min).toBeCloseTo(25, 1);
  });

  it('bump in a field: heavy shoves light further than light shoves heavy', () => {
    const shove = (mover: Archetype, target: Archetype) => {
      const a = spawn(track, 0.05, 'a'); const b = spawn(track, 0.05, 'b');
      b.position[0] += 1.5; // alongside, overlapping
      a.speed = 20; b.speed = 20;
      const start = b.position[2] - a.position[2];
      stepKarts([a, b], [driver(a, track), driver(b, track)], track, [makeConstants(mover, 150), makeConstants(target, 150)], DT);
      return Math.abs(b.lateralVelocity) + 0 * start;
    };
    expect(shove('heavy', 'light')).toBeGreaterThan(shove('light', 'heavy'));
  });

  it('coin shield in a race: hit with coins slows and keeps steering; at zero coins it spins', () => {
    const s = spawn(track, 0.01, 'x', 4);
    s.speed = 25;
    const ev: KartEvent[] = [];
    applyHit(s, c, 'item', ev);
    for (let i = 0; i < 60; i++) stepKart(s, driver(s, track), track, c, DT);
    expect(s.coins).toBe(2);
    expect(s.speed).toBeLessThan(25);
    expect(s.speed).toBeGreaterThan(15);
    const z = spawn(track, 0.01, 'z', 0);
    z.speed = 25;
    applyHit(z, c, 'item', []);
    for (let i = 0; i < 60; i++) stepKart(z, driver(z, track), track, c, DT);
    expect(z.status.spinRemaining).toBeGreaterThan(0);
    expect(z.speed).toBeLessThan(15);
  });
});

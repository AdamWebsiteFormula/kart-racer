// Regression tests from the handling audit (24 Sept 2026). Each one was a headless script that
// proved the bug; they now hold the fix. See docs/sops/kart-controller.md Decisions, 24 Sept 2026.
import { describe, expect, it } from 'vitest';
import { Group } from 'three';
import { collideKarts } from '../collide.ts';
import { makeConstants } from '../constants.ts';
import { inWake } from '../slipstream.ts';
import { SIM_DT, stepKart, stepKarts } from '../step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type KartEvent, type KartState, type TrackQuery, type Vec3 } from '../types.ts';
import { KartView } from '../view.ts';
import { makeOval } from './oval-stub.ts';

const c = makeConstants('medium', 150);
const V = c.topSpeed;
const go = { ...NEUTRAL_INPUT, throttle: 1 };

describe('walls: a glance keeps its speed (collide.ts bounceOff)', () => {
  const track = makeOval({ straight: 600, radius: 40, halfWidth: 8 });
  function glance(deg: number) {
    const { p, tan } = track.centre(0.02);
    const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2] - 6], heading: headingOf(tan) + (deg * Math.PI) / 180, t: 0.02 });
    s.speed = V;
    let hit = -1, min = Infinity, walls = 0, after = 0;
    for (let i = 0; i < 240; i++) {
      const ev = stepKart(s, go, track, c, SIM_DT);
      if (ev.some((e) => e.type === 'wall')) { walls++; if (hit < 0) hit = i; }
      if (hit >= 0) min = Math.min(min, Math.hypot(s.speed, s.lateralVelocity));
      if (hit >= 0 && i === hit + 60) after = s.speed;
      if (hit >= 0 && i > hit + 60) break;
    }
    return { hit, min, walls, after };
  }

  it('20° and 30° glances keep most of their speed and never grind (was 8 m/s in 50 ms at 30°)', () => {
    for (const deg of [20, 30]) {
      const g = glance(deg);
      expect(g.hit, `${deg}°`).toBeGreaterThan(0);
      expect(g.min, `${deg}°`).toBeGreaterThan(0.8 * V);
      expect(g.after, `${deg}°`).toBeGreaterThan(0.95 * V);
      expect(g.walls, `${deg}°`).toBe(1); // one impact, then clear of the wall
    }
  });

  it('a 45° hit is still a hit, but the kart drives on (was 1.8 m/s)', () => {
    const g = glance(45);
    expect(g.min).toBeGreaterThan(0.6 * V);
    expect(g.min).toBeLessThan(0.8 * V);
  });
});

describe('kart vs kart: solid (collide.ts collideKarts)', () => {
  const track = makeOval({ straight: 600, radius: 40, halfWidth: 8 });
  it('a rear-ender never drives through the kart ahead, whatever the speeds', () => {
    for (const [va, vb] of [[35, 15], [25, 15], [25, 0]]) {
      const ca = makeConstants('light', 150), cb = makeConstants('heavy', 150);
      const { p, tan } = track.centre(0.02);
      const h = headingOf(tan);
      const a = createKartState({ racerId: 'a', position: [p[0] - 5, 0, p[2]], heading: h, t: 0.02 });
      const b = createKartState({ racerId: 'b', position: [p[0], 0, p[2]], heading: h, t: 0.02 });
      a.speed = va; b.speed = vb;
      if (va > 25) a.boost = { source: 'item', remaining: 3, multiplier: 1.4 };
      let minD = Infinity;
      for (let i = 0; i < 240; i++) {
        stepKarts([a, b], [go, { ...NEUTRAL_INPUT, throttle: vb > 0 ? 1 : 0 }], track, [ca, cb], SIM_DT);
        minD = Math.min(minD, Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]));
      }
      expect(a.position[0], `${va} into ${vb}`).toBeLessThan(b.position[0]);
      expect(minD, `${va} into ${vb}`).toBeGreaterThan(2 * c.kartRadius - 0.35);
    }
  });

  it('karts at different heights neither bump nor draft (the items rule: contactHeight)', () => {
    const a = createKartState({ racerId: 'a', position: [0, 0, 0] });
    const b = createKartState({ racerId: 'b', position: [0.5, 6, 0.5] });
    a.speed = 20; b.speed = 20; b.grounded = false;
    const ea: KartEvent[] = [];
    expect(collideKarts(a, b, c, c, c, SIM_DT, ea, [])).toBe(false);
    expect(ea).toEqual([]);
    expect(b.lateralVelocity).toBe(0);
    const f = createKartState({ racerId: 'f', position: [0, -8, -4] });
    f.speed = 20;
    expect(inWake(f, a, c)).toBe(false);
    f.position[1] = 0.5;
    expect(inWake(f, a, c)).toBe(true);
  });
});

describe('ramps: a hop at the lip keeps the launch and the trick (ground.ts, drift.ts)', () => {
  const track = makeOval({ straight: 600, radius: 40, halfWidth: 8, jumps: [{ id: 'ramp', t: 0.1, launch: 6, shape: 'ramp', run: 5, rise: 0.8 }] });
  const mk = () => {
    const { p, tan } = track.centre(0.08);
    const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t: 0.08 });
    s.speed = V;
    return s;
  };
  function lipTick(): number {
    const s = mk();
    for (let i = 0; i < 400; i++) if (stepKart(s, go, track, c, SIM_DT).some((e) => e.type === 'launched')) return i;
    return -1;
  }
  const lip = lipTick();

  function pressBefore(ticks: number) {
    const s = mk();
    const at = lip - ticks;
    let launched = false, trickBoost = false, trickEvents = 0, peak = 0;
    for (let i = 0; i < 400; i++) {
      const ev = stepKart(s, { ...go, drift: i >= at && i < at + 6 }, track, c, SIM_DT);
      if (ev.some((e) => e.type === 'launched')) launched = true;
      if (ev.some((e) => e.type === 'boostStart' && e.source === 'trick')) trickBoost = true;
      trickEvents += ev.filter((e) => e.type === 'trick').length;
      peak = Math.max(peak, s.position[1]);
    }
    return { launched, trickBoost, trickEvents, peak };
  }

  it('a press up to trickBufferSeconds before the lip launches and tricks (with its sound event)', () => {
    expect(lip).toBeGreaterThan(0);
    const clean = pressBefore(-10); // pressed in the air after the lip: the old way
    for (const ticks of [0, 1, 3, 6, 12, Math.floor(c.trickBufferSeconds / SIM_DT) - 1]) {
      const r = pressBefore(ticks);
      expect(r.launched, `${ticks} ticks early`).toBe(true);
      expect(r.trickBoost, `${ticks} ticks early`).toBe(true);
      expect(r.trickEvents, `${ticks} ticks early`).toBe(1);
      expect(r.peak, `${ticks} ticks early`).toBeGreaterThanOrEqual(clean.peak - 0.05);
    }
  });

  it('a press well before the lip is only a hop: launched, no trick', () => {
    const r = pressBefore(Math.ceil(c.trickBufferSeconds / SIM_DT) + 12);
    expect(r.launched).toBe(true);
    expect(r.trickBoost).toBe(false);
    expect(r.trickEvents).toBe(0);
  });
});

describe('drift entry: late, and straight off a landing (drift.ts)', () => {
  const track = makeOval({ straight: 600, radius: 40, halfWidth: 12, jumps: [{ id: 'j', t: 0.1, launch: 8 }] });
  const mk = (t: number) => {
    const { p, tan } = track.centre(t);
    const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t });
    s.speed = V;
    return s;
  };

  it('hop straight, keep the button held, steer after landing: the drift starts', () => {
    const s = mk(0.02);
    const events: KartEvent[] = [];
    for (let i = 0; i < 90; i++) events.push(...stepKart(s, { ...go, drift: true, steer: i > 45 ? 1 : 0 }, track, c, SIM_DT));
    expect(s.drift.phase).toBe('drifting');
    expect(s.drift.direction).toBe(1);
    expect(events.filter((e) => e.type === 'hop')).toHaveLength(1); // no second hop
  });

  it('a small stick nudge is not a drift (driftLateSteer)', () => {
    const s = mk(0.02);
    for (let i = 0; i < 90; i++) stepKart(s, { ...go, drift: true, steer: i > 45 ? 0.2 : 0 }, track, c, SIM_DT);
    expect(s.drift.phase).toBe('idle');
  });

  it('a trick off a jump, the button held and the stick over through the landing: drifting on touchdown', () => {
    const s = mk(0.095);
    let prev = false;
    const events: string[] = [];
    for (let i = 0; i < 200; i++) {
      const drift: boolean = (!s.grounded && s.airborne.fromJumpId !== undefined) || prev;
      prev = drift;
      for (const e of stepKart(s, { ...go, drift, steer: drift ? 1 : 0 }, track, c, SIM_DT)) events.push(e.type);
    }
    expect(events).toContain('trick');
    expect(events.indexOf('driftStart')).toBeGreaterThan(events.indexOf('landed'));
    expect(s.drift.phase).toBe('drifting');
  });
});

describe('drift lines: the whole stick range, never wider than steering (steer.ts)', () => {
  // an endless flat plane: walls far away
  const plane: TrackQuery = {
    length: 1e6, jumps: [], boostPads: [], voidY: -100,
    sample: () => ({ position: [0, 0, 0], tangent: [0, 0, 1], normal: [0, 1, 0], groundY: 0, halfWidth: 1e5, surface: 'road', gripScale: 1 }),
    nearestT: () => 0, nearest: () => ({ t: 0, branch: 0 }),
  };
  function radius(frac: number, mode: 'grip' | 'in' | 'centre' | 'out'): number {
    const s = createKartState({ racerId: 'x' });
    s.speed = V * frac;
    const path: [number, number][] = [];
    for (let i = 0; i < 300; i++) {
      const drift = mode !== 'grip';
      // the drift locks with the stick in, then the stick goes where the line wants it
      const steer = mode === 'grip' || mode === 'in' || i <= 40 ? 1 : mode === 'centre' ? 0 : -1;
      if (frac < 1) s.speed = V * frac;
      stepKart(s, { ...NEUTRAL_INPUT, throttle: frac === 1 ? 1 : 0, drift, steer }, plane, c, SIM_DT);
      if (i >= 150) path.push([s.position[0], s.position[2]]);
    }
    const [a, b, d] = [path[0], path[Math.floor(path.length / 2)], path[path.length - 1]];
    const A = Math.hypot(b[0] - d[0], b[1] - d[1]), B = Math.hypot(a[0] - d[0], a[1] - d[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const area = Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1])) / 2;
    return (A * B * C) / (4 * area);
  }

  it('full in is tightest, centred a medium line, full out widest; full in never wider than the grip turn (was 99 m centred)', () => {
    for (const frac of [1, 0.7, 0.5]) {
      const grip = radius(frac, 'grip'), inner = radius(frac, 'in'), mid = radius(frac, 'centre'), outer = radius(frac, 'out');
      expect(inner, `${frac} V`).toBeLessThan(mid);
      expect(mid, `${frac} V`).toBeLessThan(outer);
      expect(inner, `${frac} V`).toBeLessThanOrEqual(grip * 1.05);
    }
  });
});

describe('KartView tilts to the ground (render only)', () => {
  function viewOn(normal: Vec3, heading = 0): Group {
    const s = createKartState({ racerId: 'x', heading });
    s.groundNormal = normal;
    const v = new KartView(c, new Group(), s);
    for (let f = 0; f < 60; f++) { v.onTick(s, SIM_DT); v.onFrame(1, s, 0, 1 / 60); }
    return v.root;
  }

  it('flat ground: level; uphill ahead: nose up; banked: rolled toward the low side', () => {
    const flat = viewOn([0, 1, 0]);
    expect(flat.rotation.x).toBeCloseTo(0, 6);
    expect(flat.rotation.z).toBeCloseTo(0, 6);
    // heading 0 faces +Z; a slope rising toward +Z has its normal leaning to −Z
    const up = viewOn([0, Math.cos(0.2), -Math.sin(0.2)]);
    expect(up.rotation.x).toBeCloseTo(-0.2, 2); // nose up (+x rotation dips the nose)
    // a bank rising toward the kart's +X side: the normal leans to −X
    const bank = viewOn([-Math.sin(0.15), Math.cos(0.15), 0]);
    expect(bank.rotation.z).toBeCloseTo(0.15, 2);
  });

  it('a wall impact turn is eased on screen, not snapped', () => {
    const s = createKartState({ racerId: 'x' });
    const v = new KartView(c, new Group(), s);
    s.heading = 0.6; // a one-tick impact turn
    v.onTick(s, SIM_DT);
    v.onFrame(1, s, 0, 1 / 120);
    expect(v.root.rotation.y).toBeLessThan(0.2);
    for (let f = 0; f < 60; f++) { v.onTick(s, SIM_DT); v.onFrame(1, s, 0, 1 / 60); }
    expect(v.root.rotation.y).toBeCloseTo(0.6, 3);
  });

  it('the sim never reads it: two karts that differ only in groundNormal step alike', () => {
    const track = makeOval();
    const { p, tan } = track.centre(0.05);
    const mkS = (): KartState => {
      const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t: 0.05 });
      s.speed = 20;
      return s;
    };
    const a = mkS(), b = mkS();
    b.groundNormal = [0.3, 0.9, 0.1];
    for (let i = 0; i < 120; i++) { stepKart(a, { ...go, steer: 0.4 }, track, c, SIM_DT); stepKart(b, { ...go, steer: 0.4 }, track, c, SIM_DT); }
    expect(b.position).toEqual(a.position);
    expect(b.heading).toBe(a.heading);
  });
});

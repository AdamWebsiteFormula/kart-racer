import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { inLoop, loopLength, loopPose } from './loop.ts';
import { stepKart } from './step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type KartEvent, type TrackLoop } from './types.ts';
import { makeOval } from './__tests__/oval-stub.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;
const LOOP: TrackLoop = { id: 'l', t: 0.1, radius: 9, shift: 7, spread: 1.2, approach: 14, exit: 6, width: 6 };

describe('loop-the-loop (design.md Track thrills)', () => {
  it('catches a kart on the ground, takes it up and round upside down, and sets it down ahead in the exit lane with a boost', () => {
    const track = makeOval({ loops: [LOOP] });
    const t0 = 0.1 - 30 / track.length;
    const { p, tan } = track.centre(t0);
    const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t: t0 });
    s.speed = 20;
    const ev: KartEvent[] = [];
    let maxY = 0, upsideDown = false, ticks = 0, wasIn = false;
    for (let i = 0; i < 1200; i++) {
      ev.push(...stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, DT));
      if (inLoop(s)) { wasIn = true; ticks++; maxY = Math.max(maxY, s.position[1]); if (Math.abs(s.status.loopAngle - Math.PI) < 0.1) upsideDown = true; }
      if (wasIn && !inLoop(s)) break;
    }
    expect(wasIn).toBe(true);
    expect(ev.filter((e) => e.type === 'loop').map((e) => (e.type === 'loop' ? e.phase : ''))).toEqual(['start', 'end']);
    // up to the top of the ring (2 × radius), upside down there
    expect(maxY).toBeGreaterThan(2 * LOOP.radius - 0.5);
    expect(upsideDown).toBe(true);
    // round at the speed it came in with or faster; the ride takes its length over that speed
    expect(ticks * DT).toBeCloseTo(loopLength(LOOP) / Math.max(20, c.topSpeed * c.loopSpeedFactor), 1);
    // set down past the foot, on the ground, in the exit lane (right of centre), with a boost
    expect(s.t).toBeGreaterThan(0.1);
    expect(s.grounded).toBe(true);
    expect(s.position[1]).toBeCloseTo(0, 5);
    expect(s.boost.source).toBe('pad');
    expect(s.status.loopIndex).toBe(-1);
  });

  it('the way in and the way out never meet: in left of centre, out right, apart by the shift', () => {
    const track = makeOval({ loops: [LOOP] });
    for (const lat0 of [-8, 0, 8]) {
      const into = loopPose(track, LOOP, lat0, LOOP.approach);
      const out = loopPose(track, LOOP, lat0, LOOP.approach + 2 * Math.PI * LOOP.radius);
      const d = Math.hypot(out.position[0] - into.position[0], out.position[2] - into.position[2]);
      expect(d).toBeCloseTo(LOOP.shift, 5);
      expect(into.position[1]).toBeCloseTo(out.position[1], 5);
    }
  });

  it('a kart in the air over the catch line is not caught', () => {
    const track = makeOval({ loops: [LOOP] });
    const t0 = 0.1 - 16 / track.length;
    const { p, tan } = track.centre(t0);
    const s = createKartState({ racerId: 'x', position: [p[0], 3, p[2]], heading: headingOf(tan), t: t0 });
    s.speed = 20; s.grounded = false; s.verticalVelocity = 2;
    for (let i = 0; i < 20; i++) stepKart(s, NEUTRAL_INPUT, track, c, DT);
    expect(inLoop(s)).toBe(false);
  });
});

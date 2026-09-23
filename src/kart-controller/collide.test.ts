import { describe, expect, it } from 'vitest';
import { requestBoost } from './boost.ts';
import { collideKarts, collisionMass, stepWalls } from './collide.ts';
import { makeConstants } from './constants.ts';
import { createKartState, type Archetype, type KartEvent, type KartState } from './types.ts';

const c = makeConstants('medium', 150);

describe('walls', () => {
  it('pushes back to the edge and reflects outward velocity', () => {
    const s = createKartState({ racerId: 'x', position: [0, 0, 0], heading: 0 });
    // heading 0 → forward +Z, right +X. Track right is also +X here.
    s.speed = 20; s.lateralVelocity = 5; // sliding right into the wall
    const ev: KartEvent[] = [];
    stepWalls(s, 8, [1, 0, 0], 8, c, 1 / 120, ev);
    expect(s.position[0]).toBeCloseTo(-c.kartRadius);
    expect(s.lateralVelocity).toBeCloseTo(-5 * c.wallRestitution);
    expect(s.speed).toBeCloseTo(20); // 5/20.6 is a soft hit, no scrub
    expect(ev).toEqual([{ type: 'wall' }]);
  });

  it('a kart far outside the wall line is eased all the way back, never snapped (review 2026-09-23)', () => {
    const s = createKartState({ racerId: 'x', position: [8 + 2, 0, 0], heading: 0 });
    s.speed = 15;
    const dt = 1 / 120;
    let lateral = 10, steps = 0;
    while (lateral > 8 - c.kartRadius + 1e-9 && steps < 400) {
      stepWalls(s, lateral, [1, 0, 0], 8, c, dt, []);
      const moved = lateral - s.position[0];
      expect(moved).toBeLessThanOrEqual(c.wallEndPushRate * dt + 1e-9);
      lateral = s.position[0];
      steps++;
    }
    expect(lateral).toBeCloseTo(8 - c.kartRadius, 6);
    expect(s.status.wallEasing).toBe(false);
  });

  it('scrubs speed on a hard hit and respects the cooldown', () => {
    const s = createKartState({ racerId: 'x', heading: 0 });
    s.speed = 10; s.lateralVelocity = 10;
    const ev: KartEvent[] = [];
    stepWalls(s, 9, [1, 0, 0], 8, c, 1 / 120, ev);
    expect(s.speed).toBeCloseTo(10 * (1 - c.wallScrub));
    stepWalls(s, 9, [1, 0, 0], 8, c, 1 / 120, ev);
    expect(ev).toHaveLength(1);
  });

  it('a nose-first hit swings the nose along the wall and keeps the kart moving', () => {
    const s = createKartState({ racerId: 'x', heading: Math.PI / 4 }); // 45° into the +X wall
    s.speed = 20;
    const ev: KartEvent[] = [];
    stepWalls(s, 9, [1, 0, 0], 8, c, 1 / 120, ev);
    // one tick swings the nose by at most wallDeflectRate × dt: no snap
    expect(Math.abs(s.heading)).toBeCloseTo(Math.PI / 4 - c.wallDeflectRate / 120, 5);
    expect(s.speed).toBeGreaterThan(5); // it slides on, it does not park
    expect(s.lateralVelocity).toBe(0);
    // pressing on for half a second brings the nose along the wall
    for (let i = 0; i < 60; i++) { s.lateralVelocity = 4; stepWalls(s, 9, [1, 0, 0], 8, c, 1 / 120, ev); }
    expect(Math.abs(s.heading)).toBeLessThan(0.05);
  });

  it('does nothing inside the track', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 20;
    stepWalls(s, 2, [1, 0, 0], 8, c, 1 / 120, []);
    expect(s.speed).toBe(20);
  });
});

function pair(aType: Archetype, bType: Archetype) {
  const a = createKartState({ racerId: 'a', position: [0, 0, 0], heading: Math.PI / 2 });
  const b = createKartState({ racerId: 'b', position: [1, 0, 0], heading: Math.PI / 2 });
  return { a, b, ca: makeConstants(aType, 150), cb: makeConstants(bType, 150) };
}
function bump(aType: Archetype, bType: Archetype, boostA = false) {
  const { a, b, ca, cb } = pair(aType, bType);
  if (boostA) requestBoost(a, 'drift', 1.3, 2, []);
  const ea: KartEvent[] = [], eb: KartEvent[] = [];
  collideKarts(a, b, ca, cb, c, 1 / 120, ea, eb);
  return { a, b, ca, cb, ea, eb };
}
/** Lateral shove magnitude on a kart heading +X: the world X velocity. */
const shove = (s: KartState) => Math.abs(s.speed); // heading π/2 → forward is +X

describe('kart vs kart', () => {
  it('separates and shoves both, events on both', () => {
    const { a, b, ca, cb, ea, eb } = bump('medium', 'medium');
    expect(shove(a)).toBeCloseTo(c.bumpForce / 2);
    // eased apart at bumpSeparateRate, not popped: a few ticks to clear
    for (let i = 0; i < 120; i++) collideKarts(a, b, ca, cb, c, 1 / 120, [], []);
    expect(b.position[0] - a.position[0]).toBeCloseTo(2 * c.kartRadius);
    expect(shove(b)).toBeCloseTo(c.bumpForce / 2);
    expect(ea).toEqual([{ type: 'bump', otherId: 'b' }]);
    expect(eb).toEqual([{ type: 'bump', otherId: 'a' }]);
  });

  it('heavy into light moves the light kart further', () => {
    const { a: heavy, b: light } = bump('heavy', 'light');
    expect(shove(light)).toBeGreaterThan(shove(heavy));
    expect(Math.abs(light.position[0] - 1)).toBeGreaterThan(Math.abs(heavy.position[0]));
  });

  it('a boosting light kart wins the bump against a coasting heavy', () => {
    const { a: light, b: heavy } = bump('light', 'heavy', true);
    expect(collisionMass(light, makeConstants('light', 150))).toBeGreaterThan(collisionMass(heavy, makeConstants('heavy', 150)));
    expect(shove(heavy)).toBeGreaterThan(shove(light));
  });

  it('ghosts and intangible karts skip contact', () => {
    const { a, b, ca, cb } = pair('medium', 'medium');
    a.isGhost = true;
    expect(collideKarts(a, b, ca, cb, c, 1 / 120, [], [])).toBe(false);
    a.isGhost = false; b.status.intangibleRemaining = 1;
    expect(collideKarts(a, b, ca, cb, c, 1 / 120, [], [])).toBe(false);
  });

  it('cooldown stops a second shove but still separates', () => {
    const { a, b, ca, cb } = pair('medium', 'medium');
    collideKarts(a, b, ca, cb, c, 1 / 120, [], []);
    b.position[0] = a.position[0] + 1;
    const ea: KartEvent[] = [];
    collideKarts(a, b, ca, cb, c, 1 / 120, ea, []);
    expect(ea).toHaveLength(0);
    // eased apart at bumpSeparateRate, not popped: a few ticks to clear
    for (let i = 0; i < 120; i++) collideKarts(a, b, ca, cb, c, 1 / 120, [], []);
    expect(b.position[0] - a.position[0]).toBeCloseTo(2 * c.kartRadius);
  });
});

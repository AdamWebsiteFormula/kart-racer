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
    stepWalls(s, 8, [1, 0, 0], 8, c, ev);
    expect(s.position[0]).toBeCloseTo(-c.kartRadius);
    expect(s.lateralVelocity).toBeCloseTo(-5 * c.wallRestitution);
    expect(s.speed).toBeCloseTo(20); // 5/20.6 is a soft hit, no scrub
    expect(ev).toEqual([{ type: 'wall' }]);
  });

  it('scrubs speed on a hard hit and respects the cooldown', () => {
    const s = createKartState({ racerId: 'x', heading: 0 });
    s.speed = 10; s.lateralVelocity = 10;
    const ev: KartEvent[] = [];
    stepWalls(s, 9, [1, 0, 0], 8, c, ev);
    expect(s.speed).toBeCloseTo(10 * (1 - c.wallScrub));
    stepWalls(s, 9, [1, 0, 0], 8, c, ev);
    expect(ev).toHaveLength(1);
  });

  it('does nothing inside the track', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 20;
    stepWalls(s, 2, [1, 0, 0], 8, c, []);
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
  collideKarts(a, b, ca, cb, c, ea, eb);
  return { a, b, ea, eb };
}
/** Lateral shove magnitude on a kart heading +X: the world X velocity. */
const shove = (s: KartState) => Math.abs(s.speed); // heading π/2 → forward is +X

describe('kart vs kart', () => {
  it('separates and shoves both, events on both', () => {
    const { a, b, ea, eb } = bump('medium', 'medium');
    expect(b.position[0] - a.position[0]).toBeCloseTo(2 * c.kartRadius);
    expect(shove(a)).toBeCloseTo(c.bumpForce / 2);
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
    expect(collideKarts(a, b, ca, cb, c, [], [])).toBe(false);
    a.isGhost = false; b.status.intangibleRemaining = 1;
    expect(collideKarts(a, b, ca, cb, c, [], [])).toBe(false);
  });

  it('cooldown stops a second shove but still separates', () => {
    const { a, b, ca, cb } = pair('medium', 'medium');
    collideKarts(a, b, ca, cb, c, [], []);
    b.position[0] = a.position[0] + 1;
    const ea: KartEvent[] = [];
    collideKarts(a, b, ca, cb, c, ea, []);
    expect(ea).toHaveLength(0);
    expect(b.position[0] - a.position[0]).toBeCloseTo(2 * c.kartRadius);
  });
});

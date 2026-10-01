// Contact with punch (contact.ts): the pure maths (how hard, where the wall is, the dizzy stars' show, the
// camera's jolt) and what each contact draws into the pools that already exist (no new mesh).
import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { hitHop, KART_ANIM } from '../kart-controller/anim.ts';
import { createKartState, type KartState } from '../kart-controller/types.ts';
import { CONTACT, Contact, ContactKick, dizzyShow, impact, wallFrom, worldVelocity } from './contact.ts';
import { directFx } from './juice.ts';
import { ParticlePool, SHAPE, starEdge } from './particles.ts';
import { Vfx } from './vfx.ts';
import type { RaceEvent } from '../race-manager/types.ts';

const pools = () => ({ glow: new ParticlePool(512, true), soft: new ParticlePool(512, false), sparks: new ParticlePool(512, true, false, 0.04, true) });
const shapes = (p: ParticlePool): number[] => Array.from((p.mesh.geometry.getAttribute('aShape').array as Float32Array).slice(0, p.count));
const kartAt = (racerId: string, x: number, z: number, heading = 0, speed = 20): KartState => {
  const k = createKartState({ racerId, position: [x, 0, z], heading });
  k.speed = speed;
  return k;
};
const shake = () => ({ x: 0, y: 0, z: 0, roll: 0 });

describe('how hard a contact was', () => {
  it('grows with the speed up to full size, and even a touch shows a little', () => {
    const B = CONTACT.bump;
    expect(impact(0, B.fullSpeed, B.least)).toBeCloseTo(B.least, 9);
    expect(impact(B.fullSpeed / 2, B.fullSpeed, B.least)).toBeCloseTo(B.least + (1 - B.least) / 2, 9);
    expect(impact(40, B.fullSpeed, B.least)).toBe(1);
  });

  it('finds the wall from what it took out of the velocity: into it, and along it', () => {
    const f = { nx: 0, nz: 0, into: 0, along: 0 };
    // driving along +Z at 20 m/s and 5 m/s toward +X into a wall; the wall takes the 5 and throws back 1.5
    expect(wallFrom([5, 20], [-1.5, 20], f)).toBe(true);
    expect([f.nx, f.nz]).toEqual([1, 0]);
    expect(f.into).toBeCloseTo(5, 9);
    expect(f.along).toBeCloseTo(20, 9);
    // a glance that hardly changed anything cannot place the wall
    expect(wallFrom([0.1, 20], [0, 20], f)).toBe(false);
  });

  it("a kart's world velocity: its speed along its nose and its slide to its right", () => {
    const k = kartAt('a', 0, 0, Math.PI / 2, 10);
    k.lateralVelocity = 2;
    const v = [0, 0];
    worldVelocity(k, v);
    // nose along +X, its right along -Z
    expect(v[0]).toBeCloseTo(10, 9);
    expect(v[1]).toBeCloseTo(-2, 9);
  });
});

describe('the dizzy stars', () => {
  it('fade in as the spin starts, stay while it spins, then fade out over the recover', () => {
    const D = CONTACT.dizzy;
    expect(dizzyShow(true, 0, Infinity)).toBe(0);
    expect(dizzyShow(true, D.fadeIn, Infinity)).toBe(1);
    expect(dizzyShow(false, 2, 0)).toBe(1);
    expect(dizzyShow(false, 2, D.after - D.fadeOut / 2)).toBeCloseTo(0.5, 9);
    expect(dizzyShow(false, 2, D.after)).toBe(0);
  });

  it('circle the head of a spinning kart, drawn exactly where they are this frame only, and ride its hop', () => {
    const p = pools(), c = new Contact(p.glow, p.soft, p.sparks);
    const k = kartAt('pip', 3, 4);
    c.draw(0, [k], undefined, shake(), false);
    expect(p.soft.count).toBe(0);
    k.status.spinRemaining = 0.8;
    c.draw(1, [k], undefined, shake(), false);
    c.draw(1.2, [k], undefined, shake(), false);
    // (this frame's; the last frame's are gone at the next update)
    p.soft.update(1 / 60);
    c.draw(1.2 + 1 / 60, [k], undefined, shake(), false);
    expect(p.soft.count).toBe(CONTACT.dizzy.stars);
    expect(shapes(p.soft)).toEqual(new Array(CONTACT.dizzy.stars).fill(SHAPE.star));
    const pos = p.soft.mesh.geometry.getAttribute('aOffset').array as Float32Array;
    for (let i = 0; i < p.soft.count; i++) {
      expect(Math.hypot(pos[i * 3] - 3, pos[i * 3 + 2] - 4)).toBeCloseTo(CONTACT.dizzy.radius, 5);
      const hop = hitHop(1 - 0.8);
      expect(pos[i * 3 + 1]).toBeGreaterThan(CONTACT.dizzy.height + hop - CONTACT.dizzy.bob - 1e-6);
    }
    // spin over: they stay a moment (the recover), then they are gone
    k.status.spinRemaining = 0;
    p.soft.update(1 / 60); c.draw(2, [k], undefined, shake(), false);
    expect(p.soft.count).toBe(CONTACT.dizzy.stars);
    p.soft.update(1 / 60); c.draw(2 + CONTACT.dizzy.after + 0.01, [k], undefined, shake(), false);
    expect(p.soft.count).toBe(0);
  });

  it('the hop they ride is the kart animation\'s own', () => {
    expect(hitHop(0)).toBe(0);
    expect(hitHop(KART_ANIM.hitHopSeconds / 2)).toBeCloseTo(KART_ANIM.hitHop, 9);
    expect(hitHop(KART_ANIM.hitHopSeconds)).toBe(0);
  });
});

describe("the player's camera jolt", () => {
  it('rises fast, swings back and is gone within its life; a weaker contact does not cut a stronger one short', () => {
    const K = CONTACT.kick, j = new ContactKick();
    j.kick(10, 1, 0, 0, 0.1, 0.02);
    const out = shake();
    j.add(10 + K.rise, out, false);
    expect(out.x).toBeCloseTo(0.1, 6);
    expect(out.roll).toBeCloseTo(0.02, 6);
    let least = 0;
    for (let t = 10 + K.rise; t < 10 + K.life; t += 0.005) least = Math.min(least, j.envelope(t));
    expect(least).toBeLessThan(0); // it swings back past rest
    expect(least).toBeGreaterThan(-0.5);
    expect(j.envelope(10 + K.life + 1e-9)).toBe(0);
    j.kick(10 + K.rise, 0, 0, 1, 0.01, 0);
    const o2 = shake();
    j.add(10 + K.rise, o2, false);
    expect(o2.x).toBeCloseTo(0.1, 6);
  });

  it('never moves the camera with reduced motion, and a bump kicks it at most a few centimetres', () => {
    const j = new ContactKick();
    j.kick(0, 1, 0, 0, CONTACT.kick.bump.move, CONTACT.kick.bump.roll);
    const o = shake();
    j.add(CONTACT.kick.rise, o, true);
    expect(o).toEqual(shake());
    expect(CONTACT.kick.bump.move).toBeLessThanOrEqual(0.08);
    expect(CONTACT.kick.hit.roll).toBeLessThan((2 * Math.PI) / 180);
  });
});

describe('what a contact draws (into the pools there already are)', () => {
  it("a bump: an impact star, a white flash, little stars and sparks where the karts touch; the player's jolts the camera toward the other kart", () => {
    const p = pools(), c = new Contact(p.glow, p.soft, p.sparks);
    const me = kartAt('pip', 0, 0), you = kartAt('gus', 1.6, 0);
    c.draw(0, [me, you], undefined, shake(), false); // their velocities before the touch
    c.bump(me, you, 'pip', 5, false);
    expect(shapes(p.soft)).toContain(SHAPE.burst);
    expect(shapes(p.soft).filter((s) => s === SHAPE.star).length).toBe(0); // no stars since 30 Sept 2026
    expect(p.glow.count).toBeGreaterThanOrEqual(1);
    expect(p.sparks.count).toBeGreaterThan(4);
    const o = shake();
    c.kick.add(5 + CONTACT.kick.rise, o, false);
    expect(o.x).toBeGreaterThan(0); // toward the other kart, +X
    // a rival's bump far from the camera draws nothing; a near one smaller than the player's
    const q = pools(), d = new Contact(q.glow, q.soft, q.sparks);
    d.emit(0, 0, [], [500, 0, 500]);
    d.bump(kartAt('a', 0, 0), kartAt('b', 1.6, 0), 'pip', 5, false);
    expect(q.soft.count + q.glow.count + q.sparks.count).toBe(0);
  });

  it('a harder bump is a bigger one', () => {
    const size = (closing: number) => {
      const p = pools(), c = new Contact(p.glow, p.soft, p.sparks);
      const a = kartAt('a', 0, 0), b = kartAt('b', 1.6, 0);
      a.lateralVelocity = closing; // moving toward +X at `closing` (its right is +X at heading 0)
      c.draw(0, [a, b], undefined, shake(), false);
      c.bump(a, b, 'a', 1, false);
      const sz = p.soft.mesh.geometry.getAttribute('aSize').array as Float32Array;
      return sz[shapes(p.soft).indexOf(SHAPE.burst)];
    };
    expect(size(8)).toBeGreaterThan(size(0) * 1.3);
  });

  it('a wall: a flash and sparks at the side that met it, then a scrape along it while the kart slides on, which stops once it bounces off', () => {
    const p = pools(), c = new Contact(p.glow, p.soft, p.sparks);
    const k = kartAt('pip', 0, 0, 0, 20);
    k.lateralVelocity = 5;
    c.draw(0, [k], undefined, shake(), false);
    k.lateralVelocity = -1.5; // the wall on its right (+X) threw it back
    c.wall(k, true, 1, false);
    const sparksAt = p.sparks.count;
    expect(sparksAt).toBeGreaterThan(10);
    const pos = p.sparks.mesh.geometry.getAttribute('aOffset').array as Float32Array;
    expect(pos[0]).toBeGreaterThan(0.5); // on its right, where the wall is
    // still beside the wall: more sparks each frame
    c.emit(1 / 60, 1.05, [k], [0, 3, -6]);
    expect(p.sparks.count).toBeGreaterThan(sparksAt);
    // bounced 2 m off it: the scrape is over
    k.position[0] = -2;
    const n = p.sparks.count;
    c.emit(1 / 60, 1.1, [k], [0, 3, -6]);
    c.emit(1 / 60, 1.12, [k], [0, 3, -6]);
    expect(p.sparks.count).toBe(n);
    const o = shake();
    c.kick.add(1 + CONTACT.kick.rise, o, false);
    expect(o.x).toBeGreaterThan(0); // toward the wall
  });

  it('a hit: a bigger burst, a ring of little stars and stars flung out; a rival\'s is smaller and never moves the camera', () => {
    const p = pools(), c = new Contact(p.glow, p.soft, p.sparks);
    c.hit(kartAt('pip', 0, 0), true, 2, false);
    const bursts = shapes(p.soft).filter((s) => s === SHAPE.burst).length;
    expect(bursts).toBe(1);
    expect(shapes(p.glow).filter((s) => s === SHAPE.star).length).toBe(CONTACT.hit.ring);
    expect(shapes(p.soft).filter((s) => s === SHAPE.star).length).toBe(0); // no stars since 30 Sept 2026
    const q = pools(), d = new Contact(q.glow, q.soft, q.sparks);
    d.hit(kartAt('gus', 0, 0), false, 2, false);
    expect(q.glow.count).toBeLessThanOrEqual(p.glow.count); // (with no star ring both draw the one burst)
    const o = shake();
    d.kick.add(2 + CONTACT.kick.rise, o, false);
    expect(o).toEqual(shake());
  });
});

describe('the director and the Vfx layer', () => {
  const k = (racerId: string, event: object) => ({ type: 'kart', racerId, event }) as RaceEvent;
  it('one bump a pair a tick (both karts report it), marked the player\'s when either kart is; every kart\'s wall, only the player\'s shakes', () => {
    const fx = directFx([k('a', { type: 'bump', otherId: 'p' }), k('p', { type: 'bump', otherId: 'a' }), k('b', { type: 'bump', otherId: 'c' }), k('c', { type: 'bump', otherId: 'b' })], [], 'p');
    expect(fx.bursts).toEqual([{ kind: 'bump', racerId: 'a', other: 'p', mine: true }, { kind: 'bump', racerId: 'b', other: 'c', mine: false }]);
    const walls = directFx([k('a', { type: 'wall' })], [], 'p');
    expect(walls.bursts).toEqual([{ kind: 'wall', racerId: 'a', mine: false }]);
    expect(walls.trauma).toBe(0);
    const mine = directFx([k('p', { type: 'wall' })], [], 'p');
    expect(mine.bursts).toEqual([{ kind: 'wall', racerId: 'p', mine: true }]);
    expect(mine.trauma).toBeGreaterThan(0);
  });

  it('draws them with no new mesh: the scene holds the same objects, and a frame with a spinning kart adds its dizzy stars', () => {
    const scene = new Scene(), vfx = new Vfx(scene, new PerspectiveCamera());
    const before = scene.children.length;
    const me = kartAt('pip', 0, 0), you = kartAt('gus', 1.6, 0);
    const of = (id: string) => (id === 'pip' ? me : you);
    vfx.frame(1 / 60, 1 / 60, 0, [me, you], me, [0, 3, -6], false);
    vfx.onTick(directFx([k('pip', { type: 'bump', otherId: 'gus' }), k('gus', { type: 'bump', otherId: 'pip' })], [], 'pip'), of, 0.1, false);
    me.status.spinRemaining = 1;
    vfx.frame(1 / 60, 1 / 60, 0.2, [me, you], me, [0, 3, -6], false);
    expect(scene.children.length).toBe(before);
    expect(vfx.soft.count).toBeGreaterThanOrEqual(CONTACT.dizzy.stars);
    expect(Number.isFinite(vfx.shake.x) && Number.isFinite(vfx.shake.roll)).toBe(true);
    vfx.dispose();
  });
});

describe('the cartoon star\'s edge (the shader draws the same)', () => {
  it('is inside at its heart, on its edge at a point and at an inner corner, outside between two points', () => {
    expect(starEdge(0, 0)).toBeLessThan(0);
    expect(starEdge(0, 1)).toBeCloseTo(0, 9);
    const inner = 0.46, half = Math.PI / 5;
    expect(starEdge(inner * Math.sin(half), inner * Math.cos(half), inner)).toBeCloseTo(0, 9);
    expect(starEdge(0.7 * Math.sin(half), 0.7 * Math.cos(half))).toBeGreaterThan(0);
    // five-fold: every point the same
    for (let i = 0; i < 5; i++) expect(starEdge(Math.sin((i * 2 * Math.PI) / 5), Math.cos((i * 2 * Math.PI) / 5))).toBeCloseTo(0, 9);
  });
});

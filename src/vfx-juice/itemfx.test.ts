// The items' effects (28 Sept 2026, the new set): which event draws what, where, and that they stay out of the lens.
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { ITEMS_CONFIG } from '../items/data.ts';
import type { ItemEvent, Projectile } from '../items/types.ts';
import { createKartState } from '../kart-controller/types.ts';
import { Blasts } from './blasts.ts';
import { BOOM, EMP, ITEM_RGB, MINE_UP } from './itemfx.ts';
import { directFx, JUICE } from './juice.ts';
import { Vfx } from './vfx.ts';

const at = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

describe('the items\' bursts (director)', () => {
  it('each item event draws its own: the rocket\'s explosion, the bolt\'s splash and pop, the mine\'s burst, the drone\'s fizzle, where they happened', () => {
    const fx = directFx([], [
      { type: 'projectilePop', id: 1, itemId: 'homingKite', position: at(1, 2, 3) },
      { type: 'projectileBounce', id: 2, itemId: 'beachBall', position: at(4, 0.35, 0), bouncesLeft: 2 },
      { type: 'projectilePop', id: 2, itemId: 'beachBall', position: at(5, 0.35, 0) },
      { type: 'projectilePop', id: 3, itemId: 'windUpMouse', position: at(6, 0.35, 0) },
      { type: 'groundPop', id: 4, itemId: 'decoyBalloon', position: at(7, 0, 0) },
      { type: 'groundPop', id: 5, itemId: 'oilCan', position: at(8, 0, 0) },
    ] as ItemEvent[], 'p');
    expect(fx.bursts.map((b) => [b.kind, b.at])).toEqual([
      ['boom', [1, 2, 3]], ['zap', [4, 0.35, 0]], ['laserPop', [5, 0.35, 0]], ['droneFizz', [6, 0.35, 0]], ['mineBurst', [7, MINE_UP, 0]],
    ]);
  });

  it('the powers: the Shockwave\'s pulse to its reach, the EMP Blast and each kart it shorts, Jet Mode forming and its sonic boom, the Jump Jets, a Nitro, the shield, the beam', () => {
    const horn = ITEMS_CONFIG.items.find((d) => d.id === 'airHorn')!.behaviour.radius!;
    const fx = directFx([], [
      { type: 'horn', racerId: 'p', position: at(0, 0, 0), radius: horn },
      { type: 'fog', racerId: 'a', victims: ['p', 'b'] },
      { type: 'powerStart', racerId: 'c', itemId: 'strikeBall', seconds: 5 },
      { type: 'burst', racerId: 'c', position: at(0, 0, 0), radius: 7 },
      { type: 'springLaunch', racerId: 'd' },
      { type: 'springSlam', racerId: 'd', position: at(0, 0, 0), radius: 6 },
      { type: 'itemUsed', racerId: 'e', itemId: 'tripleFizz', chargesLeft: 2 },
      { type: 'shieldUp', racerId: 'f' }, { type: 'shieldPop', racerId: 'f' },
      { type: 'tetherStart', racerId: 'g', targetId: 'h' }, { type: 'tetherEnd', racerId: 'g', targetId: 'h', slingshot: true },
    ] as ItemEvent[], 'x');
    expect(fx.bursts.map((b) => `${b.kind}:${b.racerId}${b.radius ? `:${b.radius}` : ''}`)).toEqual([
      `pulse:p:${horn}`, 'emp:a', 'shorted:p', 'shorted:b', 'jetForm:c', 'sonic:c:7', 'thrust:d', 'dive:d:6', 'nitro:e', 'shieldOn:f', 'shieldBreak:f', 'lock:h', 'sling:g',
    ]);
    // the player's own sonic boom and dive shake the camera; a rival's do not
    expect(directFx([], [{ type: 'burst', racerId: 'p', position: at(0, 0, 0), radius: 7 }], 'p').trauma).toBeCloseTo(JUICE.traumaStrike);
    expect(directFx([], [{ type: 'springSlam', racerId: 'p', position: at(0, 0, 0), radius: 6 }], 'p').trauma).toBeCloseTo(JUICE.traumaSlam);
    expect(fx.trauma).toBe(0);
  });

  it('an EMP\'d kart crackles for exactly as long as the sim slows it', () => {
    expect(EMP.crackle).toBe(ITEMS_CONFIG.items.find((d) => d.id === 'fogBank')!.behaviour.durationSeconds);
  });
});

describe('the items\' effects (drawn)', () => {
  const kart = (racerId: string, x = 0) => createKartState({ racerId, position: [x, 0, 0], heading: 0 });

  it('a rocket\'s explosion: a hot core in a fireball\'s glow and a flash, a shock ring on the road, a comic burst, sparks, embers and a puff of smoke; it shakes the player nearby', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const me = kart('p', 4);
    vfx.frame(1 / 60, 1 / 60, 0, [me], me, [0, 3, -6], false);
    const fx = directFx([], [{ type: 'projectilePop', id: 1, itemId: 'homingKite', position: at(0, 0.35, 0) }], 'p');
    vfx.onTick(fx, () => undefined, 1, false);
    expect(vfx.items.blasts.mesh.visible).toBe(false); // (shown by the frame)
    vfx.frame(0.05, 0.05, 1.05, [me], me, [0, 3, -6], false);
    // a white-hot core, the fireball's glow, the flash and the shock ring on the road
    expect(vfx.items.blasts.alive()).toBe(4);
    expect(vfx.items.blasts.mesh.visible).toBe(true);
    expect(vfx.soft.count).toBeGreaterThanOrEqual(BOOM.smoke);
    expect(vfx.kartFx.sparks.count).toBeGreaterThanOrEqual(BOOM.sparks);
    expect(vfx.trauma.value).toBeGreaterThan(0);
    // and all gone in a while
    vfx.frame(2, 2, 3, [me], me, [0, 3, -6], false);
    expect(vfx.items.blasts.mesh.visible).toBe(false);
    vfx.dispose();
  });

  it('an EMP\'d kart crackles with sparks while it is shorted, and stops', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = kart('b');
    vfx.onTick(directFx([], [{ type: 'fog', racerId: 'a', victims: ['b'] }], null), (id) => (id === 'b' ? k : undefined), 10, false);
    expect(vfx.items.isShorted('b')).toBe(true);
    const sparks = () => vfx.kartFx.sparks.count;
    vfx.kartFx.sparks.clear();
    for (let f = 0; f < 30; f++) vfx.frame(1 / 60, 1 / 60, 10 + f / 60, [k], undefined, [0, 3, -6], false);
    expect(sparks()).toBeGreaterThan(0);
    expect(vfx.items.isShorted('b')).toBe(true);
    vfx.frame(EMP.crackle, 1 / 60, 10 + EMP.crackle + 0.6, [k], undefined, [0, 3, -6], false);
    expect(vfx.items.isShorted('b')).toBe(false);
    vfx.dispose();
  });

  it('a Laser Blaster bolt leaves a pink trail and a Homing Rocket a white smoke trail; nothing while the sim waits', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const shot = (itemId: string): Projectile => ({ id: 1, itemId, position: [10, 0.35, 0], prevPosition: [9.4, 0.35, 0] } as Projectile);
    vfx.frame(1 / 60, 0, 0, [], undefined, [0, 3, -6], false, undefined, undefined, [shot('beachBall')]);
    expect(vfx.glow.count).toBe(0);
    for (let f = 0; f < 6; f++) vfx.frame(1 / 60, 1 / 60, f / 60, [], undefined, [0, 3, -6], false, undefined, undefined, [shot('beachBall')]);
    expect(vfx.glow.count).toBeGreaterThan(0);
    const soft = vfx.soft.count;
    for (let f = 0; f < 6; f++) vfx.frame(1 / 60, 1 / 60, f / 60, [], undefined, [0, 3, -6], false, undefined, undefined, [shot('homingKite')]);
    expect(vfx.soft.count).toBeGreaterThan(soft);
    vfx.dispose();
  });

  it('every item color is bright enough to bloom and keeps its hue', () => {
    for (const [name, c] of Object.entries(ITEM_RGB)) {
      if (name === 'smoke' || name === 'skin') continue;
      expect(Math.max(...c), name).toBeGreaterThan(1);
    }
  });
});

describe('blasts (the rings and flashes: one draw while any is alive)', () => {
  it('each copy lives from its start (or delay) to its end on the GPU, on its own clock of frames; the oldest is reused when all are taken', () => {
    const b = new Blasts(4);
    b.spawn({ kind: 'ring', x: 0, y: 0, z: 0, life: 0.5, from: 0, to: 5, r: 1, g: 1, b: 1 });
    b.spawn({ kind: 'flash', x: 0, y: 0, z: 0, life: 0.2, from: 0, to: 2, r: 1, g: 1, b: 1, delay: 0.3 });
    b.update(0.1);
    expect(b.alive()).toBe(1);
    expect(b.mesh.visible).toBe(true);
    b.update(0.3);
    expect(b.alive()).toBe(2);
    b.update(0.2);
    expect(b.alive()).toBe(0);
    expect(b.mesh.visible).toBe(false);
    // a frame's seconds are never negative (a wall clock stepping back leaves it be)
    b.update(-5);
    expect((b.mesh.material as unknown as { uniforms: { uTime: { value: number } } }).uniforms.uTime.value).toBeCloseTo(0.6, 6);
    for (let i = 0; i < 6; i++) b.spawn({ kind: 'flash', x: 0, y: 0, z: 0, life: 1, from: 0, to: 1, r: 1, g: 1, b: 1 });
    b.update(0.5);
    expect(b.alive()).toBe(4);
    b.clear();
    expect(b.alive()).toBe(0);
    b.dispose();
  });
});

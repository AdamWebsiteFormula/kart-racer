import { AdditiveBlending, CustomBlending, Matrix4, OneFactor, OneMinusSrcAlphaFactor, PerspectiveCamera, Scene, ShaderMaterial, SrcColorFactor, Vector3, ZeroFactor } from 'three';
import { describe, expect, it } from 'vitest';
import { decorGeometry } from '../art-pipeline/decor.ts';
import { createKartState } from '../kart-controller/types.ts';
import { SCATTER } from './gears.ts';
import { newEffects } from './juice.ts';
import { drawnSize, drawnStreak, nearFade, PARTICLE, ParticlePool, SHAPE, STREAK_COVER } from './particles.ts';
import { SKID, skidShade, Skids } from './trails.ts';
import { SONIC } from './itemfx.ts';
import { CONFETTI, CONFETTI_BURST, GEAR_POP, POP, Vfx } from './vfx.ts';

/** Every live particle's position and velocity, read back from the pool's buffers. */
function offsets(pool: ParticlePool): number[][] {
  const a = pool.mesh.geometry.getAttribute('aOffset').array as Float32Array;
  const out: number[][] = [];
  for (let i = 0; i < pool.count; i++) out.push([a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]);
  return out;
}

describe('particles near the lens (detail review 2026-09-24)', () => {
  it('fade to nothing within the near band and show fully past it', () => {
    const [a, b] = PARTICLE.nearFade;
    expect(nearFade(0)).toBe(0);
    expect(nearFade(a)).toBe(0);
    expect(nearFade(b)).toBe(1);
    expect(nearFade(20)).toBe(1);
    expect(nearFade((a + b) / 2)).toBeCloseTo(0.5, 5);
  });

  it('never draw bigger on screen than the cap: a confetti piece at 2 m stays a fleck', () => {
    // a 0.22 m piece 2 m from the lens would be ~57 px on a 720 px screen at 66°; capped it is ~40 px at most, and faded
    expect(drawnSize(0.22, 2, PARTICLE.maxSize.confetti)).toBeCloseTo(0.08, 5);
    expect(drawnSize(0.22, 10, PARTICLE.maxSize.confetti)).toBe(0.22);
    // the on-screen size (metres per metre of depth) never passes the cap at any depth
    for (const d of [0.5, 1, 2, 4, 8, 16]) expect(drawnSize(0.4, d, PARTICLE.maxSize.confetti) / d).toBeLessThanOrEqual(PARTICLE.maxSize.confetti + 1e-9);
  });

  it('each pool carries its own cap; confetti is a flipping strip, dust a soft puff', () => {
    const conf = new ParticlePool(8, false, true), soft = new ParticlePool(8, false), glow = new ParticlePool(8, true);
    const u = (p: ParticlePool) => (p.mesh.material as ShaderMaterial).uniforms;
    expect(u(conf).uMaxSize.value).toBe(PARTICLE.maxSize.confetti);
    expect(u(soft).uMaxSize.value).toBe(PARTICLE.maxSize.soft);
    expect(u(glow).uMaxSize.value).toBe(PARTICLE.maxSize.glow);
    expect(u(conf).uStrip.value).toBe(PARTICLE.strip);
    expect(u(soft).uStrip.value).toBe(1);
    expect(u(soft).uPuff.value).toBe(1);
    expect(u(glow).uPuff.value).toBe(0);
    expect((conf.mesh.material as ShaderMaterial).vertexShader).toContain('smoothstep(1.20, 3.50, depth)');
  });

  it('a confetti piece keeps its own spin when the pool packs the live ones forward', () => {
    const pool = new ParticlePool(8, false, true);
    const o = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 0, b: 0, size: 0.2, life: 0.1 };
    pool.spawn(o); // dies first
    pool.spawn({ ...o, life: 5 });
    const spin = pool.mesh.geometry.getAttribute('aSpin').array as Float32Array;
    const second = [spin[3], spin[4], spin[5]];
    const [s0, s1] = PARTICLE.spin, [f0, f1] = PARTICLE.flutter;
    expect(Math.abs(second[1])).toBeGreaterThanOrEqual(s0);
    expect(Math.abs(second[1])).toBeLessThanOrEqual(s1);
    expect(second[2]).toBeGreaterThanOrEqual(f0);
    expect(second[2]).toBeLessThanOrEqual(f1);
    pool.update(0.2);
    expect(pool.count).toBe(1);
    expect([spin[0], spin[1], spin[2]]).toEqual(second);
    expect((pool.mesh.material as ShaderMaterial).uniforms.uTime.value).toBeCloseTo(0.2, 6);
  });

  it('round pools have no spin', () => {
    const pool = new ParticlePool(4, true);
    pool.spawn({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.2, life: 1 });
    expect(Array.from(pool.mesh.geometry.getAttribute('aSpin').array as Float32Array)).toEqual(new Array(12).fill(0));
  });

  it('a star or a burst (contact.ts) turns as told, in any pool, and its slot forgets it once it is gone', () => {
    const pool = new ParticlePool(4, false);
    const o = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.3, life: 0.1, shape: SHAPE.star, spin: 5, phase: 1 };
    pool.spawn(o);
    const spin = pool.mesh.geometry.getAttribute('aSpin').array as Float32Array, shape = pool.mesh.geometry.getAttribute('aShape').array as Float32Array;
    expect([spin[0], spin[1], spin[2], shape[0]]).toEqual([1, 5, 0, SHAPE.star]);
    pool.update(0.2); // gone
    pool.spawn({ ...o, shape: undefined, spin: undefined, phase: undefined, life: 1 });
    expect([spin[0], spin[1], spin[2], shape[0]]).toEqual([0, 0, 0, 0]);
    // a star is square (never the confetti's strip) and draws up to its own size cap
    const m = pool.mesh.material as ShaderMaterial;
    expect(m.vertexShader).toContain('mix(uStrip, 1.0, shaped)');
    expect(m.uniforms.uMaxShape.value).toBe(PARTICLE.maxSize.shape);
  });

  it('place(): drawn this frame only, where it is put (the dizzy stars circling a head)', () => {
    const pool = new ParticlePool(8, false);
    pool.place({ x: 1, y: 2, z: 3, vx: 0, vy: 0, vz: 0, r: 1, g: 0.8, b: 0, size: 0.4, life: 0, shape: SHAPE.star, alpha: 0.5 });
    expect(pool.count).toBe(1);
    expect(pool.mesh.count).toBe(1);
    const col = pool.mesh.geometry.getAttribute('aColor').array as Float32Array;
    expect([col[0], col[1], col[2], col[3]]).toEqual([1, Math.fround(0.8), 0, 0.5]);
    expect(offsets(pool)).toEqual([[1, 2, 3]]);
    pool.update(1 / 60);
    expect(pool.count).toBe(0);
  });
});

describe('confetti bursts', () => {
  const heading = 0.7, fwd = [Math.sin(heading), Math.cos(heading)];
  const burst = (kind: 'confetti' | 'sonic', speed = 0) => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = createKartState({ racerId: 'pip', isPlayer: true, position: [10, 2, -5], heading });
    k.speed = speed;
    const fx = newEffects();
    fx.bursts.push({ kind, racerId: 'pip' });
    vfx.onTick(fx, () => k, 0, false);
    return { vfx, k };
  };
  const along = (p: number[], k: { position: number[] }) => (p[0] - k.position[0]) * fwd[0] + (p[2] - k.position[2]) * fwd[1];

  it('the finish shower falls up the road, ahead of the kart and far from the chase camera 6 m behind it', () => {
    const { vfx, k } = burst('confetti', 20);
    const pts = offsets(vfx.confetti);
    expect(pts.length).toBe(CONFETTI_BURST.count);
    const ahead = CONFETTI_BURST.ahead + 20 * CONFETTI_BURST.lead;
    for (const p of pts) {
      expect(along(p, k)).toBeGreaterThanOrEqual(ahead - CONFETTI_BURST.depth - 1e-6);
      expect(p[1] - k.position[1]).toBeGreaterThanOrEqual(CONFETTI_BURST.rise);
    }
    const mean = pts.reduce((s, p) => s + along(p, k), 0) / pts.length;
    expect(mean).toBeGreaterThan(ahead - 1);
  });

  it('Jet Mode\'s sonic boom throws its vapor and sparkles forward and out, never back at the lens, and lights its rings', () => {
    const { vfx, k } = burst('sonic');
    expect(vfx.soft.count).toBe(SONIC.puffs);
    expect(vfx.glow.count).toBe(SONIC.sparkles);
    for (const pool of [vfx.soft, vfx.glow]) {
      const before = offsets(pool).map((p) => along(p, k));
      pool.update(0.05);
      const after = offsets(pool).map((p) => along(p, k));
      for (let i = 0; i < before.length; i++) expect(after[i]).toBeGreaterThan(before[i]);
      // and it starts in front of the kart
      expect(Math.min(...before)).toBeGreaterThan(0.3);
    }
    // two vapor rings across the jet's way, a shock ring over the road, a flash
    vfx.items.blasts.update(0.06);
    expect(vfx.items.blasts.alive()).toBe(4);
    vfx.items.blasts.update(2);
    expect(vfx.items.blasts.alive()).toBe(0);
  });

  it('confetti colours are saturated hues (no white, no pastels)', () => {
    for (const c of CONFETTI) {
      const hi = Math.max(...c), lo = Math.min(...c);
      expect(hi).toBeGreaterThan(0.5);
      expect((hi - lo) / hi).toBeGreaterThan(0.9);
    }
  });
});

describe('tyre marks darken what they lie on', () => {
  it('multiply blending: the road times the mark, so a dark night deck gets darker, never lighter', () => {
    const s = new Skids(4);
    const m = s.mesh.material as ShaderMaterial;
    expect(m.blending).toBe(CustomBlending);
    expect(m.blendSrc).toBe(ZeroFactor);
    expect(m.blendDst).toBe(SrcColorFactor);
    s.dispose();
  });

  it('fresh marks multiply by the shade and fade to nothing over their life, softly (never near-black)', () => {
    expect(SKID.shade).toBeGreaterThanOrEqual(0.58); // the old 0.55 read near-black on a night deck
    let last = 0;
    for (let t = 0; t <= SKID.life * 1.2; t += 0.1) { const s = skidShade(t); expect(s).toBeGreaterThanOrEqual(last); last = s; } // only ever fades
    expect(skidShade(0)).toBeCloseTo(SKID.shade, 6);
    expect(skidShade(SKID.life / 2)).toBeCloseTo((1 + SKID.shade) / 2, 6);
    expect(skidShade(SKID.life)).toBe(1);
    expect(skidShade(SKID.life * 3)).toBe(1);
    expect(SKID.shade).toBeLessThan(1);
  });
});

describe('balloon pops and gear pickups', () => {
  const pop = (kind: 'balloon' | 'gear', mine: boolean, speed = 0) => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = createKartState({ racerId: 'nova', isPlayer: mine, position: [0, 0, 0], heading: 0 });
    k.speed = speed;
    const fx = newEffects();
    fx.bursts.push({ kind, racerId: 'nova', mine });
    vfx.onTick(fx, () => k, 0, false);
    return vfx;
  };

  it('a rival taking an energy core makes a small, dim burst; your own stays full (its shards, sparks and flash, 30 Sept 2026)', () => {
    const mine = pop('balloon', true), rival = pop('balloon', false);
    expect(mine.glow.count).toBe(POP.mine.confetti + POP.mine.glow + 1);
    expect(rival.glow.count).toBe(POP.rival.confetti + POP.rival.glow);
    expect(rival.glow.count).toBeLessThan(mine.glow.count);
    // under the bloom threshold, so a row of rival pops never blooms into discs over the road
    expect(Math.max(...POP.rivalGlow)).toBeLessThanOrEqual(1);
  });

  it('a rival picking up a gear sparkles less than you do', () => {
    expect(pop('gear', false).glow.count).toBeLessThan(pop('gear', true).glow.count);
  });

  it('a gear picked up throws a ratchet of sparks, one per tooth, round the kart and turning, carried along with it (not a coin\'s flip)', () => {
    const vfx = pop('gear', true, 20);
    expect(vfx.glow.count).toBe(POP.mine.gearSparks + 1); // and the glint at its heart
    const before = offsets(vfx.glow).slice(0, POP.mine.gearSparks);
    // a ring round a point 1.1 m over the kart, standing across the road (the kart heads +Z)
    const cy = GEAR_POP.up;
    for (const [x, y, z] of before) {
      expect(Math.hypot(x, y - cy)).toBeCloseTo(GEAR_POP.radius, 4);
      expect(z).toBeCloseTo(0, 5);
    }
    vfx.glow.update(0.1);
    const after = offsets(vfx.glow).slice(0, POP.mine.gearSparks);
    // carried along with the kart (20 m/s up the road), and every spark has swung the same way round the ring
    const angle = ([x, y]: number[]) => Math.atan2(y - cy, x);
    const turned = after.map((p, i) => { const d = angle(p) - angle(before[i]); return Math.atan2(Math.sin(d), Math.cos(d)); });
    for (let i = 0; i < after.length; i++) expect(after[i][2]).toBeCloseTo(2, 1);
    expect(new Set(turned.map((d) => Math.sign(d))).size).toBe(1);
    expect(Math.abs(turned[0])).toBeGreaterThan(0.3);
  });
});

describe('gears knocked loose (gears.ts)', () => {
  const lose = (count: number, n = 1) => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = createKartState({ racerId: 'nova', isPlayer: true, position: [0, 2, 0], heading: 0 });
    k.speed = 20;
    for (let i = 0; i < n; i++) {
      const fx = newEffects();
      fx.bursts.push({ kind: 'gearsLost', racerId: 'nova', mine: true, count });
      vfx.onTick(fx, () => k, 0, false);
    }
    return vfx;
  };

  it('each gear a hit costs flies out of the kart as a little gear, one draw for all, up and out to both sides, lands, and is gone within a second and a bit', () => {
    const vfx = lose(2), g = vfx.gears;
    expect(g.flying).toBe(2);
    expect(g.mesh.name).toBe('gears-lost');
    expect(g.mesh.geometry).toBe(decorGeometry('coin')!.body); // the track's gear
    g.update(1 / 60);
    expect([g.mesh.visible, g.mesh.count]).toEqual([true, 2]);
    const at = (i: number) => new Vector3().setFromMatrixPosition(new Matrix4().fromArray(g.mesh.instanceMatrix.array as Float32Array, i * 16));
    let high = 0;
    for (let t = 0; t < 0.5; t += 1 / 60) { g.update(1 / 60); high = Math.max(high, at(0).y, at(1).y); }
    expect(high).toBeGreaterThan(2 + 1.5); // thrown well up over the kart
    expect(Math.sign(at(0).x)).not.toBe(Math.sign(at(1).x)); // out to either side
    for (let t = 0; t < 0.4; t += 1 / 60) g.update(1 / 60);
    expect(Math.min(at(0).y, at(1).y)).toBeGreaterThanOrEqual(2 + SCATTER.rest - 1e-6); // never through the road
    for (let t = 0; t < SCATTER.life; t += 1 / 60) g.update(1 / 60);
    expect([g.flying, g.mesh.count, g.mesh.visible]).toEqual([0, 0, false]);
  });

  it('never more in the air than the pool holds; a new race clears them', () => {
    const vfx = lose(2, 20);
    expect(vfx.gears.flying).toBe(SCATTER.cap);
    vfx.reset();
    expect(vfx.gears.flying).toBe(0);
  });
});

describe('streaks (drift sparks and boost embers)', () => {
  it('draw a capsule along their own motion whose quad keeps its winding (a mirrored one is culled as a back face)', () => {
    const pool = new ParticlePool(4, true, false, PARTICLE.maxSize.spark, true);
    const vs = (pool.mesh.material as ShaderMaterial).vertexShader;
    expect(vs).toContain('vec2(axis.y, -axis.x) * (position.x * w) + axis * along');
    // the same map in JS: a plane corner (x, y) goes to across * x * w + axis * along(y); for every axis the winding holds
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, ax = Math.cos(a), ay = Math.sin(a), w = 1, len = 2;
      const map = (x: number, y: number) => { const along = -len - 0.5 * w + (y + 0.5) * (len + w); return [ay * x * w + ax * along, -ax * x * w + ay * along]; };
      const [p0, p1, p2] = [map(-0.5, -0.5), map(0.5, -0.5), map(-0.5, 0.5)];
      const cross = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
      expect(cross).toBeGreaterThan(0); // the plane's own sense (x right, y up): front-facing
    }
  });

  it('part cover what is behind them (premultiplied), so a spark\'s color holds over a bright road', () => {
    const streak = new ParticlePool(4, true, false, PARTICLE.maxSize.spark, true), glow = new ParticlePool(4, true);
    const sm = streak.mesh.material as ShaderMaterial;
    expect(sm.blending).toBe(CustomBlending);
    expect([sm.blendSrc, sm.blendDst]).toEqual([OneFactor, OneMinusSrcAlphaFactor]);
    expect(sm.fragmentShader).toContain(`a * ${STREAK_COVER.toFixed(2)}`);
    expect((glow.mesh.material as ShaderMaterial).blending).toBe(AdditiveBlending); // the round glows still only add light
  });

  it('a particle draws no more opaque than it was spawned (the pipes\' faint puffs), and keeps that when packed forward', () => {
    const pool = new ParticlePool(4, false);
    const o = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.5, g: 0.5, b: 0.6, size: 0.2, life: 0.1 };
    pool.spawn(o); // dies first
    pool.spawn({ ...o, life: 5, alpha: 0.4 });
    pool.update(0.2);
    expect(pool.count).toBe(1);
    expect((pool.mesh.geometry.getAttribute('aColor').array as Float32Array)[3]).toBeCloseTo(0.4, 6);
  });

  it('ride with their kart and stretch over their own motion only', () => {
    const pool = new ParticlePool(4, true, false, PARTICLE.maxSize.spark, true);
    pool.spawn({ x: 0, y: 0, z: 0, vx: 0, vy: 2, vz: -3, cx: 0, cy: 0, cz: 20, r: 1, g: 1, b: 1, size: 0.05, life: 1, stretch: 0.05 });
    pool.update(0.1);
    const pos = pool.mesh.geometry.getAttribute('aOffset').array as Float32Array, st = pool.mesh.geometry.getAttribute('aStreak').array as Float32Array;
    expect(pos[2]).toBeCloseTo((20 - 3) * 0.1, 5); // carried along, falling back by its own speed
    expect(st[2]).toBeCloseTo(-3 * 0.05, 5);
    expect(st[1]).toBeCloseTo(2 * 0.05, 5);
    // on screen never longer than PARTICLE.maxStreak per metre of depth
    expect(drawnStreak(1, 2)).toBeCloseTo(2 * PARTICLE.maxStreak, 6);
    expect(drawnStreak(0.1, 2)).toBe(0.1);
    // a round pool has no streaks and draws as it always did
    expect(new ParticlePool(4, true).mesh.geometry.getAttribute('aStreak')).toBeUndefined();
  });
});

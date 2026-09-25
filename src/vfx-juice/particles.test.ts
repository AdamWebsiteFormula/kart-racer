import { AdditiveBlending, CustomBlending, OneFactor, OneMinusSrcAlphaFactor, PerspectiveCamera, Scene, ShaderMaterial, SrcColorFactor, ZeroFactor } from 'three';
import { describe, expect, it } from 'vitest';
import { createKartState } from '../kart-controller/types.ts';
import { newEffects } from './juice.ts';
import { drawnSize, drawnStreak, nearFade, PARTICLE, ParticlePool, STREAK_COVER } from './particles.ts';
import { SKID, skidShade, Skids } from './trails.ts';
import { CONFETTI, CONFETTI_BURST, POP, STRIKE_BURST, Vfx } from './vfx.ts';

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
});

describe('confetti bursts', () => {
  const heading = 0.7, fwd = [Math.sin(heading), Math.cos(heading)];
  const burst = (kind: 'confetti' | 'strike', speed = 0) => {
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

  it('the STRIKE confetti is thrown forward and out, never back at the lens', () => {
    const { vfx, k } = burst('strike');
    expect(vfx.confetti.count).toBe(STRIKE_BURST.count);
    const before = offsets(vfx.confetti).map((p) => along(p, k));
    vfx.confetti.update(0.05);
    const after = offsets(vfx.confetti).map((p) => along(p, k));
    for (let i = 0; i < before.length; i++) expect(after[i]).toBeGreaterThan(before[i]);
    // and it starts in front of the kart
    expect(before.reduce((s, x) => s + x, 0) / before.length).toBeGreaterThan(STRIKE_BURST.ahead - 0.5);
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

describe('balloon and coin pops', () => {
  const pop = (kind: 'balloon' | 'coin', mine: boolean) => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = createKartState({ racerId: 'nova', isPlayer: mine, position: [0, 0, 0], heading: 0 });
    const fx = newEffects();
    fx.bursts.push({ kind, racerId: 'nova', mine });
    vfx.onTick(fx, () => k, 0, false);
    return vfx;
  };

  it('a rival popping a balloon makes a small, dim sparkle; your own pop stays full', () => {
    const mine = pop('balloon', true), rival = pop('balloon', false);
    expect(mine.glow.count).toBe(POP.mine.glow);
    expect(rival.glow.count).toBe(POP.rival.glow);
    expect(rival.soft.count).toBeLessThan(mine.soft.count);
    // under the bloom threshold, so a row of rival pops never blooms into discs over the road
    expect(Math.max(...POP.rivalGlow)).toBeLessThanOrEqual(1);
  });

  it('a rival picking up a coin sparkles less than you do', () => {
    expect(pop('coin', false).glow.count).toBeLessThan(pop('coin', true).glow.count);
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

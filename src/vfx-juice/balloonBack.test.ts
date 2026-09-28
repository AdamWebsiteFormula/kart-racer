// A popped balloon coming back (track-builder mesh/balloonBack.ts; Adam, 28 Sept 2026: "just appear without
// any animation. Looks cheap."): a little sparkle round it as it blows up again, none with reduced motion.
import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import type { ParticlePool } from './particles.ts';
import { BALLOON_SPARKLE, Vfx } from './vfx.ts';

function particles(pool: ParticlePool): number[][] {
  const a = pool.mesh.geometry.getAttribute('aOffset').array as Float32Array;
  const p: number[][] = [];
  for (let i = 0; i < pool.count; i++) p.push([a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]);
  return p;
}

describe('the sparkle round a balloon coming back', () => {
  it('a few small glints round its middle fly out and are gone within half a second, with a gleam at its heart', () => {
    const S = BALLOON_SPARKLE;
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    vfx.balloonBack(4, 3, -2, false);
    const p = particles(vfx.glow);
    expect(p.length).toBe(S.glints + 1);
    const d = (q: number[]) => Math.hypot(q[0] - 4, q[1] - 3, q[2] + 2);
    for (const q of p) expect(d(q)).toBeLessThanOrEqual(Math.hypot(S.radius, S.spread) + 1e-6);
    expect(Math.min(...p.map(d))).toBeLessThan(1e-6); // the gleam, at its heart
    // little: no glint much over a fist, the gleam under half a metre
    expect(S.size).toBeLessThanOrEqual(0.2);
    expect(S.gleam).toBeLessThan(0.5);
    const before = p.map(d);
    vfx.glow.update(0.1);
    const after = particles(vfx.glow).map(d).sort((a, b) => b - a);
    expect(after[0]).toBeGreaterThan(Math.max(...before) + 0.05);
    vfx.glow.update(0.45);
    expect(vfx.glow.count).toBe(0);
  });

  it('none with reduced motion: the balloon only fades in', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    vfx.balloonBack(0, 1, 0, true);
    expect(vfx.glow.count).toBe(0);
  });
});

// The finish celebration's and the podium ceremony's effects: the finish confetti only for a joyful
// place (the game says which), the finish slow-mo easing back instead of snapping, the podium's
// fireworks (a round burst that blooms, fewer with reduced motion) and its confetti rain.
import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import type { RaceEvent } from '../race-manager/types.ts';
import { directFx, JUICE, TimeScale } from './juice.ts';
import type { ParticlePool } from './particles.ts';
import { CONFETTI_RAIN, FIREWORK, Vfx } from './vfx.ts';

function particles(pool: ParticlePool): { p: number[][]; c: number[][] } {
  const g = pool.mesh.geometry;
  const a = g.getAttribute('aOffset').array as Float32Array, col = g.getAttribute('aColor').array as Float32Array;
  const p: number[][] = [], c: number[][] = [];
  for (let i = 0; i < pool.count; i++) { p.push([a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]); c.push([col[i * 4], col[i * 4 + 1], col[i * 4 + 2]]); }
  return { p, c };
}

describe('the finish confetti', () => {
  const finish = (rank: number): RaceEvent => ({ type: 'finish', racerId: 'p', rank, tick: 9, dnf: false });
  it('falls for the places the game calls joyful, not for the others; the slow-mo comes either way', () => {
    const podium = (rank: number) => rank <= 3;
    const won = directFx([finish(2)], [], 'p', undefined, podium);
    expect(won.bursts.map((b) => b.kind)).toEqual(['confetti']);
    const low = directFx([finish(6)], [], 'p', undefined, podium);
    expect(low.bursts).toEqual([]);
    expect(low.slowMo).toBe(true);
    // unsaid, every finish throws it (as before)
    expect(directFx([finish(8)], [], 'p').bursts.map((b) => b.kind)).toEqual(['confetti']);
  });

  it('the finish slow-mo eases back to full speed over its last slowMoEase seconds', () => {
    const ts = new TimeScale();
    ts.slowMo(10);
    const end = 10 + JUICE.slowMoSeconds, from = end - JUICE.slowMoEase;
    expect(ts.scale(from - 0.01)).toBe(JUICE.slowMoScale);
    let last: number = JUICE.slowMoScale;
    for (let t = from; t < end; t += 0.02) {
      const k = ts.scale(t);
      expect(k).toBeGreaterThanOrEqual(last - 1e-9);
      expect(k - last).toBeLessThan(0.1); // no lurch
      last = k;
    }
    expect(ts.scale(end + 0.001)).toBe(1);
    expect(ts.scale(from + 0.1, true), 'reduced motion: no slow-mo at all').toBe(1);
  });
});

describe('the podium ceremony\'s effects', () => {
  it('a firework bursts round its point in one bright hue (over 1: it blooms), with fewer sparks for reduced motion', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    vfx.firework(5, 20, -3, 2);
    const { p } = particles(vfx.glow);
    expect(p.length).toBe(FIREWORK.count + 5);
    for (const q of p) expect(Math.hypot(q[0] - 5, q[1] - 20, q[2] + 3)).toBeLessThan(1e-6);
    vfx.glow.update(0.001); // (the pool writes its colours as it packs)
    expect(Math.max(...particles(vfx.glow).c.map((x) => Math.max(...x)))).toBeGreaterThan(1.5);
    // the sparks fly out every way: after a moment they surround the point
    vfx.glow.update(0.2);
    const out = particles(vfx.glow).p;
    expect(Math.max(...out.map((q) => q[1])) - 20).toBeGreaterThan(0.5);
    expect(Math.min(...out.map((q) => q[1])) - 20).toBeLessThan(-0.5);
    const calm = new Vfx(new Scene(), new PerspectiveCamera());
    calm.firework(0, 10, 0, 0, true);
    expect(calm.glow.count).toBe(FIREWORK.reducedCount + 5);
  });

  it('confetti rains down over the podium, within its radius, from above it', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    vfx.confettiRain(10, 2, -4, 5, 40);
    const { p } = particles(vfx.confetti);
    expect(p.length).toBe(40);
    for (const q of p) {
      expect(Math.hypot(q[0] - 10, q[2] + 4)).toBeLessThanOrEqual(5 + 1e-6);
      expect(q[1] - 2).toBeGreaterThanOrEqual(CONFETTI_RAIN.up - 1e-6);
    }
    vfx.confetti.update(1);
    expect(Math.max(...particles(vfx.confetti).p.map((q) => q[1]))).toBeLessThan(2 + CONFETTI_RAIN.up + CONFETTI_RAIN.spread);
  });
});

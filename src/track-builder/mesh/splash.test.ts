// Rain splashes (splash.ts): where they land, how many live at once, when none do, and the one draw.
import { describe, expect, it } from 'vitest';
import type { InstancedBufferGeometry, ShaderMaterial } from 'three';
import type { Vec3 } from '../types.ts';
import { SPLASH, SplashField, type SplashUniforms } from './splash.ts';

const uniforms = (): SplashUniforms => ({ uTime: { value: 0 }, uFlash: { value: 0 }, uReduced: { value: 0 } });
/** A level surface at `y` everywhere (or nowhere, below `x0`). */
const level = (y: number, x0 = -Infinity) => (p: Float64Array): boolean => { if (p[0] < x0) return false; p[2] = y; return true; };

/** `secs` of 60 fps frames of rain at `density`, the kart at `focus` heading `heading`; the clock starts at `t0`. */
function rain(f: SplashField, secs: number, focus: Vec3 | null, heading = 0, density = 1, reduced = false, t0 = 10): number {
  let t = t0;
  for (let i = 0; i <= secs * 60; i++) { f.update(t, focus, heading, density, reduced); t += 1 / 60; }
  return t - 1 / 60;
}

describe('rain splashes', () => {
  it('land on the surface ahead of and round the camera\'s kart, about rate × life alive at once, each just born', () => {
    const f = new SplashField(uniforms(), level(2.5));
    const focus: Vec3 = [40, 2.5, -12], h = 0.7;
    const t = rain(f, 1.5, focus, h);
    const alive = f.alive(t);
    expect(alive).toBeGreaterThan(SPLASH.rate * SPLASH.life * 0.7);
    expect(alive).toBeLessThan(SPLASH.rate * SPLASH.life * 1.3);
    const fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
    for (let i = 0; i < SPLASH.capacity; i++) {
      const [x, y, z, born] = f.spot(i);
      if (!(t - born < SPLASH.life)) continue;
      expect(born).toBeLessThanOrEqual(t);
      expect(y).toBe(2.5);
      // in the kart's frame: along its heading, and across no wider than the chase camera sees there
      const along = (x - focus[0]) * fx + (z - focus[2]) * fz, lat = (x - focus[0]) * rx + (z - focus[2]) * rz;
      expect(along).toBeGreaterThanOrEqual(SPLASH.along[0] - 1e-3);
      expect(along).toBeLessThanOrEqual(SPLASH.along[1] + 1e-3);
      expect(Math.abs(lat)).toBeLessThanOrEqual(SPLASH.halfNear + (along - SPLASH.along[0]) * SPLASH.spread + 1e-3);
    }
    // more land near the kart than far off (the camera sees the near ones; MKW's are near)
    let near = 0, far = 0;
    for (let i = 0; i < SPLASH.capacity; i++) {
      const [x, , z] = f.spot(i), along = (x - focus[0]) * fx + (z - focus[2]) * fz;
      if (along < (SPLASH.along[0] + SPLASH.along[1]) / 2) near++; else far++;
    }
    expect(near).toBeGreaterThan(far);
  });

  it('none before the rain, without a kart to follow, where there is no surface, and nothing owed across a pause or a jump', () => {
    const dry = new SplashField(uniforms(), level(0));
    rain(dry, 1, [0, 0, 0], 0, 0);
    rain(dry, 1, null, 0, 1);
    expect(dry.landed).toBe(0);
    // half the ground is no surface: only the other half gets any
    const half = new SplashField(uniforms(), level(0, 0));
    const t = rain(half, 1, [0, 0, 0], 0);
    expect(half.landed).toBeGreaterThan(0);
    for (let i = 0; i < SPLASH.capacity; i++) { const s = half.spot(i); if (t - s[3] < 5) expect(s[0]).toBeGreaterThanOrEqual(0); }
    // a paused clock lands nothing, and so does the first frame after a long pause (no burst)
    const f = new SplashField(uniforms(), level(0));
    rain(f, 0.5, [0, 0, 0]);
    const n = f.landed;
    for (let i = 0; i < 30; i++) f.update(10.5, [0, 0, 0], 0, 1, false);
    expect(f.landed).toBe(n);
    f.update(30, [0, 0, 0], 0, 1, false);
    expect(f.landed).toBe(n);
  });

  it('the ring holds `capacity` splashes: the oldest go first, never more alive than slots', () => {
    const f = new SplashField(uniforms(), level(0), 64);
    const t = rain(f, 2, [0, 0, 0]);
    expect(f.landed).toBeGreaterThan(64);
    expect(f.alive(t)).toBeLessThanOrEqual(64);
  });

  it('reduced motion: calm, about reducedShare as many, living longer (rings, no flying drops)', () => {
    const full = new SplashField(uniforms(), level(0)), calm = new SplashField(uniforms(), level(0));
    rain(full, 2, [0, 0, 0]);
    rain(calm, 2, [0, 0, 0], 0, 1, true);
    expect(calm.landed / full.landed).toBeGreaterThan(SPLASH.reducedShare * 0.75);
    expect(calm.landed / full.landed).toBeLessThan(SPLASH.reducedShare * 1.25);
    const m = calm.mesh.material as ShaderMaterial;
    expect(m.uniforms.uLife.value).toBe(SPLASH.reducedLife);
    expect(calm.u.uReduced.value).toBe(1);
    // the droplets and spikes are drawn only without reduced motion
    expect(m.fragmentShader).toMatch(/if \(uReduced < 0\.5\) \{[\s\S]*lkSeg/);
  });

  it('is one draw: an instanced crown and ring a slot, see-through, never culled, over the clouds with the rain, freed with the stage', () => {
    const f = new SplashField(uniforms(), level(0));
    const g = f.mesh.geometry as InstancedBufferGeometry, m = f.mesh.material as ShaderMaterial;
    expect(g.instanceCount).toBe(SPLASH.capacity);
    expect(g.getIndex()!.count).toBe(12);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect(f.mesh.frustumCulled).toBe(false);
    expect(f.mesh.renderOrder).toBe(3);
    expect(f.mesh.userData.ownMaterial && f.mesh.userData.ownGeometry).toBe(true);
    expect(m.vertexShader + m.fragmentShader).not.toMatch(/--/);
  });
});

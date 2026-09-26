// Real wave geometry (waterWaves.ts): the Gerstner sum's own math (mirrored in plain TS so it can be
// checked without a GPU), the camera-following grid it displaces, and the mesh it builds.
import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial, PerspectiveCamera } from 'three';
import {
  buildWaveGridMesh, GERSTNER_GLSL, gerstnerHeight, WAVE_FADE, WAVE_GRID, WAVE_MAX_HEIGHT, WAVES, waveGridGeometry,
} from './waterWaves.ts';

describe('gerstnerHeight: the TS mirror of the vertex shader\'s own sum', () => {
  it('is exactly 0 at the origin at t=0 (every wave\'s phase is k*(dir·0) - omega*0 = 0, sin(0) = 0)', () => {
    expect(gerstnerHeight(0, 0, 0)).toBe(0);
  });

  it('never rises above, or drops below, the sum of the waves\' own amplitudes (a physical sanity bound, sampled densely)', () => {
    let maxY = -Infinity, minY = Infinity;
    for (let t = 0; t < 20; t += 0.7) {
      for (let x = -40; x <= 40; x += 3) {
        for (let z = -40; z <= 40; z += 3) {
          const y = gerstnerHeight(x, z, t);
          if (y > maxY) maxY = y;
          if (y < minY) minY = y;
        }
      }
    }
    expect(maxY).toBeLessThanOrEqual(WAVE_MAX_HEIGHT + 1e-9);
    expect(minY).toBeGreaterThanOrEqual(-WAVE_MAX_HEIGHT - 1e-9);
    // and it actually swells close to that range somewhere in 20 s over an 80x80 m patch, not just near 0
    expect(maxY).toBeGreaterThan(WAVE_MAX_HEIGHT * 0.6);
  });

  it('moves over time at a fixed point (it is a real swell, not a frozen bump)', () => {
    const ys = [0, 1, 2, 3, 4].map((t) => gerstnerHeight(5, 5, t));
    expect(new Set(ys.map((y) => y.toFixed(6))).size).toBeGreaterThan(1);
  });

  it('WAVES: four gentle, mixed-direction, deep-water waves (never choppy)', () => {
    expect(WAVES.length).toBe(4);
    const dirs = new Set(WAVES.map((w) => `${Math.sign(w.dx)},${Math.sign(w.dz)}`));
    expect(dirs.size).toBeGreaterThan(1); // not all the same direction
    for (const w of WAVES) {
      expect(Math.hypot(w.dx, w.dz)).toBeCloseTo(1, 5); // a unit direction
      expect(w.amplitude).toBeGreaterThan(0.05);
      expect(w.amplitude).toBeLessThan(0.35);
      // deep-water dispersion: omega^2 = g*k
      expect(w.omega * w.omega).toBeCloseTo(9.80665 * w.k, 5);
      // never steep enough to loop the crest over (the standard Gerstner stability bound)
      expect(w.q * w.amplitude * w.k).toBeLessThanOrEqual(1);
    }
    expect(WAVE_MAX_HEIGHT).toBeCloseTo(WAVES.reduce((s, w) => s + w.amplitude, 0), 6);
  });
});

describe('GERSTNER_GLSL: the shader twin reads the same numbers', () => {
  it('declares both functions the vertex and fragment shaders call', () => {
    expect(GERSTNER_GLSL).toContain('vec3 lkGerstner(vec2 p, float t, float fade)');
    expect(GERSTNER_GLSL).toContain('vec3 lkGerstnerNormal(vec2 p, float t, float fade)');
  });

  it('splices in each wave\'s own k, amplitude and omega (six decimal places, not a different hand-typed number)', () => {
    for (const w of WAVES) {
      expect(GERSTNER_GLSL).toContain(w.k.toFixed(6));
      expect(GERSTNER_GLSL).toContain(w.amplitude.toFixed(6));
      expect(GERSTNER_GLSL).toContain(w.omega.toFixed(6));
    }
  });
});

describe('waveGridGeometry: the near-camera grid the swell actually shows on', () => {
  it('is a flat (y=0) grid, WAVE_GRID.size across, with a triangle count that fits the performance SOP\'s tight per-track headroom', () => {
    const g = waveGridGeometry();
    const pos = g.getAttribute('position');
    const n = Math.round(WAVE_GRID.size / WAVE_GRID.cell);
    expect(pos.count).toBe((n + 1) * (n + 1));
    expect(g.index!.count / 3).toBe(n * n * 2);
    expect(g.index!.count / 3).toBeLessThan(5000); // Harbour Loop's own margin under the 400k ceiling (frameBudget.test.ts) is a few thousand
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBe(0); // flat: the shader displaces it, the geometry itself does not
      minX = Math.min(minX, pos.getX(i)); maxX = Math.max(maxX, pos.getX(i));
    }
    expect(maxX - minX).toBeCloseTo(WAVE_GRID.size, 0);
  });

  it('is shared (the very same object every call): built once, never disposed by a scene', () => {
    expect(waveGridGeometry()).toBe(waveGridGeometry());
  });

  it('WAVE_FADE finishes well inside the grid\'s own half-extent, so the swell meets the flat sea with no seam at the grid\'s edge', () => {
    expect(WAVE_FADE.far).toBeLessThan(WAVE_GRID.size / 2);
    expect(WAVE_FADE.near).toBeLessThan(WAVE_FADE.far);
  });
});

describe('attachWaveFollow: the grid stays under the camera, snapped to whole cells', () => {
  it('snaps position.x/z to the nearest cell multiple of the camera\'s own position, and leaves y alone', () => {
    const mesh = buildWaveGridMesh(new MeshBasicMaterial(), -1.5);
    const camera = new PerspectiveCamera();
    camera.position.set(123.4, 9, -87.6);
    mesh.onBeforeRender(undefined as never, undefined as never, camera, undefined as never, undefined as never, undefined as never);
    const cell = WAVE_GRID.size / Math.round(WAVE_GRID.size / WAVE_GRID.cell);
    expect(mesh.position.x).toBeCloseTo(Math.round(123.4 / cell) * cell, 6);
    expect(mesh.position.z).toBeCloseTo(Math.round(-87.6 / cell) * cell, 6);
    expect(mesh.position.y).toBe(-1.5);
  });
});

describe('buildWaveGridMesh: a companion to the flat sea plane, sharing its material', () => {
  it('draws right after the flat plane (which actually captures the scene depth) and before every other see-through thing', () => {
    const mat = new MeshBasicMaterial();
    const mesh = buildWaveGridMesh(mat, -2);
    expect(mesh.name).toBe('ground-water-waves');
    expect(mesh.material).toBe(mat);
    expect(mesh.userData.sharedMaterial).toBe(true);
    expect(mesh.renderOrder).toBeGreaterThan(-2); // after the flat plane's -2 (scene.ts)
    expect(mesh.renderOrder).toBeLessThan(-1); // still before shiftFx clouds (-1) and everything else see-through
  });
});

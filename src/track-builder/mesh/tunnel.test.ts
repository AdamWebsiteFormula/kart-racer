// The mine's light (tunnel.ts, 27 Sept 2026: "Mesa Rush's mine is a black void on laps 1-2"): the bore lit by
// its lanterns burning low and by the day at its mouths before the Final Lap Shift, the lanterns and their pools
// up to full as they flicker on from the mouth inward, the road through it under their pools.
import { BufferGeometry, Float32BufferAttribute, type BufferAttribute, type Mesh, type MeshToonMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { buildTrackScene } from './scene.ts';
import { BORE_LIGHT, BORE_ROAD, buildTunnels, FINAL_ROAD, lampOn, LANTERNS, lightBoreRoad, type Lantern } from './tunnel.ts';

const FILES = import.meta.glob('../tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const canyon = () => buildTrack(FILES['../tracks/canyon-rush.json']);
const lum = (a: ArrayLike<number>, i: number) => 0.2126 * a[i * 3] + 0.7152 * a[i * 3 + 1] + 0.0722 * a[i * 3 + 2];

describe('when each lantern is lit', () => {
  it('not before the shift, nor before the light reaches it from the mouth; then two flickers, then steady', () => {
    expect(lampOn(-1, 0, false)).toBe(0);
    const at = 30, on = LANTERNS.delay + at / LANTERNS.speed;
    expect(lampOn(on - 0.01, at, false)).toBe(0);
    const seen = new Set<number>();
    for (let t = on + 0.005; t < on + 0.3; t += 0.01) seen.add(lampOn(t, at, false) > 0.5 ? 1 : 0);
    expect([...seen].sort()).toEqual([0, 1]); // it flickers
    for (let t = on + 0.31; t < on + 3; t += 0.05) expect(lampOn(t, at, false)).toBeGreaterThan(0.89);
    // reduced motion: straight on
    for (let t = on + 0.005; t < on + 0.3; t += 0.01) expect(lampOn(t, at, true)).toBeGreaterThan(0.89);
    // from the mouth inward
    expect(lampOn(LANTERNS.delay + 0.1, 0, true)).toBeGreaterThan(0);
    expect(lampOn(LANTERNS.delay + 0.1, 60, true)).toBe(0);
  });
});

describe("the bore's own light (laps 1 and 2 were a black void)", () => {
  const track = canyon(), mesh = buildTunnels(track.tunnels, null)!;
  const g = mesh.geometry, lamp = g.getAttribute('lamp').array, col = g.getAttribute('color').array;
  const lit = g.getAttribute('lampLit').array, at = g.getAttribute('lampAt').array, day = g.getAttribute('dayLit').array;
  const pos = g.getAttribute('position').array;
  const line = track.tunnels[0], ds = line.lut.length / line.lut.step;
  /** metres into the bore from the nearer mouth */
  const depth = (v: number) => {
    let bd = Infinity, bk = 0;
    for (let i = 0; i < line.x.length; i++) { const dx = line.x[i] - pos[v * 3], dz = line.z[i] - pos[v * 3 + 2], d = dx * dx + dz * dz; if (d < bd) { bd = d; bk = i; } }
    return Math.min(bk, line.x.length - 1 - bk) * ds;
  };

  it('every rock and timber face inside the bore takes the lanterns\' light, even halfway between two (none is left black)', () => {
    let inside = 0, dark = 0;
    for (let v = 0; v < lamp.length; v++) {
      if (lamp[v] > -0.5 || depth(v) < 3) continue;
      inside++;
      // at its lap-1 level against its own color: at least the fill's share
      if (lum(lit, v) * BORE_LIGHT.ember < lum(col, v) * BORE_LIGHT.fill * BORE_LIGHT.ember * 0.5) dark++;
    }
    expect(inside).toBeGreaterThan(1000);
    expect(dark).toBe(0);
  });

  it('pools: a face near a lantern is lit far more than one between two; and each face flickers on with the lantern nearest it', () => {
    const lanterns = mesh.userData.lanterns as Lantern[];
    expect(lanterns.length).toBeGreaterThan(6);
    let near = 0, nearN = 0, far = 0, farN = 0;
    for (let v = 0; v < lamp.length; v++) {
      if (lamp[v] > -0.5 || depth(v) < 3 || lum(col, v) <= 0) continue;
      let dmin = Infinity, which = 0;
      for (const q of lanterns) { const d = Math.hypot(q.x - pos[v * 3], q.y - pos[v * 3 + 1], q.z - pos[v * 3 + 2]); if (d < dmin) { dmin = d; which = q.at; } }
      const k = lum(lit, v) / lum(col, v);
      if (dmin < 1.5) { near += k; nearN++; expect(at[v]).toBe(which); }
      else if (dmin > 7) { far += k; farN++; }
    }
    expect(nearN).toBeGreaterThan(20);
    expect(farN).toBeGreaterThan(20);
    expect(near / nearN).toBeGreaterThan(3 * (far / farN));
  });

  it('the day spills in at both mouths and dies away inside; none at a mouth or outside it (the sky lights that)', () => {
    let shallow = 0, sN = 0, deep = 0, dN = 0;
    for (let v = 0; v < lamp.length; v++) {
      if (lamp[v] > -0.5 || lum(col, v) <= 0) continue;
      const d = depth(v), k = lum(day, v) / lum(col, v);
      if (d === 0) expect(k).toBe(0);
      else if (d > 1.5 && d < 4) { shallow += k; sN++; }
      else if (d > 20) { deep += k; dN++; }
    }
    expect(sN).toBeGreaterThan(10);
    expect(shallow / sN).toBeGreaterThan(0.5);
    expect(deep / dN).toBeLessThan(0.1);
  });

  it("the shader lights the glass from its own color (the baked shading darkens the vertex color below the glow line), the pools with their lanterns", () => {
    const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>\n#include <aomap_fragment>', uniforms: {} } as unknown as WebGLProgramParametersWithUniforms;
    (mesh.material as MeshToonMaterial).onBeforeCompile(shader, {} as WebGLRenderer);
    expect(shader.vertexShader).toContain('attribute vec3 lampLit');
    expect(shader.fragmentShader).toContain('float lampOn(float at)');
    expect(shader.fragmentShader).toContain(`mix(${BORE_LIGHT.glass.toFixed(3)}, 1.0, lit)`);
    expect(shader.fragmentShader).toContain(`vLampLit * mix(${BORE_LIGHT.ember.toFixed(3)}, 1.0, lampOn(vLampAt)) + vDayLit`);
  });
});

describe('the road through the bore', () => {
  /** a straight road strip along a straight tunnel line (the real line's shape: world points portal to portal) */
  function strip() {
    const track = canyon(), line = track.tunnels[0], n = line.x.length;
    const pos: number[] = [], col: number[] = [];
    for (let i = -20; i < n + 20; i += 2) {
      const k = Math.max(0, Math.min(n - 1, i));
      // past a mouth (i outside 0..n-1): carry on |i - k| samples out along the line's end direction
      const out = Math.abs(i - k), f = k === 0 ? 1 : n - 2;
      const dx = line.x[k] - line.x[f], dz = line.z[k] - line.z[f], dl = Math.hypot(dx, dz) || 1;
      pos.push(line.x[k] + (out ? (dx / dl) * out : 0), line.y[k], line.z[k] + (out ? (dz / dl) * out : 0));
      col.push(0.3, 0.3, 0.3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    return { g, track, lanterns: buildTunnels(track.tunnels, null)!.userData.lanterns as Lantern[] };
  }

  it('lights only what lies inside a bore, warm, more under a lantern, and the final lap\'s (lit) road more than laps 1 and 2', () => {
    const a = strip(), b = strip();
    const litA = lightBoreRoad(a.g, a.lanterns, a.track.tunnels, BORE_LIGHT.ember);
    lightBoreRoad(b.g, b.lanterns, b.track.tunnels, 1);
    expect(litA).toBeGreaterThan(20);
    const ca = a.g.getAttribute('color') as BufferAttribute, cb = b.g.getAttribute('color') as BufferAttribute;
    let outside = 0, warmer = 0, brighter = 0;
    for (let v = 0; v < ca.count; v++) {
      if (ca.getX(v) === Math.fround(0.3) && ca.getZ(v) === Math.fround(0.3)) { outside++; continue; }
      if (ca.getX(v) > ca.getZ(v)) warmer++;
      if (cb.getX(v) > ca.getX(v)) brighter++;
    }
    expect(outside).toBeGreaterThan(10); // the road past each mouth is untouched
    expect(warmer).toBe(litA);
    expect(brighter).toBe(litA);
    // at the lap-1 level the road inside is at least the fill's share brighter, and never more than the most there is
    for (let v = 0; v < ca.count; v++) {
      const k = ca.getX(v) / Math.fround(0.3) - 1;
      expect(k).toBeLessThanOrEqual(BORE_LIGHT.ember * (BORE_ROAD.most * BORE_ROAD.road + BORE_ROAD.roadFill) + 1e-5);
    }
  });

  it("the final lap's road, built ahead and never baked, takes the bore's shade too; on the built scene the laps-1-2 road in the mine is lit", () => {
    const a = strip();
    lightBoreRoad(a.g, a.lanterns, a.track.tunnels, 0, FINAL_ROAD.shade);
    const ca = a.g.getAttribute('color') as BufferAttribute;
    let shaded = 0;
    for (let v = 0; v < ca.count; v++) if (ca.getX(v) < Math.fround(0.3) - 1e-6) shaded++;
    expect(shaded).toBeGreaterThan(10);
    const scene = buildTrackScene(canyon());
    expect((scene.group.getObjectByName('tunnels') as Mesh).userData.lanterns.length).toBeGreaterThan(6);
  });
});

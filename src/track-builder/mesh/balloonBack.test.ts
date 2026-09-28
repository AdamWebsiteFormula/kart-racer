import { describe, expect, it } from 'vitest';
import { InstancedBufferAttribute, Matrix4, Vector3, type InstancedMesh, type Material, type Mesh } from 'three';
import { trackAssetsFor } from '../../art-pipeline/decor.ts';
import { HARBOUR_LOOP } from '../__tests__/fixtures.ts';
import { buildTrack } from '../track.ts';
import { BALLOON_BACK, balloonPose, BalloonBack, SETTLED } from './balloonBack.ts';
import { buildTrackScene } from './scene.ts';

const B = BALLOON_BACK;
const at = (age: number, reduced = false) => ({ ...balloonPose(age, reduced) });
const ages = (from: number, to: number, step = 1 / 240) => { const out: number[] = []; for (let a = from; a < to; a += step) out.push(a); return out; };

/** What three does to a material's program: its patches run on a stand-in shader holding the chunks they hook. */
function compile(m: Material) {
  const shader = {
    uniforms: {} as Record<string, { value: number }>,
    vertexShader: '#include <begin_vertex>\n#include <project_vertex>',
    fragmentShader: '#include <clipping_planes_fragment>\n#include <color_fragment>\n#include <emissivemap_fragment>\n#include <opaque_fragment>',
  };
  m.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

describe('a popped balloon coming back (Adam, 28 Sept 2026: "just appear without any animation. Looks cheap.")', () => {
  it('blows up out of its knot: nothing at first, whole in about a tenth of a second, over and back in a springy wobble, then exactly as modelled', () => {
    const p0 = at(0);
    expect([p0.across, p0.up, p0.ribbon]).toEqual([0, 0, 0]);
    // whole (95 %) within 0.14 s, as MKW's box is back within a few frames (MgkCwst1RqI 7.40 to 7.50 s)
    const whole = ages(0, B.seconds).find((a) => at(a).across >= 0.95 && at(a).up >= 0.95)!;
    expect(whole).toBeLessThan(0.14);
    // springy: it overshoots, squashes (wider than tall) and stretches (taller than wide) after it is whole
    const after = ages(whole, B.seconds);
    expect(Math.max(...after.map((a) => at(a).across))).toBeGreaterThan(1.08);
    expect(after.some((a) => at(a).across - at(a).up > 0.05), 'a squash').toBe(true);
    expect(after.some((a) => at(a).up - at(a).across > 0.03), 'a stretch').toBe(true);
    // swelling, it is taller than wide (stretched out of the knot)
    expect(at(0.05).up).toBeGreaterThan(at(0.05).across);
    // settled: within 2.5 % from 0.45 s, and exactly as modelled from `seconds` (the shader leaves it alone)
    for (const a of ages(0.45, B.seconds)) { expect(Math.abs(at(a).across - 1)).toBeLessThan(0.025); expect(Math.abs(at(a).up - 1)).toBeLessThan(0.025); }
    for (const a of [B.seconds, B.seconds + 0.01, 3, 1e4]) expect(at(a)).toEqual({ across: 1, up: 1, ribbon: 1, shine: 0, alpha: 1 });
    // no jump anywhere: frame to frame (60 fps) the size moves by under a quarter of the whole
    for (const a of ages(0, B.seconds + 0.1, 1 / 60)) expect(Math.abs(at(a + 1 / 60).up - at(a).up)).toBeLessThan(0.36);
  });

  it('its ribbon unrolls down from the knot as it swells, and it comes pale and takes its colour back', () => {
    expect(at(B.unrollDelay / 2).ribbon).toBe(0);
    let last = -1;
    for (const a of ages(0, B.seconds)) { const r = at(a).ribbon; expect(r).toBeGreaterThanOrEqual(last); last = r; }
    expect(at(B.unrollDelay + B.unroll).ribbon).toBe(1);
    // unrolling, not there at once: half out by a sixth of a second
    expect(at(0.08).ribbon).toBeLessThan(0.75);
    expect(at(0).shine).toBeCloseTo(B.shine, 6);
    expect(at(0.1).shine).toBeLessThan(at(0.05).shine);
    expect(at(B.shineSeconds).shine).toBe(0);
  });

  it('reduced motion: a quick fade instead, nothing moving or shining', () => {
    for (const a of ages(0, B.seconds + 0.1, 1 / 60)) {
      const p = at(a, true);
      expect([p.across, p.up, p.ribbon, p.shine]).toEqual([1, 1, 1, 0]);
    }
    expect(at(0, true).alpha).toBe(0);
    expect(at(B.fade / 2, true).alpha).toBeCloseTo(0.5, 6);
    expect(at(B.fade, true).alpha).toBe(1);
    expect(B.fade).toBeLessThanOrEqual(0.25);
  });

  it('a time before it came back (a restart ran the clock back) is as modelled', () => {
    expect(at(-0.1)).toEqual({ across: 1, up: 1, ribbon: 1, shine: 0, alpha: 1 });
    expect(at(Number.NaN)).toEqual({ across: 1, up: 1, ribbon: 1, shine: 0, alpha: 1 });
  });
});

describe('the balloons in the track scene', () => {
  it('each instancer draws its own copy of the balloon with a time back per copy (the Decoy Balloon keeps the shared one), all settled', () => {
    const assets = trackAssetsFor();
    const scene = buildTrackScene(buildTrack(HARBOUR_LOOP), assets);
    const balloons = scene.instancers.get('balloons')!;
    expect(balloons.geometry).not.toBe(assets.geometries.balloon);
    expect(assets.geometries.balloon.getAttribute('balloonBack')).toBeUndefined();
    expect(balloons.geometry.getAttribute('position').count).toBe(assets.geometries.balloon.getAttribute('position').count);
    const back = balloons.geometry.getAttribute('balloonBack') as InstancedBufferAttribute;
    expect(back).toBeInstanceOf(InstancedBufferAttribute);
    expect(back.count).toBeGreaterThanOrEqual(balloons.count);
    expect(Array.from(back.array as Float32Array)).toEqual(Array(back.count).fill(SETTLED));
    // the knot and neck the shader swells it from are the model's own (decor.ts): the knot's foot under the body, the ribbon under that
    const pos = assets.geometries.balloon.getAttribute('position');
    let low = Infinity, below = 0;
    for (let i = 0; i < pos.count; i++) { low = Math.min(low, pos.getY(i)); if (pos.getY(i) < B.knot) below++; }
    expect(low).toBeLessThan(B.knot - 0.5); // the ribbon hangs well below the knot
    expect(below).toBeGreaterThan(0);
    scene.dispose();
  });

  it('its colour, its lens ghosts and its shadow all reshape it (the ghosts share its geometry; the shadow has the patched depth material)', () => {
    const scene = buildTrackScene(buildTrack(HARBOUR_LOOP));
    const balloons = scene.instancers.get('balloons')!;
    const m = balloons.material as Material;
    expect(m.customProgramCacheKey()).toContain('|bback');
    expect(m.customProgramCacheKey(), 'no stipple').not.toContain('|near');
    const s = compile(m);
    expect(s.vertexShader).toMatch(/#include <begin_vertex>[\s\S]*balloonBack[\s\S]*#include <project_vertex>/);
    expect(s.fragmentShader).toMatch(/#include <clipping_planes_fragment>[\s\S]*if \(vBalloonAlpha < 1\.0 && vBalloonAlpha <= bbDither/);
    expect(s.fragmentShader).toMatch(/#include <color_fragment>\s*diffuseColor\.rgb = mix/);
    // the night glow and the lens ghost still patch it (their chunks are still there)
    expect(s.fragmentShader).toContain('pickupGlow');
    expect(s.uniforms.uBalloonNow).toBeDefined();
    const copies: Mesh[] = [];
    balloons.traverse((o) => { if (o !== balloons && (o as Mesh).isMesh) copies.push(o as Mesh); });
    expect(copies.length).toBe(2);
    for (const c of copies) {
      expect(c.geometry).toBe(balloons.geometry);
      expect((c.material as Material).customProgramCacheKey()).toContain('|bback');
    }
    const depth = balloons.customDepthMaterial!;
    expect(depth.customProgramCacheKey()).toContain('|bbackd');
    const d = compile(depth);
    expect(d.vertexShader).toContain('balloonBack');
    expect(d.fragmentShader).not.toContain('diffuseColor.rgb = mix'); // the shadow has no shine
    scene.dispose();
  });

  it('a popped balloon comes back when the sim says, on the tick its timer ran out: its time back set, its matrix as placed, one sparkle', () => {
    const scene = buildTrackScene(buildTrack(HARBOUR_LOOP));
    const balloons = scene.instancers.get('balloons')!;
    const n = HARBOUR_LOOP.pickups!.length;
    const timers = Array.from({ length: n }, () => ({ respawnRemaining: 0 }));
    const back = () => balloons.geometry.getAttribute('balloonBack').array as Float32Array;
    const a = balloons.instanceMatrix.array as Float32Array;
    scene.update(10, [], { pickups: timers });
    timers[1].respawnRemaining = 0.3;
    scene.update(10.1, [], { pickups: timers });
    expect(a[16]).toBe(0); // popped: hidden by its matrix, as ever
    expect(scene.balloonsBack).toEqual([]);
    timers[1].respawnRemaining = 0.05;
    scene.update(10.25, [], { pickups: timers });
    expect(back()[1]).toBe(SETTLED);
    timers[1].respawnRemaining = 0;
    scene.update(10.3125, [], { pickups: timers });
    // it came back 0.05 s after the last frame, between the two frames
    expect(back()[1]).toBeCloseTo(10.3, 5);
    for (let k = 0; k < n; k++) if (k !== 1) expect(back()[k]).toBe(SETTLED);
    // the shader blows it up; its matrix is the one it would have had if it never left (placed, then floating
    // on its ribbon with the rest: floatBalloons, 28 Sept), the same as in a scene where nothing was popped
    const ref = buildTrackScene(buildTrack(HARBOUR_LOOP));
    ref.update(10.3125, [], { pickups: timers.map(() => ({ respawnRemaining: 0 })) });
    const refMats = ref.instancers.get('balloons')!.instanceMatrix.array as Float32Array;
    expect(new Matrix4().fromArray(a, 16).equals(new Matrix4().fromArray(refMats, 16))).toBe(true);
    // the sparkle goes off where the balloon is, floating on its ribbon
    const at = new Vector3().setFromMatrixPosition(new Matrix4().fromArray(refMats, 16));
    expect(scene.balloonsBack).toHaveLength(3);
    // (the sparkle is placed from the balloon's spot, the float moves the balloon a few cm about it)
    expect(Math.abs(scene.balloonsBack[0] - at.x)).toBeLessThan(0.1);
    expect(Math.abs(scene.balloonsBack[1] - (at.y + BalloonBack.BODY_Y))).toBeLessThan(0.1);
    expect(Math.abs(scene.balloonsBack[2] - at.z)).toBeLessThan(0.1);
    // the next frame: the sparkle was that frame's only; the shaders' clock runs on
    scene.update(10.33, [], { pickups: timers });
    expect(scene.balloonsBack).toEqual([]);
    expect(back()[1]).toBeCloseTo(10.3, 5);
    const u = compile(balloons.material as Material).uniforms;
    expect(u.uBalloonNow.value).toBeCloseTo(10.33, 6);
    expect(u.uBalloonReduced.value).toBe(0);
    scene.update(10.35, [], { pickups: timers, reduced: true });
    expect(u.uBalloonReduced.value).toBe(1);
    // a restart runs the clock back: every balloon settled again
    scene.update(0, [], { pickups: timers });
    expect(back()[1]).toBe(SETTLED);
    scene.dispose();
  });

  it('a balloon on the grid at the start, or back before the scene saw it go, blows up for nobody', () => {
    const scene = buildTrackScene(buildTrack(HARBOUR_LOOP));
    const balloons = scene.instancers.get('balloons')!;
    const n = HARBOUR_LOOP.pickups!.length;
    const timers = Array.from({ length: n }, () => ({ respawnRemaining: 0 }));
    for (let t = 0; t < 1; t += 1 / 60) scene.update(t, [], { pickups: timers });
    expect(Array.from(balloons.geometry.getAttribute('balloonBack').array as Float32Array).every((v) => v === SETTLED)).toBe(true);
    // the scene drawn without the race's timers (a test, the attract's menu stage): nothing moves
    scene.update(2);
    expect(scene.balloonsBack).toEqual([]);
    scene.dispose();
  });
});

describe('BalloonBack across a Final Lap Shift (its balloons swapped in: a new instancer)', () => {
  it('writes each balloon\'s time back into whichever instancer is on show, by pickup', () => {
    const bb = new BalloonBack();
    const mk = (count: number) => {
      const attr = new InstancedBufferAttribute(new Float32Array(count).fill(SETTLED), 1);
      return { geometry: { getAttribute: () => attr }, attr } as unknown as InstancedMesh & { attr: InstancedBufferAttribute };
    };
    const mats = (count: number) => { const m = new Float32Array(count * 16); for (let k = 0; k < count; k++) new Matrix4().makeTranslation(k, 1, 0).toArray(m, k * 16); return m; };
    const timers = [{ respawnRemaining: 0 }, { respawnRemaining: 0 }, { respawnRemaining: 0 }];
    const a = mk(3), b = mk(2);
    bb.update(1, timers, a, [0, 1, 2], mats(3), false);
    timers[2].respawnRemaining = 0.1;
    bb.update(1.05, timers, a, [0, 1, 2], mats(3), false);
    timers[2].respawnRemaining = 0;
    // the shift: the new set draws pickups 0 and 2 (1 is on a closed branch now)
    bb.update(1.2, timers, b, [0, 2], mats(2), false);
    expect(Array.from(b.attr.array as Float32Array)).toEqual([SETTLED, expect.closeTo(1.15, 5)]);
    expect(bb.came).toEqual([1, 1 + BalloonBack.BODY_Y, 0]); // pickup 2 is the new set's copy 1
    bb.dispose();
  });
});

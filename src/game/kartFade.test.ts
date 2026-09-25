import { describe, expect, it } from 'vitest';
import {
  Float32BufferAttribute, Mesh, MeshToonMaterial, PerspectiveCamera, Scene, ShaderChunk, SphereGeometry,
  type Material, type ShaderMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer,
} from 'three';
import { ExhaustFlames } from '../vfx-juice/flames.ts';
import { CAM } from './camera.ts';
import { GHOST, KartFader, ghostAlpha, kartBoxDistance } from './kartFade.ts';
import { buildKartMesh } from './kartMesh.ts';

/** Run a material's onBeforeCompile over the toon shader source, as the renderer would; returns the fragment shader and its uniforms. */
function compiled(m: Material): { fragmentShader: string; uniforms: Record<string, { value: unknown }> } {
  const shader = { vertexShader: ShaderChunk.meshtoon_vert, fragmentShader: ShaderChunk.meshtoon_frag, uniforms: {} } as unknown as WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader as unknown as { fragmentShader: string; uniforms: Record<string, { value: unknown }> };
}

/** A camera `d` metres behind the kart at the origin (facing +Z), at its middle's height. */
function cameraBehind(d: number): PerspectiveCamera {
  const c = new PerspectiveCamera();
  c.position.set(0, 1.1, -1.05 - d);
  c.updateMatrixWorld(true);
  return c;
}

describe('a rival near the lens turns to a see-through ghost (no dither)', () => {
  it('its opacity rises smoothly with distance: gone at the lens, whole from CAM.kartFade out', () => {
    expect(ghostAlpha(0)).toBe(0);
    expect(ghostAlpha(GHOST.near)).toBe(0);
    expect(ghostAlpha(CAM.kartFade)).toBe(1);
    expect(ghostAlpha(CAM.kartFade + 5)).toBe(1);
    let last = 0;
    for (let d = 0; d <= CAM.kartFade + 1; d += 0.05) {
      const a = ghostAlpha(d);
      expect(a).toBeGreaterThanOrEqual(last); // monotonic
      expect(a - last).toBeLessThan(0.06); // no jump
      last = a;
    }
    // a rival tucked in between you and the lens (its near end ~3 m off) lets you see through it
    expect(ghostAlpha(3)).toBeLessThan(0.55);
  });

  it('measures to the kart\'s box, not its origin', () => {
    expect(kartBoxDistance(0, 1, 0)).toBe(0);
    expect(kartBoxDistance(0, 1, -3)).toBeCloseTo(3 - 1.05, 6);
    expect(kartBoxDistance(2, 1, 0)).toBeCloseTo(2 - 0.85, 6);
    expect(kartBoxDistance(0, 3.2, 0)).toBeCloseTo(1, 6);
  });

  it('far away it draws as it always did; near the lens its mesh steps aside for a depth copy and a see-through copy', () => {
    const scene = new Scene();
    const fader = new KartFader(scene);
    const kart = buildKartMesh(0xff0000, 0x00ff00);
    const flames = new ExhaustFlames(kart, 'gus');
    scene.add(kart);
    kart.updateMatrixWorld(true);
    const meshes: Mesh[] = [];
    kart.traverse((o) => { if ((o as Mesh).isMesh && o.name !== 'exhaust-flame') meshes.push(o as Mesh); });
    const solids = meshes.map((m) => m.material);
    fader.add(kart);
    // the flames fade with it: they share its opacity
    const fu = (flames.mesh!.material as ShaderMaterial).uniforms;
    expect(fu.uFade.value).toBe(CAM.kartFade);
    fader.update(cameraBehind(2));
    expect(fu.uKart.value).toBeCloseTo(ghostAlpha(2), 5);
    fader.update(cameraBehind(12));
    expect(fu.uKart.value).toBe(1);
    for (const m of meshes) {
      const depth = m.children.find((c) => c.name === 'ghost-depth') as Mesh, ghost = m.children.find((c) => c.name === 'ghost') as Mesh;
      expect(depth.visible).toBe(false);
      expect(ghost.visible).toBe(false);
      expect(depth.geometry).toBe(m.geometry);
      expect((depth.material as Material).colorWrite).toBe(false);
      expect(depth.renderOrder).toBeLessThan(ghost.renderOrder); // the depth copy first
      expect((ghost.material as Material).transparent).toBe(true);
      expect((ghost.material as Material).depthWrite).toBe(false);
      expect(ghost.castShadow).toBe(false);
      expect(depth.castShadow).toBe(m.castShadow); // the ghost still casts its shadow
    }
    // far: untouched
    fader.update(cameraBehind(12));
    meshes.forEach((m, i) => expect(m.material).toBe(solids[i]));
    // near: ghost
    fader.update(cameraBehind(2));
    for (const m of meshes) {
      expect((m.material as Material).visible).toBe(false);
      for (const c of m.children) if (c.name.startsWith('ghost')) expect(c.visible).toBe(true);
    }
    // the see-through copy's shader: the kart's own look, times the kart's opacity
    const ghost = meshes[0].children.find((c) => c.name === 'ghost') as Mesh;
    const g = compiled(ghost.material as Material);
    expect(g.fragmentShader).toContain('diffuseColor.a *= uGhost');
    const alpha = g.uniforms.uGhost.value as number;
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(1);
    expect(alpha).toBeCloseTo(ghostAlpha(2), 5);
    expect((ghost.material as Material).customProgramCacheKey()).toContain('|ghost');
    const depth = meshes[0].children.find((c) => c.name === 'ghost-depth') as Mesh;
    expect(compiled(depth.material as Material).fragmentShader).toContain(`if (uGhost < ${GHOST.depthBelow.toFixed(2)}) discard;`);
    // nearer still: fainter
    fader.update(cameraBehind(1.2));
    expect(g.uniforms.uGhost.value as number).toBeLessThan(alpha);
    // and back out: whole again
    fader.update(cameraBehind(8));
    meshes.forEach((m, i) => expect(m.material).toBe(solids[i]));
    fader.dispose();
  });

  it('runs before each draw of the scene with that draw\'s camera, and stops with the race', () => {
    const scene = new Scene();
    const fader = new KartFader(scene);
    const kart = buildKartMesh(0xff0000, 0x00ff00);
    scene.add(kart);
    kart.updateMatrixWorld(true);
    fader.add(kart);
    const body = kart.children[0] as Mesh, solid = body.material;
    scene.onBeforeRender({} as WebGLRenderer, scene, cameraBehind(1.5), null as never, null as never, null as never);
    expect(body.material).not.toBe(solid);
    fader.dispose();
    expect(body.material).toBe(solid);
    scene.onBeforeRender({} as WebGLRenderer, scene, cameraBehind(1.5), null as never, null as never, null as never);
    expect(body.material).toBe(solid); // a finished race's karts are left alone
  });

  it('ghosts draw after the sparks and flames, farthest first; a whole kart draws in its usual place', () => {
    const scene = new Scene();
    const fader = new KartFader(scene);
    const near = buildKartMesh(0xff0000, 0x00ff00), farther = buildKartMesh(0x0000ff, 0x00ff00), far = buildKartMesh(0xffff00, 0x00ff00);
    farther.position.z = 1; // 1 m further from a camera behind them
    far.position.z = 20;
    for (const k of [near, farther, far]) { scene.add(k); k.updateMatrixWorld(true); fader.add(k); }
    fader.update(cameraBehind(1.8));
    expect(far.renderOrder).toBe(0);
    expect(farther.renderOrder).toBeGreaterThanOrEqual(GHOST.order);
    expect(near.renderOrder).toBeGreaterThan(farther.renderOrder); // back to front
    expect(GHOST.order).toBeGreaterThan(10); // after the particle pools (renderOrder 10)
    fader.update(cameraBehind(12));
    for (const k of [near, farther, far]) expect(k.renderOrder).toBe(0);
    fader.dispose();
  });

  it('the copies share the mesh\'s morph targets and influences (the driver leans, the wheels steer in the ghost too)', () => {
    const geo = new SphereGeometry(0.5, 8, 6);
    const n = geo.getAttribute('position').count;
    geo.morphAttributes.position = [new Float32BufferAttribute(new Float32Array(n * 3), 3)];
    const m = new Mesh(geo, new MeshToonMaterial());
    m.updateMorphTargets();
    const fader = new KartFader(new Scene());
    fader.add(m);
    m.updateMatrixWorld(true);
    fader.update(cameraBehind(1.5));
    m.morphTargetInfluences![0] = 0.7;
    for (const c of m.children as Mesh[]) expect(c.morphTargetInfluences?.[0]).toBe(0.7);
    fader.dispose();
  });
});

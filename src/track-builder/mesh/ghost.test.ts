// Near-lens ghosts (ghost.ts; review 25 Sept 2026: the crab, the kraken's tentacle and the finish
// camera's balloons dissolved in a coarse stipple over the kart): the opacity ramp, what each patch
// does to three's shaders, when the ghost is on, instanced things, and what it frees.
import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, MeshToonMaterial, ShaderLib, SphereGeometry, Vector3, type Material } from 'three';
import { ghostOpacity, LENS_GHOST, NearGhost } from './ghost.ts';

/** What three hands a material's onBeforeCompile: the toon shaders as written. */
function compiled(m: Material): { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> } {
  const shader = { vertexShader: ShaderLib.toon.vertexShader, fragmentShader: ShaderLib.toon.fragmentShader, uniforms: {} as Record<string, unknown> };
  m.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

const copies = (m: Mesh) => m.children.filter((c) => c.userData.ghostCopy) as Mesh[];

describe('near-lens ghosts', () => {
  it('fade as the square of the way from near (gone) to fade (whole)', () => {
    expect(ghostOpacity(0.5, 1.5, 5)).toBe(0);
    expect(ghostOpacity(1.5, 1.5, 5)).toBe(0);
    expect(ghostOpacity(3.25, 1.5, 5)).toBeCloseTo(0.25, 9);
    expect(ghostOpacity(5, 1.5, 5)).toBe(1);
    expect(ghostOpacity(9, 1.5, 5)).toBe(1);
    let last = -1;
    for (let d = 0; d < 6; d += 0.1) { const a = ghostOpacity(d, 1.5, 5); expect(a).toBeGreaterThanOrEqual(last); last = a; }
  });

  it('the thing leaves out its near part only while its ghost is on; the copies draw that part, one clean layer, after the effects', () => {
    const glow = vi.fn();
    const mat = new MeshToonMaterial();
    const before = mat.onBeforeCompile;
    // a patch already on it (the pickups' glow) is kept by the thing and by both copies
    mat.onBeforeCompile = (s, r) => { before.call(mat, s, r); glow(); };
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), mat);
    const ghost = new NearGhost(mesh, 1.5, 5);
    const solid = compiled(mat);
    expect(solid.fragmentShader).toContain('if (uGhostOn > 0.5 && length(vGhostView) < uGhostRange.y) discard;');
    expect(solid.vertexShader).toContain('vGhostView = mvPosition.xyz;');
    expect(mat.customProgramCacheKey()).toContain('|ghostsolid');
    const [depth, see] = copies(mesh);
    expect(depth.name).toBe('lens-ghost-depth');
    expect(see.name).toBe('lens-ghost');
    for (const c of [depth, see]) {
      expect(c.visible).toBe(false);
      expect(c.castShadow).toBe(false);
      expect(c.geometry).toBe(mesh.geometry);
      const m = c.material as Material;
      expect(m.transparent).toBe(true);
      const f = compiled(m).fragmentShader;
      expect(f, 'a copy never leaves out what it draws').not.toContain('uGhostOn');
      expect(m.customProgramCacheKey()).not.toContain('|ghostsolid');
    }
    // the depth copy first, then the see-through one, both after the particles (10) and speed lines (20)
    expect(depth.renderOrder).toBe(LENS_GHOST.order - 1);
    expect(see.renderOrder).toBe(LENS_GHOST.order);
    expect(LENS_GHOST.order).toBeGreaterThan(20);
    const dm = depth.material as Material;
    expect(dm.colorWrite).toBe(false);
    expect(dm.depthWrite).toBe(true);
    expect(dm.polygonOffset && dm.polygonOffsetFactor > 0).toBe(true);
    expect(compiled(dm).fragmentShader).toContain('if (ghostT >= 1.0 || ghostA < 0.02) discard;');
    const sm = see.material as Material;
    expect(sm.depthWrite).toBe(false);
    const f = compiled(sm).fragmentShader;
    expect(f).toContain('if (length(vGhostView) >= uGhostRange.y) discard;');
    expect(f).toContain('diffuseColor.a *= ghostA;');
    expect(glow).toHaveBeenCalledTimes(5); // every compile above kept it: the thing once, the depth and see-through copies twice each
    ghost.dispose();
  });

  it('is on only while some part is within `fade` of the lens, and never for a hidden thing', () => {
    const mat = new MeshToonMaterial();
    const mesh = new Mesh(new SphereGeometry(1), mat);
    mesh.position.set(10, 0, 0);
    const ghost = new NearGhost(mesh, 1.5, 5);
    const on = () => (compiled(mat).uniforms.uGhostOn as { value: number }).value;
    const eye = new Vector3(0, 0, 0);
    ghost.update(eye); // 9 m from its surface
    expect(ghost.active).toBe(false);
    expect(on()).toBe(0);
    expect(copies(mesh).every((c) => !c.visible)).toBe(true);
    eye.set(5.5, 0, 0); // its surface 3.5 m off
    ghost.update(eye);
    expect(ghost.active).toBe(true);
    expect(on()).toBe(1);
    expect(copies(mesh).every((c) => c.visible)).toBe(true);
    // it moves away (its world matrix is read fresh, not last frame's)
    mesh.position.set(20, 0, 0);
    ghost.update(eye);
    expect(ghost.active).toBe(false);
    mesh.position.set(10, 0, 0);
    mesh.visible = false;
    ghost.update(eye);
    expect(ghost.active).toBe(false);
    ghost.dispose();
  });

  it('an instanced thing: its nearest shown instance counts, a zero-scale one (popped, taken) never; the copies share its instances', () => {
    const im = new InstancedMesh(new SphereGeometry(1), new MeshToonMaterial(), 4);
    const m = new Matrix4();
    im.setMatrixAt(0, m.makeTranslation(30, 0, 0));
    im.setMatrixAt(1, m.makeScale(0, 0, 0).setPosition(2, 0, 0)); // hidden at 2 m
    im.setMatrixAt(2, m.makeScale(2, 2, 2).setPosition(0, 0, 8)); // radius 2, 8 m off
    im.count = 3;
    const ghost = new NearGhost(im, 1.5, 5);
    const eye = new Vector3();
    expect(ghost.distance(eye)).toBeCloseTo(6, 6);
    ghost.update(eye);
    expect(ghost.active).toBe(false);
    im.setMatrixAt(0, m.makeTranslation(4, 0, 0));
    ghost.update(eye);
    expect(ghost.active).toBe(true);
    for (const c of copies(im) as InstancedMesh[]) {
      expect(c.instanceMatrix).toBe(im.instanceMatrix);
      expect(c.count).toBe(3);
    }
    im.count = 2;
    ghost.update(eye);
    for (const c of copies(im) as InstancedMesh[]) expect(c.count).toBe(2);
    ghost.dispose();
  });

  it('frees its copies\' materials once and takes them off; the thing\'s own geometry and instances stay', () => {
    const im = new InstancedMesh(new SphereGeometry(1), new MeshToonMaterial(), 2);
    const ghost = new NearGhost(im, 1, 3);
    const mats = copies(im).map((c) => c.material as Material);
    const spies = mats.map((x) => vi.spyOn(x, 'dispose'));
    const geo = vi.spyOn(im.geometry, 'dispose');
    ghost.dispose();
    ghost.dispose();
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1);
    expect(geo).not.toHaveBeenCalled();
    expect(copies(im)).toHaveLength(0);
    expect(im.userData.nearGhost).toBeUndefined();
    ghost.update(new Vector3()); // a late frame after the race is freed: nothing
    expect(ghost.active).toBe(false);
  });
});

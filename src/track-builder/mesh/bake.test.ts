// Tests for the bake (mesh/bake.ts, Adam 25 Sept 2026): determinism, that it only ever darkens (never
// brightens or overwrites hue), that an isolated surface is left alone, that a wall or a decor prop
// shades the ground near it and not far from it, and that neither the sim nor the toon/PBR look
// switch is disturbed by running it.
import { describe, expect, it } from 'vitest';
import {
  BoxGeometry, BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, MeshToonMaterial, PlaneGeometry, type BufferGeometry,
} from 'three';
import { buildTrack } from '../track.ts';
import { HARBOUR_LOOP } from '../__tests__/fixtures.ts';
import { applyLook } from '../../art-pipeline/look.ts';
import { appendDecorProxies, BAKE, bakeTrackShading } from './bake.ts';
import { buildTrackScene } from './scene.ts';

const SUN = [0.4, 0.8, 0.3] as const;

/** A flat, horizontal, finely-gridded plane (normal +Y), centred at the origin, y = 0. */
function flatPlane(size = 40, seg = 16): Mesh {
  const g = new PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  return new Mesh(g, new MeshToonMaterial({ vertexColors: true }));
}

/** The index of the plane's vertex nearest (x, z), for reading a specific spot's baked colour. */
function nearestVertex(geo: BufferGeometry, x: number, z: number): number {
  const pos = geo.getAttribute('position');
  let best = 0, bestD = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const d = (pos.getX(i) - x) ** 2 + (pos.getZ(i) - z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function colourAt(geo: BufferGeometry, i: number): [number, number, number] {
  const c = geo.getAttribute('color');
  return [c.getX(i), c.getY(i), c.getZ(i)];
}

describe('bakeTrackShading', () => {
  it('an isolated receiver (nothing else in the scene) is left at full brightness', () => {
    const group = new Group();
    const ground = flatPlane();
    group.add(ground);
    const stats = bakeTrackShading(group, { receivers: [{ mesh: ground }], sun: SUN });
    const col = ground.geometry.getAttribute('color');
    expect(col).toBeDefined();
    for (let i = 0; i < col.count; i++) {
      expect(col.getX(i)).toBeCloseTo(1, 5);
      expect(col.getY(i)).toBeCloseTo(1, 5);
      expect(col.getZ(i)).toBeCloseTo(1, 5);
    }
    expect(stats.receiverVertices).toBe(ground.geometry.getAttribute('position').count);
    expect(stats.rays).toBeGreaterThan(0);
    expect(stats.buckets).toBeGreaterThan(0);
  });

  it('never brightens, never changes hue, and never goes to black', () => {
    const group = new Group();
    const ground = flatPlane();
    const startColour = new Float32Array(ground.geometry.getAttribute('position').count * 3);
    for (let i = 0; i < startColour.length; i += 3) { startColour[i] = 0.5; startColour[i + 1] = 0.6; startColour[i + 2] = 0.7; }
    ground.geometry.setAttribute('color', new BufferAttribute(startColour, 3));
    const wall = new Mesh(new BoxGeometry(1, 4, 10), new MeshToonMaterial({ vertexColors: true }));
    wall.position.set(3, 2, 0);
    group.add(ground, wall);
    bakeTrackShading(group, { receivers: [{ mesh: ground }, { mesh: wall }], sun: SUN });
    const col = ground.geometry.getAttribute('color');
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
      expect(r).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(g).toBeLessThanOrEqual(0.6 + 1e-6);
      expect(b).toBeLessThanOrEqual(0.7 + 1e-6);
      expect(r).toBeGreaterThan(0);
      // multiplicative darkening keeps the ratios between channels (the same factor on r, g and b)
      expect(g / r).toBeCloseTo(0.6 / 0.5, 3);
      expect(b / r).toBeCloseTo(0.7 / 0.5, 3);
    }
  });

  it('a wall darkens the ground right beside it more than ground far from it', () => {
    const group = new Group();
    const ground = flatPlane();
    const wall = new Mesh(new BoxGeometry(1, 4, 10), new MeshToonMaterial({ vertexColors: true }));
    wall.position.set(3, 2, 0); // stands on the ground from x = 2.5 to 3.5, z = -5 to 5
    group.add(ground, wall);
    bakeTrackShading(group, { receivers: [{ mesh: ground }, { mesh: wall }], sun: SUN });
    const near = nearestVertex(ground.geometry, 2.3, 0); // just outside the wall's foot
    const far = nearestVertex(ground.geometry, -18, 0); // far across the plane
    const [rNear] = colourAt(ground.geometry, near);
    const [rFar] = colourAt(ground.geometry, far);
    expect(rNear).toBeLessThan(rFar);
    expect(rFar).toBeCloseTo(1, 2); // nothing near the far corner: full brightness
  });

  it('a decor instance shades the ground under it; one under minOccluderRadius does not', () => {
    const bigGroup = new Group();
    const bigGround = flatPlane();
    const bigTree = new InstancedMesh(new BoxGeometry(2, 6, 2), new MeshToonMaterial(), 1);
    bigTree.setMatrixAt(0, new Matrix4().makeTranslation(5, 3, 0)); // footprint radius 1, base on the ground at (5, 0)
    bigTree.instanceMatrix.needsUpdate = true;
    bigGroup.add(bigGround, bigTree);
    bakeTrackShading(bigGroup, { receivers: [{ mesh: bigGround }], decor: [bigTree], sun: SUN });
    const nearTree = nearestVertex(bigGround.geometry, 5, 0.6); // just outside the trunk's radius
    const [rNearTree] = colourAt(bigGround.geometry, nearTree);
    expect(rNearTree).toBeLessThan(1);

    const smallGroup = new Group();
    const smallGround = flatPlane();
    const tuft = new InstancedMesh(new BoxGeometry(0.3, 0.3, 0.3), new MeshToonMaterial(), 1); // radius 0.15 < minOccluderRadius
    tuft.setMatrixAt(0, new Matrix4().makeTranslation(5, 0.15, 0));
    tuft.instanceMatrix.needsUpdate = true;
    smallGroup.add(smallGround, tuft);
    bakeTrackShading(smallGroup, { receivers: [{ mesh: smallGround }], decor: [tuft], sun: SUN });
    const nearTuft = nearestVertex(smallGround.geometry, 5, 0);
    const [rNearTuft] = colourAt(smallGround.geometry, nearTuft);
    expect(rNearTuft).toBeCloseTo(1, 5);
  });

  it('appendDecorProxies emits triangles only for a large-enough footprint, none for a tiny one', () => {
    const big = new InstancedMesh(new BoxGeometry(2, 4, 2), new MeshToonMaterial(), 2);
    big.setMatrixAt(0, new Matrix4().makeTranslation(0, 2, 0));
    big.setMatrixAt(1, new Matrix4().makeTranslation(10, 2, 0));
    big.instanceMatrix.needsUpdate = true;
    const out: number[] = [];
    appendDecorProxies(big, out);
    expect(out.length).toBe(2 /* instances */ * BAKE.decorProxySides * 2 /* triangles per side */ * 9 /* numbers per triangle */);

    const tiny = new InstancedMesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshToonMaterial(), 1);
    tiny.setMatrixAt(0, new Matrix4().makeTranslation(0, 0.1, 0));
    tiny.instanceMatrix.needsUpdate = true;
    const outTiny: number[] = [];
    appendDecorProxies(tiny, outTiny);
    expect(outTiny.length).toBe(0);
  });

  it('is deterministic: two identically-built scenes bake to exactly the same colours', () => {
    const build = () => {
      const group = new Group();
      const ground = flatPlane();
      const wall = new Mesh(new BoxGeometry(1, 4, 10), new MeshToonMaterial({ vertexColors: true }));
      wall.position.set(3, 2, 0);
      group.add(ground, wall);
      bakeTrackShading(group, { receivers: [{ mesh: ground }, { mesh: wall }], sun: SUN });
      return ground.geometry.getAttribute('color').array as Float32Array;
    };
    const a = build(), b = build();
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
  });

  it('an empty scene (no receivers) is a no-op, not a throw', () => {
    const group = new Group();
    const stats = bakeTrackShading(group, { receivers: [], sun: SUN });
    expect(stats.rays).toBe(0);
    expect(stats.buckets).toBe(0);
  });

  it('strength scales how much of the bake a receiver takes: 0 leaves it untouched, 1 takes the full factor', () => {
    const full = flatPlane(), scaled = flatPlane(), wallA = new Mesh(new BoxGeometry(1, 4, 10), new MeshToonMaterial()), wallB = new Mesh(new BoxGeometry(1, 4, 10), new MeshToonMaterial());
    wallA.position.set(3, 2, 0); wallB.position.set(3, 2, 0);
    const groupFull = new Group(); groupFull.add(full, wallA);
    const groupScaled = new Group(); groupScaled.add(scaled, wallB);
    bakeTrackShading(groupFull, { receivers: [{ mesh: full }, { mesh: wallA }], sun: SUN });
    bakeTrackShading(groupScaled, { receivers: [{ mesh: scaled, strength: 0.5 }, { mesh: wallB }], sun: SUN });
    const i = nearestVertex(full.geometry, 2.3, 0);
    const [rFull] = colourAt(full.geometry, i);
    const [rScaled] = colourAt(scaled.geometry, nearestVertex(scaled.geometry, 2.3, 0));
    expect(rFull).toBeLessThan(1); // the wall did darken it at strength 1
    // at half strength the darkening (1 - factor) is about half of the full-strength darkening
    expect(1 - rScaled).toBeCloseTo((1 - rFull) / 2, 2);
  });
});

describe('bakeTrackShading integration (buildTrackScene)', () => {
  it('does not touch the sim: the track rebuilt independently has the exact same road samples', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const before = Float32Array.from(track.branches.main.lut.px);
    buildTrackScene(track); // runs the bake as its last step
    expect(Float32Array.from(track.branches.main.lut.px)).toEqual(before);
    const again = buildTrack(HARBOUR_LOOP);
    expect(Float32Array.from(again.branches.main.lut.px)).toEqual(before);
  });

  it('bakes real chunk and coast geometry, and both the toon and the PBR look still read the result', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const scene = buildTrackScene(track);
    expect(scene.group.userData.bakeStats).toBeDefined();
    const stats = scene.group.userData.bakeStats as { receiverMeshes: number; rays: number };
    expect(stats.receiverMeshes).toBeGreaterThan(0);
    expect(stats.rays).toBeGreaterThan(0);

    const coast = scene.group.getObjectByName('coast') as Mesh;
    expect(coast).toBeDefined();
    expect(coast.geometry.getAttribute('color')).toBeDefined();
    expect((coast.material as MeshToonMaterial).vertexColors).toBe(true);

    applyLook(scene.group);
    const pbrCoast = coast.material as MeshStandardMaterial;
    expect(pbrCoast.isMeshStandardMaterial).toBe(true);
    expect(pbrCoast.vertexColors).toBe(true); // the PBR twin still reads the baked vertex colours
  });
});

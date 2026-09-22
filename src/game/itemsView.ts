// Placeholder item meshes for the test drive: one InstancedMesh per kind (4 draw
// calls) plus one instanced bubble shell. Projectiles interpolate prev → current
// like karts. The art-pipeline replaces the geometry, not this shape.
import {
  Color, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, SphereGeometry, CylinderGeometry, ConeGeometry, Vector3,
} from 'three';
import type { KartState } from '../kart-controller/types.ts';
import type { Items } from '../items/items.ts';

const CAP = 16;
const hide = new Matrix4().makeScale(0, 0, 0);

function instanced(geometry: SphereGeometry | CylinderGeometry | ConeGeometry, color: number, opacity = 1): InstancedMesh {
  const mat = new MeshStandardMaterial({ color: new Color(color), roughness: 0.6, transparent: opacity < 1, opacity });
  const m = new InstancedMesh(geometry, mat, CAP);
  m.castShadow = opacity === 1;
  m.frustumCulled = false;
  for (let i = 0; i < CAP; i++) m.setMatrixAt(i, hide);
  return m;
}

export class ItemsView {
  readonly root = new Group();
  private readonly kinds: Record<string, InstancedMesh> = {
    beachBall: instanced(new SphereGeometry(0.6, 12, 8), 0xff5a3c),
    homingKite: instanced(new ConeGeometry(0.6, 1.2, 4), 0xffd23c),
    oilCan: instanced(new CylinderGeometry(1.2, 1.2, 0.05, 16), 0x2a2140),
    decoyBalloon: instanced(new SphereGeometry(0.9, 12, 8), 0x8cd4ff),
  };
  private readonly bubbles = instanced(new SphereGeometry(1.6, 16, 12), 0xa8f0ff, 0.35);
  private readonly dummy = new Object3D();
  private readonly v = new Vector3();

  constructor() {
    for (const m of Object.values(this.kinds)) this.root.add(m);
    this.root.add(this.bubbles);
  }

  /** alpha: render interpolation between the previous and the current tick. */
  onFrame(items: Items, karts: readonly KartState[], kartRoots: readonly Object3D[], alpha: number, time: number): void {
    const counts: Record<string, number> = {};
    const place = (kind: string, x: number, y: number, z: number, spin = 0) => {
      const m = this.kinds[kind];
      if (!m) return;
      const i = counts[kind] ?? 0;
      if (i >= CAP) return;
      counts[kind] = i + 1;
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, spin, 0);
      this.dummy.updateMatrix();
      m.setMatrixAt(i, this.dummy.matrix);
    };
    for (const p of items.state.projectiles) {
      this.v.set(
        p.prevPosition[0] + (p.position[0] - p.prevPosition[0]) * alpha,
        p.prevPosition[1] + (p.position[1] - p.prevPosition[1]) * alpha,
        p.prevPosition[2] + (p.position[2] - p.prevPosition[2]) * alpha,
      );
      place(p.itemId, this.v.x, this.v.y, this.v.z, time * 6);
    }
    for (const g of items.state.groundItems) place(g.itemId, g.position[0], g.position[1] + 0.03, g.position[2]);
    for (const [kind, m] of Object.entries(this.kinds)) {
      for (let i = counts[kind] ?? 0; i < CAP; i++) m.setMatrixAt(i, hide);
      m.instanceMatrix.needsUpdate = true;
    }
    let b = 0;
    for (let i = 0; i < karts.length && b < CAP; i++) {
      if (!karts[i].status.shield) continue;
      const r = kartRoots[i].position;
      this.dummy.position.set(r.x, r.y + 0.6, r.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.bubbles.setMatrixAt(b++, this.dummy.matrix);
    }
    for (; b < CAP; b++) this.bubbles.setMatrixAt(b, hide);
    this.bubbles.instanceMatrix.needsUpdate = true;
  }
}

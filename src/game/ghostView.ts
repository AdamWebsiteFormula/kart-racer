// The Time Trial ghost on screen: a see-through copy of the racer who set the best, placed from the
// recorded path (race-manager/ghost.ts) at the same race time as the live kart. It is only a picture:
// never in the race manager, so it cannot collide, rank, pop a balloon or trigger anything.
import { Group, type Material, type Mesh, type Object3D } from 'three';
import { buildRacerMesh } from '../art-pipeline/index.ts';
import { ghostPose, type GhostPath, type GhostPose } from '../race-manager/ghost.ts';
import { buildKartMesh } from './kartMesh.ts';
import { ROSTER } from './racers.ts';

/** how see-through the ghost is; and fainter still within `nearMetres` of your kart, so one level with you or between you and the lens never hides your own */
export const GHOST_OPACITY = 0.42;
export const GHOST_NEAR = Object.freeze({ opacity: 0.12, nearMetres: 3, farMetres: 9 });

export class GhostView {
  readonly root = new Group();
  private readonly pose: GhostPose = { x: 0, y: 0, z: 0, heading: 0, angle: 0 };

  readonly path: GhostPath;
  private readonly mats: Material[] = [];
  private shown = GHOST_OPACITY;

  constructor(path: GhostPath, racerId: string) {
    this.path = path;
    const r = ROSTER.find((x) => x.id === racerId) ?? ROSTER[0];
    const mesh = buildRacerMesh(racerId) ?? buildKartMesh(r.accent, r.secondary);
    // its own see-through copies of the materials (the racer's are shared with the live karts), freed with the session
    mesh.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = 2;
      const see = (x: Material) => {
        const c = x.clone();
        c.userData.shared = false;
        c.transparent = true;
        c.opacity = GHOST_OPACITY;
        c.depthWrite = false;
        this.mats.push(c);
        return c;
      };
      m.material = Array.isArray(m.material) ? m.material.map(see) : see(m.material);
    });
    this.root.name = 'ghost';
    this.root.add(mesh);
  }

  /** `ticks`: race time in sim ticks, fractional (the live kart is drawn at tick - 1 + alpha). */
  place(ticks: number, near?: { x: number; y: number; z: number }): Object3D {
    const p = ghostPose(this.path, ticks, this.pose);
    this.root.position.set(p.x, p.y, p.z);
    const want = near ? ghostOpacity(Math.hypot(p.x - near.x, p.y - near.y, p.z - near.z)) : GHOST_OPACITY;
    if (Math.abs(want - this.shown) > 0.005) { this.shown = want; for (const m of this.mats) m.opacity = want; }
    this.root.rotation.set(-p.angle, p.heading, 0, 'YXZ'); // as KartView: pitched round a loop-the-loop
    return this.root;
  }
}

/** The ghost's opacity at `d` metres from your kart: faint up close, its full see-through level from `farMetres` on. */
export function ghostOpacity(d: number): number {
  const { opacity, nearMetres, farMetres } = GHOST_NEAR;
  const k = Math.min(1, Math.max(0, (d - nearMetres) / (farMetres - nearMetres)));
  return opacity + (GHOST_OPACITY - opacity) * k * k * (3 - 2 * k);
}

// The rescue claw (race-manager respawn.ts): a golden fairground claw on a long cable drops out of
// the sky onto a kart that fell off, closes on it, carries it back and opens over the road, then
// rises away. Drawn from each tracker's live rescue; the rise-away after the release is kept here.
import { CylinderGeometry, Group, InstancedMesh, Matrix4, MeshToonMaterial, Quaternion, Vector3, type BufferGeometry } from 'three';
import { itemGeometry, vertexToon } from '../art-pipeline/index.ts';
import { RACE } from '../race-manager/constants.ts';
import type { KartTracker } from '../race-manager/types.ts';

const MAX = 8;
const DROP = 16; // metres above the kart the claw comes from
const LEAVE = 0.7; // seconds to rise away after letting go
const HOLD = 1.35; // hub height above the kart it holds

const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

export class RescueView {
  readonly root = new Group();
  private readonly claw: InstancedMesh;
  private readonly cable: InstancedMesh;
  private readonly leaving: ({ x: number; y: number; z: number; age: number } | null)[] = [];
  private readonly was: boolean[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3();

  constructor() {
    this.claw = new InstancedMesh(itemGeometry('claw') as BufferGeometry, vertexToon(), MAX);
    this.claw.castShadow = true;
    this.cable = new InstancedMesh(new CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0), new MeshToonMaterial({ color: 0x3a3a4a }), MAX);
    for (const x of [this.claw, this.cable]) { x.frustumCulled = false; x.count = 0; this.root.add(x); }
  }

  /** Free the cable geometry and both instance buffers (the claw's geometry and the materials are shared or freed by the session). */
  dispose(): void {
    this.cable.geometry.dispose();
    this.cable.dispose();
    this.claw.dispose();
  }

  private put(i: number, x: number, y: number, z: number, open: number, spin: number): void {
    this.q.setFromAxisAngle(this.v.set(0, 1, 0), spin);
    // the prongs spread when open, close round the kart when holding it
    const w = 0.8 + 0.45 * open;
    this.m.compose(this.v.set(x, y, z), this.q, this.s.set(w, 1, w));
    this.claw.setMatrixAt(i, this.m);
    this.m.compose(this.v.set(x, y + 0.3, z), this.q.identity(), this.s.set(1, 60, 1));
    this.cable.setMatrixAt(i, this.m);
  }

  /** `kartPos(i)`: the kart's drawn position (interpolated), world metres. */
  onFrame(trackers: readonly KartTracker[], kartPos: (i: number) => { x: number; y: number; z: number }, dt: number, time: number): void {
    let n = 0;
    for (let i = 0; i < trackers.length && n < MAX; i++) {
      const r = trackers[i].rescue;
      const p = kartPos(i);
      if (r) {
        const since = RACE.rescueSeconds - r.remaining;
        const grab = 0.8 * (RACE.rescueSeconds / 2.4);
        let y = p.y + HOLD, open = 0;
        if (since < grab * 0.7) { y = p.y + HOLD + DROP * (1 - smooth(since / (grab * 0.7))); open = 1; }
        else if (since < grab) open = 1 - smooth((since - grab * 0.7) / (grab * 0.3));
        if (r.remaining < 0.2) open = smooth(1 - r.remaining / 0.2);
        this.put(n++, p.x, y, p.z, open, time * 0.8 + i);
        this.was[i] = true;
        this.leaving[i] = { x: p.x, y: p.y + HOLD, z: p.z, age: 0 };
      } else if (this.was[i] && this.leaving[i]) {
        // let go: it rises back into the sky
        const l = this.leaving[i]!;
        l.age += dt;
        if (l.age >= LEAVE) { this.leaving[i] = null; this.was[i] = false; continue; }
        this.put(n++, l.x, l.y + DROP * smooth(l.age / LEAVE), l.z, 1, time * 0.8 + i);
      }
    }
    for (const x of [this.claw, this.cable]) { x.count = n; x.visible = n > 0; if (n) x.instanceMatrix.needsUpdate = true; }
  }
}

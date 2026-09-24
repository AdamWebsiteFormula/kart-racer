// The boost flames on each kart's exhaust pipes (design §5): shown while the kart boosts, flickering,
// longer while more boost is left. Parented to the kart's chassis so they lean and bounce with it.
// One small mesh per pipe, drawn only while it burns.
import { Mesh, Vector3, type Object3D } from 'three';
import { EXHAUST, flameGeometry, flameMaterial, portDir, type Exhaust } from '../art-pipeline/index.ts';

const DOWN_Z = new Vector3(0, 0, -1);

export class ExhaustFlames {
  readonly meshes: Mesh[] = [];
  private readonly size: number;
  private readonly phase: number;

  constructor(chassis: Object3D, racerId: string) {
    // a shared body (art-pipeline kart.ts) burns from its own pipes
    const e = (chassis.userData.exhaust as Exhaust | undefined) ?? EXHAUST[racerId];
    this.size = e?.size ?? 1;
    let h = 7;
    for (let i = 0; i < racerId.length; i++) h = (h * 31 + racerId.charCodeAt(i)) >>> 0;
    this.phase = (h % 1000) / 100;
    if (!e) return;
    for (const p of e.ports) {
      const d = portDir(e, p);
      // an alt paint's flame burns in the paint's colour (art-pipeline kart.ts exhaustFor)
      const f = new Mesh(flameGeometry(racerId, e.flame !== EXHAUST[racerId]?.flame ? e.flame : undefined), flameMaterial());
      f.name = 'exhaust-flame';
      f.position.set(p[0], p[1], p[2]);
      f.quaternion.setFromUnitVectors(DOWN_Z, new Vector3(d[0], d[1], d[2]));
      f.visible = false;
      f.renderOrder = 2; // after the opaque karts, like the other glows
      chassis.add(f);
      this.meshes.push(f);
    }
  }

  /** `boost` is the seconds of boost left (0 = none), `t` a clock in seconds. Reduced motion holds the flame steady. */
  update(boost: number, t: number, reduced = false): void {
    const on = boost > 0;
    const strength = Math.min(1, 0.45 + boost * 0.6) * this.size;
    for (let i = 0; i < this.meshes.length; i++) {
      const f = this.meshes[i];
      f.visible = on;
      if (!on) continue;
      // two out-of-step wobbles read as fire, and the pipes never flicker together
      const w = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 43 + i * 2.1 + this.phase) * Math.sin(t * 27 + i + this.phase * 0.5);
      const width = this.size * (0.85 + 0.25 * w);
      f.scale.set(width, width, strength * (0.7 + 0.45 * w));
    }
  }
}

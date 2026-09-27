// Gears knocked loose (Adam, 26 Sept 2026: gears, not coins): a hit spins the kart out and knocks up to 2 of its
// gears loose (kart-controller hitCoinsLost; the sim still calls them coins). Here they fly out of the kart as
// little tumbling copies of the track's gear (art-pipeline gear.ts), arc up and out to the sides, land on the
// road, bounce once and shrink away. Pictures only: they never land on the track as pickups (the sim does not
// drop them), so input logs and the leaderboard's replays are unchanged. One InstancedMesh, drawn only while
// one flies; its shader is compiled with the race's (performance warm-up).
import { InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';
import type { KartState } from '../kart-controller/types.ts';

export const SCATTER = Object.freeze({
  /** gears in the air at once, at most (a Horn or a Fog Bank can knock loose 2 from each of 8 karts) */
  cap: 24,
  /** a loose gear's size against the track's (0.58 m to its teeth's tips) */
  scale: 0.42,
  /** seconds from the hit to gone; the last `shrink` of them it shrinks away */
  life: 1.15,
  shrink: 0.3,
  /**
   * thrown up this fast (m/s), out to the side this fast, and carried on with this share of the kart's speed: a
   * hit's spin-out bleeds the kart's speed to nothing in a second, so at 0.7 they keep near it, not back at the lens
   */
  up: [4.6, 6.2] as const,
  side: [2.4, 3.6] as const,
  carry: 0.7,
  /** m/s² down; how much of its fall a bounce gives back; how high over the road it lands (metres) */
  gravity: 17,
  bounce: 0.36,
  rest: 0.14,
  /** tumbling, rad/s */
  spin: [8, 15] as const,
});

interface Bit {
  live: boolean;
  age: number;
  p: Vector3;
  v: Vector3;
  axis: Vector3;
  spin: number;
  angle: number;
  floor: number;
  bounced: boolean;
}

/** Visual-only randomness (never the sim's). */
let seed = 0x2f6b1a3d;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const between = (r: readonly [number, number]) => r[0] + (r[1] - r[0]) * rnd();

export class GearScatter {
  readonly mesh: InstancedMesh;
  private readonly bits: Bit[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();

  /** `geometry`: the track's gear (shared, never freed here); `material`: the scatter's own. */
  constructor(geometry: BufferGeometry, material: Material) {
    this.mesh = new InstancedMesh(geometry, material, SCATTER.cap);
    this.mesh.name = 'gears-lost';
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    for (let i = 0; i < SCATTER.cap; i++) {
      this.bits.push({ live: false, age: 0, p: new Vector3(), v: new Vector3(), axis: new Vector3(0, 0, 1), spin: 0, angle: 0, floor: 0, bounced: false });
    }
  }

  /** Gears in the air now. */
  get flying(): number {
    let n = 0;
    for (let i = 0; i < this.bits.length; i++) if (this.bits[i].live) n++;
    return n;
  }

  /** `n` gears out of kart `k`: up, out to either side in turn, carried on with some of its speed. */
  spawn(k: KartState, n: number): void {
    const f = [Math.sin(k.heading), Math.cos(k.heading)], r = [Math.cos(k.heading), -Math.sin(k.heading)];
    const carry = Math.max(0, k.speed) * SCATTER.carry;
    for (let i = 0; i < n; i++) {
      // the oldest live one gives way when every slot is taken
      let b = this.bits.find((x) => !x.live);
      if (!b) b = this.bits.reduce((a, x) => (x.age > a.age ? x : a));
      const side = (i % 2 === 0 ? 1 : -1) * between(SCATTER.side);
      b.live = true; b.age = 0; b.bounced = false;
      b.floor = k.position[1] + SCATTER.rest;
      b.p.set(k.position[0], k.position[1] + 0.9, k.position[2]);
      b.v.set(f[0] * carry + r[0] * side, between(SCATTER.up), f[1] * carry + r[1] * side);
      b.axis.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      if (b.axis.lengthSq() < 0.5) b.axis.set(0, 0, 1);
      b.spin = between(SCATTER.spin) * (rnd() < 0.5 ? -1 : 1);
      b.angle = rnd() * Math.PI * 2;
    }
  }

  /** Once a frame, `dt` real seconds (an index loop: an iterator would be garbage every frame). */
  update(dt: number): void {
    let n = 0;
    const S = SCATTER;
    for (let i = 0; i < this.bits.length; i++) {
      const b = this.bits[i];
      if (!b.live) continue;
      b.age += dt;
      if (b.age >= S.life) { b.live = false; continue; }
      b.v.y -= S.gravity * dt;
      b.p.addScaledVector(b.v, dt);
      if (b.p.y < b.floor) {
        b.p.y = b.floor;
        if (!b.bounced && b.v.y < 0) { b.v.y = -b.v.y * S.bounce; b.bounced = true; } else b.v.y = 0;
        // the road's grip: it skids to a stop and tumbles slower
        b.v.x *= 0.6; b.v.z *= 0.6; b.spin *= 0.6;
      }
      b.angle += b.spin * dt;
      const left = S.life - b.age, k = S.scale * (left < S.shrink ? left / S.shrink : 1);
      this.q.setFromAxisAngle(b.axis, b.angle);
      this.m.compose(b.p, this.q, this.s.set(k, k, k));
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    if (n > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** New race: none in the air. */
  clear(): void {
    for (let i = 0; i < this.bits.length; i++) this.bits[i].live = false;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  /** Frees the instance buffer (the geometry is the track's, the material the caller's). */
  dispose(): void { this.mesh.dispose(); }
}

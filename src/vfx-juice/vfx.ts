// Vfx: the Three.js side of the juice. Emits particles from kart state every frame (drift sparks,
// boost flames, off-road dust, tyre marks) and bursts from the director's effects each tick
// (balloon pops, coin glints, hit stars, confetti), and owns the shake, kicks and time scale.
import type { Camera, Scene } from 'three';
import { EXHAUST, flameColour } from '../art-pipeline/index.ts';
import type { KartState } from '../kart-controller/types.ts';
import { CameraKick, JUICE, TimeScale, Trauma, driftRoll, sparkColour, type Effects } from './juice.ts';
import { ParticlePool, type SpawnOpts } from './particles.ts';
import { Skids, SpeedLines } from './trails.ts';

const CORAL: [number, number, number] = [1, 0.44, 0.38], SUN: [number, number, number] = [1, 0.82, 0.25];
const TEAL: [number, number, number] = [0.18, 0.77, 0.71], WHITE: [number, number, number] = [1, 0.98, 0.94];
const CHARGE: readonly number[] = [1.1, 1.1, 1.2], FLAME_HOT: readonly number[] = [1.5, 1.2, 0.45];
const DUST_MUD: readonly number[] = [0.45, 0.33, 0.22], DUST_ICE: readonly number[] = [0.9, 0.95, 1], DUST: readonly number[] = [0.86, 0.77, 0.6];
const CONFETTI = [CORAL, SUN, TEAL, WHITE, [0.7, 0.62, 0.86] as [number, number, number], [0.39, 0.71, 0.96] as [number, number, number]];

/** Visual-only randomness (never touches the sim). */
let seed = 0x1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const sym = () => rnd() * 2 - 1;

interface KartMem { l: [number, number, number]; r: [number, number, number]; skid: boolean; sparkAcc: number; flameAcc: number; dustAcc: number }

export class Vfx {
  readonly glow = new ParticlePool(1536, true);
  readonly soft = new ParticlePool(1024, false);
  readonly confetti = new ParticlePool(512, false, true);
  readonly skids = new Skids();
  readonly lines = new SpeedLines();
  readonly trauma = new Trauma();
  readonly kick = new CameraKick();
  readonly time = new TimeScale();
  private readonly mem = new Map<string, KartMem>();
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.2, life: 0.4 };
  readonly shake = { x: 0, y: 0, z: 0, roll: 0 };
  private readonly spark: [number, number, number] = [0, 0, 0];
  /** each racer's flame colour for the embers (design §5: the exhaust burns in the racer's colour) */
  private readonly flameCols = new Map<string, readonly number[]>();

  constructor(scene: Scene, camera: Camera) {
    scene.add(this.glow.mesh, this.soft.mesh, this.confetti.mesh, this.skids.mesh);
    this.lines.attach(camera);
    if (!camera.parent) scene.add(camera); // camera children only render if the camera is in the scene
  }

  /** New race: forget trails and particles. */
  reset(): void {
    this.glow.clear(); this.soft.clear(); this.confetti.clear(); this.skids.clear(); this.mem.clear();
    this.trauma.value = 0;
    this.time.reset(); // a restart mid hit-stop or slow-mo must not start frozen
    this.kick.reset();
  }

  private spawn(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, c: readonly number[], size: number, life: number, gravity = 0, drag = 0, grow = 0): void {
    const o = this.o;
    o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz;
    o.r = c[0]; o.g = c[1]; o.b = c[2]; o.size = size; o.life = life; o.gravity = gravity; o.drag = drag; o.grow = grow;
    pool.spawn(o);
  }

  /** Once per sim tick with the director's effects. `now` is a wall clock in seconds. */
  /** the player's kart as of the last frame (a creature's quake fades with distance from it) */
  private lastPlayer: KartState | undefined;

  onTick(fx: Effects, kartOf: (racerId: string) => KartState | undefined, now: number, reduced: boolean): void {
    if (fx.trauma > 0) this.trauma.add(fx.trauma);
    if (fx.kickBoost) this.kick.boost(now);
    if (fx.kickHit) this.kick.hit(now);
    if (fx.hitStop && !reduced) this.time.hitStop(now);
    if (fx.slowMo && !reduced) this.time.slowMo(now);
    for (const q of fx.quakes) {
      // dust where it hit, and a shake for the player that fades with distance
      const [x, y, z] = q.position;
      for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; this.spawn(this.soft, x + Math.cos(a) * 3, y + 0.5, z + Math.sin(a) * 3, Math.cos(a) * 9, 1 + rnd() * 2, Math.sin(a) * 9, DUST, 1.4, 0.9, 0, 1.8, 1.5); }
      const me = this.lastPlayer;
      if (me) {
        const d = Math.hypot(me.position[0] - x, me.position[2] - z);
        const k = Math.max(0, 1 - d / JUICE.quakeReach);
        if (k > 0 && !reduced) this.trauma.add(JUICE.traumaQuake * q.strength * k);
      }
    }
    for (const b of fx.bursts) {
      const k = kartOf(b.racerId);
      if (!k) continue;
      const [x, y, z] = k.position;
      switch (b.kind) {
        case 'balloon':
          for (let i = 0; i < 26; i++) this.spawn(this.soft, x, y + 1.6, z, sym() * 6, 2 + rnd() * 5, sym() * 6, CONFETTI[i % 4], 0.22, 0.7, 12, 1);
          for (let i = 0; i < 10; i++) this.spawn(this.glow, x, y + 1.6, z, sym() * 3, rnd() * 3, sym() * 3, [1.6, 1.4, 0.9], 0.3, 0.3, 0, 3);
          break;
        case 'coin':
          for (let i = 0; i < 10; i++) this.spawn(this.glow, x, y + 1, z, sym() * 2, 2 + rnd() * 3, sym() * 2, [1.8, 1.4, 0.3], 0.18, 0.5, 6);
          break;
        case 'hitStars':
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            this.spawn(this.glow, x, y + 1.4, z, Math.cos(a) * 3, 3 + rnd() * 2, Math.sin(a) * 3, [1.9, 1.6, 0.3], 0.26, 0.6, 7, 1.5);
          }
          break;
        case 'confetti':
          for (let i = 0; i < 180; i++) this.spawn(this.confetti, x + sym() * 4, y + 5 + rnd() * 3, z + sym() * 4, sym() * 4, rnd() * 4, sym() * 4, CONFETTI[i % CONFETTI.length], 0.18, 2.5 + rnd(), 4, 1.2);
          break;
        case 'land': case 'wall':
          for (let i = 0; i < 10; i++) this.spawn(this.soft, x + sym() * 0.6, y + 0.2, z + sym() * 0.6, sym() * 2.5, rnd() * 1.5, sym() * 2.5, [0.86, 0.8, 0.7], 0.5, 0.5, 0, 2, 1.5);
          break;
        case 'shield':
          for (let i = 0; i < 18; i++) this.spawn(this.glow, x, y + 1, z, sym() * 3, sym() * 3, sym() * 3, [0.6, 1.3, 1.9], 0.25, 0.45, 0, 2);
          break;
        case 'horn':
          for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; this.spawn(this.glow, x, y + 0.8, z, Math.cos(a) * 14, 0, Math.sin(a) * 14, [1.4, 1.4, 1.5], 0.35, 0.35, 0, 1); }
          break;
        case 'fog':
          for (let i = 0; i < 40; i++) this.spawn(this.soft, x + sym() * 10, y + 1 + rnd() * 3, z + sym() * 10, sym(), rnd() * 0.3, sym(), [0.72, 0.74, 0.78], 2.2, 2.5, 0, 0.3, 1);
          break;
        case 'strike':
          // STRIKE! confetti and white-and-red pin chips thrown up, and a bright flash ring
          for (let i = 0; i < 140; i++) this.spawn(this.confetti, x + sym() * 2, y + 1.5, z + sym() * 2, sym() * 9, 5 + rnd() * 8, sym() * 9, CONFETTI[i % CONFETTI.length], 0.2, 1.6 + rnd(), 12, 1);
          for (let i = 0; i < 24; i++) this.spawn(this.soft, x, y + 1.2, z, sym() * 7, 4 + rnd() * 6, sym() * 7, i % 3 ? WHITE : CORAL, 0.35, 0.9, 16, 0.5);
          for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; this.spawn(this.glow, x, y + 1, z, Math.cos(a) * 16, 0.5, Math.sin(a) * 16, [1.8, 1.3, 1.9], 0.4, 0.4, 0, 1); }
          break;
        case 'slam':
          // a ring of dust rolling out over the road
          for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; this.spawn(this.soft, x, y + 0.3, z, Math.cos(a) * 11, 0.6 + rnd(), Math.sin(a) * 11, DUST, 0.9, 0.7, 0, 2.2, 1.6); }
          for (let i = 0; i < 16; i++) this.spawn(this.glow, x + sym(), y + 0.4, z + sym(), sym() * 3, 2 + rnd() * 3, sym() * 3, [1.8, 1.6, 1.2], 0.3, 0.4, 8, 1);
          break;
        case 'spring':
          for (let i = 0; i < 12; i++) this.spawn(this.soft, x + sym() * 0.6, y + 0.2, z + sym() * 0.6, sym() * 3, rnd() * 1.2, sym() * 3, DUST, 0.6, 0.5, 0, 2, 1.4);
          break;
        case 'fizz':
          // soda foam spraying out behind the kart
          for (let i = 0; i < 30; i++) this.spawn(this.soft, x + sym() * 0.4, y + 0.8, z + sym() * 0.4, sym() * 2.5, 1.5 + rnd() * 3, sym() * 2.5, i % 4 ? WHITE : TEAL, 0.28, 0.7, 6, 1.2);
          break;
      }
    }
  }

  /**
   * Once per rendered frame. `simDt` is the sim time that passed this frame (0 while paused or
   * frozen), so emitters stop with the sim; particles keep fading on the real `dt`.
   */
  frame(dt: number, simDt: number, t: number, karts: readonly KartState[], player: KartState | undefined, camPos: readonly number[], reduced: boolean): void {
    this.lastPlayer = player;
    if (simDt > 0) for (const k of karts) this.emit(k, simDt, t, camPos);
    this.glow.update(dt); this.soft.update(dt); this.confetti.update(dt);
    this.skids.setTime(t);
    this.trauma.update(dt);
    this.trauma.shake(t, this.shake, !reduced);
    this.lines.update(t, dt, !reduced && player !== undefined && player.boost.remaining > 0 && player.speed > 8);
  }

  private emit(k: KartState, dt: number, t: number, cam: readonly number[]): void {
    if (k.isGhost) return;
    const dx = k.position[0] - cam[0], dz = k.position[2] - cam[2];
    if (dx * dx + dz * dz > 70 * 70) { const far = this.mem.get(k.racerId); if (far) far.skid = false; return; } // too far to see
    let m = this.mem.get(k.racerId);
    if (!m) { m = { l: [0, 0, 0], r: [0, 0, 0], skid: false, sparkAcc: 0, flameAcc: 0, dustAcc: 0 }; this.mem.set(k.racerId, m); }
    const s = Math.sin(k.heading), c = Math.cos(k.heading);
    const [px, py, pz] = k.position;
    // rear wheels: 0.6 back, 0.55 either side (right = (cos h, 0, −sin h))
    const bx = px - s * 0.6, bz = pz - c * 0.6;
    const lx = bx - c * 0.55, lz = bz + s * 0.55, rx = bx + c * 0.55, rz = bz - s * 0.55;
    const drifting = k.drift.active && k.grounded;

    // tyre marks while drifting on the ground
    if (drifting) {
      if (m.skid) {
        this.skids.add(m.l[0], m.l[1], m.l[2], lx, py, lz, 0.22, t);
        this.skids.add(m.r[0], m.r[1], m.r[2], rx, py, rz, 0.22, t);
      }
      m.l[0] = lx; m.l[1] = py; m.l[2] = lz; m.r[0] = rx; m.r[1] = py; m.r[2] = rz;
    }
    m.skid = drifting;

    // drift sparks from the rear wheels, coloured by tier; small white ones while charging
    if (drifting) {
      m.sparkAcc += dt * (k.drift.tier > 0 ? 70 : 18);
      const col = k.drift.tier > 0 ? sparkColour(k.drift.tier, t, this.spark) : CHARGE;
      while (m.sparkAcc >= 1) {
        m.sparkAcc -= 1;
        const left = rnd() < 0.5;
        this.spawn(this.glow, left ? lx : rx, py + 0.12, left ? lz : rz, -s * 3 + sym() * 2.5 - c * k.drift.direction * 2, 1.5 + rnd() * 3, -c * 3 + sym() * 2.5 + s * k.drift.direction * 2, col, k.drift.tier > 0 ? 0.2 : 0.12, 0.3 + rnd() * 0.15, 9);
      }
    } else m.sparkAcc = 0;

    // boost embers streaming off the exhaust pipes (the flames on the pipes themselves: flames.ts)
    if (k.boost.remaining > 0) {
      const ex = EXHAUST[k.racerId];
      let col = this.flameCols.get(k.racerId);
      if (!col) { col = flameColour(k.racerId, 1.8); this.flameCols.set(k.racerId, col); }
      m.flameAcc += dt * 36; // a stream of small embers; the flame itself is the mesh on the pipe
      while (m.flameAcc >= 1) {
        m.flameAcc -= 1;
        const hot = rnd() < 0.4;
        // a pipe mouth in world space: right = (cos h, 0, −sin h), forward = (sin h, 0, cos h)
        let x = bx, y = py + 0.45, z = bz;
        if (ex) {
          const p = ex.ports[(rnd() * ex.ports.length) | 0];
          x = px + c * p[0] + s * p[2]; y = py + p[1]; z = pz - s * p[0] + c * p[2];
        }
        this.spawn(this.glow, x + sym() * 0.06, y + sym() * 0.06, z + sym() * 0.06, -s * (5 + rnd() * 4), 0.6 + rnd(), -c * (5 + rnd() * 4), hot ? FLAME_HOT : col, 0.13, 0.16, 0, 1, 0.5);
      }
    } else m.flameAcc = 0;

    // off-road dust
    if (k.grounded && (k.surface === 'dirt' || k.surface === 'mud' || k.surface === 'ice') && Math.abs(k.speed) > 4) {
      m.dustAcc += dt * 14;
      const col = k.surface === 'mud' ? DUST_MUD : k.surface === 'ice' ? DUST_ICE : DUST;
      while (m.dustAcc >= 1) {
        m.dustAcc -= 1;
        // low, small and quick: a kicked-up trail, never a cloud that hides the kart
        this.spawn(this.soft, bx + sym() * 0.5, py + 0.15, bz + sym() * 0.5, -s * 1.5 + sym(), 0.4 + rnd() * 0.5, -c * 1.5 + sym(), col, 0.38, 0.42, 0, 1.8, 0.9);
      }
    } else m.dustAcc = 0;
  }

  /** Camera roll for the player's drift plus the trauma roll. */
  roll(player: KartState | undefined, reduced: boolean): number {
    return (player ? driftRoll(player.drift.active, player.drift.direction, reduced) : 0) + this.shake.roll;
  }

  dispose(): void {
    this.glow.dispose(); this.soft.dispose(); this.confetti.dispose(); this.skids.dispose(); this.lines.dispose();
  }
}

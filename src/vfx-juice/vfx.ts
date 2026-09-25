// Vfx: the Three.js side of the juice. Emits particles from kart state every frame (drift sparks,
// boost flames, off-road dust, tyre marks) and bursts from the director's effects each tick
// (balloon pops, coin glints, hit stars, confetti), and owns the shake, kicks and time scale.
import type { Camera, Scene } from 'three';
import type { KartState } from '../kart-controller/types.ts';
import { CameraKick, DriftRoll, JUICE, TimeScale, Trauma, boostHold, type Effects } from './juice.ts';
import { KartFx } from './kartfx.ts';
import { ParticlePool, type SpawnOpts } from './particles.ts';
import { Skids, SpeedLines } from './trails.ts';

const CORAL: [number, number, number] = [1, 0.44, 0.38];
const TEAL: [number, number, number] = [0.18, 0.77, 0.71], WHITE: [number, number, number] = [1, 0.98, 0.94];
const WHITE_HOT: readonly number[] = [2.4, 2.3, 2.1];
const DUST: readonly number[] = [0.86, 0.77, 0.6], SCUFF: readonly number[] = [0.7, 0.66, 0.6];
/** the Final Lap Shift's bursts: canyon dust in shadow, hot sparks, an oak's leaves */
const DUST_DARK: readonly number[] = [0.66, 0.46, 0.32], SPARK_GOLD: readonly number[] = [2.2, 1.6, 0.5];
const LEAVES: readonly (readonly [number, number, number])[] = [[0.12, 0.42, 0.08], [0.2, 0.55, 0.1], [0.3, 0.5, 0.06]];
/** Linear RGB with one channel near zero, so each colour survives the tone mapping as a clear hue (no white, no pastels). */
export const CONFETTI: readonly (readonly [number, number, number])[] = [
  [1, 0.04, 0.22], [1, 0.62, 0.02], [0.02, 0.62, 0.48], [0.04, 0.26, 1], [0.42, 0.06, 0.92], [1, 0.2, 0.02],
];
/**
 * The player's finish shower: centred `ahead` metres (plus `lead` seconds of the kart's speed) up
 * the road, so the kart drives into it and the chase camera, 6 m behind, looks at it, not through it.
 */
/**
 * Balloon and coin pops: your own at full size, a rival's small and dim. With balloons back in 0.5 s,
 * eight karts pop a row at once, and full-size bright sparkles bloomed into discs over the road.
 */
export const POP = Object.freeze({
  mine: Object.freeze({ confetti: 26, glow: 10, glowSize: 0.3, coinGlow: 10 }),
  rival: Object.freeze({ confetti: 8, glow: 3, glowSize: 0.16, coinGlow: 3 }),
  /** a rival's sparkle colour stays under the bloom threshold (the player's is HDR and blooms) */
  rivalGlow: Object.freeze([1.0, 0.92, 0.7]),
});
export const CONFETTI_BURST = Object.freeze({ count: 180, ahead: 4, lead: 0.4, spread: 4, depth: 3, rise: 4.5, riseSpread: 3, size: 0.22 });
/** The STRIKE burst: thrown up and out to the sides and forward from `ahead` metres in front, never back at the lens. */
export const STRIKE_BURST = Object.freeze({ count: 140, ahead: 1.5, side: 9, forward: [1, 8] as const, up: [5, 13] as const, size: 0.24 });
/**
 * The podium ceremony's fireworks (game/podium.ts): a round burst of sparks in one confetti hue made
 * bright past 1 (they bloom), falling and fading, with a white heart; soft and slow, never a strobe.
 * Reduced motion: `reducedCount` sparks.
 */
export const FIREWORK = Object.freeze({ count: 72, reducedCount: 30, speed: 8.5, size: 0.42, life: 1.3, gravity: 2.6, drag: 1.3, heat: 2.2 });
/** Confetti drifting down over the podium: from `up` metres over it (plus up to `spread`), slower than the finish shower. */
export const CONFETTI_RAIN = Object.freeze({ up: 7, spread: 2.5, size: 0.24, life: 3.6, gravity: 2.2, drag: 1.4 });

/** Visual-only randomness (never touches the sim). */
let seed = 0x1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const sym = () => rnd() * 2 - 1;

export class Vfx {
  readonly glow = new ParticlePool(1536, true);
  readonly soft = new ParticlePool(1024, false);
  readonly confetti = new ParticlePool(512, false, true);
  readonly skids = new Skids();
  readonly lines = new SpeedLines();
  readonly trauma = new Trauma();
  readonly kick = new CameraKick();
  /** the camera's roll into the player's drift, eased */
  readonly camRoll = new DriftRoll();
  readonly time = new TimeScale();
  /** each kart's drift specks, flame flakes, pipe puffs, dust and tyre marks (kartfx.ts; the tyre stars and the flames burn on the kart's own mesh, flames.ts) */
  readonly kartFx = new KartFx(this.soft, this.skids);
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.2, life: 0.4 };
  /** a firework's colour, reused */
  private readonly hot: number[] = [1, 1, 1];
  readonly shake = { x: 0, y: 0, z: 0, roll: 0 };

  constructor(scene: Scene, camera: Camera) {
    scene.add(this.glow.mesh, this.soft.mesh, this.confetti.mesh, this.skids.mesh, this.kartFx.sparks.mesh);
    this.lines.attach(camera);
    if (!camera.parent) scene.add(camera); // camera children only render if the camera is in the scene
  }

  /** New race: forget trails and particles. */
  reset(): void {
    this.glow.clear(); this.soft.clear(); this.confetti.clear(); this.skids.clear(); this.kartFx.reset();
    this.trauma.value = 0;
    this.time.reset(); // a restart mid hit-stop or slow-mo must not start frozen
    this.kick.reset();
    this.camRoll.value = 0;
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
    if (fx.kickBoost) this.kick.boost(now, fx.kickBoost);
    if (fx.kickHit) this.kick.hit(now);
    if (fx.shiftPulse) this.kick.pulse(now);
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
        case 'balloon': {
          const p = b.mine ? POP.mine : POP.rival, glow = b.mine ? [1.6, 1.4, 0.9] : POP.rivalGlow;
          for (let i = 0; i < p.confetti; i++) this.spawn(this.soft, x, y + 1.6, z, sym() * 6, 2 + rnd() * 5, sym() * 6, CONFETTI[i % 4], 0.22, 0.7, 12, 1);
          for (let i = 0; i < p.glow; i++) this.spawn(this.glow, x, y + 1.6, z, sym() * 3, rnd() * 3, sym() * 3, glow, p.glowSize, 0.3, 0, 3);
          break;
        }
        case 'coin': {
          const n = b.mine ? POP.mine.coinGlow : POP.rival.coinGlow, glow = b.mine ? [1.8, 1.4, 0.3] : POP.rivalGlow;
          for (let i = 0; i < n; i++) this.spawn(this.glow, x, y + 1, z, sym() * 2, 2 + rnd() * 3, sym() * 2, glow, 0.18, 0.5, 6);
          break;
        }
        case 'hitStars':
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            this.spawn(this.glow, x, y + 1.4, z, Math.cos(a) * 3, 3 + rnd() * 2, Math.sin(a) * 3, [1.9, 1.6, 0.3], 0.26, 0.6, 7, 1.5);
          }
          break;
        case 'confetti': {
          // up the road from the kart (forward = (sin h, 0, cos h), right = (cos h, 0, −sin h))
          const C = CONFETTI_BURST, s = Math.sin(k.heading), c = Math.cos(k.heading);
          const ahead = C.ahead + Math.max(0, k.speed) * C.lead;
          for (let i = 0; i < C.count; i++) {
            const f = ahead + sym() * C.depth, l = sym() * C.spread;
            this.spawn(this.confetti, x + s * f + c * l, y + C.rise + rnd() * C.riseSpread, z + c * f - s * l, sym() * 3, rnd() * 3, sym() * 3, CONFETTI[i % CONFETTI.length], C.size, 2.5 + rnd(), 4, 1.2);
          }
          break;
        }
        case 'land': case 'wall':
          // a low, quick scuff of dust, not big pale puffs (they read as blurry blobs behind the kart, at night most of all)
          for (let i = 0; i < 8; i++) this.spawn(this.soft, x + sym() * 0.6, y + 0.15, z + sym() * 0.6, sym() * 2.5, rnd() * 1.2, sym() * 2.5, SCUFF, 0.3, 0.38, 0, 2.2, 1);
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
        case 'strike': {
          // STRIKE! confetti and white-and-red pin chips thrown up, and a bright flash ring. The
          // confetti goes up, out and forward: none of it flies back into the chase camera.
          const S = STRIKE_BURST, s = Math.sin(k.heading), c = Math.cos(k.heading);
          const ox = x + s * S.ahead, oz = z + c * S.ahead;
          for (let i = 0; i < S.count; i++) {
            const f = S.forward[0] + rnd() * (S.forward[1] - S.forward[0]), l = sym() * S.side;
            this.spawn(this.confetti, ox + sym() * 2, y + 1.5, oz + sym() * 2, s * f + c * l, S.up[0] + rnd() * (S.up[1] - S.up[0]), c * f - s * l, CONFETTI[i % CONFETTI.length], S.size, 1.6 + rnd(), 12, 1);
          }
          for (let i = 0; i < 24; i++) this.spawn(this.soft, x, y + 1.2, z, sym() * 7, 4 + rnd() * 6, sym() * 7, i % 3 ? WHITE : CORAL, 0.35, 0.9, 16, 0.5);
          for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; this.spawn(this.glow, x, y + 1, z, Math.cos(a) * 16, 0.5, Math.sin(a) * 16, [1.8, 1.3, 1.9], 0.4, 0.4, 0, 1); }
          break;
        }
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

  /** One firework burst at (x, y, z) in confetti hue `hue` (any integer); `scale` grows it (a burst high over the road: 3). */
  firework(x: number, y: number, z: number, hue: number, reduced = false, scale = 1): void {
    const F = FIREWORK, c = CONFETTI[((hue % CONFETTI.length) + CONFETTI.length) % CONFETTI.length], o = this.hot;
    o[0] = c[0] * F.heat + 0.3; o[1] = c[1] * F.heat + 0.3; o[2] = c[2] * F.heat + 0.3;
    const n = reduced ? F.reducedCount : F.count;
    for (let i = 0; i < n; i++) {
      // directions spread evenly round a sphere
      const u = sym(), a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = F.speed * scale * (0.8 + rnd() * 0.4);
      this.spawn(this.glow, x, y, z, Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp, o, F.size * scale, F.life + rnd() * 0.4, F.gravity * scale, F.drag);
    }
    for (let i = 0; i < 5; i++) this.spawn(this.glow, x, y, z, sym() * scale, sym() * scale, sym() * scale, WHITE_HOT, F.size * 2.2 * scale, 0.3, 0, 2);
  }

  /**
   * A Final Lap Shift set piece's burst (track-builder mesh/shiftStage.ts): dust where something lands
   * (a big one near the player's kart shakes the camera a little), a plume rising out of a chasm,
   * sparks, a tree's leaves, a firework high over the road. `size` scales it.
   */
  shiftBurst(kind: 'dust' | 'plume' | 'sparks' | 'leaves' | 'firework', x: number, y: number, z: number, size: number, hue: number, reduced: boolean): void {
    switch (kind) {
      case 'dust': {
        const n = Math.round(18 * size);
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.spawn(this.soft, x + Math.cos(a) * size, y + 0.3, z + Math.sin(a) * size, Math.cos(a) * 5 * size, 0.8 + rnd() * 2 * size, Math.sin(a) * 5 * size, DUST, 1.1 * size, 1 + rnd() * 0.5, 0, 1.6, 1.4); }
        const me = this.lastPlayer;
        if (me && size >= 1.4 && !reduced) {
          const k = Math.max(0, 1 - Math.hypot(me.position[0] - x, me.position[2] - z) / JUICE.quakeReach);
          if (k > 0) this.trauma.add(JUICE.traumaQuake * 0.45 * k);
        }
        break;
      }
      case 'plume':
        // a slow column of dust rising out of the chasm, big enough to read from across the canyon
        for (let i = 0; i < 26; i++) this.spawn(this.soft, x + sym() * 3 * size, y + rnd() * 2, z + sym() * 3 * size, sym() * 1.5, 4 + rnd() * 5, sym() * 1.5, DUST_DARK, 2.2 * size, 2.6 + rnd() * 1.2, -0.6, 0.5, 1.8);
        break;
      case 'sparks':
        for (let i = 0; i < 22; i++) this.spawn(this.glow, x, y, z, sym() * 4 * size, 1 + rnd() * 5 * size, sym() * 4 * size, SPARK_GOLD, 0.16 * size, 0.45 + rnd() * 0.3, 9, 1);
        break;
      case 'leaves':
        for (let i = 0; i < 30; i++) this.spawn(this.confetti, x + sym() * 3 * size, y + rnd() * 3, z + sym() * 3 * size, sym() * 3, 1 + rnd() * 3, sym() * 3, LEAVES[i % LEAVES.length], 0.3, 2 + rnd(), 2.5, 1.6);
        break;
      case 'firework': this.firework(x, y, z, hue, reduced, size); break;
    }
  }

  /** `n` pieces of confetti drifting down over (x, y, z), within `radius` metres of it. */
  confettiRain(x: number, y: number, z: number, radius: number, n: number): void {
    const R = CONFETTI_RAIN;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
      this.spawn(this.confetti, x + Math.cos(a) * r, y + R.up + rnd() * R.spread, z + Math.sin(a) * r, sym() * 1.2, -rnd() * 0.6, sym() * 1.2,
        CONFETTI[Math.floor(rnd() * CONFETTI.length) % CONFETTI.length], R.size, R.life + rnd(), R.gravity, R.drag);
    }
  }

  /**
   * Once per rendered frame. `simDt` is the sim time that passed this frame (0 while paused or
   * frozen), so emitters stop with the sim; particles keep fading on the real `dt`.
   */
  frame(dt: number, simDt: number, t: number, karts: readonly KartState[], player: KartState | undefined, camPos: readonly number[], reduced: boolean): void {
    this.lastPlayer = player;
    if (simDt > 0) for (const k of karts) this.kartFx.emit(k, simDt, t, camPos, k === player, reduced);
    this.glow.update(dt); this.soft.update(dt); this.confetti.update(dt); this.kartFx.update(dt);
    this.skids.setTime(t);
    this.trauma.update(dt);
    this.trauma.shake(t, this.shake, !reduced);
    // the streaks run while a boost does, hardest at its punch; never under reduced motion
    this.lines.update(t, dt, this.boostLevel(player, t, reduced));
    this.camRoll.update(dt, player !== undefined && player.drift.active && player.grounded, player?.drift.direction ?? 0, player?.speed ?? 0, reduced);
  }

  /** Camera roll for the player's drift (eased, zero under reduced motion) plus the trauma roll. */
  roll(player: KartState | undefined): number {
    return (player ? this.camRoll.value : 0) + this.shake.roll;
  }

  /** 0..1: how hard the player's boost is felt now (its hold, or its punch while that is stronger); 0 at a crawl or under reduced motion. The speed lines and the post chain's streaks run on it. */
  boostLevel(player: KartState | undefined, t: number, reduced: boolean): number {
    if (reduced || !player || player.speed <= 8) return 0;
    return Math.min(1, Math.max(boostHold(player.boost.remaining, player.boost.multiplier), this.kick.level(t)));
  }

  dispose(): void {
    this.glow.dispose(); this.soft.dispose(); this.confetti.dispose(); this.skids.dispose(); this.lines.dispose(); this.kartFx.dispose();
  }
}

// The items' effects (28 Sept 2026, the new set; Adam: "a rocket that can be shot at someone and causes a
// cool explosion", "a Star Wars style laser gun", "turning into a fighter jet", "I still want it rated G, just
// in a cool way"): bright energy, never fire and gore, and nobody hurt (a hit racer spins out, as ever).
//
// Studied first, in muted stills (scripts/headless/frames.mjs, 28 Sept 2026) and never copied:
// - Crash Team Racing Nitro-Fueled (youtube.com/watch?v=yKBszye7EIQ, every power-up used once): a missile's
//   hit is a white-yellow flash, then a ring of white smoke round the kart and a few chunks tossed up (2:11,
//   2:13); its Power Shield is a translucent green sphere with a bright rim round the kart (3:30); a bomb's
//   blast whites out the middle of the screen for a moment (4:34).
// - Mario Kart World's Bullet Bill (youtube.com/watch?v=HXhV6EclzFY, a Bullet Bills-only race): the camera
//   rides close behind the transformed kart, whose exhaust glows white-hot and orange in the middle of the
//   frame, the world streaked by motion blur (0:40, 0:48, 1:20, 1:44); the kart comes back with a puff (0:56).
// - Sonic & All-Stars Racing Transformed (youtube.com/watch?v=ndxNhlWXXoY): a transformation is a gold burst
//   of sparkles as parts fold out of the car (2:46); a homing shot is announced by a red lock-on marker on the
//   target (2:56); boosts are glowing magenta jets from the rear (1:46).
// So ours: a Homing Rocket's end is an energy explosion (a white-hot flash in an orange one, a shock ring
// over the road, sparks, a comic-book burst and a puff of white smoke); Jet Mode forms in a flash and a puff
// and ends in a sonic boom (a white vapor ring across the jet's way, a shock ring on the road, vapor thrown
// forward and out, never back at the lens); the Laser Blaster's bolt leaves a hot pink trail and splashes on
// the walls; the Shockwave, the EMP Blast and the Jump Jets' dive are rings of their own colors over the road;
// an EMP'd kart crackles with electric sparks while it is slowed; a Nitro fires a blue-white shock ring off
// the pipes; the Energy Shield lands round the kart and shatters in hex shards. Pictures only: the sim, its
// events and the results are untouched; everything here draws into the particle pools that already exist and
// one ring-and-flash mesh (blasts.ts, one draw call while any is alive).
import { ITEMS_CONFIG } from '../items/data.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { Projectile } from '../items/types.ts';
import { Blasts, type BlastOpts } from './blasts.ts';
import { SHAPE, type ParticlePool, type SpawnOpts } from './particles.ts';

type Rgb = readonly [number, number, number];
const rgb = (r: number, g: number, b: number): Rgb => Object.freeze([r, g, b] as const);

/** The items' light colors (linear, above 1 blooms). */
export const ITEM_RGB = Object.freeze({
  laser: rgb(2.6, 0.45, 1.5), laserHot: rgb(3, 2.4, 2.8),
  fire: rgb(2.8, 0.95, 0.12), fireHot: rgb(3.2, 2.3, 0.9), heart: rgb(3.2, 3.0, 2.6),
  smoke: rgb(0.86, 0.85, 0.84),
  cyan: rgb(0.55, 2.1, 2.8), cyanHot: rgb(2.1, 2.8, 3.1),
  emp: rgb(1.1, 0.8, 3.0), spark: rgb(1.6, 2.0, 3.2),
  nitro: rgb(0.9, 1.9, 3.1), white: rgb(2.6, 2.7, 2.9),
  mine: rgb(3.0, 0.45, 0.3), skin: rgb(1, 0.03, 0.2),
  beam: rgb(0.5, 2.4, 0.9), thrust: rgb(2.8, 1.6, 0.55),
});

/** The Homing Rocket's explosion: flash sizes (m) and lives (s), the shock ring's reach, sparks, embers, smoke; its shake for the player within `reach` m. */
export const BOOM = Object.freeze({
  up: 0.55, flash: [0.8, 4.2] as const, flashLife: 0.24, glow: [1.2, 3.2] as const, glowLife: 0.5,
  ring: [0.6, 7.5] as const, ringLife: 0.5, sparks: 40, sparkSpeed: [7, 16] as const, embers: 22, smoke: 7, burst: 3.4,
  trauma: 0.35, reach: 28,
});
/** Jet Mode's sonic boom: the vapor rings across its way (how far ahead), the shock ring on the road (the burst's own radius), the vapor and sparkles thrown forward and out. */
export const SONIC = Object.freeze({
  ahead: [0.8, 2.2] as const, vapor: [0.5, 3.4] as const, vaporLife: 0.36, flash: [0.8, 3.6] as const, flashLife: 0.2,
  ringLife: 0.5, puffs: 26, sparkles: 30, forward: [3, 9] as const, out: 6, up: [1.5, 5] as const,
});
/** The EMP Blast: its pulse over the road (m) and each shorted kart's crackle, as long as the sim's slow lasts (items data fogBank durationSeconds). */
export const EMP = Object.freeze({ ring: [1, 18] as const, ringLife: 0.6, crackle: 3, sparksPerSecond: 70, flashEvery: 0.28 });
/** How high a Decoy Mine's balloon hangs over its drop (game/itemsView.ts MINE.lift; itemsView.test.ts holds them equal): it bursts there. */
export const MINE_UP = 1.9;
/** Trails: the Laser Blaster's bolt (glows a second), the Homing Rocket's smoke and nozzle sparks, Jet Mode's wingtip contrails. */
export const TRAIL = Object.freeze({ laser: 110, rocketSmoke: 45, rocketFire: 70, contrail: 100 });

/** A burst the effects know (the director's Burst kinds for the items). */
export type ItemBurst =
  | 'boom' | 'zap' | 'laserPop' | 'mineBurst' | 'droneFizz' | 'pulse' | 'emp' | 'shorted' | 'sonic' | 'jetForm'
  | 'thrust' | 'dive' | 'nitro' | 'shieldOn' | 'shieldBreak' | 'lock' | 'sling';

/** Visual-only randomness (never touches the sim). */
let seed = 0x51ed27;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const sym = () => rnd() * 2 - 1;
const lerp = (a: readonly [number, number], k: number) => a[0] + (a[1] - a[0]) * k;
/** a shot flies this high over the road (the sim's): its rings lie on the road under it */
const SHOT_UP = ITEMS_CONFIG.projectileHeight;
/** a ring over the road floats this high over it (a kart's point can sit a hair under the drawn road, which then hid it) */
const RING_UP = 0.25;

/** The pools the effects draw into (vfx.ts's). */
export interface FxPools { glow: ParticlePool; soft: ParticlePool; confetti: ParticlePool; sparks: ParticlePool }

export class ItemFx {
  readonly blasts = new Blasts(40);
  private readonly pools: FxPools;
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.2, life: 0.4 };
  private readonly b: BlastOpts = { kind: 'flash', x: 0, y: 0, z: 0, life: 0.2, from: 0, to: 1, r: 1, g: 1, b: 1 };
  /** each shorted kart's end and its next little flash, on `clock` */
  private readonly shorted = new Map<string, { until: number; flash: number }>();
  /** seconds of frames so far (its own: a wall clock can step back) */
  private clock = 0;
  /** emission carried over between frames (fractions of a particle), by what emits */
  private readonly acc = new Map<string, number>();

  constructor(pools: FxPools) { this.pools = pools; }

  reset(): void {
    this.blasts.clear();
    this.shorted.clear();
    this.acc.clear();
    this.clock = 0;
  }

  dispose(): void { this.blasts.dispose(); }

  /** Is `racerId` crackling from an EMP Blast now? (checks) */
  isShorted(racerId: string): boolean { return (this.shorted.get(racerId)?.until ?? -1) > this.clock; }

  private spawn(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, c: Rgb, size: number, life: number,
    gravity = 0, drag = 0, grow = 0, stretch = 0, alpha = 1, shape = 0): void {
    const o = this.o;
    o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz;
    o.r = c[0]; o.g = c[1]; o.b = c[2]; o.size = size; o.life = life; o.gravity = gravity; o.drag = drag; o.grow = grow;
    o.stretch = stretch; o.alpha = alpha; o.shape = shape; o.spin = shape ? sym() * 3 : 0; o.phase = rnd() * 6.283;
    o.cx = 0; o.cy = 0; o.cz = 0;
    pool.spawn(o);
  }

  private blast(kind: 'ring' | 'flash', x: number, y: number, z: number, life: number, r: readonly [number, number], c: Rgb,
    alpha = 1, width = 0.25, widthEnd = width, axis: readonly [number, number, number] = [0, 1, 0], delay = 0): void {
    const b = this.b;
    b.kind = kind; b.x = x; b.y = y; b.z = z; b.life = life; b.from = r[0]; b.to = r[1];
    b.r = c[0]; b.g = c[1]; b.b = c[2]; b.alpha = alpha; b.width = width; b.widthEnd = widthEnd;
    b.ax = axis[0]; b.ay = axis[1]; b.az = axis[2]; b.delay = delay;
    this.blasts.spawn(b);
  }

  /** `n` sparks flung from (x, y, z) in every direction at `speed` m/s (streaks, falling). */
  private sparkBall(x: number, y: number, z: number, n: number, speed: readonly [number, number], hot: Rgb, c: Rgb, life = 0.45, up = 0): void {
    for (let i = 0; i < n; i++) {
      const u = sym(), a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = lerp(speed, rnd());
      this.spawn(this.pools.sparks, x, y, z, Math.cos(a) * r * sp, u * sp + up, Math.sin(a) * r * sp, i % 3 ? c : hot, 0.1, life * (0.7 + 0.6 * rnd()), 9, 1.4, 0, 0.05);
    }
  }

  /**
   * One item burst at (x, y, z) (a kart's place or a shot's), `h` the kart's heading where it has one; `radius`:
   * a ring's reach (the Shockwave's, the dive's, the sonic boom's), `mine`: the player's own (full size).
   */
  burst(kind: ItemBurst, x: number, y: number, z: number, h: number, reduced: boolean, radius = 6, racerId = ''): void {
    const P = this.pools, C = ITEM_RGB;
    const flash = reduced ? 0.5 : 1; // a calmer flash for reduced motion (no big white pops)
    const fx = Math.sin(h), fz = Math.cos(h);
    switch (kind) {
      case 'boom': {
        const B = BOOM, cy = y + B.up;
        // a white-hot heart for a moment, inside an orange fireball of light, a gold comic-book burst, a ring racing over the road
        this.blast('flash', x, cy, z, B.flashLife * 0.6, [B.flash[0], B.flash[1] * 0.55 * flash], C.heart);
        this.blast('flash', x, cy, z, B.glowLife, [B.glow[0], B.glow[1] * flash], C.fire, 0.9, 0.25, 0.25, [0, 1, 0], 0.02);
        this.blast('flash', x, cy, z, B.flashLife, [B.flash[0], B.flash[1] * flash], C.fireHot, 0.7);
        this.blast('ring', x, y - SHOT_UP + RING_UP, z, B.ringLife, B.ring, C.fireHot, 1, 0.4, 0.12);
        this.spawn(P.glow, x, cy, z, 0, 0, 0, C.fireHot, B.burst * flash, 0.16, 0, 0, 0, 0, 1, SHAPE.burst);
        this.sparkBall(x, cy, z, B.sparks, B.sparkSpeed, C.fireHot, C.fire, 0.5, 2);
        for (let i = 0; i < B.embers; i++) this.spawn(P.glow, x, cy, z, sym() * 5, 1 + rnd() * 5, sym() * 5, C.fire, 0.34, 0.45 + rnd() * 0.2, 6, 1.5);
        // a light puff of smoke round it, over quickly (the light is the explosion, not the smoke)
        for (let i = 0; i < B.smoke; i++) {
          const a = (i / B.smoke) * Math.PI * 2;
          this.spawn(P.soft, x + Math.cos(a) * 0.6, cy, z + Math.sin(a) * 0.6, Math.cos(a) * 3.2, 1 + rnd() * 1.4, Math.sin(a) * 3.2, C.smoke, 0.8, 0.6 + rnd() * 0.3, -0.4, 2.4, 1.5, 0, 0.6);
        }
        break;
      }
      case 'zap': {
        // a bolt glancing off a wall: a pink splash
        this.blast('flash', x, y + 0.3, z, 0.12, [0.2, 1 * flash], C.laser);
        this.sparkBall(x, y + 0.3, z, 8, [4, 8], C.laserHot, C.laser, 0.22);
        break;
      }
      case 'laserPop': {
        this.blast('flash', x, y + 0.3, z, 0.16, [0.3, 1.5 * flash], C.laserHot);
        this.blast('ring', x, y - SHOT_UP + RING_UP, z, 0.25, [0.2, 1.4], C.laser, 0.9, 0.3, 0.12);
        this.sparkBall(x, y + 0.3, z, 14, [4, 9], C.laserHot, C.laser, 0.28);
        break;
      }
      case 'mineBurst': {
        // the balloon bursts red, its skin in shreds
        this.blast('flash', x, y, z, 0.24, [0.5, 3 * flash], C.mine);
        this.blast('ring', x, y - MINE_UP + RING_UP, z, 0.4, [0.5, 4.2], C.mine, 0.8, 0.3, 0.1);
        this.spawn(P.glow, x, y, z, 0, 0, 0, C.fireHot, 2 * flash, 0.14, 0, 0, 0, 0, 1, SHAPE.burst);
        this.sparkBall(x, y, z, 20, [5, 11], C.fireHot, C.mine, 0.4);
        for (let i = 0; i < 16; i++) this.spawn(P.confetti, x, y, z, sym() * 5, 1 + rnd() * 5, sym() * 5, C.skin, 0.28, 1 + rnd() * 0.5, 7, 1.2);
        for (let i = 0; i < 4; i++) this.spawn(P.soft, x + sym() * 0.4, y, z + sym() * 0.4, sym() * 1.5, 0.6 + rnd(), sym() * 1.5, C.smoke, 0.6, 0.6, -0.3, 2, 1.3, 0, 0.6);
        break;
      }
      case 'droneFizz': {
        this.blast('flash', x, y + 0.4, z, 0.14, [0.2, 1 * flash], C.cyanHot);
        this.sparkBall(x, y + 0.4, z, 12, [3, 7], C.cyanHot, C.cyan, 0.3);
        for (let i = 0; i < 4; i++) this.spawn(P.soft, x, y + 0.4, z, sym(), 0.8 + rnd(), sym(), C.smoke, 0.5, 0.6, -0.2, 2, 1.4);
        break;
      }
      case 'pulse': {
        // the Shockwave: two rings racing out over the road to its reach, a flash, sparks skimming out
        this.blast('flash', x, y + 0.7, z, 0.18, [0.8, 2.6 * flash], C.cyanHot);
        this.blast('ring', x, y + RING_UP, z, 0.38, [0.8, radius + 0.5], C.cyanHot, 1, 0.38, 0.12);
        this.blast('ring', x, y + RING_UP, z, 0.42, [0.6, radius], C.cyan, 0.8, 0.24, 0.08, [0, 1, 0], 0.07);
        this.blast('ring', x, y + 1.3, z, 0.34, [0.6, radius * 0.7], C.cyan, 0.4, 0.2, 0.06);
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2;
          this.spawn(P.glow, x, y + 0.6, z, Math.cos(a) * radius * 2.6, 0, Math.sin(a) * radius * 2.6, i % 2 ? C.cyanHot : C.cyan, 0.3, 0.33, 0, 1);
        }
        break;
      }
      case 'emp': {
        // the EMP Blast: a violet pulse racing out over the road and on ahead, crackling round its racer
        this.blast('flash', x, y + 0.9, z, 0.25, [1, 3.5 * flash], C.emp);
        this.blast('ring', x, y + RING_UP, z, EMP.ringLife, EMP.ring, C.emp, 1, 0.3, 0.06);
        this.blast('ring', x, y + RING_UP, z, EMP.ringLife * 1.1, [0.8, EMP.ring[1] * 0.8], C.spark, 0.7, 0.18, 0.05, [0, 1, 0], 0.08);
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2;
          this.spawn(P.glow, x, y + 0.7, z, Math.cos(a) * 20, 0.5, Math.sin(a) * 20, i % 2 ? C.spark : C.emp, 0.3, 0.4, 0, 1);
        }
        this.sparkBall(x, y + 0.8, z, 12, [3, 7], C.spark, C.emp, 0.25);
        break;
      }
      case 'shorted': {
        // an EMP'd kart: a crack of light and a burst of sparks, a wisp of smoke, then it crackles while it is slowed
        this.blast('flash', x, y + 0.9, z, 0.2, [0.4, 2.2 * flash], C.spark);
        this.sparkBall(x, y + 0.9, z, 16, [3, 8], C.cyanHot, C.spark, 0.3);
        for (let i = 0; i < 4; i++) this.spawn(P.soft, x + sym() * 0.4, y + 1, z + sym() * 0.4, sym() * 0.5, 1 + rnd(), sym() * 0.5, [0.32, 0.32, 0.36], 0.6, 0.9, -0.2, 1.5, 1.5, 0, 0.6);
        if (racerId) this.shorted.set(racerId, { until: this.clock + EMP.crackle, flash: this.clock + EMP.flashEvery });
        break;
      }
      case 'jetForm': {
        // Jet Mode forms: a flash, a ring over the road and a puff it comes out of
        this.blast('flash', x, y + 1, z, 0.22, [0.6, 2.8 * flash], C.cyanHot);
        this.blast('ring', x, y + RING_UP, z, 0.35, [0.5, 3.6], C.white, 0.8, 0.3, 0.1);
        for (let i = 0; i < 20; i++) this.spawn(P.glow, x, y + 1, z, sym() * 5, sym() * 3 + 1, sym() * 5, i % 2 ? C.white : C.cyan, 0.24, 0.4, 0, 2);
        for (let i = 0; i < 10; i++) this.spawn(P.soft, x + sym() * 0.8, y + 0.8, z + sym() * 0.8, sym() * 2.5, rnd() * 1.5, sym() * 2.5, C.smoke, 0.55, 0.4, 0, 2.5, 1.3, 0, 0.8);
        break;
      }
      case 'sonic': {
        // the sonic boom: white vapor rings across the jet's way, a shock ring over the road to the burst's reach,
        // a flash, vapor and sparkles thrown forward and out (never back at the lens)
        const S = SONIC, dir: [number, number, number] = [fx, 0, fz];
        for (let k = 0; k < 2; k++) {
          const a = S.ahead[k];
          this.blast('ring', x + fx * a, y + 1, z + fz * a, S.vaporLife * (1 + k * 0.15), [S.vapor[0], S.vapor[1] * (1 - k * 0.25)], C.white, 0.85 - k * 0.2, 0.5, 0.18, dir, k * 0.05);
        }
        this.blast('flash', x + fx * 1.2, y + 1, z + fz * 1.2, S.flashLife, [S.flash[0], S.flash[1] * flash], C.white);
        this.blast('ring', x, y + RING_UP, z, S.ringLife, [0.8, radius + 0.5], C.cyanHot, 0.9, 0.3, 0.1);
        for (let i = 0; i < S.puffs; i++) {
          // a disc of vapor across the jet's way, spreading out and carried forward
          const a = (i / S.puffs) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          const ox = fz * ca, oz = -fx * ca, oy = sa;
          const fwd = lerp(S.forward, rnd());
          this.spawn(P.soft, x + fx * 1 + ox * 0.6, y + 1 + oy * 0.6, z + fz * 1 + oz * 0.6, fx * fwd + ox * 5, oy * 3 + 1, fz * fwd + oz * 5, C.smoke, 0.9, 0.8 + rnd() * 0.3, 0, 2.2, 2.2);
        }
        for (let i = 0; i < S.sparkles; i++) {
          const f = lerp(S.forward, rnd()), l = sym() * S.out;
          this.spawn(P.glow, x + fx * 1.2, y + 1, z + fz * 1.2, fx * f + fz * l, lerp(S.up, rnd()), fz * f - fx * l, i % 2 ? C.white : C.cyan, 0.28, 0.5 + rnd() * 0.2, 5, 1.2);
        }
        break;
      }
      case 'thrust': {
        // the Jump Jets fire: a flash under the kart, a ring over the road, sparks and dust blown out
        this.blast('flash', x, y + 0.25, z, 0.18, [0.4, 2.2 * flash], C.thrust);
        this.blast('ring', x, y + RING_UP, z, 0.35, [0.5, 3.2], C.thrust, 0.9, 0.3, 0.1);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.spawn(P.sparks, x, y + 0.15, z, Math.cos(a) * (5 + rnd() * 4), 0.5 + rnd() * 1.5, Math.sin(a) * (5 + rnd() * 4), i % 2 ? C.fireHot : C.thrust, 0.1, 0.3, 6, 1.4, 0, 0.05);
        }
        for (let i = 0; i < 12; i++) this.spawn(P.soft, x + sym() * 0.6, y + 0.2, z + sym() * 0.6, sym() * 3, rnd() * 1.2, sym() * 3, [0.86, 0.77, 0.6], 0.6, 0.5, 0, 2, 1.4);
        break;
      }
      case 'dive': {
        // the Jump Jets' dive lands: two shock rings over the road to the slam's reach, a flash, dust and sparks
        this.blast('flash', x, y + 0.4, z, 0.2, [0.8, 3 * flash], C.fireHot);
        this.blast('ring', x, y + RING_UP, z, 0.45, [0.8, radius + 0.5], C.thrust, 1, 0.35, 0.12);
        this.blast('ring', x, y + RING_UP, z, 0.5, [0.6, radius], C.cyanHot, 0.7, 0.22, 0.08, [0, 1, 0], 0.06);
        for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; this.spawn(P.soft, x, y + 0.3, z, Math.cos(a) * 11, 0.6 + rnd(), Math.sin(a) * 11, [0.86, 0.77, 0.6], 0.9, 0.7, 0, 2.2, 1.6); }
        for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2; this.spawn(P.sparks, x, y + 0.3, z, Math.cos(a) * (6 + rnd() * 6), 1 + rnd() * 3, Math.sin(a) * (6 + rnd() * 6), i % 2 ? C.fireHot : C.thrust, 0.1, 0.35, 9, 1.2, 0, 0.05); }
        break;
      }
      case 'nitro': {
        // a Nitro fires: a blue-white shock ring off the pipes and sparks streaming back
        const bx = x - fx * 1.1, bz = z - fz * 1.1, by = y + 0.55;
        this.blast('flash', bx, by, bz, 0.16, [0.3, 1.6 * flash], C.nitro);
        this.blast('ring', bx, by, bz, 0.3, [0.3, 1.9], C.cyanHot, 0.9, 0.35, 0.12, [fx, 0, fz]);
        for (let i = 0; i < 24; i++) {
          const sp = 8 + rnd() * 7;
          this.spawn(P.sparks, bx + sym() * 0.2, by + sym() * 0.2, bz + sym() * 0.2, -fx * sp + sym() * 2, sym() * 1.5 + 0.5, -fz * sp + sym() * 2, i % 3 ? C.nitro : C.cyanHot, 0.1, 0.25, 2, 1, 0, 0.05);
        }
        break;
      }
      case 'shieldOn': {
        // the Energy Shield lands round the kart: a ring closing in over the road and sparks rising up it
        this.blast('ring', x, y + RING_UP, z, 0.3, [2.6, 1.7], C.cyan, 0.9, 0.25, 0.12);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.spawn(P.glow, x + Math.cos(a) * 1.6, y + 0.2, z + Math.sin(a) * 1.8, 0, 2 + rnd() * 2.5, 0, i % 2 ? C.cyanHot : C.cyan, 0.2, 0.4, 0, 1);
        }
        break;
      }
      case 'shieldBreak': {
        // it takes a hit and shatters: a flash, a ring and hex shards flung off it
        this.blast('flash', x, y + 0.9, z, 0.2, [0.8, 2.6 * flash], C.cyanHot);
        this.blast('ring', x, y + RING_UP, z, 0.3, [1.5, 3.6], C.cyan, 0.9, 0.25, 0.1);
        for (let i = 0; i < 28; i++) {
          const u = sym(), a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 5 + rnd() * 4;
          const dx = Math.cos(a) * r, dy = Math.abs(u), dz = Math.sin(a) * r;
          this.spawn(P.glow, x + dx * 1.5, y + 0.8 + dy * 1.1, z + dz * 1.7, dx * sp, dy * sp + 1, dz * sp, i % 2 ? C.cyanHot : C.cyan, 0.24, 0.5 + rnd() * 0.2, 7, 1);
        }
        break;
      }
      case 'lock': {
        // the Tractor Beam locks on: a green flash and sparks on the kart it hooked
        this.blast('flash', x - fx * 1.3, y + 0.6, z - fz * 1.3, 0.16, [0.3, 1.5 * flash], C.beam);
        this.blast('ring', x - fx * 1.3, y + 0.6, z - fz * 1.3, 0.25, [0.2, 1.2], C.beam, 0.9, 0.3, 0.12, [fx, 0, fz]);
        this.sparkBall(x - fx * 1.3, y + 0.6, z - fz * 1.3, 12, [3, 7], C.cyanHot, C.beam, 0.3);
        break;
      }
      case 'sling': {
        // slingshot: a green-white ring off the kart's tail and sparks streaming back
        const bx = x - fx * 1.2, bz = z - fz * 1.2;
        this.blast('ring', bx, y + 0.6, bz, 0.3, [0.4, 2.4], C.beam, 0.9, 0.35, 0.12, [fx, 0, fz]);
        for (let i = 0; i < 20; i++) {
          const sp = 7 + rnd() * 6;
          this.spawn(P.sparks, bx, y + 0.6 + sym() * 0.3, bz, -fx * sp + sym() * 2, sym(), -fz * sp + sym() * 2, i % 2 ? C.beam : C.cyanHot, 0.1, 0.25, 2, 1, 0, 0.05);
        }
        break;
      }
    }
  }

  /** How many particles `key` emits this frame at `rate` a second over `dt` (the fraction carried to the next frame). */
  private count(key: string, rate: number, dt: number): number {
    const a = (this.acc.get(key) ?? 0) + rate * dt;
    const n = Math.floor(a);
    this.acc.set(key, a - n);
    return n;
  }

  /**
   * Once per rendered frame: the shots' trails (a bolt's pink glow, a rocket's smoke and fire), Jet Mode's
   * contrails, the EMP'd karts' crackle, and the rings' clock. `dt`: the frame's seconds; `simDt`: sim
   * seconds this frame (0 paused: nothing new is emitted).
   */
  frame(dt: number, simDt: number, projectiles: readonly Projectile[] | undefined, karts: readonly KartState[], reduced: boolean): void {
    this.clock += Math.max(0, dt);
    this.blasts.update(dt);
    const now = this.clock;
    const P = this.pools, C = ITEM_RGB;
    if (simDt > 0 && projectiles) {
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        const [x, y, z] = p.position, [px, py, pz] = p.prevPosition;
        if (p.itemId === 'beachBall') {
          // the bolt's glowing trail, laid along the stretch it flew this frame
          const n = this.count(`b${p.id}`, TRAIL.laser, simDt);
          for (let k = 0; k < n; k++) {
            const f = (k + rnd()) / Math.max(1, n);
            this.spawn(P.glow, px + (x - px) * f, py + (y - py) * f + 0.3, pz + (z - pz) * f, 0, 0, 0, C.laser, 0.2, 0.16, 0, 0, -0.6);
          }
        } else if (p.itemId === 'homingKite') {
          const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz) || 1;
          const nx = x - (dx / l) * 0.5, nz = z - (dz / l) * 0.5, ny = y + 0.55;
          const smoke = this.count(`s${p.id}`, reduced ? TRAIL.rocketSmoke / 2 : TRAIL.rocketSmoke, simDt);
          for (let k = 0; k < smoke; k++) this.spawn(P.soft, nx + sym() * 0.04, ny + sym() * 0.04, nz + sym() * 0.04, sym() * 0.25, 0.25 + rnd() * 0.25, sym() * 0.25, C.smoke, 0.16, 0.42 + rnd() * 0.2, -0.3, 1.2, 1.4, 0, 0.45);
          const fire = this.count(`f${p.id}`, TRAIL.rocketFire, simDt);
          for (let k = 0; k < fire; k++) this.spawn(P.glow, nx, ny, nz, -dx / l * 3 + sym(), sym(), -dz / l * 3 + sym(), k % 2 ? C.fireHot : C.fire, 0.2, 0.12, 0, 2);
        }
      }
    }
    for (let i = 0; i < karts.length; i++) {
      const k = karts[i];
      // Jet Mode's contrails off its wingtips
      if (simDt > 0 && k.status.rideRemaining > 0) {
        const fx = Math.sin(k.heading), fz = Math.cos(k.heading), rx = Math.cos(k.heading), rz = -Math.sin(k.heading);
        const n = this.count(`j${k.racerId}`, TRAIL.contrail, simDt);
        for (let j = 0; j < n; j++) {
          for (const side of [-1, 1]) {
            const x = k.position[0] + rx * side * 1.15 - fx * 0.55, z = k.position[2] + rz * side * 1.15 - fz * 0.55;
            this.spawn(P.soft, x, k.position[1] + 0.95, z, 0, 0, 0, C.smoke, 0.09, 0.32, 0, 0, 1.6, 0, 0.5);
          }
        }
      }
      // an EMP'd kart crackles: sparks jumping off it, and now and then a little flash
      const sh = this.shorted.get(k.racerId);
      if (sh) {
        if (now >= sh.until) { this.shorted.delete(k.racerId); continue; }
        if (simDt <= 0) continue;
        const [x, y, z] = k.position;
        const n = this.count(`e${k.racerId}`, reduced ? EMP.sparksPerSecond / 2 : EMP.sparksPerSecond, simDt);
        for (let j = 0; j < n; j++) {
          const ox = sym() * 0.8, oy = 0.3 + rnd() * 1.1, oz = sym() * 1.0;
          this.spawn(P.sparks, x + ox, y + oy, z + oz, ox * 4 + sym() * 2, rnd() * 3, oz * 4 + sym() * 2, j % 3 ? C.spark : C.cyanHot, 0.08, 0.08 + rnd() * 0.08, 0, 0, 0, 0.06);
        }
        if (now >= sh.flash) {
          sh.flash = now + EMP.flashEvery * (0.6 + rnd() * 0.8);
          this.blast('flash', x + sym() * 0.5, y + 0.6 + rnd() * 0.6, z + sym() * 0.6, 0.08, [0.2, reduced ? 0.4 : 0.8], C.spark, 0.9);
        }
      }
    }
  }
}

// Contact with punch (Adam, 26 Sept 2026: "the game feels very cheap"; the fresh-eyes review of 27 Sept,
// item 6: "a bump shows nothing, a wall hit shows 8 dust puffs, and an item hit is a flat spin"). Pictures
// only: the sim, its events and the results are untouched; everything here reads the kart states after a
// tick and draws into the particle pools that already exist (no new mesh, no new draw call).
//
// What Mario Kart World does (muted stills, YouTube ngiIINHSiJc, the reviewer's and our own, 27 Sept 2026):
// a bump flashes a spiky yellow-orange impact star with a white-hot heart right where the karts touch
// (3:25.2, 3:22.4) and throws a few small five-pointed yellow stars off it that tumble away and fade in
// about 0.2 s (3:25.35, 2:29.2); a shell hit bursts in an orange star and tosses the kart up nose-first
// with shards and stars flying (2:47-2:48); a scrape along a barrier kicks up tire smoke and a bounce
// (2:25.8). Ours, in our own shapes and colors: a bump's burst and stars at the contact point, sparks off a
// wall where the kart meets it (and along it while it scrapes), a hit's bigger burst with a ring and stars,
// then little stars circling the racer's head while it spins and a moment after (the dizzy recover; the
// kart's hop, tumble, sway and head snap are the kart's own animation, kart-controller anim.ts). Scaled by
// how hard the contact was; the player's own give the camera a short kick (none with reduced motion).
import { BASE } from '../kart-controller/constants.ts';
import { hitHop } from '../kart-controller/anim.ts';
import type { KartState } from '../kart-controller/types.ts';
import { SHAPE, type ParticlePool, type SpawnOpts } from './particles.ts';

type Rgb = readonly [number, number, number];

export const CONTACT = Object.freeze({
  bump: Object.freeze({
    /** m/s of closing speed for a full-size bump (a rear-ender at speed); the least any bump shows is `least` of it */
    fullSpeed: 8, least: 0.35,
    /** m over the lower kart's road the karts' sides meet */
    height: 0.55,
    /** the impact star (glow pool, an HDR yellow-orange that blooms, white-hot at its heart): m across, s */
    burst: 1.6, burstLife: 0.15,
    /** the white flash inside it */
    flash: 0.5, flashLife: 0.05,
    /** little cartoon stars thrown off it: how many (at full size), m, s, m/s out and up */
    stars: 0, starSize: 0.26, starLife: 0.5, starOut: [2.2, 4] as const, starUp: [1.8, 3.6] as const,
    /** sparks (the streak pool): how many at full size, m/s */
    sparks: 12, sparkSpeed: [3, 7.5] as const,
    /** a bump between two rivals: this much of the size, count and brightness; none drawn past `far` m from the camera */
    rival: 0.6, far: 45,
  }),
  wall: Object.freeze({
    /** m/s into the wall for a full-size hit; m/s along it for a full-size scrape */
    fullOut: 9, fullAlong: 24, least: 0.25,
    /** m from the kart's middle to its side against the wall, and how high on it and how far forward the contact is */
    reach: 0.72, height: 0.32, ahead: 0.35,
    /** the flash where it meets the wall */
    burst: 1.15, burstLife: 0.12,
    /** sparks at the hit (full size), then a scrape's sparks a second while it slides on (full size), for scrapeLife s (full size) */
    sparks: 32, scrapeRate: 220, scrapeLife: 0.4,
    /** a scrape stops once the kart is this far past its side from the wall (it bounced off) */
    leave: 0.45,
    /**
     * how much of the kart's velocity a spark keeps (it falls behind the kart, as a grinder's spray trails its
     * disc), its own speed back along the wall, out from it and up (m/s), m wide, and s of its own motion drawn
     */
    carry: 0.5, back: [4, 9] as const, out: [0.5, 2] as const, up: [1, 3.2] as const, sparkSize: 0.11, stretch: 0.08,
    rival: 0.55,
  }),
  hit: Object.freeze({
    /** m over the kart's road the burst is centred */
    height: 0.9,
    burst: 2.1, burstLife: 0.2, flash: 0.7, flashLife: 0.07,
    /** a ring of little white stars spreading round the kart: how many, m/s, s */
    ring: 0, ringSpeed: 6.5, ringLife: 0.26,
    /** cartoon stars flung out round it */
    stars: 0, starSize: 0.3, starLife: 0.65, starOut: [2.5, 4.5] as const, starUp: [2.5, 5] as const,
    sparks: 12,
    rival: 0.65,
  }),
  /** (no stars since 30 Sept 2026, Adam: "Remove the stars ... So corny": the bursts' and the dizzy stars' counts are 0) */
  /** stars circling the racer's head while it spins, and `after` s after (the dizzy recover), fading out over `fadeOut` s */
  dizzy: Object.freeze({ stars: 0, radius: 0.6, height: 1.6, turns: 1.5, bob: 0.07, size: 0.42, after: 0.75, fadeIn: 0.12, fadeOut: 0.35, spin: 4 }),
  /**
   * m a burst is drawn toward the camera from where the contact is: the karts' own sides would hide half of it
   * (Mario Kart World draws its impact star over both karts); never nearer the lens than `nearest` m
   */
  lift: Object.freeze({ bump: 1, wall: 0.45, hit: 1.1, nearest: 3.8 }),
  /**
   * The player's own contact jolts the camera: `move` m and `roll` rad at full size, toward what it hit (the
   * lens lags the shove, so the kart and the world jump away from the blow), up in `rise` s, then a quick
   * swing back ringing at `hz` and gone within `life` s. None with reduced motion. Small: a bump's at most
   * 7 cm and under a degree.
   */
  kick: Object.freeze({
    bump: Object.freeze({ move: 0.07, roll: (0.9 * Math.PI) / 180 }),
    wall: Object.freeze({ move: 0.1, roll: (1.2 * Math.PI) / 180 }),
    hit: Object.freeze({ move: 0.12, roll: (1.5 * Math.PI) / 180 }),
    rise: 0.035, hz: 6.5, decay: 0.08, life: 0.35,
  }),
});

/**
 * HDR colors (linear; past 1 they bloom): the impact star (drawn solid, so it holds its orange over a bright
 * road; its heart burns white), the white flash inside it (added light), sparks, and the cartoon stars (solid).
 */
const BURST: Rgb = [1.55, 0.86, 0.05], BURST_RIVAL: Rgb = [1, 0.56, 0.03], FLASH: Rgb = [2.4, 2.2, 1.7], FLASH_RIVAL: Rgb = [1.1, 1.05, 0.9];
const SPARK: Rgb = [1.7, 0.62, 0.06], SPARK_RIVAL: Rgb = [1.2, 0.45, 0.05];
const RING: Rgb = [1.9, 1.7, 1.1];
export const STARS: readonly Rgb[] = [[1, 0.74, 0.02], [1, 0.42, 0.02], [1, 0.93, 0.62]];
/** a wall's scuff of dust, where the kart met it */
const SCUFF: Rgb = [0.7, 0.66, 0.6];

/** 0..1: how hard a contact was from `speed` (m/s) against `full`, never under `least`. */
export function impact(speed: number, full: number, least: number): number {
  const k = Math.max(0, Math.min(1, speed / full));
  return least + (1 - least) * k;
}

/** A kart's velocity in the world (m/s, x and z) from its speed, sideways slide and heading. */
export function worldVelocity(k: Readonly<KartState>, out: number[] | Float64Array): void {
  const s = Math.sin(k.heading), c = Math.cos(k.heading);
  // forward (sin h, 0, cos h), right (cos h, 0, -sin h)
  out[0] = s * k.speed + c * k.lateralVelocity;
  out[1] = c * k.speed - s * k.lateralVelocity;
}

/**
 * Where a wall is from a wall hit: the kart's velocity before (`before`) and after (`after`); what the wall took
 * out points into it. Writes the unit normal into the wall, the speed into it and along it; false when the hit
 * changed the velocity too little to tell (a glance).
 */
export function wallFrom(before: ArrayLike<number>, after: ArrayLike<number>, out: { nx: number; nz: number; into: number; along: number }): boolean {
  const dx = before[0] - after[0], dz = before[1] - after[1], d = Math.hypot(dx, dz);
  if (d < 0.35) return false;
  out.nx = dx / d; out.nz = dz / d;
  const into = before[0] * out.nx + before[1] * out.nz;
  out.into = Math.max(0, into);
  out.along = Math.hypot(before[0] - out.nx * into, before[1] - out.nz * into);
  return true;
}

/** 0..1 of a dizzy star's show `since` s after the spin began (`spinning`), or `after` s after it ended. */
export function dizzyShow(spinning: boolean, sinceStart: number, sinceEnd: number): number {
  const D = CONTACT.dizzy;
  const up = Math.min(1, Math.max(0, sinceStart / D.fadeIn));
  if (spinning) return up;
  if (sinceEnd >= D.after) return 0;
  const left = D.after - sinceEnd;
  return up * Math.min(1, left / D.fadeOut);
}

/**
 * The camera's jolt from the player's own contacts (CONTACT.kick): an offset toward what was hit and a roll,
 * up quickly, then swung back. A weaker contact while a stronger one still rings is left out.
 */
export class ContactKick {
  private at = -Infinity;
  private x = 0; private y = 0; private z = 0; private r = 0;
  /** 1 at the peak: up over `rise`, then a damped swing back; 0 before and after */
  envelope(t: number): number {
    const K = CONTACT.kick, b = t - this.at;
    if (b < 0 || b >= K.life) return 0;
    if (b < K.rise) return Math.sin((0.5 * Math.PI * b) / K.rise);
    const u = b - K.rise;
    return Math.exp(-u / K.decay) * Math.cos(2 * Math.PI * K.hz * u);
  }
  /** A contact at time `t`: `move` m along (dx, dy, dz) (unit), `roll` rad. */
  kick(t: number, dx: number, dy: number, dz: number, move: number, roll: number): void {
    const live = Math.hypot(this.x, this.y, this.z) * Math.abs(this.envelope(t));
    if (move < live) return;
    this.at = t; this.x = dx * move; this.y = dy * move; this.z = dz * move; this.r = roll;
  }
  /** Adds the jolt at time `t` to a camera offset (m, world) and roll (rad); nothing with reduced motion. */
  add(t: number, out: { x: number; y: number; z: number; roll: number }, reduced: boolean): void {
    if (reduced) return;
    const e = this.envelope(t);
    if (e === 0) return;
    out.x += this.x * e; out.y += this.y * e; out.z += this.z * e; out.roll += this.r * e;
  }
  reset(): void { this.at = -Infinity; }
}

/** A wall scrape under way: its kart, until when, the wall's plane (a point on it and the normal into it), how hard. */
interface Scrape { racerId: string; until: number; px: number; py: number; pz: number; nx: number; nz: number; k: number; mine: boolean; acc: number }
/** A kart's spin as the dizzy stars follow it: when it began and ended (s, the frame clock). */
interface Dizzy { spinning: boolean; from: number; to: number }
/** What the frame reads of a kart's drawn place (the interpolated root: game/session.ts views). */
export interface Drawn { readonly root: { readonly position: { readonly x: number; readonly y: number; readonly z: number } } }

/** Visual-only randomness (never touches the sim). */
let seed = 0x2c1b3c6d;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const between = (r: readonly [number, number]) => r[0] + rnd() * (r[1] - r[0]);

/** The contact effects for a race: bursts at bumps, walls and hits, scrapes, dizzy stars and the player's camera jolt. */
export class Contact {
  readonly kick = new ContactKick();
  /** each kart's world velocity (x, z) as of the last frame: what it was doing before a contact this tick */
  private readonly vel = new Map<string, Float64Array>();
  private readonly dizzy = new Map<string, Dizzy>();
  private readonly scrapes: Scrape[] = [];
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.2, life: 0.4 };
  private readonly w0 = new Float64Array(2);
  private readonly w1 = new Float64Array(2);
  private readonly wall0 = { nx: 0, nz: 0, into: 0, along: 0 };
  /** the camera, as of the last frame (far rival bumps draw nothing) */
  private readonly cam = [0, 0, 0];

  private readonly glow: ParticlePool;
  private readonly soft: ParticlePool;
  private readonly sparks: ParticlePool;

  /** `glow`: additive light (the bursts, the flash, the ring); `soft`: solid (the stars, the dust); `sparks`: streaks. */
  constructor(glow: ParticlePool, soft: ParticlePool, sparks: ParticlePool) {
    this.glow = glow; this.soft = soft; this.sparks = sparks;
  }

  reset(): void {
    this.vel.clear(); this.dizzy.clear(); this.scrapes.length = 0; this.kick.reset();
  }

  private put(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, c: Rgb, size: number, life: number,
    gravity = 0, drag = 0, grow = 0, shape = 0, spin = 0, cx = 0, cz = 0, stretch = 0, alpha = 1): void {
    const o = this.o;
    o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz; o.r = c[0]; o.g = c[1]; o.b = c[2];
    o.size = size; o.life = life; o.gravity = gravity; o.drag = drag; o.grow = grow;
    o.shape = shape; o.spin = spin; o.phase = rnd() * Math.PI * 2; o.cx = cx; o.cy = 0; o.cz = cz; o.stretch = stretch; o.alpha = alpha;
    pool.spawn(o);
  }

  /** a point moved toward the camera (toward()) */
  private readonly p = [0, 0, 0];
  /** (x, y, z) moved `by` m toward the camera, never nearer it than CONTACT.lift.nearest, into this.p */
  private toward(x: number, y: number, z: number, by: number): number[] {
    const c = this.cam, dx = c[0] - x, dy = c[1] - y, dz = c[2] - z, d = Math.hypot(dx, dy, dz);
    const m = d > 1e-6 ? Math.max(0, Math.min(by, d - CONTACT.lift.nearest)) / d : 0;
    this.p[0] = x + dx * m; this.p[1] = y + dy * m; this.p[2] = z + dz * m;
    return this.p;
  }

  /**
   * The burst, the flash, stars thrown off and sparks at (x, y, z) (drawn `lift` m toward the camera, over the
   * karts' sides), riding at (cx, cz); `k` 0..1 how hard, `s` the size (a rival's smaller).
   */
  private burst(x0: number, y0: number, z0: number, lift: number, cx: number, cz: number, k: number, s: number, mine: boolean,
    B: { burst: number; burstLife: number; flash: number; flashLife: number; stars: number; starSize: number; starLife: number; starOut: readonly [number, number]; starUp: readonly [number, number]; sparks: number },
    reduced: boolean): void {
    const q = this.toward(x0, y0, z0, lift), x = q[0], y = q[1], z = q[2];
    const size = (0.55 + 0.45 * k) * s;
    this.put(this.soft, x, y, z, 0, 0, 0, mine ? BURST : BURST_RIVAL, B.burst * size, B.burstLife, 0, 0, 0.35, SHAPE.none, 0, cx, cz); // a soft round flash since 30 Sept 2026 (the spiky burst read as a cartoon star)
    this.put(this.glow, x, y, z, 0, 0, 0, mine ? FLASH : FLASH_RIVAL, B.flash * size, B.flashLife, 0, 0, 0.5, 0, 0, cx, cz);
    const stars = B.stars ? Math.max(1, Math.round(B.stars * (0.5 + 0.5 * k) * s)) : 0;
    const turn = rnd() * Math.PI * 2;
    for (let i = 0; i < stars; i++) {
      const a = turn + (i / stars) * Math.PI * 2 + (rnd() - 0.5) * 0.6, out = between(B.starOut) * (0.7 + 0.3 * k);
      this.put(this.soft, x, y, z, Math.cos(a) * out, between(B.starUp), Math.sin(a) * out, STARS[i % STARS.length], B.starSize * (0.75 + 0.25 * k) * s,
        B.starLife * (0.8 + 0.4 * rnd()), 9, 1.2, 0, SHAPE.star, reduced ? 0 : (rnd() < 0.5 ? -7 : 7), cx * 0.7, cz * 0.7);
    }
    const n = Math.round(B.sparks * (0.4 + 0.6 * k) * s);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, sp = 3 + rnd() * 4.5 * (0.5 + 0.5 * k);
      this.put(this.sparks, x, y, z, Math.cos(a) * sp, 1 + rnd() * 3.5, Math.sin(a) * sp, mine ? SPARK : SPARK_RIVAL, 0.065, 0.12 + rnd() * 0.12,
        16, 0.5, 0, 0, 0, cx * 0.8, cz * 0.8, 0.04);
    }
  }

  /**
   * Two karts bumped this tick (the director's `bump`, once a pair): the burst where they touch, scaled by how
   * fast they closed; the player's gives the camera its jolt.
   */
  bump(a: Readonly<KartState>, b: Readonly<KartState>, me: string | null, now: number, reduced: boolean): void {
    const B = CONTACT.bump;
    const mine = a.racerId === me || b.racerId === me;
    const x = (a.position[0] + b.position[0]) / 2, z = (a.position[2] + b.position[2]) / 2;
    if (!mine && Math.hypot(x - this.cam[0], z - this.cam[2]) > B.far) return;
    let nx = b.position[0] - a.position[0], nz = b.position[2] - a.position[2];
    const d = Math.hypot(nx, nz);
    if (d > 1e-6) { nx /= d; nz /= d; } else { nx = 1; nz = 0; }
    const va = this.vel.get(a.racerId), vb = this.vel.get(b.racerId);
    const closing = va && vb ? Math.max(0, (va[0] - vb[0]) * nx + (va[1] - vb[1]) * nz) : 0;
    const k = impact(closing, B.fullSpeed, B.least);
    worldVelocity(a, this.w0); worldVelocity(b, this.w1);
    const y = Math.min(a.position[1], b.position[1]) + B.height;
    this.burst(x, y, z, CONTACT.lift.bump, (this.w0[0] + this.w1[0]) / 2, (this.w0[1] + this.w1[1]) / 2, k, mine ? 1 : B.rival, mine, B, reduced);
    if (mine && !reduced) {
      // the lens lags the shove: toward the other kart
      const s = a.racerId === me ? 1 : -1, K = CONTACT.kick.bump;
      this.kick.kick(now, nx * s, 0, nz * s, K.move * k, K.roll * k * (rnd() < 0.5 ? -1 : 1));
    }
  }

  /**
   * A kart hit a wall this tick (its `wall` event): where the wall is, from what it took out of the kart's
   * velocity; the flash, sparks and a scuff of dust where the kart meets it, then a scrape's sparks along it
   * while it slides on. A glance too slight to place makes only the dust.
   */
  wall(k: Readonly<KartState>, mine: boolean, now: number, reduced: boolean): void {
    const W = CONTACT.wall, s = mine ? 1 : W.rival;
    const before = this.vel.get(k.racerId);
    worldVelocity(k, this.w1);
    const f = this.wall0, fx = Math.sin(k.heading), fz = Math.cos(k.heading);
    if (!before || !wallFrom(before, this.w1, f)) {
      for (let i = 0; i < 6; i++) this.put(this.soft, k.position[0] + (rnd() - 0.5), k.position[1] + 0.15, k.position[2] + (rnd() - 0.5), (rnd() - 0.5) * 5, rnd() * 1.2, (rnd() - 0.5) * 5, SCUFF, 0.3 * s, 0.38, 0, 2.2, 1);
      return;
    }
    const hard = Math.max(f.into / W.fullOut, f.along / W.fullAlong);
    const kk = impact(hard * W.fullOut, W.fullOut, W.least);
    const px = k.position[0] + f.nx * W.reach + fx * W.ahead, pz = k.position[2] + f.nz * W.reach + fz * W.ahead, py = k.position[1] + W.height;
    const cx = this.w1[0], cz = this.w1[1];
    const q = this.toward(px, py, pz, CONTACT.lift.wall);
    this.put(this.soft, q[0], q[1], q[2], 0, 0, 0, mine ? BURST : BURST_RIVAL, W.burst * (0.5 + 0.5 * kk) * s, W.burstLife, 0, 0, 0.4, SHAPE.none, 0, cx, cz);
    this.put(this.glow, q[0], q[1], q[2], 0, 0, 0, mine ? FLASH : FLASH_RIVAL, W.burst * 0.5 * (0.5 + 0.5 * kk) * s, W.burstLife * 0.6, 0, 0, 0.4, 0, 0, cx, cz);
    this.sparkWall(px, py, pz, f.nx, f.nz, cx, cz, Math.round(W.sparks * (0.35 + 0.65 * kk) * s), mine);
    for (let i = 0; i < 8; i++) {
      this.put(this.soft, px - f.nx * 0.3 + (rnd() - 0.5) * 0.4, k.position[1] + 0.15, pz - f.nz * 0.3 + (rnd() - 0.5) * 0.4,
        -f.nx * (1 + rnd() * 2) + (rnd() - 0.5) * 2, rnd() * 1.2, -f.nz * (1 + rnd() * 2) + (rnd() - 0.5) * 2, SCUFF, 0.3 * (0.6 + 0.4 * kk) * s, 0.4, 0, 2.2, 1.2, 0, 0, cx * 0.3, cz * 0.3);
    }
    // the scrape: a sliding kart keeps throwing sparks off the wall a moment (renewed by the next wall event while it presses on)
    const life = W.scrapeLife * Math.min(1, f.along / W.fullAlong) * (0.5 + 0.5 * kk);
    if (life > 0.05) {
      let sc = this.scrapes.find((q) => q.racerId === k.racerId);
      if (!sc) { sc = { racerId: k.racerId, until: 0, px: 0, py: 0, pz: 0, nx: 0, nz: 0, k: 0, mine, acc: 0 }; this.scrapes.push(sc); }
      sc.until = now + life; sc.px = px; sc.py = py; sc.pz = pz; sc.nx = f.nx; sc.nz = f.nz; sc.k = kk * s; sc.mine = mine;
    }
    if (mine && !reduced) {
      const K = CONTACT.kick.wall;
      // toward the wall, rolling away from it (the wall on the right tips the view left)
      const side = f.nx * Math.cos(k.heading) - f.nz * Math.sin(k.heading) >= 0 ? 1 : -1;
      this.kick.kick(now, f.nx, 0, f.nz, K.move * kk, K.roll * kk * side);
    }
  }

  /** `n` sparks off a wall at (x, y, z), `(nx, nz)` into it: back along it, out from it and up, falling behind the kart. */
  private sparkWall(x: number, y: number, z: number, nx: number, nz: number, cx: number, cz: number, n: number, mine: boolean): void {
    const W = CONTACT.wall;
    // back along the wall: against the kart's travel along it
    let tx = cx - nx * (cx * nx + cz * nz), tz = cz - nz * (cx * nx + cz * nz);
    const tl = Math.hypot(tx, tz);
    if (tl > 1e-3) { tx /= tl; tz /= tl; } else { tx = 0; tz = 0; }
    for (let i = 0; i < n; i++) {
      const back = between(W.back), out = between(W.out), sw = (rnd() - 0.5) * 1.5;
      this.put(this.sparks, x, y + (rnd() - 0.5) * 0.15, z, -tx * back - nx * out + tz * sw * 0.3, between(W.up), -tz * back - nz * out - tx * sw * 0.3,
        mine ? SPARK : SPARK_RIVAL, W.sparkSize, 0.16 + rnd() * 0.16, 12, 1.2, 0, 0, 0, cx * W.carry, cz * W.carry, W.stretch);
    }
  }

  /** A kart was hit this tick (an item or a spinning hazard): the big burst, a ring of light, stars flung out, sparks; the player's camera jolts. */
  hit(k: Readonly<KartState>, mine: boolean, now: number, reduced: boolean): void {
    const H = CONTACT.hit, s = mine ? 1 : H.rival;
    worldVelocity(k, this.w1);
    const x = k.position[0], y = k.position[1] + H.height, z = k.position[2], cx = this.w1[0] * 0.8, cz = this.w1[1] * 0.8;
    this.burst(x, y, z, CONTACT.lift.hit, cx, cz, 1, s, mine, H, reduced);
    const n = Math.round(H.ring * s), turn = rnd();
    for (let i = 0; i < n; i++) {
      const a = ((i + turn) / n) * Math.PI * 2;
      this.put(this.glow, x, y + 0.2, z, Math.cos(a) * H.ringSpeed, 0.3, Math.sin(a) * H.ringSpeed, mine ? RING : FLASH_RIVAL, 0.3 * s, H.ringLife, 0, 2, 0, SHAPE.star, 0, cx, cz);
    }
    if (mine && !reduced) {
      const K = CONTACT.kick.hit, side = rnd() < 0.5 ? -1 : 1;
      // the lens dips as the kart is tossed up, and swings a little aside
      this.kick.kick(now, Math.cos(k.heading) * side * 0.45, -0.9, -Math.sin(k.heading) * side * 0.45, K.move, K.roll * side);
    }
  }

  /**
   * Once per rendered frame, before the pools' update (as the karts' own emitters): the scrapes' sparks off the
   * wall where each scraping kart still meets it (`simDt` 0, paused or frozen: none).
   */
  emit(simDt: number, t: number, karts: readonly KartState[], camPos: readonly number[]): void {
    this.cam[0] = camPos[0]; this.cam[1] = camPos[1]; this.cam[2] = camPos[2];
    for (let i = this.scrapes.length - 1; i >= 0; i--) {
      const sc = this.scrapes[i];
      if (t >= sc.until) { this.scrapes.splice(i, 1); continue; }
      if (simDt <= 0) continue;
      let k: KartState | undefined;
      for (let j = 0; j < karts.length; j++) if (karts[j].racerId === sc.racerId) { k = karts[j]; break; }
      if (!k) continue;
      const W = CONTACT.wall;
      const gap = (sc.px - k.position[0]) * sc.nx + (sc.pz - k.position[2]) * sc.nz; // metres from the kart's middle to the wall
      if (gap > W.reach + W.leave || k.speed < 4) { sc.until = t; continue; }
      worldVelocity(k, this.w1);
      const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
      sc.acc += W.scrapeRate * sc.k * simDt;
      const n = Math.floor(sc.acc);
      sc.acc -= n;
      if (n > 0) this.sparkWall(k.position[0] + sc.nx * gap + fx * W.ahead, k.position[1] + W.height, k.position[2] + sc.nz * gap + fz * W.ahead, sc.nx, sc.nz, this.w1[0], this.w1[1], n, sc.mine);
    }
  }

  /**
   * Once per rendered frame, after the pools' update (the dizzy stars sit exactly where they are drawn, this
   * frame only): the dizzy stars circling each spinning racer's head, the player's camera jolt into `shake`,
   * and each kart's velocity for the next tick's contacts. `views`: the karts' drawn places, in `karts`'
   * order (else their sim positions).
   */
  draw(t: number, karts: readonly KartState[], views: readonly Drawn[] | undefined, shake: { x: number; y: number; z: number; roll: number }, reduced: boolean): void {
    // the dizzy stars: round the head of every racer spinning from a hit, and a moment after
    const D = CONTACT.dizzy;
    for (let i = 0; i < karts.length; i++) {
      const k = karts[i];
      let st = this.dizzy.get(k.racerId);
      if (!st) { st = { spinning: false, from: -Infinity, to: -Infinity }; this.dizzy.set(k.racerId, st); }
      const spinning = k.status.spinRemaining > 0;
      if (spinning && !st.spinning) st.from = t;
      if (!spinning && st.spinning) st.to = t;
      st.spinning = spinning;
      const show = dizzyShow(spinning, t - st.from, t - st.to);
      if (show <= 0) continue;
      const p = views?.[i]?.root.position;
      const bx = p ? p.x : k.position[0], bz = p ? p.z : k.position[2];
      const by = (p ? p.y : k.position[1]) + D.height + (spinning ? hitHop(BASE.hitSpinSeconds - k.status.spinRemaining) : 0);
      const turn = (t - st.from) * D.turns * Math.PI * 2 * (reduced ? 0.5 : 1);
      for (let j = 0; j < D.stars; j++) {
        const a = -turn + (j / D.stars) * Math.PI * 2;
        const o = this.o, c = STARS[j % STARS.length];
        o.x = bx + Math.cos(a) * D.radius; o.z = bz + Math.sin(a) * D.radius;
        o.y = by + (reduced ? 0 : D.bob * Math.sin(2 * a + j));
        o.r = c[0]; o.g = c[1]; o.b = c[2]; o.size = D.size * (0.6 + 0.4 * show); o.alpha = show;
        o.shape = SHAPE.star; o.spin = reduced ? 0 : D.spin; o.phase = a;
        this.soft.place(o);
      }
    }
    this.kick.add(t, shake, reduced);
    for (let i = 0; i < karts.length; i++) {
      const k = karts[i];
      let v = this.vel.get(k.racerId);
      if (!v) { v = new Float64Array(2); this.vel.set(k.racerId, v); }
      worldVelocity(k, v);
    }
  }
}

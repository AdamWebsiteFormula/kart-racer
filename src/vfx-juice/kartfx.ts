// What each kart throws off as it drives (visual only; the sim never reads any of it): drift sparks
// from the rear tires, flame flakes off the pipes while boosting, a puff from the pipes at idle and
// on a hard launch, off-road dust and tire marks. Mario Kart World's drift sparks (studied frame by
// frame, 25 Sept 2026) are a star pinned to each rear tire (flames.ts draws those, on the kart's own
// mesh) and small crisp specks thrown back and out from it, falling behind the wheel, never over the
// road ahead; a tier-up throws a spray of long needles, and letting go a last burst. Here each speck
// keeps most of its kart's speed (so it stays near the wheel and falls behind it, a short trail) and
// draws as a streak along its own motion, a white-hot core line inside the tier's color. A rival's
// are fewer, so a pack drifting through a bend is not a wall of light.
import { Vector3 } from 'three';
import { exhaustFor, portDir, type Exhaust, type KartLook } from '../art-pipeline/index.ts';
import { BODY_WHEELS, MODEL_WHEELS } from '../art-pipeline/rig.ts';
import type { KartState } from '../kart-controller/types.ts';
import { BoostTier, flamePalette, TIER_HOT, TIER_RGB, wheelContact } from './flames.ts';
import { PARTICLE, ParticlePool, type SpawnOpts } from './particles.ts';
import type { Skids } from './trails.ts';

type Range = readonly [number, number];
type Rgb = readonly [number, number, number];

export const SPARK = Object.freeze({
  /** specks a second from a drifting kart's rear tires by tier (0: still charging, none: the tires only glow) */
  rate: Object.freeze([0, 28, 36, 44] as const),
  /** a rival's share of the specks (yours read; the pack's do not crowd the road) */
  rival: 0.55,
  life: [0.1, 0.2] as Range,
  /** the streak's width, meters */
  width: 0.055,
  /** share of its kart's velocity a speck keeps: it falls behind the wheel, never ahead of the kart */
  carry: 0.84,
  /** its own throw, m/s: back, out to its tire's side, up; and a push to the drift's outside (small: they
   * stay by the tire and arc down, not dashes far from it: "pale dashes that read as rain") */
  back: [0.5, 2] as Range, out: [1, 3] as Range, up: [1.5, 3.5] as Range, outside: 1,
  gravity: 18, drag: 3,
  /** seconds of its own motion it is drawn stretched over */
  stretch: 0.035,
  /** share of specks that burn white-hot, and how bright the rest burn (above 1 the bloom catches them) */
  hot: 0.15, gain: 1,
  /** a tier-up: long needles thrown hard from each rear tire (a rival's fewer; none under reduced motion) */
  burst: Object.freeze({ count: 8, back: [2, 4.5] as Range, out: [2.5, 5.5] as Range, up: [2.5, 5.5] as Range, life: [0.12, 0.2] as Range, stretch: 0.09 }),
  /** letting go: a last spray from each tire in the mini-turbo's color */
  release: 6,
  /** reduced motion: this share of the specks, and no tier-up needles */
  reduced: 0.5,
});

export const EMBER = Object.freeze({
  /** flakes a second off a boosting kart's pipes: bits of the flame breaking off its point */
  rate: 24,
  /** flakes thrown at a boost's ignition */
  burst: 10,
  life: [0.14, 0.3] as Range,
  width: 0.05,
  /** share of its kart's velocity a flake keeps, and its own speed out of the pipe (m/s) */
  carry: 0.72, speed: [2.5, 5.5] as Range,
  /** flakes drift up a little as they cool (negative gravity) */
  lift: 1.5, drag: 2.5, stretch: 0.035,
});

/** The pipes' breath: a small gray-blue puff at idle, and quicker, darker ones on a hard launch from a standstill. Subtle: never a cloud. */
export const PUFF = Object.freeze({
  color: Object.freeze([0.44, 0.49, 0.6] as const),
  /** at idle (under `idleSpeed` m/s): puffs a second, size (m), life (s), opacity */
  idleSpeed: 1, idleRate: 3, size: 0.14, life: 0.55, alpha: 0.55,
  /** a launch: under `launchSpeed` m/s and gaining `launchAccel` m/s² or more */
  launchSpeed: 9, launchAccel: 4, launchRate: 12, launchAlpha: 0.62,
  /** how much a puff grows over its life, and how fast it leaves the pipe (m/s) */
  grow: 2.4, speed: 0.9,
});

/** A drift's tire smoke: faint white puffs where the rear tires scrub the road (a rival's fewer, reduced motion's half). */
export const SMOKE = Object.freeze({
  color: Object.freeze([0.86, 0.86, 0.9] as const),
  rate: 10, size: 0.22, life: 0.45, alpha: 0.3, grow: 2.2,
});

/** Tire marks: segment width (m), the least a wheel moves before the next is laid (m), and the fade-in at a drift's start (s). */
export const MARK = Object.freeze({ width: 0.24, spacing: 0.45, rampIn: 0.3 });

/** The most streaks one kart keeps alive at once in a steady drift and boost (specks at the top tier and flakes), for the pool's budget. */
export function streaksPerKart(): number {
  return Math.ceil(SPARK.rate[3] * SPARK.life[1]) + Math.ceil(EMBER.rate * EMBER.life[1]);
}

const DUST_MUD: Rgb = [0.45, 0.33, 0.22], DUST_ICE: Rgb = [0.9, 0.95, 1], DUST: Rgb = [0.86, 0.77, 0.6];

/** Visual-only randomness (never touches the sim). */
let seed = 0x2545f491;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const sym = () => rnd() * 2 - 1;
const pick = (r: Range) => r[0] + rnd() * (r[1] - r[0]);

interface KartMem {
  l: [number, number, number]; r: [number, number, number];
  skid: boolean; skidFor: number; skidInk: number;
  side: number; sparkAcc: number; emberAcc: number; dustAcc: number; puffAcc: number; puffPipe: number; smokeAcc: number; smokeSide: number;
  /** the drift's tier as last seen (a rise throws the needles), and the boost's fire time as last seen (a new one throws the flakes) */
  lastTier: number; lastSince: number; lastSpeed: number;
  boost: BoostTier;
  exhaust: Exhaust | undefined;
  /** where its rear tires touch the road (the specks), and where they roll (the marks): half track and along, in its own frame */
  sx: number; sz: number; mx: number; mz: number;
}

const contact = new Vector3();

export class KartFx {
  /** drift specks and flame flakes: streaks, one draw call */
  readonly sparks = new ParticlePool(768, true, false, PARTICLE.maxSize.spark, true);
  private readonly mem = new Map<string, KartMem>();
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.1, life: 0.2, cx: 0, cy: 0, cz: 0, stretch: 0, alpha: 1 };
  private readonly soft: ParticlePool;
  private readonly skids: Skids;

  /** `soft`: the dust and the pipes' puffs; `skids`: the tire marks. */
  constructor(soft: ParticlePool, skids: Skids) {
    this.soft = soft; this.skids = skids;
  }

  reset(): void { this.sparks.clear(); this.mem.clear(); }

  /** Particles fade and move on the real frame time. */
  update(dt: number): void { this.sparks.update(dt); }

  dispose(): void { this.sparks.dispose(); }

  private memFor(k: KartState): KartMem {
    let m = this.mem.get(k.racerId);
    if (!m) {
      const exhaust = exhaustFor(k.racerId, { body: k.bodyId as KartLook['body'], paint: k.skinId });
      const body = k.bodyId === 'classic' || k.bodyId === 'buggy' ? k.bodyId : null;
      const rear = body ? BODY_WHEELS[body].rear : MODEL_WHEELS[k.racerId]?.rear;
      wheelContact(rear, contact);
      m = {
        l: [0, 0, 0], r: [0, 0, 0], skid: false, skidFor: 0, skidInk: 0, side: 1, sparkAcc: 0, emberAcc: 0, dustAcc: 0, puffAcc: 0, puffPipe: 0, smokeAcc: 0, smokeSide: 1,
        lastTier: 0, lastSince: -1, lastSpeed: 0, boost: new BoostTier(), exhaust,
        sx: contact.x, sz: contact.z, mx: rear?.x ?? 0.55, mz: rear?.z ?? -0.6,
      };
      this.mem.set(k.racerId, m);
    }
    return m;
  }

  private put(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, cx: number, cy: number, cz: number,
    c: Rgb, gain: number, size: number, life: number, gravity: number, drag: number, grow: number, stretch: number, alpha = 1): void {
    const o = this.o;
    o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz; o.cx = cx; o.cy = cy; o.cz = cz;
    o.r = c[0] * gain; o.g = c[1] * gain; o.b = c[2] * gain; o.size = size; o.life = life;
    o.gravity = gravity; o.drag = drag; o.grow = grow; o.stretch = stretch; o.alpha = alpha;
    pool.spawn(o);
  }

  /**
   * One kart's emitters for `dt` seconds of sim (0 while paused or frozen: nothing new is thrown).
   * `t` a clock in seconds; `cam` the camera's place (karts past 70 m throw nothing); `mine` the player's.
   */
  emit(k: KartState, dt: number, t: number, cam: readonly number[], mine: boolean, reduced = false): void {
    if (k.isGhost) return;
    const dx = k.position[0] - cam[0], dz = k.position[2] - cam[2];
    if (dx * dx + dz * dz > 70 * 70) { const far = this.mem.get(k.racerId); if (far) far.skid = false; return; } // too far to see
    const m = this.memFor(k);
    const s = Math.sin(k.heading), c = Math.cos(k.heading);
    const [px, py, pz] = k.position;
    // the kart's velocity: forward (sin h, 0, cos h) × speed + right (cos h, 0, −sin h) × lateral
    const vx = s * k.speed + c * k.lateralVelocity, vy = k.verticalVelocity, vz = c * k.speed - s * k.lateralVelocity;
    // where its rear tires roll (marks) and touch the road behind the axle (specks); +X is its right
    const mbx = px + s * m.mz, mbz = pz + c * m.mz;
    const lx = mbx - c * m.mx, lz = mbz + s * m.mx, rx = mbx + c * m.mx, rz = mbz - s * m.mx;
    const sbx = px + s * m.sz, sbz = pz + c * m.sz;
    const drifting = k.drift.active && k.grounded;
    const share = (mine ? 1 : SPARK.rival) * (reduced ? SPARK.reduced : 1);

    // tire marks while drifting on the ground: a segment each time a wheel has moved MARK.spacing,
    // fading in over the drift's first moments so a mark never starts as a hard edge
    if (drifting) {
      m.skidFor += dt;
      const ink = Math.min(1, m.skidFor / MARK.rampIn);
      if (!m.skid) {
        m.l[0] = lx; m.l[1] = py; m.l[2] = lz; m.r[0] = rx; m.r[1] = py; m.r[2] = rz; m.skidInk = 0;
      } else if (Math.hypot(lx - m.l[0], lz - m.l[2]) >= MARK.spacing || Math.hypot(rx - m.r[0], rz - m.r[2]) >= MARK.spacing) {
        this.skids.add(m.l[0], m.l[1], m.l[2], lx, py, lz, MARK.width, t, m.skidInk, ink);
        this.skids.add(m.r[0], m.r[1], m.r[2], rx, py, rz, MARK.width, t, m.skidInk, ink);
        m.l[0] = lx; m.l[1] = py; m.l[2] = lz; m.r[0] = rx; m.r[1] = py; m.r[2] = rz; m.skidInk = ink;
      }
    } else m.skidFor = 0;
    m.skid = drifting;

    // drift specks from the rear tires in the tier's color; a tier-up throws long needles
    const tier = drifting ? Math.min(3, k.drift.tier) : 0;
    const out = -k.drift.direction * SPARK.outside;
    if (tier > 0) {
      const col = TIER_RGB[tier - 1], hot = TIER_HOT[tier - 1];
      if (tier > m.lastTier && !reduced) {
        const B = SPARK.burst, n = Math.round(B.count * (mine ? 1 : SPARK.rival));
        for (let i = 0; i < n * 2; i++) this.speck(m, i % 2 ? 1 : -1, sbx, sbz, s, c, py, vx, vy, vz, out, rnd() < 0.4 ? hot : col, B.back, B.out, B.up, B.life, B.stretch);
      }
      m.sparkAcc += dt * SPARK.rate[tier] * share;
      while (m.sparkAcc >= 1) {
        m.sparkAcc -= 1;
        m.side = -m.side; // the tires take turns
        this.speck(m, m.side, sbx, sbz, s, c, py, vx, vy, vz, out, rnd() < SPARK.hot ? hot : col, SPARK.back, SPARK.out, SPARK.up, SPARK.life, SPARK.stretch);
      }
    } else m.sparkAcc = 0;
    // a drift's tire smoke: faint puffs where the rear tires scrub, left behind on the road
    if (drifting && k.surface !== 'dirt' && k.surface !== 'mud') {
      m.smokeAcc += dt * SMOKE.rate * share;
      while (m.smokeAcc >= 1) {
        m.smokeAcc -= 1;
        m.smokeSide = -m.smokeSide;
        const x = sbx + c * m.sx * m.smokeSide, z = sbz - s * m.sx * m.smokeSide;
        this.put(this.soft, x + sym() * 0.08, py + 0.1, z + sym() * 0.08, vx * 0.15 + sym() * 0.4, 0.35 + rnd() * 0.3, vz * 0.15 + sym() * 0.4, 0, 0, 0,
          SMOKE.color, 1, SMOKE.size * (0.8 + 0.4 * rnd()), SMOKE.life * (0.8 + 0.4 * rnd()), -0.2, 2, SMOKE.grow, 0, SMOKE.alpha);
      }
    } else m.smokeAcc = 0;
    const heldTier = m.lastTier;
    m.lastTier = tier;

    // boost flakes off the pipes (the flames on the pipes themselves: flames.ts), in the flame's colors;
    // a new boost throws a handful at its ignition, and a mini-turbo's last spray leaves the tires
    const btier = m.boost.update(k, t);
    if (k.boost.source !== 'none' && k.boost.remaining > 0) {
      const pal = flamePalette(btier);
      // the ignition's flakes fly faster and wider than the steady ones
      let burst = 0, steady = 0;
      if (m.boost.since !== m.lastSince) {
        m.lastSince = m.boost.since;
        burst = Math.round(EMBER.burst * share);
        if (btier > 0 && heldTier > 0) {
          const col = TIER_RGB[btier - 1], hot = TIER_HOT[btier - 1], r = Math.round(SPARK.release * share);
          for (let i = 0; i < r * 2; i++) this.speck(m, i % 2 ? 1 : -1, sbx, sbz, s, c, py, vx, vy, vz, out, rnd() < 0.4 ? hot : col, SPARK.back, SPARK.out, SPARK.up, SPARK.life, SPARK.stretch);
        }
      }
      m.emberAcc += dt * EMBER.rate * share;
      while (m.emberAcc >= 1) { m.emberAcc -= 1; steady++; }
      const ex = m.exhaust;
      for (let i = 0; i < burst + steady; i++) {
        // a pipe mouth in world space, and the way it points
        let x = sbx, y = py + 0.45, z = sbz, ox = -s, oy = 0.3, oz = -c;
        if (ex && ex.ports.length) {
          const p = ex.ports[(rnd() * ex.ports.length) | 0], d = portDir(ex, p);
          x = px + c * p[0] + s * p[2]; y = py + p[1]; z = pz - s * p[0] + c * p[2];
          ox = c * d[0] + s * d[2]; oy = d[1]; oz = -s * d[0] + c * d[2];
        }
        const fast = i < burst ? 1.5 : 1, spread = i < burst ? 2.2 : 0.9, sp = pick(EMBER.speed) * fast;
        const f = rnd(), col = f < 0.45 ? pal.inner : f < 0.85 ? pal.body : pal.core;
        this.put(this.sparks, x + ox * 0.25 + sym() * 0.06, y + oy * 0.25 + sym() * 0.06, z + oz * 0.25 + sym() * 0.06,
          ox * sp + sym() * spread, oy * sp + sym() * spread, oz * sp + sym() * spread, vx * EMBER.carry, vy * EMBER.carry, vz * EMBER.carry,
          col, 1.2, EMBER.width, pick(EMBER.life), -EMBER.lift, EMBER.drag, -0.4, EMBER.stretch);
      }
    } else m.emberAcc = 0;

    // the pipes' breath: a puff at idle, quicker ones on a hard launch; small, gray-blue, soon gone
    const accel = dt > 0 ? (k.speed - m.lastSpeed) / dt : 0;
    m.lastSpeed = k.speed;
    const idle = k.grounded && Math.abs(k.speed) < PUFF.idleSpeed, launch = k.grounded && k.speed < PUFF.launchSpeed && accel >= PUFF.launchAccel;
    const ex = m.exhaust;
    if ((idle || launch) && ex && ex.ports.length && k.boost.remaining <= 0) {
      m.puffAcc += dt * (launch ? PUFF.launchRate : PUFF.idleRate) * (mine ? 1 : SPARK.rival);
      while (m.puffAcc >= 1) {
        m.puffAcc -= 1;
        m.puffPipe = (m.puffPipe + 1) % ex.ports.length;
        const p = ex.ports[m.puffPipe], d = portDir(ex, p);
        const x = px + c * p[0] + s * p[2], y = py + p[1], z = pz - s * p[0] + c * p[2];
        const ox = c * d[0] + s * d[2], oz = -s * d[0] + c * d[2], sp = PUFF.speed * (launch ? 1.6 : 1);
        this.put(this.soft, x + ox * 0.06, y + d[1] * 0.06, z + oz * 0.06, ox * sp + sym() * 0.15, d[1] * sp + 0.35 + rnd() * 0.2, oz * sp + sym() * 0.15, 0, 0, 0,
          PUFF.color, launch ? 0.85 : 1, PUFF.size * (0.8 + 0.4 * rnd()), PUFF.life * (0.8 + 0.4 * rnd()), -0.3, 1.8, PUFF.grow, 0, launch ? PUFF.launchAlpha : PUFF.alpha);
      }
    } else m.puffAcc = 0;

    // off-road dust: low, small and quick, a kicked-up trail, never a cloud that hides the kart
    if (k.grounded && (k.surface === 'dirt' || k.surface === 'mud' || k.surface === 'ice') && Math.abs(k.speed) > 4) {
      m.dustAcc += dt * 14;
      const col = k.surface === 'mud' ? DUST_MUD : k.surface === 'ice' ? DUST_ICE : DUST;
      while (m.dustAcc >= 1) {
        m.dustAcc -= 1;
        this.put(this.soft, mbx + sym() * 0.5, py + 0.15, mbz + sym() * 0.5, -s * 1.5 + sym(), 0.4 + rnd() * 0.5, -c * 1.5 + sym(), 0, 0, 0,
          col, 1, 0.38, 0.42, 0, 1.8, 0.9, 0);
      }
    } else m.dustAcc = 0;
  }

  /** One speck from the rear tire on `side` (-1 left, 1 right): thrown back, out to that side and up, riding with its kart. */
  private speck(m: KartMem, side: number, bx: number, bz: number, s: number, c: number, py: number, vx: number, vy: number, vz: number,
    out: number, col: Rgb, back: Range, wide: Range, up: Range, life: Range, stretch: number): void {
    const wx = bx + c * m.sx * side, wz = bz - s * m.sx * side;
    const b = pick(back), lat = side * pick(wide) + out, u = pick(up);
    this.put(this.sparks, wx + sym() * 0.05, py + 0.08, wz + sym() * 0.05,
      -s * b + c * lat, u, -c * b - s * lat, vx * SPARK.carry, vy * SPARK.carry, vz * SPARK.carry,
      col, SPARK.gain, SPARK.width * (0.8 + 0.4 * rnd()), pick(life), SPARK.gravity, SPARK.drag, -0.5, stretch);
  }
}

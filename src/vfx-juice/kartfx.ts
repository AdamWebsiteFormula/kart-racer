// What each kart throws off as it drives (visual only; the sim never reads any of it): drift sparks
// and a glow at the rear wheels in the tier's colour, boost embers off the pipes, off-road dust and
// tyre marks. Mario Kart World's drift sparks are small, crisp and bright, spraying back and out
// from the rear wheels and never over the road ahead: here each spark keeps most of its kart's
// speed (so it stays near the wheel and falls behind it, a short trail) and draws as a streak
// along its own motion, a white-hot core with the tier's colour round it. Fewer than before, and
// a rival's fewer still, so a pack drifting through a bend is not a wall of light.
import { exhaustFor, flameColour, portDir, type Exhaust, type KartLook } from '../art-pipeline/index.ts';
import type { KartState } from '../kart-controller/types.ts';
import { BoostTier, TIER_RGB } from './flames.ts';
import { PARTICLE, ParticlePool, type SpawnOpts } from './particles.ts';
import type { Skids } from './trails.ts';

type Range = readonly [number, number];
type Rgb = readonly [number, number, number];

export const SPARK = Object.freeze({
  /** sparks a second from a drifting kart's rear wheels by tier (0: still charging, none) */
  rate: Object.freeze([0, 50, 58, 66] as const),
  /** a rival's share of the sparks and glows (yours read; the pack's do not crowd the road) */
  rival: 0.55,
  life: [0.18, 0.32] as Range,
  /** the streak's width, metres */
  width: 0.12,
  /** share of its kart's velocity a spark keeps: it falls behind the wheel, never ahead of the kart */
  carry: 0.84,
  /** its own throw, m/s: back, out to its wheel's side, up; and a push to the drift's outside */
  back: [1, 3] as Range, out: [1.5, 4.5] as Range, up: [2, 4.5] as Range, outside: 1.2,
  gravity: 15, drag: 3,
  /** seconds of its own motion it is drawn stretched over */
  stretch: 0.09,
  /** share of sparks that burn white-hot, and how bright the rest burn (above 1 the bloom catches them) */
  hot: 0.25, gain: 1.5,
  /** the glow at each rear wheel: size (m), life (s), a second per kart, brightness */
  flare: Object.freeze({ size: 0.6, life: 0.08, rate: 70, gain: 1.4 }),
});

export const EMBER = Object.freeze({
  /** embers a second off a boosting kart's pipes: a short trail behind the flames */
  rate: 30,
  life: [0.1, 0.2] as Range,
  width: 0.045,
  /** share of its kart's velocity an ember keeps, and its own speed out of the pipe (m/s) */
  carry: 0.72, speed: [2.5, 5.5] as Range,
  /** embers drift up a little as they cool (negative gravity) */
  lift: 1.5, drag: 2.5, stretch: 0.035, hot: 0.4,
});

/** Tyre marks: segment width (m), the least a wheel moves before the next is laid (m), and the fade-in at a drift's start (s). */
export const MARK = Object.freeze({ width: 0.24, spacing: 0.45, rampIn: 0.3 });

/** The most streaks one kart keeps alive at once (sparks at the top tier and embers), for the pool's budget. */
export function streaksPerKart(): number {
  return Math.ceil(SPARK.rate[3] * SPARK.life[1]) + Math.ceil(EMBER.rate * EMBER.life[1]);
}

/** A colour pushed toward white by `k` (a white-hot spark of the tier's colour). */
const toward = (c: Rgb, k: number): Rgb => Object.freeze([c[0] + (1.9 - c[0]) * k, c[1] + (1.85 - c[1]) * k, c[2] + (1.8 - c[2]) * k] as const);
const HOT_TIER: readonly Rgb[] = Object.freeze(TIER_RGB.map((c) => toward(c, 0.65)));
const DUST_MUD: Rgb = [0.45, 0.33, 0.22], DUST_ICE: Rgb = [0.9, 0.95, 1], DUST: Rgb = [0.86, 0.77, 0.6];

/** Visual-only randomness (never touches the sim). */
let seed = 0x2545f491;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const sym = () => rnd() * 2 - 1;
const pick = (r: Range) => r[0] + rnd() * (r[1] - r[0]);

interface KartMem {
  l: [number, number, number]; r: [number, number, number];
  skid: boolean; skidFor: number; skidInk: number;
  side: number; flareSide: number;
  sparkAcc: number; flareAcc: number; emberAcc: number; dustAcc: number;
  boost: BoostTier;
  exhaust: Exhaust | undefined;
  ember: Rgb; emberHot: Rgb;
}

export class KartFx {
  /** drift sparks and boost embers: streaks, one draw call */
  readonly sparks = new ParticlePool(768, true, false, PARTICLE.maxSize.spark, true);
  private readonly mem = new Map<string, KartMem>();
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.1, life: 0.2, cx: 0, cy: 0, cz: 0, stretch: 0 };
  private readonly glow: ParticlePool;
  private readonly soft: ParticlePool;
  private readonly skids: Skids;

  /** `glow`: the round glow pool (the wheel flares); `soft`: the dust; `skids`: the tyre marks. */
  constructor(glow: ParticlePool, soft: ParticlePool, skids: Skids) {
    this.glow = glow; this.soft = soft; this.skids = skids;
  }

  reset(): void { this.sparks.clear(); this.mem.clear(); }

  /** Particles fade and move on the real frame time. */
  update(dt: number): void { this.sparks.update(dt); }

  dispose(): void { this.sparks.dispose(); }

  private memFor(k: KartState): KartMem {
    let m = this.mem.get(k.racerId);
    if (!m) {
      const exhaust = exhaustFor(k.racerId, { body: k.bodyId as KartLook['body'], paint: k.skinId });
      const ember = Object.freeze(flameColour(k.racerId, 1.5, exhaust?.flame)) as Rgb;
      m = {
        l: [0, 0, 0], r: [0, 0, 0], skid: false, skidFor: 0, skidInk: 0, side: 1, flareSide: 1,
        sparkAcc: 0, flareAcc: 0, emberAcc: 0, dustAcc: 0, boost: new BoostTier(), exhaust, ember, emberHot: toward(ember, 0.6),
      };
      this.mem.set(k.racerId, m);
    }
    return m;
  }

  private put(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, cx: number, cy: number, cz: number,
    c: Rgb, gain: number, size: number, life: number, gravity: number, drag: number, grow: number, stretch: number): void {
    const o = this.o;
    o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz; o.cx = cx; o.cy = cy; o.cz = cz;
    o.r = c[0] * gain; o.g = c[1] * gain; o.b = c[2] * gain; o.size = size; o.life = life;
    o.gravity = gravity; o.drag = drag; o.grow = grow; o.stretch = stretch;
    pool.spawn(o);
  }

  /**
   * One kart's emitters for `dt` seconds of sim (0 while paused or frozen: nothing new is thrown).
   * `t` a clock in seconds; `cam` the camera's place (karts past 70 m throw nothing); `mine` the player's.
   */
  emit(k: KartState, dt: number, t: number, cam: readonly number[], mine: boolean): void {
    if (k.isGhost) return;
    const dx = k.position[0] - cam[0], dz = k.position[2] - cam[2];
    if (dx * dx + dz * dz > 70 * 70) { const far = this.mem.get(k.racerId); if (far) far.skid = false; return; } // too far to see
    const m = this.memFor(k);
    const s = Math.sin(k.heading), c = Math.cos(k.heading);
    const [px, py, pz] = k.position;
    // the kart's velocity: forward (sin h, 0, cos h) × speed + right (cos h, 0, −sin h) × lateral
    const vx = s * k.speed + c * k.lateralVelocity, vy = k.verticalVelocity, vz = c * k.speed - s * k.lateralVelocity;
    // rear wheels: 0.6 back, 0.55 either side
    const bx = px - s * 0.6, bz = pz - c * 0.6;
    const lx = bx - c * 0.55, lz = bz + s * 0.55, rx = bx + c * 0.55, rz = bz - s * 0.55;
    const drifting = k.drift.active && k.grounded;
    const share = mine ? 1 : SPARK.rival;

    // tyre marks while drifting on the ground: a segment each time a wheel has moved MARK.spacing,
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

    // drift sparks from the rear wheels in the tier's colour, and a glow on each wheel
    const tier = drifting ? Math.min(3, k.drift.tier) : 0;
    if (tier > 0) {
      const col = TIER_RGB[tier - 1], hot = HOT_TIER[tier - 1], out = -k.drift.direction * SPARK.outside;
      m.sparkAcc += dt * SPARK.rate[tier] * share;
      while (m.sparkAcc >= 1) {
        m.sparkAcc -= 1;
        m.side = -m.side; // the wheels take turns
        const side = m.side, wx = side < 0 ? lx : rx, wz = side < 0 ? lz : rz;
        const back = pick(SPARK.back), lat = side * pick(SPARK.out) + out, up = pick(SPARK.up);
        this.put(this.sparks, wx + sym() * 0.05, py + 0.08, wz + sym() * 0.05,
          -s * back + c * lat, up, -c * back - s * lat, vx * SPARK.carry, vy * SPARK.carry, vz * SPARK.carry,
          rnd() < SPARK.hot ? hot : col, SPARK.gain, SPARK.width * (0.8 + 0.4 * rnd()), pick(SPARK.life), SPARK.gravity, SPARK.drag, -0.5, SPARK.stretch);
      }
      const F = SPARK.flare;
      m.flareAcc += dt * F.rate * share;
      while (m.flareAcc >= 1) {
        m.flareAcc -= 1;
        m.flareSide = -m.flareSide;
        const wx = m.flareSide < 0 ? lx : rx, wz = m.flareSide < 0 ? lz : rz;
        // rides with the wheel (the kart's whole velocity), a little jitter
        this.put(this.glow, wx + sym() * 0.04, py + 0.12, wz + sym() * 0.04, sym() * 0.3, sym() * 0.3, sym() * 0.3, vx, vy, vz,
          col, F.gain, F.size * (0.85 + 0.3 * rnd()), F.life, 0, 0, 0.4, 0);
      }
    } else { m.sparkAcc = 0; m.flareAcc = 0; }

    // boost embers off the pipes (the flames on the pipes themselves: flames.ts), in the flame's colour
    const btier = m.boost.update(k, t);
    if (k.boost.source !== 'none' && k.boost.remaining > 0) {
      const col = btier > 0 ? TIER_RGB[btier - 1] : m.ember, hot = btier > 0 ? HOT_TIER[btier - 1] : m.emberHot;
      const ex = m.exhaust;
      m.emberAcc += dt * EMBER.rate * share;
      while (m.emberAcc >= 1) {
        m.emberAcc -= 1;
        // a pipe mouth in world space, and the way it points
        let x = bx, y = py + 0.45, z = bz, ox = -s, oy = 0.3, oz = -c;
        if (ex && ex.ports.length) {
          const p = ex.ports[(rnd() * ex.ports.length) | 0], d = portDir(ex, p);
          x = px + c * p[0] + s * p[2]; y = py + p[1]; z = pz - s * p[0] + c * p[2];
          ox = c * d[0] + s * d[2]; oy = d[1]; oz = -s * d[0] + c * d[2];
        }
        const sp = pick(EMBER.speed);
        this.put(this.sparks, x + sym() * 0.05, y + sym() * 0.05, z + sym() * 0.05,
          ox * sp + sym() * 0.6, oy * sp + sym() * 0.6, oz * sp + sym() * 0.6, vx * EMBER.carry, vy * EMBER.carry, vz * EMBER.carry,
          rnd() < EMBER.hot ? hot : col, 1, EMBER.width, pick(EMBER.life), -EMBER.lift, EMBER.drag, -0.4, EMBER.stretch);
      }
    } else m.emberAcc = 0;

    // off-road dust: low, small and quick, a kicked-up trail, never a cloud that hides the kart
    if (k.grounded && (k.surface === 'dirt' || k.surface === 'mud' || k.surface === 'ice') && Math.abs(k.speed) > 4) {
      m.dustAcc += dt * 14;
      const col = k.surface === 'mud' ? DUST_MUD : k.surface === 'ice' ? DUST_ICE : DUST;
      while (m.dustAcc >= 1) {
        m.dustAcc -= 1;
        this.put(this.soft, bx + sym() * 0.5, py + 0.15, bz + sym() * 0.5, -s * 1.5 + sym(), 0.4 + rnd() * 0.5, -c * 1.5 + sym(), 0, 0, 0,
          col, 1, 0.38, 0.42, 0, 1.8, 0.9, 0);
      }
    } else m.dustAcc = 0;
  }
}

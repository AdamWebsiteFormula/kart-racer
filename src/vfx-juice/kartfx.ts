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
import { comboOwnerOf, exhaustFor, portDir, type Exhaust, type KartLook } from '../art-pipeline/index.ts';
import { BODY_WHEELS, MODEL_WHEELS } from '../art-pipeline/rig.ts';
import type { RevView } from '../kart-controller/rev.ts';
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
  /** flakes thrown at a boost's ignition; a start boost's this many times as many */
  burst: 10,
  startBurst: 2.5,
  life: [0.14, 0.3] as Range,
  width: 0.05,
  /** share of its kart's velocity a flake keeps, and its own speed out of the pipe (m/s) */
  carry: 0.72, speed: [2.5, 5.5] as Range,
  /** flakes drift up a little as they cool (negative gravity) */
  lift: 1.5, drag: 2.5, stretch: 0.035,
});

/**
 * The pipes' breath: a small gray-blue puff at idle, and quicker, darker ones on a hard launch from a
 * standstill. Subtle: never a cloud. Off the road the engine's own rev (kart-controller rev.ts) adds the
 * rest in Mario Kart World's language (YouTube KkZV6Lp5Z5o, KCuVvGgJ5-4, TcPA3HMHSh0; mariowiki Rocket
 * Start): revving burns (the flames, flames.ts) and does not smoke; a blip throws a puff or two with its
 * spit of fire, a pop a few dark ones; smoke means trouble: a start held too early (STALL).
 */
export const PUFF = Object.freeze({
  color: Object.freeze([0.44, 0.49, 0.6] as const),
  /** at idle (under `idleSpeed` m/s): puffs a second, size (m), life (s), opacity */
  idleSpeed: 1, idleRate: 3, size: 0.14, life: 0.55, alpha: 0.55,
  /** a launch: under `launchSpeed` m/s and gaining `launchAccel` m/s² or more */
  launchSpeed: 9, launchAccel: 4, launchRate: 12, launchAlpha: 0.62,
  /** how much a puff grows over its life, how fast it leaves the pipe (m/s), and how fast it rises (m/s²) */
  grow: 2.4, speed: 0.9, lift: 0.3,
  /** a blip's puffs (a little darker than the breath); a pop's (times its size), dark */
  blipPuffs: 2, blipColor: Object.freeze([0.33, 0.35, 0.4] as const), popPuffs: 3, popColor: Object.freeze([0.26, 0.26, 0.29] as const),
});

/**
 * A start held too early: an engine that stalls (design §7: it costs no time, so only the look and the
 * sound say so). Mario Kart World's mistimed start (muted stills, 27 Sept 2026: YouTube TcPA3HMHSh0 at
 * 12.9-13.6 s, KCuVvGgJ5-4 at 0-2 s): held early the pipes burn and spit soot; at the go a backfire (a
 * flash, pale flecks), then dark charcoal smoke round the pipes that rises and thins within about half a
 * second, a wisp or two at the kart's sides after it, never white; the kart sits there dead. Ours drives
 * off (no time lost), so after the burst the engine chokes for a moment: a thin trail of small puffs
 * riding with the kart, so none is left hanging in front of the chase camera (the first cut threw 18
 * puffs growing to 0.7 to 1 m, eight of them white tire smoke, which the kart left behind at the lens:
 * "big soft white cotton balls", 27 Sept 2026). Sizes in meters, times in seconds.
 */
export const STALL = Object.freeze({
  /** charcoal (linear; about 0.25 on screen), a breath of blue */
  color: Object.freeze([0.05, 0.05, 0.056] as const),
  /**
   * the burst at the go: puffs over the pipes, each this big growing `grow` times, out of the pipe at `speed`
   * m/s and up at `up` (and rising `lift` m/s² more): up past the driver in a moment, where the chase camera
   * sees them against the road ahead (low, over the kart's own shade, charcoal is lost)
   */
  puffs: 8, size: 0.17, grow: 1.5, life: 0.45, speed: 1.2, up: 1.8, lift: 1.5, alpha: 0.85,
  /**
   * they keep up with the kart as it pulls away from a standstill: its velocity, and `follow` m/s along its
   * heading (about its mean speed over their life from a standstill: 15 m/s² for 0.45 s, halved), all times
   * `carry`; left in the air where it stood, the chase camera ran into them
   */
  follow: 3.3, carry: 0.85,
  /** then the engine chokes: this long, `chokeRate` smaller puffs a second, riding with the kart */
  choke: 0.6, chokeRate: 12, chokeSize: 0.12,
  /** the backfire's pale flecks thrown out of the pipes (streaks), and their color (linear, blooms) */
  flecks: 6, fleckColor: Object.freeze([1.9, 1.6, 0.9] as const),
  /** on the grid, held too early: soot, this many puffs a second over the idle breath, this big */
  sootRate: 6, sootSize: 0.11,
  /** reduced motion: this share of every puff; no flecks */
  reduced: 0.5,
});

/** A drift's tire smoke: faint white puffs where the rear tires scrub the road (a rival's fewer, reduced motion's half). */
export const SMOKE = Object.freeze({
  color: Object.freeze([0.86, 0.86, 0.9] as const),
  rate: 10, size: 0.22, life: 0.45, alpha: 0.3, grow: 2.2,
});

/**
 * Spray off the rear tires on a wet road (Windmill Run's Final Lap Shift storm; Adam, 26 Sept 2026: the
 * rain "does not splash"): Mario Kart World's rain throws a faint white mist behind the rear tires, a
 * thin trail about a kart long (art-pipeline SOP, 26 Sept 2026, two watches agree). A puff from each
 * rear tire in turn, `rate` a second at full wetness and `fullSpeed` m/s (none under `minSpeed`), thrown
 * `back` m/s (plus `backPerSpeed` of the kart's speed) behind the tire, out and up, riding with `carry`
 * of the kart's own velocity so the trail stays short; pale, faint (`alpha`), growing as it thins.
 */
export const SPRAY = Object.freeze({
  color: Object.freeze([0.8, 0.84, 0.9] as const),
  rate: 80, minSpeed: 6, fullSpeed: 22, reduced: 0.5,
  back: 1.2, backPerSpeed: 0.08, out: [0.4, 1.1] as const, up: [0.5, 1.2] as const, carry: 0.7,
  size: 0.1, life: 0.34, alpha: 0.24, grow: 3.2, gravity: 3.5, drag: 1.6,
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
/** Squared distance from (x, z) to a stored [x, y, z]'s x/z (compared only against another squared length: no sqrt). */
const moved2 = (x: number, z: number, p: readonly [number, number, number]): number => { const dx = x - p[0], dz = z - p[2]; return dx * dx + dz * dz; };

interface KartMem {
  l: [number, number, number]; r: [number, number, number];
  skid: boolean; skidFor: number; skidInk: number;
  side: number; sparkAcc: number; emberAcc: number; dustAcc: number; puffAcc: number; puffPipe: number; smokeAcc: number; smokeSide: number;
  sprayAcc: number; spraySide: number;
  /** the drift's tier as last seen (a rise throws the needles), and the boost's fire time as last seen (a new one throws the flakes) */
  lastTier: number; lastSince: number; lastSpeed: number;
  boost: BoostTier;
  /** the engine's rev last seen (a new race's is a new one), and its last blip, pop count and launch seen */
  rev: RevView | null; lastBlip: number; lastPops: number; lastLaunch: number;
  /** a stall's choke still to run (s), and its puffs owed; the soot owed while a start is held too early */
  chokeLeft: number; chokeAcc: number; sootAcc: number;
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
      const look: KartLook = { body: k.bodyId as KartLook['body'], paint: k.skinId, kartId: k.kartId };
      const exhaust = exhaustFor(k.racerId, look);
      const body = k.bodyId === 'classic' || k.bodyId === 'buggy' ? k.bodyId : k.kartId === 'classic' || k.kartId === 'buggy' ? k.kartId : null;
      // design §5: another racer's signature kart chosen puts the rear tires (the sparks) where that kart's own are
      const rear = body ? BODY_WHEELS[body].rear : MODEL_WHEELS[comboOwnerOf(k.racerId, look) ?? k.racerId]?.rear;
      wheelContact(rear, contact);
      m = {
        l: [0, 0, 0], r: [0, 0, 0], skid: false, skidFor: 0, skidInk: 0, side: 1, sparkAcc: 0, emberAcc: 0, dustAcc: 0, puffAcc: 0, puffPipe: 0, smokeAcc: 0, smokeSide: 1,
        sprayAcc: 0, spraySide: 1,
        lastTier: 0, lastSince: -1, lastSpeed: 0, boost: new BoostTier(), exhaust, rev: null, lastBlip: 0, lastPops: 0, lastLaunch: 0, chokeLeft: 0, chokeAcc: 0, sootAcc: 0,
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
   * `t` a clock in seconds; `cam` the camera's place (karts past 70 m throw nothing); `mine` the player's;
   * `rev` its engine's own rev (kart-controller rev.ts; none: the pipes breathe by the speed alone);
   * `wet` how wet the road is (0..1: Meadow's storm), for the tires' spray.
   */
  emit(k: KartState, dt: number, t: number, cam: readonly number[], mine: boolean, reduced = false, rev?: RevView, wet = 0): void {
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
      } else if (moved2(lx, lz, m.l) >= MARK.spacing * MARK.spacing || moved2(rx, rz, m.r) >= MARK.spacing * MARK.spacing) {
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
      const pal = flamePalette(btier, k.boost.source);
      // the ignition's flakes fly faster and wider than the steady ones
      let burst = 0, steady = 0;
      if (m.boost.since !== m.lastSince) {
        m.lastSince = m.boost.since;
        // a start boost bursts with more (Mario Kart World's rocket start throws a spray of sparks with its fire)
        burst = Math.round(EMBER.burst * share * (k.boost.source === 'start' ? EMBER.startBurst : 1));
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

    // the pipes' breath: a puff at idle, quicker ones on a hard launch; small, gray-blue, soon gone;
    // and a little soot rising while a start is held too early (the engine over-revving)
    const accel = dt > 0 ? (k.speed - m.lastSpeed) / dt : 0;
    m.lastSpeed = k.speed;
    // (a stalled engine does not breathe out a launch: its own smoke does)
    const stalling = rev !== undefined && rev.launch === 'early' && rev.clock - rev.launchAt < STALL.choke;
    const idle = k.grounded && Math.abs(k.speed) < PUFF.idleSpeed, launch = k.grounded && k.speed < PUFF.launchSpeed && accel >= PUFF.launchAccel && !stalling;
    const early = rev?.start === 'early' && k.grounded && !launch;
    const ex = m.exhaust;
    const pipes = ex && ex.ports.length && k.boost.remaining <= 0 ? ex : undefined;
    const n = mine ? 1 : SPARK.rival, R = reduced ? STALL.reduced : 1;
    if ((idle || launch) && pipes) {
      m.puffAcc += dt * (launch ? PUFF.launchRate : PUFF.idleRate) * n;
      while (m.puffAcc >= 1) {
        m.puffAcc -= 1;
        this.puff(m, pipes, px, py, pz, s, c, PUFF.speed * (launch ? 1.6 : 1), PUFF.color, launch ? 0.85 : 1, PUFF.size, launch ? PUFF.launchAlpha : PUFF.alpha);
      }
      if (early) {
        m.sootAcc += dt * STALL.sootRate * n * R;
        while (m.sootAcc >= 1) {
          m.sootAcc -= 1;
          this.puff(m, pipes, px, py, pz, s, c, STALL.speed, STALL.color, 1, STALL.sootSize, STALL.alpha, STALL.life, STALL.grow, STALL.lift, STALL.up * 0.6);
        }
      } else m.sootAcc = 0;
    } else m.puffAcc = m.sootAcc = 0;
    // the engine's moments: a blip's puffs, a pop's dark ones, a start held too early stalling at the go
    if (rev) {
      if (m.rev !== rev) { m.rev = rev; m.lastBlip = rev.blipAt; m.lastPops = rev.pops; m.lastLaunch = rev.launchAt; m.chokeLeft = 0; }
      if (rev.blipAt > m.lastBlip) {
        m.lastBlip = rev.blipAt;
        if (pipes) for (let i = Math.round(PUFF.blipPuffs * n); i > 0; i--) this.puff(m, pipes, px, py, pz, s, c, PUFF.speed * 1.8, PUFF.blipColor, 1, PUFF.size * 1.4, PUFF.alpha);
      }
      // (a stall's cough and its crackles are pops too: its own smoke stands for theirs)
      if (rev.pops !== m.lastPops) {
        m.lastPops = rev.pops;
        if (pipes && !stalling) for (let i = Math.max(1, Math.round(PUFF.popPuffs * rev.popSize * n)); i > 0; i--) this.puff(m, pipes, px, py, pz, s, c, PUFF.speed * 2.2, PUFF.popColor, 1, PUFF.size * (1.2 + rev.popSize), PUFF.launchAlpha);
      }
      if (rev.launchAt > m.lastLaunch) {
        m.lastLaunch = rev.launchAt;
        if (rev.launch === 'early' && ex && ex.ports.length) {
          // the backfire: pale flecks out of the pipes, and a burst of charcoal puffs that rise and thin
          if (!reduced) for (let i = Math.round(STALL.flecks * n); i > 0; i--) this.fleck(m, ex, px, py, pz, s, c, vx, vy, vz);
          for (let i = Math.round(STALL.puffs * n * R); i > 0; i--) {
            this.puff(m, ex, px, py, pz, s, c, STALL.speed * (0.8 + 0.5 * rnd()), STALL.color, 1, STALL.size, STALL.alpha, STALL.life, STALL.grow, STALL.lift, STALL.up * (0.8 + 0.4 * rnd()),
              (vx + s * STALL.follow) * STALL.carry, (vz + c * STALL.follow) * STALL.carry);
          }
          m.chokeLeft = STALL.choke;
          m.chokeAcc = 0;
        }
      }
    }
    // the engine choking just after a stall: a thin trail of small puffs riding with the kart, thinning out
    if (m.chokeLeft > 0 && ex && ex.ports.length) {
      m.chokeLeft -= dt;
      m.chokeAcc += dt * STALL.chokeRate * n * R;
      const left = Math.max(0, m.chokeLeft) / STALL.choke;
      while (m.chokeAcc >= 1) {
        m.chokeAcc -= 1;
        this.puff(m, ex, px, py, pz, s, c, STALL.speed * 0.6, STALL.color, 1, STALL.chokeSize, STALL.alpha * (0.35 + 0.65 * left), STALL.life * 0.8, STALL.grow, STALL.lift, STALL.up * 0.7, vx * STALL.carry, vz * STALL.carry);
      }
    }

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

    // spray off the rear tires on a wet road, from each tire in turn (none off the grass: its own dust,
    // none in the air)
    const speed = Math.abs(k.speed);
    if (wet > 0.05 && k.grounded && (k.surface === 'road' || k.surface === 'boost') && speed > SPRAY.minSpeed) {
      m.sprayAcc += dt * SPRAY.rate * wet * (mine ? 1 : SPARK.rival) * (reduced ? SPRAY.reduced : 1) * Math.min(1, speed / SPRAY.fullSpeed);
      while (m.sprayAcc >= 1) {
        m.sprayAcc -= 1;
        m.spraySide = -m.spraySide;
        const wx = m.spraySide > 0 ? rx : lx, wz = m.spraySide > 0 ? rz : lz;
        const back = SPRAY.back + speed * SPRAY.backPerSpeed, out = m.spraySide * pick(SPRAY.out);
        this.put(this.soft, wx + sym() * 0.08, py + 0.1, wz + sym() * 0.08, -s * back + c * out, pick(SPRAY.up), -c * back - s * out,
          vx * SPRAY.carry, 0, vz * SPRAY.carry, SPRAY.color, 1, SPRAY.size * (0.8 + 0.4 * rnd()), SPRAY.life * (0.8 + 0.4 * rnd()),
          SPRAY.gravity, SPRAY.drag, SPRAY.grow, 0, SPRAY.alpha);
      }
    } else m.sprayAcc = 0;
  }

  /**
   * One puff out of the kart's next pipe at `sp` m/s (and `up` m/s up): `col` times `gain`, about `size` m
   * across, `alpha` opaque, living about `life` s, growing `grow` times, rising `lift` m/s², riding with
   * (`cx`, `cz`) m/s (a stall's smoke keeps up with its kart).
   */
  private puff(m: KartMem, ex: Exhaust, px: number, py: number, pz: number, s: number, c: number, sp: number, col: Rgb, gain: number, size: number, alpha: number,
    life: number = PUFF.life, grow: number = PUFF.grow, lift: number = PUFF.lift, up = 0.35, cx = 0, cz = 0): void {
    m.puffPipe = (m.puffPipe + 1) % ex.ports.length;
    const p = ex.ports[m.puffPipe], d = portDir(ex, p);
    const x = px + c * p[0] + s * p[2], y = py + p[1], z = pz - s * p[0] + c * p[2];
    const ox = c * d[0] + s * d[2], oz = -s * d[0] + c * d[2];
    this.put(this.soft, x + ox * 0.06, y + d[1] * 0.06, z + oz * 0.06, ox * sp + sym() * 0.15, d[1] * sp + up + rnd() * 0.2, oz * sp + sym() * 0.15, cx, 0, cz,
      col, gain, size * (0.8 + 0.4 * rnd()), life * (0.8 + 0.4 * rnd()), -lift, 1.8, grow, 0, alpha);
  }

  /** One of a backfire's pale flecks: a short streak thrown out of the kart's next pipe, falling, riding with the kart. */
  private fleck(m: KartMem, ex: Exhaust, px: number, py: number, pz: number, s: number, c: number, vx: number, vy: number, vz: number): void {
    m.puffPipe = (m.puffPipe + 1) % ex.ports.length;
    const p = ex.ports[m.puffPipe], d = portDir(ex, p);
    const x = px + c * p[0] + s * p[2], y = py + p[1], z = pz - s * p[0] + c * p[2];
    const ox = c * d[0] + s * d[2], oz = -s * d[0] + c * d[2], sp = 2 + rnd() * 2.5;
    this.put(this.sparks, x + ox * 0.08, y + d[1] * 0.08, z + oz * 0.08, ox * sp + sym() * 1.6, d[1] * sp + 0.8 + rnd() * 1.6, oz * sp + sym() * 1.6, vx * 0.8, vy * 0.8, vz * 0.8,
      STALL.fleckColor, 1, EMBER.width, 0.12 + rnd() * 0.12, 9, 2, -0.4, EMBER.stretch);
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

// The boost flames on each kart's pipes and the drift stars at its rear tires (design §7; Mario Kart
// World's, studied frame by frame on 25 Sept 2026). A boost lights a compact, crisp jet from every
// pipe: a white-hot, blue-ringed nozzle, then flat bands of fire. A mini-turbo burns its drift tier's
// color (blue, orange, purple, like the sparks it came from); any other boost (a pad, an item, a
// trick, the start) burns warm orange-gold. It fires with a pop (a white flash at the nozzle, a shock
// ring, billows of fire, the jet swollen for a moment), licks and sways while it runs, is swept back
// by the air as the kart moves (out to the side in a drift), and shrinks and sputters out at the end;
// white wind arcs run back round the boosting kart. While a kart drifts, a star burns at each rear
// tire in the tier's color, crackling; a tier-up flashes a shell round the tire. All of it is one
// mesh on the chassis (jet.ts; one draw call a kart), drawn only while the kart boosts or drifts, so
// it leans, bounces and spins with the kart.
import { Mesh, Vector3, type Object3D } from 'three';
import { BODY_EXHAUST, EXHAUST, type Exhaust } from '../art-pipeline/index.ts';
import { BODY_WHEELS, MODEL_WHEELS, type WheelRig } from '../art-pipeline/rig.ts';
import { BASE } from '../kart-controller/constants.ts';
import type { RevView } from '../kart-controller/rev.ts';
import type { BoostSource } from '../kart-controller/types.ts';
import { jetGeometry, jetMaterial, WHITE_HEART, type JetUniforms } from './jet.ts';

type Rgb = readonly [number, number, number];
const rgb = (r: number, g: number, b: number): Rgb => Object.freeze([r, g, b] as const);

/**
 * The drift tiers' spark colors in linear RGB (above 1 blooms): blue, orange, purple (design §7). The
 * stars, the thrown sparks and the tier-up bursts share them. Deep, one channel strong: brighter burned
 * the stars toward white through the tone map ("lens-flare glints, mostly white", critique of 25 Sept 2026).
 */
export const TIER_RGB: readonly Rgb[] = Object.freeze([rgb(0.12, 0.62, 2.0), rgb(2.0, 0.55, 0.05), rgb(1.2, 0.18, 2.1)]);
/** Each tier's white-hot spark core, a breath of its hue kept. */
export const TIER_HOT: readonly Rgb[] = Object.freeze([rgb(2.1, 2.6, 3.1), rgb(3.1, 2.6, 1.8), rgb(2.8, 2.1, 3.1)]);

/** A flame's color bands, hottest last (linear RGB, above 1 blooms): the nozzle's ring and its fringe, then core, inner, body, edge. */
export interface FlamePalette { mouth: Rgb; fringe: Rgb; core: Rgb; inner: Rgb; body: Rgb; edge: Rgb }

// The bands' top channels sit near 1.5 and their weak ones near nothing: the filmic tone map turns
// anything much brighter toward white, and the bloom (from 1.0) spreads it (a first try at 2.5 to 3
// burned the ignition's billows into a white cloud). Only the core and the nozzle's ring are meant to glow.
const NOZZLE = rgb(0.45, 1.2, 2.7), VIOLET = rgb(0.9, 0.3, 1.6);
export const PALETTE = Object.freeze({
  /** a mini-turbo's flame in its tier's color: blue, orange, purple */
  tier: Object.freeze([
    Object.freeze({ mouth: NOZZLE, fringe: rgb(0.3, 0.95, 2.3), core: rgb(1.3, 1.95, 2.7), inner: rgb(0.16, 0.72, 1.9), body: rgb(0.03, 0.24, 1.5), edge: rgb(0.01, 0.05, 0.72) }),
    Object.freeze({ mouth: NOZZLE, fringe: VIOLET, core: rgb(2.4, 1.9, 1.05), inner: rgb(1.65, 0.72, 0.04), body: rgb(1.45, 0.22, 0.015), edge: rgb(0.75, 0.045, 0.01) }),
    // violet, not pink: a strong red channel read as magenta slime once tone-mapped
    Object.freeze({ mouth: rgb(1.2, 0.95, 2.7), fringe: rgb(1.0, 0.45, 2.3), core: rgb(2.0, 1.75, 2.8), inner: rgb(1.1, 0.45, 2.0), body: rgb(0.45, 0.04, 1.5), edge: rgb(0.18, 0.01, 0.78) }),
  ] as FlamePalette[]),
  /** a pad, a trick or the start: warm orange-gold, Mario Kart World's blue nozzle and violet fringe */
  other: Object.freeze({ mouth: NOZZLE, fringe: VIOLET, core: rgb(2.3, 2.0, 1.15), inner: rgb(1.6, 1.05, 0.06), body: rgb(1.45, 0.38, 0.02), edge: rgb(0.75, 0.09, 0.01) }) as FlamePalette,
  /**
   * an item's boost (a Nitro, a Triple Nitro, the Tractor Beam's slingshot; 28 Sept 2026, the new set): a
   * nitro's blue-white, a white-hot core in electric blue, never the blue mini-turbo's deep one
   */
  nitro: Object.freeze({ mouth: rgb(1.3, 2.0, 2.9), fringe: rgb(0.7, 1.5, 2.8), core: rgb(2.3, 2.6, 2.9), inner: rgb(0.55, 1.45, 2.0), body: rgb(0.1, 0.62, 1.75), edge: rgb(0.02, 0.2, 0.9) }) as FlamePalette,
  /** the pipes' own fire off the boost (revving on the grid, a blip, a pop): yellow-orange tongues, the mouth glowing its heat (mouth and fringe follow heatColor) */
  rev: Object.freeze({ mouth: rgb(2.0, 0.85, 0.15), fringe: rgb(1.3, 0.3, 0.03), core: rgb(2.2, 1.85, 0.9), inner: rgb(1.6, 0.95, 0.05), body: rgb(1.45, 0.42, 0.02), edge: rgb(0.8, 0.12, 0.01) }) as FlamePalette,
});

/**
 * The pipes' own fire, off the boost (kart-controller rev.ts; Adam, 26 Sept 2026: "I don't see any fire or
 * anything coming out of the back of the pipes ... when the countdown is coming ... and you give it some
 * gas"). Mario Kart World on the grid (YouTube KkZV6Lp5Z5o 1:16.5-1:19, muted stills): the pipe's mouth
 * glows as the engine revs, dull red, then orange, then gold; small yellow-orange tongues burn at high revs;
 * at the go a rocket start bursts into a big fire (the boost flames, `FLAME.popBy.start`); mariowiki
 * (Rocket Start): "the flames coming out of the vehicle's exhaust pipes determine the strength of the
 * Rocket Start", so a start timed for the boost burns bigger, steadier tongues (`ready`), and one held too
 * early sputters (`early`: it will cough at the go, a backfire and smoke). A blip spits a flame, a pop (a
 * let-off after a high rev) a bigger one with a flash and a puff of fire, a hard launch a burst. Lengths
 * and widths in meters before the exhaust's size (FLAME.sizeShare).
 */
export const REV_FIRE = Object.freeze({
  /** a full tongue's length and radius; its radius from `widShare` of that when short */
  len: 0.28,
  wid: 0.1,
  widShare: 0.55,
  /** standing (under `curlSpeed` m/s), a tongue curls this far (0..1) toward `curl` (up and a little back, in the kart's frame): hot gas rises */
  curl: Object.freeze([0, 0.85, -0.5] as const),
  curlBend: 0.45,
  curlSpeed: 4,
  /** how much a flame at the mouth heats the flare past the heat's own color */
  mouthHot: 0.25,
  /** tongues grow from this rev, full at the limiter (and only off the road) */
  tongueFrom: 0.7,
  /** a start timed for the boost: tongues this much bigger; one held too early: they cough out `earlyGap` of the time, `earlyHz` a second */
  ready: 1.3,
  earlyGap: 0.5,
  earlyHz: 13,
  /** each pipe's tongue wanders this share of its length (none under reduced motion) */
  flicker: 0.28,
  /** a spit: up in `spitUp` s, gone over `spitDecay` s; a blip's, a pop's and a hard launch's size (× a full tongue); a launch's decay */
  spitUp: 0.025,
  spitDecay: 0.14,
  blip: 0.8,
  pop: 1.25,
  launch: 1.4,
  launchDecay: 0.3,
  /** a pop's flash (the ignition's bolts) and puff of fire (its billows), times the pop's size; how long each lasts (s) */
  popFlash: 0.7,
  popPuff: 0.45,
  flashSeconds: 0.06,
  puffSeconds: 0.26,
  /** reduced motion: spits, flashes and puffs this much, the tongues held still */
  reduced: 0.5,
  /** heat under this shows no glow */
  glowFrom: 0.06,
});

/** The pipes' fire at an instant (revFire): the mouth's glow 0..1, the flame's length share of a full tongue, a pop's flash and puff of fire. */
export interface RevFire { heat: number; len: number; flash: number; puff: number }

const smooth01 = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
/** a spit `age` s old of `size`: up over REV_FIRE.spitUp, then gone over `decay` */
function spit(age: number, size: number, decay: number): number {
  if (!(age >= 0) || size <= 0) return 0;
  return age < REV_FIRE.spitUp ? (size * age) / REV_FIRE.spitUp : size * Math.exp(-(age - REV_FIRE.spitUp) / decay);
}

/**
 * The pipes' fire off the boost from the engine's rev (kart-controller rev.ts) now: the heat's glow, the
 * steady tongues at high revs (bigger for a start timed for the boost, coughing for one held too early),
 * and the spits of a blip, a pop and a hard launch; a pop's flash and puff. Reduced motion: no coughing,
 * spits, flashes and puffs half as big. Pure; writes `out`.
 */
export function revFire(rev: RevView, reduced: boolean, out: RevFire): RevFire {
  const R = REV_FIRE, c = rev.clock, k = reduced ? R.reduced : 1;
  let tongue = smooth01(R.tongueFrom, 1, rev.rev) * (1 - rev.load);
  if (rev.start === 'ready') tongue *= R.ready;
  else if (rev.start === 'early' && !reduced && hash01(Math.floor(c * R.earlyHz) + 911) < R.earlyGap) tongue *= 0.2;
  const blip = spit(c - rev.blipAt, R.blip * rev.blipSize * k, R.spitDecay);
  const pop = spit(c - rev.popAt, R.pop * rev.popSize * k, R.spitDecay);
  const launch = rev.launch === 'hard' ? spit(c - rev.launchAt, R.launch * k, R.launchDecay) : 0;
  out.len = Math.max(tongue, blip, pop, launch);
  out.heat = rev.heat;
  const pa = c - rev.popAt;
  out.flash = pa >= 0 && pa < R.flashSeconds ? R.popFlash * rev.popSize * k * (1 - pa / R.flashSeconds) ** 2 : 0;
  out.puff = pa >= 0 && pa < R.puffSeconds ? R.popPuff * rev.popSize * k * (1 - pa / R.puffSeconds) ** 2 : 0;
  return out;
}

/** The pipe's glow for a heat 0..1 (linear RGB, into `out`): nothing, dull red, orange, gold; brighter as it heats. */
export function heatColor(heat: number, out: [number, number, number]): [number, number, number] {
  const h = Math.min(1, Math.max(0, heat)), b = smooth01(REV_FIRE.glowFrom, 0.45, h);
  // red (0.3) → orange (0.65) → gold (1)
  const m = smooth01(0.3, 0.65, h), n = smooth01(0.65, 1, h);
  out[0] = b * (0.95 + 0.85 * m + 0.3 * n);
  out[1] = b * (0.1 + 0.5 * m + 0.75 * n);
  out[2] = b * (0.02 + 0.06 * m + 0.25 * n);
  return out;
}

export const FLAME = Object.freeze({
  /** jet length and radius (meters, before the exhaust's size) for a mini-turbo's tier 1, 2, 3 */
  tier: Object.freeze([Object.freeze({ len: 0.6, wid: 0.23 }), Object.freeze({ len: 0.72, wid: 0.25 }), Object.freeze({ len: 0.86, wid: 0.27 })]),
  /** an item, pad, trick or start boost; a slipstream's is small */
  other: Object.freeze({ len: 0.8, wid: 0.26 }),
  slip: Object.freeze({ len: 0.42, wid: 0.15 }),
  /** how much of an exhaust's own `size` counts (Nova's thruster, Boulder's stacks: bigger, not huge) */
  sizeShare: 0.5,
  /** the ignition: the jet swells this much longer and wider, easing out over `popSeconds`; a white flash at the nozzle over `flashSeconds`; a shock ring spreading over `ringSeconds` */
  popLen: 0.45, popWid: 0.4, popSeconds: 0.28, flashSeconds: 0.06, ringSeconds: 0.24,
  /** it shoots out of the pipe: from `shootFrom` of its length to all of it over its first `shootSeconds` (the flash reads first) */
  shootSeconds: 0.06, shootFrom: 0.2,
  /**
   * how big each boost's ignition is (a purple mini-turbo's the biggest of the drift's, a slipstream's
   * small and ringless); a start boost's bigger than any: Mario Kart World's rocket start bursts into a
   * fire wider than the kart at the go (YouTube KkZV6Lp5Z5o 1:19), so an earned one is plain to see
   */
  popBy: Object.freeze({ tier: Object.freeze([0.8, 1, 1.2]), other: 1, slip: 0.4, start: 1.6 }),
  /** reduced motion: a calmer ignition (this share of it) and no shock ring */
  reducedPop: 0.5,
  /** over a boost's last `tailSeconds` the jet shrinks to `tail` of its length and sputters: gaps `sputterHz` a second, more of them as it dies, each down to `cough` of its length (none under reduced motion) */
  tailSeconds: 0.35, tail: 0.35, sputterHz: 18, sputterGap: 0.6, cough: 0.3,
  /** the length wanders this share either way, each pipe out of step (none under reduced motion) */
  flicker: 0.1,
  /**
   * the air sweeps a jet from its pipe's line this far toward the kart's wake (0..1) at `bendSpeed`
   * m/s and over, and a little down: our pipes point back and up, straight at the chase camera, where
   * a jet end-on is a dot; swept flat it shows its length (Mario Kart World's camera sees its flames
   * from above and behind, trailing back along the road)
   */
  bend: 0.65, bendSpeed: 22, windDrop: -0.3,
  /** brightness: a boost's steady flame, and extra at the ignition's peak */
  gain: 1, popGain: 0.3,
  /** the wind arcs round a boosting kart: how strongly they show while it runs, and more at the ignition (a slipstream's `slipArc`; none under reduced motion) */
  arc: 0.6, popArc: 0.4, slipArc: 0.5,
});

/** How strongly the wind arcs show `age` seconds into a boost with `left` to run (by its source); 0 under reduced motion, fading over the boost's last moments. */
export function arcLevel(source: BoostSource, age: number, left: number, reduced: boolean): number {
  if (reduced || source === 'none' || left <= 0) return 0;
  const p = age < 0 ? 0 : Math.max(0, 1 - age / FLAME.popSeconds);
  const fade = Math.min(1, left / FLAME.tailSeconds);
  return (FLAME.arc + FLAME.popArc * p) * fade * (source === 'slipstream' ? FLAME.slipArc : 1);
}

/** The drift stars at the rear tires. */
export const STAR = Object.freeze({
  /** half height (meters) of a tire's star: charging (a faint glow, no rays), then tier 1, 2, 3 */
  size: Object.freeze([0.15, 0.42, 0.48, 0.54]),
  /** brightness: a charging glow, then a star */
  chargeGain: 0.45, gain: 1,
  /** a rival's stars (yours read; the pack's do not crowd the road) */
  rivalSize: 0.8, rivalGain: 0.7,
  /** a tier-up's flash: a shell spreading round the tire and a bigger glow, over this long */
  flashSeconds: 0.16,
  /** reduced motion: a calmer flash (this share of it; the rays hold still anyway) */
  reducedFlash: 0.5,
});

/** What a kart's state tells the flames and stars: its drift (the tier it let go at) and its live boost, and how it moves. */
export interface FlameKart {
  drift: { active: boolean; tier: number };
  boost: { source: BoostSource; remaining: number };
  grounded?: boolean;
  /** m/s along its heading and to its right: the air the flames bend into */
  speed?: number; lateralVelocity?: number;
  isPlayer?: boolean;
}

/** A drift boost's tier told by its length (BASE.boostSeconds), for when the drift itself was not seen. */
export function tierBySeconds(seconds: number): number {
  const s = BASE.boostSeconds;
  return seconds >= (s[1] + s[2]) / 2 ? 3 : seconds >= (s[0] + s[1]) / 2 ? 2 : 1;
}

/** The flame's colors for a boost: a mini-turbo's tier 1..3, else (0) an item's nitro blue-white or any other's warm orange-gold. */
export function flamePalette(tier: number, source?: BoostSource): FlamePalette {
  return tier > 0 ? PALETTE.tier[Math.min(3, tier) - 1] : source === 'item' ? PALETTE.nitro : PALETTE.other;
}

/**
 * Which color a kart's live boost burns in, followed from its state frame to frame: a drift boost
 * its mini-turbo tier (the tier the drift held when it let go: 1 blue, 2 orange, 3 purple), any
 * other boost 0 (orange-gold). `since` is the clock when the live boost fired.
 */
export class BoostTier {
  tier = 0;
  source: BoostSource = 'none';
  since = 0;
  private held = 0;
  private left = 0;

  update(k: FlameKart, t: number): number {
    if (k.drift.active) this.held = k.drift.tier;
    const b = k.boost;
    if (b.source === 'none' || b.remaining <= 0) { this.tier = 0; this.source = 'none'; this.left = 0; return 0; }
    if (b.source !== this.source || b.remaining > this.left + 1e-4) {
      // a new boost, or one refreshed: a drift's is the tier it let go at
      this.tier = b.source === 'drift' ? (this.held >= 1 ? Math.min(3, this.held) : tierBySeconds(b.remaining)) : 0;
      this.source = b.source;
      this.since = t;
    }
    this.left = b.remaining;
    return this.tier;
  }
}

/** How big a boost's ignition is: its tier's (1..3), else by its source. */
export function popScale(tier: number, source: BoostSource): number {
  const P = FLAME.popBy;
  return tier > 0 ? P.tier[Math.min(3, tier) - 1] : source === 'slipstream' ? P.slip : source === 'start' ? P.start : P.other;
}

/** A boost's ignition `age` seconds after it fired: the jet's swell (1 → 0), the nozzle's white flash (1 → 0), the shock ring's progress (0 → 1; -1: none). */
export interface Ignition { pop: number; flash: number; ring: number }

/** The ignition's envelopes for a boost of `scale` (popScale) `age` seconds old; reduced motion calmer and ringless. Writes `out`. */
export function ignition(age: number, scale: number, reduced: boolean, out: Ignition): Ignition {
  const k = scale * (reduced ? FLAME.reducedPop : 1);
  const p = age < 0 ? 0 : Math.max(0, 1 - age / FLAME.popSeconds), f = age < 0 ? 0 : Math.max(0, 1 - age / FLAME.flashSeconds);
  out.pop = p * p * k;
  // the flash never outgrows a purple mini-turbo's (a start boost's bigger fire, not a bigger white disc)
  out.flash = f * f * Math.min(k, FLAME.popBy.tier[2]);
  out.ring = !reduced && scale >= 0.8 && age >= 0 && age < FLAME.ringSeconds ? age / FLAME.ringSeconds : -1;
  return out;
}

/** The share of its length a jet `age` seconds old has shot out of its pipe: FLAME.shootFrom at the fire, all of it from FLAME.shootSeconds. */
export function shootOut(age: number): number {
  const k = Math.min(1, Math.max(0, age / FLAME.shootSeconds));
  return FLAME.shootFrom + (1 - FLAME.shootFrom) * k * k * (3 - 2 * k);
}

/**
 * A jet's length and radius in meters: `tier` 1..3 a mini-turbo's (0 any other boost, from `source`),
 * `age` seconds since it fired, `left` seconds still to run, `size` the exhaust's. Shooting out of the
 * pipe, swollen by the ignition's pop, shrinking over its last moments. Writes `out`.
 */
export function flameSize(tier: number, source: BoostSource, age: number, left: number, size: number, out: { len: number; wid: number }, reduced = false): { len: number; wid: number } {
  const base = tier > 0 ? FLAME.tier[Math.min(3, tier) - 1] : source === 'slipstream' ? FLAME.slip : FLAME.other;
  const k = 1 + (size - 1) * FLAME.sizeShare;
  const p = age < 0 ? 0 : Math.max(0, 1 - age / FLAME.popSeconds);
  const pop = p * p * popScale(tier, source) * (reduced ? FLAME.reducedPop : 1);
  const tail = left < FLAME.tailSeconds ? FLAME.tail + (1 - FLAME.tail) * Math.max(0, left) / FLAME.tailSeconds : 1;
  out.len = base.len * k * (1 + FLAME.popLen * pop) * tail * shootOut(age);
  // (a start boost's burst reaches further, never wider than a purple mini-turbo's: its nozzle flash grows with the width)
  out.wid = base.wid * k * (1 + FLAME.popWid * Math.min(pop, FLAME.popBy.tier[2])) * (0.6 + 0.4 * tail);
  return out;
}

/** A visual-only hash of an integer to [0, 1) (never touches the sim). */
function hash01(n: number): number {
  let x = (n * 0x9e3779b1) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** The share of its length a dying jet shows at clock `t` with `left` seconds to run: 1, or a cough in a gap as it sputters out (never under reduced motion). */
export function sputter(left: number, t: number, seed: number, reduced: boolean): number {
  if (reduced || left >= FLAME.tailSeconds || left <= 0) return 1;
  const dying = 1 - left / FLAME.tailSeconds;
  return hash01(Math.floor(t * FLAME.sputterHz) + Math.floor(seed * 1000)) < FLAME.sputterGap * dying ? FLAME.cough : 1;
}

/** A tire star's look: half height (m; 0 none), how much of its rays show, brightness. `tier` 0 is a charging drift. */
export function starLook(tier: number, player: boolean, out: { size: number; rays: number; gain: number }): { size: number; rays: number; gain: number } {
  const t = Math.max(0, Math.min(3, tier));
  out.size = STAR.size[t] * (player ? 1 : STAR.rivalSize);
  out.rays = t > 0 ? 1 : 0;
  out.gain = (t > 0 ? STAR.gain : STAR.chargeGain) * (player ? 1 : STAR.rivalGain);
  return out;
}

/** A tier-up's flash `age` seconds on: 1 → 0 over STAR.flashSeconds (calmer under reduced motion). */
export function starFlash(age: number, reduced: boolean): number {
  if (age < 0 || age >= STAR.flashSeconds) return 0;
  const k = 1 - age / STAR.flashSeconds;
  return k * k * (reduced ? STAR.reducedFlash : 1);
}

/** Where a kart's rear tires touch the road, in its own frame: its outer half, a little up, just behind the axle. */
export function wheelContact(rear: WheelRig | undefined, out: Vector3): Vector3 {
  const r = rear ?? { x: 0.55, z: -0.55, r: 0.3, w: 0.14 };
  return out.set(r.x + r.w * 0.5, 0.12, r.z - r.r * 0.45);
}

const BODIES = Object.keys(BODY_WHEELS) as (keyof typeof BODY_WHEELS)[];

/**
 * A chassis's rear tires: its own (`userData.wheels`, should a model carry them), a shared body's
 * (known by its pipes: exhaustFor hands a body kart the body's own port list), else the racer
 * model's (MODEL_WHEELS; the code-built stand-in's are within a few centimeters).
 */
function rearWheels(chassis: Object3D, racerId: string, e: Exhaust): WheelRig | undefined {
  const own = chassis.userData.wheels as { rear?: WheelRig } | undefined;
  if (own?.rear) return own.rear;
  for (const b of BODIES) if (e.ports === BODY_EXHAUST[b].ports) return BODY_WHEELS[b].rear;
  // a racer built from parts (art-pipeline rigged.ts): its rear hub bone, at the axle, in the kart's frame
  const hub = chassis.userData.rig ? chassis.getObjectByName('hubRL') ?? chassis.getObjectByName('hubRR') : undefined;
  if (hub) return { x: Math.abs(hub.position.x), z: hub.position.z, r: hub.position.y, w: RIG_TIRE };
  return MODEL_WHEELS[racerId]?.rear;
}
/** a rigged kart's tire half width (its hub bones carry no width) */
const RIG_TIRE = 0.14;

export class ExhaustFlames {
  /** one mesh for all the kart's pipes and its tire stars (null for a kart with no pipes) */
  readonly mesh: Mesh | null = null;
  /** the live boost's color tier */
  readonly boost = new BoostTier();
  private readonly u: JetUniforms | null = null;
  /** the kart's animated chassis (its turn under the heading bends the air): the mesh itself may hang off a bone below it */
  private readonly chassis: Object3D;
  private readonly size: number;
  private readonly phase: number;
  private palette: FlamePalette | null = null;
  private starTier = -1;
  /** the drift's tier as last seen (a tier-up flashes the stars), and when it last went up */
  private lastTier = 0;
  private flashAt = -Infinity;
  private readonly dims = { len: 0, wid: 0 };
  private readonly ign: Ignition = { pop: 0, flash: 0, ring: -1 };
  private readonly star = { size: 0, rays: 0, gain: 0 };
  /** the pipes' own fire this frame, and its heat's color (reused) */
  private readonly fire: RevFire = { heat: 0, len: 0, flash: 0, puff: 0 };
  private readonly heat: [number, number, number] = [0, 0, 0];

  constructor(chassis: Object3D, racerId: string) {
    this.chassis = chassis;
    // a shared body (art-pipeline kart.ts) burns from its own pipes
    const e = (chassis.userData.exhaust as Exhaust | undefined) ?? EXHAUST[racerId];
    this.size = e?.size ?? 1;
    let h = 7;
    for (let i = 0; i < racerId.length; i++) h = (h * 31 + racerId.charCodeAt(i)) >>> 0;
    this.phase = (h % 1000) / 100;
    if (!e) return;
    const mat = jetMaterial();
    mat.uniforms.uSeed.value = this.phase;
    wheelContact(rearWheels(chassis, racerId, e), mat.uniforms.uWheel.value);
    const mesh = new Mesh(jetGeometry(e), mat);
    mesh.name = 'exhaust-flame';
    mesh.visible = false;
    mesh.renderOrder = 2; // after the karts, like the other glows
    // on a rigged kart the pipes ride the body's springs: the flames hang off its body bone (art-pipeline rigged.ts)
    ((chassis.userData.exhaustAnchor as Object3D | undefined) ?? chassis).add(mesh);
    this.mesh = mesh;
    this.u = mat.uniforms;
  }

  /** Above 0, the flames go right against the lens (a rival's: CAM.kartFade); 0, never (your own). A rival's kart fader also shares its opacity with them (uKart). */
  setFade(meters: number): void { if (this.u) this.u.uFade.value = meters; }

  /**
   * `k` the kart's state this frame, `t` a clock in seconds (the race's: still while paused), `rev` its
   * engine's own rev (kart-controller rev.ts; none: no fire off the boost). Reduced motion holds the
   * flames and stars still and calms the pops.
   */
  update(k: FlameKart, t: number, reduced = false, rev?: RevView): void {
    const tier = this.boost.update(k, t);
    const mesh = this.mesh, u = this.u;
    if (!mesh || !u) return;
    const on = k.boost.source !== 'none' && k.boost.remaining > 0;
    const drifting = k.drift.active && k.grounded !== false;
    // a tier-up flashes the stars
    const dt = drifting ? Math.min(3, k.drift.tier) : 0;
    if (dt > this.lastTier && dt > 0) this.flashAt = t;
    this.lastTier = dt;
    // off the boost, the pipes' own fire: their heat's glow, tongues, spits and pops
    const fire = !on && rev ? revFire(rev, reduced, this.fire) : null;
    const burning = fire !== null && (fire.heat > REV_FIRE.glowFrom || fire.len * REV_FIRE.len > 0.02 || fire.flash > 0 || fire.puff > 0);
    mesh.visible = on || drifting || burning;
    if (!mesh.visible) return;
    u.uTime.value = t;
    u.uWave.value = reduced ? 0 : 1;
    u.uOn.value = on || burning ? 1 : 0;

    // the stars at the rear tires: a faint glow while the drift charges, then the tier's star
    if (drifting) {
      const s = starLook(dt, k.isPlayer !== false, this.star);
      if (dt !== this.starTier) {
        this.starTier = dt;
        const c = TIER_RGB[Math.max(1, dt) - 1], hc = TIER_HOT[Math.max(1, dt) - 1];
        u.uStarCol.value.setRGB(c[0], c[1], c[2]);
        u.uStarHot.value.setRGB(hc[0], hc[1], hc[2]);
      }
      u.uStar.value = s.size;
      u.uStarRays.value = s.rays;
      u.uStarGain.value = s.gain;
      u.uStarFlash.value = starFlash(t - this.flashAt, reduced);
    } else { u.uStar.value = 0; u.uStarFlash.value = 0; this.starTier = -1; }
    if (!on) {
      u.uArc.value = 0;
      if (burning) this.revFlames(fire!, k, t, reduced, u);
      return;
    }

    const pal = flamePalette(tier, k.boost.source);
    if (pal !== this.palette) {
      this.palette = pal;
      u.uMouth.value.setRGB(...pal.mouth); u.uFringe.value.setRGB(...pal.fringe); u.uCore.value.setRGB(...pal.core);
      u.uInner.value.setRGB(...pal.inner); u.uBody.value.setRGB(...pal.body); u.uEdge.value.setRGB(...pal.edge);
      u.uHeart.value.setRGB(...WHITE_HEART);
    }
    const age = t - this.boost.since, left = k.boost.remaining;
    const ig = ignition(age, popScale(tier, k.boost.source), reduced, this.ign);
    // the shader's swell (the flare, the billows) as a purple mini-turbo's at most: a start boost's own is its reach
    u.uPop.value = Math.min(ig.pop, FLAME.popBy.tier[2]); u.uFlash.value = ig.flash; u.uRing.value = ig.ring;
    // (a start boost's ignition reaches further, never brighter: past 1 the bands would burn toward white)
    u.uGain.value = FLAME.gain + FLAME.popGain * Math.min(1, ig.pop);
    u.uArc.value = arcLevel(k.boost.source, age, left, reduced);
    const d = flameSize(tier, k.boost.source, age, left, this.size, this.dims, reduced);
    // two out-of-step wobbles per pipe read as fire, and the pipes never flicker together; a dying jet coughs
    const p = this.phase, fl = reduced ? 0 : FLAME.flicker;
    const w0 = Math.sin(t * 43 + p) * Math.sin(t * 27 + p * 0.5), w1 = Math.sin(t * 41 + 2.1 + p) * Math.sin(t * 29 + 1 + p * 0.5);
    const c0 = sputter(left, t, p, reduced), c1 = sputter(left, t + 0.37, p + 0.5, reduced);
    u.uLen.value.set(d.len * (1 + fl * w0) * c0, d.len * (1 + fl * w1) * c1);
    u.uWid.value.set(d.wid * (1 + fl * 0.4 * w0), d.wid * (1 + fl * 0.4 * w1));
    this.air(k, u);
    u.uGlow.value = 1;
  }

  /** The air past the kart, in the chassis's own frame (it turns under the heading in a drift or a spin): where the jets bend, and how far. */
  private air(k: FlameKart, u: JetUniforms): void {
    const vx = k.lateralVelocity ?? 0, vz = k.speed ?? 0, sp = Math.sqrt(vx * vx + vz * vz), wind = u.uWind.value;
    if (sp > 0.5) {
      const yaw = this.chassis.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
      wind.set(-(vx * c - vz * s) / sp, FLAME.windDrop, -(vx * s + vz * c) / sp).normalize();
    } else wind.set(0, FLAME.windDrop, -1).normalize();
    u.uBend.value = FLAME.bend * Math.min(1, sp / FLAME.bendSpeed);
  }

  /**
   * The pipes' own fire this frame (revFire's `f`): the rev palette, the mouth's flare and the soft light
   * round it glowing the heat's color (red to gold), each pipe's tongue flickering out of step, a pop's
   * flash and puff of fire; no shock ring, no wind arcs.
   */
  private revFlames(f: RevFire, k: FlameKart, t: number, reduced: boolean, u: JetUniforms): void {
    const R = REV_FIRE, pal = PALETTE.rev;
    if (this.palette !== pal) {
      this.palette = pal;
      u.uCore.value.setRGB(...pal.core); u.uInner.value.setRGB(...pal.inner); u.uBody.value.setRGB(...pal.body); u.uEdge.value.setRGB(...pal.edge);
    }
    const h = heatColor(f.heat, this.heat), glow = smooth01(R.glowFrom, 0.45, f.heat);
    // a flame at the mouth lights it a little hotter, whatever the heat (never white: the heat's own color leads)
    const hot = Math.min(1, f.len) * R.mouthHot;
    u.uHeart.value.setRGB(h[0] + hot * pal.core[0], h[1] + hot * pal.core[1], h[2] + hot * pal.core[2]);
    u.uMouth.value.setRGB(h[0] + hot * pal.mouth[0], h[1] + hot * pal.mouth[1], h[2] + hot * pal.mouth[2]);
    u.uFringe.value.setRGB(pal.fringe[0] * glow, pal.fringe[1] * glow, pal.fringe[2] * glow);
    u.uPop.value = f.puff;
    u.uFlash.value = f.flash;
    u.uRing.value = -1;
    u.uGain.value = FLAME.gain;
    u.uGlow.value = Math.max(glow, Math.min(1, f.len));
    // each pipe's tongue out of step (two wobbles each), none under reduced motion; short ones thin
    const size = 1 + (this.size - 1) * FLAME.sizeShare, full = R.len * size, p = this.phase, fl = reduced ? 0 : R.flicker;
    const w0 = Math.sin(t * 37 + p) * Math.sin(t * 23 + p * 0.5), w1 = Math.sin(t * 41 + 2.1 + p) * Math.sin(t * 29 + 1 + p * 0.5);
    const l0 = f.len * full * (1 + fl * w0), l1 = f.len * full * (1 + fl * w1);
    u.uLen.value.set(l0, l1);
    const wid = (l: number) => R.wid * size * (R.widShare + (1 - R.widShare) * Math.min(1, l / full));
    u.uWid.value.set(wid(l0), wid(l1));
    this.air(k, u);
    // standing, the hot gas curls up out of the pipe (a straight tongue pointing back at the chase camera is a blob)
    const still = 1 - Math.min(1, (k.speed ?? 0) / R.curlSpeed);
    if (still > 0) {
      const w = u.uWind.value;
      w.set(w.x * (1 - still), w.y + (R.curl[1] - w.y) * still, w.z + (R.curl[2] - w.z) * still).normalize();
      u.uBend.value += (R.curlBend - u.uBend.value) * still;
    }
  }
}

// The pure juice layer: trauma shake, camera FOV and roll offsets, sim-time scale (hit-stop,
// finish slow-motion) and the event → effect director. No Three.js; everything testable.
import { BASE } from '../kart-controller/constants.ts';
import type { BoostSource, KartEvent } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';

/** A boost's kind as the camera feels it: the three mini-turbo tiers (blue, orange, purple) and the other sources. */
export type PunchKind = 'mini' | 'super' | 'ultra' | 'trick' | 'pad' | 'item' | 'start' | 'slipstream';
/** A boost's punch: degrees of extra field of view and metres of camera pull-back at its peak, and its shake (trauma). */
export interface Punch { readonly fov: number; readonly back: number; readonly trauma: number }

export const JUICE = Object.freeze({
  traumaHit: 0.5, traumaLand: 0.2, traumaWall: 0.25, traumaBump: 0.12,
  /** the big item moments: a STRIKE burst or a Pogo slam, shaken by the player's own */
  traumaStrike: 0.45, traumaSlam: 0.35,
  /** a creature's stomp or slam shakes the camera this much at its feet, fading to nothing at quakeReach metres */
  traumaQuake: 0.55, quakeReach: 70,
  traumaDecay: 1.6,
  shakeMaxRot: (0.6 * Math.PI) / 180,
  shakeMaxMove: 0.35,
  shakeHz: 18,
  /**
   * Each boost's punch as it fires (plan §7.2; the critiques of 24 Sept 2026: "no FOV punch, no shake"):
   * the view widens and the camera falls back over fovBoostIn, then eases home over fovBoostOut, with a
   * short, low shake (shake = trauma², so 0.3 moves the lens 3 cm and rolls it 0.05°). A purple
   * mini-turbo or an item hits harder than a blue one or a slipstream. The peak keeps your kart about a
   * tenth of the screen wide at top speed (camera.test.ts).
   */
  punch: Object.freeze<Record<PunchKind, Punch>>({
    mini: { fov: 5, back: 0.3, trauma: 0.24 },
    super: { fov: 7.5, back: 0.45, trauma: 0.3 },
    ultra: { fov: 10, back: 0.6, trauma: 0.36 },
    trick: { fov: 6.5, back: 0.4, trauma: 0.28 },
    pad: { fov: 8.5, back: 0.55, trauma: 0.32 },
    item: { fov: 9.5, back: 0.6, trauma: 0.34 },
    start: { fov: 8, back: 0.5, trauma: 0.32 },
    slipstream: { fov: 3.5, back: 0.2, trauma: 0.14 },
  }),
  fovBoostIn: 0.1, fovBoostOut: 0.65,
  /** while a boost runs: this many degrees wider and metres further back at full strength (+40%), eased in and out (1/s) */
  holdFov: 4, holdBack: 0.3, holdIn: 5, holdOut: 2.5,
  /** a boost's hold fades out over its last this-many seconds */
  holdFade: 0.35,
  fovHit: -5, fovHitSeconds: 0.25,
  /** reduced motion keeps this share of every widening, narrowing and pull-back (and has no shake or roll) */
  reducedKick: 0.4,
  driftRoll: (3 * Math.PI) / 180,
  /** the drift roll eases in and out at this rate (1/s; a 3° snap read as a glitch), full from this speed (m/s) */
  rollEase: 5, rollFullSpeed: 12,
  hitStopSeconds: 0.075,
  slowMoScale: 0.3, slowMoSeconds: 1, slowMoEase: 0.4,
});

/** The punch for a boost that started from `source` and runs `seconds` (a drift's tier is told by its length, BASE.boostSeconds). */
export function punchFor(source: BoostSource, seconds: number): PunchKind | null {
  switch (source) {
    case 'drift': {
      const s = BASE.boostSeconds;
      return seconds >= (s[1] + s[2]) / 2 ? 'ultra' : seconds >= (s[0] + s[1]) / 2 ? 'super' : 'mini';
    }
    case 'none': return null;
    default: return source;
  }
}

/**
 * 0..1: how strongly a live boost is felt while it runs, by its strength (+40%, a pad or an item, is 1;
 * a +30% mini-turbo 0.75; a slipstream 0.3), fading out over its last JUICE.holdFade seconds.
 */
export function boostHold(remaining: number, multiplier: number): number {
  if (remaining <= 0) return 0;
  const strength = Math.max(0, Math.min(1, (multiplier - 1) / (BASE.maxBoostMultiplier - 1)));
  const k = Math.min(1, remaining / JUICE.holdFade);
  return strength * k * k * (3 - 2 * k);
}

// ---------------------------------------------------------------- trauma shake
/** Smooth value noise in [-1, 1], seeded per channel. */
function noise1(t: number, seed: number): number {
  const i = Math.floor(t), f = t - i;
  const h = (n: number) => { const x = Math.sin((n + seed * 101.3) * 127.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

export class Trauma {
  value = 0;
  add(x: number): void { this.value = Math.min(1, this.value + x); }
  update(dt: number): void { this.value = Math.max(0, this.value - JUICE.traumaDecay * dt); }
  /** Camera offsets at time `t` (seconds): [x, y, z] metres and roll radians. */
  shake(t: number, out: { x: number; y: number; z: number; roll: number }, enabled = true): typeof out {
    const s = enabled ? this.value * this.value : 0;
    const f = t * JUICE.shakeHz;
    out.x = JUICE.shakeMaxMove * s * noise1(f, 1);
    out.y = JUICE.shakeMaxMove * s * noise1(f, 2);
    out.z = JUICE.shakeMaxMove * s * 0.5 * noise1(f, 3);
    out.roll = JUICE.shakeMaxRot * s * noise1(f, 4);
    return out;
  }
}

// ---------------------------------------------------------------- camera kicks
/** The strongest punch's widening: `level()` is a punch's share of it. */
const PUNCH_TOP = Math.max(...Object.values(JUICE.punch).map((p) => p.fov));

export class CameraKick {
  private boostAt = -Infinity;
  private hitAt = -Infinity;
  private punch: Punch = JUICE.punch.pad;
  /** A boost of kind `kind` fired at time `t` (seconds). */
  boost(t: number, kind: PunchKind = 'pad'): void { this.boostAt = t; this.punch = JUICE.punch[kind]; }
  hit(t: number): void { this.hitAt = t; }
  reset(): void { this.boostAt = -Infinity; this.hitAt = -Infinity; }
  /** 0..1: the last punch's envelope at time `t`, up over fovBoostIn, eased back over fovBoostOut. */
  private envelope(t: number): number {
    const b = t - this.boostAt;
    if (b < 0) return 0;
    if (b < JUICE.fovBoostIn) return b / JUICE.fovBoostIn;
    if (b >= JUICE.fovBoostIn + JUICE.fovBoostOut) return 0;
    const k = (b - JUICE.fovBoostIn) / JUICE.fovBoostOut;
    return 1 - k * k * (3 - 2 * k);
  }
  /** Extra FOV degrees at time `t`: the punch wider, a hit narrower. */
  fov(t: number, reduced = false): number {
    let f = this.punch.fov * this.envelope(t);
    const h = t - this.hitAt;
    if (h >= 0 && h < JUICE.fovHitSeconds) f += JUICE.fovHit * (1 - h / JUICE.fovHitSeconds);
    return reduced ? f * JUICE.reducedKick : f;
  }
  /** Metres the camera falls back behind the kart at time `t` (the punch's pull-back). */
  back(t: number, reduced = false): number {
    const b = this.punch.back * this.envelope(t);
    return reduced ? b * JUICE.reducedKick : b;
  }
  /** 0..1: how hard the punch is at time `t` against the strongest there is (speed lines and the lens streaks scale by it). */
  level(t: number): number { return (this.punch.fov / PUNCH_TOP) * this.envelope(t); }
}

/** Camera roll for the player's drift: toward the drift side, zero when not drifting. */
export function driftRoll(active: boolean, direction: number, reduced = false): number {
  return active && !reduced ? -direction * JUICE.driftRoll : 0;
}

/** The drift roll as the camera does it: eased in and out, and less at a crawl. */
export class DriftRoll {
  value = 0;
  update(dt: number, active: boolean, direction: number, speed: number, reduced: boolean): number {
    const want = driftRoll(active, direction, reduced) * Math.min(1, Math.abs(speed) / JUICE.rollFullSpeed);
    this.value += (want - this.value) * (1 - Math.exp(-JUICE.rollEase * dt));
    return this.value;
  }
}

// ---------------------------------------------------------------- time scale
export class TimeScale {
  private stopUntil = -Infinity;
  private slowUntil = -Infinity;
  hitStop(now: number): void { this.stopUntil = Math.max(this.stopUntil, now + JUICE.hitStopSeconds); }
  slowMo(now: number): void { this.slowUntil = now + JUICE.slowMoSeconds; }
  reset(): void { this.stopUntil = -Infinity; this.slowUntil = -Infinity; }
  /** Multiplier on the real frame time fed to the fixed-step accumulator. */
  scale(now: number, reduced = false): number {
    if (reduced) return 1;
    if (now < this.stopUntil) return 0;
    if (now < this.slowUntil) {
      // the finish slow-mo eases back to full speed over its last slowMoEase seconds (a step read as a lurch under the finish camera's swing)
      const left = this.slowUntil - now;
      if (left >= JUICE.slowMoEase) return JUICE.slowMoScale;
      const k = 1 - left / JUICE.slowMoEase;
      return JUICE.slowMoScale + (1 - JUICE.slowMoScale) * k * k * (3 - 2 * k);
    }
    return 1;
  }
}

// ---------------------------------------------------------------- director
export type Burst = 'balloon' | 'coin' | 'hitStars' | 'confetti' | 'shield' | 'horn' | 'fog' | 'land' | 'wall' | 'strike' | 'slam' | 'spring' | 'fizz';

export interface Effects {
  /** `mine`: the player's own pickup (a balloon or coin pop), drawn at full size; a rival's is small */
  bursts: { kind: Burst; racerId: string; mine?: boolean }[];
  /** creature stomps and slams: dust at a world point, and a shake that fades with distance from the player */
  quakes: { position: [number, number, number]; strength: number }[];
  /** drift spark tier per racer that changed this tick (0 = sparks off) */
  sparks: { racerId: string; tier: number }[];
  boosts: { racerId: string; source: string }[];
  trauma: number;
  /** the player's boost fired this tick: its punch (null: none) */
  kickBoost: PunchKind | null;
  kickHit: boolean;
  hitStop: boolean;
  slowMo: boolean;
}

export function newEffects(): Effects {
  return { bursts: [], quakes: [], sparks: [], boosts: [], trauma: 0, kickBoost: null, kickHit: false, hitStop: false, slowMo: false };
}

/** The player's boost of kind `kind` fired: its punch and its shake (once a tick, whatever reported it). */
function punch(fx: Effects, kind: PunchKind | null): void {
  if (!kind || fx.kickBoost === kind) return;
  fx.kickBoost = kind;
  fx.trauma += JUICE.punch[kind].trauma;
}

function kart(fx: Effects, id: string, e: KartEvent, me: string | null): void {
  const mine = id === me;
  switch (e.type) {
    case 'driftTierUp': fx.sparks.push({ racerId: id, tier: e.tier }); break;
    case 'driftEnd': fx.sparks.push({ racerId: id, tier: 0 }); break;
    case 'boostStart':
      fx.boosts.push({ racerId: id, source: e.source });
      if (mine) punch(fx, punchFor(e.source, e.seconds));
      break;
    case 'landed':
      fx.bursts.push({ kind: 'land', racerId: id });
      if (mine) fx.trauma += JUICE.traumaLand;
      break;
    case 'wall': if (mine) { fx.trauma += JUICE.traumaWall; fx.bursts.push({ kind: 'wall', racerId: id }); } break;
    case 'bump': if (mine) fx.trauma += JUICE.traumaBump; break;
    case 'hit':
      fx.bursts.push({ kind: 'hitStars', racerId: id });
      if (mine) { fx.trauma += JUICE.traumaHit; fx.kickHit = true; fx.hitStop = true; }
      break;
    default: break;
  }
}

/** Every finish throws the confetti (the default when the game does not say). */
const ALWAYS = (): boolean => true;

/**
 * One tick of events → effects. `out` is reset and reused. `confettiFor`: whether the player's finish
 * in this place throws the confetti shower (the game's finish celebration: a win, a podium place, a
 * safe Knockout place; a lower place gets none, game/celebrate.ts).
 */
export function directFx(race: readonly RaceEvent[], items: readonly ItemEvent[], me: string | null, out: Effects = newEffects(), confettiFor: (rank: number) => boolean = ALWAYS): Effects {
  out.bursts.length = 0; out.quakes.length = 0; out.sparks.length = 0; out.boosts.length = 0;
  out.trauma = 0; out.kickBoost = null; out.kickHit = false; out.hitStop = false; out.slowMo = false;
  for (const e of race) {
    switch (e.type) {
      case 'kart': kart(out, e.racerId, e.event, me); break;
      case 'pickup': out.bursts.push({ kind: 'balloon', racerId: e.racerId, mine: e.racerId === me }); break;
      case 'creature':
        if ((e.kind === 'rumblesaur' && e.action === 'stomp') || (e.kind === 'kraken' && e.action === 'slam')) out.quakes.push({ position: [...e.position], strength: 1 });
        else if (e.kind === 'yeti' && e.action === 'idle') out.quakes.push({ position: [...e.position], strength: 0.3 });
        break;
      case 'coin': out.bursts.push({ kind: 'coin', racerId: e.racerId, mine: e.racerId === me }); break;
      case 'finish':
        if (e.racerId === me) { if (!e.dnf && confettiFor(e.rank)) out.bursts.push({ kind: 'confetti', racerId: e.racerId }); if (!e.dnf) out.slowMo = true; }
        break;
      // a bumper car's shove and a rockfall raise no kart event (a spin does, as a 'hit'): they
      // jolt the player like a wall
      case 'hazardHit':
        if (e.racerId === me && (e.hit === 'bump' || e.hit === 'slow')) { out.trauma += JUICE.traumaWall; out.bursts.push({ kind: 'wall', racerId: e.racerId }); }
        break;
      default: break;
    }
  }
  for (const e of items) {
    switch (e.type) {
      case 'hit':
        out.bursts.push({ kind: 'hitStars', racerId: e.racerId });
        if (e.racerId === me) { out.trauma += JUICE.traumaHit; out.kickHit = true; out.hitStop = true; }
        break;
      case 'shieldUp': case 'shieldPop': out.bursts.push({ kind: 'shield', racerId: e.racerId }); break;
      case 'horn': out.bursts.push({ kind: 'horn', racerId: e.racerId }); break;
      case 'fog': out.bursts.push({ kind: 'fog', racerId: e.racerId }); break;
      case 'burst':
        out.bursts.push({ kind: 'strike', racerId: e.racerId });
        if (e.racerId === me) out.trauma += JUICE.traumaStrike;
        break;
      case 'springSlam':
        out.bursts.push({ kind: 'slam', racerId: e.racerId });
        if (e.racerId === me) out.trauma += JUICE.traumaSlam;
        break;
      case 'springLaunch': out.bursts.push({ kind: 'spring', racerId: e.racerId }); break;
      case 'trailBlock': out.bursts.push({ kind: 'shield', racerId: e.racerId }); break;
      // an item's boost raises no kart event here (the items step keeps its kart events to itself),
      // so the player's Fizz Pop and a Grapple's slingshot punch from their item events
      case 'itemUsed':
        if (e.itemId === 'fizzPop' || e.itemId === 'tripleFizz') {
          out.bursts.push({ kind: 'fizz', racerId: e.racerId });
          if (e.racerId === me) punch(out, 'item');
        }
        break;
      case 'tetherEnd': if (e.slingshot && e.racerId === me) punch(out, 'item'); break;
      default: break;
    }
  }
  out.trauma = Math.min(1, out.trauma);
  return out;
}

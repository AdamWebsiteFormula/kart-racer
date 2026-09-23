// The pure juice layer: trauma shake, camera FOV and roll offsets, sim-time scale (hit-stop,
// finish slow-motion) and the event → effect director. No Three.js; everything testable.
import type { KartEvent } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';

export const JUICE = Object.freeze({
  traumaHit: 0.5, traumaLand: 0.2, traumaBoost: 0.15, traumaWall: 0.25, traumaBump: 0.12,
  /** the big item moments: a STRIKE burst or a Pogo slam, shaken by the player's own */
  traumaStrike: 0.45, traumaSlam: 0.35,
  /** a creature's stomp or slam shakes the camera this much at its feet, fading to nothing at quakeReach metres */
  traumaQuake: 0.55, quakeReach: 70,
  traumaDecay: 1.6,
  shakeMaxRot: (0.6 * Math.PI) / 180,
  shakeMaxMove: 0.35,
  shakeHz: 18,
  fovBoost: 12, fovBoostIn: 0.12, fovBoostOut: 0.6,
  fovHit: -5, fovHitSeconds: 0.25,
  driftRoll: (3 * Math.PI) / 180,
  hitStopSeconds: 0.075,
  slowMoScale: 0.3, slowMoSeconds: 1,
});

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
export class CameraKick {
  private boostAt = -Infinity;
  private hitAt = -Infinity;
  boost(t: number): void { this.boostAt = t; }
  hit(t: number): void { this.hitAt = t; }
  reset(): void { this.boostAt = -Infinity; this.hitAt = -Infinity; }
  /** Extra FOV degrees at time `t`. */
  fov(t: number, reduced = false): number {
    let f = 0;
    const b = t - this.boostAt;
    if (b >= 0 && b < JUICE.fovBoostIn) f += JUICE.fovBoost * (b / JUICE.fovBoostIn);
    else if (b >= JUICE.fovBoostIn && b < JUICE.fovBoostIn + JUICE.fovBoostOut) {
      const k = (b - JUICE.fovBoostIn) / JUICE.fovBoostOut;
      f += JUICE.fovBoost * (1 - k * k * (3 - 2 * k));
    }
    const h = t - this.hitAt;
    if (h >= 0 && h < JUICE.fovHitSeconds) f += JUICE.fovHit * (1 - h / JUICE.fovHitSeconds);
    return reduced ? f * 0.5 : f;
  }
}

/** Camera roll for the player's drift: toward the drift side, zero when not drifting. */
export function driftRoll(active: boolean, direction: number, reduced = false): number {
  return active && !reduced ? -direction * JUICE.driftRoll : 0;
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
    if (now < this.slowUntil) return JUICE.slowMoScale;
    return 1;
  }
}

// ---------------------------------------------------------------- director
export type Burst = 'balloon' | 'coin' | 'hitStars' | 'confetti' | 'shield' | 'horn' | 'fog' | 'land' | 'wall' | 'strike' | 'slam' | 'spring' | 'fizz';

export interface Effects {
  bursts: { kind: Burst; racerId: string }[];
  /** creature stomps and slams: dust at a world point, and a shake that fades with distance from the player */
  quakes: { position: [number, number, number]; strength: number }[];
  /** drift spark tier per racer that changed this tick (0 = sparks off) */
  sparks: { racerId: string; tier: number }[];
  boosts: { racerId: string; source: string }[];
  trauma: number;
  kickBoost: boolean;
  kickHit: boolean;
  hitStop: boolean;
  slowMo: boolean;
}

export function newEffects(): Effects {
  return { bursts: [], quakes: [], sparks: [], boosts: [], trauma: 0, kickBoost: false, kickHit: false, hitStop: false, slowMo: false };
}

function kart(fx: Effects, id: string, e: KartEvent, me: string | null): void {
  const mine = id === me;
  switch (e.type) {
    case 'driftTierUp': fx.sparks.push({ racerId: id, tier: e.tier }); break;
    case 'driftEnd': fx.sparks.push({ racerId: id, tier: 0 }); break;
    case 'boostStart':
      fx.boosts.push({ racerId: id, source: e.source });
      if (mine) { fx.trauma += JUICE.traumaBoost; fx.kickBoost = true; }
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

/** One tick of events → effects. `out` is reset and reused. */
export function directFx(race: readonly RaceEvent[], items: readonly ItemEvent[], me: string | null, out: Effects = newEffects()): Effects {
  out.bursts.length = 0; out.quakes.length = 0; out.sparks.length = 0; out.boosts.length = 0;
  out.trauma = 0; out.kickBoost = false; out.kickHit = false; out.hitStop = false; out.slowMo = false;
  for (const e of race) {
    switch (e.type) {
      case 'kart': kart(out, e.racerId, e.event, me); break;
      case 'pickup': out.bursts.push({ kind: 'balloon', racerId: e.racerId }); break;
      case 'creature':
        if ((e.kind === 'rumblesaur' && e.action === 'stomp') || (e.kind === 'kraken' && e.action === 'slam')) out.quakes.push({ position: [...e.position], strength: 1 });
        else if (e.kind === 'yeti' && e.action === 'idle') out.quakes.push({ position: [...e.position], strength: 0.3 });
        break;
      case 'coin': out.bursts.push({ kind: 'coin', racerId: e.racerId }); break;
      case 'finish':
        if (e.racerId === me) { out.bursts.push({ kind: 'confetti', racerId: e.racerId }); if (!e.dnf) out.slowMo = true; }
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
      case 'itemUsed':
        if (e.itemId === 'fizzPop' || e.itemId === 'tripleFizz') out.bursts.push({ kind: 'fizz', racerId: e.racerId });
        break;
      default: break;
    }
  }
  out.trauma = Math.min(1, out.trauma);
  return out;
}

/** Spark colour per drift tier (research §7.2: blue → orange → rainbow). `t` cycles the rainbow. */
export function sparkColour(tier: number, t: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (tier <= 1) { out[0] = 0.3; out[1] = 0.75; out[2] = 1.6; return out; }
  if (tier === 2) { out[0] = 1.8; out[1] = 0.8; out[2] = 0.2; return out; }
  const h = (t * 3) % 1;
  const k = (n: number) => { const x = (n + h * 6) % 6; return Math.max(0, Math.min(1, Math.abs(x - 3) - 1)); };
  out[0] = k(5) * 1.8; out[1] = k(3) * 1.8; out[2] = k(1) * 1.8;
  return out;
}

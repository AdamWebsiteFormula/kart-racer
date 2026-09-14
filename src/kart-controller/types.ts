// Kart controller types. Mirrors docs/schemas/race-state.schema.json karts[i]
// plus a few private fields the state machine needs. No Three.js in here.

export type Surface = 'road' | 'dirt' | 'mud' | 'ice' | 'boost' | 'rail';
export type Archetype = 'light' | 'medium' | 'heavy';
export type SpeedClass = 50 | 100 | 150;
export type Vec3 = [number, number, number];

/** One tick of player or AI input. Matches race-state inputLog entries. */
export interface InputState {
  steer: number; // -1..1, positive = right
  throttle: number; // 0..1
  brake: number; // 0..1
  drift: boolean; // hop/drift button held; pressed while airborne from a jump = trick
  item: boolean;
  lookBack: boolean;
  horn: boolean;
}

export const NEUTRAL_INPUT: Readonly<InputState> = Object.freeze({
  steer: 0, throttle: 0, brake: 0, drift: false, item: false, lookBack: false, horn: false,
});

export type BoostSource = 'none' | 'drift' | 'trick' | 'pad' | 'item' | 'slipstream' | 'start';
export type DriftPhase = 'idle' | 'hopping' | 'drifting';

export interface KartState {
  racerId: string;
  isPlayer: boolean;
  isGhost: boolean;
  bodyId?: string;
  skinId?: string;
  position: Vec3; // world metres, Y up
  heading: number; // radians; forward = (sin h, 0, cos h)
  speed: number; // m/s along heading (negative = reverse)
  lateralVelocity: number; // m/s to the kart's right
  verticalVelocity: number; // m/s up
  grounded: boolean;
  surface: Surface;
  t: number; // spline fraction 0..1
  lap: number;
  checkpointsHit: number;
  distanceAlong: number;
  slipstreamSeconds: number;
  drift: {
    active: boolean;
    phase: DriftPhase;
    direction: number; // -1 | 0 | 1
    charge: number;
    tier: number;
    hopSeconds: number; // time since the hop started
    chargeMultiplier: number;
    chargeMultiplierRemaining: number;
  };
  airborne: {
    fromJumpId?: string;
    trickQueued: boolean;
    seconds: number;
  };
  boost: { source: BoostSource; remaining: number; multiplier: number };
  item: { held: string; charges: number; rouletteRemaining: number };
  status: {
    spinRemaining: number;
    shield: boolean;
    slowedTo: number;
    slowRemaining: number;
    intangibleRemaining: number;
  };
  coins: number;
  rank: number;
  finishTick?: number;
  // private to the controller
  prevDrift: boolean; // last tick's drift button, for edge detection
  wallCooldown: number;
  bumpCooldown: number;
}

export interface KartInit {
  racerId: string;
  isPlayer?: boolean;
  isGhost?: boolean;
  position?: Vec3;
  heading?: number;
  t?: number;
  coins?: number;
}

export function createKartState(init: KartInit): KartState {
  return {
    racerId: init.racerId,
    isPlayer: init.isPlayer ?? false,
    isGhost: init.isGhost ?? false,
    position: init.position ? [...init.position] : [0, 0, 0],
    heading: init.heading ?? 0,
    speed: 0,
    lateralVelocity: 0,
    verticalVelocity: 0,
    grounded: true,
    surface: 'road',
    t: init.t ?? 0,
    lap: 0,
    checkpointsHit: 0,
    distanceAlong: 0,
    slipstreamSeconds: 0,
    drift: { active: false, phase: 'idle', direction: 0, charge: 0, tier: 0, hopSeconds: 0, chargeMultiplier: 1, chargeMultiplierRemaining: 0 },
    airborne: { trickQueued: false, seconds: 0 },
    boost: { source: 'none', remaining: 0, multiplier: 1 },
    item: { held: 'none', charges: 0, rouletteRemaining: 0 },
    status: { spinRemaining: 0, shield: false, slowedTo: 1, slowRemaining: 0, intangibleRemaining: 0 },
    coins: init.coins ?? 0,
    rank: 0,
    prevDrift: false,
    wallCooldown: 0,
    bumpCooldown: 0,
  };
}

/** What the track gives back for one spline fraction and lateral offset. */
export interface TrackSample {
  position: Vec3; // centreline point moved `lateral` metres to the right
  tangent: Vec3; // unit, direction of travel
  normal: Vec3; // unit, ground normal
  groundY: number;
  halfWidth: number;
  surface: Surface;
  gripScale: number;
}

export interface TrackJump { id: string; t: number; launch: number /* m/s up */ }
export interface TrackBoostPad { t: number; lateral: number; halfWidth: number }

/** Implemented by track-builder later. Tests use the flat oval stub. */
export interface TrackQuery {
  readonly length: number; // metres
  readonly jumps: readonly TrackJump[];
  readonly boostPads: readonly TrackBoostPad[];
  readonly voidY: number;
  sample(t: number, lateral: number): TrackSample;
  /** Local search only: nearest t within ±window of hintT. */
  nearestT(position: Vec3, hintT: number, window: number): number;
}

export type HitKind = 'item' | 'hazard' | 'projectile';

export type KartEvent =
  | { type: 'hop' }
  | { type: 'driftStart'; direction: number }
  | { type: 'driftTierUp'; tier: number }
  | { type: 'driftEnd'; tier: number }
  | { type: 'boostStart'; source: BoostSource; multiplier: number; seconds: number }
  | { type: 'landed'; fromJumpId?: string; trick: boolean }
  | { type: 'launched'; jumpId: string }
  | { type: 'wall' }
  | { type: 'bump'; otherId: string }
  | { type: 'hit'; kind: HitKind; spun: boolean; coinsLost: number }
  | { type: 'respawn' };

export interface StepOptions {
  /** Caps the drift tier (Smart Steer later). */
  maxDriftTier?: number;
}

/** Forward unit vector for a heading. */
export function forwardOf(heading: number): Vec3 {
  return [Math.sin(heading), 0, Math.cos(heading)];
}
/** Right unit vector for a heading (up × forward). */
export function rightOf(heading: number): Vec3 {
  return [Math.cos(heading), 0, -Math.sin(heading)];
}
export function headingOf(tangent: Vec3): number {
  return Math.atan2(tangent[0], tangent[2]);
}

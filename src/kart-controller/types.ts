// Kart controller types. Mirrors docs/schemas/race-state.schema.json karts[i]
// plus a few private fields the state machine needs. No Three.js in here.
import * as dmath from '../sim-math/dmath.ts';

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
  /** the kart it drives (karts.ts; set by the race manager from its constants). Looks only: the handling is in KartConstants */
  kartId?: string;
  bodyId?: string;
  skinId?: string;
  position: Vec3; // world metres, Y up
  heading: number; // radians; forward = (sin h, 0, cos h)
  speed: number; // m/s along heading (negative = reverse)
  lateralVelocity: number; // m/s to the kart's right
  verticalVelocity: number; // m/s up
  grounded: boolean;
  surface: Surface;
  t: number; // spline fraction 0..1, always main-equivalent progress
  branch: number; // 0 = main spline, i = shortcuts[i-1]
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
    /** 0..1 lagged stick toward the drift side: the drift's current turn value (MKW reactivity) */
    yawK: number;
    chargeMultiplier: number;
    chargeMultiplierRemaining: number;
  };
  airborne: {
    fromJumpId?: string;
    trickQueued: boolean;
    seconds: number;
  };
  boost: { source: BoostSource; remaining: number; multiplier: number };
  /** two slots (design §8): held is used first; next moves up when held runs out */
  item: { held: string; charges: number; rouletteRemaining: number; next: string; nextCharges: number; nextRouletteRemaining: number };
  status: {
    spinRemaining: number;
    shield: boolean;
    slowedTo: number;
    slowRemaining: number;
    intangibleRemaining: number;
    /** Strike Ball: seconds left rolling on autopilot */
    rideRemaining: number;
    /** Grapple Anchor: seconds left reeling toward karts[towTarget] (-1 = none) */
    towRemaining: number;
    towTarget: number;
    /** went over an open edge: no road can catch it now, only the claw (race-manager rescue) */
    falling: boolean;
    /** the road height it fell from */
    fallFromY: number;
    /** held by the race manager (the claw rescue): no physics, no events, until it lets go */
    held: boolean;
    /** being eased back inside a wall's line from far outside it (collide.ts) */
    wallEasing: boolean;
    /** riding track.loops[loopIndex] (-1 = not): metres along the ride, the lateral it was caught at, its speed, its angle round the ring */
    loopIndex: number;
    loopS: number;
    /** metres into the run-in where it was caught (0 = at the catch line) */
    loopS0: number;
    loopLat0: number;
    loopSpeed: number;
    loopAngle: number;
  };
  coins: number;
  rank: number;
  finishTick?: number;
  // private to the controller
  prevDrift: boolean; // last tick's drift button, for edge detection
  wallCooldown: number;
  bumpCooldown: number;
  gripScale: number; // from the last track sample; the steer step runs before ground
  /** a boost refused (or displaced) by the live one: it starts when the live one ends (boost.ts) */
  boostQueue: { source: BoostSource; remaining: number; multiplier: number };
  /** seconds left in which the last drift press still counts as a trick at a ramp's launch */
  trickBuffer: number;
  /** ground normal under the kart at its last grounded tick, ramps included; render-only (the view tilts to it) */
  groundNormal: Vec3;
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
    branch: 0,
    lap: 0,
    checkpointsHit: 0,
    distanceAlong: 0,
    slipstreamSeconds: 0,
    drift: { active: false, phase: 'idle', direction: 0, charge: 0, tier: 0, hopSeconds: 0, yawK: 0, chargeMultiplier: 1, chargeMultiplierRemaining: 0 },
    airborne: { trickQueued: false, seconds: 0 },
    boost: { source: 'none', remaining: 0, multiplier: 1 },
    item: { held: 'none', charges: 0, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0 },
    status: {
      spinRemaining: 0, shield: false, slowedTo: 1, slowRemaining: 0, intangibleRemaining: 0,
      rideRemaining: 0, towRemaining: 0, towTarget: -1, falling: false, fallFromY: 0,
      held: false, wallEasing: false, loopIndex: -1, loopS: 0, loopS0: 0, loopLat0: 0, loopSpeed: 0, loopAngle: 0,
    },
    coins: init.coins ?? 0,
    rank: 0,
    prevDrift: false,
    wallCooldown: 0,
    bumpCooldown: 0,
    gripScale: 1,
    boostQueue: { source: 'none', remaining: 0, multiplier: 1 },
    trickBuffer: 0,
    groundNormal: [0, 1, 0],
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
  /** open edges here (no wall): bit 1 the left side (negative lateral), bit 2 the right; absent = walled */
  open?: number;
  /** past an open edge's cliff: no ground under this point, the kart falls */
  overCliff?: boolean;
  /** lateral distance of the boundary wall from the centre line: past the off-road band on an off-road track, else the road's edge (absent = halfWidth) */
  wall?: number;
}

/** t is main-equivalent; branch 0 unless the feature sits on a shortcut. */
/** A loop-the-loop: its foot at main-line t; caught `approach` m before, set down `exit` m after. */
export interface TrackLoop {
  id: string; t: number; radius: number;
  /** metres the ring moves right as it turns (way in left of centre, way out right) */
  shift: number;
  /** metres either side of its lane a kart rides, by where it came from */
  spread: number;
  approach: number; exit: number;
  /** width of the ring's track, metres */
  width: number;
}

export interface TrackJump {
  id: string; t: number; launch: number /* m/s up */; branch?: number;
  /** ramp: a wedge rising `rise` m over `run` m to its lip at t; hump: a mound `run` m long whose crest (`rise` m) is at t. No rise = a flat launch line. */
  shape?: 'ramp' | 'hump'; run?: number; rise?: number;
  /** a bump rounds off to the road over this many metres at each kerb */
  edge?: number;
  /** a ramp on an off-road track: its sides slope down to the sand over this many metres past the kerb */
  skirt?: number;
}
export interface TrackBoostPad { t: number; lateral: number; halfWidth: number; branch?: number }

export interface TrackHint { t: number; branch: number }

/** Implemented by track-builder. Tests use the flat oval stub. */
export interface TrackQuery {
  readonly length: number; // metres
  readonly jumps: readonly TrackJump[];
  /** loop-the-loops on the main line (absent = none) */
  readonly loops?: readonly TrackLoop[];
  readonly boostPads: readonly TrackBoostPad[];
  readonly voidY: number;
  /** Ground at main-equivalent t on `branch` (default 0), `lateral` metres to the right. */
  sample(t: number, lateral: number, branch?: number): TrackSample;
  /** Same as sample(), written into `out` (allocation-free). track-builder's Track always has it; render-only per-wheel suspension (kart-controller view.ts, art-pipeline rigged.ts) uses it when present and falls back to sample() otherwise. */
  sampleInto?(t: number, lateral: number, branch: number, out: TrackSample): TrackSample;
  /** Local search only: nearest t within ±window of hintT on the main line. */
  nearestT(position: Vec3, hintT: number, window: number): number;
  /** Local search across the current branch and any open branch in the window. */
  nearest(position: Vec3, hint: TrackHint, window: number): TrackHint;
}

export type HitKind = 'item' | 'hazard' | 'projectile';

export type KartEvent =
  | { type: 'hop' }
  | { type: 'driftStart'; direction: number }
  | { type: 'driftTierUp'; tier: number }
  | { type: 'driftEnd'; tier: number }
  | { type: 'boostStart'; source: BoostSource; multiplier: number; seconds: number }
  | { type: 'landed'; fromJumpId?: string; trick: boolean }
  /** a trick done in the air off a jump (its boost fires on landing) */
  | { type: 'trick' }
  | { type: 'launched'; jumpId: string }
  | { type: 'wall' }
  | { type: 'bump'; otherId: string }
  | { type: 'hit'; kind: HitKind; spun: boolean; coinsLost: number }
  | { type: 'respawn' }
  | { type: 'loop'; phase: 'start' | 'end' };

export interface StepOptions {
  /** Caps the drift tier (Smart Steer later). */
  maxDriftTier?: number;
}

/** Forward unit vector for a heading. */
export function forwardOf(heading: number): Vec3 {
  return [dmath.sin(heading), 0, dmath.cos(heading)];
}
/** Right unit vector for a heading (up × forward). */
export function rightOf(heading: number): Vec3 {
  return [dmath.cos(heading), 0, -dmath.sin(heading)];
}
export function headingOf(tangent: Vec3): number {
  return dmath.atan2(tangent[0], tangent[2]);
}

// Track-builder types. TrackDefinition mirrors docs/schemas/track.schema.json.
// No Three.js in here; the scene layer lives under mesh/.
import type { Surface, Vec3 } from '../kart-controller/types.ts';

export type { Surface, Vec3 };

export type Biome = 'harbour' | 'meadow' | 'canyon' | 'frost' | 'boardwalk' | 'skyline' | 'temple' | 'foundry';
export type Cup = 'sunrise' | 'summit';
export type ShiftKind = 'flood' | 'storm' | 'collapse' | 'blizzard' | 'fireworks' | 'sunset' | 'rise' | 'reverse';
export type HazardKind = 'rolling' | 'crossing' | 'falling' | 'static' | 'gust' | 'creature' | 'vent';
/** The course creatures (design §6): one per track. */
export type CreatureKind = 'rumblesaur' | 'yeti' | 'kraken' | 'crab' | 'goose' | 'whale';
export type HazardHit = 'spin' | 'slow' | 'bump' | 'launch';
export type ShortcutRisk = 'jump' | 'narrow' | 'hazard';
/** verge: an off-road track's ground cover on the drivable land inside the course limit (visual only) */
export type DecorBand = 'roadside' | 'verge' | 'far' | 'sky';
export type GroundKind = 'plane' | 'water' | 'none';

/** One authored control point. halfWidth and surface run from this point to the next. */
export interface ControlPoint {
  x: number;
  y: number;
  z: number;
  halfWidth: number;
  /** Roll in degrees; positive lifts the left edge (outer edge of a right turn). */
  bank?: number;
  surface?: Surface;
}

export interface ShortcutDef {
  id: string;
  entryT: number;
  exitT: number;
  controlPoints: ControlPoint[];
  risk: ShortcutRisk;
  openOnLaps?: number[];
  /** the stretch (fractions of the shortcut) through a mine: walls, a roof, a mesa over it */
  tunnel?: { from: number; to: number };
}

export interface HazardDef {
  id?: string;
  type: HazardKind;
  t: number;
  lateral?: number;
  period?: number;
  speed?: number;
  hit?: HazardHit;
  asset?: string;
  /** type 'creature': which one */
  creature?: CreatureKind;
  /** type 'vent': seconds into its cycle at race time 0 (vents side by side take turns) */
  offset?: number;
  /** type 'vent': m/s up it throws a kart */
  launch?: number;
}

/** `shortcut` names the branch a feature sits on; t stays main-equivalent. */
export type JumpShape = 'ramp' | 'hump';
export interface JumpDef {
  id: string; t: number; lateral?: number; width?: number; launch: number; shortcut?: string;
  /** a ramp (wedge up to a lip at t) or a trick bump (crest at t); default ramp */
  shape?: JumpShape;
  /** metres the ramp rises over, or the bump spans */
  run?: number;
  /** metres the lip or crest stands above the road */
  rise?: number;
}
export interface PickupDef { t: number; lateral?: number; shortcut?: string; /** a gold double balloon: both item slots at once */ double?: boolean }
export interface BoostPadDef { t: number; lateral?: number; width?: number; shortcut?: string }

export interface RouteOverride { fromT: number; toT: number; controlPoints: ControlPoint[] }
export interface SurfaceOverride { fromT: number; toT: number; surface: Surface }

export interface FinalLapShiftDef {
  kind: ShiftKind;
  label: string;
  closesShortcuts?: string[];
  opensShortcuts?: string[];
  routeOverrides?: RouteOverride[];
  surfaceOverrides?: SurfaceOverride[];
  gripMultiplier?: number;
  addsJumps?: JumpDef[];
  enablesHazards?: string[];
  disablesHazards?: string[];
  sky?: string;
  lut?: string;
  fogDensity?: number;
  musicVariant?: string;
}

/**
 * One kind of scenery and where it goes. Scatter (the default) lays little groups with open ground
 * between; `row` lays runs of pieces `every` metres apart along the road, turned along it with local +X
 * pointing away from the road (fences, lamp posts, corner signs, a ski lift, cliff walls); `span` stands
 * one piece across the road, its legs past the course limit (bunting, a rock arch). `at` keeps group
 * centres inside a stretch of the lap (t0 > t1 wraps past the line); `side` picks the side (default: the
 * outside of corners, favoured); `dist` overrides the band's distances; `scale` the random scale range.
 * `merge`: a code-built model baked into the track's merged dressing chunks (one draw per chunk for
 * every merged kind) instead of an instancer of its own.
 */
export interface DecorEntry {
  asset: string;
  instances: number;
  band: DecorBand;
  footing?: 'pier';
  /** metres above its band's ground (a model centred on its middle, like a hazard's, sits on the ground with lift = its radius) */
  lift?: number;
  layout?: 'scatter' | 'row' | 'span';
  /** row: metres between pieces along the road */
  every?: number;
  /** row: pieces per run (default 6) */
  run?: number;
  at?: [number, number];
  side?: 'left' | 'right' | 'outside' | 'inside';
  dist?: [number, number];
  scale?: [number, number];
  merge?: boolean;
}

export interface EnvironmentDef {
  sky?: string;
  lut?: string;
  fogColor?: string;
  fogDensity?: number;
  ground?: { kind: GroundKind; y?: number };
  sunDirection?: [number, number, number];
  palette?: { background?: string; accent?: string };
  /** scenery, kind by kind (DecorEntry) */
  decor?: DecorEntry[];
  /** the landmark stands on a wooden pier (a sea track) */
  landmarkFooting?: 'pier';
}

export interface TrackDefinition {
  id: string;
  name: string;
  biome: Biome;
  cup: Cup;
  orderInCup?: number;
  laps: number;
  targetLapSeconds?: number;
  medalTimesMs: { gold: number; silver: number; bronze: number };
  voidY: number;
  controlPoints: ControlPoint[];
  checkpointCount: number;
  startGrid: { t: number; rows: number; columns: number; spacing: number };
  shortcuts?: ShortcutDef[];
  hazards?: HazardDef[];
  jumps?: JumpDef[];
  pickups?: PickupDef[];
  coins?: PickupDef[];
  boostPads?: BoostPadDef[];
  finalLapShift: FinalLapShiftDef;
  /** off-road past the curb to a real boundary wall (Adam, 23 Sept 2026: the Mario Kart way); absent = a wall at the road's edge */
  offroad?: boolean;
  /** loop-the-loops on the main line: every kart rides up and round (design.md Track thrills) */
  loops?: { id: string; t: number; radius?: number }[];
  /** stretches of the main line with no wall on one or both sides: drive off and fall (the claw brings you back) */
  openEdges?: { fromT: number; toT: number; side: 'left' | 'right' | 'both' }[];
  environment?: EnvironmentDef;
  music?: string;
  landmark?: string;
}

// ---- built objects (sim layer) ----

export interface Checkpoint { index: number; t: number; position: Vec3; tangent: Vec3; halfWidth: number }
export interface SpawnSlot { index: number; t: number; lateral: number; position: Vec3; heading: number }

export type FeatureKind = 'pickup' | 'coin' | 'boostPad' | 'jump';
/** Authored in t + lateral, stored in world. t is re-derived from `position` after a rebuild. */
export interface BakedFeature {
  id: string;
  kind: FeatureKind;
  branch: number;
  t: number;
  lateral: number;
  position: Vec3;
  /** full width across the road, metres (pads, jumps) */
  width: number;
  /** vertical launch m/s (jumps) */
  launch: number;
  /** a gold double balloon (pickups) */
  double?: boolean;
  /** jumps: ramp or trick bump, and its size (metres) */
  shape?: JumpShape;
  run?: number;
  rise?: number;
  /** bumps: metres over which it rounds off to the road at each kerb */
  edge?: number;
}

export interface ActiveHazard {
  id: string;
  type: HazardKind;
  position: Vec3;
  radius: number;
  hit: HazardHit;
  /** m/s² sideways, gusts only */
  push?: Vec3;
  /** a shock wave along the ground: a kart in the air (a hop) passes over it */
  ground?: boolean;
  /** hit 'launch' (an erupting vent): m/s up */
  launch?: number;
}

/** Fired once by applyFinalLapShift for art, audio, HUD and the scene layer. */
export interface TrackChanged {
  kind: ShiftKind;
  label: string;
  sky?: string;
  lut?: string;
  fogDensity?: number;
  musicVariant?: string;
  length: number;
  /** main-line t ranges whose geometry or surface changed */
  changedRanges: [number, number][];
}

/** Surface ids stored in the LUT; index into this list. */
export const SURFACES: readonly Surface[] = Object.freeze(['road', 'dirt', 'mud', 'ice', 'boost', 'rail']);

export function surfaceId(s: Surface | undefined): number {
  const i = SURFACES.indexOf(s ?? 'road');
  return i < 0 ? 0 : i;
}

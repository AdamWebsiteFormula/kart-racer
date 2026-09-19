// Track-builder types. TrackDefinition mirrors docs/schemas/track.schema.json.
// No Three.js in here; the scene layer lives under mesh/.
import type { Surface, Vec3 } from '../kart-controller/types.ts';

export type { Surface, Vec3 };

export type Biome = 'harbour' | 'meadow' | 'canyon' | 'frost' | 'boardwalk' | 'skyline' | 'temple' | 'foundry';
export type Cup = 'sunrise' | 'summit';
export type ShiftKind = 'flood' | 'storm' | 'collapse' | 'blizzard' | 'fireworks' | 'sunset' | 'rise' | 'reverse';
export type HazardKind = 'rolling' | 'crossing' | 'falling' | 'static' | 'gust';
export type HazardHit = 'spin' | 'slow' | 'bump';
export type ShortcutRisk = 'jump' | 'narrow' | 'hazard';
export type DecorBand = 'roadside' | 'far' | 'sky';
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
}

export interface JumpDef { id: string; t: number; lateral?: number; width?: number; launch: number }
export interface PickupDef { t: number; lateral?: number }
export interface BoostPadDef { t: number; lateral?: number; width?: number }

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

export interface EnvironmentDef {
  sky?: string;
  lut?: string;
  fogColor?: string;
  fogDensity?: number;
  ground?: { kind: GroundKind; y?: number };
  sunDirection?: [number, number, number];
  palette?: { background?: string; accent?: string };
  decor?: { asset: string; instances: number; band: DecorBand }[];
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
  environment?: EnvironmentDef;
  music?: string;
  landmark?: string;
}

/** Surface ids stored in the LUT; index into this list. */
export const SURFACES: readonly Surface[] = Object.freeze(['road', 'dirt', 'mud', 'ice', 'boost', 'rail']);

export function surfaceId(s: Surface | undefined): number {
  const i = SURFACES.indexOf(s ?? 'road');
  return i < 0 ? 0 : i;
}

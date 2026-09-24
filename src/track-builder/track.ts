// buildTrack(def) → Track. The sim-layer object every race system reads.
// Implements the kart-controller's TrackQuery. No Three.js in here.
import { BUILDER } from './constants.ts';
import type { TrackBoostPad, TrackHint, TrackJump, TrackLoop, TrackQuery, TrackSample } from '../kart-controller/types.ts';
import { Branch, Branches, buildBranch } from './branches.ts';
import { bakeFeatures, boostPadView, jumpView } from './features.ts';
import { Hazards } from './hazards.ts';
import { buildLut, wrap01 } from './lut.ts';
import { buildMinimap, type Minimap } from './minimap.ts';
import { buildCheckpoints, buildSpawnGrid } from './race.ts';
import { applyFinalLapShift, type ShiftKart } from './shift.ts';
import { RoadIndex, groundPlaneY } from './terrain.ts';
import type { BakedFeature, Checkpoint, ControlPoint, SpawnSlot, TrackChanged, TrackDefinition, Vec3 } from './types.ts';
import { assertValid } from './validate.ts';

export type TrackListener = (e: TrackChanged) => void;

export class Track implements TrackQuery {
  readonly def: TrackDefinition;
  readonly voidY: number;
  readonly branches: Branches;
  /** live main-line control points (route overrides replace them) */
  controlPoints: ControlPoint[];
  /** start line, re-derived from startPoint after a rebuild */
  startT: number;
  readonly startPoint: Vec3;
  features: BakedFeature[];
  readonly hazards: Hazards;
  checkpoints: Checkpoint[] = [];
  spawnGrid: SpawnSlot[] = [];
  minimap!: Minimap;
  jumps: readonly TrackJump[] = [];
  loops: readonly TrackLoop[] = [];
  boostPads: readonly TrackBoostPad[] = [];
  shifted = false;
  /** open edges and loops as laid now: t re-derived from world points after a route change; dropped if their road was replaced */
  openEdges: { fromT: number; toT: number; side: 'left' | 'right' | 'both'; fromPoint: Vec3; toPoint: Vec3 }[];
  loopFeet: { id: string; t: number; radius?: number; point: Vec3 }[];
  /** the ground plane's height (terrain.ts): the scene draws it there, the off-road never sinks below it */
  readonly groundPlaneY: number;
  /** an off-road track's land beside the road (terrain.ts), as drawn and as driven; null otherwise */
  readonly land: RoadIndex | null;
  private readonly listeners: TrackListener[] = [];

  constructor(def: TrackDefinition) {
    this.def = def;
    this.voidY = def.voidY;
    this.controlPoints = def.controlPoints.map((p) => ({ ...p }));
    const mainLut = buildLut(this.controlPoints);
    const main = new Branch(0, 'main', mainLut, 0, 1, []);
    const list = [main];
    (def.shortcuts ?? []).forEach((sc, i) => list.push(buildBranch(i + 1, sc, mainLut)));
    this.branches = new Branches(list);
    this.groundPlaneY = groundPlaneY(def, mainLut);
    this.land = def.offroad === true ? new RoadIndex(list.map((b) => b.lut)) : null;
    this.startT = wrap01(def.startGrid.t);
    this.startPoint = mainLut.sample(this.startT, 0).position;
    this.openEdges = (def.openEdges ?? []).map((e) => ({ ...e, fromPoint: mainLut.sample(e.fromT, 0).position, toPoint: mainLut.sample(e.toT, 0).position }));
    this.loopFeet = (def.loops ?? []).map((l) => ({ ...l, point: mainLut.sample(l.t, 0).position }));
    this.features = bakeFeatures(def, this.branches);
    this.hazards = new Hazards(def.hazards ?? [], this.branches);
    this.branches.setLap(1);
    this.rebuildDerived();
  }

  get length(): number { return this.branches.main.lut.length; }
  get id(): string { return this.def.id; }

  // ---- TrackQuery ----
  sample(t: number, lateral: number, branch = 0): TrackSample {
    return this.branches.sample(t, lateral, branch);
  }
  /** Allocation-free sample(): fills and returns `out`. Hot paths (kart, AI) should use this. */
  sampleInto(t: number, lateral: number, branch: number, out: TrackSample): TrackSample {
    return this.branches.sampleInto(t, lateral, branch, out);
  }
  nearestT(position: Vec3, hintT: number, window: number): number {
    return this.branches.main.lut.nearestT(position, hintT, window);
  }
  nearest(position: Vec3, hint: TrackHint, window: number): TrackHint {
    return this.branches.nearest(position, hint, window);
  }
  /** Main-line only, 3D. Respawn and tests. */
  nearestTGlobal(position: Vec3): number {
    return this.branches.main.lut.nearestTGlobal(position);
  }
  /** Main line and every open branch, 3D. */
  nearestGlobal(position: Vec3): TrackHint {
    return this.branches.nearestGlobal(position);
  }

  // ---- race helpers ----
  /** race-manager calls this when the lap counter changes; opens/closes openOnLaps shortcuts. */
  setLap(lap: number): void {
    this.branches.setLap(lap);
    this.minimap = buildMinimap(this.branches);
  }

  activeHazards(time: number) {
    return this.hazards.activeHazards(time);
  }

  applyFinalLapShift(karts: readonly ShiftKart[] = []): TrackChanged | undefined {
    return applyFinalLapShift(this, karts);
  }

  onChanged(listener: TrackListener): () => void {
    this.listeners.push(listener);
    return () => { const i = this.listeners.indexOf(listener); if (i >= 0) this.listeners.splice(i, 1); };
  }

  /** @internal shift.ts */
  emit(e: TrackChanged): void {
    for (const l of this.listeners) l(e);
  }

  /** @internal Checkpoints, spawn grid, minimap and feature views from the current LUTs. */
  rebuildDerived(): void {
    const lut = this.branches.main.lut;
    // off-road past the curb on every branch (a route change builds a new LUT, so it is set again here)
    for (const b of this.branches.list) {
      b.lut.offroad = this.def.offroad === true;
      b.lut.land = this.land;
      b.lut.floorY = this.groundPlaneY;
    }
    // open edges (a route change builds a new LUT, so they are laid again here)
    lut.open.fill(0);
    for (const e of this.openEdges) {
      const bits = e.side === 'left' ? 1 : e.side === 'right' ? 2 : 3;
      for (let i = 0; i < lut.n; i++) {
        const u = i / lut.n, d = ((u - e.fromT) % 1 + 1) % 1, span = ((e.toT - e.fromT) % 1 + 1) % 1;
        if (d <= span) lut.open[i] |= bits;
      }
    }
    this.checkpoints = buildCheckpoints(lut, this.startT, this.def.checkpointCount);
    this.spawnGrid = buildSpawnGrid(lut, this.startT, this.def.startGrid);
    this.minimap = buildMinimap(this.branches);
    this.jumps = jumpView(this.features);
    this.boostPads = boostPadView(this.features);
    this.loops = this.loopFeet.map((l) => ({
      id: l.id, t: l.t, radius: l.radius ?? BUILDER.loopRadius, shift: BUILDER.loopShift, spread: BUILDER.loopSpread,
      approach: BUILDER.loopApproach, exit: BUILDER.loopExit, width: BUILDER.loopWidth,
    }));
  }
}

export interface BuildOptions {
  /** Run the authoring validator first (default true). */
  validate?: boolean;
}

export function buildTrack(def: TrackDefinition, opts: BuildOptions = {}): Track {
  if (opts.validate ?? true) assertValid(def);
  return new Track(def);
}

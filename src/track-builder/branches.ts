// Branch 0 is the main line; branch i is shortcuts[i-1] with its own open LUT.
// A branch sample is indexed by main-equivalent t = entryT + u × span so a kart
// on a shortcut keeps ordinary race progress. nearest() searches the current
// branch first, then any other open branch whose range overlaps the window, and
// switches only when the other is closer by more than branchHysteresis in 3D.
import type { TrackHint, TrackSample } from '../kart-controller/types.ts';
import { BUILDER } from './constants.ts';
import { buildLut, wrap01, type Lut } from './lut.ts';
import type { ControlPoint, ShortcutDef, Vec3 } from './types.ts';

/** Signed offset of t from `from`, in (−0.5, 0.5]. */
export function signedOffset(t: number, from: number): number {
  const d = wrap01(t - from);
  return d > 0.5 ? d - 1 : d;
}

export class Branch {
  readonly index: number;
  readonly id: string;
  readonly openOnLaps: readonly number[];
  lut: Lut;
  entryT: number;
  exitT: number;
  /** wrap-aware exitT − entryT; 1 for the main line */
  span: number;
  /** world points the ends are re-derived from after a rebuild */
  readonly entryPoint: Vec3;
  readonly exitPoint: Vec3;
  /** shift override; undefined = decided by openOnLaps */
  forcedOpen?: boolean;
  private lapOpen = true;

  constructor(index: number, id: string, lut: Lut, entryT: number, exitT: number, openOnLaps: readonly number[] = []) {
    this.index = index;
    this.id = id;
    this.lut = lut;
    this.entryT = entryT;
    this.exitT = exitT;
    this.span = index === 0 ? 1 : wrap01(exitT - entryT);
    this.openOnLaps = openOnLaps;
    this.entryPoint = index === 0 ? [lut.px[0], lut.py[0], lut.pz[0]] : lut.sample(0, 0).position;
    this.exitPoint = index === 0 ? this.entryPoint : lut.sample(1, 0).position;
  }

  get isMain(): boolean { return this.index === 0; }

  get open(): boolean {
    if (this.isMain) return true;
    return this.forcedOpen ?? this.lapOpen;
  }

  setLap(lap: number): void {
    this.lapOpen = this.openOnLaps.length === 0 || this.openOnLaps.includes(lap);
  }

  /** main-equivalent t → local u (clamped for branches) */
  toLocal(t: number): number {
    if (this.isMain) return wrap01(t);
    const u = signedOffset(t, this.entryT) / this.span;
    return u < 0 ? 0 : u > 1 ? 1 : u;
  }

  /** local u → main-equivalent t */
  toMain(u: number): number {
    if (this.isMain) return wrap01(u);
    return wrap01(this.entryT + u * this.span);
  }

  sample(t: number, lateral: number): TrackSample {
    return this.lut.sample(this.toLocal(t), lateral);
  }

  /** Does [hintT ± window] touch this branch's t range? */
  overlaps(hintT: number, window: number): boolean {
    if (this.isMain) return true;
    const d = signedOffset(hintT, this.entryT);
    return d + window >= 0 && d - window <= this.span;
  }

  /** Local nearest on this branch. Returns main-equivalent t and squared 3D distance. */
  nearestLocal(position: Vec3, hintT: number, window: number): { t: number; d2: number } {
    if (this.isMain) {
      const t = this.lut.nearestT(position, hintT, window);
      return { t, d2: this.lut.dist2At(t, position) };
    }
    const u = this.lut.nearestT(position, this.toLocal(hintT), window / this.span);
    return { t: this.toMain(u), d2: this.lut.dist2At(u, position) };
  }

  /** Global 3D nearest on this branch: main-equivalent t and squared distance. */
  nearestGlobal(position: Vec3): { t: number; d2: number } {
    const u = this.lut.nearestTGlobal(position);
    return { t: this.toMain(u), d2: this.lut.dist2At(u, position) };
  }
}

/** Samples a branch LUT gets: proportional to its length, never fewer than 64. */
export function branchSampleCount(branchLength: number, mainLength: number): number {
  return Math.max(64, Math.round((BUILDER.lutSamples * branchLength) / mainLength));
}

export function buildBranch(index: number, def: ShortcutDef, main: Lut, points: readonly ControlPoint[] = def.controlPoints): Branch {
  // build once at a small size to learn the length, then at the real size
  const probe = buildLut(points, { closed: false, samples: 64, divisions: 256 });
  const lut = buildLut(points, { closed: false, samples: branchSampleCount(probe.length, main.length), divisions: Math.max(256, Math.round(BUILDER.arcDivisions * probe.length / main.length)) });
  return new Branch(index, def.id, lut, wrap01(def.entryT), wrap01(def.exitT), def.openOnLaps ?? []);
}

export class Branches {
  readonly list: Branch[];

  constructor(list: Branch[]) {
    this.list = list;
  }

  get main(): Branch { return this.list[0]; }

  byId(id: string): Branch | undefined {
    return this.list.find((b) => b.id === id);
  }

  setLap(lap: number): void {
    for (const b of this.list) b.setLap(lap);
  }

  /**
   * Ground at main-equivalent t on `branch`. A t outside the branch's range falls
   * through to the main line, so a look-ahead past a shortcut's exit sees the road
   * it is about to rejoin instead of the clamped end point.
   */
  sample(t: number, lateral: number, branch = 0): TrackSample {
    const b = this.list[branch] ?? this.main;
    if (!b.isMain) {
      const d = signedOffset(t, b.entryT);
      if (d < 0 || d > b.span) return this.main.sample(t, lateral);
    }
    return b.sample(t, lateral);
  }

  /**
   * Current branch first (even if it has closed: a kart rides it to the exit),
   * then every other open branch overlapping the window. Switch only when the
   * other is closer by more than branchHysteresis metres in 3D.
   */
  nearest(position: Vec3, hint: TrackHint, window: number): TrackHint {
    const cur = this.list[hint.branch] ?? this.main;
    const best = cur.nearestLocal(position, hint.t, window);
    let bestBranch = cur.index;
    let bestDist = Math.sqrt(best.d2);
    let bestT = best.t;
    const hyst = BUILDER.branchHysteresis;
    for (const b of this.list) {
      if (b === cur || !b.open || !b.overlaps(hint.t, window)) continue;
      const cand = b.nearestLocal(position, hint.t, window);
      const dist = Math.sqrt(cand.d2);
      if (dist < bestDist - hyst) {
        bestDist = dist;
        bestBranch = b.index;
        bestT = cand.t;
      }
    }
    return { t: bestT, branch: bestBranch };
  }

  /** Global 3D search over the main line and every open branch. Respawn and tests. */
  nearestGlobal(position: Vec3): TrackHint {
    let bestBranch = 0;
    let best = this.main.nearestGlobal(position);
    for (const b of this.list) {
      if (b.isMain || !b.open) continue;
      const cand = b.nearestGlobal(position);
      if (cand.d2 < best.d2 - BUILDER.branchHysteresis * BUILDER.branchHysteresis) {
        best = cand;
        bestBranch = b.index;
      }
    }
    return { t: best.t, branch: bestBranch };
  }
}

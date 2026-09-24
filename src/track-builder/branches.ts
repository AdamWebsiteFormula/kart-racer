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

  sampleInto(t: number, lateral: number, out: TrackSample): TrackSample {
    return this.lut.sampleInto(this.toLocal(t), lateral, out);
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
    // past an end the shortcut is not there any more (bug hunt, 24 Sept 2026: out of Canyon's mine a
    // kart rode a flat extension of the last sample for metres, up to 4 m over the main road it had
    // joined, then dropped). Beyond it, the road it welds onto is the road.
    if (this.pastEnd(u, position)) return { t: this.toMain(u), d2: Infinity };
    return { t: this.toMain(u), d2: this.lut.dist2At(u, position) };
  }

  /**
   * Local nearest searched again from where it landed until t stops moving. A switch onto this
   * branch searched a window centred on the other road's t, and on this road that window's edge can
   * be metres from the kart (bug hunt, 24 Sept 2026: beside Canyon's mine entry the main road's ground
   * was read 12 m away, 1.2 m higher, and the kart snapped up, then fell).
   */
  settle(position: Vec3, t: number, window: number): number {
    for (let k = 0; k < SETTLE_PASSES; k++) {
      const next = this.nearestLocal(position, t, window).t;
      if (next === t) break;
      t = next;
    }
    return t;
  }

  /** Is `position` beyond the open end the search clamped u to (along that end's tangent)? */
  private pastEnd(u: number, position: Vec3): boolean {
    if (u > 0 && u < 1) return false;
    const L = this.lut, i = u <= 0 ? 0 : L.n - 1;
    const along = (position[0] - L.px[i]) * L.tx[i] + (position[2] - L.pz[i]) * L.tz[i];
    return u <= 0 ? along < 0 : along > 0;
  }

  /** Road half-width at main-equivalent t. */
  halfWidthAt(t: number): number {
    const u = this.toLocal(t);
    return this.lut.hw[this.lut.idx(Math.round(u * this.lut.step))];
  }

  /** Global 3D nearest on this branch: main-equivalent t and squared distance. */
  nearestGlobal(position: Vec3): { t: number; d2: number } {
    const u = this.lut.nearestTGlobal(position);
    return { t: this.toMain(u), d2: this.lut.dist2At(u, position) };
  }
}

/** Searches Branch.settle runs at most: each slides the window by up to its width, 2–3 settle a switch. */
const SETTLE_PASSES = 3;

/** Samples a branch LUT gets: proportional to its length, never fewer than 64. */
export function branchSampleCount(branchLength: number, mainLength: number): number {
  return Math.max(64, Math.round((BUILDER.lutSamples * branchLength) / mainLength));
}

export function buildBranch(index: number, def: ShortcutDef, main: Lut, points: readonly ControlPoint[] = def.controlPoints): Branch {
  // build once at a small size to learn the length, then at the real size
  const probe = buildLut(points, { closed: false, samples: 64, divisions: 256 });
  const lut = buildLut(points, { closed: false, samples: branchSampleCount(probe.length, main.length), divisions: Math.max(256, Math.round(BUILDER.arcDivisions * probe.length / main.length)) });
  weldEnds(lut, main, wrap01(def.entryT), wrap01(def.exitT));
  return new Branch(index, def.id, lut, wrap01(def.entryT), wrap01(def.exitT), def.openOnLaps ?? []);
}

/**
 * Weld a shortcut's ends onto the main road (review, 23 Sept 2026). At a mouth the two ribbons
 * overlap for metres while they part; each had its own height and bank there, so one poked through
 * the other (grey slabs in the grass) and a kart handed from one to the other jumped up to 0.4 m.
 * Where they overlap the shortcut now takes the main road's surface (its height under the shortcut's
 * centre, and its bank), easing back to its own as the two pull clear of each other.
 */
function weldEnds(lut: Lut, main: Lut, entryT: number, exitT: number): void {
  const ds = lut.length / lut.step;
  for (const fromStart of [true, false]) {
    let hint = main.idx(Math.round((fromStart ? entryT : exitT) * main.step));
    let parted = -1; // metres along the shortcut where the two ribbons stopped overlapping
    for (let s = 0; s < lut.n >> 1; s++) {
      const i = fromStart ? s : lut.n - 1 - s;
      const x = lut.px[i], z = lut.pz[i];
      // the main road's nearest sample, walked along from the last one
      let best = Infinity;
      for (let k = -24; k <= 24; k++) {
        const j = main.idx(hint + k), dx = main.px[j] - x, dz = main.pz[j] - z, d = dx * dx + dz * dz;
        if (d < best) { best = d; hint = j; }
      }
      const j = hint;
      const lat = (x - main.px[j]) * main.rx[j] + (z - main.pz[j]) * main.rz[j];
      // how far across the main road the shortcut's ribbon reaches (it may leave at any angle)
      const across = lut.rx[i] * main.rx[j] + lut.rz[i] * main.rz[j];
      const gap = Math.abs(lat) - (main.hw[j] + BUILDER.kerbWidth) - (lut.hw[i] + BUILDER.kerbWidth) * Math.abs(across);
      if (parted < 0 && gap > -1) parted = s * ds;
      // welded while they overlap, then eased back to its own line over WELD_EASE metres
      const k = parted < 0 ? 0 : Math.min(1, (s * ds - parted) / WELD_EASE);
      const w = 1 - k * k * (3 - 2 * k);
      if (w <= 0) break;
      // the main road's surface under the shortcut's centre (level from its curb out, as the land
      // is), and the tilt it has along the shortcut's own lateral (its bank and climb, seen sideways)
      const curb = main.hw[j] + BUILDER.kerbWidth, latC = Math.max(-curb, Math.min(curb, lat));
      const th = Math.hypot(main.tx[j], main.tz[j]) || 1, climb = main.ty[j] / th;
      const along = (lut.rx[i] * main.tx[j] + lut.rz[i] * main.tz[j]) / th;
      const y = main.py[j] - latC * Math.tan(main.bank[j]);
      const bank = Math.atan(Math.tan(main.bank[j]) * across - climb * along);
      lut.py[i] += (y - lut.py[i]) * w;
      lut.bank[i] += (bank - lut.bank[i]) * w;
    }
  }
  lut.refreshFrames();
}

/** Metres over which a welded shortcut eases from the main road's surface back to its own line. */
const WELD_EASE = 30;

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
    return this.resolve(t, branch).sample(t, lateral);
  }

  /** Allocation-free sample(): fills `out`. */
  sampleInto(t: number, lateral: number, branch: number, out: TrackSample): TrackSample {
    return this.resolve(t, branch).sampleInto(t, lateral, out);
  }

  /** The branch that owns main-equivalent t on `branch`: itself inside its range, else main. */
  private resolve(t: number, branch: number): Branch {
    const b = this.list[branch] ?? this.main;
    if (!b.isMain) {
      const d = signedOffset(t, b.entryT);
      if (d < 0 || d > b.span) return this.main;
    }
    return b;
  }

  /**
   * Current branch first (even if it has closed: a kart mid-branch rides it to the
   * exit). While the kart is still inside that road (its edge less branchLeaveMargin)
   * it stays there. Off it, every other open branch overlapping the window competes,
   * and one wins only when the kart is further inside its edge (3D distance less half-width)
   * by more than branchHysteresis metres. A closed hint
   * branch whose range does not contain hint.t is stale and counts as main.
   */
  nearest(position: Vec3, hint: TrackHint, window: number): TrackHint {
    let cur = this.list[hint.branch] ?? this.main;
    if (!cur.open && !cur.overlaps(hint.t, 0)) cur = this.main;
    const best = cur.nearestLocal(position, hint.t, window);
    let bestBranch = cur.index;
    let bestDist = Math.sqrt(best.d2);
    let bestT = best.t;
    // still on the road you are on? Then you are on it, however close another line runs.
    // Two roads overlap for metres at a fork; the nearer centreline is not the one you chose.
    const curHw = cur.halfWidthAt(bestT);
    if (bestDist <= curHw - BUILDER.branchLeaveMargin) return { t: bestT, branch: cur.index };
    // Off it, the road whose edge the kart is furthest inside (or least outside) wins, by more than
    // branchHysteresis: a kart on the grass drives onto the other road's asphalt and is on that road,
    // however its centreline lies (review, 23 Sept 2026: it sank into the asphalt until then)
    const hyst = BUILDER.branchHysteresis;
    let bestPast = bestDist - curHw;
    for (const b of this.list) {
      if (b === cur || !b.open || !b.overlaps(hint.t, window)) continue;
      const cand = b.nearestLocal(position, hint.t, window);
      const past = Math.sqrt(cand.d2) - b.halfWidthAt(cand.t);
      if (past < bestPast - hyst) {
        bestPast = past;
        bestBranch = b.index;
        bestT = cand.t;
      }
    }
    // a switch: read the new road's ground under the kart, not at the edge of the old road's window
    if (bestBranch !== cur.index) bestT = this.list[bestBranch].settle(position, bestT, window);
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

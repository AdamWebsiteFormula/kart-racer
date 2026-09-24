// Authoring checks. Runs in tests and at load in dev. Errors block; warnings print.
import kartSchema from '../../docs/schemas/kart.schema.json';
import { signedOffset } from './branches.ts';
import { BUILDER, KART_RADIUS } from './constants.ts';
import { buildLut, wrap01, type Lut } from './lut.ts';
import { spliceRoute } from './shift.ts';
import type { ControlPoint, TrackDefinition, Vec3 } from './types.ts';
import * as dmath from '../sim-math/dmath.ts';

const TOP_SPEED: number = kartSchema.properties.base.properties.topSpeed.default;
/** Design §6: the AI/player averages about 80% of top speed over a lap. */
const LAP_SPEED_FRACTION = 0.8;
/** Shortcut ends must rejoin the main line within this many metres. */
const BRANCH_END_TOLERANCE = 2;
/** voidY must sit at least this far under the lowest sample. */
const VOID_CLEARANCE = 5;
/**
 * Neighbouring control points closer than this make a kink the spline cannot round (track review,
 * 24 Sept 2026: Skyline's final-lap road kept a main point 0.16 m past the rail's end: 42° in 2 m).
 */
const MIN_POINT_SPACING = 4;
/** Half-width may change by at most this many metres per metre of road (a 2.5 m step takes 15 m or more). */
const MAX_WIDTH_RATE = 0.25;
/** A shortcut leaves and rejoins the main road at no more than this angle (degrees), never a T-junction. */
const MAX_JOIN_DEG = 30;
/**
 * A fixed hazard (static, vent) keeps this far along the road ahead of every checkpoint (respawns land
 * there and drive on), and behind it by its own reach plus a kart (one set down facing away is clear).
 */
const HAZARD_CHECKPOINT_CLEARANCE = 10;
const HAZARD_BEHIND_CLEARANCE = Math.max(BUILDER.hazardRadius, BUILDER.ventRadius) + KART_RADIUS + 1;
const FIXED_HAZARDS = new Set(['static', 'vent']);

export interface Validation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function hasNaN(p: ControlPoint): boolean {
  return [p.x, p.y, p.z, p.halfWidth, p.bank ?? 0].some((v) => !Number.isFinite(v));
}

function checkPoints(points: readonly ControlPoint[], label: string, errors: string[], minCount: number): boolean {
  if (points.length < minCount) { errors.push(`${label}: needs at least ${minCount} control points, has ${points.length}`); return false; }
  for (let i = 0; i < points.length; i++) {
    if (hasNaN(points[i])) { errors.push(`${label}: control point ${i} has a NaN or infinite value`); return false; }
    if (Math.abs(points[i].bank ?? 0) > BUILDER.maxBankDeg) errors.push(`${label}: control point ${i} bank ${points[i].bank}° exceeds ${BUILDER.maxBankDeg}°`);
  }
  return true;
}

/** Turn radius from neighbouring unit tangents at uniform spacing ds. */
function turnRadius(lut: Lut, i: number): number {
  const ip = lut.idx(i + 1), im = lut.idx(i - 1);
  const dx = lut.tx[ip] - lut.tx[im], dy = lut.ty[ip] - lut.ty[im], dz = lut.tz[ip] - lut.tz[im];
  const ds = lut.length / lut.step;
  const k = dmath.hypot3(dx, dy, dz) / (2 * ds);
  return k > 0 ? 1 / k : Infinity;
}

/** Control points closer than MIN_POINT_SPACING to the next one (the loop wraps when closed). */
function checkSpacing(points: readonly ControlPoint[], label: string, errors: string[], closed: boolean): void {
  const n = points.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = points[i], b = points[(i + 1) % n];
    const d = dmath.hypot3(b.x - a.x, b.y - a.y, b.z - a.z);
    if (d < MIN_POINT_SPACING) errors.push(`${label}: control points ${i} and ${(i + 1) % n} are ${d.toFixed(2)} m apart (min ${MIN_POINT_SPACING})`);
  }
}

/**
 * The swept road holds together: no sample turns tighter than minTurnRadiusFactor × halfWidth (the inner
 * edge folds back over itself) and the width never flares faster than MAX_WIDTH_RATE. Every road the
 * mesh sweeps is checked: the main line, each shortcut and the final-lap road (track review, 24 Sept
 * 2026: only the lap-1 main line was, and Canyon's mine route turned 94° at 5.7 m on a 14 m road).
 */
function checkRoad(lut: Lut, label: string, errors: string[]): void {
  const ds = lut.length / lut.step;
  const lo = lut.closed ? 0 : 1, hi = lut.closed ? lut.n : lut.n - 1;
  let worstRatio = Infinity, worstT = 0, worstRate = 0, rateT = 0;
  for (let i = lo; i < hi; i++) {
    const ratio = turnRadius(lut, i) / lut.hw[i];
    if (ratio < worstRatio) { worstRatio = ratio; worstT = i / lut.step; }
  }
  for (let i = 0; i < (lut.closed ? lut.n : lut.n - 1); i++) {
    const rate = Math.abs(lut.hw[lut.idx(i + 1)] - lut.hw[i]) / ds;
    if (rate > worstRate) { worstRate = rate; rateT = i / lut.step; }
  }
  if (worstRatio < BUILDER.minTurnRadiusFactor) {
    errors.push(`${label}: hairpin at t=${worstT.toFixed(3)}: turn radius is ${worstRatio.toFixed(2)} × halfWidth, minimum ${BUILDER.minTurnRadiusFactor}`);
  }
  if (worstRate > MAX_WIDTH_RATE) {
    errors.push(`${label}: halfWidth changes ${worstRate.toFixed(2)} m per metre at t=${rateT.toFixed(3)}, max ${MAX_WIDTH_RATE}`);
  }
}

/** Plan-view angle in degrees between two tangents. */
function planAngle(a: Vec3, b: Vec3): number {
  const c = (a[0] * b[0] + a[2] * b[2]) / (dmath.hypot(a[0], a[2]) * dmath.hypot(b[0], b[2]) || 1);
  return (dmath.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** The main line a route-changing Final Lap Shift builds (shift.ts, bare points: no weld). */
function shiftedRoad(def: TrackDefinition, lut: Lut): { points: ControlPoint[]; lut: Lut } | null {
  const overrides = def.finalLapShift.routeOverrides ?? [];
  if (!overrides.length) return null;
  const tOf = def.controlPoints.map((p) => lut.nearestTGlobal([p.x, p.y, p.z]));
  const points = spliceRoute(def.controlPoints, tOf, overrides);
  return { points, lut: buildLut(points) };
}

export function validateTrack(def: TrackDefinition): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const pts = def.controlPoints;
  if (checkPoints(pts, 'controlPoints', errors, 8)) {
    const f = pts[0], l = pts[pts.length - 1];
    if (f.x === l.x && f.y === l.y && f.z === l.z) errors.push('controlPoints: last point repeats the first; the loop closes itself, drop it');
  }
  if (def.checkpointCount < 4) errors.push(`checkpointCount ${def.checkpointCount} < 4`);
  const g = def.startGrid;
  if (!Number.isFinite(g.t)) errors.push(`startGrid.t ${g.t} is not finite`);
  if (!Number.isInteger(g.rows) || g.rows < 1) errors.push(`startGrid.rows ${g.rows} must be an integer ≥ 1`);
  if (!Number.isInteger(g.columns) || g.columns < 1) errors.push(`startGrid.columns ${g.columns} must be an integer ≥ 1`);
  if (!Number.isFinite(g.spacing) || g.spacing <= 0) errors.push(`startGrid.spacing ${g.spacing} must be > 0`);
  if (errors.length) return { ok: false, errors, warnings };

  const lut = buildLut(pts);
  const startT = wrap01(def.startGrid.t);
  const startHw = lut.sample(startT, 0).halfWidth;
  if (startHw < BUILDER.minStartHalfWidth) errors.push(`start line halfWidth ${startHw.toFixed(2)} < ${BUILDER.minStartHalfWidth}`);

  checkSpacing(pts, 'controlPoints', errors, true);
  checkRoad(lut, 'main', errors);

  let minY = lut.minY;
  const shortcutIds = new Set<string>();
  for (const sc of def.shortcuts ?? []) {
    const label = `shortcut "${sc.id}"`;
    if (shortcutIds.has(sc.id)) errors.push(`${label}: duplicate id`);
    shortcutIds.add(sc.id);
    const span = wrap01(sc.exitT - sc.entryT);
    if (span <= 0 || span > 0.5) errors.push(`${label}: exitT must follow entryT by less than half a lap (span ${span.toFixed(3)})`);
    if (!checkPoints(sc.controlPoints, label, errors, 2)) continue;
    const entry = lut.sample(sc.entryT, 0).position;
    const exit = lut.sample(sc.exitT, 0).position;
    const a = sc.controlPoints[0], b = sc.controlPoints[sc.controlPoints.length - 1];
    const dEntry = dmath.hypot3(a.x - entry[0], a.y - entry[1], a.z - entry[2]);
    const dExit = dmath.hypot3(b.x - exit[0], b.y - exit[1], b.z - exit[2]);
    if (dEntry > BRANCH_END_TOLERANCE) errors.push(`${label}: first point is ${dEntry.toFixed(2)} m from the main line at entryT (max ${BRANCH_END_TOLERANCE})`);
    if (dExit > BRANCH_END_TOLERANCE) errors.push(`${label}: last point is ${dExit.toFixed(2)} m from the main line at exitT (max ${BRANCH_END_TOLERANCE})`);
    const bl = buildLut(sc.controlPoints, { closed: false, samples: 256, divisions: 512 });
    if (bl.minY < minY) minY = bl.minY;
    checkSpacing(sc.controlPoints, label, errors, false);
    checkRoad(bl, label, errors);
    // it forks off and merges back in, never a T-junction (track review, 24 Sept 2026: 45-82° joins)
    const aIn = planAngle(bl.sample(0, 0).tangent, lut.sample(sc.entryT, 0).tangent);
    const aOut = planAngle(bl.sample(1, 0).tangent, lut.sample(sc.exitT, 0).tangent);
    // (a warning, so the synthetic test ovals keep their chord shortcuts; validate.test holds the six tracks to it)
    if (aIn > MAX_JOIN_DEG) warnings.push(`${label}: leaves the main line at ${aIn.toFixed(0)}° (max ${MAX_JOIN_DEG}°)`);
    if (aOut > MAX_JOIN_DEG) warnings.push(`${label}: rejoins the main line at ${aOut.toFixed(0)}° (max ${MAX_JOIN_DEG}°)`);
  }

  const shifted = shiftedRoad(def, lut);
  if (shifted) {
    checkSpacing(shifted.points, 'final-lap road', errors, true);
    checkRoad(shifted.lut, 'final-lap road', errors);
  }

  // respawns land on the checkpoints: a fixed hazard there spins a kart the moment it is set down
  // (track review, 24 Sept 2026: Boardwalk's teacup-2 sat on checkpoint 9)
  const hazardClear = (road: Lut, startT: number, where: (h: NonNullable<TrackDefinition['hazards']>[number]) => number, label: string) => {
    (def.hazards ?? []).forEach((h, i) => {
      if (!FIXED_HAZARDS.has(h.type)) return;
      const ht = where(h);
      for (let c = 0; c < def.checkpointCount; c++) {
        const d = signedOffset(ht, wrap01(startT + c / def.checkpointCount)) * road.length;
        if (d >= 0 && d < HAZARD_CHECKPOINT_CLEARANCE) errors.push(`${label}hazard ${h.id ?? i} (${h.type}) is ${d.toFixed(1)} m past checkpoint ${c} (min ${HAZARD_CHECKPOINT_CLEARANCE})`);
        if (d < 0 && -d < HAZARD_BEHIND_CLEARANCE) errors.push(`${label}hazard ${h.id ?? i} (${h.type}) is ${(-d).toFixed(1)} m before checkpoint ${c} (min ${HAZARD_BEHIND_CLEARANCE.toFixed(1)})`);
      }
    });
  };
  hazardClear(lut, startT, (h) => h.t, '');
  if (shifted) {
    const s = shifted.lut;
    hazardClear(s, s.nearestTGlobal(lut.sample(startT, 0).position), (h) => s.nearestTGlobal(lut.sample(h.t, h.lateral ?? 0).position), 'final lap: ');
  }

  if (def.voidY > minY - VOID_CLEARANCE) errors.push(`voidY ${def.voidY} must be at least ${VOID_CLEARANCE} m below the lowest road sample (${minY.toFixed(2)})`);

  const inRange = (t: number) => t >= 0 && t <= 1;
  const named = (what: string, list: { shortcut?: string; t: number }[] | undefined) => {
    (list ?? []).forEach((f, i) => {
      if (!inRange(f.t)) errors.push(`${what} ${i}: t ${f.t} outside 0..1`);
      if (f.shortcut && !shortcutIds.has(f.shortcut)) errors.push(`${what} ${i}: unknown shortcut "${f.shortcut}"`);
    });
  };
  named('pickup', def.pickups); named('coin', def.coins); named('boostPad', def.boostPads); named('jump', def.jumps);
  (def.hazards ?? []).forEach((h, i) => { if (!inRange(h.t)) errors.push(`hazard ${i}: t ${h.t} outside 0..1`); });

  // an open edge on a stretch a route override replaces goes with that road; one that only
  // partly overlaps it would leave a wall-less stub on the new road
  const inside = (t: number, a: number, b: number) => wrap01(t - a) <= wrap01(b - a);
  (def.openEdges ?? []).forEach((e, i) => {
    if (!inRange(e.fromT) || !inRange(e.toT)) errors.push(`openEdges ${i}: t outside 0..1`);
    for (const ov of def.finalLapShift.routeOverrides ?? []) {
      const a = inside(e.fromT, ov.fromT, ov.toT), b = inside(e.toT, ov.fromT, ov.toT);
      const covers = inside(ov.fromT, e.fromT, e.toT) || inside(ov.toT, e.fromT, e.toT);
      if (a !== b || (!a && covers)) errors.push(`openEdges ${i}: ${e.fromT}-${e.toT} partly overlaps the route override ${ov.fromT}-${ov.toT}; keep it clear of it or wholly inside`);
    }
  });

  const shift = def.finalLapShift;
  const hazardIds = new Set((def.hazards ?? []).map((h, i) => h.id ?? `hazard-${i}`));
  for (const id of [...(shift.closesShortcuts ?? []), ...(shift.opensShortcuts ?? [])]) {
    if (!shortcutIds.has(id)) errors.push(`finalLapShift names unknown shortcut "${id}"`);
  }
  for (const id of [...(shift.enablesHazards ?? []), ...(shift.disablesHazards ?? [])]) {
    if (!hazardIds.has(id)) errors.push(`finalLapShift names unknown hazard "${id}"`);
  }
  for (const ov of shift.routeOverrides ?? []) {
    if (!inRange(ov.fromT) || !inRange(ov.toT)) errors.push('routeOverride: fromT/toT outside 0..1');
    checkPoints(ov.controlPoints, 'routeOverride', errors, 1);
  }
  named('addsJump', shift.addsJumps);

  const lapSeconds = lut.length / (LAP_SPEED_FRACTION * TOP_SPEED);
  const [lo, hi] = BUILDER.lapTimeWarn;
  if (lapSeconds < lo || lapSeconds > hi) {
    warnings.push(`estimated lap ${lapSeconds.toFixed(1)} s (length ${lut.length.toFixed(0)} m) is outside ${lo}–${hi} s; design target is 45–60 s`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Throws with every error listed. Dev loader and tests. */
export function assertValid(def: TrackDefinition): void {
  const v = validateTrack(def);
  if (!v.ok) throw new Error(`track "${def.id}" is invalid:\n  ${v.errors.join('\n  ')}`);
}

// Authoring checks. Runs in tests and at load in dev. Errors block; warnings print.
import kartSchema from '../../docs/schemas/kart.schema.json';
import { BUILDER } from './constants.ts';
import { buildLut, wrap01, type Lut } from './lut.ts';
import type { ControlPoint, TrackDefinition } from './types.ts';

const TOP_SPEED: number = kartSchema.properties.base.properties.topSpeed.default;
/** Design §6: the AI/player averages about 80% of top speed over a lap. */
const LAP_SPEED_FRACTION = 0.8;
/** Shortcut ends must rejoin the main line within this many metres. */
const BRANCH_END_TOLERANCE = 2;
/** voidY must sit at least this far under the lowest sample. */
const VOID_CLEARANCE = 5;

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
  const k = Math.hypot(dx, dy, dz) / (2 * ds);
  return k > 0 ? 1 / k : Infinity;
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
  if (errors.length) return { ok: false, errors, warnings };

  const lut = buildLut(pts);
  const startT = wrap01(def.startGrid.t);
  const startHw = lut.sample(startT, 0).halfWidth;
  if (startHw < BUILDER.minStartHalfWidth) errors.push(`start line halfWidth ${startHw.toFixed(2)} < ${BUILDER.minStartHalfWidth}`);

  let worstRatio = Infinity, worstT = 0;
  for (let i = 0; i < lut.n; i++) {
    const ratio = turnRadius(lut, i) / lut.hw[i];
    if (ratio < worstRatio) { worstRatio = ratio; worstT = i / lut.n; }
  }
  if (worstRatio < BUILDER.minTurnRadiusFactor) {
    errors.push(`hairpin at t=${worstT.toFixed(3)}: turn radius is ${worstRatio.toFixed(2)} × halfWidth, minimum ${BUILDER.minTurnRadiusFactor}`);
  }

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
    const dEntry = Math.hypot(a.x - entry[0], a.y - entry[1], a.z - entry[2]);
    const dExit = Math.hypot(b.x - exit[0], b.y - exit[1], b.z - exit[2]);
    if (dEntry > BRANCH_END_TOLERANCE) errors.push(`${label}: first point is ${dEntry.toFixed(2)} m from the main line at entryT (max ${BRANCH_END_TOLERANCE})`);
    if (dExit > BRANCH_END_TOLERANCE) errors.push(`${label}: last point is ${dExit.toFixed(2)} m from the main line at exitT (max ${BRANCH_END_TOLERANCE})`);
    const bl = buildLut(sc.controlPoints, { closed: false, samples: 256, divisions: 512 });
    if (bl.minY < minY) minY = bl.minY;
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

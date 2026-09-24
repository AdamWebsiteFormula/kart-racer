// applyFinalLapShift: idempotent, runs once when race-manager says the leader
// started the last lap. Order (SOP): route overrides → LUT rebuild → karts remap →
// features re-derive → race helpers recompute → surface overrides → grip →
// shortcuts, jumps, hazards → TrackChanged event.
import { signedOffset, WELD_EASE, type Branches } from './branches.ts';
import { BUILDER } from './constants.ts';
import { bakeJump, rederive } from './features.ts';
import { buildLut, wrap01, type Lut } from './lut.ts';
import { surfaceId, type ControlPoint, type RouteOverride, type TrackChanged, type TrackDefinition, type Vec3 } from './types.ts';
import type { Track } from './track.ts';

/** The least a kart needs for the remap. KartState satisfies it. */
export interface ShiftKart { position: [number, number, number]; t: number; branch: number }

const inRange = (t: number, fromT: number, toT: number) => wrap01(t - fromT) <= wrap01(toT - fromT);

/** Splice override control points into the main list over [fromT, toT]. Pure. */
export function spliceRoute(points: readonly ControlPoint[], tOf: readonly number[], overrides: readonly RouteOverride[]): ControlPoint[] {
  const removed = new Set<number>();
  const insertBefore = new Map<number, ControlPoint[]>();
  for (const ov of overrides) {
    const inside: number[] = [];
    for (let i = 0; i < points.length; i++) if (inRange(tOf[i], ov.fromT, ov.toT)) inside.push(i);
    let anchor: number;
    if (inside.length) {
      inside.sort((a, b) => wrap01(tOf[a] - ov.fromT) - wrap01(tOf[b] - ov.fromT));
      anchor = inside[0];
      for (const i of inside) removed.add(i);
    } else {
      // nothing swallowed: insert before the first point after toT
      anchor = 0;
      let best = Infinity;
      for (let i = 0; i < points.length; i++) {
        const d = wrap01(tOf[i] - ov.toT);
        if (d < best) { best = d; anchor = i; }
      }
    }
    insertBefore.set(anchor, [...(insertBefore.get(anchor) ?? []), ...ov.controlPoints]);
  }
  const out: ControlPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const ins = insertBefore.get(i);
    if (ins) out.push(...ins.map((p) => ({ ...p })));
    if (!removed.has(i)) out.push({ ...points[i] });
  }
  return out;
}

export function applyFinalLapShift(track: Track, karts: readonly ShiftKart[] = []): TrackChanged | undefined {
  if (track.shifted) return undefined;
  track.shifted = true;
  const def: TrackDefinition = track.def;
  const shift = def.finalLapShift;
  const branches = track.branches;
  const main = branches.main;
  const changedRanges: [number, number][] = [];

  // 1. route overrides → rebuild the main LUT once
  const overrides = shift.routeOverrides ?? [];
  if (overrides.length) {
    const kartLocal = karts.map((k) => (k.branch > 0 && branches.list[k.branch] ? branches.list[k.branch].toLocal(k.t) : 0));
    const tOf = track.controlPoints.map((p) => main.lut.nearestTGlobal([p.x, p.y, p.z]));
    track.controlPoints = spliceRoute(track.controlPoints, tOf, overrides);
    const roads = branches.list.map((b) => b.lut);
    main.lut = buildLut(track.controlPoints);
    weldToRoads(main.lut, roads);
    for (const ov of overrides) changedRanges.push([ov.fromT, ov.toT]);

    // shortcut ends and the start line are world points: re-derive their t
    for (const b of branches.list) {
      if (b.isMain) continue;
      b.entryT = main.lut.nearestTGlobal(b.entryPoint);
      b.exitT = main.lut.nearestTGlobal(b.exitPoint);
      b.span = wrap01(b.exitT - b.entryT);
    }
    track.startT = main.lut.nearestTGlobal(track.startPoint);
    // open edges and loops on the replaced road go with it; the rest keep their world place
    const replaced = (t: number) => overrides.some((ov) => inRange(t, ov.fromT, ov.toT));
    track.openEdges = track.openEdges
      .filter((e) => !replaced(e.fromT) && !replaced(e.toT))
      .map((e) => ({ ...e, fromT: main.lut.nearestTGlobal(e.fromPoint), toT: main.lut.nearestTGlobal(e.toPoint) }));
    track.loopFeet = track.loopFeet.filter((l) => !replaced(l.t)).map((l) => ({ ...l, t: main.lut.nearestTGlobal(l.point) }));
    // a creature keeps its t, and on replaced road that t is somewhere else (bug hunt 2, 24 Sept 2026:
    // Canyon's Rumblesaur stood in the mesa over the mine and its ring spun karts in the bore): it goes too
    for (const c of track.hazards.creatures) if (replaced(c.t)) track.hazards.setEnabled(c.id, false);

    // 2. karts: main-line karts by world position; branch karts keep their local u, unless the new main
    // road now runs under them
    karts.forEach((k, i) => {
      const b = branches.list[k.branch];
      if (k.branch > 0 && b) {
        const on = mainUnder(branches, k.position);
        if (on >= 0) { k.t = on; k.branch = 0; } else k.t = b.toMain(kartLocal[i]);
      } else {
        k.t = main.lut.nearestTGlobal(k.position);
        k.branch = 0;
      }
    });

    // 3. features and hazards keep their world position
    rederive(track.features, branches);
    track.hazards.rederive();
  }

  // 5. surface overrides (baked ids)
  for (const so of shift.surfaceOverrides ?? []) {
    const id = surfaceId(so.surface);
    const lut = main.lut;
    for (let i = 0; i < lut.n; i++) if (inRange(i / lut.n, so.fromT, so.toT)) lut.surface[i] = id;
    changedRanges.push([so.fromT, so.toT]);
  }

  // 6. grip
  const grip = shift.gripMultiplier ?? 1;
  if (grip !== 1) {
    for (const b of branches.list) for (let i = 0; i < b.lut.n; i++) b.lut.grip[i] *= grip;
  }

  // 7. shortcuts, jumps, hazards
  for (const id of shift.closesShortcuts ?? []) { const b = branches.byId(id); if (b) b.forcedOpen = false; }
  for (const id of shift.opensShortcuts ?? []) { const b = branches.byId(id); if (b) b.forcedOpen = true; }
  for (const j of shift.addsJumps ?? []) track.features.push(bakeJump(branches, j));
  for (const id of shift.enablesHazards ?? []) track.hazards.setEnabled(id, true);
  for (const id of shift.disablesHazards ?? []) track.hazards.setEnabled(id, false);

  // 4. race helpers and feature views (after everything that can move them)
  track.rebuildDerived();

  // 8. event
  const event: TrackChanged = {
    kind: shift.kind,
    label: shift.label,
    sky: shift.sky,
    lut: shift.lut,
    fogDensity: shift.fogDensity,
    musicVariant: shift.musicVariant,
    length: main.lut.length,
    changedRanges: changedRanges.map(([a, b]) => [wrap01(a), wrap01(b)] as [number, number]),
  };
  track.emit(event);
  return event;
}

/**
 * The final-lap road takes the surface of the roads it runs along (bug hunt 2, 24 Sept 2026). A route
 * override splices a shortcut's control points into the main line, but that shortcut was welded to
 * the main road at its ends (branches.ts weldEnds) and everything else was laid on the weld: the mine
 * and its mesa, the land, a kart still riding the closed shortcut. Rebuilt from the bare points, the
 * new road ran up to 3.4 m under them (out of Canyon's mine a kart hugging the wall was snapped 12 m
 * up onto the mesa; one finishing Skyline's sky-rail drove in mid-air over the road drawn under it).
 * Now each new sample over a road that was there (the old main line, a shortcut) takes that road's
 * surface under its centre, level from its curb out as the land is, and its tilt seen along the new
 * road's lateral; where it leaves them all it eases back to its own line over WELD_EASE metres.
 */
export function weldToRoads(lut: Lut, roads: readonly Lut[]): void {
  const n = lut.n, ds = lut.length / lut.step;
  const dy = new Float64Array(n), db = new Float64Array(n), on = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    for (const R of roads) {
      const s = surfaceUnder(R, lut, i);
      if (s && s.gap < best) { best = s.gap; dy[i] = s.y - lut.py[i]; db[i] = s.bank - lut.bank[i]; }
    }
    on[i] = best < 0 ? 1 : 0; // the two ribbons overlap
  }
  // off every old road: the nearest welded sample's offset, eased out along the road
  const near = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1);
  for (const dir of [1, -1]) {
    let last = -1;
    for (let k = 0; k < 2 * n; k++) {
      const i = dir > 0 ? k % n : n - 1 - (k % n);
      if (on[i]) last = k;
      else if (last >= 0 && (k - last) * ds < near[i]) { near[i] = (k - last) * ds; from[i] = dir > 0 ? last % n : n - 1 - (last % n); }
    }
  }
  for (let i = 0; i < n; i++) {
    let j = i, w = 1;
    if (!on[i]) {
      if (from[i] < 0) continue;
      j = from[i];
      const e = Math.min(1, near[i] / WELD_EASE);
      w = 1 - e * e * (3 - 2 * e);
    }
    lut.py[i] += dy[j] * w;
    lut.bank[i] += db[j] * w;
  }
  lut.refreshFrames();
}

const UNDER = { y: 0, bank: 0, gap: 0 };
const AT: Vec3 = [0, 0, 0];

/**
 * Road R's surface under sample i of `lut` (weldEnds' rule: its height under i's centre, level from
 * its curb out, and its bank and climb seen along i's lateral), and how far apart the two ribbons are
 * (`gap` < 0: they overlap). Null past an open road's end, or where R is another level (more than a
 * bore's height over or under).
 */
function surfaceUnder(R: Lut, lut: Lut, i: number): typeof UNDER | null {
  AT[0] = lut.px[i]; AT[1] = lut.py[i]; AT[2] = lut.pz[i];
  // the nearest point in 3D picks the level (a road may pass over itself), then in plan view on it
  const u = R.nearestT(AT, R.nearestTGlobal(AT), BUILDER.globalSearchStep / R.step);
  if (!R.closed && (u <= 0 || u >= 1)) {
    const e = u <= 0 ? 0 : R.n - 1;
    const ahead = ((AT[0] - R.px[e]) * R.tx[e] + (AT[2] - R.pz[e]) * R.tz[e]) * (u <= 0 ? -1 : 1);
    if (ahead > 0) return null;
  }
  const f = R.norm(u) * R.step, k = Math.floor(f), i0 = R.idx(k), i1 = R.idx(k + 1), a = f - k, b = 1 - a;
  const cx = R.px[i0] * b + R.px[i1] * a, cy = R.py[i0] * b + R.py[i1] * a, cz = R.pz[i0] * b + R.pz[i1] * a;
  const tx = R.tx[i0] * b + R.tx[i1] * a, ty = R.ty[i0] * b + R.ty[i1] * a, tz = R.tz[i0] * b + R.tz[i1] * a;
  const th = Math.hypot(tx, tz) || 1, rx = tz / th, rz = -tx / th;
  const bank = R.bank[i0] * b + R.bank[i1] * a, curb = R.hw[i0] * b + R.hw[i1] * a + BUILDER.kerbWidth;
  const lat = (AT[0] - cx) * rx + (AT[2] - cz) * rz, latC = Math.max(-curb, Math.min(curb, lat));
  const y = cy - latC * Math.tan(bank);
  if (Math.abs(y - AT[1]) > BUILDER.tunnelApex) return null;
  const across = lut.rx[i] * rx + lut.rz[i] * rz, along = (lut.rx[i] * tx + lut.rz[i] * tz) / th;
  UNDER.y = y;
  UNDER.bank = Math.atan(Math.tan(bank) * across - (ty / th) * along);
  UNDER.gap = Math.abs(lat) - curb - (lut.hw[i] + BUILDER.kerbWidth) * Math.abs(across);
  return UNDER;
}

/**
 * The main line's t under `position` (on its road: within its half-width, 3D), or -1. A route change
 * lays the main road along a shortcut (Canyon's mine, Skyline's sky-rail), and a kart, shot or drop
 * still on that shortcut is on the main road with everyone else (seam review, 24 Sept 2026: left on
 * the closed shortcut, it could not be hit, targeted or hooked from the road it shares).
 */
export function mainUnder(branches: Branches, position: Vec3): number {
  const main = branches.main, near = main.nearestGlobal(position);
  return Math.sqrt(near.d2) <= main.halfWidthAt(near.t) ? near.t : -1;
}

/** Is main-equivalent t inside the wrap-aware range? Exported for the scene layer's chunk swap. */
export function tInRange(t: number, fromT: number, toT: number): boolean {
  return inRange(t, fromT, toT) || signedOffset(t, fromT) === 0;
}

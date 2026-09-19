// applyFinalLapShift: idempotent, runs once when race-manager says the leader
// started the last lap. Order (SOP): route overrides → LUT rebuild → karts remap →
// features re-derive → race helpers recompute → surface overrides → grip →
// shortcuts, jumps, hazards → TrackChanged event.
import { signedOffset } from './branches.ts';
import { bakeJump, rederive } from './features.ts';
import { buildLut, wrap01 } from './lut.ts';
import { surfaceId, type ControlPoint, type RouteOverride, type TrackChanged, type TrackDefinition } from './types.ts';
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
    main.lut = buildLut(track.controlPoints);
    for (const ov of overrides) changedRanges.push([ov.fromT, ov.toT]);

    // shortcut ends and the start line are world points: re-derive their t
    for (const b of branches.list) {
      if (b.isMain) continue;
      b.entryT = main.lut.nearestTGlobal(b.entryPoint);
      b.exitT = main.lut.nearestTGlobal(b.exitPoint);
      b.span = wrap01(b.exitT - b.entryT);
    }
    track.startT = main.lut.nearestTGlobal(track.startPoint);

    // 2. karts: main-line karts by world position; branch karts keep their local u
    karts.forEach((k, i) => {
      const b = branches.list[k.branch];
      if (k.branch > 0 && b) {
        k.t = b.toMain(kartLocal[i]);
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

/** Is main-equivalent t inside the wrap-aware range? Exported for the scene layer's chunk swap. */
export function tInRange(t: number, fromT: number, toT: number): boolean {
  return inRange(t, fromT, toT) || signedOffset(t, fromT) === 0;
}

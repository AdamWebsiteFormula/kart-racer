// Mirror mode (design §9 stretch, §10 unlock: gold in Time Trial on every track). A mirrored track is
// its TrackDefinition reflected left to right (world x → −x), built like any other track: the spline,
// LUT, mesh, AI line and checkpoints all come from the mirrored points, so nothing downstream needs to
// know. What the reflection must fix by hand is every left/right the data carries: a lateral offset
// (x → −x turns the road's right into the old left, so lateral → −lateral), a bank (positive lifts the
// left edge), an open edge's side, a decor entry's side, a gust's push, the sun, and the loop's
// sideways shift (track.ts reads `mirrored`). Pure and deterministic; mirroring twice gives the
// original back (apart from the flag).
import type { ControlPoint, DecorEntry, HazardDef, JumpDef, TrackDefinition } from './types.ts';

const flipSide = <T extends string>(s: T): T => (s === 'left' ? 'right' : s === 'right' ? 'left' : s) as T;
/** −x, with −0 kept as 0 so a mirrored file reads cleanly */
const neg = (x: number): number => (x === 0 ? 0 : -x);

function point(p: ControlPoint): ControlPoint {
  const out: ControlPoint = { ...p, x: neg(p.x) };
  if (p.bank !== undefined) out.bank = neg(p.bank);
  return out;
}

function lateral<T extends { lateral?: number }>(f: T): T {
  return f.lateral === undefined ? { ...f } : { ...f, lateral: neg(f.lateral) };
}

/**
 * A hazard across: its lateral flips. A creature with no lateral stands on the right (creatures.ts),
 * so its mirror stands on the left. A gust pushes away from the side it is authored on, and at
 * lateral 0 pushes right (hazards.ts): its mirror, at 0, must push left, so it takes a hair of lateral.
 */
function hazard(h: HazardDef): HazardDef {
  if (h.type === 'creature' && h.lateral === undefined) return { ...h, lateral: -1 };
  if (h.type === 'gust' && !h.lateral) return { ...h, lateral: GUST_MIRROR_LATERAL };
  return lateral(h);
}
/** metres: small enough to sit on the centreline, positive so the mirrored gust pushes left */
export const GUST_MIRROR_LATERAL = 0.001;

function jump(j: JumpDef): JumpDef { return lateral(j); }

function decor(d: DecorEntry): DecorEntry {
  return d.side === undefined ? { ...d } : { ...d, side: flipSide(d.side) };
}

/** The track reflected left to right. The result has `mirrored` set (flipped back when mirroring a mirror). */
export function mirrorTrack(def: TrackDefinition): TrackDefinition {
  const out: TrackDefinition = structuredClone(def);
  out.mirrored = !def.mirrored;
  out.controlPoints = def.controlPoints.map(point);
  if (def.shortcuts) out.shortcuts = def.shortcuts.map((s) => ({ ...structuredClone(s), controlPoints: s.controlPoints.map(point) }));
  if (def.hazards) out.hazards = def.hazards.map(hazard);
  if (def.jumps) out.jumps = def.jumps.map(jump);
  if (def.pickups) out.pickups = def.pickups.map(lateral);
  if (def.coins) out.coins = def.coins.map(lateral);
  if (def.boostPads) out.boostPads = def.boostPads.map(lateral);
  if (def.openEdges) out.openEdges = def.openEdges.map((e) => ({ ...e, side: flipSide(e.side) }));
  const shift = def.finalLapShift;
  out.finalLapShift = { ...structuredClone(shift) };
  if (shift.routeOverrides) out.finalLapShift.routeOverrides = shift.routeOverrides.map((r) => ({ ...r, controlPoints: r.controlPoints.map(point) }));
  if (shift.addsJumps) out.finalLapShift.addsJumps = shift.addsJumps.map(jump);
  const env = def.environment;
  if (env) {
    out.environment = structuredClone(env);
    if (env.sunDirection) out.environment.sunDirection = [neg(env.sunDirection[0]), env.sunDirection[1], env.sunDirection[2]];
    if (env.decor) out.environment.decor = env.decor.map(decor);
  }
  return out;
}

/** A track's mirrored definition, made once per track and kept (the game swaps between them). */
const made = new WeakMap<TrackDefinition, TrackDefinition>();
export function mirrored(def: TrackDefinition): TrackDefinition {
  let m = made.get(def);
  if (!m) { m = mirrorTrack(def); made.set(def, m); }
  return m;
}

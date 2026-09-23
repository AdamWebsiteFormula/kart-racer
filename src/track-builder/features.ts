// Pickups, coins, boost pads and jumps: authored in t + lateral, stored in world.
// After any LUT rebuild `rederive` recomputes t and lateral from the world position,
// so a shift that changes the track length cannot slide a pad down the road.
import type { TrackBoostPad, TrackJump } from '../kart-controller/types.ts';
import type { Branches } from './branches.ts';
import { BUILDER } from './constants.ts';
import type { BakedFeature, BoostPadDef, JumpDef, PickupDef, TrackDefinition, Vec3 } from './types.ts';

function branchIndex(branches: Branches, shortcut: string | undefined): number {
  if (!shortcut) return 0;
  const b = branches.byId(shortcut);
  if (!b) throw new Error(`feature names unknown shortcut "${shortcut}"`);
  return b.index;
}

function bakeOne(branches: Branches, kind: BakedFeature['kind'], id: string, def: PickupDef | BoostPadDef | JumpDef, width: number, launch: number): BakedFeature {
  const branch = branchIndex(branches, def.shortcut);
  const lateral = def.lateral ?? 0;
  const t = def.t;
  const s = branches.sample(t, lateral, branch);
  return { id, kind, branch, t: branches.list[branch].toMain(branches.list[branch].toLocal(t)), lateral, position: s.position, width, launch };
}

export function bakeFeatures(def: TrackDefinition, branches: Branches): BakedFeature[] {
  const out: BakedFeature[] = [];
  (def.pickups ?? []).forEach((p, i) => out.push({ ...bakeOne(branches, 'pickup', `pickup-${i}`, p, BUILDER.balloonRadius * 2, 0), ...(p.double ? { double: true } : {}) }));
  (def.coins ?? []).forEach((p, i) => out.push(bakeOne(branches, 'coin', `coin-${i}`, p, BUILDER.coinRadius * 2, 0)));
  (def.boostPads ?? []).forEach((p, i) => out.push(bakeOne(branches, 'boostPad', `pad-${i}`, p, p.width ?? BUILDER.boostPadWidth, 0)));
  (def.jumps ?? []).forEach((j) => out.push(bakeJump(branches, j)));
  return out;
}

export function bakeJump(branches: Branches, j: JumpDef): BakedFeature {
  return bakeOne(branches, 'jump', j.id, j, j.width ?? BUILDER.boostPadWidth, j.launch);
}

/** Signed lateral of a world point from the centreline at t on a branch. */
export function lateralAt(branches: Branches, t: number, branch: number, position: Vec3): number {
  const c = branches.sample(t, 0, branch);
  const rx = c.tangent[2], rz = -c.tangent[0];
  const h = Math.hypot(rx, rz) || 1;
  return ((position[0] - c.position[0]) * rx + (position[2] - c.position[2]) * rz) / h;
}

/** Re-derive t and lateral from the stored world position. Positions never move. */
export function rederive(features: BakedFeature[], branches: Branches): void {
  for (const f of features) {
    const b = branches.list[f.branch] ?? branches.main;
    f.t = b.nearestGlobal(f.position).t;
    f.lateral = lateralAt(branches, f.t, b.index, f.position);
  }
}

export function jumpView(features: readonly BakedFeature[]): TrackJump[] {
  return features.filter((f) => f.kind === 'jump').map((f) => ({ id: f.id, t: f.t, launch: f.launch, branch: f.branch }));
}

export function boostPadView(features: readonly BakedFeature[]): TrackBoostPad[] {
  return features.filter((f) => f.kind === 'boostPad').map((f) => ({ t: f.t, lateral: f.lateral, halfWidth: f.width / 2, branch: f.branch }));
}

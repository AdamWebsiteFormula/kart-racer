// When to press the item button, by the item's role. The items system (later)
// supplies the id → role map; here a held id with no role is never used.
import { forwardOf, type KartState } from '../kart-controller/types.ts';
import { wrapAngle } from './line.ts';
import { AI } from './constants.ts';
import { range } from './rng.ts';
import type { AiMemory, AiProfile, ItemRole, LineInfo } from './types.ts';

export interface ItemContext {
  karts: readonly KartState[];
  roles: Readonly<Record<string, ItemRole>>;
  /** metres from the player, positive = AI behind; 0 without a player */
  gap: number;
  /** true when a projectile is homing on this kart (items system, later) */
  threatened: boolean;
}

/** Angle from my heading to another kart, radians, positive = right. */
function bearing(s: KartState, o: KartState): number {
  return wrapAngle(Math.atan2(o.position[0] - s.position[0], o.position[2] - s.position[2]) - s.heading);
}

function distXZ(a: KartState, b: KartState): number {
  return Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
}

/** Roles whose item trails behind while the button is held (design §8 hold to trail). */
const TRAIL_ROLES: ReadonlySet<ItemRole> = new Set<ItemRole>(['forward', 'rearDrop', 'deception', 'runner']);

/** Returns true when the button should be down this tick. */
export function decideItem(s: KartState, m: AiMemory, profile: AiProfile, line: LineInfo, ctx: ItemContext, dt: number): boolean {
  const held = s.item.held;
  if (held !== m.lastItem) {
    m.lastItem = held;
    m.itemHold = 0;
    m.itemPressed = m.itemTrailing = false;
    m.reactionRemaining = held === 'none' ? 0 : range(m, profile.reactionMin, profile.reactionMax) * (1 - m.skill);
    return false;
  }
  if (held === 'none' || s.item.rouletteRemaining > 0) { m.itemPressed = m.itemTrailing = false; return false; }
  m.itemHold += dt;
  if (m.reactionRemaining > 0) { m.reactionRemaining -= dt; return false; }
  const role = ctx.roles[held];
  if (!role) return false;
  // a tap is one tick down and one tick up, so a second charge needs a second press
  if (m.itemPressed && !m.itemTrailing) { m.itemPressed = false; return false; }
  const it = AI.items;

  let aheadNear = Infinity, aheadInCone = Infinity, behindNear = Infinity, anyNear = Infinity;
  const f = forwardOf(s.heading);
  for (const o of ctx.karts) {
    if (o === s || o.isGhost || o.finishTick !== undefined) continue;
    const dist = distXZ(s, o);
    anyNear = Math.min(anyNear, dist);
    const dx = o.position[0] - s.position[0], dz = o.position[2] - s.position[2];
    const along = dx * f[0] + dz * f[2];
    if (along > 0) {
      aheadNear = Math.min(aheadNear, dist);
      if (Math.abs(bearing(s, o)) < it.forwardCone) aheadInCone = Math.min(aheadInCone, dist);
    } else behindNear = Math.min(behindNear, dist);
  }
  const straight = Math.abs(line.turnFar) < it.straightTurn;
  const offroad = s.surface === 'dirt' || s.surface === 'mud';

  let want: boolean;
  switch (role) {
    case 'forward': want = aheadInCone <= it.forwardRange; break;
    case 'homing': want = aheadNear <= it.homingRange; break;
    case 'rearDrop':
    case 'deception': want = behindNear <= it.rearRange || m.itemHold >= it.holdMax; break;
    case 'defenceArea': want = anyNear <= it.defenceRadius || ctx.threatened; break;
    case 'defenceHeld': want = ctx.threatened || behindNear <= it.rearRange; break;
    case 'speed': want = straight || offroad || ctx.gap > it.speedItemGap; break;
    case 'ride': want = true; break;
    case 'jump':
      // first press: dodge a homing shot or hop a kart; second (in the air): slam onto a kart below
      want = s.grounded
        ? ctx.threatened || aheadNear <= it.springRange || m.itemHold >= it.holdMax
        : anyNear <= it.springRange;
      break;
    case 'tether': want = aheadNear >= it.anchorMin && aheadNear <= it.anchorMax; break;
    case 'runner': want = aheadNear <= it.runnerRange; break;
    case 'equaliser':
    case 'chaos': want = true; break;
  }

  if (TRAIL_ROLES.has(role)) {
    // Mario Kart habit: keep a trap or a ball behind you while someone is on your tail
    const guard = ctx.threatened || behindNear <= it.rearRange * 0.5;
    if (guard && !want) { m.itemTrailing = m.itemPressed = true; return true; }
    // let go: the item is thrown or dropped on release
    if (m.itemTrailing) { m.itemTrailing = m.itemPressed = false; return false; }
  }
  if (want) m.itemPressed = true;
  return want;
}

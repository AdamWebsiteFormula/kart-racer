// Items types. Mirrors docs/schemas/item.schema.json (definitions, table, lockouts)
// and the projectiles / groundItems entries of race-state.schema.json. No Three.js.
import type { Vec3 } from '../kart-controller/types.ts';

export type ItemRole = 'forward' | 'homing' | 'rearDrop' | 'deception' | 'defenceArea' | 'defenceHeld' | 'speed' | 'equaliser' | 'chaos';

export interface ItemBehaviour {
  /** m/s at the 100 cc base; scaled by the kart schema speed class factor */
  projectileSpeed?: number;
  bounces?: number;
  homing?: boolean;
  lifetimeSeconds?: number;
  radius?: number;
  speedMultiplier?: number;
  durationSeconds?: number;
  charges?: number;
  affects?: 'target' | 'self' | 'ahead' | 'adjacent' | 'all';
  slowTo?: number;
  stripsItem?: boolean;
  minPosition?: number;
  chargeMultiplier?: number;
  chargeSeconds?: number;
  weightBonus?: number;
}

export interface HitEffect {
  spinSeconds?: number;
  coinsLost?: number;
  slowTo?: number;
  slowSeconds?: number;
  dropsItem?: boolean;
}

export interface ItemDefinition {
  id: string;
  name: string;
  role: ItemRole;
  behaviour: ItemBehaviour;
  hitEffect?: HitEffect;
  icon: string;
  sfx: string;
  asset?: string;
  silhouetteChecked?: boolean;
}

export interface ItemsConfig {
  rouletteSeconds: number;
  items: ItemDefinition[];
  /** index 0 = rank 1 */
  table: Record<string, number>[];
  lockoutSeconds: number;
  finalLapLockoutSeconds: number;
  lockedDuringLockout: string[];
  knockoutPoolByRacers: Record<string, string[]>;
  ownerGraceSeconds: number;
  spawnAheadMetres: number;
  dropBehindMetres: number;
  projectileHeight: number;
  homingSnapDistance: number;
  homingLateralRate: number;
  maxProjectilesPerOwner: number;
  maxGroundPerOwner: number;
}

export interface Projectile {
  id: number;
  itemId: string;
  /** index into karts[] */
  owner: number;
  ownerId: string;
  t: number;
  branch: number;
  lateral: number;
  /** world velocity (Beach Ball: straight in world space, bounced off the road edge) */
  velocity: Vec3;
  /** m/s along the tangent (Homing Kite: rides the spline) */
  speed: number;
  position: Vec3;
  prevPosition: Vec3;
  bouncesLeft: number;
  /** index into karts[], or -1 */
  target: number;
  ttl: number;
  graceRemaining: number;
  radius: number;
}

export interface GroundItem {
  id: number;
  itemId: string;
  owner: number;
  ownerId: string;
  t: number;
  branch: number;
  position: Vec3;
  ttl: number;
  graceRemaining: number;
  radius: number;
}

/** Everything the items system remembers between ticks. Plain data, index-aligned with karts[]. */
export interface ItemsState {
  rng: number;
  nextId: number;
  prevItem: boolean[];
  shieldRemaining: number[];
  /** the item id shown on the HUD while the roulette spins; '' when none */
  fogHeldBy: string;
  projectiles: Projectile[];
  groundItems: GroundItem[];
}

export type RefuseReason = 'roulette' | 'spinning' | 'intangible' | 'notRacing' | 'noItem' | 'inFlight' | 'position';

export type ItemEvent =
  | { type: 'roulette'; racerId: string; itemId: string; seconds: number }
  | { type: 'itemReady'; racerId: string; itemId: string }
  | { type: 'itemUsed'; racerId: string; itemId: string; chargesLeft: number }
  | { type: 'itemRefused'; racerId: string; itemId: string; reason: RefuseReason }
  | { type: 'itemLost'; racerId: string; itemId: string }
  | { type: 'projectileSpawn'; id: number; itemId: string; racerId: string; position: Vec3 }
  | { type: 'projectileBounce'; id: number; itemId: string; position: Vec3; bouncesLeft: number }
  | { type: 'projectilePop'; id: number; itemId: string; position: Vec3 }
  | { type: 'groundPlace'; id: number; itemId: string; racerId: string; position: Vec3 }
  | { type: 'groundPop'; id: number; itemId: string; position: Vec3 }
  | { type: 'hit'; racerId: string; byRacerId: string; itemId: string; spun: boolean; coinsLost: number }
  | { type: 'shieldUp'; racerId: string }
  | { type: 'shieldPop'; racerId: string }
  | { type: 'shieldEnd'; racerId: string }
  | { type: 'horn'; racerId: string; position: Vec3; radius: number }
  | { type: 'fog'; racerId: string; victims: string[] }
  | { type: 'equaliserHeld'; racerId: string; on: boolean };

// Items types. Mirrors docs/schemas/item.schema.json (definitions, table, lockouts)
// and the projectiles / groundItems entries of race-state.schema.json. No Three.js.
import type { Vec3 } from '../kart-controller/types.ts';

export type ItemRole =
  | 'forward' | 'homing' | 'rearDrop' | 'deception' | 'defenceArea' | 'defenceHeld' | 'speed' | 'equaliser' | 'chaos'
  | 'ride' | 'jump' | 'tether' | 'runner';

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
  /** hold the button to trail it behind the kart as a rear shield; let go to use it */
  trailable?: boolean;
  /** Wind-Up Mouse: karts it can bump before it runs down */
  hits?: number;
  /** Wind-Up Mouse: weave amplitude as a fraction of the free road half width, and its period */
  weave?: number;
  weaveSeconds?: number;
  /** Grapple Anchor: metres ahead along the road it can reach */
  range?: number;
  /** Grapple Anchor: the pull lets go this close (metres), then slingshots */
  releaseMetres?: number;
  slingshotSeconds?: number;
  /** Grapple Anchor: the hooked kart's tug when you fly past */
  tugSlowTo?: number;
  tugSeconds?: number;
  /** Strike Ball: the closing STRIKE burst spins karts within this radius */
  burstRadius?: number;
  /** Pogo Spring: the slam's shock ring radius */
  slamRadius?: number;
  /** Strike Ball: m/s up given to a kart it knocks, so it flies like a pin */
  popSpeed?: number;
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
  /** Beach Balls and Wind-Up Mice in flight per kart */
  maxProjectilesPerOwner: number;
  /** Homing Kites in flight per kart, counted apart */
  maxKitesPerOwner: number;
  /** a Kite homing on a kart is a threat (items.threatened) inside this many metres ... */
  kiteWarnMetres: number;
  /** ... or this many seconds at its closing speed */
  kiteWarnSeconds: number;
  /** a shot, drop and kart on two roads that cross at one level touch within this height */
  crossHitHeight: number;
  maxGroundPerOwner: number;
  /** metres behind the kart a trailed item rides */
  trailBehindMetres: number;
  /** a kart more than this high above a projectile or ground item passes over it (a Pogo Spring jump) */
  hitHeight: number;
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
  /** karts it may still hit (the Wind-Up Mouse passes through; everything else pops on the first) */
  hitsLeft: number;
  /** karts it has hit, bit i = karts[i]: the Mouse bumps each once (a coin-shielded kart it runs on through is not bumped again) */
  hitMask: number;
  /** seconds since it was fired (the Mouse's weave) */
  age: number;
  /** Mouse weave amplitude (fraction of the free half width); 0 for everything else */
  weave: number;
  weaveSeconds: number;
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
  /** per kart: the held item is trailing behind (button held) */
  trailing: boolean[];
  /** per kart: the power running from the first slot ('strikeBall') or '' */
  power: string[];
  /** per kart: the karts its Strike Ball has knocked this roll, bit j = karts[j]; each is knocked once */
  knocked: number[];
  /** per kart: Pogo Spring phase: 0 none, 1 in the air (slam ready), 2 slamming */
  pogo: number[];
  /** per kart: a Grapple Anchor pull was live last tick */
  towing: boolean[];
}

export type RefuseReason = 'roulette' | 'spinning' | 'intangible' | 'notRacing' | 'noItem' | 'inFlight' | 'position' | 'inUse' | 'noTarget';

export type ItemEvent =
  | { type: 'roulette'; racerId: string; itemId: string; seconds: number; slot: 0 | 1 }
  | { type: 'itemReady'; racerId: string; itemId: string; slot: 0 | 1 }
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
  | { type: 'equaliserHeld'; racerId: string; on: boolean }
  | { type: 'trailStart'; racerId: string; itemId: string }
  | { type: 'trailBlock'; racerId: string; itemId: string; position: Vec3 }
  | { type: 'powerStart'; racerId: string; itemId: string; seconds: number }
  | { type: 'powerEnd'; racerId: string; itemId: string }
  | { type: 'burst'; racerId: string; position: Vec3; radius: number }
  | { type: 'springLaunch'; racerId: string }
  | { type: 'springSlam'; racerId: string; position: Vec3; radius: number }
  | { type: 'tetherStart'; racerId: string; targetId: string }
  | { type: 'tetherEnd'; racerId: string; targetId: string; slingshot: boolean };

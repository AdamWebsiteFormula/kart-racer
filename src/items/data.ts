// The item schema instance: the 13 items (design §8), plan §5 numbers, and the
// rank table (docs/sops/items.md Constants and Decisions). Code reads this object;
// no item number lives anywhere else.
import schema from '../../docs/schemas/item.schema.json';
import type { ItemDefinition, ItemRole, ItemsConfig } from './types.ts';

function def<T>(key: keyof typeof schema.properties): T {
  return (schema.properties[key] as unknown as { default: T }).default;
}

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = Object.freeze([
  {
    id: 'beachBall', name: 'Beach Ball', role: 'forward',
    behaviour: { projectileSpeed: 38, bounces: 3, lifetimeSeconds: 8, radius: 0.6, affects: 'target', trailable: true },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'beach-ball', sfx: 'ball-bounce',
  },
  {
    id: 'homingKite', name: 'Homing Kite', role: 'homing',
    behaviour: { projectileSpeed: 42, homing: true, lifetimeSeconds: 10, radius: 0.6, affects: 'target' },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'kite', sfx: 'kite-whoosh',
  },
  {
    id: 'oilCan', name: 'Oil Can', role: 'rearDrop',
    behaviour: { lifetimeSeconds: 20, radius: 1.2, affects: 'target', trailable: true },
    hitEffect: { slowTo: 0.5, slowSeconds: 1, dropsItem: false },
    icon: 'oil-can', sfx: 'oil-splash',
  },
  {
    id: 'decoyBalloon', name: 'Decoy Balloon', role: 'deception',
    behaviour: { lifetimeSeconds: 20, radius: 0.9, affects: 'target', trailable: true },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'decoy-balloon', sfx: 'balloon-pop-bad',
  },
  {
    id: 'airHorn', name: 'Air Horn', role: 'defenceArea',
    behaviour: { radius: 6, affects: 'adjacent' },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'air-horn', sfx: 'air-horn',
  },
  {
    id: 'bubble', name: 'Bubble', role: 'defenceHeld',
    behaviour: { durationSeconds: 8, weightBonus: 0.5, affects: 'self' },
    icon: 'bubble', sfx: 'bubble-up',
  },
  {
    id: 'fizzPop', name: 'Fizz Pop', role: 'speed',
    behaviour: { charges: 1, affects: 'self' },
    icon: 'fizz-pop', sfx: 'fizz-pop',
  },
  {
    id: 'tripleFizz', name: 'Triple Fizz', role: 'speed',
    behaviour: { charges: 3, chargeMultiplier: 2, chargeSeconds: 2, affects: 'self' },
    icon: 'triple-fizz', sfx: 'fizz-pop',
  },
  {
    id: 'fogBank', name: 'Fog Bank', role: 'equaliser',
    behaviour: { slowTo: 0.6, durationSeconds: 3, stripsItem: true, minPosition: 5, affects: 'ahead' },
    icon: 'fog-bank', sfx: 'fog-roll',
  },
  {
    id: 'strikeBall', name: 'Strike Ball', role: 'ride',
    behaviour: { durationSeconds: 5, burstRadius: 7, popSpeed: 7, affects: 'adjacent' },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'strike-ball', sfx: 'strike-roll',
  },
  {
    id: 'pogoSpring', name: 'Pogo Spring', role: 'jump',
    behaviour: { charges: 2, slamRadius: 6, affects: 'adjacent' },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'pogo-spring', sfx: 'boing',
  },
  {
    id: 'grappleAnchor', name: 'Grapple Anchor', role: 'tether',
    behaviour: { range: 50, durationSeconds: 3, releaseMetres: 4, slingshotSeconds: 1.2, tugSlowTo: 0.8, tugSeconds: 0.6, affects: 'target' },
    icon: 'grapple-anchor', sfx: 'anchor-throw',
  },
  {
    id: 'windUpMouse', name: 'Wind-Up Mouse', role: 'runner',
    behaviour: { projectileSpeed: 32, lifetimeSeconds: 8, radius: 0.7, hits: 3, weave: 0.55, weaveSeconds: 1.6, affects: 'target', trailable: true },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'wind-up-mouse', sfx: 'mouse-scurry',
  },
]);

/**
 * Weights per rank (index 0 = rank 1). Every row sums to 100. Mario Kart World's shape: the
 * leaders get traps, a shield and a small boost; the middle attacks; the back gets the comeback
 * powers (docs/sops/items.md Decisions 2026-09-23).
 */
const TABLE_ROWS: Record<string, number>[] = [
  { beachBall: 20, oilCan: 30, decoyBalloon: 20, bubble: 10, fizzPop: 10, windUpMouse: 10 },
  { beachBall: 20, oilCan: 20, decoyBalloon: 15, bubble: 10, fizzPop: 15, windUpMouse: 10, pogoSpring: 10 },
  { beachBall: 20, homingKite: 15, oilCan: 10, bubble: 10, fizzPop: 15, windUpMouse: 15, pogoSpring: 15 },
  { beachBall: 10, homingKite: 20, bubble: 5, airHorn: 5, fizzPop: 10, tripleFizz: 15, windUpMouse: 15, pogoSpring: 10, grappleAnchor: 10 },
  { homingKite: 20, airHorn: 10, fizzPop: 5, tripleFizz: 25, windUpMouse: 10, pogoSpring: 5, grappleAnchor: 15, strikeBall: 5, fogBank: 5 },
  { homingKite: 15, airHorn: 10, tripleFizz: 25, pogoSpring: 5, grappleAnchor: 20, strikeBall: 15, fogBank: 10 },
  { homingKite: 10, tripleFizz: 25, grappleAnchor: 15, strikeBall: 35, fogBank: 15 },
  { tripleFizz: 20, grappleAnchor: 10, strikeBall: 50, fogBank: 20 },
];
export const ITEM_TABLE: readonly Record<string, number>[] = Object.freeze(TABLE_ROWS);

const ALL_IDS = ITEM_DEFINITIONS.map((d) => d.id);

export const ITEMS_CONFIG: Readonly<ItemsConfig> = Object.freeze({
  rouletteSeconds: def<number>('rouletteSeconds'),
  items: [...ITEM_DEFINITIONS],
  table: [...ITEM_TABLE],
  lockoutSeconds: def<number>('lockoutSeconds'),
  finalLapLockoutSeconds: def<number>('finalLapLockoutSeconds'),
  lockedDuringLockout: ['fogBank', 'strikeBall'],
  knockoutPoolByRacers: {
    '8': ALL_IDS,
    '6': ALL_IDS,
    '4': ALL_IDS.filter((id) => id !== 'fogBank' && id !== 'strikeBall'),
    '2': ALL_IDS.filter((id) => id !== 'fogBank' && id !== 'decoyBalloon' && id !== 'strikeBall'),
  },
  ownerGraceSeconds: def<number>('ownerGraceSeconds'),
  spawnAheadMetres: def<number>('spawnAheadMetres'),
  dropBehindMetres: def<number>('dropBehindMetres'),
  projectileHeight: def<number>('projectileHeight'),
  homingSnapDistance: def<number>('homingSnapDistance'),
  homingLateralRate: def<number>('homingLateralRate'),
  maxProjectilesPerOwner: def<number>('maxProjectilesPerOwner'),
  maxKitesPerOwner: def<number>('maxKitesPerOwner'),
  kiteWarnMetres: def<number>('kiteWarnMetres'),
  kiteWarnSeconds: def<number>('kiteWarnSeconds'),
  crossHitHeight: def<number>('crossHitHeight'),
  maxGroundPerOwner: def<number>('maxGroundPerOwner'),
  trailBehindMetres: def<number>('trailBehindMetres'),
  hitHeight: def<number>('hitHeight'),
});

/** id → role, the map ai-driver takes as `itemRoles`. */
export const ITEM_ROLES: Readonly<Record<string, ItemRole>> = Object.freeze(
  Object.fromEntries(ITEM_DEFINITIONS.map((d) => [d.id, d.role])),
);

export function itemById(cfg: ItemsConfig, id: string): ItemDefinition | undefined {
  return cfg.items.find((d) => d.id === id);
}

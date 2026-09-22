// The item schema instance: the 8 v1 items (design §8), plan §5 numbers, and the
// rank table (docs/sops/items.md Constants and Decisions 2026-09-21). Code reads
// this object; no item number lives anywhere else.
import schema from '../../docs/schemas/item.schema.json';
import type { ItemDefinition, ItemRole, ItemsConfig } from './types.ts';

function def<T>(key: keyof typeof schema.properties): T {
  return (schema.properties[key] as unknown as { default: T }).default;
}

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = Object.freeze([
  {
    id: 'beachBall', name: 'Beach Ball', role: 'forward',
    behaviour: { projectileSpeed: 38, bounces: 3, lifetimeSeconds: 8, radius: 0.6, affects: 'target' },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'beach-ball', sfx: 'ball-bounce',
  },
  {
    id: 'homingKite', name: 'Homing Kite', role: 'homing',
    behaviour: { projectileSpeed: 30, homing: true, lifetimeSeconds: 10, radius: 0.6, affects: 'target' },
    hitEffect: { spinSeconds: 1, dropsItem: false },
    icon: 'kite', sfx: 'kite-whoosh',
  },
  {
    id: 'oilCan', name: 'Oil Can', role: 'rearDrop',
    behaviour: { lifetimeSeconds: 20, radius: 1.2, affects: 'target' },
    hitEffect: { slowTo: 0.5, slowSeconds: 1, dropsItem: false },
    icon: 'oil-can', sfx: 'oil-splash',
  },
  {
    id: 'decoyBalloon', name: 'Decoy Balloon', role: 'deception',
    behaviour: { lifetimeSeconds: 20, radius: 0.9, affects: 'target' },
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
    id: 'rocketLolly', name: 'Rocket Lolly', role: 'speed',
    behaviour: { charges: 3, chargeMultiplier: 2, chargeSeconds: 2, affects: 'self' },
    icon: 'rocket-lolly', sfx: 'lolly-fizz',
  },
  {
    id: 'fogBank', name: 'Fog Bank', role: 'equaliser',
    behaviour: { slowTo: 0.6, durationSeconds: 3, stripsItem: true, minPosition: 5, affects: 'ahead' },
    icon: 'fog-bank', sfx: 'fog-roll',
  },
]);

/** Weights per rank (index 0 = rank 1). Every row sums to 100. */
const TABLE_ROWS: Record<string, number>[] = [
  { beachBall: 25, oilCan: 40, decoyBalloon: 25, bubble: 10 },
  { beachBall: 25, oilCan: 40, decoyBalloon: 25, bubble: 10 },
  { beachBall: 30, homingKite: 25, oilCan: 15, bubble: 15, rocketLolly: 15 },
  { beachBall: 30, homingKite: 25, oilCan: 15, bubble: 15, rocketLolly: 15 },
  { beachBall: 15, homingKite: 30, airHorn: 15, rocketLolly: 40 },
  { beachBall: 15, homingKite: 30, airHorn: 15, rocketLolly: 40 },
  { homingKite: 20, rocketLolly: 55, fogBank: 25 },
  { homingKite: 20, rocketLolly: 55, fogBank: 25 },
];
export const ITEM_TABLE: readonly Record<string, number>[] = Object.freeze(TABLE_ROWS);

const ALL_IDS = ITEM_DEFINITIONS.map((d) => d.id);

export const ITEMS_CONFIG: Readonly<ItemsConfig> = Object.freeze({
  rouletteSeconds: def<number>('rouletteSeconds'),
  items: [...ITEM_DEFINITIONS],
  table: [...ITEM_TABLE],
  lockoutSeconds: def<number>('lockoutSeconds'),
  finalLapLockoutSeconds: def<number>('finalLapLockoutSeconds'),
  lockedDuringLockout: ['fogBank'],
  knockoutPoolByRacers: {
    '8': ALL_IDS,
    '6': ALL_IDS,
    '4': ALL_IDS.filter((id) => id !== 'fogBank'),
    '2': ALL_IDS.filter((id) => id !== 'fogBank' && id !== 'decoyBalloon'),
  },
  ownerGraceSeconds: def<number>('ownerGraceSeconds'),
  spawnAheadMetres: def<number>('spawnAheadMetres'),
  dropBehindMetres: def<number>('dropBehindMetres'),
  projectileHeight: def<number>('projectileHeight'),
  homingSnapDistance: def<number>('homingSnapDistance'),
  homingLateralRate: def<number>('homingLateralRate'),
  maxProjectilesPerOwner: def<number>('maxProjectilesPerOwner'),
  maxGroundPerOwner: def<number>('maxGroundPerOwner'),
});

/** id → role, the map ai-driver takes as `itemRoles`. */
export const ITEM_ROLES: Readonly<Record<string, ItemRole>> = Object.freeze(
  Object.fromEntries(ITEM_DEFINITIONS.map((d) => [d.id, d.role])),
);

export function itemById(cfg: ItemsConfig, id: string): ItemDefinition | undefined {
  return cfg.items.find((d) => d.id === id);
}

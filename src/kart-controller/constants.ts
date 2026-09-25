// Reads the `default` values out of docs/schemas/kart.schema.json, applies the racer's class, the
// chosen kart (karts.ts) and the cc scale, and hands back one frozen object.
// No magic numbers anywhere else in the controller.
import schema from '../../docs/schemas/kart.schema.json';
import { ARCHETYPES, comboStats, kartFor, type ArchetypeStats } from './karts.ts';
import type { Archetype, SpeedClass, Surface } from './types.ts';

export { ARCHETYPES, type ArchetypeStats };

export interface KartBase {
  topSpeed: number; accel: number; brake: number; steerRate: number;
  driftSteerMin: number; driftSteerMax: number; driftYawLag: number; airSteer: number; gripDrift: number; bumpSeparateRate: number; hopSeconds: number;
  chargeFull: number; chargeNeutral: number; driftTiers: number[];
  boostMultiplier: number; boostSeconds: number[];
  trickMultiplier: number; trickSeconds: number;
  padMultiplier: number; padSeconds: number;
  itemSpeedMultiplier: number; itemSpeedSeconds: number;
  slipstreamSeconds: number; slipstreamMultiplier: number; slipstreamBoostSeconds: number;
  coinBonusEach: number; coinCap: number;
  gripRoad: number; gripOffroad: number; gripMud: number; gripIce: number;
  surfaceSpeed: Record<Surface, number>;
  boostIgnoresSurfaceCap: boolean; airborneIgnoresSurfaceCap: boolean;
  gravity: number; hopVelocity: number; coastDecel: number; overSpeedDecel: number;
  reverseFraction: number; steerFalloff: number; driftMinSpeed: number; driftKeepSpeed: number;
  driftAirCancelSeconds: number; kartRadius: number; groundStick: number; groundLaunchVy: number;
  wallRestitution: number; wallScrub: number; wallDeflect: number; wallDeflectRate: number; groundCatch: number; startBoostCentreSeconds: number; slipstreamLength: number; slipstreamHalfWidth: number;
  tSearchWindow: number; driftVisualSlip: number; dashMassBonus: number; shieldMassBonus: number;
  coinShield: { enabled: boolean; slowedTo: number; slowSeconds: number };
  wallCooldownSeconds: number; bumpCooldownSeconds: number; hardWallFraction: number;
  slipstreamSameWayDot: number; hopLandWindow: number; maxBoostMultiplier: number;
  startBoostWindowSeconds: number; startBoostMultiplier: number; startBoostSeconds: number;
  bumpForce: number; hitSpinSeconds: number; hitCoinsLost: number;
  rideSpeedMultiplier: number; rideLookahead: number; rideMassBonus: number; rideRadius: number;
  pilotTurnRate: number; pilotAccel: number; towSpeedMultiplier: number; towSideOffset: number; towFollowRoad: number;
  springLaunch: number; slamSpeed: number; fallCatchDepth: number; loopSpeedFactor: number; wallEndOvershoot: number; wallEndPushRate: number;
  accelLaunch: number; accelTaper: number; contactHeight: number; trickBufferSeconds: number; driftLateSteer: number;
  airGrip: number; steerLowSpeed: number; lipZone: number;
  speedClasses: Record<'50' | '100' | '150', number>;
}

export interface KartConstants extends KartBase {
  archetype: Archetype;
  cc: SpeedClass;
  /** the combined line: the class with the kart's stats in place of the racer's own kart's (karts.ts comboStats) */
  stats: Readonly<ArchetypeStats>;
  /** the kart driven (kart.schema.json karts id): the one asked for, or the racer's own; '' for an unknown racer (karts.ts kartFor) */
  kartId: string;
  /** base.topSpeed before cc and archetype; tests and the boost cap use it. */
  baseTopSpeed: number;
  /** 1 + weight; collision mass before dash and shield bonuses. */
  mass: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkDefaults(props: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    if ('default' in def) out[key] = structuredClone(def.default);
    else if (def.type === 'object' && def.properties) out[key] = walkDefaults(def.properties);
  }
  return out;
}

export const BASE: Readonly<KartBase> = Object.freeze(
  walkDefaults(schema.properties.base.properties) as unknown as KartBase,
);

/**
 * The constants of `racerId` (class `archetype`) in `kartId` at `cc` (design §5). Without a kart, or
 * with an unknown one, the racer drives their own kart: exactly the class, as before karts existed.
 * An unknown racer (or none) takes the class alone.
 */
export function makeConstants(archetype: Archetype, cc: SpeedClass, racerId = '', kartId?: string): Readonly<KartConstants> {
  const stats = comboStats(racerId, kartId, archetype);
  const ccScale = BASE.speedClasses[String(cc) as '50' | '100' | '150'];
  return Object.freeze({
    ...structuredClone(BASE as KartBase),
    archetype, cc, stats, kartId: kartFor(racerId, kartId),
    baseTopSpeed: BASE.topSpeed,
    topSpeed: BASE.topSpeed * ccScale * (1 + stats.speed),
    accel: BASE.accel * (1 + stats.accel),
    steerRate: BASE.steerRate * (1 + stats.handling),
    mass: 1 + stats.weight,
  });
}

export function gripFor(c: KartBase, surface: Surface): number {
  switch (surface) {
    case 'dirt': return c.gripOffroad;
    case 'mud': return c.gripMud;
    case 'ice': return c.gripIce;
    default: return c.gripRoad;
  }
}

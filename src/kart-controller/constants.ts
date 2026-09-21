// Reads the `default` values out of docs/schemas/kart.schema.json, applies the
// archetype multipliers and the cc scale, and hands back one frozen object.
// No magic numbers anywhere else in the controller.
import schema from '../../docs/schemas/kart.schema.json';
import type { Archetype, SpeedClass, Surface } from './types.ts';

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
  tSearchWindow: number; driftVisualSlip: number; dashMassBonus: number;
  coinShield: { enabled: boolean; slowedTo: number; slowSeconds: number };
  wallCooldownSeconds: number; bumpCooldownSeconds: number; hardWallFraction: number;
  slipstreamSameWayDot: number; hopLandWindow: number; maxBoostMultiplier: number;
  startBoostWindowSeconds: number; startBoostMultiplier: number; startBoostSeconds: number;
  bumpForce: number; hitSpinSeconds: number; hitCoinsLost: number;
  speedClasses: Record<'50' | '100' | '150', number>;
}

export interface ArchetypeStats {
  speed: number; accel: number; handling: number; weight: number;
  hook: 'none' | 'hardBump';
}

/** design.md §4. Multipliers on the shared base. */
export const ARCHETYPES: Readonly<Record<Archetype, ArchetypeStats>> = Object.freeze({
  light: { speed: -0.08, accel: 0.12, handling: 0.12, weight: -0.15, hook: 'none' },
  medium: { speed: 0, accel: 0, handling: 0, weight: 0, hook: 'none' },
  heavy: { speed: 0.10, accel: -0.12, handling: -0.10, weight: 0.18, hook: 'hardBump' },
});

export interface KartConstants extends KartBase {
  archetype: Archetype;
  cc: SpeedClass;
  stats: ArchetypeStats;
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

export function makeConstants(archetype: Archetype, cc: SpeedClass): Readonly<KartConstants> {
  const stats = ARCHETYPES[archetype];
  const ccScale = BASE.speedClasses[String(cc) as '50' | '100' | '150'];
  return Object.freeze({
    ...structuredClone(BASE as KartBase),
    archetype, cc, stats,
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

// Any racer in any kart (design §5; Adam, 25 Sept 2026, option B: like Mario Kart World). The three
// classes, the ten karts and the fairness rules, all read from docs/schemas/kart.schema.json, and the
// combine rule: a racer's handling is their class with the chosen kart's stats put in place of their
// own kart's. A racer in their own kart (or its twin) gets their class to the last bit, so every gate,
// medal time and stored leaderboard run from before still holds. Pure data, no Three.js; nothing here
// throws: an unknown kart is the racer's own, an unknown racer (test fixtures' 'k0') takes the class alone.
import schema from '../../docs/schemas/kart.schema.json';
import type { Archetype } from './types.ts';

export type StatKey = 'speed' | 'accel' | 'handling' | 'weight';
/** The four stats the racer and kart screens show, in their order. */
export const STAT_KEYS: readonly StatKey[] = Object.freeze(['speed', 'accel', 'handling', 'weight']);
export type KartStats = Record<StatKey, number>;

/** A class's line, or a racer-and-kart pair's combined line (KartConstants.stats). */
export interface ArchetypeStats extends KartStats {
  hook: 'none' | 'hardBump';
}

/** One kart. A twin (Classic, Buggy) carries its twin's numbers, so an unlock changes the look, never the speed. */
export interface KartDef extends KartStats {
  id: string;
  name: string;
  /** the racer whose signature kart it is; absent on a twin */
  owner?: string;
  /** a twin: the owned kart whose stats it has */
  twinOf?: string;
}

const P = schema.properties;

/** design §4. Multipliers on the shared base: a racer in their own kart. */
export const ARCHETYPES: Readonly<Record<Archetype, Readonly<ArchetypeStats>>> = Object.freeze(
  Object.fromEntries(Object.entries(P.archetypes.default).map(([a, s]) => [a, Object.freeze({ ...s } as ArchetypeStats)])) as Record<Archetype, ArchetypeStats>,
);

/** Each racer's class (design §4). */
export const RACER_CLASSES: Readonly<Record<string, Archetype>> = Object.freeze({ ...(P.racerClasses.default as Record<string, Archetype>) });

type Row = { id: string; name: string; owner?: string; twinOf?: string } & Partial<KartStats>;
const ROWS = P.karts.default as Row[];
const numbers = (r: Row | undefined): KartStats => ({ speed: r?.speed ?? 0, accel: r?.accel ?? 0, handling: r?.handling ?? 0, weight: r?.weight ?? 0 });

/** The ten karts in the kart screen's order: the eight signature karts in racer order, then the twins. */
export const KARTS: readonly Readonly<KartDef>[] = Object.freeze(ROWS.map((r) => Object.freeze({
  id: r.id, name: r.name,
  ...(r.owner ? { owner: r.owner } : {}),
  ...(r.twinOf ? { twinOf: r.twinOf } : {}),
  ...numbers(r.twinOf ? ROWS.find((x) => x.id === r.twinOf) : r),
})));
export const KART_IDS: readonly string[] = Object.freeze(KARTS.map((k) => k.id));

const BY_ID: ReadonlyMap<string, Readonly<KartDef>> = new Map(KARTS.map((k) => [k.id, k]));
const OWN: ReadonlyMap<string, string> = new Map(KARTS.filter((k) => k.owner).map((k) => [k.owner as string, k.id]));

/** One step of each stat (0.005 speed = 0.06 accel = 0.06 handling = 0.05 weight). */
export const KART_STEPS: Readonly<KartStats> = Object.freeze(defaultsOf(P.kartSteps.properties) as KartStats);
/** The most whole steps a kart's stat may sit from zero. */
export const KART_LIMITS: Readonly<KartStats> = Object.freeze(defaultsOf(P.kartLimits.properties) as KartStats);
/** [low, high] of every pair's total, per stat; also the ends of the stat bars. */
export const COMBO_BOUNDS: Readonly<Record<StatKey, readonly [number, number]>> = Object.freeze(defaultsOf(P.comboBounds.properties) as Record<StatKey, [number, number]>);
/** The lap-time model a kart is balanced by: speed + accel / accel + handling / handling, within ±balance. */
export const KART_PACE: Readonly<{ accel: number; handling: number; balance: number }> = Object.freeze(defaultsOf(P.kartPace.properties) as { accel: number; handling: number; balance: number });

function defaultsOf(props: Record<string, { default: unknown }>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, structuredClone(v.default)]));
}

export const kartById = (id: string | undefined): Readonly<KartDef> | undefined => (id === undefined ? undefined : BY_ID.get(id));
export const isKartId = (id: unknown): id is string => typeof id === 'string' && BY_ID.has(id);
/** The racer's signature kart, or undefined for a racer the table does not know. */
export const ownKartOf = (racerId: string): string | undefined => OWN.get(racerId);
/** The racer's class, or undefined for a racer the table does not know. */
export const racerClassOf = (racerId: string): Archetype | undefined => RACER_CLASSES[racerId];

/** The kart a racer drives: the one asked for if it exists, else their own; '' for a racer the table does not know (the class alone). */
export function kartFor(racerId: string, kartId?: string): string {
  const own = ownKartOf(racerId);
  if (own === undefined) return '';
  return isKartId(kartId) ? kartId : own;
}

/**
 * The combined line of `racerId` in `kartId` (design §5): for each stat, in exactly this order,
 * class + (kart − own kart). In the racer's own kart the bracket is exactly 0, so the line is the
 * class to the last bit. `archetype` defaults to the racer's class (makeConstants passes its own).
 */
export function comboStats(racerId: string, kartId?: string, archetype: Archetype = racerClassOf(racerId) ?? 'medium'): Readonly<ArchetypeStats> {
  const cls = ARCHETYPES[archetype];
  const own = kartById(ownKartOf(racerId));
  if (!own) return cls; // unknown racer: the class alone
  const k = kartById(kartFor(racerId, kartId)) as Readonly<KartDef>;
  return Object.freeze({
    speed: cls.speed + (k.speed - own.speed),
    accel: cls.accel + (k.accel - own.accel),
    handling: cls.handling + (k.handling - own.handling),
    weight: cls.weight + (k.weight - own.weight),
    hook: cls.hook,
  });
}

/** A kart's predicted effect on lap pace (fraction; kartPace): 0 is a fair trade. */
export function kartPace(s: Readonly<KartStats>): number {
  return s.speed + s.accel / KART_PACE.accel + s.handling / KART_PACE.handling;
}

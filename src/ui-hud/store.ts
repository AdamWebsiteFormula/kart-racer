// The local save (docs/schemas/save.schema.json) through an injected backend, so tests use a fake.
// Bad or missing data never throws: it falls back to defaults field by field.
import { CAST } from './data/cast.ts';
import { DEFAULT_BODY, isBody, skinCard } from './data/cosmetics.ts';

export interface Settings {
  /** the gas down by itself from GO (game/assist.ts): the countdown, and so the start boost, and the brake stay the player's */
  autoAccelerate: boolean;
  /** Steering assist (game/assist.ts): nudges the kart back from the road's edge and away from a drop; strong input wins */
  steeringAssist: boolean;
  quality: 'low' | 'high' | 'auto';
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: 'auto' | 'on' | 'off';
  iconLabels: boolean;
  resolutionScale: number;
  selectedRacerId: string;
  /** the kart body every racer drives (design §10: 'standard', or an unlocked 'classic' / 'buggy') */
  selectedBodyId: string;
  /** each racer's unlocked alt paint, by racer id (absent: their own colours) */
  skinByRacer: Record<string, string>;
}

export interface Save {
  version: number;
  playerName: string;
  stats: { ultraTurbos: number; racesFinished: number; itemsHit: number };
  /** `ghost`: the best run's path (race-manager/ghost.ts), kept only with the best time it drove; `paint`, `body`: the look it was set in (the ghost is drawn so) */
  timeTrial: Record<string, { bestMs: number; medal: 'none' | 'bronze' | 'silver' | 'gold'; racerId?: string; ghost?: string; paint?: string; body?: string }>;
  grandPrix: Record<string, Record<string, { finished: boolean; stars: number; bestPoints?: number }>>;
  knockout: Record<string, { finished: boolean; won: boolean; bestPlacing?: number }>;
  unlocked: { skins: string[]; bodies: string[]; mirror: boolean };
  settings: Settings;
}

export interface Backend { getItem(key: string): string | null; setItem(key: string, value: string): void }

export const SAVE_KEY = 'kart-racer.save.v1';
export const SAVE_VERSION = 1;

export function defaultSettings(): Settings {
  return { autoAccelerate: false, steeringAssist: false, quality: 'auto', masterVolume: 0.8, musicVolume: 0.7, sfxVolume: 0.8, reducedMotion: 'auto', iconLabels: false, resolutionScale: 1, selectedRacerId: 'pip', selectedBodyId: DEFAULT_BODY, skinByRacer: {} };
}

export function defaultSave(): Save {
  return {
    version: SAVE_VERSION, playerName: 'Player',
    stats: { ultraTurbos: 0, racesFinished: 0, itemsHit: 0 },
    timeTrial: {}, grandPrix: {}, knockout: {},
    unlocked: { skins: [], bodies: [], mirror: false },
    settings: defaultSettings(),
  };
}

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Keep the entries `f` can read (it returns undefined to drop one); never a prototype key. */
function entries<T>(v: unknown, f: (x: Record<string, unknown>) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, x] of Object.entries(obj(v))) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype' || !x || typeof x !== 'object' || Array.isArray(x)) continue;
    const e = f(x as Record<string, unknown>);
    if (e !== undefined) out[k] = e;
  }
  return out;
}
const int = (v: unknown, lo: number, hi: number): number | undefined => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : undefined);
const MEDALS = ['none', 'bronze', 'silver', 'gold'] as const;
const isRacer = (id: string) => CAST.some((c) => c.id === id);
/** save.schema.json timeTrial.ghost maxLength */
const GHOST_MAX_CHARS = 200_000;

/**
 * The records, entry by entry: a hand-edited or foreign save (every Pages site on the account shares
 * this storage) must not crash a menu or strand a race's results (red-team 2026-09-24).
 */
function sanitiseRecords(r: Record<string, unknown>): Pick<Save, 'timeTrial' | 'grandPrix' | 'knockout'> {
  return {
    timeTrial: entries(r.timeTrial, (x) => {
      if (typeof x.bestMs !== 'number' || !(x.bestMs > 0) || !Number.isFinite(x.bestMs)) return undefined;
      const racerId = typeof x.racerId === 'string' && isRacer(x.racerId) ? x.racerId : undefined;
      // a ghost is kept only with the racer who drove it (the ghost kart is drawn as them)
      const ghost = racerId && typeof x.ghost === 'string' && x.ghost.length <= GHOST_MAX_CHARS && /^[A-Za-z0-9+/]*={0,2}$/.test(x.ghost) ? x.ghost : undefined;
      // the look the ghost is drawn in: a paint only for the racer it belongs to, a body only a known one
      const paint = ghost && typeof x.paint === 'string' && skinCard(x.paint)?.racerId === racerId ? x.paint : undefined;
      const body = ghost && typeof x.body === 'string' && x.body !== DEFAULT_BODY && isBody(x.body) ? x.body : undefined;
      return { bestMs: x.bestMs, medal: oneOf(x.medal, MEDALS, 'none'), ...(racerId ? { racerId } : {}), ...(ghost ? { ghost } : {}), ...(paint ? { paint } : {}), ...(body ? { body } : {}) };
    }),
    grandPrix: entries(r.grandPrix, (cup) => entries(cup, (x) => {
      const stars = int(x.stars, 0, 3);
      if (stars === undefined) return undefined;
      const best = int(x.bestPoints, 0, 1e6);
      return { finished: x.finished === true, stars, ...(best !== undefined ? { bestPoints: best } : {}) };
    })),
    knockout: entries(r.knockout, (x) => {
      const best = int(x.bestPlacing, 1, 8);
      return { finished: x.finished === true, won: x.won === true, ...(best !== undefined ? { bestPlacing: best } : {}) };
    }),
  };
}

/** Unlocked ids, known ones only, each once (a foreign or hand-edited save cannot unlock a look that does not exist). */
function sanitiseUnlocked(raw: unknown): Save['unlocked'] {
  const u = obj(raw);
  const list = (v: unknown, ok: (id: string) => boolean) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok(x)))] : []);
  return { skins: list(u.skins, (id) => skinCard(id) !== undefined), bodies: list(u.bodies, (id) => id !== DEFAULT_BODY && isBody(id)), mirror: u.mirror === true };
}

/** Each racer's paint, kept only where the racer exists, the paint is theirs and it is unlocked. */
function sanitiseSkins(raw: unknown, unlocked: Save['unlocked']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [racerId, id] of Object.entries(obj(raw))) {
    if (typeof id !== 'string' || !isRacer(racerId) || skinCard(id)?.racerId !== racerId || !unlocked.skins.includes(id)) continue;
    out[racerId] = id;
  }
  return out;
}

function sanitiseSettings(raw: unknown, unlocked: Save['unlocked'] = { skins: [], bodies: [], mirror: false }): Settings {
  const r = obj(raw), d = defaultSettings();
  return {
    autoAccelerate: typeof r.autoAccelerate === 'boolean' ? r.autoAccelerate : d.autoAccelerate,
    steeringAssist: typeof r.steeringAssist === 'boolean' ? r.steeringAssist : d.steeringAssist,
    quality: oneOf(r.quality, ['low', 'high', 'auto'] as const, d.quality),
    masterVolume: num(r.masterVolume, 0, 1, d.masterVolume),
    musicVolume: num(r.musicVolume, 0, 1, d.musicVolume),
    sfxVolume: num(r.sfxVolume, 0, 1, d.sfxVolume),
    reducedMotion: oneOf(r.reducedMotion, ['auto', 'on', 'off'] as const, d.reducedMotion),
    iconLabels: typeof r.iconLabels === 'boolean' ? r.iconLabels : d.iconLabels,
    resolutionScale: num(r.resolutionScale, 0.5, 1, d.resolutionScale),
    // an id that is no racer (a foreign save, a renamed cast) would start a race with no player (audit 24 Sept 2026)
    selectedRacerId: typeof r.selectedRacerId === 'string' && isRacer(r.selectedRacerId) ? r.selectedRacerId : d.selectedRacerId,
    // a body or paint that is unknown, or not unlocked in this save, falls back to the racer's own
    selectedBodyId: typeof r.selectedBodyId === 'string' && isBody(r.selectedBodyId) && (r.selectedBodyId === DEFAULT_BODY || unlocked.bodies.includes(r.selectedBodyId)) ? r.selectedBodyId : d.selectedBodyId,
    skinByRacer: sanitiseSkins(r.skinByRacer, unlocked),
  };
}

export function loadSave(b: Backend | null): Save {
  const d = defaultSave();
  let raw: unknown = null;
  try { raw = JSON.parse(b?.getItem(SAVE_KEY) ?? 'null'); } catch { raw = null; }
  const r = obj(raw);
  const stats = obj(r.stats);
  const unlocked = sanitiseUnlocked(r.unlocked);
  return {
    version: SAVE_VERSION,
    playerName: typeof r.playerName === 'string' ? r.playerName.slice(0, 16) : d.playerName,
    stats: { ultraTurbos: num(stats.ultraTurbos, 0, 1e9, 0), racesFinished: num(stats.racesFinished, 0, 1e9, 0), itemsHit: num(stats.itemsHit, 0, 1e9, 0) },
    ...sanitiseRecords(r),
    unlocked,
    settings: sanitiseSettings(r.settings, unlocked),
  };
}

export function writeSave(b: Backend | null, s: Save): void {
  try { b?.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode or full: the game still runs */ }
}

/** The browser backend, or null where storage throws (private windows, blocked site data). */
export function browserBackend(): Backend | null {
  try {
    const ls = globalThis.localStorage;
    const probe = '__kr_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/** Reduced motion is on when the setting says so, or when it is auto and the OS asks for it. */
export function reducedMotion(s: Settings, osPrefersReduced: boolean): boolean {
  return s.reducedMotion === 'on' || (s.reducedMotion === 'auto' && osPrefersReduced);
}

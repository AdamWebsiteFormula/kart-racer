// The local save (docs/schemas/save.schema.json) through an injected backend, so tests use a fake.
// Bad or missing data never throws: it falls back to defaults field by field.
import { UI } from './constants.ts';
import { CAST } from './data/cast.ts';
import { DEFAULT_BODY, isBody, skinCard } from './data/cosmetics.ts';
import { isKart, kartCard, kartLocked } from './data/karts.ts';

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
  /**
   * The kart the player races in, any racer in any kart (design §5; data/karts.ts ids), saved when a kart is
   * chosen; absent: each racer drives their own. On load a kart that is unknown or a twin still locked is
   * dropped; with karts picked (UI.kartPick) an old selectedBodyId of classic or buggy seeds it once.
   */
  selectedKartId?: string;
}

export interface Save {
  version: number;
  playerName: string;
  stats: { ultraTurbos: number; racesFinished: number; itemsHit: number };
  /** `ghost`: the best run's path (race-manager/ghost.ts), kept only with the best time it drove; `paint`, `body`: the look it was set in (the ghost is drawn so);
   *  `splitsMs`: the best run's time at each lap line from the start, the last its finish (a run races it lap by lap; a best from before it has none);
   *  `kart`: the kart the best was set in (design §5; absent: the racer's own), its ghost drawn in it (an old best's `body` maps to it) */
  timeTrial: Record<string, { bestMs: number; medal: 'none' | 'bronze' | 'silver' | 'gold'; racerId?: string; ghost?: string; paint?: string; body?: string; splitsMs?: number[]; kart?: string }>;
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
/** save.schema.json timeTrial.splitsMs maxItems */
const SPLITS_MAX = 20;

/** A best's lap lines, when they are lap lines of that best: rising whole ms from the start, the last its time; else none (an old or hand-edited save still loads). */
function splits(v: unknown, bestMs: number): number[] | undefined {
  if (!Array.isArray(v) || v.length < 1 || v.length > SPLITS_MAX) return undefined;
  let prev = 0;
  for (const x of v) {
    if (!Number.isInteger(x) || x <= prev) return undefined;
    prev = x;
  }
  return prev === bestMs ? [...v] as number[] : undefined;
}

/**
 * The records, entry by entry: a hand-edited or foreign save (every Pages site on the account shares
 * this storage) must not crash a menu or strand a race's results (red-team 2026-09-24).
 */
function sanitiseRecords(r: Record<string, unknown>, kartPick: boolean): Pick<Save, 'timeTrial' | 'grandPrix' | 'knockout'> {
  return {
    timeTrial: entries(r.timeTrial, (x) => {
      if (typeof x.bestMs !== 'number' || !(x.bestMs > 0) || !Number.isFinite(x.bestMs)) return undefined;
      const racerId = typeof x.racerId === 'string' && isRacer(x.racerId) ? x.racerId : undefined;
      // a ghost is kept only with the racer who drove it (the ghost kart is drawn as them)
      const ghost = racerId && typeof x.ghost === 'string' && x.ghost.length <= GHOST_MAX_CHARS && /^[A-Za-z0-9+/]*={0,2}$/.test(x.ghost) ? x.ghost : undefined;
      // the look the ghost is drawn in: a paint only for the racer it belongs to, a body only a known one
      const paint = ghost && typeof x.paint === 'string' && skinCard(x.paint)?.racerId === racerId ? x.paint : undefined;
      const body = ghost && typeof x.body === 'string' && x.body !== DEFAULT_BODY && isBody(x.body) ? x.body : undefined;
      const splitsMs = splits(x.splitsMs, x.bestMs);
      // the kart it was set in: a known one; with karts picked, an old best's body (Classic, Buggy) is its kart
      const kart = isKart(x.kart) ? x.kart : kartPick && body && isKart(body) ? body : undefined;
      return {
        bestMs: x.bestMs, medal: oneOf(x.medal, MEDALS, 'none'), ...(racerId ? { racerId } : {}), ...(ghost ? { ghost } : {}), ...(paint ? { paint } : {}), ...(body ? { body } : {}),
        ...(splitsMs ? { splitsMs } : {}), ...(kart ? { kart } : {}),
      };
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

/**
 * The chosen kart: a known one, and a twin only once unlocked. With karts picked (UI.kartPick) and none
 * chosen yet, an old body of Classic or Buggy (the garage's Body row, before any racer could take any kart)
 * seeds it, once: the kart is saved from then on and the body is never written again.
 */
function sanitiseKart(r: Record<string, unknown>, unlocked: Save['unlocked'], kartPick: boolean): string | undefined {
  const ok = (id: unknown): id is string => isKart(id) && !kartLocked(kartCard(id)!, unlocked.bodies);
  if (r.selectedKartId !== undefined) return ok(r.selectedKartId) ? r.selectedKartId : undefined;
  return kartPick && ok(r.selectedBodyId) ? r.selectedBodyId : undefined;
}

function sanitiseSettings(raw: unknown, unlocked: Save['unlocked'] = { skins: [], bodies: [], mirror: false }, kartPick = false): Settings {
  const r = obj(raw), d = defaultSettings();
  const kart = sanitiseKart(r, unlocked, kartPick);
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
    ...(kart ? { selectedKartId: kart } : {}),
  };
}

/** `kartPick`: the ship switch (UI.kartPick): on, an old save's Classic or Buggy body becomes its kart (sanitiseKart, and a Time Trial best's). */
export function loadSave(b: Backend | null, kartPick: boolean = UI.kartPick): Save {
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
    ...sanitiseRecords(r, kartPick),
    unlocked,
    settings: sanitiseSettings(r.settings, unlocked, kartPick),
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

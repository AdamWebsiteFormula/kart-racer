// The local save (docs/schemas/save.schema.json) through an injected backend, so tests use a fake.
// Bad or missing data never throws: it falls back to defaults field by field.
export interface Settings {
  quality: 'low' | 'high' | 'auto';
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: 'auto' | 'on' | 'off';
  iconLabels: boolean;
  resolutionScale: number;
  selectedRacerId: string;
}

export interface Save {
  version: number;
  playerName: string;
  stats: { ultraTurbos: number; racesFinished: number; itemsHit: number };
  timeTrial: Record<string, { bestMs: number; medal: 'none' | 'bronze' | 'silver' | 'gold'; racerId?: string }>;
  grandPrix: Record<string, Record<string, { finished: boolean; stars: number; bestPoints?: number }>>;
  knockout: Record<string, { finished: boolean; won: boolean; bestPlacing?: number }>;
  unlocked: { skins: string[]; bodies: string[]; mirror: boolean };
  settings: Settings;
}

export interface Backend { getItem(key: string): string | null; setItem(key: string, value: string): void }

export const SAVE_KEY = 'kart-racer.save.v1';
export const SAVE_VERSION = 1;

export function defaultSettings(): Settings {
  return { quality: 'auto', masterVolume: 0.8, musicVolume: 0.7, sfxVolume: 0.8, reducedMotion: 'auto', iconLabels: false, resolutionScale: 1, selectedRacerId: 'pip' };
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

function sanitiseSettings(raw: unknown): Settings {
  const r = obj(raw), d = defaultSettings();
  return {
    quality: oneOf(r.quality, ['low', 'high', 'auto'] as const, d.quality),
    masterVolume: num(r.masterVolume, 0, 1, d.masterVolume),
    musicVolume: num(r.musicVolume, 0, 1, d.musicVolume),
    sfxVolume: num(r.sfxVolume, 0, 1, d.sfxVolume),
    reducedMotion: oneOf(r.reducedMotion, ['auto', 'on', 'off'] as const, d.reducedMotion),
    iconLabels: typeof r.iconLabels === 'boolean' ? r.iconLabels : d.iconLabels,
    resolutionScale: num(r.resolutionScale, 0.5, 1, d.resolutionScale),
    selectedRacerId: typeof r.selectedRacerId === 'string' ? r.selectedRacerId : d.selectedRacerId,
  };
}

export function loadSave(b: Backend | null): Save {
  const d = defaultSave();
  let raw: unknown = null;
  try { raw = JSON.parse(b?.getItem(SAVE_KEY) ?? 'null'); } catch { raw = null; }
  const r = obj(raw);
  const stats = obj(r.stats);
  const unlocked = obj(r.unlocked);
  return {
    version: SAVE_VERSION,
    playerName: typeof r.playerName === 'string' ? r.playerName.slice(0, 16) : d.playerName,
    stats: { ultraTurbos: num(stats.ultraTurbos, 0, 1e9, 0), racesFinished: num(stats.racesFinished, 0, 1e9, 0), itemsHit: num(stats.itemsHit, 0, 1e9, 0) },
    timeTrial: obj(r.timeTrial) as Save['timeTrial'],
    grandPrix: obj(r.grandPrix) as Save['grandPrix'],
    knockout: obj(r.knockout) as Save['knockout'],
    unlocked: {
      skins: Array.isArray(unlocked.skins) ? unlocked.skins.filter((x): x is string => typeof x === 'string') : [],
      bodies: Array.isArray(unlocked.bodies) ? unlocked.bodies.filter((x): x is string => typeof x === 'string') : [],
      mirror: unlocked.mirror === true,
    },
    settings: sanitiseSettings(r.settings),
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

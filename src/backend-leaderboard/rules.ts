// What a leaderboard run is, shared by the game and the server: the solo race config, the daily
// track and seed, and the submission field checks (docs/schemas/score.schema.json). Pure.
import type { RaceConfig, RaceMode } from '../race-manager/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';

export type BoardMode = 'timeTrial' | 'daily';
export const BOARD_MODES: readonly BoardMode[] = ['timeTrial', 'daily'];
export const CLIENT_VERSION = '1';
export const MAX_LOG_BYTES = 256 * 1024;
export const MIN_TIME_MS = 30_000;
/** Yesterday's Daily still takes posts this long after midnight UTC (a race started just before). */
export const DAILY_GRACE_MINUTES = 15;

/** Minutes since midnight UTC. */
export const minutesIntoUtcDay = (d = new Date()): number => d.getUTCHours() * 60 + d.getUTCMinutes();

/**
 * The rate limit's key for an address: IPv4 as it is, IPv6 by its /64 (one home or phone owns a
 * whole /64, so counting single addresses would let it rotate past the limit).
 */
export function ipBucket(ip: string): string {
  const a = ip.trim().toLowerCase();
  if (!a.includes(':')) return a;
  if (a.includes('.')) return a.slice(a.lastIndexOf(':') + 1); // IPv4-mapped (::ffff:1.2.3.4)
  const [head, tail] = a.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = a.includes('::') ? [...h, ...Array<string>(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : a.split(':');
  return `${groups.slice(0, 4).map((g) => (parseInt(g || '0', 16) || 0).toString(16)).join(':')}::/64`;
}

export interface Submission {
  name: string;
  trackId: string;
  mode: BoardMode;
  dailySeed?: number;
  speedClass: 150;
  timeMs: number;
  lapTimesMs?: number[];
  racerId: string;
  inputLog: string;
  clientVersion: string;
}

/** UTC date as YYYYMMDD: the same seed for everyone, everywhere, all day. */
export function dailySeed(d = new Date()): number {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** The day's track: stable across client and server because the ids are sorted first. */
export function dailyTrack(seed: number, trackIds: readonly string[]): string {
  const ids = [...trackIds].sort();
  return ids[seed % ids.length];
}

export const isBoardMode = (m: RaceMode | string): m is BoardMode => m === 'timeTrial' || m === 'daily';

/** The exact race a leaderboard run is: solo, 150cc, seed 0 for Time Trial, the date seed for Daily. */
export function soloConfig(mode: BoardMode, trackId: string, racerId: string, seed: number): RaceConfig {
  const c = CAST.find((x) => x.id === racerId);
  return {
    mode, trackId, speedClass: 150, seed: mode === 'timeTrial' ? 0 : seed,
    racers: [{ racerId, archetype: c?.archetype ?? 'medium', isPlayer: true }],
  };
}

/** Today's Daily: the day's track and seed. */
export function dailyConfig(racerId: string, trackIds: readonly string[], today = dailySeed()): RaceConfig {
  return soloConfig('daily', dailyTrack(today, trackIds), racerId, today);
}

/**
 * The race a restart reloads: the same one, except a Daily, which is always today's. Yesterday's
 * closes DAILY_GRACE_MINUTES after midnight UTC, so a run restarted on it could not be posted.
 */
export function restartConfig(config: RaceConfig, trackIds: readonly string[], today = dailySeed()): RaceConfig {
  if (config.mode !== 'daily') return config;
  return dailyConfig((config.racers.find((r) => r.isPlayer) ?? config.racers[0]).racerId, trackIds, today);
}

const WORDS = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'penis', 'vagina', 'cock', 'dick', 'pussy', 'twat', 'wank', 'retard'];

/** Letters only, leetspeak folded, so "sh1t" and "S H I T" both match. */
function fold(s: string): string {
  return s.toLowerCase().replace(/[013457@$]/g, (c) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' } as Record<string, string>)[c]).replace(/[^a-z]/g, '');
}

export function cleanName(name: string): boolean {
  const f = fold(name);
  return !WORDS.some((w) => f.includes(w));
}

/** Field checks. Returns the first problem, or null when the payload is well formed. */
export function checkSubmission(p: unknown, trackIds: readonly string[], today = dailySeed(), minutesIntoDay = minutesIntoUtcDay()): string | null {
  if (!p || typeof p !== 'object') return 'payload must be an object';
  const s = p as Record<string, unknown>;
  if (typeof s.name !== 'string' || !/^[A-Za-z0-9 _-]{1,16}$/.test(s.name) || !s.name.trim()) return 'name must be 1–16 letters, digits, spaces, _ or -';
  if (!cleanName(s.name)) return 'please pick another name';
  if (typeof s.trackId !== 'string' || !trackIds.includes(s.trackId)) return 'unknown track';
  if (typeof s.mode !== 'string' || !isBoardMode(s.mode)) return 'mode must be timeTrial or daily';
  if (s.speedClass !== 150) return 'leaderboards are 150cc only';
  if (typeof s.racerId !== 'string' || !CAST.some((c) => c.id === s.racerId)) return 'unknown racer';
  if (!Number.isInteger(s.timeMs) || (s.timeMs as number) < MIN_TIME_MS) return 'time is not a whole number of milliseconds of at least 30 s';
  if (typeof s.inputLog !== 'string' || s.inputLog.length === 0 || s.inputLog.length > MAX_LOG_BYTES) return 'input log missing or too large';
  if (s.clientVersion !== CLIENT_VERSION) return 'please reload the game: new version';
  if (s.mode === 'daily') {
    // today, or yesterday in the first minutes after midnight UTC (a race started just before)
    const lateOk = s.dailySeed === prevDay(today) && minutesIntoDay < DAILY_GRACE_MINUTES;
    if (!Number.isInteger(s.dailySeed) || (s.dailySeed !== today && !lateOk)) return 'that daily challenge is closed';
    if (s.trackId !== dailyTrack(s.dailySeed as number, trackIds)) return 'wrong track for that day';
  }
  return null;
}

function prevDay(seed: number): number {
  const y = Math.floor(seed / 10000), m = Math.floor(seed / 100) % 100, d = seed % 100;
  return dailySeed(new Date(Date.UTC(y, m - 1, d) - 86_400_000));
}

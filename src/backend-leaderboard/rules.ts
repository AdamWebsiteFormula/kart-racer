// What a leaderboard run is, shared by the game and the server: the solo race config, the daily
// track and seed, and the submission field checks (docs/schemas/score.schema.json). Pure.
import type { RaceConfig, RaceMode } from '../race-manager/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';

export type BoardMode = 'timeTrial' | 'daily';
export const BOARD_MODES: readonly BoardMode[] = ['timeTrial', 'daily'];
export const CLIENT_VERSION = '1';
export const MAX_LOG_BYTES = 256 * 1024;
export const MIN_TIME_MS = 30_000;

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
export function checkSubmission(p: unknown, trackIds: readonly string[], today = dailySeed()): string | null {
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
    // today or yesterday (a race that started just before midnight UTC still counts)
    if (!Number.isInteger(s.dailySeed) || (s.dailySeed !== today && s.dailySeed !== prevDay(today))) return 'that daily challenge is closed';
    if (s.trackId !== dailyTrack(s.dailySeed as number, trackIds)) return 'wrong track for that day';
  }
  return null;
}

function prevDay(seed: number): number {
  const y = Math.floor(seed / 10000), m = Math.floor(seed / 100) % 100, d = seed % 100;
  return dailySeed(new Date(Date.UTC(y, m - 1, d) - 86_400_000));
}

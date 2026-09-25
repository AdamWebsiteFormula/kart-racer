// What a leaderboard run is, shared by the game and the server: the solo race config, the daily
// track and seed, and the submission field checks (docs/schemas/score.schema.json). Pure.
import { isKartId } from '../kart-controller/karts.ts';
import type { RaceConfig, RaceMode } from '../race-manager/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';

export type BoardMode = 'timeTrial' | 'daily';
export const BOARD_MODES: readonly BoardMode[] = ['timeTrial', 'daily'];
/** 6 (26 Sept 2026): a run names its kart (any racer in any kart), and the server replays it in that kart. */
export const CLIENT_VERSION = '6';
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
  /** the kart the run was raced in (kart-controller karts.ts; Classic and Buggy allowed): the server replays it in this kart */
  kartId: string;
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

/**
 * The exact race a leaderboard run is: solo, 150cc, seed 0 for Time Trial, the date seed for Daily,
 * in `kartId` (absent or null: the racer's own kart, as every run before 26 Sept 2026 was).
 */
export function soloConfig(mode: BoardMode, trackId: string, racerId: string, seed: number, kartId?: string | null): RaceConfig {
  const c = CAST.find((x) => x.id === racerId);
  return {
    mode, trackId, speedClass: 150, seed: mode === 'timeTrial' ? 0 : seed,
    racers: [{ racerId, archetype: c?.archetype ?? 'medium', isPlayer: true, ...(kartId ? { kartId } : {}) }],
  };
}

/** Today's Daily: the day's track and seed. */
export function dailyConfig(racerId: string, trackIds: readonly string[], today = dailySeed(), kartId?: string | null): RaceConfig {
  return soloConfig('daily', dailyTrack(today, trackIds), racerId, today, kartId);
}

/**
 * The race a restart reloads: the same one, except a Daily, which is always today's (in the same
 * racer and kart). Yesterday's closes DAILY_GRACE_MINUTES after midnight UTC, so a run restarted on it could not be posted.
 */
export function restartConfig(config: RaceConfig, trackIds: readonly string[], today = dailySeed()): RaceConfig {
  if (config.mode !== 'daily') return config;
  const p = config.racers.find((r) => r.isPlayer) ?? config.racers[0];
  return dailyConfig(p.racerId, trackIds, today, p.kartId);
}

/** Rude wherever they turn up, even across the gaps ("F U C K", "Dick Head"). */
const ANYWHERE = ['fuck', 'cunt', 'nigg', 'bitch', 'whore', 'retard', 'hitler', 'penis', 'vagina', 'pussy', 'faggot', 'wanker', 'dickhead', 'shithead', 'cocksuck', 'wetback', 'kkk', 'siegheil',
  // red-team 3 (24 Sept 2026): the everyday ones a kid tries first
  'asshole', 'arsehole', 'bastard', 'biatch', 'bollock', 'dildo', 'jizz', 'porn', 'fcuk'];
/**
 * Rude only as a whole word or its plural: the same letters sit inside ordinary names and tags
 * (Dickson, Hancock, Nazim, Fagan, Draper, Swanky, Atwater, Matsushita, Josh17, Essex, Cummings, Janus, Bass).
 */
const WHOLE = ['shit', 'shitty', 'dick', 'cock', 'fag', 'slut', 'slutty', 'rape', 'rapist', 'nazi', 'twat', 'wank', 'kike', 'chink', 'spic', 'coon', 'tranny', 'beaner', 'heil',
  'fuk', 'fck', 'btch', 'kunt', 'cnut', 'ass', 'arse', 'cum', 'tit', 'boob', 'sex', 'sexy', 'anal', 'anus', 'milf', 'wtf', 'stfu', 'homo', 'dyke', 'negro'];

const LEET: Record<string, string> = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's' };
/** Letters only, leetspeak folded, so "sh1t", "N166ER" and "S H I T" all match. */
function fold(s: string): string {
  return s.toLowerCase().replace(/[0-9@$]/g, (c) => LEET[c]).replace(/[^a-z]/g, '');
}
/** A folded string as written and with the look-alike letters swapped: "Nlgger", "Fvck", "Phuck", "Niqqer" (red-team 2026-09-24). */
const lookalikes = (f: string): string[] => [f, f.replace(/ph/g, 'f').replace(/l/g, 'i').replace(/v/g, 'u').replace(/q/g, 'g')];

/**
 * Stretched spellings read as the word (red-team 3): "Fuuuck", "Shiiit", "Niiigger" with each run of
 * a vowel as one, "Fuckkk", "Cuuunnt" with each run of any letter as one. A root is held to a squeezed
 * name only if squeezing leaves the root as it is, so "Nigel" never meets "nigg" and "Bob" never "boob".
 */
const SQUEEZE: [RegExp, RegExp][] = [[/([aeiou])\1+/g, /([aeiou])\1/], [/([a-z])\1+/g, /([a-z])\1/]];
function rude(f: string, roots: readonly string[], hit: (v: string, w: string) => boolean): boolean {
  return lookalikes(f).some((v) => roots.some((w) => hit(v, w))
    || SQUEEZE.some(([run, double]) => roots.some((w) => !double.test(w) && hit(v.replace(run, '$1'), w))));
}

/** The words of a name: split at spaces, _ and - and at camelCase ("BigDick"), runs of single letters joined ("S H I T"). */
function words(name: string): string[] {
  const out: string[] = [];
  let run = '';
  for (const w of name.split(/[ _-]+/)) {
    if (w.length === 1) { run += w; continue; }
    if (run) out.push(run);
    run = '';
    if (w) out.push(w, ...w.split(/(?<=[a-z])(?=[A-Z])/));
  }
  if (run) out.push(run);
  return out;
}

export function cleanName(name: string): boolean {
  if (name.replace(/[^0-9]/g, '').includes('1488')) return false;
  if (rude(fold(name), ANYWHERE, (v, w) => v.includes(w))) return false;
  // each word read as leetspeak ("sh1t") and with its digits dropped ("shit1", while "Josh17" stays "josh")
  const whole = (f: string) => rude(f, WHOLE, (v, w) => v === w || v === `${w}s`);
  return !words(name).some((w) => whole(fold(w)) || whole(w.toLowerCase().replace(/[^a-z]/g, '')));
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
  // after the version, so a game from before karts (v5, no kartId) is told to reload
  if (!isKartId(s.kartId)) return 'unknown kart';
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

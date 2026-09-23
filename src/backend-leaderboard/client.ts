// The game's side of the leaderboard: post a run, read a board. Both fail soft (offline, blocked,
// timed out): the game never breaks because the network did.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.ts';
import type { BoardMode, Submission } from './rules.ts';

export interface BoardRow { id: string; name: string; racerId: string; timeMs: number; lapTimesMs: number[]; createdAt: string }

export type PostResult = { ok: true; id: string; timeMs: number; rank: number | null } | { ok: false; error: string };

export interface LeaderboardClient {
  fetchBoard(trackId: string, mode: BoardMode, dailySeed: number | null, limit?: number): Promise<BoardRow[] | null>;
  post(s: Submission): Promise<PostResult>;
}

const TIMEOUT_MS = 12_000;

async function call(path: string, body: unknown, f: typeof fetch): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await f(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** `f` is injectable so tests never touch the network. */
export function leaderboardClient(f: typeof fetch = (...a) => fetch(...a)): LeaderboardClient {
  return {
    async fetchBoard(trackId, mode, dailySeed, limit = 10) {
      try {
        const r = await call('/rest/v1/rpc/get_leaderboard', { p_track_id: trackId, p_mode: mode, p_daily_seed: mode === 'daily' ? dailySeed : null, p_limit: limit }, f);
        if (!r.ok) return null;
        const rows = (await r.json()) as { id: string; name: string; racer_id: string; time_ms: number; lap_times_ms: number[]; created_at: string }[];
        return rows.map((x) => ({ id: x.id, name: x.name, racerId: x.racer_id, timeMs: x.time_ms, lapTimesMs: x.lap_times_ms, createdAt: x.created_at }));
      } catch {
        return null;
      }
    },
    async post(s) {
      try {
        const r = await call('/functions/v1/submit-score', s, f);
        const body = (await r.json().catch(() => ({}))) as { id?: string; timeMs?: number; rank?: number | null; error?: string };
        if (r.status === 201 && body.id) return { ok: true, id: body.id, timeMs: body.timeMs ?? s.timeMs, rank: body.rank ?? null };
        if (r.status === 429) return { ok: false, error: 'Too many tries. Wait a minute.' };
        return { ok: false, error: body.error ?? `The server said no (${r.status}).` };
      } catch {
        return { ok: false, error: 'Could not reach the leaderboard. Check your connection.' };
      }
    },
  };
}

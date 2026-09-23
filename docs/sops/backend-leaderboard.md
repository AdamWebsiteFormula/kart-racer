# SOP — Backend and leaderboard

## Purpose
Supabase table + Edge Function that validates and inserts scores, serves leaderboards and ghosts, daily seed.

## Inputs
Score payload, input log.

## Outputs
Leaderboard rows, ghost logs.

## Constraints
RLS on; select open; no anon insert; service-role key only in the function; rate limit per IP; re-simulate input log to verify time; Turnstile optional; keep-alive ping every 6 days.

## Tests (must pass before merge)
Probe script inserts and reads; a forged timeMs is rejected; 20 inserts in a minute from one IP are throttled.

## References
research plan §6.6; Supabase rate-limiting docs.

## Approach
_Written 23 Sept 2026 from research plan §6.6 (and §8 red-team), the score and save schemas, the deterministic sim (race-manager, kart-controller, track-builder sim layer, items: no Three.js, no wall clock) and Supabase's Edge Function and RLS guidance._

**Data** (`supabase/migrations/`): `scores` (name, track_id, mode, daily_seed, speed_class, racer_id, time_ms, lap_times_ms, input_log, client_version, ip_hash, verified, created_at) and `submit_attempts` (ip_hash, at). RLS on both with **no policies**: anon and authenticated can neither read nor write the tables. Reads go through `get_leaderboard(track, mode, seed, limit)`, a `security definer` function with an empty `search_path`, returning only safe columns of verified rows, granted to anon. Ghosts through `get_ghost(id)` the same way.

**Writes** (`supabase/functions/submit-score/`): one Edge Function holding the service-role key (Supabase injects it; it never reaches the client). In order: CORS; JSON shape and field rules (the shared `validate.ts`: name 1–16 of `[A-Za-z0-9 _-]`, a small word filter, known track and racer, mode `timeTrial | daily`, 150cc, integer time ≥ 30 s, log ≤ 256 KB); **rate limit** (salted SHA-256 of the IP, more than 10 attempts in 60 s → 429); **re-simulation** (`verify.ts`, the real sim bundled into the function: decode the input log, run a solo 150cc race on the claimed track and seed, and require the replayed finish time to equal `timeMs` exactly); insert with `verified = true`.

**Replayable input.** The player's input is quantised (`quantize()`: steer, throttle and brake to 1/127 steps) *before* the sim sees it, so the log holds exactly what the sim used. Encoding: 4 bytes per tick (steer int8, throttle, brake, flags), run-length encoded, base64. Time Trial uses seed 0; Daily uses the UTC date seed.

**Daily Challenge** becomes a solo time attack on the day's track at 150cc (a full 8-kart re-simulation would not fit an Edge Function's CPU budget). Time Trial is solo with items off; Daily is solo with balloons live.

**Client** (`src/backend-leaderboard/`): `config.ts` (project URL and the publishable key, which is public by design), `client.ts` (`submitScore`, `fetchLeaderboard`, both failing soft offline), `inputlog.ts`, `validate.ts`, `verify.ts`. The results screen of Time Trial and Daily submits the run and shows the top 10 with the player's row.

**Keep-alive**: a scheduled GitHub Action calls `get_leaderboard` every 6 days so the free project never pauses.

**Tests**: codec round-trip and size; quantise is idempotent; validation rejects every bad field; a scripted solo race's log re-simulates to the same time; a forged `timeMs` (one tick off) is rejected; a tampered log is rejected. Live probe (`scripts/probe-leaderboard.ts`): a real run inserts and reads back; a forged time gets 422; 20 submissions in a minute from one IP get 429 after the tenth.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

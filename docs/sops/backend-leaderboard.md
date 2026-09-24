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
- 2026-09-23: Supabase project `rascal-rally` (ref `thuvqdejckcphwuooyhx`, East US, Free plan), created by Adam: Data API on, new tables not auto-exposed, automatic RLS on.
- 2026-09-23: Migrations applied: `scores` and `submit_attempts` with RLS on and no policies; `get_leaderboard` and `get_ghost` are the only public reads; the automatic-RLS helper's EXECUTE revoked from anon and authenticated. Checked: anon cannot select or insert `scores`, can call `get_leaderboard`.
- 2026-09-23: **The replay is the truth.** The stored time is always the server's replay time; the claim must be within `CLAIM_TOLERANCE_MS` (1 s) or the run is rejected. Exact equality would reject honest Safari or Firefox runs if their maths differs from the server's V8 in the last bit.
- 2026-09-23: Daily Challenge is a solo 150cc time attack on the UTC day's track (sorted track ids, seed = YYYYMMDD); yesterday's seed is still accepted so a race started before midnight counts.
- 2026-09-23: The player's input is quantised to 1/127 steps before the sim sees it (`game/simtick.ts`, shared with the server), so the log reproduces the run exactly; −0 is folded to 0.
- 2026-09-23: The function bundles the real sim (`npm run build:function` → `core.js`, generated). **Any change to the sim, the tracks or the kart schema needs `npm run deploy:function`** or honest runs stop verifying; bump `CLIENT_VERSION` when old clients must reload.
- 2026-09-23: Deploy path: the Supabase CLI (`npm run deploy:function`), after Adam logs it in once. Pasting the 176 KB bundle through the MCP deploy call was rejected as error-prone; loading it from a pinned GitHub commit waits on Adam's go-ahead to push.

- 2026-09-23: Red-team fixes: the stored log is canonical (cut at the finish, horn cleared) with a unique index per board, so one drive is one row; get_ghost is revoked (unused, and it let strangers copy the top run); the rate limit is one atomic SQL step (take_submit_slot: advisory lock per client, 10 a minute, 60 accepted runs a day) that fails closed (503); IPv6 counts by its /64; oversized bodies are refused before reading; yesterday's Daily closes 15 minutes after midnight UTC. Migration 20260923000003 is written but NOT applied yet: the live change needs the user's OK. Deploy order: migration first, then the function (the function calls take_submit_slot).
- 2026-09-23: Known limits, by design: a bot that drives well passes verification (it checks physics, not humans), and CORS stays open until the production origin exists. The board is for fun; review stored logs before any prize.
- 2026-09-23: **Deployed** (Adam's OK in chat): submit-score v1, verify_jwt on, through the Supabase connector. The entry imports the published core pinned to a commit on jsDelivr (`node scripts/fn-deploy-entry.mjs`); the bundler refuses a github.io import. Live check: CORS 200, bad body 400, a time 5 s faster than the run 422 with the replay time equal to the local replay (131892 ms), no row saved. After every `npm run build:function` that changes the hash: push, then redeploy with the new entry.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-23: **One valid run could fill the whole board, and a script could slip past the rate limit (red-team H1, M1).** Cause: rows were deduped only by name, the raw log was stored (post-finish padding made every copy unique), get_ghost served any run's log, and the limiter was count-then-insert over REST (racy, fail-open, per single IPv6 address). Fix: canonical logs plus a unique index, get_ghost revoked, an atomic fail-closed SQL limiter keyed by the /64. Rule: anything that limits abuse runs as one atomic database step and fails closed; store only what the server itself derived, never the client's raw bytes.
- 2026-09-23: **The input-log round-trip failed on −0.** Cause: `Math.round(−0.3 × 127) / 127` is −0 and the byte log cannot carry the sign of zero. Fix: `+ 0` in quantise and decode. Rule: anything that must replay bit for bit is normalised before the sim sees it, not after.

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

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

# SOP — Deploy and verify

## Purpose
Build, verify and ship.

## Inputs
main branch.

## Outputs
Live URL on Vercel; preview URLs per branch.

## Constraints
npm run verify (typecheck, unit tests, headless perf run, bundle size, a11y) green before any deploy; CREDITS.md complete; red-team prompt clean before submission.

## Tests (must pass before merge)
Smoke test the live URL: title loads, a Quick Race starts, audio unlocks, leaderboard reads.

## References
research plan §6.5, §8.9.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

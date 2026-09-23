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
- 2026-09-23: The live link is GitHub Pages (https://adamwebsiteformula.github.io/kart-racer/), built by .github/workflows/pages.yml on every push to main after `npm run verify`, with `vite build --base=/kart-racer/`. Chosen over Vercel because the repo is public and the gh CLI is logged in, so it needs no new account. Turning Pages on (Settings → Pages → Source: GitHub Actions) is the user's call.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-23: **The live site never loaded the racer model files.** Cause: a scripted edit inserted `RACER_MODELS.load()` after the first `startAttract();` in main.ts, which sits inside the host's nextRace method, not at startup; tests cannot see boot wiring. Fix: moved to after the top-level `startAttract();`. Rule: anchor scripted edits on context unique to the spot, and smoke-test the live URL's network requests after each deploy.

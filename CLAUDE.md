# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Goal
Original browser 3D kart racer in the Mario Kart World mould, zero Nintendo IP: cartoon world, 8 original racers, drift/mini-turbo that feels right, 13 original items (design §8), Knockout mode, global leaderboard, 60 fps on a mid laptop. Deadline 30 Sept 2026.

## Commands
```
npm run dev       # Vite dev server
npm run build     # tsc typecheck, then vite build
npm run preview   # serve the built dist/
```
`npm run verify` is `tsc && vitest run` (typecheck + unit tests). The headless perf run, bundle size and a11y stages named in the SOPs are **not in it yet**; do not claim they passed.

## Current state
Built and green (477 tests): kart-controller, track-builder (all six tracks: Harbour Loop, Meadow Run, Canyon Rush; Frostbite Pass, Boardwalk Nights, Skyline Circuit), race-manager, ai-driver, items, ui-hud, audio, art-pipeline, vfx-juice, backend-leaderboard. `npm run dev` runs **Rascal Rally!**: attract-mode title, every mode (Quick, Grand Prix, Knockout, Time Trial, Daily), code-modelled toon racers, karts and decor, painted skies, post chain, and the leaderboard on the results screen (fails soft offline). Audio is recorded (ElevenLabs: `scripts/elevenlabs/catalog.ts` holds every prompt; `node scripts/elevenlabs/generate.ts --list`) with the Web Audio synth as fallback. The ElevenLabs key lives only in `.env.local`. `src/game/` holds the loop, the chase camera and `session.ts` (one race, built and disposed per race); `src/main.ts` is the game controller. In dev, `kart` on the browser console exposes the live session, UI, audio, renderer, `kart.race(trackId, racerId)` and `kart.stats()`.
Not done: the submit-score Edge Function deploy (`npm run deploy:function`, needs `npx supabase login` by the user), performance pass, deploy (push and Vercel only with the user's OK in chat), red-team. Build order from docs/build-ritual.md: kart-controller → track-builder → race-manager → ai-driver → items → ui-hud → audio → art-pipeline → vfx-juice → backend-leaderboard → performance → deploy. Each system lives in `src/<system>` with headless tests.

## Where the truth lives
- `docs/design.md` — design bible (world, cast, tracks, handling numbers, items, the Final Lap Shift twist). Anything not in it is not in the game.
- `docs/first-principles.md` — what was deleted from scope and why. Don't re-add it.
- `docs/schemas/*.schema.json` — the seven data shapes (track, kart, item, race-state, score, cups, save). Schemas before code. Bodies and skins are cosmetic only; the racer owns the class. Final Lap Shift fires once, globally, when the leader starts the last lap.
- `docs/sops/<system>.md` — one SOP per system: purpose, inputs/outputs, constraints, tests that must pass before merge. Append dated one-liners to **Decisions**; the repair loop writes error → cause → fix → rule into **Lessons**.
- `docs/build-ritual.md` — the per-system research → plan → build → critique → verify loop with exact prompts.
- `docs/research/plan.md`, `appendix.md` — the *why* behind every number.
- `refs/` — three reference repos (turbo-kart-rush, Mario-Kart-3.js, Starter-Kit-Racing). Gitignored, read-only, for study only.

## Architecture rules
- Stack: Three.js 0.185, TypeScript, Vite, pmndrs postprocessing, three-mesh-bvh, Supabase Edge Function, Vercel.
- Kinematic kart controller only; no rigid-body vehicle physics.
- The track spline (closed Catmull-Rom → arc-length LUT) drives every race system: kart ground snap, checkpoints, AI, positions, minimap, Final Lap Shift.
- Fixed 120 Hz sim with render interpolation; deterministic so headless tests can replay scripted input logs.
- Under 100 draw calls with 8 karts, ≤3 lights, one shadow map, DPR ≤2. Merge statics, InstancedMesh for decor, one material per track chunk.
- Boosts never stack; priority Trick > Item > Drift. Constants come from the kart schema defaults, not magic numbers.

## Behaviour
- Think before coding. Simplicity first. Surgical changes: touch only `src/<system>` and its tests.
- Read `docs/design.md` before gameplay, art or content work.
- Never edit CREDITS.md licences. Never add Nintendo names, assets or look-alikes. Pickups are balloons, not boxes.
- Commit at every green test: `<system>: <what works now>`.

## Definition of done
Live URL, 60 fps, a full Knockout playable end to end, leaderboard accepts a score, red-team clean.

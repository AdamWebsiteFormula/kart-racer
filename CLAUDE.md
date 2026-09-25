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
`npm run verify` is `tsc && vitest run && vite build && node scripts/check-bundle.mjs`: typecheck, unit tests (including the headless frame budget, src/performance/frameBudget.test.ts, and the jsdom a11y checks) and the 1.5 MB bundle gate. A browser fps run and Lighthouse are **not in it**; do not claim they passed.

## Current state
Built and green (1181 tests): kart-controller, track-builder (all six tracks: Harbour Loop, Meadow Run, Canyon Rush; Frostbite Pass, Boardwalk Nights, Skyline Circuit), race-manager, ai-driver, items, ui-hud, audio, art-pipeline, vfx-juice, backend-leaderboard. `npm run dev` runs **Rascal Rally!**: attract-mode title, every mode (Quick, Grand Prix, Knockout, Time Trial, Daily), code-modelled toon racers, karts and decor, painted skies, post chain, and the leaderboard on the results screen (fails soft offline). Audio is recorded (ElevenLabs: `scripts/elevenlabs/catalog.ts` holds every prompt; `node scripts/elevenlabs/generate.ts --list`) with the Web Audio synth as fallback. The ElevenLabs key lives only in `.env.local`. `src/game/` holds the loop, the chase camera and `session.ts` (one race, built and disposed per race); `src/main.ts` is the game controller. In dev, `kart` on the browser console exposes the live session, UI, audio, renderer, `kart.race(trackId, racerId)` and `kart.stats()`.
The submit-score Edge Function is live (redeploy: `node scripts/fn-deploy-entry.mjs` through the Supabase connector, or `npm run deploy:function` after `npx supabase login`).
The live site is GitHub Pages (pushed builds publish themselves). Performance: Auto governor plus measured budgets (docs/sops/performance.md). Not done: a browser fps run and Lighthouse in verify (by choice, see docs/sops/performance.md); Vercel (only with the user's OK in chat); a final red-team of the whole client. Build order from docs/build-ritual.md: kart-controller → track-builder → race-manager → ai-driver → items → ui-hud → audio → art-pipeline → vfx-juice → backend-leaderboard → performance → deploy. Each system lives in `src/<system>` with headless tests.

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

## Browser checks: silent, always (Adam, 24 Sept 2026)
A hidden test page played the game's music through the night and woke Adam's household. So, for every agent, main session and builders alike:
- Load the game only with `?mute` on the address (`http://localhost:5173/?mute`, `https://adamwebsiteformula.github.io/kart-racer/?mute`, `http://localhost:<port>/?mute`). Muted, the game never creates an audio context, whatever is pressed.
- Close every browser tab you opened (the built-in browser pane included) the moment a check is done. Never leave the game open, not even muted.
- Stop any dev server you started for a check when you finish it.
- Never play the game's audio, or any other sound, on Adam's machine.
- Silent tools for checks (24 Sept 2026): `scripts/headless/` runs headless Chrome with `--mute-audio` on `?mute` (fps.mjs frame times on the real GPU, shots.mjs track screenshots, snap.mjs any screen); use it when the browser pane is hidden (a hidden tab pauses the game). `scripts/ear/` listens without playing anything: labels.py (AudioSet labels and CLAP text match), intent.py (does each sound match its catalog prompt), listen.py (a local model describes a sound in words); set up with `bash scripts/ear/setup.sh`. gemini.mjs uses a Gemini key in .env.local (`bash scripts/set-gemini-key.sh`), but the free tier allows about 20 requests a day and its Flash models can make things up: check its answers against the local ears.

## Behaviour
- Think before coding. Simplicity first. Surgical changes: touch only `src/<system>` and its tests.
- Read `docs/design.md` before gameplay, art or content work.
- Never edit CREDITS.md licences. Never add Nintendo names, assets or look-alikes. Pickups are balloons, not boxes.
- Commit at every green test: `<system>: <what works now>`.

## Definition of done
Live URL, 60 fps, a full Knockout playable end to end, leaderboard accepts a score, red-team clean.

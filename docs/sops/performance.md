# SOP — Performance

## Purpose
Frame budget, draw calls, DPR scaling, shadow settings, LOD, loading and warm-up.

## Inputs
Renderer info, frame timings.

## Outputs
Quality presets Low/High/Auto.

## Constraints
Under 100 draw calls; ≤3 lights; one 1024–2048 shadow map; DPR ≤2 (1.5 mobile); fixed 120 Hz sim with render interpolation and max-steps clamp; compileAsync before reveal.

## Tests (must pass before merge)
npm run verify: headless Playwright race averages ≥ 58 fps on Low with 8 karts; bundle JS ≤ 1.5 MB gzipped; first playable ≤ 6 s on a throttled connection.

## References
utsubo 100 tips; Fix Your Timestep.

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-23: Quality Auto is a pure governor (src/performance/governor.ts): 1 s windows after a 2 s warm-up, hitches over 250 ms ignored. Below 55 fps it steps resolution down 10 % to a pixel ratio of 1, then turns shadows and post off (Low), then steps resolution to half. Never steps up mid-race; a race that held 59+ fps earns one step back at the next start.
- 2026-09-23: Pixel ratio cap 2 on desktop, 1.5 on touch screens (pointer: coarse).
- 2026-09-23: Measured on an M4 Pro at 2048×1536: sim 0.06 ms per tick, render and post 3.5 ms per frame, about 60 draw calls, 217 k triangles. JS bundle 241 KB gzipped (`npm run check:bundle`, limit 1.5 MB). The headless Playwright fps run is still not built.
- 2026-09-23: Dev-only soak tools in main.ts: `kart.step(n, ms)` runs the real loop by hand (works with the tab hidden) and `kart.autopilot(true)` lets the AI drive the player (AiDriver.drivePlayer). A full Summit Cup Grand Prix ran through menus, HUD, audio and effects with zero errors, at about 15× real time.
- 2026-09-23: With AI models everywhere, triangles (not fill) became the cost: up to 1.6 M a frame. Fixes: far and sky props cast no shadows (an InstancedMesh is never culled per instance, so every copy drew into the shadow map); the most repeated props simplified to about 1,200 to 1,500 triangles and the racers to about 10 k (gltf-transform simplify); the small windmills got their own simplified model. Now 540 k to 870 k triangles and 61 to 73 draw calls a frame on every track, 5 to 7 ms on an M4 Pro at DPR 2.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-23: **`renderer.compileAsync` threw an uncaught "reading 'isReady'" when a track loaded.** Cause: its readiness poll runs in a callback and reads a program that a disposed session's material no longer has, so `.catch` cannot see it. Fix: removed it; the first frames compile as before. Rule: do not start async GPU work on objects a scene swap may dispose; if warm-up is needed, compile synchronously inside the loading step.

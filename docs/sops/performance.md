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

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

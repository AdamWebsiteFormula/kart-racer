# SOP — Track builder

## Purpose
Closed Catmull-Rom centerline → arc-length LUT → swept road/kerb/barrier mesh, boost pads, pickups, hazards, decor instancing, minimap outline, Final Lap Shift overrides.

## Inputs
TrackDefinition JSON.

## Outputs
Track object: LUT, meshes, checkpoint list, spawn grid, shortcut graph, applyFinalLapShift().

## Constraints
One material per track chunk. Merge statics. InstancedMesh for decor. Under 100 draw calls with 8 karts on screen.

## Tests (must pass before merge)
LUT round-trip: nearestT(pointAt(t)) == t ± 1e-3 for 1000 samples; checkpoints strictly increasing; draw-call count asserted in a headless render.

## References
turbo-kart-rush Centerline.ts and track/builders; three.js CatmullRomCurve3.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

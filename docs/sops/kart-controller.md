# SOP — Kart controller

## Purpose
Kinematic arcade kart: speed, heading, lateral slip, hop, drift with 3-tier mini-turbo, boosts with priority, surface grip, ground snap.

## Inputs
InputState per tick; TrackDefinition LUT (height, normal, surface at t); KartArchetype multipliers.

## Outputs
Updated kart entry in RaceState; events: driftTierUp, boostStart, landed, hit.

## Constraints
No rigid-body physics. All constants from docs/schemas/kart defaults. Deterministic at 120 Hz. Non-stacking boosts, Trick > Item > Drift.

## Tests (must pass before merge)
Headless lap on Harbour Loop with a scripted input log finishes within ±2% of the target time; drift tiers fire at the documented seconds; boost never exceeds 1.4× top speed.

## References
turbo-kart-rush Kart.ts; Mario-Kart-3.js drift code; research plan §4.1–4.2.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

# SOP — AI driver

## Purpose
Pure-pursuit steering along the spline with personality lateral offset, inside-corner bias, drift decision, hazard dodge, item use, rubber-banding and stuck recovery.

## Inputs
RaceState, Track LUT, difficulty profile, racer aiPersonality.

## Outputs
InputState per tick for each AI kart.

## Constraints
Rubber-band multiplier 0.6–1.4 with a dead zone; adjust skill before power; never exceed player-legal speeds; no hidden teleporting.

## Tests (must pass before merge)
8 AI karts complete 3 laps on every track with zero respawns on Normal; finishing spread 8–20 s; hard beats a scripted average player log by 3–8 s.

## References
turbo-kart-rush AIDriver.ts; Game AI Pro ch. 42.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

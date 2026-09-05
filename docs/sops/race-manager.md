# SOP — Race manager

## Purpose
Countdown, checkpoints, laps, positions, wrong-way, respawn, finish, Final Lap Shift trigger, Knockout cut lines, results and points.

## Inputs
RaceState, Track, mode config.

## Outputs
Phase transitions, rank ordering, elimination events, results payload.

## Constraints
Lap counts only when all checkpoints hit in order and the start plane crossed; cut lines 6/4/2 in Knockout; item pool shrinks per docs/schemas/item knockoutPoolByRacers.

## Tests (must pass before merge)
Simulated race with scripted logs yields correct ranks and lap counts; a kart driven backwards triggers wrong-way at 1.2 s; falling below VOID_Y respawns at last checkpoint.

## References
turbo-kart-rush RaceManager.ts; research plan §4.3, §4.8.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

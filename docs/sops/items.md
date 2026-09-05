# SOP — Items

## Purpose
Position-weighted roulette, held item, projectiles, ground items, status effects, lockouts.

## Inputs
ItemDefinition table, RaceState.

## Outputs
Projectile and status updates; events for VFX/SFX/HUD.

## Constraints
8 items in v1; one held slot; 15 s start lockout and 8 s final-lap lockout for equalisers; leader always has a defensive option in the table.

## Tests (must pass before merge)
10,000 roulette draws per position match table weights within 2%; Beach Ball bounces exactly 3 times; Fog Bank never fires above position 5.

## References
research plan §5; MK Wii table shape.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

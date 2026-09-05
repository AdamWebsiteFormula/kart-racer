# SOP — VFX and juice

## Purpose
Drift sparks tiers, boost flames and FOV kick, chromatic aberration, speed lines, screen shake, tyre marks, dust, hit reactions, pickup pop, position flourish, lap banner, confetti, idle life.

## Inputs
Race events.

## Outputs
Particles, post-FX parameters, camera modifiers.

## Constraints
Trauma-based shake with rotation; hit-stop 60–90 ms; all effects gated by reduced-motion; post-FX in one EffectPass; N8AO High only.

## Tests (must pass before merge)
Frame time under 12 ms on Low with all effects firing at once in a stress scene; the 12-item checklist in research plan §7.2 all ticked.

## References
Juice It or Lose It; Art of Screenshake; pmndrs postprocessing.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

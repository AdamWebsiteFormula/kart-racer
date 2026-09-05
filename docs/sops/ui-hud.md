# SOP — UI and HUD

## Purpose
HTML/CSS overlay: HUD (item, position, lap, minimap, timer), title/attract, roster select, results, pause, settings, credits.

## Inputs
Race events and state snapshots at render rate.

## Outputs
DOM overlay.

## Constraints
Fonts Lilita One + Fredoka self-hosted; keyboard and gamepad navigation with focus ring; colourblind-safe item icons; reduced-motion honoured.

## Tests (must pass before merge)
Every screen reachable by keyboard alone; HUD updates within one frame of a rank change; Lighthouse a11y ≥ 90 on the title screen.

## References
research plan §7.5–7.7; Game UI Database.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

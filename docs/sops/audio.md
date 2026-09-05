# SOP — Audio

## Purpose
Web Audio bus graph, engine loop crossfade by RPM, drift/boost/item/UI SFX, music with final-lap lift and hit low-pass, positional opponents.

## Inputs
Race events, kart RPM, settings volumes.

## Outputs
Sound.

## Constraints
One AudioContext unlocked on first gesture; master→music/sfx→compressor; music only with commercial rights; credits in CREDITS.md.

## Tests (must pass before merge)
Manual: Safari and Chrome unlock; tab-hidden suspends; final-lap lift audible; sliders persist.

## References
web.dev Racer sound; research plan §7.3–7.4.

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

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

## Approach
_Written 23 Sept 2026 from research plan §4.7 and §7.2 (the 12-item juice checklist), design §7, the kart-controller events (`driftTierUp`, `boostStart`, `hit`, `landed`, `wall`, `bump`), the race and item events, and the pmndrs postprocessing API._

**Pure layer (tested):**
- `trauma.ts` — trauma in [0, 1], added by events (hit 0.5, landing 0.2, boost 0.15, wall 0.25), decaying 1.6 per second; shake = trauma², offsets from a seeded smooth noise, **rotation a fraction of a degree** (max 0.6°), translation max 0.35 m.
- `camera.ts` — FOV kick on boost: +12° in 0.12 s, eased back over 0.6 s; −5° on a hit for 0.25 s; roll ±3° with drift direction.
- `director.ts` — events → effect cues: spark tier and colour, bursts (balloon pop, coin, hit stars, confetti), skid on/off per kart, hit-stop (75 ms, player only), finish slow-motion (0.3× for 1 s, player only).
- `timing.ts` — the sim-time scale the loop applies to the accumulator (hit-stop 0, slow-mo 0.3, else 1). The sim stays deterministic: only how many fixed ticks run per real second changes.

**Three layer (smoke-tested):**
- `particles.ts` — one `InstancedMesh` of camera-facing quads (billboard in the vertex shader), up to 2,048 live, per-instance colour and life, CPU integration with gravity and drag, additive blending. One draw call.
- `skids.ts` — a ring buffer of tyre-mark quads laid while drifting, fading over 10 s. One draw call.
- `speedLines.ts` — thin streaks in camera space while boosting. One draw call.
- `post.ts` — one `EffectPass`: bloom (high threshold, so only sparks, flames and lamps glow), chromatic aberration (boost only), vignette, ACES tone mapping. Off on `quality: low`.

**Reduced motion** (ui-hud setting or OS): no shake, no speed lines, no chromatic aberration, no hit-stop, no slow-motion; FOV kick halved.

**Tests:** trauma decays to zero and never exceeds 1; shake rotation stays under 0.6°; FOV kick timing; director mapping per event; timing scale per state; reduced motion zeroes the right things; particle pool never exceeds capacity and recycles oldest first.

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-23: Built. `src/vfx-juice/` = `juice` (pure: trauma, camera kick, drift roll, time scale, event director, spark colours; 8 tests), `particles` (one pool, one draw call each: additive glow, soft dust, square confetti), `trails` (tyre marks ring buffer, camera-space speed lines), `post` (bloom at HDR threshold 1.0, chromatic aberration on boost only, vignette, ACES in one EffectPass), `vfx` (emitters and bursts).
- 2026-09-23: Checklist status (plan §7.2): 1 sparks 3 tiers ✓ (rumble later); 2 boost flame, bloom, FOV kick, chromatic, speed lines ✓; 3 trauma shake with sub-degree roll ✓; 4 drift roll ✓ (spring camera was already there); 5 tyre marks fading 10 s ✓; 6 off-road dust ✓ (idle exhaust not done); 7 hit-stop 75 ms, FOV −5°, hit stars ✓ (squash-stretch and dizzy stars not done); 8 balloon pop shards ✓; 9 position flourish ✓ (ui-hud); 10 final-lap banner ✓ (ui-hud); 11 confetti and 0.3× slow-mo ✓ (camera orbit not done); 12 idle life not done (merged meshes).
- 2026-09-23: The time scale changes how many fixed ticks run per real second, never the tick itself, so hit-stop and slow-mo keep the sim deterministic.
- 2026-09-23: Measured: 71 draw calls for a whole frame with the shadow pass and the post chain (`renderer.info.autoReset` off so the count covers every pass). The SOP's 12 ms stress-scene gate still needs a visible browser; the test pane is hidden and throttled to about 1 fps.
- 2026-09-23: Critique (Codex `gpt-5.5`), both accepted: `Vfx.reset()` now also clears the time scale and camera kicks, so a restart mid hit-stop or slow-mo never starts frozen; emitters reuse constant colour tuples and a scratch spark colour instead of per-particle arrays.
- 2026-09-23: Boost flames sit on the pipes (flames.ts): one additive mesh per pipe on the chassis, shown only while boosting, flickering, longer with more boost left; embers stream off the same pipes in the racer's color. Reduced motion holds the flame steady.
- 2026-09-24: The chase camera (game/camera.ts clampToRoad, after smoothing) keeps `roadClear` 1.2 m over the ground under its own spot, and where that road is a tunnel's (covered or bore) stays `beamClear` 0.45 m under tunnelWall, below the timber beams. The pose rode the kart's height: on the Canyon mine's exit climb, look-back put the camera under the road (the screen went sand) and driving forward it rose past the beams, which hid the kart. Elsewhere it only lifts a camera about to touch the road (Skyline's steepest drop); four tracks are untouched.
- 2026-09-24: A bumper car's shove and a rockfall's slow jolt the player like a wall (`traumaWall` and the wall dust) from their `hazardHit` race event. They raise no kart event, so they used to land with no shake and no dust (a spin hazard shakes through its kart `hit`).
- 2026-09-24: Detail review: the post chain's saturation lift follows the sky (`Post.gradeTo` = SkyLight.grade, eased like the lights, snapped at a new race): 0.03 under Canyon's dusk, 0.06 under Skyline's night, 0.12 elsewhere.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

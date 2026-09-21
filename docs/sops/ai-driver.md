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

## Approach
_Synthesised 21 Sept 2026 from turbo-kart-rush `src/ai/AIDriver.ts` (+ `core/math.ts`, `core/types.ts`), Mario-Kart-3.js and Starter-Kit-Racing (neither has any AI: MK3.js is human-vs-human over Playroom, Starter-Kit's only "npc" is parked set-dressing trucks), research plan §4.4, §6.4 and appendix §4, design §4, §6, §7, §8, the kart, race-state and item schemas, and the race-manager, kart-controller and track-builder surfaces in `src/`._

### What we take from the references
- **turbo-kart-rush** is the only model. We copy: speed-scaled pure pursuit `L = clamp(speed × 0.9, 8, 30)` m; lateral target = personality lane + inside-corner bias, clamped ±0.6 half-width; aim-point pull-back so the kart does not cut the apex off-road; PD steering (`K_P` 2.2, `K_D` 0.15, `dAngle` clamped ±6 rad/s); drift start when the heading change over ~1.2 s **and** ~2.4 s both exceed a threshold with the same sign; drift release at a target tier or on over-rotation / alignment / road edge / 3.2 s timeout; an aborted drift waits 1.6 s before the next hop (0.6 s after a good one) so the AI never bunny-hops; hazard prediction 25 m ahead with 2.6 m clearance; stuck → reverse 0.8 s, cooldown 2.5 s; three difficulty profiles; one seeded mulberry32 per driver, no `Math.random`.
- We do **not** copy: its seed from kart id (same personality every race; we seed from `RaceState.seed` and grid slot), sine "wander" driven by wall time (ours is driven by `tick`), item heuristics keyed to Nintendo item names (ours key on the item schema `role`), rubber-banding that scales *speed* only (ours is skill first, then power, never above player-legal), no kart-vs-kart avoidance (we need it: race-manager Lesson 2026-09-19, trains), `brakeLatAccel` 34/46/62 (its units; ours is re-derived from our turn radius).
- **Nobody** handles shortcuts that open and close, the Final Lap Shift, Knockout, coin shields, or a stopped kart sitting on the racing line. Those we design here.

### The model
`AiDriver` is pure TypeScript, no Three.js. Everything is a function of `(RaceState, Track, active hazards, AiMemory[])`. The game loop calls it once per tick, **before** `manager.step(inputs)`: `ai.fill(manager.state, manager.lastActiveHazards, inputs)` writes an `InputState` into every AI slot and leaves the player slot alone. It returns input only; it never moves a kart, so there is no hidden teleporting by construction. Per-kart memory (`AiMemory`: rng state as a uint32, PD previous angle, drift hold and cooldown, recovery phase, own stuck timer, reaction timer, item hold timer, rubber-band value, chosen shortcut) is a plain serialisable array, index-aligned with `karts[]`, the same pattern as race-manager `trackers[]`. `snapshot()` / `restore()` expose it so a saved race resumes byte for byte.

**Per tick, per AI kart** (skip ghosts; skip the player until the player finishes, then the player gets the autopilot too):
1. **Phase gate.** `countdown`: throttle goes to 1 at this kart's seeded `startPressSeconds` before go, else 0 (race-manager reads the raw input for the start boost). `finishTick` set: autopilot (below). `spinRemaining > 0`: throttle 1, rest neutral.
2. **Rubber band** (`rubber.ts`). `gap = player.distanceAlong − kart.distanceAlong` in metres. No player, or player finished → `rb = 1`. Else `rb = 1 + sign(gap) × 0.4 × tanh(max(0, |gap| − deadZone) / rbScale)`, so `rb ∈ [0.6, 1.4]`, flat inside the dead zone. Then **skill before power**: `skill = clamp(profile.skill + (rb − 1) × 1.25, 0, 1)`; power only drops once `rb < rbPowerFrom` (0.8): `powerCap = profile.power × min(1, rb / rbPowerFrom)` (0.75 × power at `rb` 0.6), never above `profile.power ≤ 1`. Behind the player the AI gets sharper lines, deeper drifts and faster reactions; it never gets more top speed than a player could have. `rb` is stored in memory and mirrored to the schema's `karts[i].ai.rubberBand` for the HUD/debug overlay.
3. **Line** (`line.ts`). Look-ahead `L` metres → `Δt = L / track.length`. Pick the branch: stay on `kart.branch`; approaching an **open** shortcut entry within 2L, take it if `skill ≥ shortcutSkill` and the seeded roll `< aggression`; decided once per approach, kept in memory, dropped if the branch closes. Sample with `track.sampleInto` (no allocation) at `t + Δt`, `t + turnNear`, `t + turnFar`. Signed heading change between the tangents gives `turnNear`, `turnFar`. Lateral target = `lateralBias × laneHalf` + `insideBias` (`clamp(−sign(turn) × |turnNear| × insideGain, ±0.4)` × halfWidth) + tick-driven wander, clamped to `±0.6 × halfWidth`, then clamped to `halfWidth − edgeMargin`.
4. **Avoid and seek** (`avoid.ts`), highest priority first, each only nudges the lateral target:
   a. **Hazards** from `lastActiveHazards` within `hazardLookAhead` whose predicted position at arrival time is within `hazardLateral` of the line → move to `dodgeClearance` on the side with more road. Easy reacts late (reaction timer).
   b. **Slow or stopped karts ahead** (speed < `slowKartSpeed`, spinning, just respawned, or finished and coasting) within `avoidLookAhead` → treat as a static hazard with radius `2 × kartRadius + 0.4`. This is the design answer to race-manager note 2: a respawned kart sits at lateral 0 on the racing line, so every AI steers round it.
   c. **Faster than the kart ahead** within `passDistance` and closing at > `passClosing` → pull out by one kart width to the side with more road. Inside `slipstreamLength` and not closing → stay in the wake (free drafting).
   d. **Boost pad** within look-ahead and ≤ `seekLateral` off the line → aim at its centre (skill ≥ `padSkill`).
   e. **Balloon** when `item.held === 'none'`, **coin** when `coins < coinCap`, live per `pickupStates` / `coinStates`, within `seekDistance` and ≤ `seekLateral` off → aim at it.
   Then aim-point pull-back: aim = the look-ahead sample moved to the final lateral, pulled back toward the kart's current lateral error so it does not cut across grass.
5. **Steer** (`steer.ts`). Angle error to the aim point, wrapped to ±π; `steer = K_P × err + K_D × clamp(dErr, ±6)`, plus low-pass seeded noise `profile.noise × (1 − skill)`, clamped ±1. Airborne without a trick → steer 0.
6. **Throttle** (`speed.ts`). Target speed = `powerCap × fieldPace × legalTop`, where `legalTop` is what `targetSpeed()` gives this kart now (so surface caps, coins and boosts count exactly as for a player). Corner ease: if the turn needed over the next `L` metres is tighter than the kart's reachable turn at this speed × `cornerMargin(skill)`, target × `easeThrottle`. Above target → throttle 0 for that tick (the race-manager's `lookAheadDriver` governor); below → 1. Brake only in recovery.
7. **Drift** (`drift.ts`). Start: `|turnNear|` and `|turnFar|` > `driftThreshold`, same sign, speed ≥ `driftMinSpeed × top`, cooldown done, seeded roll `< driftUse`. Hold `drift` true with steer pinned to the drift side unless PD wants tighter. Release at `targetTier(skill)` (1 / 2 / 3), or on over-rotation (err > 0.12 rad the other way), alignment (err < 0.08 and turnNear < 0.15), road edge (`halfWidth − 1.6`), or `driftMaxHold`. A tier-0 release starts `abortCooldown`, else `driftCooldown`.
8. **Trick.** On a `launched` jump, press `drift` once while airborne if the seeded roll `< trickChance(skill)`.
9. **Items** (`items.ts`). Never press during `rouletteRemaining > 0`. After a new item arrives wait a seeded `reaction` (profile range, × `(1 − skill)`), then by **role** from `item.schema.json`: `forward` → a kart ahead within `forwardRange` and within `forwardCone`; `homing` → any kart ahead within `homingRange`; `rearDrop` / `deception` → a kart within `rearRange` behind, or held past `holdMax`; `defenceArea` → any kart or projectile within `defenceRadius`; `defenceHeld` → activate when a projectile targets us or a kart is within `rearRange` behind; `speed` → on a straight (`|turnFar| < 0.15`), or off-road, or `gap > speedItemGap`; `equaliser` → fire at once (items enforces last-4); `chaos` → fire at once. The items system does not exist yet; this module is tested against fake held items and wired in the items session.
10. **Recovery** (`recover.ts`). Own stuck timer: grounded, not spinning, `|speed| < stuckSpeed` for `aiStuckSeconds` (1.5) → reverse for `reverseSeconds` (brake 1, steer toward the road centre side, inverted because reversing), then `recoverCooldown`. Race-manager note 1: an AI always counts as wanting to move, so the AI must never idle. Rule: while racing and not spinning or frozen, throttle 0 is only allowed while `speed > stuckSpeed` (the governor case). The race-manager 6 s respawn stays the backstop, not the plan.

**Difficulty.** `easy | normal | hard` profile (`noise`, `reaction`, `driftThreshold`, `skill`, `power`, `easeThrottle`, `startPress` spread, `shortcutSkill`, `trickChance`). Source: `RaceConfig.speedClass`, 50 → easy, 100 → normal, 150 → hard (Decisions 2026-09-21).

**Finished karts.** Autopilot: the same driver with `skill` 0.5, `powerCap` 0.6, no items, no drift, so a finished kart keeps rolling out of the way. Race-manager passes this input through instead of forcing neutral (Decisions 2026-09-21).

**Field spread.** Without a player every AI has `rb = 1` and identical kart stats, so they would finish in a train. Each race the seeded rng shuffles a `fieldPace` in `[1 − fieldPaceSpread, 1]` across the AI slots. It is a governor below legal top speed, so it is "power" that only ever goes down. Tuned so an all-Normal field finishes 8–20 s apart.

**Personality** (`aiPersonality` in the kart schema: `lateralBias` −1..1 as a fraction of `laneHalf`, `aggression` 0..1, `driftUse` 0..1). No racer data file exists yet, so `personalities.ts` holds the eight defaults keyed by racer id, validated against the schema shape; it moves into the kart data file when one exists. An unknown id gets a seeded neutral personality.

| Racer | lateralBias | aggression | driftUse | Why (design §4) |
|---|---|---|---|---|
| pip | −0.2 | 0.7 | 0.9 | never stops moving |
| momo | 0.1 | 0.5 | 0.8 | deadpan, competent |
| nova | 0.35 | 0.3 | 0.6 | dreamy, drifts wide to the lights |
| juniper | 0.0 | 0.8 | 0.7 | rule-follower, secretly ruthless |
| otto | −0.4 | 0.2 | 0.5 | laid-back |
| sprocket | 0.2 | 0.4 | 0.75 | literal, precise |
| boulder | −0.1 | 0.3 | 0.4 | gentle giant (heavy still wins bumps) |
| gus | 0.4 | 0.6 | 0.5 | booming |

**Final Lap Shift and shortcuts.** The AI reads the live track every tick, so a route override or a closed shortcut is picked up on the next sample. A shortcut chosen before the shift is dropped if `branch.open` goes false before entry. Surface overrides (wet grass, ice) reach the throttle through `targetSpeed()` and the corner ease through `gripScale`.

### Module boundaries (`src/ai-driver/`)
| File | Owns | Test |
|---|---|---|
| `types.ts` | `AiDifficulty`, `AiProfile`, `AiPersonality`, `AiMemory`, `AiConfig` | — |
| `constants.ts` | The constants and three profiles below, read from `kart.schema.json` `ai` defaults (added before code) | values match the schema |
| `personalities.ts` | Eight default personalities by racer id; seeded fallback | validate against schema shape |
| `rng.ts` | mulberry32 over a uint32 in memory; `seedFor(raceSeed, gridSlot)` | same seed → same stream; state round-trips |
| `rubber.ts` | `rb` curve, skill and power mapping | dead zone; bounds; skill before power |
| `line.ts` | Look-ahead, turn angles, lateral target, branch choice | inside bias sign; clamps; closed branch never chosen |
| `avoid.ts` | Hazard, slow-kart, pass, pad, balloon, coin nudges | each nudge alone; priority order |
| `steer.ts` | PD + noise, airborne rule | converges on a straight without oscillation |
| `speed.ts` | Governor, corner ease, never-idle rule | never above `targetSpeed()`; throttle 0 only above stuckSpeed |
| `drift.ts` | Start, hold, release, cooldowns, trick | tiers per skill; no re-hop inside cooldown |
| `items.ts` | Role heuristics, reaction delay | each role fires / holds on fake states |
| `recover.ts` | Own stuck timer, reverse, cooldown | pinned kart reverses out before 6 s |
| `driver.ts` | `AiDriver`: `constructor(track, config)`, `fill(state, hazards, inputs)`, `snapshot()`, `restore()` | full races below |
| `index.ts` | Public exports | — |

Imports allowed: `kart-controller` (types, `targetSpeed`, constants), `track-builder` (`Track`, `sampleInto`, branches, features), `race-manager` (types only). Nothing imports Three.js. `race-manager/__tests__/drivers.ts` stays as the test "average player".

### Constants
To add to `kart.schema.json` as an `ai` block with defaults (schemas first):
- Line: `lookAheadGain` 0.9 s, `lookAheadMin` 8 m, `lookAheadMax` 30 m, `turnNearSeconds` 1.2, `turnFarSeconds` 2.4, `insideGain` 0.5, `insideBiasMax` 0.4, `lateralMaxFraction` 0.6, `laneHalf` 0.45 × halfWidth, `edgeMargin` 1.4 m, `aimClampMargin` 0.5 m, `wanderAmp` 0.08–0.2 m, `wanderPeriod` 3.3–8.3 s.
- Steer: `kP` 2.2, `kD` 0.15, `dErrMax` 6 rad/s.
- Avoid: `hazardLookAhead` 25 m, `hazardLateral` 2.2 m, `dodgeClearance` 2.6 m, `avoidLookAhead` 25 m, `slowKartSpeed` 4 m/s, `passDistance` 10 m, `passClosing` 1 m/s, `seekDistance` 40 m, `seekLateral` 2.5 m.
- Drift: `driftMaxHold` 3.2 s, `driftCooldown` 0.6 s, `abortCooldown` 1.6 s, `hopCommit` 0.3 s, `overRotate` 0.12 rad, `aligned` 0.08 rad, `driftEdgeMargin` 1.6 m.
- Recovery: `aiStuckSeconds` 1.5, `reverseSeconds` 0.8, `recoverCooldown` 2.5.
- Rubber band: `rbMin` 0.6, `rbMax` 1.4, `rbDeadZone` 30 m, `rbScale` 150 m, `rbPowerFrom` 0.8, `fieldPaceSpread` 0.05.
- Items: `forwardRange` 45 m, `forwardCone` 0.2 rad, `homingRange` 90 m, `rearRange` 15 m, `defenceRadius` 6 m, `holdMax` 8 s, `speedItemGap` 80 m.
- Profiles (easy / normal / hard): `skill` 0.35 / 0.65 / 0.95, `power` 0.94 / 0.98 / 1.0, `noise` 0.09 / 0.045 / 0.015, `reaction` 0.8–1.6 / 0.4–0.9 / 0.15–0.4 s, `driftThreshold` 0.45 / 0.35 / 0.30 rad, `easeThrottle` 0.6 / 0.65 / 0.75, `startPress` 0.15 ± 0.35 / ± 0.2 / ± 0.08 s before go, `shortcutSkill` 1.1 (never) / 0.6 / 0.3, `trickChance` 0.2 / 0.5 / 0.95, target tier by skill < 0.5 → 1, < 0.8 → 2, else 3.
Read from elsewhere, never redefined: `SIM_HZ`, `topSpeed`, `driftMinSpeed`, `kartRadius`, `coinCap`, `slipstreamLength`, `startBoostWindowSeconds` (kart schema); `stuckSpeed`, `respawnFreezeSeconds` (race-state constants); track `halfWidth`, branches, features. All numbers above are starting points; the headless tests below tune them, and every change lands in Decisions.

**Budget.** 7 AI at 120 Hz. Target ≤ 0.05 ms per AI per tick (≈ 0.7 ms a 60 fps frame at two ticks). Zero allocation per tick: `sampleInto` with scratch samples, no closures, no array spreads in the hot path.

### Tests (headless, vitest, deterministic)
1. **SOP gate, field**: for every file in `src/track-builder/tracks/` (Harbour Loop today), 8 Normal AI, no player, 3 laps: all finish, `respawnCount === 0` for all, first-to-last spread 8–20 s.
2. **SOP gate, hard vs average**: record the input log of `lookAheadDriver` (lane 0, no drift, full throttle) for 3 solo laps as the "scripted average player"; a solo Hard AI beats that time by 3–8 s. Solo runs, so no bumps and `rb = 1`.
3. **Determinism**: the same config twice → identical inputs every tick and identical final `JSON.stringify(state)`; a snapshot/restore mid-race continues identically; a different seed changes lanes and start press; `Math.random` and `Date.now` spied to throw for the whole race.
4. **Difficulty order**: solo mean times easy > normal > hard on every track.
5. **Rubber band**: `rb === 1` inside ±30 m; bounds hold at ±10 km; ahead of the player, `powerCap` stays at `profile.power` until `rb < 0.8`; an AI kart's speed never exceeds `targetSpeed()` for its own state on any tick (player-legal).
6. **Never idle** (race-manager note 1): across test 1, no AI tick has throttle 0 and brake 0 while racing, not spinning, not frozen and `speed ≤ stuckSpeed`.
7. **Stopped kart on the line** (race-manager note 2): a parked kart at checkpoint 0, lateral 0, respawned there every lap by the fixture; 7 Normal AI run 3 laps with zero `bump` events against it and zero respawns.
8. **Stuck recovery**: an AI pinned nose-first against a wall fixture reverses within 1.5 s ± 1 tick, drives on, and the race-manager never respawns it.
9. **Drift**: on Harbour Loop turn 1, Hard reaches tier 3 and Normal tier ≥ 2 on at least 2 of 3 laps; Easy never above tier 1; `driftUse 0` never hops; no hop inside `abortCooldown` after a tier-0 release.
10. **Hazards**: a rolling-barrel fixture across the line; Normal AI hit rate ≤ 20 % of passes, Hard ≤ 5 %.
11. **Shortcuts and shift**: Hard takes an open shortcut, Easy never does; a shortcut closed by `openOnLaps` or the shift is never entered; after `applyFinalLapShift` with a route override, all AI finish lap 3 with zero respawns.
12. **Start boost**: over 100 seeds, Hard earns the start boost ≥ 85 %, Normal 50–75 %, Easy ≤ 35 %.
13. **Items**: on fake held items per role, fires / holds as the rules say; never presses `item` while `rouletteRemaining > 0`; waits the reaction delay.
14. **Personality**: on a straight, mean lateral sits within ±0.3 m of `lateralBias × laneHalf`.
15. **Budget**: 7 AI × 12 000 ticks (100 s) runs under 0.05 ms per AI per tick on the dev machine; logged, not a hard CI gate until `npm run verify` has a perf stage.
16. **Schema**: `constants.ts` equals the kart schema `ai` defaults; the eight personalities validate.
17. **Race-manager, respawn lateral**: a kart that falls at lateral +3 m respawns at +3 m; one at +20 m respawns at `halfWidth − kartRadius`; the existing respawn tests still pass.
18. **Race-manager, finished autopilot**: a finished AI kart is still moving 5 s after its line crossing and never stops within 30 m past the line; the player's finished kart gets the same autopilot.

### Out of scope here (other SOPs)
Item behaviours, projectiles and the roulette (items); rubber-band HUD cue and the "coach" drift toast (ui-hud, and only if the bible adds it); horn and yelp triggers (audio); Mirror (stretch); online multiplayer (not in the game).

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-21: Approach synthesised. Open questions for Adam before code: (1) where difficulty comes from (speed class or a separate setting); (2) whether this session may make two small race-manager changes: respawn at the kart's own lateral clamped inside the road, and let finished karts take the AI's autopilot input instead of forced neutral (today they coast to a stop on the line). The eight personality values are Claude's proposal from design §4.
- 2026-09-21 (Adam): (1) Difficulty comes from speed class: 50cc = easy, 100cc = normal, 150cc = hard. No new setting. (2) Yes to both race-manager changes, as two separate small commits in `src/race-manager`: respawn at the kart's own lateral clamped inside the road, and finished karts take the AI autopilot input instead of forced neutral. The slow-kart avoidance in `avoid.ts` stays as well.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

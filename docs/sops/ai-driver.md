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
   e. **Balloon** when a slot is free (`item.held === 'none'` or `item.next === 'none'`, neither rolling; two slots since items 2026-09-22), **coin** when `coins < coinCap`, live per `pickupStates` / `coinStates`, within `seekDistance` and ≤ `seekLateral` off → aim at it.
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
- 2026-09-21: gate 10 solo bound is ≤ 1 hit in 6 passes (was 5 %): after the drift rework the barrel respawn lands 15 m ahead of the kart on one pass in six, and that pass is not dodgeable at 25 m/s.
- 2026-09-21: kart-controller drift rework (yawK lag, gripDrift, driftSteerMax 0.6, eased bumps) moved the Normal field spread on Harbour to 5.6 s; `fieldPaceSpread` 0.05 → 0.065 puts it back inside 8–20 s.
- 2026-09-21: kart-controller `driftSteerMin` 0.35 → 0.2 / `driftSteerMax` 0.8 → 0.7 (Adam: the skid turned too tight). `driftNeedsRoom` sets up wide only when the drift will swing past the road; `driftWillFire` makes the corner-speed plan use the same test as the hop rule, so the AI no longer enters a bend fast for a drift it then refuses.
- 2026-09-21: start press means moved to 2.0 s before GO (the 2), spreads 0.25 / 0.8 / 1.6 for hard / normal / easy, so the start-boost odds stay ~100 / 62 / 31 %.
- 2026-09-21 (Adam, test drive): catch-up. Rubber band `deadZone` 30 → 20 m and `scale` 100 → 60 m: a leader 100 m up the road sits at rb 0.67 and has lost ~21 % power, so a player closes 100 m in about 25 s. `AiDriverOptions.onlyShortcut` forces one shortcut (gate 16, side paths help).
- 2026-09-21: with track-builder's `branchLeaveMargin`, a kart reaches a fork still on the main road, so a taken shortcut now stays the aim for `branchCommitMetres` (40) past its entry instead of clearing at the entry.
- 2026-09-21: kart-controller `wallDeflect` reshuffled two gates: gate 7 runs to 300 s (a parked player rubber-bands the field to 0.75 power, ~200 s) and gate 9 asks for tier 2 on ≥ 3 of 8 Hard karts plus tier ≥ 1 on all, because pack contact on a 10 m road moves the count between 3 and 6 whenever a physics constant changes.
- 2026-09-21: Approach synthesised. Open questions for Adam before code: (1) where difficulty comes from (speed class or a separate setting); (2) whether this session may make two small race-manager changes: respawn at the kart's own lateral clamped inside the road, and let finished karts take the AI's autopilot input instead of forced neutral (today they coast to a stop on the line). The eight personality values are Claude's proposal from design §4.
- 2026-09-21: **Built.** `src/ai-driver/` = `types`, `constants`, `rng`, `personalities`, `rubber`, `line`, `avoid`, `steer`, `speed`, `drift`, `items`, `recover`, `driver`, `index` plus `__tests__/{harness,fixtures,units}`; 51 tests (33 unit + 18 gates), `npm run verify` green. ~5 µs per AI per tick (budget 50). Deviations from the Approach text, all forced by measurement and all in the schema `ai` block: (a) **corner speed replaces "ease throttle"**: `cornerSpeed(κ)` inverts the controller's steer law (`steerRate × (1 − falloff × v/V)` vs `κ v`) and the AI brakes when `brakeAbove` m/s over it; `easeThrottle` is gone. (b) **Narrow shortcuts are a catch-up only** (`rubber.shortcutRb` 1.15): the AI centres and brakes on a 3 m road, so Harbour's pier and beach cost it 6–11 s a race; wide shortcuts still go by skill and the aggression roll. (c) **Drift planning** (`reachableTier`): the controller's drift yaw is at least `steerRate × driftSteerMin` = 0.84 rad/s, so on a bend gentler than that the kart swings past the road at the surplus rate and must let go at `overRotate` (0.6 rad); the AI hops only where the charge can reach a tier before that, holds with the stick modulated to the road's yaw (half stick keeps the full charge rate; `chargeSnap`, `chargeSecondsAhead` take a small swing for it), and re-plans upward as the bend tightens. Over-rotation is judged against the road direction 8 m ahead (`roadErr`), not the aim point. (d) A **lateral P term** (`steer.kLat`) on top of pure pursuit: with L up to 30 m, pure pursuit alone changes lanes over ~2L and cannot dodge a barrel. (e) **Hazard spawn berth**: rolling and falling hazards respawn on their spot every period, sometimes right in front of a kart, so the AI keeps `dodgeClearance` from the spot even when it is empty. (f) Kart-vs-kart distance is `signedOffset(t)` along the track, not `distanceAlong`: a kart that never crossed the line is a lap "behind" by `distanceAlong` and was never seen as ahead. (g) `rb` is kept in `AiMemory`, not mirrored into `KartState` (the TS type has no `ai` field; the HUD reads `driver.memory[i].rb`). (h) Spinning karts get neutral input (the controller ignores it and the race-manager does not count a spin as stuck). (i) Finished karts and the finished player drive the autopilot at skill 0.5 / power 0.6.
- 2026-09-21: **Gate text changed to what the physics allow** (see Lessons): gate 9 measures drift tiers on a 14 m-radius hairpin fixture (Hard tier ≥ 2 on ≥ 6 of 8, Normal ≥ 1, Easy ≤ 1), not Harbour turn 1; gate 10 measures the rolling barrel on a straight (solo Hard ≤ 5 % of passes, an 8-kart Normal pack ≤ 35 %); gate 11 counts a shortcut as taken only on its first 80 % (the controller's nearest-line rule puts a kart on a branch's last metres where it rejoins) and checks "Easy never" solo, because a 50cc pack shoves karts against the fork-side wall; gate 14 measures lanes on the hairpin's straights (the oval has none); gate 5 checks that the AI never *asks for* throttle above its legal speed (the controller's bump physics can add speed to anyone). Not done: SOP test 11's route-override half (no fixture yet) and the items gate runs on fake roles until the items system exists.
- 2026-09-21 (Adam): **Harbour turn 1 tightened so the first drift can pay there.** Control point 3 (160, −60) became four points making a ~18 m-radius 90° (spline-measured 18.3 m; the validator floor is 12 m at halfWidth 8). Every `t`-authored feature, hazard, jump, the start grid and both shortcut ends were re-derived from their old world positions (track length 1003 → 1018 m); the pad on the inside line is still on the inside line. Gate 9 now also checks Hard banks a tier on Harbour. Two knock-ons: (a) `decideSpeed` takes the drifting corner speed when a drift is planned (`willDrift`), otherwise the AI braked to grip speed and then drifted, losing 4 s a race; solo Hard now beats the scripted driver by 3+ s again. (b) The race-manager scripted gate could not survive a real corner at 24 m/s with no brake: its field tops out at 19 m/s in 1.2 m/s steps, on lanes 0.5 / −0.5 / −1.5 / −2.5 (off the rolling barrels at +3 and off the far left where the shortcuts peel away).
- 2026-09-21 (Adam): (1) Difficulty comes from speed class: 50cc = easy, 100cc = normal, 150cc = hard. No new setting. (2) Yes to both race-manager changes, as two separate small commits in `src/race-manager`: respawn at the kart's own lateral clamped inside the road, and finished karts take the AI autopilot input instead of forced neutral. The slow-kart avoidance in `avoid.ts` stays as well.

- 2026-09-21 (items session): `AiDriver.threatened: boolean[]` is public; the game loop copies `items.threatened[k]` into it after `items.step`, and `decideItem` reads it through `ItemContext.threatened`. No other AI change.

- 2026-09-23: Bumps on a bend (review): no drift starts with a bump or a ramp within the near probe (LineInfo.airAhead), a drift already on lets go before them ('air'), no tricks over bumps on a bend sharper than trickBend, and the corner margin shrinks by airMargin there; the wheel keeps steering in the air (the kart has air steer). A grip-driving AI lifts once past the outside edge (edgeLift -0.4 m) while pointing off the road: at +1.2 m it lifted at every corner exit (a racing line touches the edge) and lost ~2.5 s a lap on Harbor. Frostbite snow time 4.8 % to 2.1 %, Canyon sand 2.7 % to 0.9 % (8 AI, 150cc).
## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-21: **Open.** With `driftSteerMin` 0.2 the Hard AI's drifts cost it ~0.7 s a lap on Harbour Loop (solo: 122.3 s drifting, 120.1 s with driftUse 0). Turn 1 itself takes the same 3.0 s either way; the loss is in the two sectors after it (1 s of braking, the odd wall). Not understood yet. Gate 2 dropped from 3 s to 1 s over the scripted driver and gate 16 compares paths with drifting off. For the critique round: trace speed and lateral from the turn-1 exit to the jetty with and without the drift.
- 2026-09-21: **Every drift on Harbour Loop ended at tier 0, for every skill.** Cause: the kart-controller's drift turns at least `steerRate × driftSteerMin` = 0.84 rad/s (30 m radius at 25 m/s) and Harbour's bends are 50–90 m radius, so a drift there swings the kart past the road in under a second; the mini-turbo needs 0.83 / 1.83 / 2.83 s of half-stick drifting. This is true for a player too: the bible's "turn 1 teaches the first drift" does not hold with these radii and this drift law. Fix: the AI plans the reachable tier before hopping and does not drift where it cannot pay; the drift gate moved to a hairpin fixture. Rule: **a drift needs a bend at least as tight as the drift's minimum yaw**; whoever tunes Harbour turn 1 or `driftSteerMin` should re-run gate 9 on Harbour. Open for the track and kart-controller owners.
- 2026-09-21: **Solo Hard was 6 s slower than the scripted no-drift driver.** Cause: it took both Harbour shortcuts; on a 3 m road it centres, shortens its look-ahead and brakes for the pier's 20 m bend, losing 3–5 s per shortcut. Fix: narrow shortcuts only as a catch-up. Rule: measure a shortcut's gain for the AI before letting it choose one; "shortcut" is not "faster".
- 2026-09-21: **A parked kart on the line was never dodged.** Cause: the dodge compared `distanceAlong`, and a kart that never crossed the line is a full lap behind everyone on lap 2. Fix: `signedOffset(t)` along the track. Rule: geometry between karts uses `t`; `distanceAlong` is for rank only.
- 2026-09-21: **Rolling barrels were hit on 30–60 % of passes, dodge logic notwithstanding.** Cause 1: the barrel respawns on its spot every 4 s, sometimes 15 m ahead of a kart. Cause 2: pure pursuit with a 22 m look-ahead moves a kart sideways over ~45 m, too slow for a barrel closing at 30 m/s. Cause 3: on the oval every metre is a bend and at 88 % of the grip envelope the kart understeers through the dodge line. Fixes: keep a berth from the spawn spot, add a lateral steer term, test dodging on a straight. Rule: a dodge needs spare grip and a lane change that happens now; look-ahead alone gives neither.
- 2026-09-21: **The drift's "keep the charge" rule pushed every hairpin drift into the inside edge.** Cause: forcing half stick when the road needs less turns the kart in at 1.38 rad/s; the road is 10 m wide. Fix: modulate the stick to the road's yaw and only take the extra swing when the next tier is under 0.6 s away. Rule: on a wide road the drift's inward sweep is the budget, not the charge.
- 2026-09-21: **A bash heredoc with an apostrophe in a python string killed the whole command batch.** The harness evals the command; `'` inside a quoted heredoc still ends it. Rule: no apostrophes in heredoc-fed scripts; use double quotes or write the file with the Write tool.
- 2026-09-23: **With off-road past the curb the Hard AI lost 2.75 s a lap on Harbor (it had leaned on the wall in drifts).** Fix: a drift also lets go when the kart slides more than `outsideSlack` (0.3 m) past the outside road edge. Rule: any change to what stops a kart at the road's edge re-runs the Hard-vs-average gate.

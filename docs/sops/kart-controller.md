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

## Approach
_Synthesised 7 Sept 2026 from turbo-kart-rush `src/kart/Kart.ts`, Mario-Kart-3.js `PlayerController.jsx`, Starter-Kit-Racing `js/Vehicle.js`, research plan §4.1–4.2, §4.5–4.6, §6.4 and appendix A§2, B§2, B§5._

### What we take from the references
- **turbo-kart-rush** is the closest match: scalar kinematic model (forward speed + lateral velocity + vertical velocity), 120 Hz fixed step, hop → drift → 3-tier charge state machine, grip per surface, sticky ground snap, wall push-out, weight-class bumps. We copy its *shape*, not its code. We do not copy: re-deriving heading/slip from world velocity every tick (float drift), flat boost strength for all tiers, the `otherId & 31` cooldown table, its lack of render interpolation, and its 190-line `resolveTrack`.
- **Mario-Kart-3.js** gives two feel tricks: turn rate that scales with speed, and a visible chassis yaw that lags the logical heading. Its drift tiers are cosmetic and its timing uses GSAP tweens; nothing else is portable.
- **Starter-Kit-Racing** rides a rigid-body sphere. Rejected by the constraint above. We keep one idea: body pitch and roll are driven by an acceleration-lag term, not by physics.
- **Nobody** has slipstream. We design it from plan §4.1 and STK's 8×4 zone.

### The model (one kart, one tick)
State is the `karts[i]` entry from `race-state.schema.json`. Nothing else. No Three.js objects in the sim. All velocities are in the kart's own frame.
- `speed` m/s along `heading`; `lateralVelocity` m/s to the right; `verticalVelocity` m/s up.
- `t` is the nearest spline fraction; `position` is world metres.

Per tick, in this order:
1. **Timers** — boost, spin, slow, drift charge multiplier, slipstream, intangible. All count down by `dt`.
2. **Status gate** — if `spinRemaining > 0`: ignore input, decay `speed` to 0 over the spin, skip to step 8.
3. **Target speed** — `V = base.topSpeed × speedClasses[cc] × (1 + archetype.speed) × (1 + coins × coinBonusEach)`, then `× boost.multiplier` if a boost is live, then capped by `status.slowedTo` if set. Then the **surface cap**: `V = min(V, base.topSpeed × ... × surfaceSpeed[surface])`, skipped entirely while a boost is live (`boostIgnoresSurfaceCap`) or while airborne (`airborneIgnoresSurfaceCap`). `speed` moves toward `V` at `accel × (1 + archetype.accel)` when throttling, at `brake` when braking, and coasts at `coastDecel` with no input. Above `V` it decays at `overSpeedDecel` so a boost tails off instead of stopping dead, and so hitting mud bleeds speed over about half a second instead of slamming. Brake at rest → reverse at `reverseFraction × V`.
4. **Steer** — normal: `yaw = steer × steerRate × (1 + archetype.handling) × f(speed)`, with `f(v) = min(1, v / (0.15 V)) × (1 − steerFalloff × v / V)`. This gives a 30 m turn radius at top speed (STK) and a tight pivot at low speed. Reverse flips the sign. Drifting: `yaw = drift.direction × steerRate × lerp(driftSteerMin, driftSteerMax, stickToward)`, where `stickToward` is 0..1 how far the stick points into the drift. Outward drift only.
5. **Rotate the velocity into the new frame** — when heading turns by `Δθ`: `speed' = speed cosΔθ + lat sinΔθ`, `lat' = lat cosΔθ − speed sinΔθ`. Then damp: `lat -= lat × grip × dt`, with `grip = base.grip<surface> × trackQuery.gripScale`. This is the whole slide model: ice slides because grip is low, nothing else.
6. **Hop / drift state machine** — `idle → hopping → drifting → idle`. Press drift while grounded and `speed ≥ driftMinSpeed × V` → hop (`verticalVelocity = hopVelocity`, plus ground climb rate on a slope). Land within `hopSeconds` with stick held → drift locks `direction = sign(steer)`. Charge each tick: `+chargeFull` when `stickToward ≥ 0.5`, `+chargeNeutral` otherwise, scaled by `dt × 60` because the schema numbers are per 60 fps frame, and multiplied by `drift.chargeMultiplier` while the Rocket Lolly timer runs. Tier = count of `driftTiers` passed; emit `driftTierUp` on each change. Release → boost from tier (`boostMultiplier`, `boostSeconds[tier − 1]`), tier 0 → nothing. Cancel with no boost if `speed < driftKeepSpeed × V`, airborne longer than `driftAirCancelSeconds`, or hit. An optional `maxDriftTier` on the step options caps the tier (Smart Steer later).
7. **Boost arbitration** — one live boost. Priorities: trick 5 > item 4 > pad 3 > drift 2 > slipstream 1 = start 1. A new boost replaces the live one only if its priority is ≥ the live one; equal priority keeps the longer remaining time. Emit `boostStart`. Boosts never add.
8. **Gravity and ground** — `verticalVelocity -= gravity × dt`. Query the track at the kart's `t` and lateral offset for `groundY`, `normal`, `surface`, `halfWidth`. If `y ≤ groundY + groundStick` and `verticalVelocity ≤ groundLaunchVy`: snap, `grounded = true`, `verticalVelocity = 0`, emit `landed` if it was airborne (and fire the queued trick boost). Otherwise airborne. Leaving a `jumps[]` ramp sets `verticalVelocity = launch` and `airborne.fromJumpId`; the drift button while airborne from a jump sets `trickQueued`. Below `voidY` → emit `respawn` (race-manager does the reset).
9. **Integrate** — `position += (forward × speed + right × lat) × dt`; `y += verticalVelocity × dt`. Update `t` by a local search ±`tSearchWindow` around the previous `t` (never a global search: it is slow and it jumps at crossings).
10. **Walls** — if `|lateral offset| > halfWidth − kartRadius`: push back to the edge, reflect the outward lateral velocity by `wallRestitution`, scrub `speed` by `wallScrub` if the impact was hard, emit `hit`-free `wall` event with a cooldown.
11. **Kart vs kart** — circles of `kartRadius`. On overlap: separate along the contact normal in proportion to inverse mass, and the lighter kart gets `bumpForce × massRatio` lateral. `mass = 1 + archetype.weight + (boost live ? dashMassBonus : 0) + (status.shield ? shieldMass : 0)`. This is the heavy class's whole mechanical hook, and it is the one weight rule every Mario Kart has: heavies push further and resist being pushed. The dash-mass term is MK8DX's, and it is what stops "heavy always wins" being boring — a boosting light kart wins the bump. Ghosts and intangible karts skip this.
12. **Slipstream** — in another kart's wake (behind it within `slipstreamLength`, within `slipstreamHalfWidth`, moving the same way) accumulate `slipstreamSeconds`; at `base.slipstreamSeconds` grant the slipstream boost and reset.
13. **Hit** — `applyHit(kind)`: drops `hitCoinsLost` coins. Then the **coin shield** (Mario Kart's real rule): if the kart had at least one coin, it takes `status.slowedTo = coinShield.slowedTo` for `coinShield.slowSeconds` instead of spinning; at zero coins the same hit sets `spinRemaining = hitSpinSeconds`. Either way the drift and the live boost are cancelled. Emit `hit`.

Render side (`KartView`): holds previous and current sim pose, lerps by the accumulator fraction, and adds cosmetic lean: chassis yaw lags heading, roll ∝ `steer × speed`, pitch ∝ acceleration lag, plus drift slip angle up to `driftVisualSlip`. None of this touches the sim.

### Module boundaries (`src/kart-controller/`)
| File | Owns | Test |
|---|---|---|
| `constants.ts` | Loads `kart.schema.json` defaults, applies archetype + cc scale → a frozen `KartConstants` | archetype totals stay equal; cc scaling only touches top speed |
| `types.ts` | `InputState`, `KartState` (mirrors race-state schema), `TrackQuery` interface, `KartEvent` union | — |
| `speed.ts` | step 3 | reaches V within expected seconds; boost tails off; reverse; mud caps to 0.5 V; a boost and a hop both ignore the cap |
| `steer.ts` | steps 4–5 | radius at V ≈ 30 m; ice slides further than road; no steer when stopped |
| `drift.ts` | step 6 | tiers fire at 0.83 / 1.83 / 2.83 s full stick; neutral stick is slower; cancel cases; chargeMultiplier doubles |
| `boost.ts` | step 7 | priority table; no stacking; equal priority keeps the longer |
| `ground.ts` | steps 8–9 | snaps on slopes; launches off a ramp; lands and fires a queued trick; void event |
| `collide.ts` | steps 10–11 | wall push-out; heavy bumps light harder; a boosting light kart wins the bump; ghost skipped |
| `slipstream.ts` | step 12 | 2 s in wake → boost; leaving the wake resets |
| `step.ts` | the ordered tick; `stepKart(state, input, track, consts, dt) → KartEvent[]` | determinism: same log → identical state hash |
| `view.ts` | interpolation and lean, Three.js only here | no unit test; visual |
| `input.ts` | keyboard + gamepad → `InputState` per tick, sampled once per sim tick | mapping table only |

The sim never imports Three.js. `TrackQuery` is an interface: `{ sample(t, lateral) → { position, tangent, normal, groundY, halfWidth, surface, gripScale }, nearestT(position, hintT, window), length, jumps, boostPads, voidY }`. Track-builder implements it later; the tests here use a flat oval stub.

### Constants
From `kart.schema.json` defaults (unchanged): topSpeed 25, accel 12, brake 20, steerRate 2.4, driftSteerMin 0.35, driftSteerMax 0.8, hopSeconds 0.25, chargeFull 5, chargeNeutral 2, driftTiers 250/550/850, boostMultiplier 1.2, boostSeconds 0.6/1.5/2.5, trick 1.3 × 0.7 s, pad 1.3 × 1.0 s, item 1.4 × 1.5 s, slipstream 2.0 s → 1.12, coin 0.0066 cap 10, grip road 8 / offroad 4 / mud 3 / ice 2.5, start boost window 0.3 s → 1.2 × 1.0 s, bumpForce 6, hitSpinSeconds 1.0, hitCoinsLost 3, cc 0.7/0.85/1.0.

New constants. All of these are now **in** `kart.schema.json` `base` (added 8 Sept 2026, schemas before code): `surfaceSpeed`, `boostIgnoresSurfaceCap`, `airborneIgnoresSurfaceCap`, `gravity` 26, `hopVelocity` 3.25, `coastDecel` 4.5, `overSpeedDecel` 10, `reverseFraction` 0.35, `steerFalloff` 0.65, `driftMinSpeed` 0.45, `driftKeepSpeed` 0.3, `driftAirCancelSeconds` 0.9, `kartRadius` 0.85, `groundStick` 0.12, `groundLaunchVy` 1.0, `wallRestitution` 0.3, `wallScrub` 0.15, `slipstreamLength` 8, `slipstreamHalfWidth` 2, `tSearchWindow` 0.02, `driftVisualSlip` 0.49, `dashMassBonus` 0.35, `coinShield`.

Two existing defaults changed at the same time: `gripOffroad` 4 → 8 and `gripMud` 3 → 8, and `hitCoinsLost` 3 → 2. See the surface research below.

### What Mario Kart World actually does (researched 8 Sept 2026)
Sources: [Off-Road](https://www.mariowiki.com/Off-Road) and [MK8DX in-game statistics](https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics) on Super Mario Wiki, [MKWii boost data](https://wiki.mkwtas.com/wiki/Boost_information), [Vike's drifting guide](https://vikemk.com/drifting-guide), [Game8 MKW stats](https://game8.co/games/Mario-Kart-World/archives/523474), [VULKK on MKW stats](https://vulkk.com/2025/08/10/how-stats-work-in-mario-kart-world/). Mario Kart World itself is barely datamined as of Sept 2026, so the numbers below are MK8DX and MK Wii, and I say so where it matters.

- **Off-road is a speed cap, not grip.** The datamined `BrakeRt` for dirt is a flat fraction of top speed, in three tiers: 0.7 light, 0.5 medium, 0.3 heavy (deep sand). Steering, grip, drifting and mini-turbo charging are all *unaffected* by dirt. Our original grip-based off-road was wrong, hence the `gripOffroad` and `gripMud` change. We map dirt → 0.7 and mud → **0.6**, a softened medium tier (Adam, 8 Sept 2026), and leave 0.5 and 0.3 free for deeper surfaces later.
- **Only slippery ground cuts grip.** MK8DX handles ice and sand with a separate slip value near 0.9 of top speed plus real sliding. So ice keeps a modest speed cap (0.9) and pays in grip (2.5). That matches Frostbite Pass in the bible.
- **Boosts and air ignore the cap.** A dash panel in MK Wii carries explicit off-road immunity, and an airborne kart never touches the ground surface at all. This is why "hop over the mud" is a real Mario Kart line. We apply it to every boost source, one rule, easy to read.
- **Mini-turbo charge rate is not a weight thing.** MK8DX's hidden Mini-Turbo stat changes boost duration and strength, is set per character and kart part, and does not track weight at all: Bowser is at the top of the range and Wario is at the bottom, and both are heavy. So a "light karts charge faster" hook has no Mario Kart precedent. **Not added.**
- **Bump-by-weight is universal.** Every Mario Kart resolves a kart-to-kart bump with a collision mass, and Mario Kart World's own Weight tooltip says it "affects collision between vehicles". MK8DX also carries a separate larger mass while boosting. **Added**, as `dashMassBonus` plus mass-proportional separation.
- **Coins are a hit buffer, for everyone.** In Mario Kart a hit at zero coins spins you out; holding coins turns the same hit into a coin loss and a speed dip. Mario Kart World also cut coin loss from 3 to 2. **Added** as `base.coinShield` and `hitCoinsLost` 2. It replaces the invented "medium keeps coins" hook, which Adam removed from design §4 on 8 Sept 2026. Medium now has no hook, exactly as in Mario Kart World.
- **A class needs a verb, not a stat bar.** Mario Kart World removed inward drift and bikes stopped being interesting. The lesson for us: heavy has the bump, and that has to be genuinely felt.

Two boost numbers were off against the sources. Adam approved the change on 8 Sept 2026, so `docs/design.md` §7 and the schema now read:
| Was | Now | Source |
|---|---|---|
| drift boost +20% | **+30%** | MK Wii mini-turbo is +30%; the +20% row is its standstill mini-turbo, which plan §4.1 appears to have read by mistake |
| boost pad +30% for 1.0 s | **+40%** for 1.0 s | MK Wii dash panel, 60 frames |

Item speed is also +40%, so trick 1.3 < pad 1.4 = item 1.4 and the "boost never exceeds 1.4 × V" test still holds.

### Tests (headless, vitest, all deterministic)
1. Per-module tests in the table above.
2. **Determinism**: run a 3600-tick scripted log twice → byte-identical state; run it in two chunk sizes → identical.
3. **Drift tiers**: full stick from a standing drift fires tiers at 0.83 s, 1.83 s, 2.83 s ± 1 tick.
4. **Boost cap**: over any log, `boost.multiplier ≤ 1.4` and `speed ≤ 1.4 × V_eff` where `V_eff` includes cc, archetype, surface and coins.
5. **Lap time**: scripted log on the flat oval stub finishes within ±2% of its recorded time. The Harbour Loop version of this test is added when track-builder lands and becomes the gate from then on.
6. **Archetype fairness**: the same log on light / medium / heavy finishes within 3% of each other on the oval (equal totals in practice, not just on paper).
7. **Surface cap**: driving onto mud at top speed settles at `0.6 × V` and takes about 0.4 s to bleed there, not one tick. Dirt settles at `0.7 × V`. Grip on dirt and mud is identical to road; only ice slides further.
8. **Cap bypass**: the same mud run with a live boost, and again with a hop over the patch, both keep full speed.
9. **Bump**: heavy into light moves the light kart further than light into heavy, and a boosting light kart wins the bump against a coasting heavy.
10. **Coin shield**: a hit with coins in hand slows and drops 2 coins with no spin; the same hit at zero coins spins for `hitSpinSeconds`.

### Out of scope here (other SOPs)
Device remapping UI, Smart Steer, auto-accelerate, camera, particles, audio, respawn placement, checkpoints, positions, item effects beyond the status fields the controller already honours.

## Decisions
- 2026-09-07: Charge values in the schema are per 60 fps frame; the 120 Hz sim multiplies by `dt × 60`. Tiers stay 250/550/850.
- 2026-09-07: Boost priority is trick 5 > item 4 > pad 3 > drift 2 > slipstream 1 = start 1. Pad sits between item and drift because the bible only orders the other three.
- 2026-09-07: Coins scale base speed; boosts multiply that. So the test cap is `1.4 × V_eff`, not `1.4 × topSpeed`.
- 2026-09-07: Kart-controller ships with a flat-oval `TrackQuery` stub for tests because track-builder comes next in the build order. The Harbour Loop lap test is a follow-up in the track-builder session.
- 2026-09-07: Reverse exists (0.35 × V) so nobody gets stuck on a wall. It is not in the bible; delete if it causes trouble.
- 2026-09-08: Off-road is a top-speed cap, not a grip cut, matching MK8DX `BrakeRt`. Added `base.surfaceSpeed` (dirt 0.7, mud 0.5, ice 0.9) and set `gripOffroad` and `gripMud` equal to `gripRoad`. Ice keeps the low grip.
- 2026-09-08: A live boost and being airborne both ignore the surface cap (MK Wii dash-panel off-road immunity; airborne karts touch no surface). This makes hopping over mud a real line.
- 2026-09-08: Light does **not** get faster drift charge. MK8DX's Mini-Turbo stat is per character and part and does not track weight, so there is no Mario Kart precedent. Dropped from the schema `hook` enum entirely.
- 2026-09-08: Heavy **does** get the harder bump, via mass-proportional separation plus `dashMassBonus` 0.35 while boosting, matching MK8DX collision mass and dash mass. Mario Kart World's Weight tooltip says weight affects vehicle collision.
- 2026-09-08: "Medium keeps coins on hit" is invented and has no Mario Kart precedent. Replaced by `base.coinShield`, the real Mario Kart rule, for all eight racers, and `hitCoinsLost` 3 → 2 to match Mario Kart World. Adam approved; design §4 now reads "Medium: all 0, no hook" and the archetype `hook` enum is `none | hardBump`.
- 2026-09-08: Adam approved the Mario Kart boost strengths. Drift mini-turbo +20% → **+30%**, boost pad +30% → **+40%**. design §7 and the schema both updated. Ceiling is unchanged at 1.4 × V.
- 2026-09-08: Adam softened mud from the MK8DX medium tier 0.5 to **0.6**. Dirt stays at the sourced 0.7, ice at 0.9.
- 2026-09-14: Archetype numbers live in `src/kart-controller/constants.ts` (`ARCHETYPES`), sourced from design §4. The schema has no defaults for them. Adam chose this over adding schema defaults.
- 2026-09-14: The "archetype totals stay equal" paper test is dropped (design §4 sums to +1 / 0 / +6, not equal). Fairness is tested on the track instead. Adam approved.
- 2026-09-14: Fairness is track-shaped, not a single number. Measured on the flat oval: heavy +10% speed wins long straights (L120 R30: heavy 2012, medium 2160, light 2310 ticks), light wins tight corners (L40 R12: light 944, medium 987, heavy 1055). The test asserts both directions plus ≤5% spread on a balanced oval (L50 R14: 1043–1079). The SOP's flat 3% claim only holds per track; revisit when Harbour Loop lands.
- 2026-09-14: Added `base.slipstreamBoostSeconds` 1.5 to the schema. design §7 gives the slipstream boost length but the schema had no field for it.
- 2026-09-14: Lap record on the default oval (L120 R30, medium 150cc, scripted look-ahead driver) is 2160 ticks = 18.0 s. The ±2% gate compares against it until the Harbour Loop test replaces it.
- 2026-09-14: `npm run verify` now exists as `tsc && vitest run`. Perf, bundle size and a11y get added by later systems.
- 2026-09-15: Codex review, five findings, all accepted. (1) Spin now decays speed linearly to exactly 0 when `spinRemaining` ends, not at `brake` rate. (2) `TrackQuery.sample().gripScale` now multiplies grip; stored on the kart as `gripScale` from the last ground sample because steer runs before ground. (3) A `boost` surface fires on entry *and* on landing straight onto it. (4) `index.ts` no longer re-exports `view.ts`; the render side is imported directly so headless code never links Three.js. (5) Five tuning constants moved into the schema: `wallCooldownSeconds` 0.2, `bumpCooldownSeconds` 0.25, `hardWallFraction` 0.3, `slipstreamSameWayDot` 0.7, `hopLandWindow` 2.
- 2026-09-19 (race-manager session, Adam approved the cross-folder edit): `stepGround` no longer snaps an **airborne** kart that is deeper under the road than one tick of fall plus `groundStick`; it keeps falling and the `voidY` respawn event becomes reachable on a real track. A grounded kart under a rising slope, and a landing that crossed the surface this tick, still snap. Found because race-manager's void test could only pass with a mocked event.
- 2026-09-15: Codex round two, four findings, all accepted. (1) Drift cancel cases (too slow, airborne too long) now run before release, so a dead drift never pays a boost. (2) `crossed()` treats a backwards move of ≤ half a lap as reverse travel and fires nothing; only a forward move counts, so reversing past a ramp cannot launch you. (3) Added `base.maxBoostMultiplier` 1.4; `requestBoost` clamps every caller to it. (4) Spin decay now uses the spin state from the start of the tick, so speed is exactly 0 on the tick the spin ends; timers snap to 0 under 1e-9 s because 120 × (1/120) is not exactly 1 in floats.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-21: **Driving nose-first into the edge parked the kart at 0 km/h.** Cause: the wall removed the outward part of the velocity, and with the nose square to the wall that was all of it; holding throttle just fed it back in. Fix: on a hard hit the nose swings `wallDeflect` (0.7) of the way toward the wall line and the remaining speed goes along it, so the kart slides on. Rule: a wall is something you glance off, never something you stick to; Mario Kart bounces, it never parks you.
- 2026-09-21: **Right arrow turned the kart left on screen.** Cause: `rightOf(heading)` is `up × forward`, which in Three's right-handed Y-up frame is the *left*; every sim-side "right" (lateral +, steer +, drift direction +1) is screen-left. The sim, track lateral, race-manager and AI are all consistent with each other, so nothing there changes. Fix: `mapInput` gives the right key and stick −1. Rule: sim "right" means the `rightOf` vector, not the screen; anything that meets a human (input, HUD arrows, minimap) flips at the boundary, in one place.
- 2026-09-15: Spin ended with speed 1e-15, not 0 → `spinRemaining` after 120 ticks of 1/120 was 1e-15, not 0, so the decay ratio was tiny but nonzero → `countDown` snaps anything under 1e-9 s to 0 → rule: every countdown timer needs an epsilon snap; never compare a float timer to exactly 0 without one.
- 2026-09-15: Boost surface never fired when landing onto it → the surface check ran before the ground snap, so `grounded` was still false, then the next tick saw `surface === 'boost'` already and skipped the edge → moved the check after the snap and fire on `!wasGrounded` too → rule: anything that keys off "entered surface X" must run after the ground step and treat landing as an entry.
- 2026-09-15: Track `gripScale` was read into the sample and thrown away → steer (step 5) runs before ground (step 8), so the sample was not available yet → store `gripScale` on the kart in the ground step and read it next tick → rule: any per-tick track value the early steps need is cached on the kart by the ground step, one tick late, on purpose.
- 2026-09-14: Drift-tier timing test found no tiers → the test kart held full lock on the 16 m wide oval, hit the wall every tick, `wallScrub` bled it under `driftKeepSpeed` and the drift cancelled → run full-lock drift tests on a wide stub (`halfWidth: 60`) → rule: a test that holds a steady drift needs room for the circle; the sim was right.
- 2026-09-14: Hop landed at 0.20 s, not `hopSeconds` 0.25 → `groundStick` 0.12 m catches the kart on the way down (peak height is only 0.2 m) → test accepts 0.7×–1.0× hopSeconds → rule: `groundStick` shortens every hop; the landing window for locking a drift is 2 × hopSeconds so this never costs a drift.

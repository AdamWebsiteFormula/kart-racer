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

## Approach
_Synthesised 21 Sept 2026 from turbo-kart-rush `src/items/ItemManager.ts` (+ `kart/Kart.ts`, `core/constants.ts`), Mario-Kart-3.js and Starter-Kit-Racing (neither has any item, pickup or projectile code; MK3.js only has a drift-boost flag in a store), research plan §5 and appendix Reports A, B, C, design §7 and §8, the item, kart and race-state schemas, and the kart-controller, race-manager, ai-driver and track-builder surfaces in `src/`._

### What we take from the references
- **From turbo-kart-rush** (the only reference with items): one manager owns every item thing (roulette, held slot, projectiles, ground items, hits); the kart exposes mutators only (`applyHit`, boost) and knows no item names; per-place weighted roll tables; an **owner grace** so you cannot hit yourself the instant you fire (0.35 s); spinning and finished karts are immune; a hard cap on live hazards; a homing projectile that chases the centreline when far and aims direct when near; wall bounce by reflecting the lateral component at `halfWidth − margin`; no press while roulette, spinning or frozen; ground drops behind, lobs ahead.
- **We do not copy**: its 40-hazard cap that silently deletes the oldest (we cap by design, per owner, and every removal fires an event); lifetime expiry with no event; two separate collision paths (blue shell special-cased) that must be kept in sync by hand; magic numbers inside functions (`bestD = 0.35`); straight-line motion with a lerp toward the tangent (ours lives on the spline LUT like every other race system); its roll tables (Nintendo set).
- **From research**: position-weighted table in the MK Wii shape; "speed up losers" over "stop the leader"; the leader always has a defensive roll; a global item shows the leaders a warning icon while it is held; equalisers locked for the first 15 s and the last 8 s of the final lap; item *roles* reused, item *designs* never (appendix IP boundary); 60–90 ms hit-stop and rotational shake belong to vfx-juice, not here. The research gives **no** projectile count, pool or particle budget: we set one below and record it as a Decision.

### The model
`Items` is pure TypeScript, no Three.js. The game loop calls it once per tick, **after** `manager.step(inputs)`: `items.step(manager.state, inputs, raceEvents)` reads the `pickup` events race-manager just emitted and the same `InputState[]` the manager saw. It writes only through the public surface: `KartState.item`, `KartState.status`, `KartState.drift.chargeMultiplier(+Remaining)`, `applyHit(...)`, `requestBoost(...)`. It never moves a kart. It returns `ItemEvent[]` for HUD, audio and VFX, and its own state (`ItemsState`) is a plain serialisable object with `snapshot()` / `restore()`, index-aligned with `karts[]` like race-manager `trackers[]` and ai-driver `AiMemory[]`.

**Roll.** On `pickup {racerId}` with `item.held === 'none'` and no roulette running: `rouletteRemaining = rouletteSeconds` (1.5) and the item is decided **now** from the kart's `rank` at pickup, using the table row for that rank, with these masks applied before the draw: `lockedDuringLockout` ids weigh 0 while `time < lockoutSeconds` or while `phase === 'finalLap'` and the leader is within `finalLapLockoutSeconds` of the line (see Constants); in Knockout the `knockoutPoolByRacers[remaining]` list is the allowed set. Remaining weights are re-normalised, never re-rolled. The held id is stored at once (`held = id`) and hidden by the HUD until `rouletteRemaining` hits 0. A pickup while holding or while rolling pops the balloon and gives nothing (race-manager already respawns it). A Time Trial (`mode === 'timeTrial'`) or a ghost never rolls. The rng is one seeded xorshift stream per race (`seedFor(RaceState.seed, 0xB1A5)`, ai-driver's `rng.ts` pattern), stored as a uint32 in `ItemsState`, so a replay rolls the same items.

**Use.** `input.item` is edge-detected per kart (`prevItem[]`, like the controller's `prevDrift`). A press is ignored while `rouletteRemaining > 0`, `spinRemaining > 0`, `intangibleRemaining > 0`, before GO, or after finishing. A press with `lookBack` held fires the Beach Ball backward; every other item ignores `lookBack`. One use consumes one charge; `held` becomes `'none'` at zero charges. Every accepted press fires `itemUsed`.

**The 8 items** (design §8 names, plan §5 numbers, schema `role`):
| id | role | on press | numbers |
|---|---|---|---|
| `beachBall` | forward | spawn a **projectile** 1.5 m ahead (or behind with `lookBack`) at the kart's lateral, moving along the spline at `projectileSpeed`; reflects off the road edge, `bouncesLeft` 3 → pops on the 4th edge | speed 38 m/s (1.5 × base top speed, scaled by class), ttl 8 s, radius 0.6 |
| `homingKite` | homing | spawn a projectile that chases `targetId` = nearest kart ahead by `distanceAlong` (none ahead → flies straight like a 0-bounce ball); follows the centreline at `projectileSpeed`, lateral eases to the target's lateral over the last `homingSnapDistance`; **one in flight per owner** (second press refused, item kept); sets `threatened` on the target for ai-driver | speed 30 m/s (1.2 ×), ttl 10 s, radius 0.6, snap 12 m |
| `oilCan` | rearDrop | place a **ground item** 2.5 m behind on the kart's branch | lifetime 20 s, radius 1.2; hit: `slowedTo` 0.5 for 1 s, no spin, no coins |
| `decoyBalloon` | deception | place a ground item 2.5 m behind; rendered as a pickup balloon | lifetime 20 s, radius 0.9 (= `balloonRadius`); hit: `applyHit('item')` |
| `airHorn` | defenceArea | instant: every projectile and ground item within `radius` of the kart pops; every other kart within `radius` takes `applyHit('item')`; owner immune | radius 6 m (= ai-driver `defenceRadius`) |
| `bubble` | defenceHeld | instant: `status.shield = true` for `durationSeconds`; absorbs one hit then pops; while up, collision mass gets `shieldMassBonus` 0.5 (kart schema; one-line change in `collide.ts`, which today reuses `dashMassBonus` 0.35) | 8 s, weightBonus 0.5 |
| `rocketLolly` | speed | `requestBoost('item', itemSpeedMultiplier 1.4, itemSpeedSeconds 1.5)` **and** `drift.chargeMultiplier = 2, chargeMultiplierRemaining = 2`; 3 charges; a refused boost (a Trick is live) still spends the charge and still doubles the drift charge | charges 3, chargeMultiplier 2, chargeSeconds 2 |
| `fogBank` | equaliser | instant, only when the owner's `rank ≥ minPosition` (5), otherwise the press is refused and the item kept; every kart with a smaller `rank`: `slowedTo` 0.6 for 3 s, `held = 'none'`, charges 0, roulette cancelled, in-flight Kite left alone; a Bubble does **not** block it (schema `affects: 'ahead'`) | slowTo 0.6, 3 s, minPosition 5 |

Boosts never stack: Rocket Lolly goes through `requestBoost`, which already enforces Trick > Item > Drift and the 1.4 ceiling. Bubble weight, hit spin, coin loss and the coin shield are the controller's rules; items only calls them.

**Projectiles** live on the track like karts: `{ id, itemId, ownerId, t, branch, lateral, speed (signed along the tangent), lateralVelocity, position, prevPosition, bouncesLeft, targetId, ttl, graceRemaining }`. Each tick: advance `t` by `speed·dt / trackLength` (LUT), add `lateralVelocity·dt`, sample the spline for `position`, `groundY`, `halfWidth`; a Beach Ball whose `|lateral| > halfWidth − radius` reflects `lateralVelocity`, clamps inside and decrements `bouncesLeft`; the Kite steers `lateralVelocity` toward the target's lateral within `homingSnapDistance` and stops chasing when the target finishes, respawns or is intangible (then it is a straight ball with 0 bounces). A projectile pops when `ttl` hits 0, `bouncesLeft < 0`, its branch closes, or it overlaps another projectile, a ground item, or a kart. `position` and `prevPosition` are kept so the renderer can interpolate them like karts.

**Ground items** are `{ id, itemId, ownerId, t, branch, lateral, position, ttl }`, static; they pop on kart overlap, on `ttl`, when their branch closes, or when an Air Horn or projectile reaches them. Oil applies its slow with no cooldown per kart beyond the 1 s it lasts; a Decoy spins.

**Hits.** One function decides everything so no item has a private path: `landHit(victim, kind, source)` → ignore when the victim is a ghost, finished, `intangibleRemaining > 0`, `spinRemaining > 0`, or the projectile's owner within `graceRemaining`; if `status.shield` → `shield = false`, event `shieldPop`, no hit; else `applyHit(victim, consts, kind, kartEvents)` with `kind = 'projectile'` for Ball and Kite and `'item'` for Oil, Decoy and Horn. Hits never strip the held item (schema `dropsItem: false` for all 8); only Fog Bank does. Overlap is a sphere test `distXZ < a.radius + kartRadius` on the same branch, the same shape as race-manager `pickups.ts` and `hazards.ts`.

**AI hooks.** `Items.roles` is the `id → role` map ai-driver's `AiDriver` takes as `opts.itemRoles`; `items.threatened(i)` is true while a Kite has kart `i` as `targetId`, and the loop copies it into the AI's `ItemContext` (one line in `main.ts` when wired). Fog Bank held by anyone fires `equaliserHeld {on, racerId}` for the HUD leader warning.

**Capacity.** At most 1 projectile and 2 ground items per owner (a third Oil pops the oldest, with an event), so ≤ 8 projectiles and ≤ 16 ground items ever; pools are pre-allocated and ids are reused. The renderer (art-pipeline later) draws each kind with one `InstancedMesh`: 4 instanced draws + the bubble as one instanced shell = 5 draw calls total for items, inside the 100 budget.

### Module boundaries (`src/items/`)
| file | owns | test |
|---|---|---|
| `types.ts` | `ItemDefinition`, `ItemsConfig`, `Projectile`, `GroundItem`, `ItemsState`, `ItemEvent` (mirrors item and race-state schemas; no Three.js) | — |
| `data.ts` | the 8 definitions, the 8-row table, lockouts, `knockoutPoolByRacers`, `ITEM_ROLES` (id → role) | validates against `docs/schemas/item.schema.json`; every id in every table row exists; every row has a defence for rank 1–2 |
| `rng.ts` | xorshift stream, `seedFor`, `weightedPick(weights, u)` | 10,000 draws per position within 2 % of the table; masked ids never drawn |
| `roulette.ts` | pickup → roll with lockout and Knockout masks; roulette countdown | lockout windows; Fog never rolled at rank ≤ 4; pool shrinks per racers remaining; nothing while holding |
| `use.ts` | press edge detection, refusal rules, dispatch by role to the item functions | each item's press effect on a fake kart; refusals; charges |
| `projectiles.ts` | spawn, spline advance, bounce, homing, ttl, pool | Ball bounces exactly 3 then pops; Kite reaches a target on a straight and on a bend; loses target cleanly; one Kite per owner |
| `ground.ts` | place, ttl, branch close, pool | expiry, oldest-pops rule |
| `hits.ts` | overlap tests, `landHit`, Air Horn radius, Fog Bank | shield absorbs one; grace; spinning immune; Fog strips items and roulette; Horn clears both kinds and spins neighbours |
| `items.ts` | `Items` class: `step`, `snapshot`, `restore`, `roles`, `threatened` | determinism: same seed + input log → identical state hash after 60 s; snapshot/restore byte-equal; Time Trial inert |
| `index.ts` | public surface | — |

The test drive wires it in `src/main.ts` (three lines: construct, pass `roles` to the AI, step after the manager) and draws placeholder spheres in `src/game/`; that is the only edit outside `src/items/`.

### Constants
All in `data.ts` as the schema instance; code reads the instance, never a literal. Kart-side numbers (`itemSpeedMultiplier` 1.4, `itemSpeedSeconds` 1.5, `hitSpinSeconds` 1.0, `hitCoinsLost` 2, `dashMassBonus` 0.35, `kartRadius` 0.85, `maxBoostMultiplier` 1.4) stay in the kart schema; track-side (`balloonRadius` 0.9) in the track schema.
- `rouletteSeconds` 1.5 · `lockoutSeconds` 15 · `finalLapLockoutSeconds` 8 · `lockedDuringLockout` [`fogBank`] · `ownerGraceSeconds` 0.35 · `spawnAhead` 1.5 m · `dropBehind` 2.5 m (past kartRadius + the widest ground radius, so a parked kart never sits on its own drop) · `projectileHeight` 0.35 m above `groundY`.
- Per item: see the table above. Speeds are m/s at the 100 cc base and scale with the speed class factor the karts use.
- Table (weights per rank; plan §5 rows with the four cut items' weight moved to the nearest role in the same row):

| rank | beachBall | homingKite | oilCan | decoyBalloon | airHorn | bubble | rocketLolly | fogBank |
|---|---|---|---|---|---|---|---|---|
| 1–2 | 25 | 0 | 40 | 25 | 0 | 10 | 0 | 0 |
| 3–4 | 30 | 25 | 15 | 0 | 0 | 15 | 15 | 0 |
| 5–6 | 15 | 30 | 0 | 0 | 15 | 0 | 40 | 0 |
| 7–8 | 0 | 20 | 0 | 0 | 0 | 0 | 55 | 25 |

- `knockoutPoolByRacers`: 8 and 6 → all eight; 4 → no `fogBank`; 2 → no `fogBank`, no `decoyBalloon`. Rows are re-normalised after the mask.
- Final-lap lockout: "the last 8 s" is measured as the leader's remaining `distanceAlong` ÷ its class top speed ≤ 8 s (needs no lap-time history, so it works on a 1-lap segment).

### Tests (headless, vitest, deterministic)
1. `data.ts` validates against the item schema; each table row sums to 100; rank 1–2 has ≥ 1 defence role.
2. 10,000 draws per rank match the row within 2 %.
3. Lockout: no `fogBank` in the first 15 s or the last 8 s; re-normalised rows still sum to 1.
4. Fog Bank never fires (press refused, item kept) at rank ≤ 4, and never rolls there.
5. Beach Ball bounces exactly 3 times then pops, forward and backward; pops on ttl.
6. Homing Kite hits its target on a straight and through Harbour Loop's first bend; one per owner; pops on an Oil Can dropped in its path; releases `threatened` when it pops.
7. Oil slows to 0.5 for 1 s with no spin; Decoy spins; both expire at 20 s and pop when their branch closes.
8. Air Horn clears projectiles and ground items within 6 m, spins other karts within 6 m, never the owner.
9. Bubble absorbs exactly one hit, pops at 8 s, and the collision mass rises while it is up.
10. Rocket Lolly: 3 charges; boost 1.4 × for 1.5 s via `requestBoost`; refused under a live Trick; drift charge doubles for 2 s.
11. Fog Bank: every kart ahead slows to 0.6 for 3 s, loses item and roulette; the owner and karts behind are untouched.
12. Hit rules: owner grace 0.35 s, spinning and intangible karts immune, ghosts and finished karts never hit or roll.
13. Boosts never stack (a Lolly under a Trick keeps the Trick).
14. Determinism: two `Items` with the same seed and input log produce identical JSON after 7,200 ticks; `snapshot`/`restore` round-trips.
15. Time Trial and ghosts: `step` is a no-op.

### Out of scope here (other SOPs)
Balloon meshes, item icons and the roulette animation (ui-hud, art-pipeline); hit-stop, shake, pop particles and the fog cloud (vfx-juice); item sounds (audio); AI aim (ai-driver, already built); the leader's Final Lap Shift (race-manager); v2 items (Grapple Anchor, Swap Whistle, Ghost Cloak, Gravity Flip: design §8, not in v1).

## Decisions
- 2026-09-21 (Claude answered the six open points from the research, Adam delegated): Bubble adds **0.5** collision mass (plan §5 "+50 % bump weight"; new kart-schema `shieldMassBonus`, one line in `collide.ts`, the controller's 0.35 stays for boosts). Ranks 5–8 table: the four cut items' weight goes to Rocket Lolly and Homing Kite (plan §5 "speed up losers"; MK Wii shape puts attack mid-pack and speed at the back). Knockout pool: 8 and 6 all items; 4 no Fog Bank (last-4 would be everyone, the equaliser stops equalising); 2 also no Decoy (track memory is the counter, no one is behind). Fog Bank passes through a Bubble (the Bubble absorbs a *hit*; plan §5 counter for the Slow Field is timing, MK's shell shields never block Lightning). Only Fog Bank strips a held item; every other hit keeps it (MK8/MKW rule; plan §5 gives the strip to the Slow Field alone). Beach Ball 38 m/s and Homing Kite 30 m/s at 100 cc, scaled by class (1.5 × and 1.2 × the 25 m/s base; MK's unguided shell outruns its homing shell, turbo-kart-rush 34 / 30 has the same order).
- 2026-09-21 (build): the Homing Kite targets the nearest kart **physically ahead along the spline** (`wrap01(o.t − me.t)` under half a lap), not by `distanceAlong`: a kart that has skipped a checkpoint still sits in front of you, and the tests can place karts anywhere. Ground drops land **2.5 m** behind (past `kartRadius` 0.85 + the widest ground radius 1.2), so a parked kart never sits on its own Oil; the owner grace also covers ground drops. The eight items tunables that the schema lacked (`ownerGraceSeconds`, `spawnAheadMetres`, `dropBehindMetres`, `projectileHeight`, `homingSnapDistance`, `homingLateralRate`, `maxProjectilesPerOwner`, `maxGroundPerOwner`) are now item-schema defaults; `shieldMassBonus` 0.5 is a kart-schema default read by `collide.ts`. `AiDriver.threatened[]` is public and the loop copies `items.threatened` into it each tick. The test drive draws items with 4 instanced kinds + 1 instanced bubble (5 draw calls, present even when empty); the test drive sits at ~100 draw calls with them, which the performance session owns.
- 2026-09-21 (build): test 7's "pops when its branch closes" is written against the OVAL, which has no shortcut, so branch closure is exercised only by the code path (`branches.list[b].open`), not a test; the Harbour Loop pier test belongs to the next pass.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-21: Fog Bank rank test read rank 2 for the kart placed 5th → `placeAt` teleported karts more than one checkpoint sector ahead, the race-manager teleport guard counted nothing and `distanceAlong` went negative → place test karts inside the first sector (t within 0.125 of the grid) and build far-away states as copies, never by teleport → **rule: a headless test never teleports a kart past a checkpoint; it copies the state instead.**
- 2026-09-21: two `press()` calls in a row registered one use → the harness left `item: true` in the input and never ticked the release, so the edge detector saw one long hold → `press()` now ticks once down and once up → **rule: a button harness must release before it presses again, exactly like a finger.**
- 2026-09-21: a kart parked on its own Oil took a hit after the grace → drop distance 2 m was inside `kartRadius + oilRadius` 2.05 m → `dropBehindMetres` 2.5 → **rule: every spawn offset is checked against the sum of the two radii it must clear.**

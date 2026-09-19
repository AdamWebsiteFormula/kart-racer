# SOP — Track builder

## Purpose
Closed Catmull-Rom centerline → arc-length LUT → swept road/kerb/barrier mesh, boost pads, pickups, hazards, decor instancing, minimap outline, Final Lap Shift overrides.

## Inputs
TrackDefinition JSON.

## Outputs
Track object: LUT, meshes, checkpoint list, spawn grid, shortcut graph, applyFinalLapShift().

## Constraints
One material per track chunk. Merge statics. InstancedMesh for decor. Under 100 draw calls with 8 karts on screen.

## Tests (must pass before merge)
LUT round-trip: nearestT(pointAt(t)) == t ± 1e-3 for 1000 samples; checkpoints strictly increasing; draw-call count asserted in a headless render.

## References
turbo-kart-rush Centerline.ts and track/builders; three.js CatmullRomCurve3.

## Approach
_Synthesised 19 Sept 2026 from turbo-kart-rush `src/track/*` (Centerline.ts, Track.ts, builders/road.ts, builders/barriers.ts), Mario-Kart-3.js (GLB track + three-mesh-bvh), Starter-Kit-Racing (grid tiles + editor), research plan §4.2–4.4, §6.3–6.4, appendix A§3, A§6, B§4, C§8, first-principles §2, and the `TrackQuery` contract already fixed in `src/kart-controller/types.ts`._

### What we take from the references
- **turbo-kart-rush** is the model. Closed centripetal Catmull-Rom, a 2048-sample arc-length LUT stored as flat Float64Arrays, allocation-free `sample(t, out)`, hint-based local `closestT` with a two-segment projection refinement, half-widths smoothed across control points so seams do not show, hand-swept road/kerb/shoulder ribbons, instanced barriers, checkpoints at `i/N`, spawn grid sampled backwards from the start line, minimap from 200 edge samples. We copy the *shape*. We do not copy: Three.js `CatmullRomCurve3` in the sim (the sim never imports Three.js), the global-search fallback inside the hot path (kart schema says never), the procedural terrain distance field (1600 m grid, out of scope), `getUtoTmapping` at runtime, and its lack of any hairpin guard.
- **Mario-Kart-3.js** bakes the track as a Blender GLB and finds ground with three-mesh-bvh. Rejected as the source of truth: no centreline means no free positions, checkpoints, AI line or minimap, and every Final Lap Shift would be a second GLB. We keep nothing from it for v1. Wall collision does not need BVH either: the kart already clamps to `halfWidth − kartRadius`.
- **Starter-Kit-Racing** builds from a tile grid with a browser editor. Rejected: the editor is deleted from scope (first-principles §2) and tiles cannot do camber, elevation or smooth hairpins. We keep one habit: every decor species is one `InstancedMesh`.
- **Nobody** has shortcuts as branches, a rebuildable route, or banked road from data. Those we design here.

### The model
A `TrackDefinition` (JSON, validated against `track.schema.json`) becomes a `Track` in two layers:
1. **Sim layer** (pure TypeScript, no Three.js, headless-testable): spline → LUT → `TrackQuery`, checkpoints, spawn grid, shortcut branches, baked features, hazards, minimap outline, `applyFinalLapShift()`.
2. **Scene layer** (Three.js, only under `mesh/`): reads the sim layer and builds meshes. Never the other way round.

**Spline.** Our own closed centripetal Catmull-Rom (about 40 lines; same maths as Three.js `centripetal`, so authored points look identical in a debug overlay). Control points carry `x y z halfWidth bank surface`. Segment *i* runs from point *i* to point *i+1*; its `surface` is point *i*'s, its `halfWidth` blends smoothstep from point *i*'s to point *i+1*'s so there is no visible step and no post-filter.

**LUT.** `LUT_SAMPLES = 2048` samples at equal arc length (built by walking the curve with `ARC_DIVISIONS = 4096` fine steps, then resampling). Per sample, flat typed arrays: position (x,y,z), unit tangent, unit horizontal right `(tz, 0, −tx)` (this is exactly the kart-controller's `right`, so lateral offsets agree), bank in radians, halfWidth, surface id, segment index. `length` in metres. `sample(t, lateral)` linearly blends the two neighbouring samples then applies the lateral: `position = centre + right × lateral + up × (lateral × tan(bank))`, `groundY = position.y`, `normal = normalize(cross(rightBanked, tangent))`. Lateral is horizontal metres, so a kart's XZ lateral stays consistent on a banked corner. `wrap01` is applied to every incoming `t`; `sample(1) === sample(0)`.

**Bank sign.** Positive `bank` lifts the outer edge of a right turn, i.e. the left edge (negative lateral) rises. `MAX_BANK_DEG = 20`; validation rejects more.

**nearestT.** Local only, as the kart schema demands: scan integer samples inside `hintT ± window` (0.02 → ±41 samples) on XZ distance squared, take the best, then project the point onto the two adjacent LUT segments for a sub-sample `t`. Deterministic, allocation-free. A separate `nearestTGlobal(position)` (3D distance, coarse step 8 then refine) exists for spawn, respawn, feature baking and tests only. XZ-only local search is what lets Canyon Rush and Skyline Circuit cross over themselves: the window keeps the search on the right level, and only the global search needs Y.

**Shortcuts are branches.** The track holds branch 0 (main) plus one branch per `shortcuts[]` entry, each with its own small LUT. A branch sample is indexed by *main-equivalent* `t = lerp(entryT, exitT, u)` (wrap-aware), so a kart on a shortcut still has ordinary race progress, checkpoints, minimap dot and AI target. `nearest()` searches the current branch first, then any other *open* branch whose `[entryT, exitT]` overlaps the window, and switches only when the other is closer by more than `BRANCH_HYSTERESIS = 1.0 m` in 3D. `openOnLaps` and Final Lap Shift toggle `open`; a kart already on a branch that closes rides it to `exitT` and is never teleported. See open question 1: this needs `branch` on the kart state and a two-argument return from `nearestT`.

**Race helpers.** Checkpoint *i* at `t = wrap(startGrid.t + i / checkpointCount)`, checkpoint 0 is the start line; each carries position, tangent, halfWidth. Spawn grid: `rows × columns` slots walking backwards from `startGrid.t` by `spacing` metres per row, columns spread across `±0.5 × halfWidth`, alternate rows offset by half a column, heading = tangent. Minimap: `MINIMAP_SAMPLES = 200` left/right edge points per open branch, fitted into `[0,1]²` with `MINIMAP_PADDING = 0.06`, plus `toMinimap(position)`.

**Features bake to world.** Pickups (balloons), coins, boost pads, jumps and hazards are *authored* in `t + lateral` but *stored* as world positions at build time. After any LUT rebuild their `t` is re-derived with `nearestTGlobal`, so a shift that changes the track length cannot slide a boost pad down the road. `TrackQuery.jumps` and `boostPads` are views over these baked lists. Boost pads are `BOOST_PAD_HALF_LENGTH = 1.75 m` long, default `width = 3 m`.

**Hazards.** `hazards.ts` owns the deterministic kinematics for the five kinds, driven by race time only: `rolling` (moves along −tangent from `t` at `speed`, respawns every `period`), `crossing` (oscillates laterally across the road every `period`), `falling` (drops from height every `period`, active for 0.5 s on the ground), `static`, `gust` (a `period`-timed lateral push of `speed` m/s² over a 6 m window). It exposes `activeHazards(time) → { id, position, radius, hit, push? }[]`; race-manager does the kart test and calls `applyHit`. Nothing here touches kart state.

**Final Lap Shift.** `applyFinalLapShift()` is idempotent and runs once, when race-manager says the leader started the last lap. In order: (1) `routeOverrides` splice their control points into the main list over `[fromT, toT]` and the main LUT is rebuilt once; (2) every kart is remapped with `nearestTGlobal` at its world position (race-manager passes the list); (3) features re-derive `t`; (4) checkpoints, spawn grid and minimap are recomputed; (5) `surfaceOverrides` overwrite the baked surface ids; (6) `gripMultiplier` scales every sample's `gripScale`; (7) shortcuts open/close, jumps added, hazards enabled/disabled; (8) a `TrackChanged` event carries `sky, lut, fogDensity, musicVariant, label` for the art, audio and HUD systems, and the scene layer swaps the affected chunk meshes (instant swap in v1; the flash and camera shake belong to vfx-juice). The `reverse` kind is a conveyor flag for the stretch track and does not reverse the spline.

**Validation** (`validate.ts`, runs in tests and at load in dev): closed, ≥ 8 points, no NaN; start-line `halfWidth ≥ 4` (four karts of `2 × kartRadius` plus air); every sample's turn radius `≥ MIN_TURN_RADIUS_FACTOR × halfWidth` with `MIN_TURN_RADIUS_FACTOR = 1.5`, which is the hairpin guard turbo-kart-rush lacks (an inner kerb tighter than this folds the ribbon); `|bank| ≤ 20°`; shortcut `entryT < exitT` (wrap-aware) and its branch ends within 2 m of the main line; `checkpointCount ≥ 4`; estimated lap time `length / (0.8 × topSpeed)` inside 40–65 s, else a warning against the design's 45–60 s target; `voidY` below the lowest sample by ≥ 5 m.

**Scene layer.** Hand-built `BufferGeometry` ribbons (appendix A§3: not `TubeGeometry`). Per LUT sample: road (2 verts), kerb each side (3 verts: `KERB_WIDTH = 1.0`, `KERB_HEIGHT = 0.1`), shoulder each side to `SHOULDER_WIDTH = 6 m` falling `SHOULDER_DROP = 0.4 m`. All strips of one `CHUNK` are merged into **one mesh with one `MeshToonMaterial`** using vertex colours from the biome palette plus a road/dirt/mud/ice/kerb colour table; UV `v = arcLength / ROAD_TILE_LENGTH` (10 m) for the road stripe texture. `CHUNK_COUNT = 8` equal-`t` chunks per branch so frustum culling works and a shift rebuilds only touched chunks. Barriers: one `InstancedMesh` per biome barrier asset at `halfWidth + KERB_WIDTH`, every `BARRIER_SPACING = 2.0 m`, visual only. Decor: one `InstancedMesh` per `environment.decor` asset, seeded by `hash(track.id)`, placed in its band (`roadside` 8–14 m from the edge, `far` 30–120 m, `sky` 25–60 m up) and rejected if inside any branch's road envelope. Balloons, coins and boost pads: one `InstancedMesh` each. Start line: one quad with polygon offset. Ground: a single plane at the biome ground height, or none for Skyline (open question 2). Sky: one dome. Draw-call budget for the whole track scene with no karts: `TRACK_DRAW_CALL_BUDGET = 40` (8 chunks + ≤ 8 decor + ≤ 4 barrier/feature instancers + start line + ground + sky + hazards + landmark), leaving 60 for 8 karts, items and post.

**Authoring.** Six JSON files under `src/track-builder/tracks/`, written by hand in metres, plus a dev-only debug overlay (`?debug=track`) that draws the centreline, edges, checkpoints and features. No editor (first-principles §2). Harbour Loop first; it must pass the validator and the integration test before any second track.

### Module boundaries (`src/track-builder/`)
| File | Owns | Test |
|---|---|---|
| `types.ts` | `TrackDefinition` (mirrors the schema), `Track`, `Branch`, `Checkpoint`, `SpawnSlot`, `BakedFeature`, `TrackChanged` event | — |
| `constants.ts` | The frozen builder constants below, plus `kartRadius` and `tSearchWindow` read from the kart schema | values match the schema |
| `spline.ts` | Closed centripetal Catmull-Rom: `pointAt(u)`, `segmentOf(u)`, arc-length walk | matches three.js `CatmullRomCurve3` centripetal on 3 shapes ± 1e-6; closed at u=0/1 |
| `lut.ts` | Build the LUT; `sample`, `nearestT`, `nearestTGlobal`, `wrap01` | round trip, uniform spacing, seam, lateral, bank, surface segment |
| `branches.ts` | Main + shortcut branches, open flags, `nearest()` with hysteresis | on/off-branch selection, closed branch ignored, monotonic `t` through a shortcut |
| `features.ts` | Bake pickups/coins/pads/jumps/hazards to world, re-derive `t` after rebuild | positions stable through a rebuild ± 0.05 m |
| `hazards.ts` | Deterministic hazard kinematics, `activeHazards(time)` | period, positions at time T, determinism |
| `race.ts` | Checkpoints, spawn grid, `distanceAlong` helpers | strictly increasing, N slots on road facing forward |
| `minimap.ts` | Outline polylines, `toMinimap` | in unit square, centre projects onto outline |
| `shift.ts` | `applyFinalLapShift()` | length changes, karts and features remap, idempotent |
| `validate.ts` | Authoring checks above | each rule rejects its bad fixture |
| `track.ts` | `buildTrack(def) → Track` (implements `TrackQuery`) | determinism: build twice → identical bytes |
| `mesh/road.ts`, `mesh/decor.ts`, `mesh/chunks.ts`, `mesh/scene.ts` | Three.js only. Ribbons, kerbs, shoulders, barriers, instancers, chunk merge, `buildTrackScene(track, assets) → Group`, chunk swap on shift | mesh/instancer count ≤ 40 (proxy for draw calls) |
| `debug/overlay.ts` | Dev overlay lines | visual |
| `tracks/*.json` | The six track definitions | each passes `validate` |
| `index.ts` | Public exports | — |

`race-manager` (next system) consumes `Track.checkpoints`, `spawnGrid`, `activeHazards`, `applyFinalLapShift`, `nearestTGlobal` for respawn, and the `TrackChanged` event. `ai-driver` reads `sample(t + lookahead, bias)`. `ui-hud` reads `minimap`.

### Constants
Builder constants (to be added to `track.schema.json` as `builder` defaults before code, schemas first): `LUT_SAMPLES` 2048, `ARC_DIVISIONS` 4096, `GLOBAL_SEARCH_STEP` 8, `BRANCH_HYSTERESIS` 1.0 m, `MAX_BANK_DEG` 20, `MIN_TURN_RADIUS_FACTOR` 1.5, `MIN_START_HALF_WIDTH` 4, `KERB_WIDTH` 1.0, `KERB_HEIGHT` 0.1, `SHOULDER_WIDTH` 6.0, `SHOULDER_DROP` 0.4, `BARRIER_SPACING` 2.0, `ROAD_TILE_LENGTH` 10, `CHUNK_COUNT` 8, `MINIMAP_SAMPLES` 200, `MINIMAP_PADDING` 0.06, `BOOST_PAD_HALF_LENGTH` 1.75, `BOOST_PAD_WIDTH` 3.0, `BALLOON_HEIGHT` 1.2, `BALLOON_RADIUS` 0.9, `COIN_RADIUS` 0.5, `HAZARD_RADIUS` 1.2, `FALLING_ACTIVE_SECONDS` 0.5, `GUST_WINDOW` 6 m, `DECOR_BANDS` roadside 8–14 / far 30–120 / sky 25–60, `LAP_TIME_WARN` 40–65 s, `TRACK_DRAW_CALL_BUDGET` 40.
Read from elsewhere, never redefined: `kartRadius` 0.85 and `tSearchWindow` 0.02 from `kart.schema.json`; `topSpeed` 25 for the lap-time estimate; lap target 45–60 s, width ≥ 4 karts, shortcut gain ≤ 2 s from design §6.

### Tests (headless, vitest, deterministic)
1. **LUT round trip**: `nearestT(pointAt(t), t + noise(±0.01), 0.02) == t ± 1e-3` for 1000 samples, on Harbour Loop and a synthetic figure-eight with an overpass.
2. **Uniform arc length**: neighbouring LUT samples are `length / 2048` apart ± 2%.
3. **Seam**: `sample(1) === sample(0)`; `nearestT` across the seam in both directions.
4. **Lateral and bank**: `sample(t, 3).position − sample(t, 0).position` is 3 m, perpendicular to the tangent, on the kart-controller's right; a 10° bank raises the left edge by `5 × tan 10°` at lateral −5 and the normal tilts the same way.
5. **Surface**: point *i*'s surface holds up to point *i+1*; `halfWidth` blends with no step larger than `1/2048` of the difference.
6. **Checkpoints**: `checkpointCount` entries, strictly increasing from the start line, wrap-aware.
7. **Spawn grid**: `rows × columns` slots, all inside the road by ≥ `kartRadius`, behind the line, heading·tangent > 0.99.
8. **Branches**: a kart on the shortcut gets the shortcut ground; `t` is monotonic through it; a closed shortcut is never selected; a kart mid-branch when it closes finishes it.
9. **Final Lap Shift**: a route override changes `length`; every baked feature's world position moves < 0.05 m; a remapped kart's position is unchanged; surface and grip overrides show in `sample()`; a second call changes nothing.
10. **Validate**: each rule rejects its fixture (hairpin at `1.2 × halfWidth`, start width 3.5, bank 25°, NaN, open loop, shortcut exit 5 m off the line, `voidY` above the road).
11. **Minimap**: outline inside `[0,1]²`; `toMinimap(sample(t,0).position)` within 1/200 of the outline.
12. **Hazards**: `activeHazards(T)` deterministic; `rolling` respawns every `period`; `crossing` stays inside `halfWidth`.
13. **Determinism**: `buildTrack` twice → byte-identical LUTs and decor transforms.
14. **Draw calls**: `buildTrackScene(harbourLoop)` contains ≤ 40 `Mesh` + `InstancedMesh` objects, each with one material. The true `renderer.info.render.calls` assertion with 8 karts joins the headless perf run when the `performance` system adds it to `npm run verify` (today `verify` is `tsc && vitest run`).
15. **Integration**: the kart-controller integration test runs on Harbour Loop instead of the oval: a scripted full-throttle lap with steer = `−lateral / halfWidth` finishes with `lap` wrapping, no `wall` event on the start straight, and the same state hash on two runs.

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-19: Approach synthesised. Three open questions for Adam before code: shortcut branches need `branch` on the kart state and in `TrackQuery`; the schema has no ground/terrain field; what the `rail` surface does in the kart.
- 2026-09-19 (Adam): Shortcuts are branches. `branch` added to the kart entry in `race-state.schema.json`; `TrackQuery` gains `nearest(position, hint{t,branch}, window) → {t,branch}` and `sample(t, lateral, branch)`. Small kart-controller edit allowed in the build session.
- 2026-09-19 (Adam): `environment.ground {kind: plane|water|none, y}` added to `track.schema.json`. One flat plane per track; Skyline uses `none`.
- 2026-09-19 (Adam): `rail` is a narrow road (halfWidth 3) with normal handling in v1. No new kart code. Rail grinding stays deleted (first-principles §2).
- 2026-09-19: Builder constants live in `track.schema.json` under `builder` defaults; `constants.ts` walks them like kart-controller does.
- 2026-09-19: Bank rise is `−lateral × tan(bank)` (the sign paragraph and test 4 win over the formula line in the model, which had the sign flipped). Normal = `tangent × rightBanked`.
- 2026-09-19: Test 5's "no step larger than 1/2048 of the difference" is impossible with smoothstep over a segment (peak slope 1.5×Δ/segmentSamples). Test asserts ≤ 2×Δ/segmentSamples instead.
- 2026-09-19: `nearestT` may return one sample past the window when the edge sample projects onto its outer segment. Accepted; still local.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

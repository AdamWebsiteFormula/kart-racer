# SOP — Art pipeline

## Purpose
Kitbash CC0 kits in Blender → GLB → gltf-transform optimize → toon materials, outlines, palettes per biome, sky presets, LUTs.

## Inputs
Kenney/Quaternius sources, design bible palettes.

## Outputs
assets/models/*.glb, assets/textures, sky and LUT presets, CREDITS.md entries.

## Constraints
One shared palette texture where possible; every asset licence recorded before import; no AI-generated character meshes; no Nintendo look-alikes.

## Tests (must pass before merge)
Every GLB under 2 MB; total models under 12 MB; each racer passes the 32 px silhouette test (screenshot in docs/silhouettes/).

## References
research plan §6.3, §7.1; Design Loop critique per biome.

## Approach
_Written 23 Sept 2026 alongside the build (the ritual's research step was folded in: plan §6.3, §7.1, design §3–§6, the track-builder `TrackAssets` hook and `game/kartMesh.ts`)._

**Every model is built in code** from coloured primitives (`ModelBuilder`: box, ball, cylinder, cone, torus, rock, eye), merged into **one vertex-coloured geometry** plus **one ink hull** (each part inflated by an absolute ink width in its own frame, so outlines are even and crack-free). One shared `MeshToonMaterial` with a 3-step `NearestFilter` ramp; one shared unlit back-face ink material. Result: two draw calls per kart, two per decor type, whatever the part count.
- `racers.ts`: the eight signature karts and drivers from design §4–§5, origin on the ground facing +Z, inside the kart footprint.
- `decor.ts`: models keyed exactly as `TrackAssets` expects (decor ids, `<biome>-barrier`, landmark id, `balloon`, `coin`, `boostPad`, `ramp`, hazard assets), each keeping its placeholder's size and origin so no placement code changes.
- `sky.ts`: a painted two-band gradient dome with a soft sun, presets by `environment.sky` id; the Final Lap Shift's `sky` swaps the preset. Fog takes the horizon colour so the far road melts into the sky.
- Tests: footprint, triangle budgets per instance, vertex colours, hulls, and the SOP's 32 px silhouette test (every pair of racers must differ in side or front view; worst pair IoU < 0.86). `WRITE_SILHOUETTES=1` refreshes `docs/silhouettes/`.

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-23: **No imported kits.** Kenney and Quaternius needed downloads and Blender; modelling from primitives in code needs neither, has no licence to record, weighs nothing, and is not a text-to-3D mesh (the design's ban). The SOP's "every GLB under 2 MB / total under 12 MB" gates are moot: there are no GLBs.
- 2026-09-23: Draw calls 102 → 56 in a race (karts 7 → 2 each). Triangles held near 340 k including the shadow pass: the 1,188 harbour bollards are six-sided with no outline (~60 triangles each); palms ~1,000 with ink; per-model budgets are in `art.test.ts`.
- 2026-09-23: Track-builder change, the only one outside `src/art-pipeline`: `TrackAssets` gained `hulls`, `ink` and `gradientMap`; the scene uses a geometry's own vertex colours when it has them; decor, barrier and landmark hulls share their model's instance matrices; retiring a mesh never disposes the shared ink.
- 2026-09-23: Decor for Meadow Run (windmill landmark, small windmills, oaks, fences, a red barn, hay-bale kerbs, rolling hay bales) and Canyon Rush (rock arch landmark, cacti, rocks, mesas, turquoise-banded kerbs, mine carts, falling rocks), plus the `canyon-dusk` sky, modelled ahead of the track files.

- 2026-09-23: `Paint` accepts linear RGB with values above 1, so lanterns, neon and lit windows glow through the bloom with no extra material or draw call.
- 2026-09-23: Summit Cup decor modelled (Frostbite, Skyline, Boardwalk). Hazard models are built centred with their base 1.2 m down, because the scene lifts a hazard's centre by its radius.
- 2026-09-23: The sky dome follows the camera, so the horizon sits at eye level on any track height. On tracks with no ground, the hemisphere light's lower colour is the sky's lower band, not earth brown.
- 2026-09-23: Every kart has exhaust pipes (racers.ts EXHAUST: ports, direction, flame color). Side pipes splay 0.35 outward so the chase camera sees the flames as a V, not two dots. Nova's thruster and Boulder's truck stacks are their exhausts. Flame color is the racer's accent, or their second color where the accent is too dark to burn (Momo, Boulder).
- 2026-09-23: Outlines are soft and colored, not black (the user's call): each hull part is a deep shade of its own color (same hue, richer, sRGB lightness × 0.4, capped at linear luminance 0.1 so yellow is as deep as blue), drawn with one shared vertex-colored back-face material. The racers' ink is thinner (0.028 m) than the scenery's.
- 2026-09-23: No outlines at all (the user's call, twice: Mario Kart World draws none). Racers and scenery render their body mesh only; `ModelBuilder.outline()` stays as an unused option. Harbor Loop dropped from 76 to 69 draw calls.

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-23: **Skyline Circuit looked like a flat peach desert.** Cause: the sky gradient was keyed to the dome's centre at the world origin; with the road 40–95 m up, the whole view sat in the horizon band, and the hemisphere light lit cloud undersides earth brown. Fix: the dome follows the camera, the dawn preset has a blue top and a blue haze below, and no-ground tracks bounce the sky colour. Rule: anything that paints by direction must be centred on the eye; check a new track at its real height, not at y 0.
- 2026-09-23: **A commit said "verify green" with one test failing.** Cause: `npm run verify | grep …` reports grep's exit code, not the test run's. Fix: amended before any push; verify now runs to a file and its own exit code is checked. Rule: never pipe the gate into a filter when its exit code decides a commit.
- 2026-09-23: **The first dressed track rendered a million triangles.** Cause: a 180-triangle outlined bollard instanced 1,188 times is 428 k before shadows. Fix: count instances before choosing detail. Rule: budget triangles per *instance* in a test, and measure `renderer.info` after every art change.

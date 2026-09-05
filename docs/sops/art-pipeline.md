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

## Decisions
_(append dated one-liners as they are made)_

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

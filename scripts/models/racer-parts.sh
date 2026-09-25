#!/usr/bin/env bash
# Shrinks a racer's three part files (public/models/racers/<id>/{driver,body,wheel}.glb) to the game's
# triangle budget (art-pipeline/rigged.test.ts: driver ≤ 20 k, body ≤ 8 k, wheel ≤ 2.5 k), in place:
# dequantize, weld, meshopt simplify (keeps every vertex attribute, the skin's joints and weights too),
# quantize. Texture and skeleton untouched. Run it once per racer after their files land.
#   bash scripts/models/racer-parts.sh <racerId>
# The ratios and error limits were checked on close-up renders of Juniper (25 Sept 2026): the face
# holds at the driver's 0.0015; at 0.02 its UV seams wobbled. Set GLTF_TRANSFORM to use a local binary.
set -euo pipefail
cd "$(dirname "$0")/../.."

id="$1"
dir="public/models/racers/$id"
gt=(${GLTF_TRANSFORM:-npx --yes @gltf-transform/cli@4})
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

shrink() { # part ratio error
  local src="$dir/$1.glb"
  "${gt[@]}" dequantize "$src" "$tmp/a.glb" > /dev/null
  "${gt[@]}" weld "$tmp/a.glb" "$tmp/b.glb" > /dev/null
  "${gt[@]}" simplify "$tmp/b.glb" "$tmp/c.glb" --ratio "$2" --error "$3" > /dev/null
  "${gt[@]}" quantize "$tmp/c.glb" "$src" > /dev/null
  echo "$id/$1: $(( $(wc -c < "$src") / 1024 )) KB"
}

shrink driver 0.5 0.0015
shrink body 0.3 0.004
shrink wheel 0.3 0.004

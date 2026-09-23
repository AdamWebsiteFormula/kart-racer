#!/usr/bin/env bash
# Adds an AI-made racer model to the game: downloads the GLB, shrinks it for the web (textures to
# 1024 px WebP, packed vertex data) and lists it in public/models/manifest.json.
#   bash scripts/models/add-model.sh <racerId> <glb url> [yaw radians]
# The yaw turns a model that does not face +Z (Tripo models face +X: use -1.5708).
set -euo pipefail
cd "$(dirname "$0")/../.."

id="$1"; url="$2"; yaw="${3:--1.5708}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL -o "$tmp/raw.glb" "$url"
npx --yes @gltf-transform/cli@4 optimize "$tmp/raw.glb" "public/models/$id.glb" \
  --texture-compress webp --texture-size 1024 --compress quantize --simplify false > "$tmp/log.txt" 2>&1 \
  || { cat "$tmp/log.txt"; exit 1; }

node -e '
const fs = require("fs");
const [id, yaw] = process.argv.slice(1);
const path = "public/models/manifest.json";
const m = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
m[id] = { url: `models/${id}.glb`, yaw: Number(yaw) };
const sorted = Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]]));
fs.writeFileSync(path, JSON.stringify(sorted, null, 1) + "\n");
' "$id" "$yaw"

echo "$id: $(( $(wc -c < "public/models/$id.glb") / 1024 )) KB"

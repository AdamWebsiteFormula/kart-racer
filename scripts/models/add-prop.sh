#!/usr/bin/env bash
# Adds an AI-made scenery model (a landmark or a prop) to the game: downloads the GLB, shrinks it
# for the web and lists it in public/models/props.json under the name of the code-built model it
# replaces (src/art-pipeline/decor.ts), which it is fitted to at load time.
#   bash scripts/models/add-prop.sh <name> <glb url> [texture px, default 1024] [yaw radians, default 0]
# Props placed dozens of times want 512 px textures; landmarks keep 1024.
set -euo pipefail
cd "$(dirname "$0")/../.."

name="$1"; url="$2"; px="${3:-1024}"; yaw="${4:-0}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p public/models/props

curl -fsSL -o "$tmp/raw.glb" "$url"
npx --yes @gltf-transform/cli@4 optimize "$tmp/raw.glb" "public/models/props/$name.glb" \
  --texture-compress webp --texture-size "$px" --compress quantize --simplify false > "$tmp/log.txt" 2>&1 \
  || { cat "$tmp/log.txt"; exit 1; }

node -e '
const fs = require("fs");
const [name, yaw] = process.argv.slice(1);
const path = "public/models/props.json";
const m = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
m[name] = { url: `models/props/${name}.glb`, yaw: Number(yaw) };
const sorted = Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]]));
fs.writeFileSync(path, JSON.stringify(sorted, null, 1) + "\n");
' "$name" "$yaw"

echo "$name: $(( $(wc -c < "public/models/props/$name.glb") / 1024 )) KB"

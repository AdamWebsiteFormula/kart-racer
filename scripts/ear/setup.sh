#!/usr/bin/env bash
# The local ear's Python (models download to ~/.cache/huggingface on first use: ~1 GB for labels, ~11 GB for listen).
set -euo pipefail
VENV="${RASCAL_EAR_VENV:-$HOME/.cache/rascal-ear/venv}"
uv venv -q --python 3.12 "$VENV"
uv pip install -q --python "$VENV/bin/python" -r "$(dirname "$0")/ear-packages.txt"
echo "ready: $VENV/bin/python scripts/ear/labels.py <files> | listen.py <files> \"<question>\""

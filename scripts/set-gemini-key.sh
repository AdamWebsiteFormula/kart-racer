#!/usr/bin/env bash
# Saves your Gemini API key (from aistudio.google.com/apikey) into .env.local, which git ignores, readable only by you.
# The key does not show on screen while you paste it.
set -euo pipefail
cd "$(dirname "$0")/.."

printf '\nPaste your Gemini API key, then press Enter (it will stay hidden): '
IFS= read -rs key
echo
key="${key//[[:space:]]/}"
# arrow keys and terminal paste markers arrive as escape codes (ESC [ ... letter): drop them
key="$(printf '%s' "$key" | LC_ALL=C sed -E $'s/\x1b\\[[0-9;]*[A-Za-z~]//g' | LC_ALL=C tr -cd '\041-\176')"
if [ -z "$key" ]; then
  echo "No key pasted, so nothing was saved. Run this again when ready."
  exit 1
fi

umask 077
touch .env.local
grep -v '^GEMINI_API_KEY=' .env.local > .env.local.tmp || true
printf 'GEMINI_API_KEY=%s\n' "$key" >> .env.local.tmp
mv .env.local.tmp .env.local
chmod 600 .env.local
unset key

echo "Saved. The key is in .env.local (only you can read it, and git ignores it)."
echo "Now tell Claude: key is in."

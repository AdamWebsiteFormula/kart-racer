#!/usr/bin/env bash
# Saves your ElevenLabs API key into .env.local, which git ignores, readable only by you.
# The key does not show on screen while you paste it.
set -euo pipefail
cd "$(dirname "$0")/.."

printf '\nPaste your ElevenLabs API key, then press Enter (it will stay hidden): '
IFS= read -rs key
echo
key="${key//[[:space:]]/}"
if [ -z "$key" ]; then
  echo "No key pasted, so nothing was saved. Run this again when ready."
  exit 1
fi

umask 077
touch .env.local
grep -v '^ELEVENLABS_API_KEY=' .env.local > .env.local.tmp || true
printf 'ELEVENLABS_API_KEY=%s\n' "$key" >> .env.local.tmp
mv .env.local.tmp .env.local
chmod 600 .env.local
unset key

echo "Saved. The key is in .env.local (only you can read it, and git ignores it)."
echo "Now tell Claude: key is in."

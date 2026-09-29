#!/bin/bash
# Puts the bought sound packs where a cloud session can reach them: a PRIVATE GitHub repo,
# AdamWebsiteFormula/rascal-sfx-source (29 Sept 2026). Paid packs must never go in the public game repo or
# a public release: their licences allow the finished game sounds, not the raw files.
#
# Put the pack zips (or .7z files) in one folder (default ~/Downloads/rascal-sfx), then on the Mac:
#   curl -fsSL <raw url of this file> | bash
#   curl -fsSL <raw url of this file> | bash -s -- /path/to/folder/of/zips
# Each zip is unpacked into packs/<zip name>/ and pushed in parts under 1.5 GB (GitHub's push limit is 2 GB).
# A file over 95 MB (GitHub refuses 100 MB) stays on the Mac and is listed. Run it again after adding more
# zips: packs already up are skipped.

# (the whole script is one block, so bash reads all of it before running: piped in through curl, a command that reads
# stdin would otherwise eat the rest of the script, and the last lines never ran on 29 Sept)
{
set -u
set -f
SRC="${1:-$HOME/Downloads/rascal-sfx}"
WORK="${KR_SFX_WORK:-$HOME/code/rascal-sfx-source}"
REPO=AdamWebsiteFormula/rascal-sfx-source
PART=${KR_SFX_PART:-$((1500 * 1024 * 1024))}
BIG=$((95 * 1024 * 1024))
NL='
'
say() { printf '%s\n' "$*"; }

[ -d "$SRC" ] || { say "No folder at $SRC. Put the pack zips in it, or run: curl -fsSL <link> | bash -s -- /path/to/folder"; exit 1; }
ZIPS=$(find "$SRC" -maxdepth 1 -type f \( -iname '*.zip' -o -iname '*.7z' -o -iname '*.rar' \) | sort)
[ -n "$ZIPS" ] || { say "No .zip, .7z or .rar files in $SRC."; exit 1; }

TOKEN=""
if command -v gh >/dev/null 2>&1; then TOKEN=$(gh auth token --user AdamWebsiteFormula 2>/dev/null || true); fi
REMOTE="${KR_SFX_REMOTE:-https://github.com/$REPO.git}"
if [ -z "${KR_SFX_REMOTE:-}" ]; then
  [ -n "$TOKEN" ] || { say "GitHub needs the AdamWebsiteFormula account: run  gh auth login  and sign in as AdamWebsiteFormula, then run this again."; exit 1; }
  if ! GH_TOKEN="$TOKEN" gh repo view "$REPO" >/dev/null 2>&1; then
    say "Making the private repo $REPO..."
    GH_TOKEN="$TOKEN" gh repo create "$REPO" --private --description "Rascal Rally! sound pack sources (licensed, private: never public)" >/dev/null || { say "Could not make the repo."; exit 1; }
  fi
  [ "$(GH_TOKEN="$TOKEN" gh repo view "$REPO" --json visibility -q .visibility 2>/dev/null)" = "PRIVATE" ] || { say "$REPO is not private. Stopping: paid packs must stay private."; exit 1; }
fi

mkdir -p "$WORK" && cd "$WORK" || exit 1
[ -d .git ] || { git init -q -b main; git commit -q --allow-empty -m "sound pack sources (private)"; }
git remote remove origin 2>/dev/null; git remote add origin "$REMOTE"
git config user.email >/dev/null 2>&1 || git config user.email "mac-upload@localhost"
git config user.name >/dev/null 2>&1 || git config user.name "Mac upload script"
push() {
  if [ -n "$TOKEN" ]; then
    KR_PUSH_TOKEN="$TOKEN" git -c credential.helper= \
      -c 'credential.helper=!f() { echo username=x-access-token; echo "password=$KR_PUSH_TOKEN"; }; f' push -q origin main 2>&1
  else
    git push -q origin main 2>&1
  fi
}

UP="" LEFT="" FAILED=""
IFS="$NL"
for zip in $ZIPS; do
  exec </dev/null
  name=$(basename "$zip" | sed -E 's/\.([Zz][Ii][Pp]|7[Zz]|[Rr][Aa][Rr])$//' | tr -c 'A-Za-z0-9._\n-' '_')
  if git log --format=%s | grep -qxF "pack: $name (done)"; then say "Already up: $name"; continue; fi
  say "Unpacking $name..."
  rm -rf "packs/$name" && mkdir -p "packs/$name"
  # (unzip's exit code also counts an exclusion that matched nothing, so judge by what came out)
  case "$zip" in
    # a .7z or .rar opens with the Mac's own tar (bsdtar reads 7-Zip and RAR)
    *.7z|*.7Z|*.rar|*.RAR) tar -xf "$zip" -C "packs/$name" >/dev/null 2>&1; find "packs/$name" \( -name '__MACOSX' -o -name '.DS_Store' \) -exec rm -rf {} + 2>/dev/null ;;
    *) unzip -q -o "$zip" -d "packs/$name" -x '__MACOSX/*' '*.DS_Store' >/dev/null 2>&1 ;;
  esac
  [ -n "$(find "packs/$name" -type f | head -1)" ] || { FAILED="$FAILED$NL  $name: could not open it (double-click it in Finder, then right-click the folder it makes, Compress, and put that .zip in the folder)"; continue; }
  n=0 size=0 part=1
  for f in $(find "packs/$name" -type f | sort); do
    s=$(wc -c < "$f" | tr -d ' ')
    if [ "$s" -gt "$BIG" ]; then LEFT="$LEFT$NL  $f"; rm -f "$f"; continue; fi
    git add -- "$f"; n=$((n + 1)); size=$((size + s))
    if [ "$size" -gt "$PART" ]; then
      git commit -q -m "pack: $name (part $part)" && say "  uploading part $part (up to 1.5 GB: this can take a while, and nothing prints meanwhile)..." && { out=$(push) || { FAILED="$FAILED$NL  $name part $part: $out"; }; }
      part=$((part + 1)); size=0
    fi
  done
  git commit -q -m "pack: $name (done)" --allow-empty
  say "  uploading (nothing prints until it is done)..."
  if out=$(push); then UP="$UP$NL  $name ($n files)"; else FAILED="$FAILED$NL  $name: $out"; fi
done

say ""
[ -n "$UP" ] && say "Uploaded to the private repo $REPO:$UP"
[ -n "$LEFT" ] && say "" && say "Too big for GitHub, kept on the Mac only:$LEFT"
if [ -n "$FAILED" ]; then say ""; say "Problems:$FAILED"; say "Fix what it says, then run this again (finished packs are skipped)."; exit 1; fi
say ""
say "Done. Tell Claude: packs are up"
exit 0
}

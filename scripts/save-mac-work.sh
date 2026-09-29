#!/bin/bash
# Uploads the Mac's unpushed Rascal Rally work to GitHub, so a cloud session can finish and ship it
# (29 Sept 2026: a night of helper work sat only on the Mac when the weekly limit stopped the session).
#
# It changes nothing on the Mac: no file, index, branch or checkout is touched, and GitHub's main is
# left alone. What goes up:
#   - every branch with commits that main lacks, committed in the last DAYS days, as mac/<branch>;
#   - the unsaved changes in each copy of the code (the main folder and every helper worktree), as
#     mac-wip/<branch>: one commit on top of that copy's branch.
# What stays on the Mac (listed at the end): keys (.env*), archives, files over BIG_MB, sound files
# outside public/audio (raw library sounds must not be published: the repo is public; a branch that
# ever added one stays whole), and a copy with more than MAX_FILES changed files. The mac/ and
# mac-wip/ branches are this script's own: a re-run replaces them.
#
# On the Mac:       curl -fsSL <raw url of this file> | bash
# Another folder:   curl -fsSL <raw url of this file> | bash -s -- /path/to/kart-racer

set -u
set -f
REPO="${1:-$HOME/code/kart-racer}"
DAYS=5
BIG_MB=50
MAX_FILES=3000
AUDIO='\.(wav|aif|aiff|caf|flac|m4a|mp3|ogg|opus|aac|mid|midi)$'
NEVER='(^|/)\.env|\.(zip|7z|rar|dmg|pkg|tar|gz|tgz)$'
NL='
'

say() { printf '%s\n' "$*"; }
if ! cd "$REPO" 2>/dev/null || ! git rev-parse --git-dir >/dev/null 2>&1; then
  say "No game folder at $REPO."
  say "Run it with the folder at the end:  curl -fsSL <link> | bash -s -- /path/to/kart-racer"
  exit 1
fi
REPO=$(git rev-parse --show-toplevel)
cd "$REPO" || exit 1
STAMP=$(date '+%Y-%m-%d %H:%M')
git config user.email >/dev/null 2>&1 || {
  export GIT_AUTHOR_NAME="Mac save script" GIT_AUTHOR_EMAIL="mac-save@localhost"
  export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
}

# push as AdamWebsiteFormula when gh knows that account (the Mac's active gh account cannot push here);
# the token reaches git through the environment, never a command line or the screen
TOKEN=""
if command -v gh >/dev/null 2>&1; then TOKEN=$(gh auth token --user AdamWebsiteFormula 2>/dev/null || true); fi
DEST=origin
[ -n "$TOKEN" ] && DEST="${KR_PUSH_URL:-https://github.com/AdamWebsiteFormula/kart-racer.git}"
push() { # push <source> <branch on GitHub>: only ever this script's own mac/ and mac-wip/ branches
  if [ -n "$TOKEN" ]; then
    KR_PUSH_TOKEN="$TOKEN" git -c credential.helper= \
      -c 'credential.helper=!f() { echo username=x-access-token; echo "password=$KR_PUSH_TOKEN"; }; f' \
      push -q "$DEST" "+$1:refs/heads/$2" 2>&1
  else
    git push -q "$DEST" "+$1:refs/heads/$2" 2>&1
  fi
}

say "Checking GitHub..."
if ! git fetch -q origin main 2>/dev/null; then
  say "Could not reach GitHub. Check the internet connection, then run this again."
  exit 1
fi
BASE=$(git rev-parse origin/main)

# files never to publish among these names: keys and archives anywhere, sounds outside public/audio
unsafe() { printf '%s\n' "$1" | grep -iE "$NEVER"; printf '%s\n' "$1" | grep -iE "$AUDIO" | grep -v '^public/audio/'; }
# files ever added on top of main in <rev>'s history
added() { git log --format= --name-only --diff-filter=A "$BASE..$1" | sort -u; }

SAVED="" LEFT="" FAILED="" OLD=0
IFS="$NL"

# 1. unsaved changes in each copy of the code, snapshotted through a private copy of its index
for wt in $(git worktree list --porcelain | sed -n 's/^worktree //p'); do
  [ -d "$wt" ] || continue
  [ -n "$(git -C "$wt" --no-optional-locks status --porcelain 2>/dev/null)" ] || continue
  head=$(git -C "$wt" rev-parse -q --verify HEAD) || continue
  name=$(git -C "$wt" symbolic-ref -q --short HEAD 2>/dev/null) || name="detached-$(basename "$wt")"
  bad=$(unsafe "$(added "$head")")
  if [ -n "$bad" ]; then
    LEFT="$LEFT$NL  $wt: all of it (its branch added files that must not be published: $(printf '%s' "$bad" | head -3 | tr '\n' ' '))"
    continue
  fi
  idx="${TMPDIR:-/tmp}/kr-save-$$.idx"
  rm -f "$idx"
  real=$(cd "$wt" && git rev-parse --path-format=absolute --git-path index 2>/dev/null)
  if [ -n "$real" ] && [ -f "$real" ]; then cp "$real" "$idx"; else GIT_INDEX_FILE="$idx" git -C "$wt" read-tree HEAD; fi
  GIT_INDEX_FILE="$idx" git -C "$wt" add -A . 2>/dev/null
  changed=$(GIT_INDEX_FILE="$idx" git -C "$wt" diff --cached --name-only HEAD)
  if [ "$(printf '%s\n' "$changed" | grep -c .)" -gt "$MAX_FILES" ]; then
    LEFT="$LEFT$NL  $wt: its unsaved changes (more than $MAX_FILES files)"
    rm -f "$idx"
    continue
  fi
  drop=$(unsafe "$changed")
  for f in $changed; do
    size=0
    [ -f "$wt/$f" ] && size=$(wc -c < "$wt/$f" | tr -d ' ')
    if [ "$size" -gt $((BIG_MB * 1048576)) ] || printf '%s\n' "$drop" | grep -qxF "$f"; then
      GIT_INDEX_FILE="$idx" git -C "$wt" reset -q -- "$f" 2>/dev/null
      LEFT="$LEFT$NL  $wt/$f"
    fi
  done
  tree=$(GIT_INDEX_FILE="$idx" git -C "$wt" write-tree)
  rm -f "$idx"
  [ "$tree" = "$(git -C "$wt" rev-parse 'HEAD^{tree}')" ] && continue
  commit=$(git -C "$wt" commit-tree "$tree" -p "$head" -m "wip: unsaved work in the Mac copy of $name ($STAMP), not reviewed or tested")
  if out=$(push "$commit" "mac-wip/$name"); then SAVED="$SAVED$NL  mac-wip/$name  (unsaved changes in $wt)"
  else FAILED="$FAILED$NL  mac-wip/$name: $out"; fi
done

# 2. branches with commits main lacks
cutoff=$(( $(date +%s) - DAYS * 86400 ))
for line in $(git for-each-ref --no-merged="$BASE" --format='%(committerdate:unix) %(refname:short)' refs/heads); do
  t=${line%% *} br=${line#* }
  if [ "$t" -lt "$cutoff" ]; then OLD=$((OLD + 1)); continue; fi
  bad=$(unsafe "$(added "refs/heads/$br")")
  if [ -n "$bad" ]; then
    LEFT="$LEFT$NL  branch $br (it added files that must not be published: $(printf '%s' "$bad" | head -3 | tr '\n' ' '))"
    continue
  fi
  if out=$(push "refs/heads/$br" "mac/$br"); then SAVED="$SAVED$NL  mac/$br"
  else FAILED="$FAILED$NL  mac/$br: $out"; fi
done

say ""
if [ -n "$SAVED" ]; then say "Uploaded to GitHub:$SAVED"; else say "Nothing needed uploading."; fi
[ "$OLD" -gt 0 ] && say "Skipped $OLD older branches (no commits in the last $DAYS days)."
[ -n "$LEFT" ] && say "" && say "Kept on the Mac only (not safe or too big to publish):$LEFT"
if [ -n "$FAILED" ]; then
  say ""
  say "Could not upload:$FAILED"
  say "If GitHub refused the account: run  gh auth login  and sign in as AdamWebsiteFormula, then run this again."
  exit 1
fi
say ""
say "Done. Nothing on this Mac changed. Tell Claude: pushed"

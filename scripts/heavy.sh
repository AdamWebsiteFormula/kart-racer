#!/bin/bash
# One heavy job at a time on Adam's Mac (Adam, 28 Sept 2026: twelve builders running tests, renders
# and ear jobs at once "slowing down my macbook considerably"). Every builder runs its test runs,
# builds, headless Chrome checks, music and sound renders and ear jobs through this lock:
#   bash /Users/Adam/code/kart-racer/scripts/heavy.sh '<command>'
# It waits until no other heavy job runs, then runs the command at low priority. A lock left by a
# job that died is cleared. Never run a dev server through it (it would hold the lock forever).
LOCK=/tmp/rascal-heavy.lock
said=0
while ! mkdir "$LOCK" 2>/dev/null; do
  pid=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -rf "$LOCK"; continue; fi
  if [ "$said" = 0 ]; then echo "heavy.sh: waiting for $(cat "$LOCK/info" 2>/dev/null)"; said=1; fi
  sleep 5
done
echo $$ > "$LOCK/pid"
echo "$(basename "$PWD") since $(date +%H:%M:%S): $1" | cut -c1-200 > "$LOCK/info"
trap 'rm -rf "$LOCK"' EXIT
nice -n 10 bash -c "$1" &
child=$!
trap 'kill -TERM "$child" 2>/dev/null; exit 143' INT TERM
wait "$child"

# Which rivals' sounds cannot be heard, and does it matter: reads an offline race render's cue log and measurements
# (scripts/elevenlabs/mix render + measure) and sorts every rival cue by how near it played (its gain: otherGain 0.6
# times the distance fall, director.ts distanceGain) and by how far under the bed (music + engines) its loudest 100 ms
# sits, whole band and 1-4 kHz, and whether one of the player's own cues played over it. Nothing is played.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/rivals.py ~/.cache/rascal-sfx/renders/race/rivals-harbour-loop [...]
import json, sys
from collections import Counter

NEAR, MID = 0.5, 0.25  # gain: 0.6 inside 12 m; 0.5 is about 14 m, 0.25 about 24 m (director.ts distanceGain)
tot = Counter()
for base in sys.argv[1:]:
    log = json.load(open(base + '.json'))
    rows = json.load(open(base + '.rows.json'))
    gain = {(c['id'], round(c['start'], 3)): c['gain'] for c in log['cues'] if c['played']}
    pl = [r for r in rows if r['cls'] == 'player']
    print(f"== {base.split('/')[-1]}")
    for r in rows:
        if r['cls'] != 'rival':
            continue
        g = gain.get((r['id'], round(r['t'], 3)), 0)
        where = 'near' if g >= NEAR else 'mid' if g >= MID else 'far'
        over = any(abs(p['t'] - r['t']) < 0.15 and p['lvl'] > r['lvl'] for p in pl)
        state = 'buried' if r['d'] < -12 else 'weak' if r['d'] < -6 else 'thin' if r['dBand'] < -12 else 'heard'
        tot[(where, state)] += 1
        tot[(where, 'all')] += 1
        if over:
            tot[(where, 'under a player cue')] += 1
        if where == 'near' and state != 'heard':
            tot[('near-id', r['id'])] += 1
for where in ('near', 'mid', 'far'):
    n = tot[(where, 'all')]
    print(f"{where:5s} n={n:4d}  heard {tot[(where, 'heard')]:4d}  thin in 1-4 kHz (< -12 dB there) {tot[(where, 'thin')]:4d}  weak (-12..-6) {tot[(where, 'weak')]:4d}  "
          f"buried (< -12) {tot[(where, 'buried')]:4d}  | under a louder player cue {tot[(where, 'under a player cue')]:4d}")
print('near but not clearly heard, by sound:', ', '.join(f'{k[1]} {v}' for k, v in sorted(((k, v) for k, v in tot.items() if k[0] == 'near-id'), key=lambda kv: -kv[1])))

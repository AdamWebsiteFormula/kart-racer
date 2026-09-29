# Prints every candidate in ~/.cache/rascal-music/candidates with its facts and screen scores (from notes.json).
#   python scripts/music/status.py [--json]
import glob, json, os, sys

ROOT = os.path.expanduser('~/.cache/rascal-music/candidates')
rows = []
for nj in sorted(glob.glob(os.path.join(ROOT, '*', 'notes.json')) + glob.glob(os.path.join(ROOT, '*', '*', 'notes.json'))):
    d = json.load(open(nj))
    rel = os.path.relpath(os.path.dirname(nj), ROOT)
    sc = d.get('screen') or {}
    row = {'where': rel, 'title': d.get('title'), 'key': d.get('key'), 'bpm': d.get('bpm'), 'seconds': d.get('seconds'),
           'loop': d.get('loop'), 'preMatch': (d.get('wrap') or {}).get('preMatch'), 'gameStart': (d.get('wrap') or {}).get('gameStart'),
           'lufs': (d.get('master') or {}).get('lufs'),
           'tp': (d.get('master') or {}).get('truePeak'), 'verdict': sc.get('verdict'), 'reasons': sc.get('reasons'),
           'clap': sc.get('clap5'), 'coolVsCartoon': sc.get('clapCoolVsCartoon'), 'PQ': sc.get('PQ'), 'CE': sc.get('CE'),
           'intros': {k: {'verdict': (v.get('screen') or {}).get('verdict'), 'PQ': (v.get('screen') or {}).get('PQ'),
                          'CE': (v.get('screen') or {}).get('CE'), 'coolVsCartoon': (v.get('screen') or {}).get('clapCoolVsCartoon'),
                          'cadenceAt': v.get('cadenceAt')} for k, v in (d.get('intros') or {}).items()},
           'rendered': d.get('rendered')}
    rows.append(row)
if '--json' in sys.argv:
    print(json.dumps(rows, indent=1))
else:
    for r in rows:
        c = r['clap'] or {}
        print(f"{r['where']:34s} {str(r['verdict']):5s} PQ {r['PQ']} CE {r['CE']} cool/cartoon {r['coolVsCartoon']} "
              f"cool {c.get('cool')} circus {c.get('circus')} cheesy {c.get('cheesy')} | {r['key']} {r['bpm']} bpm {r['seconds']} s "
              f"loop {r['loop']} pre {r['preMatch']} start {r['gameStart']} | {r['rendered']}")
        for k, v in r['intros'].items():
            print(f"{'':36s}{k}: {v['verdict']} PQ {v['PQ']} CE {v['CE']} cool/cartoon {v['coolVsCartoon']} cadence {v['cadenceAt']}")

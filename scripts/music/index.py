# Writes ~/.cache/rascal-music/candidates/index.json for the listening page: every slot, its candidates, their files
# (theme, course intros), key, tempo, loop points (seconds, for the manifest), style, and the local ears' scores.
# Light work (reads notes.json files only); nothing is played.
import glob, json, os, time

ROOT = os.path.expanduser('~/.cache/rascal-music/candidates')
ORDER = ['harbour-loop', 'meadow-run', 'canyon-rush', 'frostbite-pass', 'boardwalk-nights', 'skyline-circuit', 'title', 'results', 'stings']
NAMES = {'harbour-loop': 'Lighthouse Loop', 'meadow-run': 'Windmill Run', 'canyon-rush': 'Mesa Rush', 'frostbite-pass': 'Frostbite Pass',
         'boardwalk-nights': 'Boardwalk Nights', 'skyline-circuit': 'Skyline Circuit', 'title': 'Title and menus', 'results': 'Results and podium',
         'stings': 'Finish and knockout stings'}


def brief(sc):
    if not sc:
        return None
    return {'verdict': sc.get('verdict'), 'reasons': sc.get('reasons'), 'clapCoolVsCartoon': sc.get('clapCoolVsCartoon'),
            'clap5': sc.get('clap5'), 'PQ': sc.get('PQ'), 'CE': sc.get('CE'), 'lufs': sc.get('lufs')}


slots = {}
for nj in sorted(glob.glob(os.path.join(ROOT, '*', '*', 'notes.json'))):
    d = json.load(open(nj))
    folder = os.path.dirname(nj)
    slot, cand = os.path.relpath(folder, ROOT).split(os.sep)
    main = f"{d.get('track')}.mp3"
    entry = {
        'candidate': cand, 'title': d.get('title'), 'style': d.get('style'), 'key': d.get('key'), 'bpm': d.get('bpm'),
        'seconds': d.get('seconds'), 'loop': d.get('loop'), 'manifest': d.get('manifest'), 'form': d.get('form'),
        'file': os.path.join(slot, cand, main) if os.path.exists(os.path.join(folder, main)) else None,
        'screen': brief(d.get('screen')),
        'intros': {k: {'file': os.path.join(slot, cand, v['file']), 'seconds': v.get('seconds'), 'cadenceAt': v.get('cadenceAt'),
                       'what': v.get('what'), 'screen': brief(v.get('screen'))} for k, v in (d.get('intros') or {}).items()},
        'rendered': d.get('rendered'),
    }
    slots.setdefault(slot, []).append(entry)
out = {'generated': time.strftime('%Y-%m-%d %H:%M'), 'root': ROOT,
       'slots': [{'slot': s, 'name': NAMES.get(s, s), 'candidates': slots[s]} for s in ORDER if s in slots] +
                [{'slot': s, 'name': s, 'candidates': c} for s, c in slots.items() if s not in ORDER]}
json.dump(out, open(os.path.join(ROOT, 'index.json'), 'w'), indent=1)
print(f"{sum(len(s['candidates']) for s in out['slots'])} candidates in {len(out['slots'])} slots -> {os.path.join(ROOT, 'index.json')}")

# Builds course themes, their course-intro pieces and the other music slots offline (nothing is played) into
# ~/.cache/rascal-music/candidates/<slot>/<candidate>/, then screens every file with the local ears (cool not corny,
# production quality) and writes the scores into its notes.json.
#   ~/.cache/rascal-ear/venv/bin/python scripts/music/build.py <song module> [...] [--shorts-only] [--no-shorts] [--no-screen]
import importlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio.produce import produce, produce_shorts, cand_dir

args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = {a for a in sys.argv[1:] if a.startswith('--')}
for name in args:
    mod = importlib.import_module('songs.' + name)
    song = mod.compose()
    if '--shorts-only' not in flags:
        produce(mod)
    if hasattr(mod, 'shorts') and '--no-shorts' not in flags:
        produce_shorts(mod)
    if '--no-screen' in flags:
        continue
    import screen
    d = cand_dir(mod, song.track)
    nj_path = os.path.join(d, 'notes.json')
    nj = json.load(open(nj_path))
    main = os.path.join(d, f'{song.track}.mp3')
    nj['screen'] = screen.screen(main)
    print('screen', name, json.dumps(nj['screen']), flush=True)
    for k, v in nj.get('intros', {}).items():
        v['screen'] = screen.screen(os.path.join(d, v['file']))
        print('screen', name, k, json.dumps(v['screen']), flush=True)
    json.dump(nj, open(nj_path, 'w'), indent=1)

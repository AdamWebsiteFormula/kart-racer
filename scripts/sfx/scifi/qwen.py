# The third local ear on the sci-fi item candidates: Qwen2.5-Omni describes each one in words (nothing is played),
# asked what it hears, whether it sounds cheap, cheesy or cartoony, and whether any part sounds like a gunshot or a voice.
# Written into each candidates.json entry as `qwen`. Slow (the model is ~8 GB): run it through the heavy-job lock.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/scifi/qwen.py [id ...] [--only=name,name]
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'ear'))
from listen import listen  # noqa: E402  (loads the model)

OUT = os.path.expanduser(os.environ.get('RASCAL_CANDIDATES', '~/.cache/rascal-sfx/candidates'))
ASK = ('This is a sound effect for a video game. In one or two sentences: what does it sound like? Does it sound '
       'high quality and cool, or cheap, cheesy or cartoony? Does any part of it sound like a gunshot or a human voice?')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
only = next((a.split('=', 1)[1].split(',') for a in sys.argv[1:] if a.startswith('--only=')), None)
ids = args or [d[5:] for d in sorted(os.listdir(OUT)) if d.startswith('item-')]
for sid in ids:
    path = os.path.join(OUT, 'item-' + sid, 'candidates.json')
    if not os.path.exists(path):
        continue
    data = json.load(open(path))
    for c in data['candidates']:
        if only and c['name'] not in only:
            continue
        f = os.path.join(OUT, 'item-' + sid, c['file'])
        if not os.path.exists(f):
            continue
        c['qwen'] = listen(f, ASK)
        print(f"{sid:12s} {c['name']:14s} {c['qwen']}", flush=True)
        json.dump(data, open(path, 'w'), indent=1)

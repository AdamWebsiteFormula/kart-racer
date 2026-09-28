# The local ears on the sci-fi item candidates (nothing is played): AST's AudioSet labels (its top five, and the
# highest score among the labels a G-rated kart racer must never sound like: gunfire, voices, screams), and CLAP's
# zero-shot match of each file against plain texts (the intended sound first, then its likely confusions and a
# "cheap" control), written into each folder's candidates.json as `ears`. Loads the models once.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/scifi/ears.py [id ...]   (default: every item-* folder)
#   --qwen   also ask Qwen2.5-Omni to describe each file in words (slow: minutes)
import json, os, subprocess, sys
import librosa, torch
from transformers import ClapModel, ClapProcessor, pipeline

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.expanduser(os.environ.get('RASCAL_CANDIDATES', '~/.cache/rascal-sfx/candidates'))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
QWEN = '--qwen' in sys.argv
ONLY = next((a.split('=', 1)[1].split(',') for a in sys.argv[1:] if a.startswith('--only=')), None)

BAD = ['Gunshot, gunfire', 'Machine gun', 'Fusillade', 'Artillery fire', 'Cap gun', 'Speech', 'Male speech, man speaking', 'Female speech, woman speaking',
       'Child speech, kid speaking', 'Grunt', 'Screaming', 'Shout', 'Yell', 'Singing', 'Choir', 'Laughter', 'Crying, sobbing', 'Babbling', 'Whimper']
CHEAP = 'a cheap 8-bit retro video game sound effect'

dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
ast = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev, top_k=None)
clap = ClapModel.from_pretrained('laion/clap-htsat-unfused').to(dev)
clap_in = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')


def load(path, sr):
    y, _ = librosa.load(path, sr=sr, mono=True)
    return y


def labels(path):
    res = ast(load(path, 16000))
    top = [(r['label'], round(r['score'], 3)) for r in res[:5]]
    bad = sorted(((r['label'], round(r['score'], 3)) for r in res if r['label'] in BAD), key=lambda t: -t[1])[:3]
    return top, bad


def match(path, texts):
    inp = clap_in(text=texts, audio=[load(path, 48000)], sampling_rate=48000, return_tensors='pt', padding=True).to(dev)
    with torch.no_grad():
        p = clap(**inp).logits_per_audio.softmax(-1)[0].cpu().numpy()
    return {t: round(float(x), 3) for t, x in zip(texts, p)}


moments = json.loads(subprocess.run(['node', os.path.join(HERE, 'json.ts')], check=True, capture_output=True, text=True, cwd=REPO).stdout)['moments']
ids = args or [d[5:] for d in sorted(os.listdir(OUT)) if d.startswith('item-')]
listen = None
if QWEN:
    sys.path.insert(0, os.path.join(REPO, 'scripts', 'ear'))
    from listen import listen  # noqa: E402
for sid in ids:
    folder = os.path.join(OUT, 'item-' + sid)
    path = os.path.join(folder, 'candidates.json')
    if not os.path.exists(path):
        continue
    texts = moments.get(sid, {}).get('ears')
    if not texts:
        print(f'{sid}: no ear texts in MOMENTS', flush=True)
        continue
    texts = texts + [CHEAP]
    data = json.load(open(path))
    for c in data['candidates']:
        if ONLY and c['name'] not in ONLY:
            continue
        f = os.path.join(folder, c['file'])
        if not os.path.exists(f):
            continue
        m = match(f, texts)
        top, bad = labels(f)
        e = {'ast': top, 'astWorst': bad, 'clap': m, 'clapIntended': m[texts[0]], 'clapIntendedFirst': max(m, key=m.get) == texts[0], 'clapCheap': m[CHEAP]}
        if listen:
            e['qwen'] = listen(f)
        c['ears'] = e
        worst = f"{bad[0][0]} {bad[0][1]:.2f}" if bad else '-'
        print(f"{sid:12s} {c['name']:14s} intended {m[texts[0]]:.2f} {'FIRST' if e['clapIntendedFirst'] else '     '} cheap {m[CHEAP]:.2f} | "
              f"AST {', '.join(f'{l} {s:.2f}' for l, s in top[:3])} | worst {worst}" + (f"\n    qwen: {e['qwen']}" if listen else ''), flush=True)
    data['earTexts'] = texts
    json.dump(data, open(path, 'w'), indent=1)

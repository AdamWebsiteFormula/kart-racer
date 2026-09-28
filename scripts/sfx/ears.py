# The local ears on a candidate folder (nothing is played): AST's top AudioSet labels and CLAP's zero-shot match
# of each file against plain texts (the intended sound first, then its likely confusions), written into the folder's
# candidates.json as each candidate's `ears`. Loads the models once for many folders.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/ears.py <folder> '["intended", "confusion", ...]' [<folder> '[...]' ...]
#   --qwen   also ask Qwen2.5-Omni to describe each file in words (slow: minutes)
import json, os, sys
import librosa, torch
from transformers import ClapModel, ClapProcessor, pipeline

args = [a for a in sys.argv[1:] if not a.startswith('--')]
QWEN = '--qwen' in sys.argv
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
ast = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev)
clap = ClapModel.from_pretrained('laion/clap-htsat-unfused').to(dev)
clap_in = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')


def load(path, sr):
    y, _ = librosa.load(path, sr=sr, mono=True)
    return y


def labels(path, top=5):
    return [(r['label'], round(r['score'], 3)) for r in ast(load(path, 16000))][:top]


def match(path, texts):
    inp = clap_in(text=texts, audio=[load(path, 48000)], sampling_rate=48000, return_tensors='pt', padding=True).to(dev)
    with torch.no_grad():
        p = clap(**inp).logits_per_audio.softmax(-1)[0].cpu().numpy()
    return {t: round(float(x), 3) for t, x in zip(texts, p)}


listen = None
if QWEN:
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ear'))
    from listen import listen  # noqa: E402

for folder, texts in zip(args[0::2], args[1::2]):
    texts = json.loads(texts)
    path = os.path.join(folder, 'candidates.json')
    data = json.load(open(path))
    for c in data['candidates']:
        f = os.path.join(folder, c['file'])
        if not os.path.exists(f):
            continue
        m = match(f, texts)
        e = {'ast': labels(f), 'clap': m, 'clapIntended': m[texts[0]], 'clapIntendedFirst': max(m, key=m.get) == texts[0]}
        if listen:
            e['qwen'] = listen(f)
        c['ears'] = e
        print(f"{os.path.basename(folder):16s} {c['name']:22s} intended {m[texts[0]]:.2f} {'FIRST' if e['clapIntendedFirst'] else '     '}  "
              f"AST {', '.join(f'{l} {s:.2f}' for l, s in e['ast'][:3])}", flush=True)
    data['earTexts'] = texts
    json.dump(data, open(path, 'w'), indent=1)

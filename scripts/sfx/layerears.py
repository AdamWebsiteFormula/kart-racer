# Which layer of a recipe carries a voice-like sound (nothing is played): renders each layer of the named recipes
# alone and the whole, and prints AST's voice-like labels for each (speech, grunt, throat clearing, breathing, sigh,
# laughter, screaming, crowd...), so a layer that brings one in can be swapped before a candidate goes to Adam.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/layerears.py scripts/sfx/cands/impacts.ts hitA hitC [--min=0.03]
import json, os, sys
import numpy as np
import librosa, torch
from transformers import pipeline

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cand  # noqa: E402
import dsp  # noqa: E402

VOICE = ('Speech', 'Male speech', 'Female speech', 'Child speech', 'Conversation', 'Narration', 'Babbling', 'Grunt', 'Groan', 'Throat clearing',
         'Breathing', 'Gasp', 'Pant', 'Sigh', 'Cough', 'Sneeze', 'Crowd', 'Chatter', 'Screaming', 'Shout', 'Yell', 'Laughter', 'Giggle', 'Snicker',
         'Whispering', 'Humming', 'Singing', 'Whistling', 'Burping', 'Hiccup', 'Snoring', 'Cheering')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a.split('=')[0][2:]: float(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--')}
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
ast = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev, top_k=40)


def voices(x):
    y = librosa.resample(x.mean(axis=0), orig_sr=dsp.SR, target_sr=16000)
    y = np.pad(y, (0, max(0, 16000 - len(y))))
    res = ast(y)
    return [(r['label'], round(r['score'], 3)) for r in res if r['label'].startswith(VOICE) and r['score'] >= opt.get('min', 0.03)], res[0]['label']


recs = [r for r in cand.recipes_of(args[0]) if len(args) == 1 or r.get('name') in args[1:]]
for rec in recs:
    whole = cand.build(rec)
    v, top = voices(whole)
    print(f"{rec['name']}: whole top={top} voice={v}", flush=True)
    for i, l in enumerate(rec['layers']):
        x = dsp.render_layer(l)
        if np.abs(x).max() > 0:
            v, top = voices(x)
            src = l['src']
            what = src.get('freesound') or src.get('pack') or src.get('synth') or src.get('path')
            if v:
                print(f"   layer {i} ({what}): top={top} voice={v}", flush=True)

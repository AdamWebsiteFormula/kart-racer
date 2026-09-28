# Where a recording has a human voice (AST on 2 s windows, 1 s apart; nothing is played): prints the windows where
# any speech, crowd, laughter, singing, shout or whistle label passes `--min` (default 0.08), so a bed or a layer is
# cut from a stretch with none. Freesound ids or files; `--seconds` how far into each (default 150).
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/voicescan.py 468452 409143 some.wav [--min=0.08] [--seconds=150]
import os, sys
import numpy as np
import librosa, torch
from transformers import pipeline

VOICE = {'Speech', 'Male speech, man speaking', 'Female speech, woman speaking', 'Child speech, kid speaking', 'Conversation', 'Narration, monologue',
         'Babbling', 'Crowd', 'Chatter', 'Hubbub, speech noise, speech babble', 'Laughter', 'Baby laughter', 'Giggle', 'Chuckle, chortle', 'Singing',
         'Choir', 'Shout', 'Yell', 'Children shouting', 'Screaming', 'Whistling', 'Cheering', 'Applause', 'Children playing', 'Whispering', 'Humming',
         'Male singing', 'Female singing', 'Child singing', 'Grunt', 'Groan', 'Sigh'}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a.split('=')[0][2:]: float(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--')}
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
ast = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev, top_k=40)
for a in args:
    path = os.path.expanduser(f'~/.cache/rascal-sfx/freesound/{a}.mp3') if a.isdigit() else a
    y, sr = librosa.load(path, sr=16000, mono=True, duration=opt.get('seconds', 150))
    hits = []
    wins = [y[i:i + 2 * sr] for i in range(0, max(1, len(y) - 2 * sr), sr)]
    for i, res in enumerate(ast(wins, batch_size=16)):
        v = [(r['label'], r['score']) for r in res if r['label'] in VOICE and r['score'] >= opt.get('min', 0.08)]
        if v:
            hits.append(f"{i}s " + '/'.join(f'{l.split(",")[0]} {s:.2f}' for l, s in v[:2]))
    print(f"{a}: {len(y) / sr:.0f} s scanned, {len(hits)} windows with a voice" + (': ' + '; '.join(hits[:40]) if hits else ''), flush=True)

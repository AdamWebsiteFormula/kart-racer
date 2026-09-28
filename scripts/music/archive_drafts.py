# Moves the first drafts (files sitting directly in a slot folder, before candidates had their own folders) out of
# ~/.cache/rascal-music/candidates into ~/.cache/rascal-music/drafts/<slot>-first/, so a slot holds only candidates.
import os, shutil
ROOT = os.path.expanduser('~/.cache/rascal-music')
for slot in sorted(os.listdir(os.path.join(ROOT, 'candidates'))):
    d = os.path.join(ROOT, 'candidates', slot)
    if not os.path.isdir(d):
        continue
    files = [f for f in os.listdir(d) if os.path.isfile(os.path.join(d, f))]
    if not files:
        continue
    dest = os.path.join(ROOT, 'drafts', f'{slot}-first')
    os.makedirs(dest, exist_ok=True)
    for f in files:
        shutil.move(os.path.join(d, f), os.path.join(dest, f))
    print(slot, len(files), '->', dest)

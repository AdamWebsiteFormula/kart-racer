# Engine demos for Adam's ears (nothing is played): each candidate loop set (scripts/sfx/cands/engine.ts, built with
# build.py --recipes --out) arranged as the game's engine-idle/mid/high files and driven through the real game code
# offline (scripts/elevenlabs/mix/engine.mix.ts: a grid rev with a rocket start, then the AI driving), the shipped set
# the same way; each render levelled alike and written as a 128 kbps MP3 into ~/.cache/rascal-sfx/candidates/engine/.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/engine_demos.py engA engB engC [--track=harbour-loop] [--player=pip]
import json, os, shutil, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp  # noqa: E402
import cand  # noqa: E402

REPO = dsp.REPO
RENDERS = os.path.expanduser('~/.cache/rascal-sfx/renders')
LOOPS = os.path.join(RENDERS, 'loops')
OUTDIR = os.path.join(cand.OUT, 'engine')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a.split('=')[0][2:]: a.split('=')[1] for a in sys.argv[1:] if a.startswith('--')}
env = dict(os.environ, MIX_OUT=RENDERS, TRACK=opt.get('track', 'harbour-loop'), PLAYER=opt.get('player', 'pip'))


def render(tag, folder=None):
    e = dict(env, TAG=tag)
    if folder:
        e['ENGINE_DIR'] = folder
    subprocess.run([os.path.join(REPO, 'node_modules', '.bin', 'vitest'), 'run', '--config', 'scripts/elevenlabs/mix/vitest.config.mts', 'engine'],
                   cwd=REPO, env=e, check=True, capture_output=True)
    return os.path.join(RENDERS, f'{tag}-engine.wav')


def demo(wav, name, what):
    x = dsp._read(wav)
    # level every demo alike: the same loudness (K-weighted, whole render), peaks under -1 dBFS
    lv = float(np.sqrt((dsp.envelope(dsp.k_weight(x)) ** 2).mean()))
    x = x * (0.12 / max(lv, 1e-6))
    cand.write_mp3(os.path.join(OUTDIR, f'{name}.mp3'), x)
    return {'name': name, 'file': f'{name}.mp3', 'what': what, 'metrics': cand.metrics(x, True)}


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    entries = [demo(render('current'), 'current', 'The shipped engine loops (ElevenLabs takes) through the game\'s own engine code: the grid rev with the gas held from the 2, a rocket start, then 17 s of racing driven by the game\'s AI (Pip, light class, Harbour Loop).')]
    for c in args:
        folder = os.path.join(RENDERS, f'set-{c}')
        os.makedirs(folder, exist_ok=True)
        for band in ('idle', 'mid', 'high'):
            shutil.copy(os.path.join(LOOPS, f'{c}-{band}.mp3'), os.path.join(folder, f'engine-{band}.mp3'))
        wav = render(c, folder)
        entries.append(demo(wav, c, f'Candidate {c} (scripts/sfx/cands/engine.ts) through the same drive: its idle, mid and high loops in place of the shipped ones.'))
        print(c, 'rendered', flush=True)
    path = os.path.join(OUTDIR, 'candidates.json')
    cur = json.load(open(path)) if os.path.exists(path) else {'id': 'engine', 'candidates': []}
    by = {e['name']: e for e in cur['candidates']}
    for e in entries:
        by[e['name']] = {**by.get(e['name'], {}), **e}
    cur['candidates'] = [by[k] for k in ['current'] + sorted(k for k in by if k != 'current')]
    cur['note'] = 'Engine demos: each set of rpm loops (and the live engine, when present) driven through the real game code offline, levelled alike. The loops themselves are in engine-idle/, engine-mid/, engine-high/.'
    json.dump(cur, open(path, 'w'), indent=1)

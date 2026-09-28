# Builds the sci-fi item candidates for Adam's listening (never over the shipped files): each candidate in
# scripts/sfx/scifi/items.ts becomes ~/.cache/rascal-sfx/candidates/item-<id>/<name>.mp3 (128 kbps, cut and levelled as
# the game will play it: samples.ts cutSfx and MIX_DB, so loudness is fair between candidates and against the shipped
# sound; a loop repeated so its wrap can be heard), its full-quality WAV beside it (wav/), the shipped sound as
# current.mp3 the same way, and candidates.json (when it plays, what each candidate is and what it is made of, with every
# recording's author and licence). Nothing is played.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/scifi/cand.py [scripts/sfx/scifi/items.ts] [name|id ...] [--sheets=<dir>]
import json, math, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render as R  # noqa: E402  (loads the toolkit)
import sources  # noqa: E402

dsp = R.dsp
SR = dsp.SR
REPO = dsp.REPO
OUT = os.path.expanduser(os.environ.get('RASCAL_CANDIDATES', '~/.cache/rascal-sfx/candidates'))
DEMO_LOOP_SECONDS = 8.0


def load_file(path):
    out = subprocess.run(['node', os.path.join(HERE, 'json.ts'), path], check=True, capture_output=True, text=True, cwd=REPO).stdout
    return json.loads(out)


def folder(sid):
    return os.path.join(OUT, 'item-' + sid.replace(':', '-'))


def write_mp3(path, x):
    """128 kbps CBR MP3 (libsndfile's LAME), the peak kept under -1 dBFS."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pk = np.abs(x).max()
    if pk > 0.89:
        x = x * (0.89 / pk)
    tmp = path + '.part.mp3'
    sf.write(tmp, np.clip(x, -1, 1).T.astype(np.float32), SR, format='MP3', subtype='MPEG_LAYER_III', bitrate_mode='CONSTANT', compression_level=0.65)
    os.replace(tmp, path)


def played(x, sid, loop):
    y = dsp.as_played(x, sid, loop)
    if loop:
        reps = int(math.ceil(DEMO_LOOP_SECONDS / (y.shape[-1] / SR)))
        y = np.tile(y, (1, reps))
        k = int(0.3 * SR)
        y[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    else:
        y = np.pad(y, ((0, 0), (int(0.05 * SR), int(0.15 * SR))))
    return y


def metrics(x, loop):
    y = x.mean(axis=0)
    env = dsp.envelope(dsp.k_weight(x))
    lv = float(np.sqrt((env ** 2).mean())) if loop else dsp.peak_rms(env)
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y))))
    f = np.fft.rfftfreq(len(y), 1 / SR)
    cen = float((spec * f).sum() / (spec.sum() + 1e-12))
    e2 = dsp.envelope(x, 0.002)
    lead = 0 if loop else R.LEAD
    t_peak = float(np.argmax(e2) * 0.002) - lead
    corr = float(np.corrcoef(x[0], x[1])[0, 1]) if x[0].std() > 0 and x[1].std() > 0 else 1.0
    g, lv2, pk, held = dsp.game_level(x, loop)
    return {'seconds': round(x.shape[-1] / SR - lead, 3), 'loudness_db': round(20 * math.log10(max(lv, 1e-9)), 1),
            'peak_db': round(20 * math.log10(float(np.abs(x).max()) + 1e-12), 1), 'centroid_hz': round(cen), 'to_peak_s': round(max(0.0, t_peak), 3),
            'stereo_corr': round(corr, 2), 'held_by_ceiling_db': round(held, 1)}


def _walk_sources(rec):
    """Every source a candidate draws on: its layers and any impulse response a convolve step loads."""
    for l in rec['layers']:
        yield l['src']
        for s in l.get('fx', []):
            if s.get('op') == 'convolve':
                yield s['ir']
    for s in rec.get('master', []):
        if s.get('op') == 'convolve':
            yield s['ir']


def sources_of(rec):
    out = []
    for s in _walk_sources(rec):
        if 'freesound' in s:
            m = sources.meta(int(s['freesound']))
            out.append(f"freesound {s['freesound']}: \"{m.get('name', '?')}\" by {m.get('username', '?')} (CC0, {m.get('url', '')})")
        elif 'fcp' in s:
            out.append('Final Cut Pro library (a minor, processed ingredient): ' + s['fcp'])
        elif 'pack' in s:
            out.append('pack (CC0): ' + s['pack'])
        elif 'git' in s:
            out.append(f"the game's own take: {s['path'].split('/')[-1]} @ {s['git']}")
        elif 'synth' in s:
            out.append('synthesis: ' + s['synth'])
        elif 'kind' in s:
            out.append(f"impulse response made in code: {s['kind']}")
    return sorted(set(out), key=out.index)


def update_json(sid, entries, moment):
    path = os.path.join(folder(sid), 'candidates.json')
    cur = json.load(open(path)) if os.path.exists(path) else {'id': sid, 'candidates': []}
    cur.update({k: v for k, v in (moment or {}).items()})
    cur['id'] = sid
    by = {c['name']: c for c in cur['candidates']}
    for e in entries:
        by[e['name']] = {**by.get(e['name'], {}), **e}
    order = ['current'] + sorted(k for k in by if k != 'current')
    cur['candidates'] = [by[k] for k in order if k in by]
    json.dump(cur, open(path, 'w'), indent=1)


def current(sid, loop):
    src = os.path.join(REPO, 'public', 'audio', 'sfx', sid.replace(':', '-') + '.mp3')
    if not os.path.exists(src):
        return None
    x = dsp._read(src)
    write_mp3(os.path.join(folder(sid), 'current.mp3'), played(x, sid, loop))
    return {'name': 'current', 'file': 'current.mp3', 'what': 'The sound the game ships today (public/audio/sfx), cut and levelled as the game plays it.',
            'sources': ['shipped file'], 'metrics': metrics(x, loop)}


def main():
    args = sys.argv[1:]
    files = [a for a in args if a.endswith('.ts')] or [os.path.join(HERE, 'items.ts')]
    names = [a for a in args if not a.startswith('--') and not a.endswith('.ts')]
    sheets = next((a.split('=', 1)[1] for a in args if a.startswith('--sheets=')), None)
    data = load_file(files[0])
    moments = data['moments']
    recs = [r for r in data['recipes'] if not names or r['name'] in names or r['id'] in names]
    done = {}
    for rec in recs:
        sid, name = rec['id'], rec['name']
        loop = bool(rec.get('loop'))
        x = R.render(rec)
        os.makedirs(os.path.join(folder(sid), 'wav'), exist_ok=True)
        dsp.write_wav(os.path.join(folder(sid), 'wav', name + '.wav'), x)
        write_mp3(os.path.join(folder(sid), name + '.mp3'), played(x, sid, loop))
        m = metrics(x, loop)
        e = {'name': name, 'file': name + '.mp3', 'what': rec['what'], 'sources': sources_of(rec), 'loop': loop, 'metrics': m}
        done.setdefault(sid, []).append(e)
        print(f"{sid:12s} {name:16s} {m['seconds']:5.2f}s  L {m['loudness_db']:6.1f}  pk {m['peak_db']:5.1f}  cen {m['centroid_hz']:5d}  "
              f"peak@{m['to_peak_s']:.3f}  corr {m['stereo_corr']:.2f}  held {m['held_by_ceiling_db']:.1f}", flush=True)
    for sid, entries in done.items():
        loop = any(e['loop'] for e in entries)
        cur = current(sid, loop)
        if cur:
            entries.append(cur)
        update_json(sid, entries, moments.get(sid))
        if sheets:
            import look
            os.makedirs(sheets, exist_ok=True)
            fs = [os.path.join(folder(sid), c['file']) for c in json.load(open(os.path.join(folder(sid), 'candidates.json')))['candidates']]
            look.sheet(os.path.join(sheets, f'{sid}.png'), [f for f in fs if os.path.exists(f)])


if __name__ == '__main__':
    main()

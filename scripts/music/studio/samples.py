# Sample libraries as zones: which file plays for which pitch, velocity, round robin and articulation.
# Loaders for VSCO-2 CE (file names carry note and layer), SFZ programs (Karoryfer, sfzinstruments) and
# the Virtuosity Drums kit (several microphones per hit, kept in phase). Every file used is logged.
import functools, json, math, os, re
from collections import defaultdict
import numpy as np
from . import dsp, sfz
from .theory import midi as note_midi

ROOT = os.path.expanduser(os.environ.get('RASCAL_MUSIC_SAMPLES', '~/.cache/rascal-music/samples'))
CACHE = os.path.expanduser('~/.cache/rascal-music/analysis')
USED = set()
SR = dsp.SR


class Zone:
    __slots__ = ('path', 'root', 'lo', 'hi', 'vlo', 'vhi', 'rr', 'gain', 'art', 'mics')

    def __init__(self, path, root, lo=None, hi=None, vlo=0, vhi=127, rr=0, gain=0.0, art='sus', mics=None):
        self.path, self.root = path, float(root)
        self.lo = lo if lo is not None else int(round(root))
        self.hi = hi if hi is not None else int(round(root))
        self.vlo, self.vhi, self.rr, self.gain, self.art = vlo, vhi, rr, gain, art
        self.mics = mics  # drums: {mic: path}

    def __repr__(self):
        return f'Zone({os.path.basename(self.path)}, root={self.root:.2f}, v={self.vlo}-{self.vhi}, rr={self.rr}, {self.art})'


# ------------------------------------------------------------------ audio cache

_AUDIO = {}


def audio(path, trim=True):
    """(2, n) float32 at SR; tonal samples trimmed to 2 ms before their onset."""
    key = (path, trim)
    if key in _AUDIO:
        return _AUDIO[key]
    y = dsp.read(path)
    y = dsp.stereo(y)
    if trim:
        a = np.abs(y).max(0)
        pk = a.max() if a.size else 0
        if pk > 0:
            idx = np.flatnonzero(a > pk * 10 ** (-42 / 20))
            s = max(0, int(idx[0]) - int(0.002 * SR)) if idx.size else 0
            y = y[:, s:]
    y = np.ascontiguousarray(y, np.float32)
    _AUDIO[key] = y
    USED.add(path)
    return y


@functools.lru_cache(None)
def _json_cache(name):
    p = os.path.join(CACHE, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def _save_cache(name):
    os.makedirs(CACHE, exist_ok=True)
    json.dump(_json_cache(name), open(os.path.join(CACHE, name), 'w'), indent=0)


import atexit
atexit.register(lambda: [_save_cache(n) for n in ('pitch.json', 'level.json')])


def measure_pitch(path):
    """Median f0 (as a fractional MIDI note) of the steady part of a sample, cached."""
    c = _json_cache('pitch.json')
    if path in c:
        return c[path]
    import librosa
    y = audio(path).mean(0)
    seg = y[int(0.08 * SR):int(0.9 * SR)]
    if seg.size < 2048:
        seg = y
    try:
        f0 = librosa.yin(seg, fmin=25, fmax=4200, sr=SR, frame_length=4096)
        f0 = f0[np.isfinite(f0)]
        m = float(np.median(69 + 12 * np.log2(f0 / 440.0))) if f0.size else None
    except Exception:
        m = None
    c[path] = m
    return m


def loudness(path, span=0.5):
    """K-weighted RMS (dB) of the first `span` s after the onset: the level a velocity curve is set from."""
    c = _json_cache('level.json')
    k = f'{path}|{span}'
    if k in c:
        return c[k]
    y = audio(path)[:, :int(span * SR)]
    yk = dsp._kw(y.astype(np.float64))
    v = float(10 * np.log10(np.mean(yk ** 2) + 1e-12))
    c[k] = v
    return v


# ------------------------------------------------------------------ banks


class Bank:
    """Zones by articulation. pick() chooses a zone for a pitch and velocity and cycles round robins."""

    def __init__(self, name, zones, normalize=True, level_span=0.5):
        self.name = name
        self.arts = defaultdict(list)
        for z in zones:
            self.arts[z.art].append(z)
        self.rr_count = defaultdict(int)
        self.normalize = normalize
        self.level_span = level_span
        self._levels = {}

    def level(self, z):
        if not self.normalize:
            return 0.0
        if z.path not in self._levels:
            self._levels[z.path] = loudness(z.path, self.level_span)
        return self._levels[z.path]

    def has(self, art):
        return art in self.arts

    def pick(self, art, pitch, vel127, rng=None):
        zs = self.arts.get(art) or self.arts.get('sus') or next(iter(self.arts.values()))
        # candidate zones covering the pitch; else the nearest roots
        cov = [z for z in zs if z.lo <= pitch <= z.hi]
        if not cov:
            best = min(abs(z.root - pitch) for z in zs)
            cov = [z for z in zs if abs(z.root - pitch) <= best + 0.01]
        # of those, the ones nearest in root (ties across layers and round robins)
        best = min(abs(z.root - pitch) for z in cov)
        cov = [z for z in cov if abs(z.root - pitch) <= best + 0.51]
        inv = [z for z in cov if z.vlo <= vel127 <= z.vhi]
        if not inv:
            inv = sorted(cov, key=lambda z: min(abs(z.vlo - vel127), abs(z.vhi - vel127)))[:1]
            inv = [z for z in cov if (z.vlo, z.vhi) == (inv[0].vlo, inv[0].vhi)]
        # round robin among the zones left
        inv.sort(key=lambda z: (z.rr, z.path))
        key = (art, inv[0].vlo, round(inv[0].root, 1))
        i = self.rr_count[key]
        self.rr_count[key] += 1
        return inv[i % len(inv)]


# ------------------------------------------------------------------ VSCO-2 CE (names carry note, layer, rr)

_VNOTE = re.compile(r'(?<![A-Za-z])([A-G]#?)(-?\d)(?![0-9])')


def vsco(folder, art='sus', octave=None, layers=None, pattern=None, exclude=None):
    """Zones from a VSCO folder. The octave convention of the file names differs between instruments, so it is
    found by measuring the samples' pitch (median offset rounded to octaves) unless given."""
    d = os.path.join(ROOT, 'VSCO-2-CE', folder)
    files = sorted(f for f in os.listdir(d) if f.lower().endswith('.wav'))
    if pattern:
        files = [f for f in files if re.search(pattern, f)]
    if exclude:
        files = [f for f in files if not re.search(exclude, f)]
    rows = []
    for f in files:
        m = _VNOTE.search(f.replace('_Sum', '').replace('Sum_', ''))
        if not m:
            continue
        nom = note_midi(m.group(1) + m.group(2))
        vl = re.search(r'_v(\d+)', f)
        rr = re.search(r'_rr(\d+)', f) or re.search(r'_(\d+)\.wav$', f) or re.search(r'sustain(\d+)', f)
        rows.append((f, nom, int(vl.group(1)) if vl else 1, int(rr.group(1)) if rr else 1))
    if not rows:
        raise FileNotFoundError(f'no samples in {d}')
    if octave is None:
        diffs = []
        for f, nom, _, _ in rows[:: max(1, len(rows) // 12)]:
            m = measure_pitch(os.path.join(d, f))
            if m is not None:
                diffs.append(m - nom)
        octave = int(round(np.median(diffs) / 12)) if diffs else 0
    vls = sorted({r[2] for r in rows})
    edges = layers or {v: (int(round(i * 128 / len(vls))), int(round((i + 1) * 128 / len(vls))) - 1) for i, v in enumerate(vls)}
    zones = []
    for f, nom, vl, rr in rows:
        p = os.path.join(d, f)
        root = nom + 12 * octave
        m = measure_pitch(p)
        if m is not None and abs(m - root) < 0.5:
            root = m  # the sample's own tuning, so the section plays in tune
        vlo, vhi = edges[vl]
        zones.append(Zone(p, root, vlo=vlo, vhi=vhi, rr=rr, art=art))
    # key ranges: each zone covers from halfway to its lower neighbour to halfway to its upper one
    roots = sorted({round(z.root) for z in zones})
    for z in zones:
        r = round(z.root)
        i = roots.index(r)
        z.lo = (roots[i - 1] + r) // 2 + 1 if i > 0 else r - 12
        z.hi = (r + roots[i + 1]) // 2 if i + 1 < len(roots) else r + 12
    return zones


def upright_piano():
    d = os.path.join(ROOT, 'VSCO-2-CE', 'Keys/Upright Piano')
    chart = {}
    for line in open(os.path.join(d, 'MappingChart.txt')):
        m = re.match(r'(\d{3})=(\d+)', line.strip())
        if m:
            chart[m.group(1)] = int(m.group(2))
    zones = []
    files = sorted(f for f in os.listdir(d) if f.endswith('.wav'))
    dyns = sorted({int(re.search(r'dyn(\d+)', f).group(1)) for f in files})
    for f in files:
        m = re.search(r'dyn(\d+)_rr(\d+)_(\d{3})', f)
        dy, rr, num = int(m.group(1)), int(m.group(2)), m.group(3)
        root = chart[num]
        i = dyns.index(dy)
        zones.append(Zone(os.path.join(d, f), root, root - 1, root, vlo=int(i * 128 / len(dyns)), vhi=int((i + 1) * 128 / len(dyns)) - 1, rr=rr, art='sus'))
    return zones


# ------------------------------------------------------------------ SFZ programs


def from_sfz(path, art='sus', trigger='attack', keep=None, root=None):
    """Zones from an SFZ program. `keep(region) -> bool` filters (for mic or keyswitch choices); `root` is the
    folder its sample paths are relative to when it is a map file included by a program elsewhere."""
    zones = []
    for r in sfz.parse(path, root=root):
        if r.get('trigger', 'attack') != trigger:
            continue
        if keep and not keep(r):
            continue
        lo, hi, kc = sfz.key_range(r)
        tune = float(r.get('tune', 0)) / 100 + float(r.get('transpose', 0))
        vlo, vhi = int(r.get('lovel', 0)), int(r.get('hivel', 127))
        if 'seq_position' in r:
            rr = int(r['seq_position'])
        elif 'lorand' in r or 'hirand' in r:
            rr = int(round(float(r.get('lorand', 0)) * 8)) + 1
        else:
            rr = 1
        z = Zone(r['sample'], kc - tune, lo, hi, vlo, vhi, rr, gain=float(r.get('volume', 0)), art=art)
        zones.append(z)
    return zones


def from_sfz_root(path, root, art='sus'):
    return from_sfz(path, art=art, root=root)


def retune(zones, tolerance=0.5):
    """Check the mapping against the samples' measured pitch: first the octave (a library may be mapped an octave
    away from how it sounds, as bass libraries often are; the median offset over all zones decides), then each
    zone's own tuning when it is within `tolerance` of the mapped root."""
    diffs = []
    for z in zones:
        m = measure_pitch(z.path)
        if m is not None:
            diffs.append(m - z.root)
    if diffs:
        octs = [round(d / 12) for d in diffs if abs(d - 12 * round(d / 12)) < 0.6]
        if octs:
            k = int(np.median(octs))
            if k and sum(1 for o in octs if o == k) > 0.6 * len(octs):
                for z in zones:
                    z.root += 12 * k
                    z.lo += 12 * k
                    z.hi += 12 * k
    for z in zones:
        m = measure_pitch(z.path)
        if m is not None and abs(m - z.root) < tolerance:
            z.root = m
    return zones


# ------------------------------------------------------------------ Virtuosity Drums (multi-mic)

VD = os.path.join(ROOT, 'virtuosity_drums')
KIT_MAPS = {
    # piece: (map file stem, microphones)
    'kick': ('kick_snon', ('kickmic', 'oh', 'room')),
    'snare': ('snare_center', ('snaremic', 'oh', 'room')),
    'snare2': ('snare_offcenter', ('snaremic', 'oh', 'room')),
    'rim': ('snare_rimshot', ('snaremic', 'oh', 'room')),
    'xstick': ('snare_crossstick', ('snaremic', 'oh', 'room')),
    'flam': ('snare_flam', ('snaremic', 'oh', 'room')),
    'buzz': ('snare_buzz', ('snaremic', 'oh', 'room')),
    'roll': ('snare_roll', ('snaremic', 'oh', 'room')),
    'hhc': ('hh_closed', ('oh', 'room')),
    'hhh': ('hh_half', ('oh', 'room')),
    'hh34': ('hh_34', ('oh', 'room')),
    'hho': ('hh_open', ('oh', 'room')),
    'hhp': ('hh_pedal', ('oh', 'room')),
    'ride': ('ride_ride', ('oh', 'room')),
    'bell': ('ride_bell', ('oh', 'room')),
    'crash': ('crash_crash', ('oh', 'room')),
    'sizzle': ('crash_sizzle', ('oh', 'room')),
    'tomh': ('htom_center', ('oh', 'room')),
    'toml': ('ltom_center', ('oh', 'room')),
}


def kit_zones():
    """{piece: [Zone with .mics = {mic: path}]}; velocity ranges from the kit's own SFZ maps (the same layer and
    round robin across microphones, so every hit stays in phase)."""
    out = {}
    for piece, (stem, mics) in KIT_MAPS.items():
        per_mic = {}
        for mic in mics:
            mp = os.path.join(VD, 'Programs', 'mappings', mic, f'{stem}_map.sfz')
            if not os.path.exists(mp):
                continue
            regs = sfz.parse(mp)
            per_mic[mic] = regs
        if not per_mic:
            continue
        base_mic = mics[0] if mics[0] in per_mic else next(iter(per_mic))
        zones = []
        for i, r in enumerate(per_mic[base_mic]):
            paths = {}
            name = os.path.basename(r['sample'])
            for mic in per_mic:
                other = name.replace(f'{base_mic}_', f'{mic}_', 1)
                p = os.path.join(VD, 'Samples', mic, os.path.basename(os.path.dirname(r['sample'])), other)
                if os.path.exists(p):
                    paths[mic] = p
            if base_mic not in paths:
                continue
            rr = int(r.get('seq_position', 0)) or (int(round(float(r.get('lorand', 0)) * 8)) + 1)
            zones.append(Zone(paths[base_mic], 60, 0, 127, int(r.get('lovel', 0)), int(r.get('hivel', 127)), rr, art=piece, mics=paths))
        out[piece] = zones
    return out


def timpani_zones():
    """VSCO's five timpani, each at its own measured pitch; velocity layers from the file names; 'roll' zones too."""
    d = os.path.join(ROOT, 'VSCO-2-CE', 'Percussion', 'Timpani')
    zones = []
    for sub, art, pat in (('', 'sus', r'Timpani(\d)_Hit_v(\d+)_rr(\d+)'), ('Rolls', 'roll', r'Timpani(\d)_Roll_v(\d+)_rr(\d+)')):
        dd = os.path.join(d, sub)
        files = sorted(f for f in os.listdir(dd) if re.match(pat, f))
        vls = sorted({int(re.match(pat, f).group(2)) for f in files})
        for f in files:
            m = re.match(pat, f)
            drum, vl, rr = int(m.group(1)), int(m.group(2)), int(m.group(3))
            p = os.path.join(dd, f)
            root = measure_pitch(p) or 45.0
            i = vls.index(vl)
            zones.append(Zone(p, root, None, None, int(i * 128 / len(vls)), int((i + 1) * 128 / len(vls)) - 1, rr, art=art))
    # one root per drum (the median of its files), key ranges between neighbours
    by_drum = defaultdict(list)
    for z in zones:
        by_drum[re.search(r'Timpani(\d)', z.path).group(1)].append(z)
    for k, zs in by_drum.items():
        r = float(np.median([z.root for z in zs if z.art == 'sus'] or [z.root for z in zs]))
        for z in zs:
            z.root = r
    roots = sorted({round(z.root) for z in zones})
    for z in zones:
        r = round(z.root)
        i = roots.index(r)
        z.lo = (roots[i - 1] + r) // 2 + 1 if i > 0 else r - 7
        z.hi = (r + roots[i + 1]) // 2 if i + 1 < len(roots) else r + 7
    return zones


def file_zones(folder, arts):
    """One-shots from a folder: `arts` maps an articulation name to a file-name regex; velocity layers follow the
    dynamic marks in the names (pp p mp mf f ff fff) or the sorted order."""
    d = os.path.join(ROOT, 'VSCO-2-CE', folder)
    order = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff']
    zones = []
    for art, pat in arts.items():
        files = sorted(f for f in os.listdir(d) if re.search(pat, f) and f.lower().endswith('.wav'))
        def dyn(f):
            m = re.search(r'_(pp|p|mp|mf|f|ff|fff)(?:_|\.|$)', f)
            return order.index(m.group(1)) if m else 3
        files.sort(key=dyn)
        levels = sorted({dyn(f) for f in files})
        for f in files:
            i = levels.index(dyn(f))
            zones.append(Zone(os.path.join(d, f), 60, 0, 127, int(i * 128 / len(levels)), int((i + 1) * 128 / len(levels)) - 1,
                              files.index(f) + 1, art=art))
    return zones


def body_zones(stem):
    """Body percussion (sfzinstruments/body_percussion, CC0): handclap, fingerclap, snap_l, stomp_l ... by file stem."""
    d = os.path.join(ROOT, 'body_percussion', 'Samples', 'body')
    files = sorted(f for f in os.listdir(d) if f.startswith(stem + '_vl'))
    vls = sorted({int(re.search(r'_vl(\d+)', f).group(1)) for f in files})
    zones = []
    for f in files:
        vl = int(re.search(r'_vl(\d+)', f).group(1))
        rr = int(re.search(r'_rr(\d+)', f).group(1))
        i = vls.index(vl)
        zones.append(Zone(os.path.join(d, f), 60, 0, 127, int(i * 128 / len(vls)), int((i + 1) * 128 / len(vls)) - 1, rr, art=stem))
    return zones


def perc_zones(name, mic='close'):
    """Latin and hand percussion from Virtuosity (velocity from the file name, else one layer)."""
    d = os.path.join(VD, 'Samples', 'perc', mic, name)
    files = sorted(f for f in os.listdir(d) if f.lower().endswith(('.wav', '.flac')))
    zones = []
    for f in files:
        rr = re.search(r'rr(\d+)', f)
        m = re.search(r'_(\d+)_(\d+)_rr', f)
        vm = re.search(r'_v(?:l)?(\d+)_', f)
        if m:
            vlo, vhi = int(m.group(1)), int(m.group(2))
        elif vm:
            nv = len({re.search(r'_v(?:l)?(\d+)_', g).group(1) for g in files if re.search(r'_v(?:l)?(\d+)_', g)})
            k = int(vm.group(1)) - 1
            vlo, vhi = int(k * 128 / nv), int((k + 1) * 128 / nv) - 1
        else:
            vlo, vhi = 0, 127
        # a percussion file may carry a stroke name (Shake1D / Shake1U, HitHM1 / HitN): it becomes the articulation
        stroke = re.sub(r'(_\d+_\d+)?_(v|vl)?\d*_?rr\d+.*$', '', f)
        zones.append(Zone(os.path.join(d, f), 60, 0, 127, vlo, vhi, int(rr.group(1)) if rr else 1, art=stroke))
    return zones

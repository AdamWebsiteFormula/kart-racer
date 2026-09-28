# Pitch names, scales and chord symbols. MIDI numbers with C4 = 60 (middle C).
import re

PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
_NOTE = re.compile(r'^([A-Ga-g])([#b]*)(-?\d+)?$')


def pc(name):
    """'Bb' -> 10, 'F#' -> 6."""
    m = _NOTE.match(name)
    if not m:
        raise ValueError(f'not a note: {name}')
    return (PC[m.group(1).upper()] + m.group(2).count('#') - m.group(2).count('b')) % 12


def midi(name):
    """'Bb4' -> 70 (octave numbers change at C, so 'B#3' is 60 and 'Cb4' is 59)."""
    m = _NOTE.match(name)
    if not m or m.group(3) is None:
        raise ValueError(f'not a note with an octave: {name}')
    step = PC[m.group(1).upper()] + m.group(2).count('#') - m.group(2).count('b')
    return 12 * (int(m.group(3)) + 1) + step


def name(m):
    return f'{NAMES[m % 12]}{m // 12 - 1}'


SCALES = {
    'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10], 'harmonic': [0, 2, 3, 5, 7, 8, 11], 'phrygdom': [0, 1, 4, 5, 7, 8, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11], 'blues': [0, 3, 5, 6, 7, 10], 'majpent': [0, 2, 4, 7, 9], 'minpent': [0, 3, 5, 7, 10],
}

# chord qualities -> intervals over the root (the 5th is included where it defines the sound)
QUAL = {
    '': [0, 4, 7], 'maj': [0, 4, 7], 'm': [0, 3, 7], 'min': [0, 3, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8], '+': [0, 4, 8],
    '5': [0, 7], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '69': [0, 4, 7, 9, 14],
    'maj7': [0, 4, 7, 11], 'M7': [0, 4, 7, 11], 'maj9': [0, 4, 7, 11, 14], 'M9': [0, 4, 7, 11, 14], 'maj7#11': [0, 4, 7, 11, 18],
    'm7': [0, 3, 7, 10], 'm9': [0, 3, 7, 10, 14], 'm11': [0, 3, 7, 10, 14, 17], 'mM7': [0, 3, 7, 11], 'm7b5': [0, 3, 6, 10],
    'dim7': [0, 3, 6, 9], '7': [0, 4, 7, 10], '9': [0, 4, 7, 10, 14], '11': [0, 7, 10, 14, 17], '13': [0, 4, 7, 10, 14, 21],
    '7sus4': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14], '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15], '7#5': [0, 4, 8, 10],
    '7b13': [0, 4, 7, 10, 20], '7alt': [0, 4, 10, 13, 20], 'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14], '7#11': [0, 4, 7, 10, 18],
    '13sus4': [0, 5, 7, 10, 14, 21], 'm6/9': [0, 3, 7, 9, 14],
}
_CHORD = re.compile(r'^([A-G][#b]?)([^/]*)(?:/([A-G][#b]?))?$')


class Chord:
    """A chord symbol: root pitch class, intervals, optional bass. Chord('Gm7'), Chord('F/A')."""

    def __init__(self, sym):
        m = _CHORD.match(sym)
        if not m:
            raise ValueError(f'not a chord: {sym}')
        self.sym = sym
        self.root = pc(m.group(1))
        q = m.group(2)
        if q not in QUAL:
            raise ValueError(f'unknown chord quality {q!r} in {sym}')
        self.ivs = QUAL[q]
        self.bass = pc(m.group(3)) if m.group(3) else self.root

    @property
    def pcs(self):
        return sorted({(self.root + i) % 12 for i in self.ivs})

    def tones(self, lo, hi):
        """Every chord tone in [lo, hi] (MIDI)."""
        s = set(self.pcs)
        return [m for m in range(lo, hi + 1) if m % 12 in s]

    def guide(self):
        """3rd and 7th (or 6th) pitch classes: the tones that name the chord."""
        out = [(self.root + i) % 12 for i in self.ivs if i % 12 in (3, 4, 9, 10, 11)]
        return out or self.pcs

    def __repr__(self):
        return f'Chord({self.sym})'


def nearest(target, pcs, lo=0, hi=127):
    """The MIDI note with a pitch class in `pcs` nearest to `target`."""
    best = None
    for m in range(max(lo, target - 12), min(hi, target + 12) + 1):
        if m % 12 in pcs and (best is None or abs(m - target) < abs(best - target)):
            best = m
    return best


def voice_lead(prev, chord, lo, hi, n=4):
    """A close voicing of `chord` (n notes, lo..hi) whose notes move least from `prev` (a list of MIDI notes)."""
    import itertools
    pcs = chord.pcs
    if len(pcs) > n:  # drop the 5th first, then the root
        drop = [(chord.root + 7) % 12, chord.root]
        for d in drop:
            if len(pcs) > n and d in pcs:
                pcs = [p for p in pcs if p != d]
    cands = [m for m in range(lo, hi + 1) if m % 12 in pcs]
    best, bs = None, 1e9
    for combo in itertools.combinations(cands, min(n, len(pcs)) if len(pcs) >= n else len(pcs)):
        if len({c % 12 for c in combo}) < min(len(pcs), n):
            continue
        if combo[-1] - combo[0] > 14:
            continue
        cost = sum(min(abs(c - p) for p in prev) for c in combo) if prev else abs(sum(combo) / len(combo) - (lo + hi) / 2)
        if cost < bs:
            best, bs = list(combo), cost
    if best is None:
        best = sorted(nearest((lo + hi) // 2, [p]) for p in pcs)[:n]
    while len(best) < n:  # double the lead's pitch class an octave down when the chord is short
        best = sorted(best + [best[-1] - 12 if best[-1] - 12 >= lo else best[0] + 12])
    return sorted(best)

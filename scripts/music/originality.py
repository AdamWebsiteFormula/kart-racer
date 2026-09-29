# Originality check on the melodies (nothing is played): each candidate's lead lines as interval sequences, compared
# against famous figures by exact interval pattern (any window of `k` intervals, repeated notes merged), the way the
# audio SOP checked the coin against the famous two-note figure. References are the figures a kart-racing theme must
# not echo that can be written down reliably; a hit prints the window and where it is.
#   python scripts/music/originality.py [module ...]
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

REFS = {
    # a famous platformer's overworld opening: E E E C E G, G an octave down (repeats merged: E C E G G,)
    'platformer overworld opening': [-4, 4, 3, -12],
    # its underground theme: C C' A A' Bb Bb'
    'platformer underground theme': [12, -15, 12, -11, 12],
    # the famous surf standard's opening run (Phrygian dominant): E F G# A B C B A G# F E
    'surf standard run': [1, 3, 1, 2, 1, -1, -2, -1, -3, -1],
    # the coin pickup: a rising fourth, short then long (B to E), checked only as the whole of a two-note figure
    'coin figure (two notes alone)': [5],
}
LEADS = {'tpt1', 'lead', 'lead2', 'fiddle', 'flute', 'synth', 'saw', 'vln', 'alto', 'gtrlead', 'calliope', 'tpt', 'piano', 'pluck', 'arp', 'hook'}
SONGS = ['harbour_riptide', 'harbour_bigbeat', 'meadow_edm', 'meadow_rock', 'canyon_desert', 'canyon_surf', 'frostbite_dnb', 'frostbite_jazzdnb',
         'boardwalk_nudisco', 'boardwalk_electro', 'skyline_synthwave', 'skyline_edm', 'title_nudisco', 'title_electro', 'results_funkhop']


def lines_of(notes):
    """The top voice of a part as a sequence of pitches (chords reduced to their top note, repeats merged)."""
    by_t = {}
    for n in notes:
        if isinstance(n.p, str):
            continue
        k = round(n.t, 2)
        by_t[k] = max(by_t.get(k, -1), n.p)
    seq = [p for _, p in sorted(by_t.items())]
    out = []
    for p in seq:
        if not out or out[-1] != p:
            out.append(p)
    return out


def check(name, k=5):
    try:
        m = importlib.import_module('songs.' + name)
    except ModuleNotFoundError:
        return None
    song = m.compose()
    notes = song.finalize()
    hits = []
    for part, ns in notes.items():
        if part not in LEADS:
            continue
        ps = lines_of(ns)
        iv = [b - a for a, b in zip(ps, ps[1:])]
        for ref, pat in REFS.items():
            L = len(pat)
            if L < 2:
                continue
            for i in range(len(iv) - L + 1):
                if iv[i:i + L] == pat:
                    hits.append((part, ref, i))
    return hits


if __name__ == '__main__':
    for name in sys.argv[1:] or SONGS:
        h = check(name)
        if h is None:
            continue
        print(f'{name:20s}', 'no match' if not h else f'{len(h)} matches: ' + '; '.join(f'{p} ~ {r} at interval {i}' for p, r, i in h[:6]), flush=True)

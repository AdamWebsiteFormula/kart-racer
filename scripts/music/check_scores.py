# Parses every song's score and course-intro pieces (bar lengths are checked as they are read) and prints note
# counts and each part's pitch range against the instrument's playable range. Nothing is rendered or played.
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RANGES = {  # practical sounding ranges (MIDI) for the players; notes outside get flagged
    'trumpet': (52, 84), 'trumpet_harmon': (52, 82), 'trombone': (40, 72), 'horn': (34, 77), 'tuba': (26, 58), 'alto': (49, 80),
    'bari': (36, 68), 'ebass': (23, 55), 'upright': (28, 55), 'guitar': (40, 86), 'banjo': (40, 76), 'fiddle': (55, 98),
    'violins': (55, 100), 'violas': (48, 88), 'celli': (36, 76), 'flute': (60, 96), 'flute_vib': (60, 96), 'clarinet': (50, 91),
    'glock': (67, 108), 'xylo': (65, 108), 'harp': (24, 103), 'timpani': (33, 50), 'chimes': (60, 77), 'piano': (21, 108),
}
SONGS = ['harbour_loop', 'meadow_run', 'canyon_rush', 'frostbite_pass', 'boardwalk_nights', 'skyline_circuit']
for name in sys.argv[1:] or SONGS:
    m = importlib.import_module('songs.' + name)
    items = [('theme', m.compose())] + ([(k, v[0]) for k, v in m.shorts().items()] if hasattr(m, 'shorts') else [])
    for label, song in items:
        notes = song.finalize()
        total = sum(len(v) for v in notes.values())
        flags = []
        for pn, ns in notes.items():
            inst = song.parts[pn].inst
            lo, hi = RANGES.get(inst, (0, 127))
            ps = [n.p for n in ns if not isinstance(n.p, str)]
            if ps and (min(ps) < lo or max(ps) > hi):
                flags.append(f'{pn}({inst}) {min(ps)}-{max(ps)} outside {lo}-{hi}')
        print(f'{name:18s} {label:9s} {total:5d} notes', '; '.join(flags))

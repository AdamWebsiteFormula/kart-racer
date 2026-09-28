# Boardwalk Nights (track boardwalk-nights): disco-funk for a neon seaside carnival at night. F-sharp minor with a
# chorus in A major, 126 bpm. Four-on-the-floor drums with open hats and claps, octave-jumping bass, a chicken-scratch
# guitar, a disco string section (swoops, stabs, soaring octaves), a horn hook (trumpet and alto in octaves, a quiet
# synth doubling it for the neon), a band-organ calliope for the carnival break, congas, tambourine, glockenspiel.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (the groove builds, a string swoop, the pickup bar) | loop 36:
#   A 8 (the horn hook over the F#m9-B9 vamp) | B 8 (the chorus in A major: strings soar) | C 8 (the calliope's
#   carnival break over congas) | D 4 (the fireworks build: snare rush, strings rising) | A' 8 (hook, strings and
#   horns together, ending on the pickup bar = intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import harmonize, comp, pad, shift

STYLE = 'disco-funk: four-on-the-floor drums, claps, octave bass, chicken-scratch guitar, disco strings, horn hook with a synth double, calliope, congas, glockenspiel'
FORM = ['intro 4 (groove builds, string swoop, pickup bar)', 'A 8 horn hook over F#m9-B9', 'B 8 chorus in A major (strings)',
        'C 8 calliope carnival break', 'D 4 fireworks build', "A' 8 hook with strings, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 126, 4, 36
A0, B0, C0, D0, A2 = 4, 12, 20, 28, 32

PROG = {
    'intro': 'F#m9 | B9 | F#m9 | Dmaj7 C#7#9',
    'A': 'F#m9 | B9 | F#m9 | B9 | Dmaj7 | C#7#9 | F#m9 | B9',
    'B': 'Amaj7 | G#m7 | F#m7 | E | Dmaj7 | C#m7 | Bm7 | E7sus4 E7',
    'C': 'F#m | F#m | Bm | C#7 | F#m | D | C#7 | C#7',
    'D': 'Dmaj7 | Dmaj7 | C#7sus4 | C#7#9',
    "A'": 'F#m9 | B9 | F#m9 | B9 | Dmaj7 | C#7#9 | F#m9 | Dmaj7 C#7#9',
}

HOOK = [
    "C#5:8 E5:8 r:16 F#5:16 r:8 A5:8 G#5:16 F#5:16 E5:8 C#5:8",
    "D#5:8 E5:8 F#5:4~ F#5:8 E5:8 C#5:8 B4:8",
    "C#5:8 E5:8 r:16 F#5:16 r:8 A5:8 B5:16 C#6:16 B5:8 A5:8",
    "F#5:4. E5:8 D#5:8 E5:8 F#5:4",
    "A5:8 F#5:8 r:8 A5:8 C#6:8 A5:8 F#5:8 E5:8",
    "E5:8 E#5:8 G#5:8 B5:8~ B5:4 A5:8 G#5:8",
    "F#5:4 C#5:8 E5:8~ E5:8 F#5:8 A5:8 G#5:8",
]
PICKUP = "F#5:8^ r:8 r:4 A5:8^ r:8 G#5:8 E#5:8"   # the horns' bar that ends the intro and the loop
CHORUS = [
    "E5:4. C#5:8 E5:4 A5:4", "G#5:2 F#5:4 D#5:4", "C#5:4. A4:8 C#5:4 F#5:4", "E5:2. B4:4",
    "F#5:4. A5:8 C#6:4 A5:4", "G#5:4. E5:8 C#5:4 E5:4", "D5:4 F#5:4 A5:4 B5:4", "A5:4. G#5:8 E5:2",
]
CALLIOPE = [
    "F#5:8 G#5:8 A5:8 F#5:8 C#6:4 A5:4", "B5:8 A5:8 G#5:8 F#5:8 E#5:4 C#5:4",
    "D5:8 E5:8 F#5:8 D5:8 B5:4 F#5:4", "G#5:8 F#5:8 E#5:8 D#5:8 C#5:2",
    "F#5:8 G#5:8 A5:8 F#5:8 C#6:4 A5:4", "D6:8 C#6:8 B5:8 A5:8 F#5:4 D5:4",
    "C#5:8 D5:8 E#5:8 G#5:8 B5:4 G#5:4", "C#6:2 r:2",
]


def lines(parts, t0):
    out = []
    for k, s in enumerate(parts):
        ns, _ = seq(s, t0 + 4 * k)
        out += ns
    return out


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Boardwalk Nights', 'boardwalk-nights', BPM, 'F-sharp minor / A major', INTRO, LOOP, seed=53)
    P = {}
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=3, jitter_ms=5, mono=True)
    P['tpt2'] = s.part('tpt2', 'trumpet', lag_ms=5, jitter_ms=5, mono=True)
    P['alto'] = s.part('alto', 'alto', lag_ms=4, jitter_ms=5, mono=True)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=6, jitter_ms=5, mono=True)
    P['synth'] = s.part('synth', 'neon_lead', lag_ms=0, jitter_ms=2, mono=True)
    P['vln'] = s.part('vln', 'violins', lag_ms=6, jitter_ms=5)
    P['vla'] = s.part('vla', 'violas', lag_ms=7, jitter_ms=5)
    P['vc'] = s.part('vc', 'celli', lag_ms=7, jitter_ms=5)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05, swing=0.52, swing_unit=0.25)
    P['clap'] = s.part('clap', 'clap', jitter_ms=4)
    P['bass'] = s.part('bass', 'ebass', lag_ms=0, jitter_ms=3, swing=0.52, swing_unit=0.25, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['calliope'] = s.part('calliope', 'calliope', lag_ms=0, jitter_ms=3, mono=True)
    P['glock'] = s.part('glock', 'glock', jitter_ms=3)
    P['conga'] = s.part('conga', 'conga', jitter_ms=4, swing=0.52, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['riser'] = s.part('riser', 'riser', jitter_ms=0)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ('D', 4), ("A'", 8)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])

    def hook_horns(notes, synth=True):
        P['tpt1'].add(notes)
        P['alto'].add(shift(notes, 0, -12))
        if synth:
            P['synth'].add(notes)

    # ---------------------------------------------------------------- the groove
    def disco(bar0, nbars, open_hats=True, claps=True, kick=True):
        for b in range(nbars):
            bar = bar0 + b
            if kick:
                P['drums'].add(grid('x...x...x...x...', 'kick', at(bar)))
            P['drums'].add(grid('....X.......X...', 'snare', at(bar), vels={'X': 0.85}) +
                           grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.55, 'g': 0.35}))
            if open_hats:
                P['drums'].add(grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.55}))
            if claps:
                P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.75}))
            P['tamb'].add(grid('xgxgxgxgxgxgxgxg', 'Tamb1_Shake', at(bar), vels={'x': 0.4, 'g': 0.25}))

    def octave_bass(bar0, nbars, busy=False):
        out = []
        for b in range(nbars):
            for k in range(8):
                tt = at(bar0 + b) + 0.5 * k
                ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
                r = 30 + ((ch.bass - 30) % 12)
                p = r + (12 if k % 2 else 0)
                out.append(Note(tt, 0.42 if k % 2 else 0.46, p, 0.82 if k % 2 == 0 else 0.7))
            if busy:
                out.append(Note(at(bar0 + b) + 3.75, 0.2, r + 10, 0.6))
        return out

    def scratch(bar0, nbars, pat='x.xxx.xxx.xxx.xx', lo=64, hi=76):
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['gtr'].add([n.copy(art=n.art | {'stac'}, v=n.v * (1.0 if i % 3 == 0 else 0.8)) for i, n in
                      enumerate(comp(pr, pat, lo, hi, n=3, vel=0.55, dur=0.12, t0=at(bar0), t1=at(bar0 + nbars)))])

    # ---------------------------------------------------------------- intro: the groove builds
    P['drums'].add(grid('x...x...x...x...|x...x...x...x...|x...x...x...x...', 'kick', at(0)) +
                   grid('................|..o...o...o...o.|..o...o...o...o.', 'hho', at(0), vels={'o': 0.5}) +
                   grid('xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg', 'hhc', at(0), vels={'x': 0.5, 'g': 0.3}))
    P['clap'].add(grid('................|....x.......x...|....x.......x...', 'handclap', at(0), vels={'x': 0.7}))
    P['bass'].add(octave_bass(1, 2))
    scratch(2, 1)
    # a string swoop into the pickup bar
    P['vln'].add([Note(at(2) + 3.0, 1.0, 81, 0.7, {'scoop'}, {'scoop': 12, 'scoop_t': 0.3})])

    def pickup(bar):
        hn = lines([PICKUP], at(bar))
        hook_horns(hn, synth=False)
        P['tpt2'].add([n.copy(p=n.p - 3 if n.p != 78 else 73) for n in hn])
        P['tbn'].add(shift(hn, 0, -24))
        P['vln'].add(lines(["[A5 C#6]:8^ r:8 r:4 [F#5 A5]:8^ r:8 [E#5 G#5]:4"], at(bar)))
        P['vc'].add(lines(["F#3:8^ r:8 r:4 C#3:8^ r:8 C#3:4"], at(bar)))
        P['bass'].add(lines(["F#1:8^ r:8 r:4 D2:8^ r:8 C#2:8 C#3:8"], at(bar)))
        P['drums'].add(grid('x.......x.......', 'kick', at(bar)) + grid('x...............', 'crash', at(bar)) +
                       grid('........x.x.xxxx', 'snare', at(bar), vels={'x': 0.7}))
        P['gtr'].add(lines(["[A4 C#5 E5]:16' r:16 r:8 r:4 [F#4 A4 D5]:16' r:16 r:8 r:4"], at(bar)))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the horn hook
    hk = lines(HOOK, at(A0))
    hook_horns(hk)
    P['tpt1'].add(lines(["F#5:8^ r:8 r:4 r:8 A4:8 B4:8 C#5:8"], at(A0 + 7)))
    P['alto'].add(lines(["F#4:8^ r:8 r:4 r:8 A3:8 B3:8 C#4:8"], at(A0 + 7)))
    disco(A0, 8)
    P['bass'].add(octave_bass(A0, 8, busy=True))
    scratch(A0, 8)
    # strings: stabs on the upbeats under the hook
    st = comp(prog['A'], '......x.......x.', 64, 78, n=3, vel=0.6, dur=0.3)
    P['vln'].add([n.copy(art=n.art | {'stac'}) for n in st])
    P['vc'].add(pad(prog['A'], 42, 54, n=1, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(A0)))

    # ---------------------------------------------------------------- B: the chorus in A major
    ch = lines(CHORUS, at(B0))
    P['vln'].add([n.copy(art=n.art | ({'scoop'} if n.d >= 1.5 else set()), x={'scoop': 3, 'scoop_t': 0.12}) for n in ch])
    P['vln'].add(shift(ch, 0, 12, vel=0.85))
    P['vla'].add(pad(prog['B'], 57, 69, n=2, vel=0.5))
    P['vc'].add(pad(prog['B'], 40, 52, n=1, vel=0.55))
    P['glock'].add([n.copy(p=n.p + 12, v=0.5, d=0.4) for n in ch if n.d >= 1.0])
    # horns punch the chorus downbeats
    hits = comp(prog['B'], 'X.............x.', 62, 74, n=3, vel=0.7, dur=0.25)
    by_t = {}
    for n in hits:
        by_t.setdefault(round(n.t, 3), []).append(n)
    for tt, ns in by_t.items():
        ns.sort(key=lambda n: -n.p)
        P['tpt1'].add(ns[0].copy(art=frozenset({'marc'})))
        P['tpt2'].add(ns[1].copy(art=frozenset({'marc'})))
        P['tbn'].add(ns[2].copy(p=ns[2].p - 12, art=frozenset({'marc'})))
    disco(B0, 8)
    P['bass'].add(octave_bass(B0, 8))
    scratch(B0, 8, 'x.x.x.x.x.x.x.x.', 66, 78)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)) +
                   grid('........x.x.x.xx', 'snare', at(B0 + 7), vels={'x': 0.6}))

    # ---------------------------------------------------------------- C: the calliope's carnival break
    cal = lines(CALLIOPE, at(C0))
    P['calliope'].add(cal)
    P['glock'].add([n.copy(p=n.p + 12, v=0.42, d=0.3) for n in cal])
    for b in range(8):
        bar = C0 + b
        P['drums'].add(grid('x...x...x...x...', 'kick', at(bar)) + grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.45}))
        P['conga'].add(grid('..x.x..x..x.x..x', 'Conga_22_HitN', at(bar), vels={'x': 0.55}) + grid('x.......x.......', 'Conga_17_HitHM1', at(bar), vels={'x': 0.5}))
        P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.6}))
    P['bass'].add(lines(["F#1:4 C#2:4 F#1:4 C#2:4", "F#1:4 C#2:4 F#1:4 A1:4", "B1:4 F#2:4 B1:4 F#2:4", "C#2:4 G#2:4 C#2:4 E#2:4",
                         "F#1:4 C#2:4 F#1:4 C#2:4", "D2:4 A2:4 D2:4 A2:4", "C#2:4 G#2:4 C#2:4 G#2:4", "C#2:4 E#2:4 G#2:4 C#3:4"], at(C0)))
    P['vla'].add([n.copy(art=n.art | {'pizz'}) for n in comp(prog['C'], '..x...x...x...x.', 57, 69, n=2, vel=0.55, dur=0.3)])
    P['tbn'].add([n.copy(art=n.art | {'stac'}) for n in comp(prog['C'], 'x...x...x...x...', 45, 55, n=1, vel=0.5, dur=0.3)])

    # ---------------------------------------------------------------- D: the fireworks build
    P['drums'].add(grid('x...x...x...x...|x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx', 'kick', at(D0), vels={'x': 0.7}) +
                   grid('x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx', 'snare', at(D0), vels={'x': 0.5}) +
                   grid('x...............|................|................|................', 'crash', at(D0)))
    P['riser'].add([Note(at(D0), 16.0, 60, 0.9)])
    P['vln'].add([Note(at(D0) + 2 * k, 2.0, p, 0.45 + 0.04 * k, {'vib'}) for k, p in enumerate([66, 68, 69, 71, 73, 74, 76, 77])])
    P['vla'].add([Note(at(D0) + 2 * k, 2.0, p, 0.45 + 0.04 * k) for k, p in enumerate([57, 59, 61, 62, 64, 66, 68, 68])])
    P['vc'].add([Note(at(D0) + 4 * k, 4.0, p, 0.6) for k, p in enumerate([38, 38, 37, 37])])
    P['bass'].add(lines(["D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8", "D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8",
                         "C#2:8 C#2:8 C#2:8 C#2:8 C#2:8 C#2:8 C#2:8 C#2:8", "C#2:8 C#2:8 C#2:8 C#2:8 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16"], at(D0)))
    P['tpt1'].add(lines(["r:1", "r:1", "G#5:1!vib", "G#5:2 G#5:8^ r:8 r:4"], at(D0)))
    P['tpt2'].add(lines(["r:1", "r:1", "F#5:1", "E#5:2 E#5:8^ r:8 r:4"], at(D0)))

    # ---------------------------------------------------------------- A': hook with strings and horns
    hk2 = lines(HOOK, at(A2))
    hook_horns(hk2)
    P['vln'].add(shift(hk2, 0, 12, vel=0.75))
    hv = harmonize(hk2, allp, 3, drop2=False, key=(9, 'major'))
    P['tpt2'].add(hv[1])
    P['tbn'].add(shift(hv[2], 0, -12))
    P['vla'].add(pad(prog["A'"][:7], 57, 69, n=2, vel=0.45))
    P['vc'].add(pad(prog["A'"][:7], 42, 54, n=1, vel=0.5))
    disco(A2, 7)
    P['bass'].add(octave_bass(A2, 7, busy=True))
    scratch(A2, 7)
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    P['glock'].add([n.copy(p=n.p + 12, v=0.45, d=0.3) for n in hk2 if n.d >= 0.5])
    return s


def _lead():
    from studio import synths
    return synths.Lead(gain_db=-12.0, shape='saw', cutoff=1800.0, env_amt=2500.0, res=0.15, vib=(5.5, 0.1, 0.3), release=0.08)


from studio import instruments as _I
_I.RACK['neon_lead'] = _lead

MIX = {
    'tracks': {
        'tpt1': {'bus': 'horns', 'pan': -0.15, 'gain': 0.0, 'eq': [('hp', 200), ('peak', 3000, 1.0, 1.5)], 'sends': {'plate': -12}},
        'tpt2': {'bus': 'horns', 'pan': -0.35, 'gain': -3.0, 'eq': [('hp', 200)], 'sends': {'plate': -12}},
        'alto': {'bus': 'horns', 'pan': 0.2, 'gain': -2.0, 'eq': [('hp', 150)], 'sends': {'plate': -12}},
        'tbn': {'bus': 'horns', 'pan': 0.1, 'gain': -3.0, 'eq': [('hp', 80)], 'sends': {'plate': -13}},
        'synth': {'pan': 0.0, 'gain': -10.0, 'width': 1.4, 'eq': [('hp', 300), ('lp', 9000)], 'sends': {'delay': -10, 'plate': -12}},
        'vln': {'bus': 'strings', 'pan': -0.25, 'gain': -3.0, 'eq': [('hp', 250), ('highshelf', 8000, 0.7, 2.0)], 'sends': {'hall': -8}},
        'vla': {'bus': 'strings', 'pan': 0.25, 'gain': -6.0, 'eq': [('hp', 180)], 'sends': {'hall': -8}},
        'vc': {'bus': 'strings', 'pan': 0.1, 'gain': -6.0, 'eq': [('hp', 60)], 'sends': {'hall': -10}},
        'drums.kick': {'bus': 'drums', 'gain': 2.0, 'eq': [('hp', 32), ('peak', 55, 1.0, 3.5), ('peak', 320, 1.2, -5.0), ('peak', 3500, 1.0, 2.5)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 5, 'rel_ms': 70}},
        'drums.snare': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 100), ('peak', 220, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'plate': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 400), ('highshelf', 8000, 0.7, 3.0)]},
        'drums.room': {'bus': 'drums', 'gain': -10.0, 'eq': [('hp', 150)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'clap': {'pan': 0.0, 'gain': -6.0, 'eq': [('hp', 400), ('peak', 1500, 1.0, 2.0)], 'sends': {'plate': -8}},
        'bass': {'gain': 0.0, 'eq': [('hp', 32), ('peak', 80, 1.0, 2.0), ('peak', 250, 1.0, -2.0), ('peak', 1500, 1.2, 2.5)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 3.0, 'duck': {'by': 'drums.kick', 'depth_db': 2.5}},
        'gtr': {'pan': 0.5, 'gain': -9.0, 'eq': [('hp', 350), ('peak', 3000, 1.0, 2.0)], 'sends': {'room': -12}},
        'calliope': {'pan': 0.15, 'gain': -4.0, 'eq': [('hp', 250)], 'sends': {'hall': -8, 'room': -10}},
        'glock': {'pan': 0.35, 'gain': -12.0, 'eq': [('hp', 800)], 'sends': {'hall': -6}},
        'conga': {'pan': -0.4, 'gain': -8.0, 'eq': [('hp', 100)], 'sends': {'room': -10}},
        'tamb': {'pan': 0.45, 'gain': -15.0, 'eq': [('hp', 3000)]},
        'riser': {'gain': -10.0, 'width': 1.5, 'sends': {'hall': -6}},
    },
    'buses': {
        'horns': {'gain': -1.0, 'eq': [('peak', 450, 0.8, -1.5), ('highshelf', 8000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 15, 'rel_ms': 150}, 'sat': 1.0},
        'strings': {'gain': 0.0, 'eq': [('peak', 350, 0.8, -2.0), ('highshelf', 7000, 0.7, 1.5)], 'comp': {'thr': -20, 'ratio': 2, 'att_ms': 20, 'rel_ms': 200}},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 100, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -4.0},
        'plate': {'ir': '2.3s_Nice Plate', 'predelay': 20, 'hp': 400, 'lp': 10000, 'gain': -4.0},
        'hall': {'ir': '2.0s_Medium Hall', 'predelay': 25, 'hp': 400, 'lp': 10000, 'gain': -3.0},
        'delay': {'kind': 'delay', 'time': 60 / 126 * 0.75, 'fb': 0.35, 'lp': 5000, 'hp': 400, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

# Lighthouse Loop, candidate A (track harbour-loop): funk-rock, a riff anthem for a sunny seaside town.
# G minor (Dorian colour), 150 bpm, straight sixteenths. A unison riff on bass and a crunchy guitar drives the verse;
# a clean guitar scratches sixteenths; a gritty tonewheel organ holds the pre-chorus; the horn section (two trumpets,
# alto and tenor saxes, two trombones) shouts the chorus hook in octaves, a quiet supersaw under it for the modern
# sheen; big funk-rock drums. Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (the riff alone, the drums join, a band hit and the pickup bar) | loop 40:
#   A 8 verse (the riff; the horns answer it; up a fourth for two bars) | B 8 pre-chorus (a rising bass line, the
#   horns swell, the organ) | C 8 chorus (the hook in horn octaves) | D 8 breakdown (bass, drums and the riff guitar,
#   then the horns build) | C' 8 chorus again, harmonized, ending on the pickup bar (= the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import harmonize, comp, pad, shift, drum_fill
from studio import instruments as _I

SLOT, CANDIDATE = 'harbour-loop', 'a-funk-rock'
STYLE = 'funk-rock riff anthem: unison bass and crunch-guitar riff, gritty organ, horn section shouting the hook in octaves, big funk-rock drums'
FORM = ['intro 4 (riff alone, drums join, band hit + pickup bar)', 'A 8 verse riff with horn answers', 'B 8 pre-chorus (rising bass, horn swells, organ)',
        'C 8 chorus hook in horn octaves', 'D 8 breakdown (bass, drums, riff guitar) then the horns build', "C' 8 chorus harmonized, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 150, 4, 40
A0, B0, C0, D0, C1 = 4, 12, 20, 28, 36

PROG = {
    'intro': 'Gm7 | Gm7 | Gm7 | Gm7',
    'A': 'Gm7 | Gm7 | Gm7 | Gm7 | C9 | C9 | Gm7 | D7#9',
    'B': 'Cm7 | Dm7 | Ebmaj7 | F | Cm7 | Dm7 | Ebmaj7 | D7sus4 D7',
    'C': 'Ebmaj7 | F | Gm7 | Gm7 | Ebmaj7 | F | D7sus4 D7 | Gm7',
    'D': 'Gm7 | Gm7 | Gm7 | Gm7 | Ebmaj7 | F | D7sus4 | D7#9',
    "C'": 'Ebmaj7 | F | Gm7 | Gm7 | Ebmaj7 | F | D7sus4 D7 | Gm7',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ('D', 8), ("C'", 8)]

RIFF = ["G1:8. G2:16 r:16 G1:16 Bb1:8 C2:8 C#2:16 D2:16 r:16 F2:16 G2:8",
        "G1:8. G2:16 r:16 G1:16 Bb1:8 D2:8 C2:16 Bb1:16 r:16 A1:16 F1:8"]
HORN_ANSWER = "r:2 r:8 D5:16 F5:16 G5:8^ r:8"            # the horns answer the riff's second bar
HOOK = [
    "G5:4. F5:8 Eb5:4 D5:8 Eb5:8~", "Eb5:4 D5:8 C5:8~ C5:4 r:8 F4:8",
    "Bb4:8 C5:8 D5:8 G5:8~ G5:4 F5:8 D5:8", "F5:2 r:4 r:8 D5:8",
    "G5:4. F5:8 Eb5:4 D5:8 Eb5:8~", "Eb5:4 F5:8 G5:8~ G5:4 A5:8 Bb5:8",
    "A5:4 G5:4 F#5:4 D5:4",
]
SWELL = ["C5:1", "D5:1", "Eb5:1", "F5:1", "C5:1", "D5:1", "Eb5:1", "D5:2 F#5:2"]   # B: the horns' rising long notes


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Lighthouse Loop (funk-rock)', 'harbour-loop', BPM, 'G minor', INTRO, LOOP, seed=81)
    P = {}
    for name, inst, lag in (('tpt1', 'trumpet', 3), ('tpt2', 'trumpet', 5), ('alto', 'alto', 4), ('tenor', 'alto', 5),
                            ('tbn1', 'trombone', 5), ('tbn2', 'trombone', 6)):
        P[name] = s.part(name, inst, lag_ms=lag, jitter_ms=4, mono=True)
    P['bass'] = s.part('bass', 'ebass', lag_ms=0, jitter_ms=2.5, mono=True)
    P['riffgtr'] = s.part('riffgtr', 'guitar', lag_ms=1, jitter_ms=3)
    P['organ'] = s.part('organ', 'organ_riptide', jitter_ms=3)
    P['saw'] = s.part('saw', 'riptide_saw', jitter_ms=1.5, mono=True)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3, vel_jitter=0.05)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def riff(bar, semis=0, bars=2):
        """The riff from `bar` (two bars), transposed; the bass plays it, the crunch guitar an octave up with fifths
        on the long notes."""
        r = shift(lines(RIFF[:bars], at(bar)), 0, semis)
        P['bass'].add(r)
        for n in r:
            g = n.copy(p=n.p + 12)
            P['riffgtr'].add([g] + ([g.copy(p=g.p + 7)] if n.d >= 0.5 else []))

    def horns(notes, parts=('tpt1', 'tpt2', 'alto', 'tenor', 'tbn1', 'tbn2'), octaves=(0, 0, -12, -12, -12, -24)):
        for pn, o in zip(parts, octaves):
            P[pn].add(shift(notes, 0, o))

    def groove(bar0, nbars, busy=False):
        for b in range(nbars):
            bar = bar0 + b
            P['drums'].add(grid('x.....x...x..x..' if not busy else 'x..x..x...x..x.x', 'kick', at(bar)) +
                           grid('....X......g..X.' if not busy else '....X..g....X.g.', 'snare', at(bar), vels={'g': 0.3}) +
                           grid('x.x.x.x.x.x.x.xo', 'hhc', at(bar), vels={'x': 0.62, 'o': 0.55}))
            P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.5}))


    # ---------------------------------------------------------------- intro: the riff alone, then the band
    riff(0)
    riff(2, bars=1)
    P['drums'].add(grid('................|x.....x...x..x..|x.....x...x..x..', 'kick', at(0)) +
                   grid('................|xxxxxxxxxxxxxxxx|x.x.x.x.x.x.x.xo', 'hhc', at(0), vels={'x': 0.5, 'o': 0.55}) +
                   grid('................|................|....X.......X...', 'snare', at(0)))
    horns(lines([HORN_ANSWER], at(1)))

    def pickup(bar):
        hit = lines(["[G4 Bb4 D5 G5]:8^ r:8 r:4 r:2"], at(bar))
        top = sorted(hit, key=lambda n: -n.p)
        for pn, n in zip(('tpt1', 'tpt2', 'alto', 'tenor'), top):
            P[pn].add(n)
        P['tbn1'].add(Note(at(bar), 0.5, 55, 0.95, {'marc'}))
        P['tbn2'].add(Note(at(bar), 0.5, 43, 0.95, {'marc'}))
        P['bass'].add(lines(["G1:8^ r:8 r:4 D2:8 Eb2:8 E2:8 F#2:8"], at(bar)))
        P['riffgtr'].add(lines(["[G2 D3 G3]:8^ r:8 r:4 r:2"], at(bar)))
        P['organ'].add(lines(["[Bb3 D4 F4 G4]:8^ r:8 r:4 r:2"], at(bar)))
        P['drums'].add(grid('x.......x.......', 'kick', at(bar)) + grid('x...............', 'crash', at(bar)) +
                       grid('........x.x.xxXX', 'snare', at(bar), vels={'x': 0.7}) + grid('..........x.....', 'tomh', at(bar), vels={'x': 0.75}) +
                       grid('............x.x.', 'toml', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(C1 + 7)
    s.twin(INTRO - 1, C1 + 7)

    # ---------------------------------------------------------------- A: the verse riff
    for k, semis in enumerate((0, 0, 5, 0)):
        riff(A0 + 2 * k, semis)
        if k in (0, 1, 3):
            horns(lines([HORN_ANSWER], at(A0 + 2 * k + 1)), octaves=(0, 0, -12, -12, -12, -24))
    groove(A0, 8)
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    # the turnaround hit on D7#9
    P['tpt1'].add(Note(at(A0 + 7) + 3.5, 0.5, 77, 0.9, {'marc'}))
    P['tpt2'].add(Note(at(A0 + 7) + 3.5, 0.5, 72, 0.9, {'marc'}))
    P['tbn1'].add(Note(at(A0 + 7) + 3.5, 0.5, 66, 0.9, {'marc'}))

    # ---------------------------------------------------------------- B: pre-chorus
    sw = lines(SWELL, at(B0))
    hv = harmonize(sw, allp, 3, drop2=False, key=(7, 'dorian'))
    P['tpt1'].add([n.copy(v=0.55, art=n.art | {'vib'}) for n in hv[0]])
    P['alto'].add([n.copy(v=0.5) for n in hv[1]])
    P['tbn1'].add([n.copy(p=n.p - 12, v=0.55) for n in hv[2]])
    P['organ'].add(pad(prog['B'], 55, 70, n=4, vel=0.55))
    for b in range(8):
        tt = at(B0 + b)
        ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
        r = 31 + ((ch.bass - 31) % 12)
        P['bass'].add([Note(tt, 0.7, r, 0.85), Note(tt + 0.75, 0.25, r + 12, 0.6), Note(tt + 1.5, 0.5, r, 0.7),
                       Note(tt + 2.5, 0.5, r + 7, 0.72), Note(tt + 3, 0.5, r + 10 if 10 in ch.ivs else r + 12, 0.7), Note(tt + 3.5, 0.5, r + 12, 0.65)])
    groove(B0, 8, busy=True)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x.......xxxxxxxx', 'snare', at(B0 + 7), vels={'x': 0.7}))

    # ---------------------------------------------------------------- C: the chorus hook in horn octaves
    def chorus(bar0, harmonized=False):
        hook = lines(HOOK, at(bar0))
        if harmonized:
            hv = harmonize(hook, allp, 4, drop2=True, key=(7, 'dorian'))
            P['tpt1'].add(hv[0]); P['tpt2'].add(hv[1]); P['alto'].add(hv[2]); P['tenor'].add(shift(hv[3], 0, 0))
            P['tbn1'].add(shift(hook, 0, -12)); P['tbn2'].add(shift(hook, 0, -24))
        else:
            horns(hook)
        P['saw'].add(shift(hook, 0, 12, vel=0.7))
        P['organ'].add(pad(prog['C'][:-1], 55, 70, n=4, vel=0.5))
        for b in range(7):
            tt = at(bar0 + b)
            ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
            r = 31 + ((ch.bass - 31) % 12)
            P['bass'].add([Note(tt + 0.5 * k, 0.45, r + (12 if k in (3, 7) else 0), 0.85 if k % 2 == 0 else 0.7) for k in range(8)])
            P['riffgtr'].add([Note(tt + 0.5 * k, 0.4, p, 0.62 if k % 2 == 0 else 0.5, {'stac'}) for k in range(8) for p in (r + 12, r + 19)])
        groove(bar0, 7, busy=True)
        for bar in (bar0, bar0 + 4):
            P['drums'].add(grid('x...............', 'crash', at(bar)))
        P['drums'].add(grid('x.......x.......', 'crash', at(bar0 + 6)))
    chorus(C0)
    # the chorus's last bar (not the pickup): the hook lands on G and the band punches
    horns(lines(["G5:2.^ r:4"], at(C0 + 7)))
    P['bass'].add(lines(["G1:4^ r:4 D2:8 F2:8 F#2:8 G2:8"], at(C0 + 7)))
    P['riffgtr'].add(lines(["[G2 D3 G3]:4^ r:4 r:2"], at(C0 + 7)))
    P['drums'].add(grid('x...............', 'crash', at(C0 + 7)) + grid('x.......x.x.....', 'kick', at(C0 + 7)) +
                   grid('........x.x.XXXX', 'snare', at(C0 + 7), vels={'x': 0.7}))

    # ---------------------------------------------------------------- D: the breakdown, then the horns build
    for k in range(2):
        riff(D0 + 2 * k)
    for b in range(4):
        P['drums'].add(grid('x.....x...x.....', 'kick', at(D0 + b)) + grid('....X.......X...', 'rim', at(D0 + b)) +
                       grid('x.x.x.x.x.x.x.x.', 'ride', at(D0 + b), vels={'x': 0.5}))
    P['organ'].add(lines(["r:2 r:8 [F4 Bb4 D5]:8^ r:4", "r:2 r:8 [F4 A4 D5]:8^ [F4 Bb4 D5]:4", "r:2 r:8 [F4 Bb4 D5]:8^ r:4",
                          "r:2 [G4 C5 E5]:8^ r:8 [F4 Bb4 D5]:4"], at(D0)))
    build = lines(["G4:8^ r:8 G4:8^ r:8 G4:8^ r:8 G4:8^ r:8", "A4:8^ r:8 A4:8^ r:8 A4:8^ r:8 A4:8^ r:8",
                   "A4:4^ r:4 D5:4^ r:4", "C5:8^ D5:8^ r:8 D5:8^ F#5:4^ r:4"], at(D0 + 4))
    hv = harmonize(build, allp, 3, drop2=False, key=(7, 'dorian'))
    P['tpt1'].add(hv[0]); P['alto'].add(hv[1]); P['tbn1'].add(shift(hv[2], 0, -12)); P['tbn2'].add(shift(hv[0], 0, -24))
    for b in range(4, 8):
        tt = at(D0 + b)
        ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
        r = 31 + ((ch.bass - 31) % 12)
        P['bass'].add([Note(tt + 0.5 * k, 0.45, r, 0.8) for k in range(8)])
    groove(D0 + 4, 3, busy=True)
    P['drums'].add(grid('x...............', 'crash', at(D0 + 4)) + grid('x.x.x.x.xxxxxxxx', 'snare', at(D0 + 7), vels={'x': 0.7}) +
                   grid('x...x...x...x...', 'kick', at(D0 + 7)))

    # ---------------------------------------------------------------- C': the chorus again, harmonized
    chorus(C1, harmonized=True)

    for bar, style in [(A0 + 3, 'snare'), (A0 + 5, 'toms'), (B0 + 3, 'flams'), (C0 + 3, 'down'), (C1 + 3, 'toms')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _voices():
    from studio import synths, modern
    _I.RACK['organ_riptide'] = lambda: synths.Organ(drawbars='888600000', perc=None, click=0.3, drive_db=9.0, leslie='fast', gain_db=-6.0)
    _I.RACK['riptide_saw'] = lambda: modern.Supersaw(voices=5, detune=16, spread=0.8, cutoff=3000, env_amt=2000, env_decay=0.3, release=0.15,
                                                       gain_db=-18, vib=(5.5, 0.1, 0.3))


_voices()

MIX = {
    'tracks': {
        'tpt1': {'bus': 'horns', 'pan': -0.15, 'gain': 0.0, 'eq': [('hp', 200), ('peak', 3000, 1.0, 1.5)], 'sends': {'room': -12}},
        'tpt2': {'bus': 'horns', 'pan': -0.35, 'gain': -2.5, 'eq': [('hp', 200)], 'sends': {'room': -12}},
        'alto': {'bus': 'horns', 'pan': 0.2, 'gain': -2.0, 'eq': [('hp', 150)], 'sends': {'room': -12}},
        'tenor': {'bus': 'horns', 'pan': 0.38, 'gain': -4.0, 'eq': [('hp', 110)], 'sends': {'room': -12}},
        'tbn1': {'bus': 'horns', 'pan': 0.05, 'gain': -2.5, 'eq': [('hp', 80), ('peak', 350, 1.0, -1.5)], 'sends': {'room': -13}},
        'tbn2': {'bus': 'horns', 'pan': -0.05, 'gain': -4.0, 'eq': [('hp', 60), ('peak', 300, 1.0, -2.0)], 'sends': {'room': -14}},
        'bass': {'gain': 0.0, 'eq': [('hp', 32), ('peak', 90, 1.0, 2.0), ('peak', 250, 1.0, -2.5), ('peak', 1500, 1.2, 3.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 3.5},
        'riffgtr': {'pan': -0.45, 'gain': -9.0, 'amp': {'drive_db': 18.0, 'mids': 2.0}, 'eq': [('lp', 7000)], 'sends': {'room': -14}},
        'organ': {'pan': 0.1, 'gain': -17.0, 'width': 1.4, 'eq': [('hp', 200), ('lp', 7000)], 'sends': {'room': -10}},
        'saw': {'gain': -8.0, 'width': 1.5, 'eq': [('hp', 400), ('lp', 9000)]},
        'drums.kick': {'bus': 'drums', 'gain': 2.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 3.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 90), ('peak', 200, 1.0, 2.5), ('peak', 900, 1.5, -2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.5)]},
        'drums.room': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'tamb': {'pan': 0.5, 'gain': -15.0, 'eq': [('hp', 3000)]},
    },
    'buses': {
        'horns': {'gain': -1.0, 'eq': [('peak', 450, 0.8, -2.0), ('peak', 3500, 1.0, 1.5), ('highshelf', 8000, 0.7, 2.0)],
                  'comp': {'thr': -18, 'ratio': 3, 'att_ms': 10, 'rel_ms': 120}, 'sat': 2.0},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 100, 'mix': 0.6}, 'sat': 2.5},
    },
    'fx': {
        'room': {'ir': '00.9s Recording Room-OST', 'predelay': 8, 'hp': 450, 'lp': 9000, 'gain': -5.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 1.5},
}


def shorts():
    """Course-intro pieces: 6.0 s (the riff on bass and guitar with the drums, the horns' answer, a G minor band hit
    held from 3.2 s) and 2.5 s (the riff's first bar with the drums into a G minor band hit at 1.4 s)."""
    out = {}
    s = Song('Lighthouse Loop (funk-rock) - course intro', 'harbour-loop', BPM, 'G minor', 3, 0, seed=82, tail_bars=0)
    s.about = "the riff with the drums, the horns' answer, a G minor band hit held"
    P = {}
    for name, inst in (('tpt1', 'trumpet'), ('tpt2', 'trumpet'), ('alto', 'alto'), ('tbn1', 'trombone'), ('tbn2', 'trombone')):
        P[name] = s.part(name, inst, lag_ms=4, jitter_ms=4, mono=True)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=2.5, mono=True)
    P['riffgtr'] = s.part('riffgtr', 'guitar', jitter_ms=3)
    P['organ'] = s.part('organ', 'organ_riptide', jitter_ms=3)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3)
    r = lines(RIFF, 0)
    P['bass'].add(r)
    P['riffgtr'].add([n.copy(p=n.p + 12) for n in r] + [n.copy(p=n.p + 19) for n in r if n.d >= 0.5])
    ans = lines([HORN_ANSWER], 4)
    for pn, o in (('tpt1', 0), ('tpt2', -3), ('alto', -12), ('tbn1', -12), ('tbn2', -24)):
        P[pn].add(shift(ans, 0, o))
    for pn, p in (('tpt1', 79), ('tpt2', 74), ('alto', 70), ('tbn1', 62), ('tbn2', 43)):
        P[pn].add(Note(8, 2.0, p, 0.9, {'acc'}))
    P['bass'].add([Note(8, 2.0, 31, 0.9)])
    P['riffgtr'].add([Note(8, 2.0, p, 0.85) for p in (43, 50, 55)])
    P['organ'].add([Note(8, 2.5, p, 0.6) for p in (58, 62, 65, 67)])
    P['drums'].add(grid('x.....x...x..x..|x.....x...x.....|x...............', 'kick', 0) +
                   grid('....X......g..X.|....X.......xxXX|................', 'snare', 0, vels={'g': 0.3, 'x': 0.7}) +
                   grid('x.x.x.x.x.x.x.xo|x.x.x.x.x.......|................', 'hhc', 0, vels={'x': 0.6, 'o': 0.55}) +
                   grid('x...............|................|x...............', 'crash', 0))
    out['intro-6s'] = (s, 6.0, 8)
    s = Song('Lighthouse Loop (funk-rock) - course intro short', 'harbour-loop', BPM, 'G minor', 2, 0, seed=83, tail_bars=0)
    s.about = "the riff's first bar on bass and crunch guitar with the drums, into a G minor band hit"
    P = {}
    for name, inst in (('tpt1', 'trumpet'), ('tpt2', 'trumpet'), ('alto', 'alto'), ('tbn1', 'trombone'), ('tbn2', 'trombone')):
        P[name] = s.part(name, inst, lag_ms=4, jitter_ms=3, mono=True)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=2, mono=True)
    P['riffgtr'] = s.part('riffgtr', 'guitar', jitter_ms=2)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    r = lines(["G1:8. G2:16 r:16 G1:16 Bb1:8 C2:8 C#2:16 D2:16 r:16 F2:16 G1:8^", "r:1"], 0)
    P['bass'].add(r)
    P['riffgtr'].add([n.copy(p=n.p + 12) for n in r] + [n.copy(p=n.p + 19) for n in r if n.d >= 0.5])
    for pn, p in (('tpt1', 79), ('tpt2', 74), ('alto', 70), ('tbn1', 55), ('tbn2', 43)):
        P[pn].add(Note(3.5, 1.5, p, 0.85, {'acc'}))
    P['drums'].add(grid('x.....x...x...x.|................', 'kick', 0) + grid('....X...x.xxX.X.|................', 'snare', 0, vels={'x': 0.7}) +
                   grid('x.x.x.x.........|................', 'hhc', 0, vels={'x': 0.6}) + grid('..............x.|................', 'crash', 0))
    out['intro-2s'] = (s, 2.5, 3.5)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

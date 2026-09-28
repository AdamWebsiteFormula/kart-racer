# Mesa Rush, candidate B (track canyon-rush): surf-punk, a harder rework of the surf-rock draft (canyon_rush.py) for
# red-rock desert, rope bridges and mine carts. E minor, 176 bpm. A tremolo-picked lead guitar with spring reverb
# sings the tune, two overdriven rhythm guitars double-tracked left and right drive eighth-note power chords (palm-muted
# in the verse, open in the chorus), a picked bass with grit, a hard surf drummer (floor-tom beat, then a punk beat
# on the crash-ride), a baritone twang guitar takes the second melody. No brass.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (a tom roll under a tremolo swell, the band's hits, the pickup bar) | loop 48:
#   A 16 (the tune, tremolo-picked: palm-muted verse, then open chords) | B 16 (the twang melody: half-time, then driving,
#   doubled an octave up) | C 8 (the mine-cart break: the low riff in unison on guitars and bass, pounding toms, a
#   tremolo wail) | A' 8 (the tune harmonized in thirds, ending on the pickup bar = the intro's last bar)
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import drum_fill, harmonize, pad, shift
from studio import instruments as _I

SLOT, CANDIDATE = 'canyon-rush', 'b-surf-rock'
STYLE = ('surf-punk: tremolo-picked lead guitar with spring reverb, double-tracked overdriven rhythm guitars (palm-muted '
         'and open power chords), picked bass, hard surf drums (floor-tom beat, punk beat on the crash-ride), a baritone '
         'twang guitar on the second melody')
FORM = ['intro 4 (tom roll, tremolo swell, band hits, pickup bar)', 'A 16 the tune, tremolo-picked (palm-muted verse, open chorus)',
        'B 16 the twang melody (half-time, then driving, doubled an octave up)',
        'C 8 mine-cart break (low riff in unison, pounding toms, tremolo wail)', "A' 8 the tune in thirds, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 176, 4, 48
A0, B0, C0, A2 = 4, 20, 36, 44

PROG = {
    'intro': 'Em | Em | C B7 | Em % % % B7 % % %',
    'A': 'Em | Em | C | C | Am | Am | B7 | B7 | Em | Em | C | D | Am | B7 | Em | Em',
    'B': 'Am | D7 | G | C | F#m7b5 | B7 | Em | Em | Am | D7 | G | Cmaj7 | Am | B7 | Em | Em',
    'C': 'Em | Em | Em | Em | C | C | B7 | B7',
    "A'": 'Em | Em | C | C | Am | B7 | Em | Em % % % B7 % % %',
}
SECTIONS = [('intro', INTRO), ('A', 16), ('B', 16), ('C', 8), ("A'", 8)]

TUNE = [   # the draft's tune, pushed: the long notes land on the "and" before the bar
    "E5:4. D5:8 E5:4 G5:8 B5:8~", "B5:2. A5:8 G5:8", "A5:4. G5:8 E5:4 C5:8 E5:8~", "E5:2. r:4",
    "C5:4. B4:8 C5:4 E5:8 A5:8~", "A5:2 G5:4 F#5:4", "D#5:4 F#5:4 A5:4 B5:4", "B5:2 A5:4 F#5:4",
    "E5:4. D5:8 E5:4 G5:8 B5:8~", "B5:4. C6:8 B5:4 G5:4", "C6:4. B5:8 A5:4 G5:4", "F#5:4. G5:8 A5:4 D5:4",
    "E5:4. F#5:8 G5:4 A5:4", "B5:4 A5:4 G5:4 F#5:4", "E5:1", "r:1",
]
TUNE2 = TUNE[:4] + ["C5:4. B4:8 C5:4 E5:4", "B5:4 A5:4 G5:4 F#5:4", "E5:1"]
TWANG = [  # the second melody, on the low twang guitar (the draft's trumpet line, an octave down)
    "r:8 E4:8 A4:8 B4:8 C5:4. B4:8", "A4:4 F#4:4 r:8 D4:8 E4:8 F#4:8", "G4:4. F#4:8 G4:4 B4:4", "E4:2. r:8 E4:8",
    "A4:4. G4:8 F#4:4 E4:4", "D#4:4 F#4:4 B4:4 A4:4", "G4:2. F#4:8 E4:8", "E4:2 r:2",
    "r:8 E4:8 A4:8 B4:8 C5:4. B4:8", "C5:4 A4:4 r:8 F#4:8 G4:8 A4:8", "B4:4. A4:8 G4:4 D4:4", "E4:2. r:8 G4:8",
    "C5:4. B4:8 A4:4 G4:4", "F#4:4 A4:4 B4:4 D#4:4", "E4:2. r:4", "r:1",
]
WAIL = ["r:1", "B5:1", "r:1", "C6:1", "r:1", "C6:2 B5:2", "B5:1", "B5:4 r:2."]   # the break's tremolo wail
RIFF_C = "E2:8> E2:8' G2:8> E2:8' A2:8> E2:8' Bb2:8> B2:8>"
PICKUP = "E5:8^ r:8 r:4 B4:16 C5:16 C#5:16 D5:16 D#5:8 r:8"   # the lead's bar that ends the intro and the loop
STRUM = 0.012


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def gtr(notes, vel=1.0, detune=0.0):
    """Rhythm guitar notes from a riff line: power chords (root, fifth, octave, strummed down), palm-muted chugs
    (root and fifth, the muted sample), single notes."""
    out = []
    for n in notes:
        a = set(n.art)
        fifth = n.x.get('fifth', 7)
        if 'stac' in a:
            ps, v, art = [n.p, n.p + fifth], 0.6, {'stac'}
        elif a & {'acc', 'marc'}:
            ps, v, art = [n.p, n.p + fifth, n.p + 12] if fifth else [n.p, n.p + 12], 0.78, set()
        else:
            ps, v, art = [n.p], 0.72, set()
        for k, p in enumerate(ps):
            out.append(Note(n.t + k * STRUM, n.d, p, min(1.0, v * vel * n.x.get('v', 1.0)), art, dict(n.x, detune=detune)))
    return out


def trem(notes, step=0.25, whammy=0.22, rate=5.2, soft=0.78):
    """Tremolo picking; a held note (a beat or longer) gets a whammy-bar vibrato across its repeated picks after the
    first few."""
    out = []
    spb = 60.0 / BPM
    for n in notes:
        k = max(1, int(round(n.d / step)))
        for i in range(k):
            t = n.t + i * step
            x = dict(n.x)
            if n.d >= 1.0 and i >= 3:
                ramp = min(1.0, (i - 3) / 4.0)
                x['detune'] = whammy * ramp * math.sin(2 * math.pi * rate * (t - n.t) * spb)
            out.append(Note(t, step * 0.98, n.p, n.v * (1.0 if i % 2 == 0 else soft), n.art if i == 0 else (), x))
    return out


def sing(notes, vib=0.3):
    """A guitar's phrasing: bends up into the marked notes, vibrato on the long notes."""
    out = []
    for n in notes:
        art, x = set(n.art), dict(n.x)
        if 'bend' in art:
            art.discard('bend')
            art.add('scoop')
            x.update(scoop=2.0, scoop_t=0.16)
        if n.d >= 1.0:
            art.add('vib')
            x['vibx'] = {'depth': vib, 'rate': 5.8, 'delay': 0.16}
        out.append(n.copy(art=frozenset(art), x=x))
    return out


def compose():
    s = Song('Mesa Rush (surf rock)', 'canyon-rush', BPM, 'E minor', INTRO, LOOP, seed=37)
    P = {}
    P['lead'] = s.part('lead', 'guitar', lag_ms=0, jitter_ms=2.5, vel_jitter=0.06)
    P['lead2'] = s.part('lead2', 'guitar', lag_ms=2, jitter_ms=3, vel_jitter=0.06)
    P['twang'] = s.part('twang', 'guitar', lag_ms=0, jitter_ms=3, vel_jitter=0.05, mono=True)
    P['twang2'] = s.part('twang2', 'guitar', lag_ms=2, jitter_ms=3, vel_jitter=0.05, mono=True)
    P['gtrL'] = s.part('gtrL', 'guitar', lag_ms=0, jitter_ms=3.0, vel_jitter=0.05)
    P['gtrR'] = s.part('gtrR', 'guitar', lag_ms=2, jitter_ms=3.5, vel_jitter=0.05)
    P['bass'] = s.part('bass', 'ebass', lag_ms=1, jitter_ms=3, vel_jitter=0.05, mono=True)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.0, vel_jitter=0.05)
    P['edrums'] = s.part('edrums', 'surf_edrums', jitter_ms=1.0, vel_jitter=0.03)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def root_of(tt, lo=40):
        return lo + ((chord(tt).root - lo) % 12)

    def fifth_of(tt):
        ch = chord(tt)
        return 7 if 7 in ch.ivs else 0   # a half-diminished chord: root and octave only

    def both(ns, vel=1.0):
        P['gtrL'].add(gtr(ns, vel))
        P['gtrR'].add(gtr(ns, vel * 0.97, detune=0.05))

    def chug(bar0, nbars, open_=False, accents=(0, 3, 6), vel=1.0):
        """Eighth-note power chords on each chord's root: palm-muted with the accents open, or all open."""
        for b in range(nbars):
            tt0 = at(bar0 + b)
            ns = []
            for k in range(8):
                tt = tt0 + 0.5 * k
                r, f = root_of(tt), fifth_of(tt)
                acc = k in accents
                if open_ or acc:
                    ns.append(Note(tt, 0.45, r, 0.84 if acc else 0.66, {'acc'}, {'fifth': f}))
                else:
                    ns.append(Note(tt, 0.4, r, 0.6, {'stac'}, {'fifth': f}))
            both(ns, vel)

    def ring(bar0, nbars, vel=0.9):
        """Whole-bar power chords, let ring."""
        for b in range(nbars):
            tt = at(bar0 + b)
            both([Note(tt, 3.9, root_of(tt), 0.82, {'acc'}, {'fifth': fifth_of(tt)})], vel)

    def drive(bar0, nbars, vel=0.78):
        """The bass: driving eighths on the roots, an octave jump on the last eighth of each beat pair."""
        out = []
        for b in range(nbars):
            for k in range(8):
                tt = at(bar0 + b) + 0.5 * k
                r = 28 + ((chord(tt).bass - 28) % 12)
                p = r + (12 if k in (3, 7) and b % 2 else 0)
                out.append(Note(tt, 0.42, p, vel + (0.08 if k % 2 == 0 else 0)))
        P['bass'].add(out)

    def drums(bar, pat, n=1, vels=None):
        for k in range(n):
            for piece, g in pat.items():
                P['drums'].add(grid(g, piece, at(bar + k), vels=vels or {'y': 0.55, 'h': 0.48}))
            if 'kick' in pat:
                P['edrums'].add(grid(pat['kick'], 'kick', at(bar + k), vels={'x': 0.8, 'X': 0.9}))

    SURF = {'kick': 'x.......x..x....', 'snare': '....X.......X...', 'toml': 'y.h.y.h.y.h.y.h.', 'hhc': 'h.h.h.h.h.h.h.h.'}
    PUNK = {'kick': 'x.......x.x.....', 'snare': '....X.......X...', 'ride': 'y.h.y.h.y.h.y.h.'}
    HALF = {'kick': 'x.........x.....', 'snare': '........X.......', 'hhc': 'y.h.y.h.y.h.y.h.'}
    CART = {'kick': 'x...x...x...x...', 'snare': '....X.......X...', 'toml': 'y.hhy.hhy.hhy.hh', 'tomh': '..............y.'}

    # ---------------------------------------------------------------- intro
    P['drums'].add([n.copy(v=0.3 + 0.5 * n.t / 8.0) for n in grid('xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx', 'toml', 0)] +
                   grid('................|................|x.......x.......', 'kick', 0) +
                   grid('................|................|x...............', 'crash', 0) +
                   grid('................|................|....X.......X...', 'snare', 0))
    swell = trem([Note(0, 8.0, 64, 0.5), Note(0, 8.0, 71, 0.45), Note(0, 8.0, 76, 0.5)])
    P['lead'].add([n.copy(v=n.v * (0.45 + 0.55 * n.t / 8.0)) for n in swell])
    P['edrums'].add([Note(0, 8.0, 'rise', 0.5)])
    both(lines(["C3:4> r:4 B2:4> r:4"], at(2)))
    P['bass'].add(lines(["E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8", "E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8",
                         "C2:4> r:4 B1:4> r:4"], at(0)))
    P['lead'].add(trem(lines(["G5:4 r:4 F#5:4 r:4"], at(2))))

    def pickup(bar):
        P['lead'].add(trem(lines([PICKUP], at(bar))))
        P['bass'].add(lines(["E2:8^ r:8 r:4 B1:8 B1:8 B1:8 B1:8"], at(bar)))
        both(lines(["E2:8> r:8 r:4 r:8 B2:8> r:8 B2:8>"], at(bar)))
        drums(bar, {'kick': 'x.......x.x.x.x.', 'snare': '....x...xxxxxxxx', 'crash': 'x...............'}, vels={'x': 0.75})
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the tune
    P['lead'].add(trem(lines(TUNE, at(A0))))
    chug(A0, 8)
    chug(A0 + 8, 8, open_=True)
    drive(A0, 16)
    drums(A0, SURF, 8)
    drums(A0 + 8, PUNK, 8)
    P['drums'].add(grid('x...............', 'crash', at(A0)) + grid('x...............', 'crash', at(A0 + 8)) +
                   grid('x...............', 'crash', at(A0 + 12)) + grid('x.......xxxxxxxx', 'snare', at(A0 + 15), vels={'x': 0.7}))
    P['edrums'].add([Note(at(A0 + 8), 2, 'impact', 0.5)])

    # ---------------------------------------------------------------- B: the twang melody
    tw = sing(lines(TWANG, at(B0)))
    P['twang'].add(tw)
    P['twang2'].add(shift([n for n in tw if n.t >= at(B0 + 8)], 0, 12, vel=0.85))
    ring(B0, 8)
    chug(B0 + 8, 8, open_=True, accents=(0, 3, 6))
    P['bass'].add([Note(st, d * 0.95, 28 + ((ch.bass - 28) % 12), 0.8) for (st, d, ch) in prog['B'][:8]] +
                  [Note(st + 2.5, 1.4, 28 + ((ch.bass - 28) % 12) + 12, 0.7) for (st, d, ch) in prog['B'][:8]])
    drive(B0 + 8, 8)
    drums(B0, HALF, 8)
    drums(B0 + 8, PUNK, 8)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 8)) +
                   grid('x...............', 'crash', at(B0 + 12)) + grid('x.......xxxxxxxx', 'snare', at(B0 + 15), vels={'x': 0.7}))
    P['edrums'].add([Note(at(B0 + 7), 4.0, 'rise', 0.45), Note(at(B0 + 8), 2, 'impact', 0.5)])

    # ---------------------------------------------------------------- C: the mine-cart break
    for b in range(8):
        semis = {4: 8, 5: 8, 6: 7, 7: 7}.get(b, 0)   # the riff on E, then on C and on B (up, inside the guitar's range)
        r = shift(lines([RIFF_C], at(C0 + b)), 0, semis)
        both(r)
        P['bass'].add([Note(n.t, 0.42, n.p - 12, 0.85 if 'acc' in n.art else 0.72) for n in r])
        drums(C0 + b, CART)
    P['lead'].add(trem(lines(WAIL, at(C0))))
    P['drums'].add(grid('x...............', 'crash', at(C0)) + grid('x...............', 'crash', at(C0 + 4)) +
                   grid('x.......xxxxXxXx', 'snare', at(C0 + 7), vels={'x': 0.75}))

    # ---------------------------------------------------------------- A': the tune in thirds
    t2 = sing(lines(TUNE2, at(A2)))
    P['lead'].add(trem(t2))
    hv = harmonize(t2, allp, 2, drop2=False, key=(4, 'harmonic'))
    P['lead2'].add(trem(hv[1], soft=0.75))
    chug(A2, 7, open_=True)
    drive(A2, 7)
    drums(A2, PUNK, 7)
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    P['edrums'].add([Note(at(A2), 2, 'impact', 0.5)])
    # a drummer's fill at the end of each four-bar phrase that has none written
    for bar, style in [(A0 + 3, 'toms'), (A0 + 7, 'down'), (A0 + 11, 'toms'), (B0 + 3, 'snare'), (B0 + 7, 'toms'),
                       (B0 + 11, 'toms'), (C0 + 3, 'toms'), (A2 + 3, 'down')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import modern
    _I.RACK['surf_edrums'] = lambda: modern.DrumSynth(kick_tune=52.0, kick_decay=0.2)


_instruments()

MIX = {
    'tracks': {
        'lead': {'pan': 0.05, 'gain': -4.0, 'amp': {'drive_db': 10.0, 'tone': 2.0, 'mids': 2.0},
                 'eq': [('hp', 200), ('peak', 2600, 1.0, 1.5), ('lp', 7000)], 'sends': {'spring': -10, 'room': -16}},
        'lead2': {'pan': -0.35, 'gain': -9.0, 'amp': {'drive_db': 10.0, 'tone': 1.0, 'mids': 2.0},
                  'eq': [('hp', 200), ('lp', 6500)], 'sends': {'spring': -12}},
        'twang': {'pan': 0.1, 'gain': -4.0, 'amp': {'drive_db': 9.0, 'tone': 2.0, 'mids': 1.0},
                  'eq': [('hp', 120), ('peak', 1600, 1.0, 1.5), ('lp', 6500)], 'sends': {'spring': -9, 'delay': -16}},
        'twang2': {'pan': -0.2, 'gain': -9.0, 'amp': {'drive_db': 10.0, 'tone': 1.0, 'mids': 2.0},
                   'eq': [('hp', 250), ('lp', 6500)], 'sends': {'spring': -12}},
        'gtrL': {'bus': 'gtrs', 'pan': -0.75, 'gain': -9.0, 'amp': {'drive_db': 18.0, 'tone': -1.0, 'mids': 2.0},
                 'eq': [('hp', 90), ('peak', 380, 1.0, -2.5), ('lp', 5500), ('lp', 7000)]},
        'gtrR': {'bus': 'gtrs', 'pan': 0.75, 'gain': -9.0, 'amp': {'drive_db': 18.0, 'tone': -1.0, 'mids': 2.0},
                 'eq': [('hp', 90), ('peak', 380, 1.0, -2.5), ('lp', 5500), ('lp', 7000)]},
        'bass': {'gain': -1.0, 'eq': [('hp', 35), ('peak', 85, 1.0, 2.0), ('peak', 260, 1.0, -2.5), ('peak', 1100, 1.2, 2.5)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 4.0},
        'drums.kick': {'bus': 'drums', 'gain': 1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 3.0), ('peak', 330, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 2.5), ('peak', 900, 1.4, -2.0), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sends': {'plate': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 200), ('highshelf', 9000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 110)], 'comp': {'thr': -28, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'edrums.kick': {'bus': 'drums', 'gain': -9.0, 'eq': [('hp', 30), ('lp', 2000)]},
        'edrums.fx': {'gain': -12.0, 'width': 1.4, 'eq': [('hp', 60)]},
    },
    'buses': {
        'gtrs': {'gain': 0.0, 'comp': {'thr': -16, 'ratio': 2, 'att_ms': 20, 'rel_ms': 120}},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 110, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'spring': {'ir': '2.5s_Old Vintage', 'predelay': 0, 'hp': 350, 'lp': 6500, 'gain': -3.0},
        'room': {'ir': '0.5s_Drum Chamber', 'predelay': 4, 'hp': 300, 'lp': 8000, 'gain': -6.0},
        'plate': {'ir': '1.3s_Soft Plate', 'predelay': 15, 'hp': 400, 'lp': 9000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 4000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -15, 'ratio': 2, 'att_ms': 25, 'rel_ms': 180, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0},
}


def shorts():
    """Course-intro pieces: 6.0 s (the tune's first two bars tremolo-picked over the band, a B7 turn, a held E chord at
    4.09 s) and 2.5 s (the pickup's chromatic run into an E hit at 0.68 s)."""
    out = {}
    s = Song('Mesa Rush (surf rock) - course intro', 'canyon-rush', BPM, 'E minor', 4, 0, seed=38, tail_bars=0)
    s.about = "the tune's first two bars tremolo-picked over the band, a B7 turn, a held E chord"
    P = {}
    P['lead'] = s.part('lead', 'guitar', jitter_ms=2.5, vel_jitter=0.06)
    P['gtrL'] = s.part('gtrL', 'guitar', jitter_ms=3.0)
    P['gtrR'] = s.part('gtrR', 'guitar', lag_ms=2, jitter_ms=3.5)
    P['bass'] = s.part('bass', 'ebass', lag_ms=1, jitter_ms=3, mono=True)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.0)
    P['edrums'] = s.part('edrums', 'surf_edrums', jitter_ms=1.0)
    P['lead'].add(trem(lines([TUNE[0], TUNE[1], "D#5:4 F#5:4 A5:4 B5:4", "E5:1"], 0)))
    rh = []
    for b, r in ((0, 40), (1, 40)):
        for k in range(8):
            acc = k in (0, 3, 6)
            rh.append(Note(4 * b + 0.5 * k, 0.45 if acc else 0.4, r, 0.84 if acc else 0.6, {'acc'} if acc else {'stac'}))
    rh += lines(["B2:4.> B2:4.> B2:4>", "E2:1>"], 8)
    P['gtrL'].add(gtr(rh)); P['gtrR'].add(gtr(rh, 0.97, detune=0.05))
    P['bass'].add(lines(["E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8", "E1:8 E1:8 E1:8 E1:8 G1:8 G1:8 A1:8 A#1:8",
                         "B1:4. B1:4. B1:4", "E1:1"], 0))
    P['drums'].add(grid('x.......x..x....|x.......x..x....|x.....x.....x...|x...............', 'kick', 0) +
                   grid('....X.......X...|....X.......X...|..........x.xxXX|................', 'snare', 0, vels={'x': 0.7}) +
                   grid('y.h.y.h.y.h.y.h.|y.h.y.h.y.h.y.h.|................|................', 'toml', 0, vels={'y': 0.55, 'h': 0.48}) +
                   grid('x...............|................|x.....x.....x...|x...............', 'crash', 0))
    P['edrums'].add(grid('x.......x..x....|x.......x..x....|x.....x.....x...|x...............', 'kick', 0, vels={'x': 0.8}) +
                    [Note(12, 2, 'impact', 0.55)])
    out['intro-6s'] = (s, 6.0, 12)

    s = Song('Mesa Rush (surf rock) - course intro short', 'canyon-rush', BPM, 'E minor', 2, 0, seed=39, tail_bars=0)
    s.about = "the pickup's chromatic run on the tremolo lead over a tom fill into an E hit with the band"
    P = {}
    P['lead'] = s.part('lead', 'guitar', jitter_ms=2)
    P['gtrL'] = s.part('gtrL', 'guitar', jitter_ms=2.5)
    P['gtrR'] = s.part('gtrR', 'guitar', lag_ms=2, jitter_ms=3)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=2, mono=True)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5)
    P['edrums'] = s.part('edrums', 'surf_edrums', jitter_ms=1.0)
    P['lead'].add(trem(lines(["B4:16 C5:16 C#5:16 D5:16 D#5:4 E5:2", "r:1"], 0)))
    hit = lines(["r:2 E2:2>", "r:1"], 0)
    P['gtrL'].add(gtr(hit)); P['gtrR'].add(gtr(hit, 0.97, detune=0.05))
    P['bass'].add(lines(["B1:8 B1:8 B1:8 B1:8 E1:2>", "r:1"], 0))
    P['drums'].add(grid('xxxxxxxx........', 'tomh', 0, vels={'x': 0.6}) + grid('....xxxx........', 'toml', 0, vels={'x': 0.7}) +
                   grid('........x.......', 'crash', 0) + grid('........x.......', 'kick', 0))
    P['edrums'].add([Note(2, 1, 'kick', 0.9), Note(2, 2, 'impact', 0.6)])
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

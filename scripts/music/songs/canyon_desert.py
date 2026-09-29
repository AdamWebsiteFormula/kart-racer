# Mesa Rush, candidate A (track canyon-rush): desert rock for red-rock canyons, rope bridges and mine carts.
# A minor, 168 bpm. Two overdriven rhythm guitars double-tracked hard left and right on a galloping riff (power
# chords on the 3+3+2 accents, palm-muted chugs between them, a hammered blues lick), a picked electric bass in
# unison with the riff, a twangy lead guitar with bends and vibrato singing the hook, a tremolo-picked line in the
# mine-tunnel break, twin harmonized leads, a dark tonewheel organ, a big live kit.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (the riff alone, the band crashes in, the pickup bar) | loop 44:
#   A 8 (the riff, full band) | B 8 (the hook on the lead guitar, open power chords)
#   C 8 (the mine tunnel: half-time in D minor, floor toms, the tremolo-picked lead, organ)
#   D 8 (the riff under twin harmonized leads) | B' 8 (the hook, doubled an octave down, organ)
#   E 4 (the riff, the lift, the pickup bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import pad, shift, drum_fill, tremolo, harmonize
from studio import instruments as _I

SLOT, CANDIDATE = 'canyon-rush', 'a-desert-rock'
STYLE = ('desert rock: double-tracked overdriven rhythm guitars (power chords, palm-mutes), picked electric bass in unison '
         'with the riff, twangy lead guitar with bends and vibrato, tremolo picking, twin harmonized leads, dark tonewheel '
         'organ, big live drums')
FORM = ['intro 4 (the riff alone, the band crashes in, pickup bar)', 'A 8 the riff (full band)', 'B 8 the hook (lead guitar)',
        'C 8 the mine tunnel (half-time, D minor, tremolo-picked lead, organ)', 'D 8 the riff under twin harmonized leads',
        "B' 8 the hook doubled an octave down", "E 4 the riff, the lift, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 168, 4, 44
A0, B0, C0, D0, B2, E0 = 4, 12, 20, 28, 36, 44

PROG = {
    'intro': 'Am | Am | Am | E % % % F F# G G#',
    'A': 'Am | Am | Am | Am | Am | Am | Am | F % % G % % E %',
    'B': 'Am | F | C | G | Am | F | G | E',
    'C': 'Dm | Dm | F | C | Dm | Dm | F G | E',
    'D': 'Am | Am | Am | Am | Am | Am | Am | F % % G % % E %',
    "B'": 'Am | F | C | G | Am | F | G | E',
    'E': 'Am | Am | F % % G % % Am % | E % % % F F# G G#',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ('D', 8), ("B'", 8), ('E', 4)]

# the riff (roots on the low strings): '>' a power chord, "'" a palm-muted chug, plain a single note (the lick)
RIFF1 = "A2:8> A2:8' A2:8' C3:8> A2:8' A2:8' D3:8> A2:8'"
RIFF2 = "A2:8> A2:8' A2:8' G2:8> A2:8' C3:16 D3:16 Eb3:8 E3:8>"
LIFT_E = "F2:4.> G2:4.> E2:4>"          # the lift into the hook
LIFT_A = "F2:4.> G2:4.> A2:4>"          # the lift into the pickup bar
PICKUP = "E2:8> r:8 r:4 F2:8> F#2:8> G2:8> G#2:8>"   # a stop on E, then chromatic stabs up to A

HOOK = [
    "E5:4.!bend E5:8 D5:8 E5:8~ E5:8 C5:8",
    "A4:2. r:8 C5:8",
    "G5:4.!bend G5:8 F5:8 G5:8~ G5:8 E5:8",
    "D5:2. r:8 D5:8",
    "E5:4.!bend E5:8 D5:8 E5:8~ E5:8 A5:8~",
    "A5:2 G5:8 F5:8 E5:8 D5:8~",
    "D5:4 B4:8 D5:8 G5:4 F5:4",
    "E5:2. r:4",
]
TREM = [   # the mine tunnel, tremolo-picked
    "D5:2 E5:4 F5:4",
    "A5:2. G5:8 F5:8",
    "C5:2 D5:4 F5:4",
    "E5:1",
    "D5:2 E5:4 F5:4",
    "A5:2 C6:4 A5:4",
    "A5:4 F5:4 G5:4 B5:4",
    "B5:1",
]
TWIN = [   # the twin lead over the riff
    "E5:8 G5:8 A5:4 A5:8 G5:8 E5:4",
    "D5:8 E5:8 G5:4 E5:8 D5:8 C5:4",
    "E5:8 G5:8 A5:4 A5:8 C6:8 B5:8 A5:8",
    "G5:4. E5:8 A5:2",
    "C6:4.!bend B5:8 A5:4 G5:8 A5:8~",
    "A5:2 G5:8 E5:8 D5:8 E5:8~",
    "E5:2 r:8 E5:8 G5:8 A5:8",
    "A5:4. B5:4. E5:4",
]
STRUM = 0.012   # beats between the strings of a down-strum (about 4 ms)


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
        if 'stac' in a:
            ps, v, art = [n.p, n.p + 7], 0.6, {'stac'}
        elif a & {'acc', 'marc'}:
            ps, v, art = [n.p, n.p + 7, n.p + 12], 0.78, set()
        else:
            ps, v, art = [n.p], 0.72, set()
        for k, p in enumerate(ps):
            out.append(Note(n.t + k * STRUM, n.d, p, min(1.0, v * vel), art, dict(n.x, detune=detune)))
    return out


def bassline(notes, vel=1.0):
    """The bass in unison with a riff line, an octave down."""
    out = []
    for n in notes:
        v = 0.85 if set(n.art) & {'acc', 'marc'} else 0.72
        out.append(Note(n.t, max(0.2, n.d * 0.9), n.p - 12, min(1.0, v * vel)))
    return out


def sing(notes, vib=0.32):
    """A lead guitar's phrasing: bends (whole step, up into the note), vibrato on the long notes."""
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
    s = Song('Mesa Rush (desert rock)', 'canyon-rush', BPM, 'A minor', INTRO, LOOP, seed=41)
    P = {}
    P['gtrL'] = s.part('gtrL', 'guitar', lag_ms=0, jitter_ms=3.0, vel_jitter=0.05)
    P['gtrR'] = s.part('gtrR', 'guitar', lag_ms=2, jitter_ms=3.5, vel_jitter=0.05)
    P['lead'] = s.part('lead', 'guitar', lag_ms=0, jitter_ms=3, vel_jitter=0.05, mono=True)
    P['lead2'] = s.part('lead2', 'guitar', lag_ms=3, jitter_ms=4, vel_jitter=0.05, mono=True)
    P['trem'] = s.part('trem', 'guitar', lag_ms=0, jitter_ms=2, vel_jitter=0.06)
    P['bass'] = s.part('bass', 'ebass', lag_ms=1, jitter_ms=3, vel_jitter=0.05, mono=True)
    P['organ'] = s.part('organ', 'mesa_organ', jitter_ms=3)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.0, vel_jitter=0.05)
    P['edrums'] = s.part('edrums', 'mesa_edrums', jitter_ms=1.0, vel_jitter=0.03)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=4)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=4)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def riff(bar, text, both=True, vel=1.0, bass=True):
        ns = lines([text], at(bar))
        P['gtrL'].add(gtr(ns, vel))
        if both:
            P['gtrR'].add(gtr(ns, vel * 0.97, detune=0.05))
        if bass:
            P['bass'].add(bassline(ns))

    def drums(bar, pat, vels=None):
        for piece, g in pat.items():
            P['drums'].add(grid(g, piece, at(bar), vels=vels or {'y': 0.55, 'h': 0.5}))

    def kick2(bar, g):
        P['edrums'].add(grid(g, 'kick', at(bar), vels={'x': 0.8}))

    G1 = {'kick': 'x.....x.....x...', 'snare': '....X.......X...', 'hhc': 'y.h.y.h.y.h.y.h.'}      # under riff bar 1
    G2 = {'kick': 'x.....x.......x.', 'snare': '....X.......X...', 'hhc': 'y.h.y.h.y.h.y.h.'}      # under riff bar 2
    GL = {'kick': 'x.....x.....x...', 'snare': '....X.......X...', 'crash': '............x...', 'hhc': 'y.h.y.h.y.h.....'}
    HOOKG = {'kick': 'x.......x.x.....', 'snare': '....X.......X...', 'ride': 'y.h.y.h.y.h.y.h.'}
    TUN = {'kick': 'x.........x.....', 'snare': '........X.......', 'toml': 'h.g.h.g.h.g.h.g.', 'hhp': '....h.......h...'}

    def shake(bar, pat='xgxgxgxgxgxgxgxg'):
        """A sixteenth-note shaker over the riff (the push on each beat, the pull between)."""
        P['shaker'].add(grid(pat.replace('g', '.'), 'LShaker_Shake1D', at(bar), vels={'x': 0.5}) +
                        grid(pat.replace('x', '.').replace('g', 'x'), 'LShaker_Shake1U', at(bar), vels={'x': 0.34}))

    def riff_section(bar0, nbars, lift):
        """The riff for nbars (pairs of riff bars), the last bar the lift."""
        for b in range(nbars - 1):
            bar = bar0 + b
            riff(bar, RIFF1 if b % 2 == 0 else RIFF2)
            drums(bar, G1 if b % 2 == 0 else G2)
            kick2(bar, (G1 if b % 2 == 0 else G2)['kick'])
            shake(bar)
        bar = bar0 + nbars - 1
        riff(bar, lift)
        drums(bar, GL)
        kick2(bar, GL['kick'])
        shake(bar, 'xgxgxgxgxgxg....')

    # ---------------------------------------------------------------- intro: the riff alone, then the band
    riff(0, RIFF1, vel=0.9, bass=False)
    riff(1, RIFF2, vel=0.9, bass=False)
    P['drums'].add(grid('................|x.x.x.x.x.x.x.x.', 'hhc', 0, vels={'x': 0.45}) +
                   grid('................|............x.xx', 'snare', 0, vels={'x': 0.7}) +
                   grid('................|x...............', 'kick', 0))
    riff(2, RIFF1)
    drums(2, G1)
    kick2(2, G1['kick'])
    P['drums'].add(grid('x...............', 'crash', at(2)))
    P['edrums'].add([Note(at(1), 4.0, 'rise', 0.5)])

    def pickup(bar):
        riff(bar, PICKUP)
        P['drums'].add(grid('x.......x.x.x.x.', 'kick', at(bar)) + grid('........x.x.x.xX', 'snare', at(bar), vels={'x': 0.85}) +
                       grid('x...............', 'crash', at(bar)) + grid('....x...........', 'hhp', at(bar), vels={'x': 0.5}))
        kick2(bar, 'x.......x.x.x.x.')
        P['organ'].add(lines(["[E3 B3 E4]:8 r:8 r:4 r:2"], at(bar)))
    pickup(INTRO - 1)
    pickup(E0 + 3)
    s.twin(INTRO - 1, E0 + 3)

    # ---------------------------------------------------------------- A: the riff
    riff_section(A0, 8, LIFT_E)
    P['drums'].add(grid('x...............', 'crash', at(A0)) + grid('x...............', 'crash', at(A0 + 4)))
    # the lead answers the riff in the second half: a bent scream held over two bars, then a fall
    P['lead'].add(sing(lines(["r:2 A5:2!bend~", "A5:2. r:4"], at(A0 + 4))))
    P['organ'].add(lines(["[A3 E4 A4]:1", "[A3 E4 A4]:2. r:4"], at(A0 + 4)))

    # ---------------------------------------------------------------- B: the hook
    def hook_band(bar0, organ=True):
        for b in range(8):
            bar = bar0 + b
            tt = at(bar)
            r = 40 + ((chord(tt).root - 40) % 12)
            ns = []
            for k in range(8):
                acc = k in (0, 3, 6)
                ns.append(Note(tt + 0.5 * k, 0.45, r, 0.84 if acc else 0.68, {'acc'}))
            if b == 7:   # the last bar rings on E
                ns = [Note(tt, 3.8, r, 0.85, {'acc'})]
            P['gtrL'].add(gtr(ns))
            P['gtrR'].add(gtr(ns, 0.97, detune=0.05))
            # bass: roots in eighths, a walk into the next chord
            nb = [Note(tt + 0.5 * k, 0.42, r - 12, 0.8 if k % 2 == 0 else 0.7) for k in range(8)]
            if b == 7:
                nb = [Note(tt, 1.9, r - 12, 0.85), Note(tt + 2, 0.45, r - 12, 0.75), Note(tt + 2.5, 0.45, r - 12, 0.75),
                      Note(tt + 3, 0.45, r - 10, 0.75), Note(tt + 3.5, 0.45, r - 9, 0.8)]
            P['bass'].add(nb)
            drums(bar, HOOKG if b < 7 else {'kick': 'x.......x.x.x.x.', 'snare': '....X...x.xxXxXX', 'crash': 'x...............'})
            kick2(bar, HOOKG['kick'] if b < 7 else 'x.......x.x.x.x.')
            P['tamb'].add(grid('..x...x...x...x.' if b < 7 else '..x...x.........', 'Tamb1_Shake', tt, vels={'x': 0.5}))
        P['drums'].add(grid('x...............', 'crash', at(bar0)) + grid('x...............', 'crash', at(bar0 + 4)))
        if organ:
            P['organ'].add(pad(prog['B'] if bar0 == B0 else prog["B'"], 57, 72, n=3, vel=0.55))

    hook_band(B0)
    P['lead'].add(sing(lines(HOOK, at(B0))))
    P['edrums'].add([Note(at(B0), 2, 'impact', 0.55)])

    # ---------------------------------------------------------------- C: the mine tunnel
    for b in range(8):
        bar = C0 + b
        tt = at(bar)
        chs = [c for c in prog['C'] if tt - 1e-9 <= c[0] < tt + 4 - 1e-9]
        for (st, d, ch) in chs:
            r = 38 + ((ch.root - 38) % 12)   # roots from D2 (the low string dropped to D) up to C#3
            P['gtrL'].add(gtr([Note(st, d - 0.05, r, 0.8, {'acc'})], 0.9))
            P['gtrR'].add(gtr([Note(st, d - 0.05, r, 0.8, {'acc'})], 0.87, detune=0.05))
        if b < 6:
            drums(bar, TUN)
            kick2(bar, TUN['kick'])
    P['bass'].add(lines(["D2:4. D2:8~ D2:4 A1:8 C2:8", "D2:4. D2:8~ D2:4 F2:8 E2:8", "F1:4. F1:8~ F1:4 C2:8 E2:8",
                         "C2:4. C2:8~ C2:4 G1:8 B1:8", "D2:4. D2:8~ D2:4 A1:8 C2:8", "D2:4. D2:8~ D2:4 E2:8 F2:8",
                         "F2:4. F2:8 G2:4. G2:8", "E2:8 E2:8 E2:8 E2:8 E2:8 E2:8 E2:8 E2:8"], at(C0)))
    P['trem'].add(tremolo(lines(TREM, at(C0)), 0.25, soft=0.8))
    P['organ'].add(pad(prog['C'], 50, 65, n=3, vel=0.6))
    # the build: snare eighths, then sixteenths, getting louder, the kick on the beat
    P['drums'].add([n.copy(v=0.35 + 0.6 * (n.t - at(C0 + 6)) / 8.0)
                    for n in grid('x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx', 'snare', at(C0 + 6))])
    P['drums'].add(grid('x...x...x...x...|x...x...x...x.x.', 'kick', at(C0 + 6)) + grid('x...............', 'crash', at(C0 + 6)))
    kick2(C0 + 6, 'x...x...x...x...')
    kick2(C0 + 7, 'x...x...x...x.x.')
    P['edrums'].add([Note(at(C0 + 6), 8.0, 'rise', 0.6)])
    P['drums'].add(grid('x...............', 'crash', at(C0)))

    # ---------------------------------------------------------------- D: the riff under twin leads
    riff_section(D0, 8, LIFT_E)
    tw = sing(lines(TWIN, at(D0)))
    hv = harmonize(tw, allp, 2, drop2=False, key=(9, 'minor'))
    P['lead'].add(hv[0])
    P['lead2'].add(hv[1])
    P['drums'].add(grid('x...............', 'crash', at(D0)) + grid('x...............', 'crash', at(D0 + 4)))
    P['edrums'].add([Note(at(D0), 2, 'impact', 0.5)])

    # ---------------------------------------------------------------- B': the hook, doubled an octave down
    hook_band(B2)
    hk = sing(lines(HOOK, at(B2)))
    P['lead'].add(hk)
    P['lead2'].add(shift(hk, 0, -12, vel=0.9))
    P['edrums'].add([Note(at(B2), 2, 'impact', 0.6), Note(at(B2) - 4, 4.0, 'rise', 0.45)])

    # ---------------------------------------------------------------- E: the riff, the lift
    riff(E0, RIFF1); drums(E0, G1); kick2(E0, G1['kick'])
    riff(E0 + 1, RIFF2); drums(E0 + 1, G2); kick2(E0 + 1, G2['kick'])
    riff(E0 + 2, LIFT_A); drums(E0 + 2, GL); kick2(E0 + 2, GL['kick'])
    P['drums'].add(grid('x...............', 'crash', at(E0)))
    shake(E0); shake(E0 + 1); shake(E0 + 2, 'xgxgxgxgxgxg....')

    # a drummer's fill at the end of each four-bar phrase that has none written
    for bar, style in [(A0 + 3, 'toms'), (B0 + 3, 'snare'), (D0 + 3, 'toms'), (B2 + 3, 'down')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import synths, modern
    _I.RACK['mesa_organ'] = lambda: synths.Organ(drawbars='886400000', perc=None, click=0.12, drive_db=8.0, leslie='slow', gain_db=-8.0)
    # the course intros' sustain: a dark synth pad under the ringing guitars (the organ read as circus in a short clip)
    _I.RACK['mesa_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=1900, attack=0.04, release=0.6, voices=5, detune=10, air=0.02, tri=0.4)
    _I.get.cache_clear()
    _I.RACK['mesa_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.22)


_instruments()

MIX = {
    'tracks': {
        'gtrL': {'bus': 'gtrs', 'pan': -0.75, 'gain': -9.0, 'amp': {'drive_db': 18.0, 'tone': -1.0, 'mids': 2.0},
                 'eq': [('hp', 90), ('peak', 380, 1.0, -2.5), ('lp', 5500), ('lp', 7000)]},
        'gtrR': {'bus': 'gtrs', 'pan': 0.75, 'gain': -9.0, 'amp': {'drive_db': 18.0, 'tone': -1.0, 'mids': 2.0},
                 'eq': [('hp', 90), ('peak', 380, 1.0, -2.5), ('lp', 5500), ('lp', 7000)]},
        'lead': {'pan': 0.08, 'gain': -5.0, 'amp': {'drive_db': 15.0, 'tone': 1.0, 'mids': 3.0},
                 'eq': [('hp', 180), ('peak', 2500, 1.0, 2.0), ('lp', 9000)], 'sends': {'spring': -13, 'delay': -14}},
        'lead2': {'pan': -0.3, 'gain': -8.0, 'amp': {'drive_db': 15.0, 'tone': 0.0, 'mids': 3.0},
                  'eq': [('hp', 180), ('lp', 6000)], 'sends': {'spring': -14, 'delay': -16}},
        'trem': {'pan': 0.15, 'gain': -6.0, 'amp': {'drive_db': 12.0, 'tone': 1.0, 'mids': 2.0},
                 'eq': [('hp', 200), ('lp', 6500)], 'sends': {'spring': -9, 'delay': -14}},
        'bass': {'gain': -1.0, 'eq': [('hp', 40), ('peak', 85, 1.0, 0.0), ('peak', 260, 1.0, -2.5), ('peak', 1100, 1.2, 2.5)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 4.0},
        'organ': {'pan': 0.3, 'gain': -15.0, 'width': 1.3, 'eq': [('hp', 180), ('lp', 5500)], 'sends': {'room': -12}},
        'ipad': {'gain': -5.0, 'width': 1.4, 'eq': [('hp', 200), ('lp', 6500)], 'sends': {'room': -12}},
        # the kit bright and open (the tuned mix was dark: the overheads and the tambourine carry the top)
        'drums.kick': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 40), ('peak', 60, 1.0, 0.0), ('peak', 330, 1.2, -4.0), ('peak', 3500, 1.0, 4.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 2.0), ('peak', 900, 1.4, -2.0), ('highshelf', 6000, 0.7, 5.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sends': {'plate': -14}},
        'drums.oh': {'bus': 'drums', 'gain': 2.0, 'eq': [('hp', 300), ('highshelf', 7000, 0.7, 4.0)]},
        'drums.room': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 120)], 'comp': {'thr': -28, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'edrums.kick': {'bus': 'drums', 'gain': -14.0, 'eq': [('hp', 30), ('lp', 2000)]},
        'edrums.fx': {'gain': -12.0, 'width': 1.4, 'eq': [('hp', 60)]},
        'tamb': {'pan': 0.45, 'gain': -10.0, 'eq': [('hp', 3000)], 'sends': {'room': -12}},
        'shaker': {'pan': -0.4, 'gain': -13.0, 'eq': [('hp', 2500)]},
    },
    'buses': {
        'gtrs': {'gain': 0.0, 'comp': {'thr': -16, 'ratio': 2, 'att_ms': 20, 'rel_ms': 120}},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 110, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'spring': {'ir': '2.5s_Old Vintage', 'predelay': 0, 'hp': 400, 'lp': 6500, 'gain': -4.0},
        'room': {'ir': '0.5s_Drum Chamber', 'predelay': 4, 'hp': 300, 'lp': 8000, 'gain': -6.0},
        'plate': {'ir': '1.3s_Soft Plate', 'predelay': 15, 'hp': 400, 'lp': 9000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 4000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -15, 'ratio': 2, 'att_ms': 25, 'rel_ms': 180, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0},
}


def shorts():
    """Course-intro pieces: 6.0 s (the hook's first two bars over the band, the lift, a held A chord at 4.29 s) and
    2.5 s (the chromatic stabs up into an A hit at 0.71 s)."""
    out = {}
    s = Song('Mesa Rush (desert rock) - course intro', 'canyon-rush', BPM, 'A minor', 4, 0, seed=42, tail_bars=0)
    s.about = "the hook's first two bars on the lead guitar over the band, the F-G-E lift, a held A chord"
    P = {}
    P['gtrL'] = s.part('gtrL', 'guitar', jitter_ms=3.0)
    P['gtrR'] = s.part('gtrR', 'guitar', lag_ms=2, jitter_ms=3.5)
    P['lead'] = s.part('lead', 'guitar', jitter_ms=3, mono=True)
    P['bass'] = s.part('bass', 'ebass', lag_ms=1, jitter_ms=3, mono=True)
    P['ipad'] = s.part('ipad', 'mesa_pad', jitter_ms=2)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.0)
    P['edrums'] = s.part('edrums', 'mesa_edrums', jitter_ms=1.0)
    rhythm = []
    for b, root in ((0, 45), (1, 41)):
        for k in range(8):
            rhythm.append(Note(4 * b + 0.5 * k, 0.45, root, 0.84 if k in (0, 3, 6) else 0.68, {'acc'}))
    rhythm += lines([LIFT_E], 8) + [Note(12, 5.0, 45, 0.9, {"acc"})]
    P['gtrL'].add(gtr(rhythm)); P['gtrR'].add(gtr(rhythm, 0.97, detune=0.05))
    P['bass'].add([Note(0.5 * k, 0.42, 33, 0.8) for k in range(8)] + [Note(4 + 0.5 * k, 0.42, 29, 0.8) for k in range(8)] +
                  bassline(lines([LIFT_E], 8)) + [Note(12, 4.8, 33, 0.9)])
    P['lead'].add(sing(lines([HOOK[0], "A4:2. r:8 C5:8", "C5:4. D5:4. B4:4", "A4:1!bend"], 0)))
    P['ipad'].add(lines(["[A3 C4 E4]:1", "[A3 C4 F4]:1", "[A3 C4 F4]:4. [B3 D4 G4]:4. [B3 E4 G#4]:4", "[A3 C4 E4 A4]:1"], 0))
    P['drums'].add(grid('x.....x.....x...|x.....x.......x.|x.....x.....x...|x...............', 'kick', 0) +
                   grid('....X.......X...|....X.......X...|....X.....x.xxXX|................', 'snare', 0, vels={'x': 0.7}) +
                   grid('y.h.y.h.y.h.y.h.|y.h.y.h.y.h.y.h.|y.h.y.h.........|................', 'hhc', 0, vels={'y': 0.55, 'h': 0.45}) +
                   grid('x...............|................|................|x...............', 'crash', 0))
    P['edrums'].add(grid('x.....x.....x...|x.....x.......x.|x.....x.....x...|x...............', 'kick', 0, vels={'x': 0.8}) +
                    [Note(12, 2, 'impact', 0.6)])
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=4)
    P['tamb'].add(grid('..x...x...x...x.|..x...x...x...x.|..x...x...x.....|x...............', 'Tamb1_Shake', 0, vels={'x': 0.5}))
    out['intro-6s'] = (s, 6.0, 12)

    s = Song('Mesa Rush (desert rock) - course intro short', 'canyon-rush', BPM, 'A minor', 2, 0, seed=43, tail_bars=0)
    s.about = ("the riff's hammered blues lick over a snare and tom fill into an A power chord that rings out under a bent, "
               "singing lead note, a synth pad and a crash")
    P = {}
    P['gtrL'] = s.part('gtrL', 'guitar', jitter_ms=2.5)
    P['gtrR'] = s.part('gtrR', 'guitar', lag_ms=2, jitter_ms=3)
    P['lead'] = s.part('lead', 'guitar', jitter_ms=2, mono=True)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=2, mono=True)
    P['ipad'] = s.part('ipad', 'mesa_pad', jitter_ms=2)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5)
    P['edrums'] = s.part('edrums', 'mesa_edrums', jitter_ms=1.0)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3)
    # the lick, then the A chord held to the end of the piece (it fades there)
    st = lines(["A2:8> C3:16 D3:16 Eb3:8 E3:8 A2:2>~", "A2:1"], 0)
    P['gtrL'].add(gtr(st)); P['gtrR'].add(gtr(st, 0.97, detune=0.05))
    P['bass'].add(bassline(st))
    P['lead'].add(sing(lines(["r:2 A5:2!bend~", "A5:1"], 0)))
    P['ipad'].add([Note(2, 6.0, p, 0.6) for p in (57, 64, 69, 72)])
    P['drums'].add(grid('x.......x.......', 'kick', 0) + grid('..x.x.x.........', 'snare', 0, vels={'x': 0.7}) +
                   grid('.....x.x........', 'toml', 0, vels={'x': 0.8}) + grid('x.......x.......', 'crash', 0) +
                   grid('........x.......', 'snare', 0, vels={'x': 0.9}))
    P['edrums'].add(grid('x.......x.......', 'kick', 0, vels={'x': 0.8}) + [Note(2, 2, 'impact', 0.6)])
    P['tamb'].add(grid('........x.......', 'Tamb1_Shake', 0, vels={'x': 0.6}))
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

# Frostbite Pass, candidate A (track frostbite-pass): liquid drum and bass for the snowy mountain village and the ice
# lake. F minor, 174 bpm. A chopped live breakbeat on the multi-mic kit (two-step kick, snare on 2 and 4 with ghost
# notes, busy sixteenth hats, ride, tom fills) over a code kick and clap, a deep sine sub with a Reese an octave up,
# a tine electric piano on the chords, cold wide pads, a pluck arpeggio, high strings, and a supersaw lead on the hook.
# The hook's signature is a leap up a fifth (F to C) falling back by step, in a dotted 3-3-2 rhythm; at the end a
# flute and a lower supersaw double it. Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (pads, electric piano, the hook's call three times on the piano, a riser, the pickup bar) | loop 48:
#   A 16 (the drop: the hook twice, the second time turning to C7b9) | B 8 (the ice lake: long lead notes over a
#   rolling bass, dotted chord pushes, the ride) | C 8 (breakdown: the hook's call in half time, then the build)
#   A' 16 (the hook with everything; its last bar is the pickup bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift
from studio import instruments as _I

SLOT, CANDIDATE = 'frostbite-pass', 'a-liquid-dnb'
STYLE = ('liquid drum and bass: chopped live breakbeat (two-step kick, snare on 2 and 4 with ghosts, busy sixteenth hats, '
         'ride, tom fills) layered with a code kick and clap, sine sub and Reese bass, tine electric piano chords, icy pads, '
         'pluck arpeggio, high strings, supersaw lead doubled by flute')
FORM = ['intro 4 (pads, electric piano, the hook on the piano, riser, pickup bar)', 'A 16 the drop: the hook twice (supersaw lead)',
        'B 8 the ice lake: long lead notes over a rolling bass, ride', "C 8 breakdown: the hook's call in half time over new chords, then the build",
        "A' 16 the hook with everything (flute and low supersaw doubling, arpeggio, strings); pickup bar = the intro's last bar"]

BPM, INTRO, LOOP = 174, 4, 48
A0, B0, C0, A2 = 4, 20, 28, 36
END = INTRO + LOOP

PROG = {
    'intro': 'Fm9 | Dbmaj9 | Bbm9 | C7sus4 C7',
    'A': 'Fm9 | Fm9 | Dbmaj9 | Dbmaj9 | Bbm9 | Bbm9 | Eb6 | C7sus4 C7 | Fm9 | Fm9 | Dbmaj9 | Dbmaj9 | Bbm9 | Bbm9 | Gm7b5 | C7b9',
    'B': 'Dbmaj9 | Eb6 | Cm7 | Fm9 | Bbm9 | Eb9sus4 | Abmaj9 | Gm7b5 C7b9',
    'C': 'Dbmaj9 | Cm7 | Bbm9 | Fm9 | Dbmaj9 | Eb6 | C7sus4 | C7',
    "A'": 'Fm9 | Fm9 | Dbmaj9 | Dbmaj9 | Bbm9 | Bbm9 | Eb6 | C7sus4 C7 | Fm9 | Fm9 | Dbmaj9 | Dbmaj9 | Bbm9 | Bbm9 | Gm7b5 | C7sus4 C7',
}
SECTIONS = [('intro', INTRO), ('A', 16), ('B', 8), ('C', 8), ("A'", 16)]

HOOK = [  # a two-bar call (the leap) and answer (a turn around G), the call repeated note for note over D-flat
    "F5:8. C6:8. Ab5:8~ Ab5:4 G5:8 F5:8",
    "G5:8. Ab5:8. G5:8~ G5:4 F5:8 Eb5:8",
    "F5:8. C6:8. Ab5:8~ Ab5:4 G5:8 F5:8",
    "Eb5:8. F5:8. C5:8~ C5:2",
    "F5:8. Db6:8. C6:8~ C6:4 Bb5:8 Ab5:8",
    "Bb5:8. C6:8. Bb5:8~ Bb5:4 Ab5:8 F5:8",
    "G5:8. Bb5:8. C6:8~ C6:4 Bb5:8 G5:8",
    "Bb5:8. G5:8. F5:8 E5:2",
]
HOOK_TURN = [  # the hook's second ending: over G half-diminished and C7b9, into the ice lake
    "G5:8. Bb5:8. Db6:8~ Db6:4 C6:8 Bb5:8",
    "Ab5:8. G5:8. E5:8~ E5:2",
]
LAKE = [
    "Ab5:2. F5:8 Ab5:8", "G5:2 Bb5:4 C6:4", "Bb5:2. G5:8 Bb5:8", "Ab5:2 G5:4 F5:4",
    "Db6:4. C6:8~ C6:4 Bb5:4", "Ab5:2 Bb5:4 F5:4", "G5:4. Ab5:8~ Ab5:4 C6:4", "Bb5:4 Db6:4 C6:4 E5:4",
]
LAKE_BASS = [
    "Db2:4. Db2:8 r:8 Db2:8 Ab1:8 Db2:8", "Eb2:4. Eb2:8 r:8 Eb2:8 Bb1:8 Eb2:8", "C2:4. C2:8 r:8 C2:8 G1:8 C2:8",
    "F1:4. F1:8 r:8 F1:8 C2:8 F1:8", "Bb1:4. Bb1:8 r:8 Bb1:8 F1:8 Bb1:8", "Eb2:4. Eb2:8 r:8 Eb2:8 Bb1:8 Eb2:8",
    "Ab1:4. Ab1:8 r:8 Ab1:8 Eb2:8 Ab1:8", "G1:4. G1:8 C2:4. C2:8",
]
BREAK = ["F5:4. C6:4. Ab5:4", "G5:2. Eb5:4", "F5:4. Db6:4. C6:4", "Ab5:2. G5:4"]  # the call in half time (breakdown)
PICKUP = HOOK[7]


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


KICKS = ['x.........x.....', 'x.x.......x.....']
GHOSTS = ['.......g.g......', '.......g.......g']
HATS = ['xgxgxgxgxgxgxgxg', 'xgxgxgxgxgxgxg..']
SCALE = {5, 7, 8, 10, 0, 1, 3}  # F minor


def compose():
    s = Song('Frostbite Pass (liquid drum and bass)', 'frostbite-pass', BPM, 'F minor', INTRO, LOOP, seed=17)
    P = {}
    P['lead'] = s.part('lead', 'fa_lead', jitter_ms=1.5)
    P['lead_lo'] = s.part('lead_lo', 'fa_lead_lo', jitter_ms=1.5)
    P['flute'] = s.part('flute', 'flute_vib', lag_ms=4, jitter_ms=4, mono=True)
    P['piano'] = s.part('piano', 'piano', jitter_ms=3)
    P['ep'] = s.part('ep', 'fa_ep', jitter_ms=3)
    P['pad'] = s.part('pad', 'fa_pad', jitter_ms=2)
    P['arp'] = s.part('arp', 'fa_arp', jitter_ms=1)
    P['str'] = s.part('str', 'violins', lag_ms=10, jitter_ms=6)
    P['sub'] = s.part('sub', 'fa_sub', jitter_ms=1)
    P['reese'] = s.part('reese', 'fa_reese', jitter_ms=1)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.06)
    P['cym'] = s.part('cym', 'kit', jitter_ms=3, vel_jitter=0.08)
    P['edrums'] = s.part('edrums', 'fa_edrums', jitter_ms=1, vel_jitter=0.03)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=4, vel_jitter=0.08)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def root(tt, lo=28):
        return lo + ((chord(tt).bass - lo) % 12)

    def approach(target):
        return target - 1 if (target - 1) % 12 in SCALE else target - 2

    def liquid_bass(bar0, nbars, vel=0.85):
        """The sub's two-bar cell: long roots on the kicks (beat 1 and the and of 3), then a bounce and a step into
        the next chord (an octave pop when the chord stays)."""
        out = []
        for b in range(nbars):
            t0 = at(bar0 + b)
            r, r2 = root(t0), root(t0 + 2.5)
            if b % 2 == 0:
                out += [Note(t0, 1.9, r, vel), Note(t0 + 2.5, 1.35, r2, vel * 0.9)]
            else:
                nxt = root(t0 + 4.0) if t0 + 4.0 < at(END) else r2
                app = r2 + 12 if nxt == r2 else approach(nxt)
                out += [Note(t0, 1.35, r, vel), Note(t0 + 1.5, 0.45, r, vel * 0.7), Note(t0 + 2.5, 0.9, r2, vel * 0.9),
                        Note(t0 + 3.5, 0.45, app, vel * 0.8)]
        return out

    def arp(bar0, nbars, lo=65, hi=89, vel=0.4, pattern=(0, 2, 1, 3, 2, 4, 3, 1)):
        out = []
        for b in range(nbars):
            for k in range(16):
                tt = at(bar0 + b) + 0.25 * k
                tones = chord(tt).tones(lo, hi)
                p = tones[pattern[k % len(pattern)] % len(tones)]
                out.append(Note(tt, 0.2, p, vel * (1.0 if k % 4 == 0 else 0.78)))
        return out

    def beat(bar0, nbars, hats=True, ride=False, bell=False, shaker=False, clap=True):
        for b in range(nbars):
            t0, odd = at(bar0 + b), b % 2
            P['drums'].add(grid(KICKS[odd], 'kick', t0, vels={'x': 0.92}) + grid('....X.......X...', 'snare', t0, vels={'X': 0.95}) +
                           grid(GHOSTS[odd], 'snare2', t0, vels={'g': 0.3}))
            P['edrums'].add(grid(KICKS[odd], 'kick', t0, vels={'x': 0.85}))
            if clap:
                P['edrums'].add(grid('....x.......x...', 'clap', t0, vels={'x': 0.6}) + grid('....x.......x...', 'snare', t0, vels={'x': 0.75}))
            if hats:
                P['cym'].add(grid(HATS[odd], 'hhc', t0, vels={'x': 0.52, 'g': 0.3}))
                if odd:
                    P['cym'].add(grid('..............o.', 'hho', t0, vels={'o': 0.45}))
            if ride:
                P['cym'].add(grid('x.x.x.x.x.x.x.x.', 'ride', t0, vels={'x': 0.5}))
            if bell:
                P['cym'].add(grid('x...x...x...x...', 'bell', t0, vels={'x': 0.3}))
            if shaker:
                P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', t0, vels={'x': 0.45}) +
                                grid('.g.g.g.g.g.g.g.g', 'LShaker_Shake1U', t0, vels={'g': 0.3}))

    def fill(bar, kind):
        """The phrase's last beat (or two) as a fill: the grooves' snares, hats and claps there make way."""
        t0 = at(bar)
        span = {'snare': 1.0, 'toms': 1.0, 'rush': 2.0, 'chop': 2.0}[kind]
        a, b = t0 + 4.0 - span, t0 + 4.0
        for k in ('drums', 'cym', 'shaker'):
            P[k].notes = [n for n in P[k].notes if not (a - 1e-6 <= n.t < b - 1e-6 and n.p != 'kick')]
        P['edrums'].notes = [n for n in P['edrums'].notes if not (a - 1e-6 <= n.t < b - 1e-6 and n.p in ('clap', 'snare'))]
        if kind == 'snare':
            P['drums'].add([Note(a + 0.25 * k, 0.25, 'snare', 0.55 + 0.12 * k) for k in range(4)])
        elif kind == 'toms':
            P['drums'].add([Note(a, 0.25, 'snare', 0.8), Note(a + 0.25, 0.25, 'tomh', 0.8), Note(a + 0.5, 0.25, 'tomh', 0.75),
                            Note(a + 0.75, 0.25, 'toml', 0.9)])
        elif kind == 'rush':
            P['drums'].add([Note(a + 0.25 * k, 0.25, 'snare', 0.42 + 0.07 * k) for k in range(8)])
        elif kind == 'chop':
            P['drums'].add(grid('........X..g.xX.', 'snare', t0, vels={'X': 0.95, 'g': 0.35, 'x': 0.7}) +
                           grid('..........x....x', 'tomh', t0, vels={'x': 0.75}) + grid('...............x', 'toml', t0, vels={'x': 0.85}))

    def hit(bar, impact=True):
        P['cym'].add([Note(at(bar), 1.0, 'crash', 0.85)])
        if impact:
            P['edrums'].add([Note(at(bar), 2.0, 'impact', 0.7)])

    # ---------------------------------------------------------------- intro: pads, electric piano, the hook on the piano
    P['pad'].add([n.copy(v=n.v * (0.6 + 0.4 * n.t / 12)) for n in pad(prog['intro'][:3], 60, 79, n=4, vel=0.5)])
    P['ep'].add(comp(prog['intro'][:3], 'x-------..x-----', 55, 72, n=4, vel=0.45))
    P['piano'].add(shift(lines([HOOK[0], HOOK[2], HOOK[4]], at(0)), 0, -12, vel=0.75))
    P['sub'].add([Note(at(1), 3.8, 37, 0.5), Note(at(2), 3.8, 34, 0.6)])
    P['cym'].add([Note(at(2) + 0.25 * k, 0.25, 'hhc', (0.2 + 0.25 * k / 16) * (1.0 if k % 2 == 0 else 0.6)) for k in range(16)])
    P['edrums'].add([Note(at(1), 8.0, 'rise', 0.7)])

    def pickup(bar):
        t0 = at(bar)
        P['lead'].add(lines([PICKUP], t0))
        P['ep'].add(lines(["[C4 F4 G4 Bb4]:2 [C4 E4 G4 Bb4]:2"], t0))
        P['pad'].add(lines(["[F4 G4 Bb4 C5]:2 [E4 G4 Bb4 C5]:2"], t0))
        P['sub'].add(lines(["C2:2. r:4"], t0))
        P['reese'].add(lines(["C3:2. r:4"], t0))
        P['drums'].add(grid('x.........x.....', 'kick', t0, vels={'x': 0.92}) + grid('....X...........', 'snare', t0, vels={'X': 0.95}) +
                       [Note(t0 + 2.0 + 0.25 * k, 0.25, 'snare', 0.42 + 0.07 * k) for k in range(8)])
        P['edrums'].add(grid('x.........x.....', 'kick', t0, vels={'x': 0.85}) + grid('....x...........', 'clap', t0, vels={'x': 0.6}) +
                        grid('....x...........', 'snare', t0, vels={'x': 0.75}) + [Note(t0, 2.0, 'impact', 0.55), Note(t0 + 2.0, 2.0, 'rise', 0.6)])
        P['cym'].add([Note(t0, 1.0, 'crash', 0.75)] + grid('..xgxgxg........', 'hhc', t0, vels={'x': 0.5, 'g': 0.3}))
    pickup(INTRO - 1)
    pickup(END - 1)
    s.twin(INTRO - 1, END - 1)

    # ---------------------------------------------------------------- A: the drop, the hook twice
    P['lead'].add(lines(HOOK + HOOK[:6] + HOOK_TURN, at(A0)))
    P['ep'].add(comp(prog['A'], 'x-------..x-----', 55, 72, n=4, vel=0.55))
    P['pad'].add(pad(prog['A'], 60, 79, n=4, vel=0.45))
    sb = liquid_bass(A0, 16)
    P['sub'].add(sb)
    P['reese'].add(shift(sb, 0, 12, vel=0.7))
    beat(A0, 16)
    hit(A0)
    hit(A0 + 8, impact=False)
    fill(A0 + 7, 'snare')
    fill(A0 + 15, 'chop')

    # ---------------------------------------------------------------- B: the ice lake
    P['lead'].add(lines(LAKE, at(B0)))
    P['ep'].add(comp(prog['B'], 'x.....x...x.....', 55, 72, n=4, vel=0.5, dur=0.9))
    P['pad'].add(pad(prog['B'], 60, 79, n=4, vel=0.45))
    lb = lines(LAKE_BASS, at(B0))
    P['sub'].add(lb)
    P['reese'].add(shift(lb, 0, 12, vel=0.85))
    P['arp'].add(arp(B0, 8, lo=68, hi=89, vel=0.3))
    beat(B0, 8, hats=False, ride=True)
    for b in range(8):
        P['cym'].add(grid('....x.......x...', 'hhp', at(B0 + b), vels={'x': 0.4}))
    hit(B0)
    P['edrums'].add([Note(at(B0), 4.0, 'down', 0.6)])
    fill(B0 + 3, 'toms')
    fill(B0 + 7, 'rush')

    # ---------------------------------------------------------------- C: breakdown (the hook's call in half time), then the build
    P['lead'].add([n.copy(v=0.5) for n in lines(BREAK, at(C0))])
    P['ep'].add(comp(prog['C'][:4], 'x---------------', 55, 72, n=4, vel=0.42))
    P['pad'].add(pad(prog['C'], 60, 79, n=4, vel=0.55))
    P['str'].add(pad(prog['C'], 72, 86, n=2, vel=0.4))
    for b in range(4):
        P['sub'].add([Note(at(C0 + b), 3.8, root(at(C0 + b)), 0.6)])
    for b in range(2, 4):
        P['cym'].add(grid('x.x.x.x.x.x.x.x.', 'ride', at(C0 + b), vels={'x': 0.3}))
    # the build: the hook's second half on the lead, opening up; kick on the beat, the snare rolling faster
    P['lead'].add([n.copy(v=0.45 + 0.4 * (n.t - at(C0 + 4)) / 16) for n in lines(HOOK[4:], at(C0 + 4))])
    P['ep'].add(comp(prog['C'][4:], 'x.......x.......', 55, 72, n=4, vel=0.5))
    P['arp'].add([n.copy(v=0.15 + 0.3 * (n.t - at(C0 + 4)) / 16) for n in arp(C0 + 4, 4, lo=65, hi=86)])
    for b in range(4):
        tb = at(C0 + 4 + b)
        r = root(tb)
        step = [1.0, 1.0, 0.5, 0.5][b]
        k = int(4 / step)
        P['sub'].add([Note(tb + step * i, step * 0.85, r, 0.6 + 0.05 * b) for i in range(k if b < 3 else k - 1)])
        P['drums'].add(grid('x...x...x...x...', 'kick', tb, vels={'x': 0.75 + 0.05 * b}))
        P['edrums'].add(grid('x...x...x...x...', 'kick', tb, vels={'x': 0.7}))
        snare_step = [1.0, 0.5, 0.25, 0.25][b]
        m = int(4 / snare_step) if b < 3 else 14
        P['drums'].add([Note(tb + snare_step * i, snare_step, 'snare', 0.35 + 0.12 * b + 0.1 * i / max(1, m)) for i in range(m)])
    P['edrums'].add([Note(at(C0 + 4), 15.5, 'rise', 0.8)])

    # ---------------------------------------------------------------- A': the hook with everything
    an = lines(HOOK + HOOK[:6] + HOOK_TURN[:1], at(A2))
    P['lead'].add(an)
    P['lead_lo'].add(shift(an, 0, -12, vel=0.85))
    P['flute'].add([n.copy(v=0.6) for n in an])
    body = prog["A'"][:15]
    P['ep'].add(comp(body, 'x-------..x-----', 55, 72, n=4, vel=0.55))
    P['pad'].add(pad(body, 60, 79, n=4, vel=0.45))
    P['str'].add(pad(body, 72, 86, n=2, vel=0.35))
    P['arp'].add(arp(A2, 15, vel=0.36))
    sb = liquid_bass(A2, 15)
    P['sub'].add(sb)
    P['reese'].add(shift(sb, 0, 12, vel=0.75))
    beat(A2, 15, bell=True, shaker=True)
    hit(A2)
    hit(A2 + 8, impact=False)
    fill(A2 + 7, 'snare')
    fill(A2 + 11, 'toms')
    return s


def _instruments():
    from studio import modern, synths
    _I.RACK['fa_lead'] = lambda: modern.Supersaw(voices=7, detune=16, spread=0.6, cutoff=2400, env_amt=4500, env_decay=0.3, res=0.12,
                                                   attack=0.004, decay=0.5, sustain=0.75, release=0.2, gain_db=-11, vib=(5.0, 0.12, 0.3))
    _I.RACK['fa_lead_lo'] = lambda: modern.Supersaw(voices=5, detune=12, spread=0.8, cutoff=1800, env_amt=2500, env_decay=0.25, release=0.18, gain_db=-15)
    _I.RACK['fa_ep'] = lambda: synths.EPiano(gain_db=-3.0, release=0.35, bell=0.45, trem=(4.6, 0.25), chorus=True)
    _I.RACK['fa_pad'] = lambda: modern.Pad(gain_db=-15, cutoff=2400, attack=0.45, release=1.1, voices=5, detune=12, air=0.0, tri=0.6)
    _I.RACK['fa_arp'] = lambda: modern.Pluck(gain_db=-15, cutoff=1600, env_amt=4500, env_decay=0.07, decay=0.2, release=0.05, detune=9, res=0.1, square=0.4)
    _I.RACK['fa_sub'] = lambda: modern.SubBass(gain_db=-8, harm=0.2, release=0.05)
    _I.RACK['fa_reese'] = lambda: modern.Reese(gain_db=-12, cutoff=650, lfo=0.3, detune=12, drive=2.2, sub=0.0, release=0.06, width=0.6)
    _I.RACK['fa_edrums'] = lambda: modern.DrumSynth(kick_tune=46, kick_decay=0.24, snare_tune=210)


_instruments()

MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 220), ('peak', 2800, 1.0, 1.0)], 'sends': {'delay': -13, 'hall': -14}},
        'lead_lo': {'pan': 0.0, 'gain': -8.0, 'width': 1.3, 'eq': [('hp', 180), ('lp', 6000)], 'sends': {'hall': -14}},
        'flute': {'pan': 0.15, 'gain': -9.0, 'eq': [('hp', 300)], 'sends': {'hall': -12}},
        'piano': {'pan': -0.1, 'gain': -4.0, 'eq': [('hp', 120), ('peak', 300, 1.0, -2.0)], 'sends': {'hall': -12, 'delay': -16}},
        'ep': {'pan': -0.15, 'gain': -6.0, 'eq': [('hp', 140), ('peak', 350, 1.0, -2.0), ('highshelf', 5000, 0.7, 1.0)], 'sends': {'room': -12},
               'duck': {'by': 'edrums.kick', 'depth_db': 3.0, 'rel_ms': 150}},
        'pad': {'gain': -5.0, 'width': 1.6, 'eq': [('hp', 250), ('lp', 9000)], 'sends': {'hall': -12}, 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 200}},
        'arp': {'pan': 0.25, 'gain': -9.0, 'width': 1.5, 'eq': [('hp', 400)], 'sends': {'delay': -10}, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0}},
        'str': {'pan': 0.2, 'gain': -9.0, 'eq': [('hp', 400), ('highshelf', 7000, 0.7, 1.5)], 'sends': {'hall': -10}},
        'sub': {'gain': 0.0, 'mono': True, 'eq': [('hp', 28), ('lp', 180)], 'duck': {'by': 'edrums.kick', 'depth_db': 5.0, 'rel_ms': 110}},
        'reese': {'gain': -6.0, 'eq': [('hp', 110), ('peak', 250, 1.0, -2.0), ('lp', 4000)], 'duck': {'by': 'edrums.kick', 'depth_db': 5.0, 'rel_ms': 110}},
        'drums.kick': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 2.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 2.0), ('peak', 900, 1.5, -2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 5, 'rel_ms': 90}, 'sends': {'room': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -10.0, 'eq': [('hp', 150)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'cym.oh': {'bus': 'drums', 'gain': -5.0, 'eq': [('hp', 500), ('highshelf', 9000, 0.7, 2.0)]},
        'cym.room': {'bus': 'drums', 'gain': -14.0, 'eq': [('hp', 500)]},
        'cym.kick': {'gain': -60.0},
        'cym.snare': {'gain': -60.0},
        'edrums.kick': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 30), ('peak', 55, 1.0, 1.5), ('lp', 3000)]},
        'edrums.snare': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 400)]},
        'edrums.hats': {'bus': 'drums', 'gain': -14.0},
        'edrums.fx': {'gain': -10.0, 'width': 1.5, 'sends': {'hall': -10}},
        'shaker': {'pan': 0.4, 'gain': -15.0, 'eq': [('hp', 2500)]},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 100, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -6.0},
        'hall': {'ir': '2.3s_Nice Plate', 'predelay': 25, 'hp': 450, 'lp': 10000, 'gain': -5.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0,
               'target': [-14.0, -6.5, -7.5, -9.5, -10.0, -10.5, -11.5, -15.0, -19.5]},
}


def shorts():
    """Course-intro pieces: 6.0 s (the hook's leap over the breakbeat, the pickup run, a held F minor 9 landing at
    4.14 s with a crash and an impact) and 2.5 s (a tom fill and the hook's leap into an F minor 9 hit at 0.69 s)."""
    out = {}
    s = Song('Frostbite Pass (liquid drum and bass) - course intro', 'frostbite-pass', BPM, 'F minor', 5, 0, seed=18, tail_bars=0)
    s.about = "the hook's leap on the supersaw over the breakbeat, the pickup run over C7, a held F minor 9 with a crash and an impact"
    P = {k: s.part(k, i, jitter_ms=1.5) for k, i in (('lead', 'fa_lead'), ('pad', 'fa_pad'), ('ep', 'fa_ep'), ('sub', 'fa_sub'),
                                                     ('reese', 'fa_reese'), ('edrums', 'fa_edrums'), ('arp', 'fa_arp'))}
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    P['cym'] = s.part('cym', 'kit', jitter_ms=2)
    pr = chords('Fm9 | Dbmaj9 | C7sus4 C7 | Fm9', 0)
    pr[-1] = (pr[-1][0], 8.0, pr[-1][2])  # the last chord holds through the fade
    P['lead'].add(lines([HOOK[0], HOOK[2], PICKUP, "F5:1~", "F5:1"], 0))
    P['pad'].add(pad(pr, 60, 79, n=4, vel=0.5))
    P['ep'].add(comp(pr[:4], 'x-------..x-----', 55, 72, n=4, vel=0.5) + [Note(12, 7.5, p, 0.55) for p in (63, 67, 68, 72)])
    P['sub'].add(lines(["F1:2 r:8 F1:4.", "Db2:2 r:8 Db2:4.", "C2:2. r:4", "F1:1~", "F1:1"], 0))
    P['reese'].add(lines(["F2:2 r:8 F2:4.", "Db3:2 r:8 Db3:4.", "C3:2. r:4", "F2:1~", "F2:1"], 0))
    for k in range(32):
        tones = [c for c in pr if c[0] - 1e-9 <= 0.25 * k + 0.01 < c[0] + c[1]][0][2].tones(65, 86)
        P['arp'].add(Note(0.25 * k, 0.2, tones[(0, 2, 1, 3, 2, 4, 3, 1)[k % 8] % len(tones)], 0.25 + 0.15 * k / 32))
    for b in range(2):
        P['drums'].add(grid(KICKS[b], 'kick', 4 * b, vels={'x': 0.92}) + grid('....X.......X...', 'snare', 4 * b, vels={'X': 0.95}) +
                       grid(GHOSTS[b], 'snare2', 4 * b, vels={'g': 0.3}))
        P['edrums'].add(grid(KICKS[b], 'kick', 4 * b, vels={'x': 0.85}) + grid('....x.......x...', 'clap', 4 * b, vels={'x': 0.6}))
        P['cym'].add(grid(HATS[b], 'hhc', 4 * b, vels={'x': 0.52, 'g': 0.3}))
    P['drums'].add(grid('x.........x.....', 'kick', 8, vels={'x': 0.92}) + grid('....X...........', 'snare', 8, vels={'X': 0.95}) +
                   [Note(10.0 + 0.25 * k, 0.25, 'snare', 0.42 + 0.07 * k) for k in range(8)] + [Note(12, 1, 'kick', 1.0)])
    P['edrums'].add([Note(8, 1, 'kick', 0.85), Note(10, 2.0, 'rise', 0.6), Note(12, 2.0, 'impact', 0.9), Note(12, 1, 'kick', 1.0)])
    P['cym'].add([Note(0, 1, 'crash', 0.8), Note(12, 1, 'crash', 0.9)])
    out['intro-6s'] = (s, 6.0, 12)

    s = Song('Frostbite Pass (liquid drum and bass) - course intro short', 'frostbite-pass', BPM, 'F minor', 2, 0, seed=19, tail_bars=0)
    s.about = "a breakbeat tom fill and a riser, the hook's leap (F up to C) on the supersaw landing on an F minor 9 hit with a crash and an impact"
    P = {k: s.part(k, i, jitter_ms=1.5) for k, i in (('lead', 'fa_lead'), ('pad', 'fa_pad'), ('ep', 'fa_ep'), ('sub', 'fa_sub'),
                                                     ('reese', 'fa_reese'), ('edrums', 'fa_edrums'))}
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    P['cym'] = s.part('cym', 'kit', jitter_ms=2)
    P['lead'].add(lines(["r:4 r:8 F5:8 C6:2~", "C6:1"], 0))
    P['pad'].add(lines(["r:2 [Ab4 C5 Eb5 G5]:2", "[Ab4 C5 Eb5 G5]:1"], 0))
    P['ep'].add(lines(["r:2 [Eb4 G4 Ab4 C5]:2", "[Eb4 G4 Ab4 C5]:1"], 0))
    P['sub'].add(lines(["r:2 F1:2", "F1:1"], 0))
    P['reese'].add(lines(["r:2 F2:2", "F2:1"], 0))
    P['drums'].add([Note(0, 0.25, 'kick', 0.9), Note(0.5, 0.25, 'snare', 0.7), Note(0.75, 0.25, 'snare2', 0.35), Note(1.0, 0.25, 'snare', 0.8),
                    Note(1.25, 0.25, 'tomh', 0.7), Note(1.5, 0.25, 'tomh', 0.75), Note(1.75, 0.25, 'toml', 0.85), Note(2, 1, 'kick', 1.0)])
    P['edrums'].add([Note(0, 2.0, 'rise', 0.6), Note(2, 2.0, 'impact', 0.9), Note(2, 1, 'kick', 1.0)])
    P['cym'].add([Note(2, 1, 'crash', 0.9)])
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

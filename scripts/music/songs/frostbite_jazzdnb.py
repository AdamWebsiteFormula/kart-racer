# Frostbite Pass, candidate B (track frostbite-pass): jazz-funk over drum and bass, the Frostbite Pass tune (flute and
# harmon-muted trumpet in unison, A-flat major) re-set at 172 bpm for the snowy village and the ice lake. A chopped live
# breakbeat on the multi-mic kit (two-step kick, snare on 2 and 4 with ghost notes, sixteenth hats, jazz ride, tom
# fills) over a code kick and clap, a sine sub with a Reese an octave up, a tine electric piano comping the jazz chords
# in a syncopated funk rhythm, icy pads, a pluck arpeggio. The trumpet's break over F minor rides a Reese riff; the
# breakdown plays the tune's opening in half time on the flute alone. Every note is written by hand here.
#
# Form (bars): intro 4 (electric piano, pads, the flute's teaser, a riser, the pickup bar) | loop 48:
#   A 8 | A' 8 (the tune twice, the second ending home) | B 8 (the bridge: long flute notes over the ride)
#   C 8 (the trumpet's break over F minor, a Reese riff, chopped breaks) | D 8 (breakdown: the tune in half time on the
#   flute, then the build) | A'' 8 (the tune with everything, ending on the pickup bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift
from studio import instruments as _I

SLOT, CANDIDATE = 'frostbite-pass', 'b-jazz-dnb'
STYLE = ('jazz-funk drum and bass: flute and harmon-muted trumpet melody, tine electric piano comping jazz chords, chopped live '
         'breakbeat with ghost notes and jazz ride, code kick and clap, sine sub and Reese bass, icy pads, pluck arpeggio')
FORM = ["intro 4 (electric piano, pads, flute teaser, riser, pickup bar)", 'A 8 the tune (flute and harmon trumpet)',
        "A' 8 the tune, home cadence (ride)", 'B 8 bridge: long flute notes over the ride', 'C 8 harmon trumpet break over F minor, Reese riff, chopped breaks',
        'D 8 breakdown: the tune in half time on the flute, then the build', "A'' 8 the tune with everything; pickup bar = the intro's last bar"]

BPM, INTRO, LOOP = 172, 4, 48
A0, A1, B0, C0, D0, A2 = 4, 12, 20, 28, 36, 44
END = INTRO + LOOP

PROG = {
    'intro': 'Abmaj9 | Dbmaj9 | Abmaj9 | Ab69 Eb13',
    'A': 'Abmaj9 | Fm9 | Bbm9 | Eb13 | Abmaj9 | Dbmaj9 | Gm7b5 C7b9 | Fm9 Bb13',
    "A'": 'Abmaj9 | Fm9 | Bbm9 | Eb13 | Cm7 | F7b9 | Bbm9 Eb13 | Ab69',
    'B': 'Dbmaj9 | Dbm6 | Cm9 | F7#5 | Bbm9 | Eb13 | Abmaj9 | Gm7b5 C7b9',
    'C': 'Fm9 | Bb13 | Fm9 | Bb13 | Dbmaj9 | C7#9 | Fm9 | Bb13 Eb13',
    'D': 'Abmaj9 | Abmaj9 | Fm9 | Fm9 | Bbm9 | Bbm9 | Eb13 | Eb13',
    "A''": 'Abmaj9 | Fm9 | Bbm9 | Eb13 | Cm7 | F7b9 | Bbm9 Eb13 | Ab69 Eb13',
}
SECTIONS = [('intro', INTRO), ('A', 8), ("A'", 8), ('B', 8), ('C', 8), ('D', 8), ("A''", 8)]

TUNE_A = [
    "r:8 C5:8 Eb5:8 G5:8~ G5:4 F5:8 Eb5:8",
    "G5:4. Ab5:8 G5:4 F5:4",
    "r:8 Db5:8 F5:8 Ab5:8~ Ab5:4 G5:8 F5:8",
    "C5:2. r:8 Bb4:8",
    "C5:8 Eb5:8 G5:8 Bb5:8~ Bb5:4 Ab5:8 G5:8",
    "F5:4. Eb5:8 C5:4 Ab4:4",
    "Bb4:8 Db5:8 F5:8 G5:8 E5:8 Db5:8 Bb4:8 G4:8",
    "Ab4:4. G4:8 r:8 F4:8 G4:8 Ab4:8",
]
TUNE_A2_END = [
    "Eb5:8 G5:8 Bb5:8 C6:8~ C6:4 Bb5:8 G5:8",
    "A5:4. Gb5:8 Eb5:4 C5:4",
    "Db5:8 F5:8 Ab5:8 C6:8 Bb5:8 G5:8 F5:8 Eb5:8",
    "Ab5:2. r:4",
]
TUNE_B = [
    "F5:2 Eb5:4 C5:4", "E5:2. r:8 Bb4:8", "Eb5:2 D5:4 Bb4:4", "C#5:2. r:8 A4:8",
    "Db5:4. F5:8 Ab5:4 C6:4", "Bb5:2 G5:4 Db5:4", "C5:2. Bb4:4", "Db5:2 Db5:4 E5:4",
]
SOLO_C = [
    "r:8 C5:8 Eb5:8 F5:8 Ab5:8 G5:8 F5:8 Eb5:8", "D5:4 F5:8 G5:8~ G5:4 r:4",
    "r:8 Ab5:8 G5:8 F5:8 Eb5:8 C5:8 Ab4:8 C5:8", "D5:2. r:4",
    "r:8 F5:8 Ab5:8 Bb5:8 Ab5:8 F5:8 Eb5:8 Db5:8", "E5:4 G5:4 Bb5:4 Eb5:4",
    "Ab5:2. G5:4", "F5:8 D5:8 Bb4:8 G4:8 C5:8 Db5:8 D5:8 Eb5:8",
]
RIFF_C = [
    "F1:8. F1:16 r:8 C2:8 F2:8 Eb2:8 C2:8 Ab1:8", "Bb1:8. Bb1:16 r:8 F2:8 Ab2:8 F2:8 D2:8 B1:8",
    "F1:8. F1:16 r:8 C2:8 F2:8 Eb2:8 C2:8 Ab1:8", "Bb1:8. Bb1:16 r:8 F2:8 Ab2:8 F2:8 D2:8 B1:8",
    "Db2:8. Db2:16 r:8 Ab2:8 F2:8 Db2:8 C2:8 Db2:8", "C2:8. C2:16 r:8 G2:8 E2:8 C2:8 Bb1:8 G1:8",
    "F1:8. F1:16 r:8 C2:8 F2:8 Eb2:8 C2:8 Ab1:8", "Bb1:8. Bb1:16 r:8 F2:8 Eb2:4 Eb2:8 E2:8",
]
HALF = [  # the tune's opening in half time for the breakdown (the G over B-flat minor kept short)
    "r:4 C5:4 Eb5:4 G5:4~", "G5:2 F5:4 Eb5:4", "G5:2. Ab5:4", "G5:2 F5:2",
    "r:4 Db5:4 F5:4 Ab5:4~", "Ab5:2 G5:8 F5:8~ F5:4", "C5:1~", "C5:2 r:4 Bb4:4",
]
PICKUP = "Ab5:4^ r:4 r:8 G4:8 Ab4:8 Bb4:8"


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def augment(notes, src, dst):
    """The same line in half time: every onset and length doubled, from beat `src` to beat `dst`."""
    return [n.copy(t=dst + 2 * (n.t - src), d=2 * n.d) for n in notes]


KICKS = ['x.........x.....', 'x.........x.x...']
GHOSTS = ['......g..g....g.', '.......g.g......']
HATS = ['xgxgxgxgxgxgxgxg', 'xgxgxgxgxgxgxg..']
CHOP_K = ['x.x.......x.....', 'x.x.......xx....']
CHOP_S = ['....X.......X...', '....X........X..']
CHOP_G = ['.......g.g.....g', '.......g.g....g.']
SCALE = {8, 10, 0, 1, 3, 5, 7}  # A-flat major


def compose():
    s = Song('Frostbite Pass (jazz-funk drum and bass)', 'frostbite-pass', BPM, 'A-flat major', INTRO, LOOP, seed=23)
    P = {}
    P['flute'] = s.part('flute', 'flute_vib', lag_ms=3, jitter_ms=4, mono=True)
    P['tpt'] = s.part('tpt', 'trumpet_harmon', lag_ms=4, jitter_ms=4, mono=True)
    P['ep'] = s.part('ep', 'fb_ep', lag_ms=2, jitter_ms=3, swing=0.53, swing_unit=0.25)
    P['pad'] = s.part('pad', 'fb_pad', jitter_ms=2)
    P['arp'] = s.part('arp', 'fb_arp', jitter_ms=1)
    P['sub'] = s.part('sub', 'fb_sub', jitter_ms=1)
    P['reese'] = s.part('reese', 'fb_reese', jitter_ms=1)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.06, swing=0.53, swing_unit=0.25)
    P['cym'] = s.part('cym', 'kit', jitter_ms=3, vel_jitter=0.08, swing=0.53, swing_unit=0.25)
    P['edrums'] = s.part('edrums', 'fb_edrums', jitter_ms=1, vel_jitter=0.03)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=4, vel_jitter=0.08, swing=0.53, swing_unit=0.25)

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

    def melody(notes, flute_up=True, flute=True, tpt=True, fv=1.0, tv=1.0):
        """Flute and harmon trumpet in unison; the trumpet drops an octave above A5, the flute doubles an octave up
        where the line sits low."""
        if flute:
            P['flute'].add([n.copy(p=n.p + 12 if (flute_up and n.p < 70) else n.p, v=n.v * fv) for n in notes])
        if tpt:
            P['tpt'].add([n.copy(p=n.p - 12 if n.p > 81 else n.p, v=n.v * tv) for n in notes])

    def bass(bar0, nbars, vel=0.85):
        """The sub's two-bar cell on the kicks (beat 1 and the and of 3), a bounce, and a step into the next chord (an
        octave pop when the chord stays); a chord arriving mid-bar is met on beat 3."""
        out = []
        for b in range(nbars):
            t0 = at(bar0 + b)
            r = root(t0)
            two = root(t0 + 2.0) != r
            r2 = root(t0 + 2.0)
            t2 = t0 + (2.0 if two else 2.5)
            nxt = root(t0 + 4.0) if t0 + 4.0 < at(END) else r2
            if b % 2 == 0 and not two:
                out += [Note(t0, 1.9, r, vel), Note(t2, 1.35, r2, vel * 0.9)]
            else:
                app = r2 + 12 if nxt == r2 else approach(nxt)
                out += [Note(t0, 1.35, r, vel), Note(t0 + 1.5, 0.4, r + 12 if not two else r, vel * 0.7),
                        Note(t2, 3.4 - (t2 - t0), r2, vel * 0.9), Note(t0 + 3.5, 0.45, app, vel * 0.8)]
        return out

    def arp(bar0, nbars, lo=68, hi=89, vel=0.3, pattern=(0, 2, 1, 3, 2, 4, 3, 1)):
        out = []
        for b in range(nbars):
            for k in range(16):
                tt = at(bar0 + b) + 0.25 * k
                tones = chord(tt).tones(lo, hi)
                out.append(Note(tt, 0.2, tones[pattern[k % len(pattern)] % len(tones)], vel * (1.0 if k % 4 == 0 else 0.78)))
        return out

    def beat(bar0, nbars, hats=True, ride=False, bell=False, shaker=False, chop=False):
        for b in range(nbars):
            t0, odd = at(bar0 + b), b % 2
            K = (CHOP_K if chop else KICKS)[odd]
            P['drums'].add(grid(K, 'kick', t0, vels={'x': 0.92}) + grid((CHOP_S[odd] if chop else '....X.......X...'), 'snare', t0, vels={'X': 0.95}) +
                           grid((CHOP_G if chop else GHOSTS)[odd], 'snare2', t0, vels={'g': 0.3}))
            P['edrums'].add(grid(K, 'kick', t0, vels={'x': 0.85}) + grid((CHOP_S[odd] if chop else '....X.......X...').replace('X', 'x'), 'clap', t0, vels={'x': 0.6}))
            if hats:
                P['cym'].add(grid(HATS[odd], 'hhc', t0, vels={'x': 0.52, 'g': 0.3}))
                if odd:
                    P['cym'].add(grid('..............o.', 'hho', t0, vels={'o': 0.45}))
            if ride:
                P['cym'].add(grid('x.xxx.xxx.xxx.xx', 'ride', t0, vels={'x': 0.45}) + grid('....x.......x...', 'hhp', t0, vels={'x': 0.4}))
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
        P['edrums'].notes = [n for n in P['edrums'].notes if not (a - 1e-6 <= n.t < b - 1e-6 and n.p == 'clap')]
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

    def ep_comp(bar0, nbars, pat, vel=0.55, dur=0.4):
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['ep'].add(comp(pr, pat, 56, 74, n=4, vel=vel, dur=dur, t0=at(bar0), t1=at(bar0 + nbars)))

    def pads(bar0, nbars, vel=0.45, lo=62, hi=81):
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['pad'].add(pad(pr, lo, hi, n=4, vel=vel))

    FUNK = 'x..x..x...x..x..'

    # ---------------------------------------------------------------- intro: electric piano, pads, the flute's teaser
    ep_comp(0, 3, 'x.....x...x.....', vel=0.42, dur=0.9)
    P['pad'].add([n.copy(v=n.v * (0.6 + 0.4 * n.t / 12)) for n in pad(prog['intro'][:3], 62, 81, n=4, vel=0.5)])
    P['flute'].add([n.copy(v=0.5) for n in lines(HALF[:2], at(1))])
    P['arp'].add([n.copy(v=0.1 + 0.2 * n.t / 12) for n in arp(0, 3)])
    P['sub'].add([Note(at(1), 3.8, root(at(1)), 0.5), Note(at(2), 3.8, root(at(2)), 0.6)])
    P['cym'].add([Note(at(2) + 0.25 * k, 0.25, 'hhc', (0.2 + 0.25 * k / 16) * (1.0 if k % 2 == 0 else 0.6)) for k in range(16)])
    P['edrums'].add([Note(at(1), 8.0, 'rise', 0.7)])

    def pickup(bar):
        t0 = at(bar)
        melody(lines([PICKUP], t0), flute_up=False)
        P['ep'].add(lines(["[C4 Eb4 F4 Bb4]:8^ r:8 r:4 [Db4 G4 C5]:4 [Db4 G4 C5]:8 r:8"], t0))
        P['pad'].add(lines(["[C4 Eb4 F4 Bb4]:2 [Db4 G4 Bb4 C5]:2"], t0))
        P['sub'].add(lines(["Ab1:4^ r:4 Eb2:4. G1:8"], t0))
        P['reese'].add(lines(["Ab2:4^ r:4 Eb3:4. G2:8"], t0))
        P['drums'].add(grid('x.........x.....', 'kick', t0, vels={'x': 0.92}) + grid('....X...........', 'snare', t0, vels={'X': 0.95}) +
                       [Note(t0 + 2.0 + 0.25 * k, 0.25, 'snare', 0.42 + 0.07 * k) for k in range(8)])
        P['edrums'].add(grid('x.........x.....', 'kick', t0, vels={'x': 0.85}) + grid('....x...........', 'clap', t0, vels={'x': 0.6}) +
                        [Note(t0, 2.0, 'impact', 0.55), Note(t0 + 2.0, 2.0, 'rise', 0.6)])
        P['cym'].add([Note(t0, 1.0, 'crash', 0.75)] + grid('..xgxgxg........', 'hhc', t0, vels={'x': 0.5, 'g': 0.3}))
    pickup(INTRO - 1)
    pickup(END - 1)
    s.twin(INTRO - 1, END - 1)

    # ---------------------------------------------------------------- A and A': the tune twice
    melody(lines(TUNE_A, at(A0)))
    melody(lines(TUNE_A[:4] + TUNE_A2_END, at(A1)))
    for bar0 in (A0, A1):
        sb = bass(bar0, 8)
        P['sub'].add(sb)
        P['reese'].add(shift(sb, 0, 12, vel=0.65))
        ep_comp(bar0, 8, FUNK)
        pads(bar0, 8)
    beat(A0, 8)
    beat(A1, 8, hats=False, ride=True)
    hit(A0)
    hit(A1, impact=False)
    fill(A0 + 3, 'snare')
    fill(A0 + 7, 'toms')
    fill(A1 + 7, 'rush')

    # ---------------------------------------------------------------- B: the bridge
    tb = lines(TUNE_B, at(B0))
    P['flute'].add([n.copy(p=n.p + 12) if n.p < 70 else n for n in tb])
    sb = bass(B0, 8)
    P['sub'].add(sb)
    P['reese'].add(shift(sb, 0, 12, vel=0.7))
    ep_comp(B0, 8, 'x.......x.....x.', vel=0.5, dur=0.9)
    pads(B0, 8, vel=0.55)
    P['arp'].add(arp(B0, 8, vel=0.28))
    beat(B0, 8, hats=False, ride=True)
    hit(B0)
    P['edrums'].add([Note(at(B0), 4.0, 'down', 0.6)])
    fill(B0 + 3, 'toms')
    fill(B0 + 7, 'chop')

    # ---------------------------------------------------------------- C: the trumpet's break over F minor
    P['tpt'].add(lines(SOLO_C, at(C0)))
    rc = lines(RIFF_C, at(C0))
    P['sub'].add(rc)
    P['reese'].add(shift(rc, 0, 12, vel=0.9))
    ep_comp(C0, 8, 'x..x..x.x..x..x.', vel=0.55)
    pads(C0, 8, vel=0.4)
    beat(C0, 8, chop=True)
    hit(C0)
    hit(C0 + 4, impact=False)
    fill(C0 + 3, 'chop')
    fill(C0 + 7, 'snare')

    # ---------------------------------------------------------------- D: breakdown (the tune in half time), then the build
    half = lines(HALF, at(D0))
    P['flute'].add([n.copy(v=0.62) for n in half])
    P['tpt'].add([n.copy(v=0.55) for n in half if n.t >= at(D0 + 4)])
    ep_comp(D0, 4, 'x---------------', vel=0.45, dur=None)
    ep_comp(D0 + 4, 4, 'x.......x.......', vel=0.5, dur=None)
    pads(D0, 8, vel=0.55)
    for b in range(4):
        P['sub'].add([Note(at(D0 + b), 3.8, root(at(D0 + b)), 0.6)])
    for b in range(2, 4):
        P['cym'].add(grid('x.x.x.x.x.x.x.x.', 'ride', at(D0 + b), vels={'x': 0.3}))
    P['arp'].add([n.copy(v=0.12 + 0.25 * (n.t - at(D0 + 4)) / 16) for n in arp(D0 + 4, 4)])
    for b in range(4):
        tb_ = at(D0 + 4 + b)
        r = root(tb_)
        step = [1.0, 1.0, 0.5, 0.5][b]
        k = int(4 / step)
        P['sub'].add([Note(tb_ + step * i, step * 0.85, r, 0.6 + 0.05 * b) for i in range(k if b < 3 else k - 1)])
        P['drums'].add(grid('x...x...x...x...', 'kick', tb_, vels={'x': 0.75 + 0.05 * b}))
        P['edrums'].add(grid('x...x...x...x...', 'kick', tb_, vels={'x': 0.7}))
        sn = [1.0, 0.5, 0.25, 0.25][b]
        m = int(4 / sn) if b < 3 else 14
        P['drums'].add([Note(tb_ + sn * i, sn, 'snare', 0.35 + 0.12 * b + 0.1 * i / max(1, m)) for i in range(m)])
    P['edrums'].add([Note(at(D0 + 4), 15.5, 'rise', 0.75)])

    # ---------------------------------------------------------------- A'': the tune with everything
    melody(lines(TUNE_A[:4] + TUNE_A2_END[:3], at(A2)))
    sb = bass(A2, 7)
    P['sub'].add(sb)
    P['reese'].add(shift(sb, 0, 12, vel=0.7))
    ep_comp(A2, 7, FUNK, vel=0.58)
    pads(A2, 7, vel=0.5)
    P['arp'].add(arp(A2, 7, vel=0.3))
    beat(A2, 7, bell=True, shaker=True)
    hit(A2)
    hit(A2 + 4, impact=False)
    fill(A2 + 3, 'snare')
    return s


def _instruments():
    from studio import modern, synths
    _I.RACK['fb_ep'] = lambda: synths.EPiano(gain_db=-3.0, release=0.3, bell=0.55, trem=(4.8, 0.3), chorus=True)
    _I.RACK['fb_pad'] = lambda: modern.Pad(gain_db=-15, cutoff=3200, attack=0.5, release=1.2, voices=5, detune=14, air=0.04, tri=0.55)
    _I.RACK['fb_arp'] = lambda: modern.Pluck(gain_db=-15, cutoff=1700, env_amt=4500, env_decay=0.06, decay=0.18, release=0.05, detune=9, res=0.1, square=0.4)
    _I.RACK['fb_sub'] = lambda: modern.SubBass(gain_db=-8, harm=0.2, release=0.05)
    _I.RACK['fb_reese'] = lambda: modern.Reese(gain_db=-12, cutoff=650, lfo=0.3, detune=12, drive=2.2, sub=0.0, release=0.06, width=0.6)
    _I.RACK['fb_edrums'] = lambda: modern.DrumSynth(kick_tune=46, kick_decay=0.24, snare_tune=210)


_instruments()

MIX = {
    'tracks': {
        'flute': {'pan': -0.1, 'gain': 0.0, 'eq': [('hp', 250), ('peak', 3000, 1.0, 1.0), ('highshelf', 9000, 0.7, 1.5)], 'sends': {'hall': -12, 'room': -14}},
        'tpt': {'pan': 0.12, 'gain': -1.0, 'eq': [('hp', 250), ('peak', 2000, 1.0, 1.0)], 'sends': {'hall': -12, 'room': -12}},
        'ep': {'pan': -0.15, 'gain': -8.0, 'eq': [('hp', 140), ('peak', 350, 1.0, -2.0), ('highshelf', 5000, 0.7, 1.0)], 'sends': {'room': -12},
               'duck': {'by': 'edrums.kick', 'depth_db': 3.0, 'rel_ms': 150}},
        'pad': {'gain': -6.0, 'width': 1.6, 'eq': [('hp', 250), ('lp', 9000)], 'sends': {'hall': -12}, 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 200}},
        'arp': {'pan': 0.25, 'gain': -10.0, 'width': 1.5, 'eq': [('hp', 400)], 'sends': {'delay': -10}, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0}},
        'sub': {'gain': -3.0, 'mono': True, 'eq': [('hp', 28), ('lp', 180)], 'duck': {'by': 'edrums.kick', 'depth_db': 5.0, 'rel_ms': 110}},
        'reese': {'gain': -7.0, 'eq': [('hp', 110), ('peak', 250, 1.0, -2.0), ('lp', 4000)], 'duck': {'by': 'edrums.kick', 'depth_db': 5.0, 'rel_ms': 110}},
        'drums.kick': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 2.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 2.0), ('peak', 900, 1.5, -2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 5, 'rel_ms': 90}, 'sends': {'room': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -3.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -10.0, 'eq': [('hp', 150)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'cym.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 500), ('highshelf', 9000, 0.7, 2.0)]},
        'cym.room': {'bus': 'drums', 'gain': -14.0, 'eq': [('hp', 500)]},
        'cym.kick': {'gain': -60.0},
        'cym.snare': {'gain': -60.0},
        'edrums.kick': {'bus': 'drums', 'gain': -7.0, 'eq': [('hp', 30), ('peak', 55, 1.0, 1.5), ('lp', 3000)]},
        'edrums.snare': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 400)]},
        'edrums.hats': {'bus': 'drums', 'gain': -14.0},
        'edrums.fx': {'gain': -12.0, 'width': 1.5, 'sends': {'hall': -10}},
        'shaker': {'pan': 0.4, 'gain': -14.0, 'eq': [('hp', 2500)]},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 100, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '0.7s_Small Studio', 'predelay': 6, 'hp': 350, 'lp': 9000, 'gain': -4.0},
        'hall': {'ir': '2.3s_Nice Plate', 'predelay': 25, 'hp': 450, 'lp': 10000, 'gain': -5.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0,
               'target': [-14.0, -6.5, -7.5, -9.5, -10.0, -10.5, -11.5, -15.0, -19.5]},
}


def shorts():
    """Course-intro pieces: 6.0 s (the tune's first two bars and a ii-V run on flute and harmon trumpet over the
    breakbeat, a held A-flat 6/9 landing at 4.19 s with a crash and an impact) and 2.5 s (a pentatonic run into the
    A-flat 6/9 hit at 0.70 s)."""
    out = {}
    s = Song('Frostbite Pass (jazz-funk drum and bass) - course intro', 'frostbite-pass', BPM, 'A-flat major', 5, 0, seed=24, tail_bars=0)
    s.about = "flute and harmon trumpet on the tune's first two bars and a ii-V run over the breakbeat, a held A-flat 6/9 with a crash and an impact"
    P = {}
    P['flute'] = s.part('flute', 'flute_vib', lag_ms=3, jitter_ms=4, mono=True)
    P['tpt'] = s.part('tpt', 'trumpet_harmon', lag_ms=4, jitter_ms=4, mono=True)
    for k, i in (('ep', 'fb_ep'), ('pad', 'fb_pad'), ('sub', 'fb_sub'), ('reese', 'fb_reese'), ('edrums', 'fb_edrums'), ('arp', 'fb_arp')):
        P[k] = s.part(k, i, jitter_ms=1.5)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2, swing=0.53, swing_unit=0.25)
    P['cym'] = s.part('cym', 'kit', jitter_ms=2, swing=0.53, swing_unit=0.25)
    pr = chords('Abmaj9 | Fm9 | Bbm9 Eb13 | Ab69', 0)
    pr[-1] = (pr[-1][0], 8.0, pr[-1][2])
    mel = lines([TUNE_A[0], TUNE_A[1], "Db5:8 F5:8 Ab5:8 C6:8 Bb5:8 G5:8 F5:8 Eb5:8", "Ab5:1~", "Ab5:1"], 0)
    P['flute'].add([n.copy(p=n.p + 12) if n.p < 70 else n for n in mel])
    P['tpt'].add([n.copy(p=n.p - 12) if n.p > 81 else n for n in mel])
    P['ep'].add(comp(pr[:4], 'x..x..x...x..x..', 56, 74, n=4, vel=0.55, dur=0.4, t0=0, t1=12) + [Note(12, 7.5, p, 0.55) for p in (60, 63, 65, 70)])
    P['pad'].add(pad(pr, 62, 81, n=4, vel=0.5))
    P['sub'].add(lines(["Ab1:2 r:8 Ab1:4.", "F1:2 r:8 F1:4.", "Bb1:2 Eb2:2", "Ab1:1~", "Ab1:1"], 0))
    P['reese'].add(lines(["Ab2:2 r:8 Ab2:4.", "F2:2 r:8 F2:4.", "Bb2:2 Eb3:2", "Ab2:1~", "Ab2:1"], 0))
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

    s = Song('Frostbite Pass (jazz-funk drum and bass) - course intro short', 'frostbite-pass', BPM, 'A-flat major', 2, 0, seed=25, tail_bars=0)
    s.about = 'flute and harmon trumpet run up the A-flat pentatonic over a snare roll into an A-flat 6/9 hit with a crash and an impact'
    P = {}
    P['flute'] = s.part('flute', 'flute_vib', lag_ms=3, jitter_ms=3, mono=True)
    P['tpt'] = s.part('tpt', 'trumpet_harmon', lag_ms=4, jitter_ms=3, mono=True)
    for k, i in (('ep', 'fb_ep'), ('pad', 'fb_pad'), ('sub', 'fb_sub'), ('reese', 'fb_reese'), ('edrums', 'fb_edrums')):
        P[k] = s.part(k, i, jitter_ms=1.5)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    P['cym'] = s.part('cym', 'kit', jitter_ms=2)
    mel = lines(["Bb4:8 C5:8 Eb5:8 F5:8 Ab5:2~", "Ab5:1"], 0)
    P['flute'].add(mel)
    P['tpt'].add(mel)
    P['ep'].add(lines(["r:2 [C4 Eb4 F4 Bb4]:2", "r:1"], 0) + [Note(2, 5.5, p, 0.55) for p in (60, 63, 65, 70)])
    P['pad'].add([Note(2, 5.5, p, 0.5) for p in (63, 65, 70, 72)])
    P['sub'].add(lines(["r:2 Ab1:2~", "Ab1:1"], 0))
    P['reese'].add(lines(["r:2 Ab2:2~", "Ab2:1"], 0))
    P['drums'].add([Note(0.25 * k, 0.25, 'snare', 0.45 + 0.06 * k) for k in range(8)] + [Note(2, 1, 'kick', 1.0)])
    P['edrums'].add([Note(0, 2.0, 'rise', 0.6), Note(2, 2.0, 'impact', 0.9), Note(2, 1, 'kick', 1.0)])
    P['cym'].add([Note(2, 1, 'crash', 0.9)])
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

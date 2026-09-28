# Windmill Run (track meadow-run): bluegrass-funk for rolling farmland and windmills. D major, 166 bpm.
# A fiddle tune on top of banjo rolls and an upright bass's two-beat, a funk drummer under it, guitar chops on
# the backbeat; in the middle a syncopated funk section in G with a small horn section, clarinet and xylophone
# answering the fiddle, a cowbell; then the banjo and fiddle trade licks before the tune comes home.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (banjo roll alone, then the band and the fiddle's pickup) | loop 48:
#   A 16 (the fiddle tune: 8 low, 8 high) | B 16 (funk in G: unison riff, horn stabs, fiddle slides; then the
#   relative minor back to D) | C 8 (banjo and fiddle trade two-bar licks) | A' 8 (the tune's high half, full band
#   with the horns doubling, ending on the pickup bar that also ends the intro)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import drum_fill, harmonize, comp, pad, shift
from studio.theory import Chord

STYLE = 'bluegrass-funk: fiddle lead, banjo rolls, upright bass, guitar chops, funk drums, small horn section, clarinet, xylophone, cowbell'
FORM = ['intro 4 (banjo roll, band enters, fiddle pickup)', 'A 16 fiddle tune (low 8, high 8)', 'B 16 funk section in G then Bm-G-A-D',
        'C 8 banjo/fiddle trading licks', "A' 8 tune's high half with horns, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 166, 4, 48
A0, B0, C0, A2 = 4, 20, 36, 44

PROG = {
    'intro': 'D | D | G A | D A7',
    'A': 'D | G | D | A | D | G | D A | D | D | G | D | Bm | G | A | D A | D',
    'B': 'G7 | G7 | C9 | C9 | G7 | G7 | D7 | D7 | Em7 | A7 | F#m7 | Bm7 | G | A | D | A7',
    'C': 'D | D | G | G | D | D | A | A7',
    "A'": 'D | G | D | Bm | G | A | D A | D A7',
}

TUNE_LOW = [
    "A4:8 D5:8 F#5:4 E5:8 D5:8 B4:8 D5:8~",
    "D5:4 B4:8 G4:8 A4:8 B4:8 D5:8 E5:8",
    "F#5:8 A5:8 F#5:4 E5:8 D5:8 E5:8 F#5:8~",
    "F#5:4 E5:8 C#5:8 A4:8 B4:8 C#5:8 E5:8",
    "A4:8 D5:8 F#5:4 E5:8 D5:8 B4:8 D5:8~",
    "D5:4 B4:8 G4:8 B4:8 D5:8 G5:8 B5:8",
    "A5:8 F#5:8 D5:8 F#5:8 E5:8 C#5:8 A4:8 C#5:8",
    "D5:4 D5:8 D5:8 D5:4 r:8 A4:8",
]
TUNE_HIGH = [
    "F#5:8 A5:8 D6:4 C#6:8 A5:8 B5:8 A5:8~",
    "A5:4 G5:8 F#5:8 E5:8 D5:8 B4:8 D5:8",
    "F#5:8 A5:8 D6:4 C#6:8 A5:8 F#5:8 A5:8~",
    "A5:4 F#5:8 D5:8 B4:8 C#5:8 D5:8 F#5:8",
    "G5:8 F#5:8 E5:8 D5:8 B4:8 D5:8 G5:8 B5:8",
    "A5:8 G5:8 F#5:8 E5:8 C#5:8 E5:8 A5:8 C#6:8",
    "D6:8 A5:8 F#5:8 D5:8 E5:8 C#5:8 A4:8 C#5:8",
    "D5:4 A4:4 D5:4 r:4",
]
PICKUP_FIDDLE = "D5:4^ r:4 r:8 D4:16 E4:16 F#4:16 G4:16 G#4:8"   # the bar that ends the intro and the loop

# B: fiddle slides over the funk section
FIDDLE_B = [
    "B4:4!scoop D5:8 E5:8~ E5:4 D5:8 B4:8", "G4:4 r:4 r:8 G5:8 F5:8 D5:8",
    "E5:4!scoop G5:8 A5:8~ A5:4 G5:8 E5:8", "C5:4 r:4 r:8 C6:8 Bb5:8 G5:8",
    "B5:4!scoop A5:8 G5:8~ G5:4 E5:8 D5:8", "E5:8 D5:8 B4:8 G4:8 A4:8 B4:8 D5:8 F5:8",
    "F#5:2!vib A5:4. G5:8", "F#5:8 E5:8 D5:8 C5:8 A4:4 r:4",
    "G5:4. F#5:8 E5:8 D5:8 B4:8 G4:8", "A4:8 C#5:8 E5:8 G5:8~ G5:4 E5:4",
    "A5:4. G#5:8 F#5:8 E5:8 C#5:8 A4:8", "B4:8 D5:8 F#5:8 A5:8~ A5:2",
    "B5:8 A5:8 G5:8 D5:8 B4:8 D5:8 G5:8 B5:8", "C#6:4 A5:4 E5:4 C#5:4",
    "D5:8 F#5:8 A5:8 D6:8~ D6:4 A5:4", "C#6:8 B5:8 A5:8 G5:8 E5:8 C#5:8 A4:8 G4:8",
]
RIFF_G = "G2:8 G2:16 A2:16 B2:8 D3:8 E3:16 D3:16 B2:8 A2:8 G2:8"   # the funk riff, bass octave
CLAR_B = [  # clarinet answers in the rests of the fiddle
    "r:1", "r:2 D5:8 E5:8 G5:8 r:8", "r:1", "r:2 G5:8 A5:8 C6:8 r:8",
    "r:1", "r:1", "r:2 A5:8 B5:8 A5:8 F#5:8", "r:1",
]
LICKS = [  # C: banjo two-bar lick, fiddle answers
    ('banjo', "A4:16 B4:16 A4:16 F#4:16 D4:8 F#4:8 A4:8 D5:8 B4:8 A4:8", "F#4:8 A4:8 D5:4 r:2"),
    ('fiddle', "D6:8 B5:8 A5:8 F#5:8 G5:8 E5:8 D5:8 B4:8", "A4:8 B4:8 D5:4 r:2"),
    ('banjo', "D4:8 F#4:8 A4:8 D5:8 E5:8 D5:8 B4:8 A4:8", "G4:8 E4:8 C#4:8 E4:8 A4:4 r:4"),
    ('fiddle', "E5:8 G5:8 B5:8 C#6:8 D6:8 C#6:8 B5:8 A5:8", "G5:8 E5:8 C#5:8 A4:8 r:2"),
]

# banjo chord shapes for rolls: (first string, second, third, fourth), the fifth-string drone is A4
SHAPES = {
    'D': (66, 62, 57, 50), 'G': (67, 62, 59, 55), 'A': (64, 61, 57, 52), 'A7': (67, 64, 61, 57), 'Bm': (66, 62, 59, 54),
    'Em7': (67, 64, 59, 52), 'A7b': (67, 61, 57, 52), 'F#m7': (64, 61, 57, 54), 'Bm7': (66, 62, 57, 54), 'G7': (65, 62, 59, 55),
    'C9': (64, 62, 58, 55), 'D7': (66, 60, 57, 50), 'Em': (67, 64, 59, 52),
}
DRONE = 69
ROLLS = {  # 8 eighths per bar; 1-4 are strings (1 highest), 5 the drone
    'forward': [3, 2, 1, 5, 2, 1, 3, 1],
    'fwdrev': [3, 2, 1, 5, 1, 2, 3, 1],
    'alt': [4, 2, 1, 5, 3, 2, 1, 5],
}


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def roll(prog, bar0, nbars, pattern='forward', vel=0.62, accent=0.12):
    out = []
    pat = ROLLS[pattern]
    for b in range(nbars):
        for k in range(8):
            t = at(bar0 + b) + 0.5 * k
            ch = [c for c in prog if c[0] - 1e-9 <= t < c[0] + c[1] - 1e-9][0][2]
            shape = SHAPES.get(ch.sym, SHAPES.get(ch.sym.rstrip('7'), (66, 62, 57, 50)))
            s = pat[k]
            p = DRONE if s == 5 else shape[s - 1]
            v = vel + (accent if k in (0, 3, 6) else 0.0)
            out.append(Note(t, 0.9, p, v))
    return out


def compose():
    s = Song('Windmill Run', 'meadow-run', BPM, 'D major', INTRO, LOOP, seed=23)
    P = {}
    P['fiddle'] = s.part('fiddle', 'fiddle', lag_ms=3, jitter_ms=5, mono=True, swing=0.53)
    P['banjo'] = s.part('banjo', 'banjo', lag_ms=-2, jitter_ms=4, vel_jitter=0.07, swing=0.53)
    P['bass'] = s.part('bass', 'upright', lag_ms=0, jitter_ms=4, swing=0.53)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=4, swing=0.53)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.5, vel_jitter=0.06, swing=0.53)
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=5, jitter_ms=5, mono=True, swing=0.53)
    P['tpt2'] = s.part('tpt2', 'trumpet', lag_ms=6, jitter_ms=6, mono=True, swing=0.53)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=7, jitter_ms=6, mono=True, swing=0.53)
    P['clar'] = s.part('clar', 'clarinet', lag_ms=4, jitter_ms=5, mono=True, swing=0.53)
    P['xylo'] = s.part('xylo', 'xylo', lag_ms=2, jitter_ms=3, swing=0.53)
    P['cowbell'] = s.part('cowbell', 'cowbell', jitter_ms=4, swing=0.53)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=5, swing=0.53)
    P['piano'] = s.part('piano', 'piano', lag_ms=2, jitter_ms=5, swing=0.53)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 16), ('B', 16), ('C', 8), ("A'", 8)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    # ---------------------------------------------------------------- intro: the banjo alone, then the band
    P['banjo'].add(roll(allp, 0, 3, 'forward'))
    # the pickup bar (intro's last bar = the loop's last bar)
    def pickup(bar):
        P['fiddle'].add(lines([PICKUP_FIDDLE], at(bar)))
        P['banjo'].add(lines(["[D4 F#4 A4 D5]:4^ r:4 r:2"], at(bar)))
        P['bass'].add(lines(["D2:4^ r:4 A1:4 C#2:4"], at(bar)))
        P['gtr'].add(lines(["[D4 F#4 A4]:8' r:8 r:4 r:2"], at(bar)))
        P['tpt1'].add(lines(["F#5:8^ r:8 r:4 r:4 r:8 C#5:8^"], at(bar)))
        P['tpt2'].add(lines(["D5:8^ r:8 r:4 r:4 r:8 G4:8^"], at(bar)))
        P['tbn'].add(lines(["A3:8^ r:8 r:4 r:4 r:8 E3:8^"], at(bar)))
        P['drums'].add(grid('x.......x.......', 'kick', at(bar)) + grid('....x...xxx.xxxx', 'snare', at(bar), vels={'x': 0.7}) +
                       grid('x...............', 'crash', at(bar)) + grid('........x.x.x.x.', 'hhc', at(bar), vels={'x': 0.5}))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)
    # intro bar 2: bass and drums come in under the banjo
    P['bass'].add(lines(["G1:4 r:4 A1:4 r:4"], at(2)))
    P['drums'].add(grid('x.......x.......', 'kick', at(2)) + grid('....x.......x.xx', 'snare', at(2), vels={'x': 0.6}) +
                   grid('x.x.x.x.x.x.x.x.', 'hhc', at(2), vels={'x': 0.5}))
    P['fiddle'].add(lines(["r:2 r:8 D5:8 E5:8 F#5:8"], at(2)))

    # ---------------------------------------------------------------- A: the fiddle tune
    tune = lines(TUNE_LOW, at(A0)) + lines(TUNE_HIGH, at(A0 + 8))
    P['fiddle'].add(tune)
    P['banjo'].add(roll(allp, A0, 16, 'forward'))
    # xylophone joins the high half, an octave over the fiddle's long notes only
    P['xylo'].add([n.copy(p=n.p + 12 if n.p < 84 else n.p, v=0.55, d=0.3) for n in lines(TUNE_HIGH, at(A0 + 8)) if n.d >= 0.9])

    # bass: the two-beat (root and fifth), a walk into each new chord
    def two_beat(bar0, nbars, pr):
        out = []
        for b in range(nbars):
            t0 = at(bar0 + b)
            ch = [c for c in pr if c[0] - 1e-9 <= t0 + 0.01 < c[0] + c[1] - 1e-9][0][2]
            ch2 = [c for c in pr if c[0] - 1e-9 <= t0 + 2.01 < c[0] + c[1] - 1e-9][0][2]
            r1 = 38 + ((ch.root - 38) % 12)
            if r1 > 45:
                r1 -= 12
            r2 = 38 + ((ch2.root - 38) % 12)
            if r2 > 45:
                r2 -= 12
            fifth = r1 + 7 if ch2 is ch else r2
            if fifth > 50:
                fifth -= 12
            out += [Note(t0, 0.9, r1, 0.8), Note(t0 + 2, 0.9, fifth, 0.72)]
            # a walk-up on beat 4 into the next bar's root when it changes
            nxt = [c for c in pr if c[0] - 1e-9 <= t0 + 4.01 < c[0] + c[1] - 1e-9]
            if nxt and nxt[0][2].root != ch2.root and b % 2 == 1:
                tgt = 38 + ((nxt[0][2].root - 38) % 12)
                if tgt > 45:
                    tgt -= 12
                out += [Note(t0 + 3, 0.45, tgt - 2, 0.6), Note(t0 + 3.5, 0.45, tgt - 1, 0.62)]
        return out
    P['bass'].add(two_beat(A0, 16, allp))
    # guitar chops on 2 and 4
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(allp, '....x.......x...', 55, 67, n=3, vel=0.6, dur=0.18, t0=at(A0), t1=at(A0 + 16))])
    # drums: a train beat (snare eighths, accents on 2 and 4) with a funk kick
    for b in range(16):
        bar = A0 + b
        P['drums'].add(grid('x......xx.......', 'kick', at(bar)) + grid('ggggXgggggggXggg', 'snare', at(bar), vels={'g': 0.28, 'X': 0.95}) +
                       grid('x.x.x.x.x.x.x.x.', 'hhc', at(bar), vels={'x': 0.45}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.45}))
    P['drums'].add(grid('x...............', 'crash', at(A0)) + grid('x...............', 'crash', at(A0 + 8)))
    P['drums'].add(grid('x.......x...xxxx', 'snare', at(A0 + 15), vels={'x': 0.7}))

    # ---------------------------------------------------------------- B: funk in G, then Bm-G-A-D
    P['fiddle'].add(lines(FIDDLE_B, at(B0)))
    for b in range(8):
        semis = {0: 0, 1: 0, 2: 5, 3: 5, 4: 0, 5: 0, 6: 7, 7: 7}[b]
        r = shift(lines([RIFF_G], at(B0 + b)), 0, semis)
        P['bass'].add(r)
        P['banjo'].add([n.copy(p=n.p + 12, v=0.6, art=n.art | {'stac'}) for n in r])
    P['clar'].add(lines(CLAR_B, at(B0)))
    # horn stabs on the upbeats in B's first half
    stab_prog = prog['B'][:8]
    stabs = comp(stab_prog, '..X.....x.X.....', 60, 74, n=3, vel=0.75, dur=0.22)
    by_t = {}
    for n in stabs:
        by_t.setdefault(round(n.t, 3), []).append(n)
    for tt, ns in by_t.items():
        ns.sort(key=lambda n: -n.p)
        P['tpt1'].add(ns[0].copy(art=frozenset({'marc'})))
        P['tpt2'].add(ns[1].copy(art=frozenset({'marc'})))
        P['tbn'].add(ns[2].copy(p=ns[2].p - 12, art=frozenset({'marc'})))
    P['cowbell'].add(sum([grid('x.x.x.xxx.x.x.x.', 'Cowbell1_Normal', at(B0 + b), vels={'x': 0.5}) for b in range(8)], []))
    # the second half: bass walks, banjo rolls again, horns pad, piano fills
    P['bass'].add(two_beat(B0 + 8, 8, allp))
    P['banjo'].add(roll(allp, B0 + 8, 8, 'fwdrev', vel=0.58))
    P['tpt1'].add(pad(prog['B'][8:], 67, 76, n=1, vel=0.45))
    P['tbn'].add(pad(prog['B'][8:], 52, 60, n=1, vel=0.5))
    P['piano'].add(comp(prog['B'][8:], '..x...x...x...x.', 60, 74, n=3, vel=0.55, dur=0.35))
    for b in range(8):
        P['drums'].add(grid('x..x..x...x..x..', 'kick', at(B0 + b)) + grid('....X..g.g..X..g', 'snare', at(B0 + b), vels={'g': 0.3}) +
                       grid('xgxgxgxgxgxgxgxg', 'hhc', at(B0 + b), vels={'x': 0.65, 'g': 0.4}))
    for b in range(8, 16):
        P['drums'].add(grid('x......xx.......', 'kick', at(B0 + b)) + grid('....X.......X...', 'snare', at(B0 + b)) +
                       grid('x.x.x.x.x.x.x.x.', 'ride', at(B0 + b), vels={'x': 0.55}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(B0 + b), vels={'x': 0.4}))
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 8)) +
                   grid('x.......xxxxxxxx', 'snare', at(B0 + 15), vels={'x': 0.65}))
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(allp, '..x..x.x..x..x.x', 62, 74, n=3, vel=0.55, dur=0.12, t0=at(B0), t1=at(B0 + 8))])
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(allp, '....x.......x...', 55, 67, n=3, vel=0.6, dur=0.18, t0=at(B0 + 8), t1=at(B0 + 16))])

    # ---------------------------------------------------------------- C: banjo and fiddle trade licks
    for k, (who, l1, l2) in enumerate(LICKS):
        P[who].add(lines([l1, l2], at(C0 + 2 * k)))
        if who == 'fiddle':
            P['banjo'].add(roll(allp, C0 + 2 * k, 2, 'alt', vel=0.42))
    P['bass'].add(two_beat(C0, 8, allp))
    for b in range(8):
        P['drums'].add(grid('x.....x.x.......', 'kick', at(C0 + b)) + grid('....x.......x...', 'rim', at(C0 + b), vels={'x': 0.7}) +
                       grid('x.x.x.x.x.x.x.x.', 'hhc', at(C0 + b), vels={'x': 0.5}))
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(allp, '....x.......x...', 55, 67, n=3, vel=0.55, dur=0.18, t0=at(C0), t1=at(C0 + 8))])
    P['drums'].add(grid('x...............', 'crash', at(C0)) + grid('x.......xxxxXxXx', 'snare', at(C0 + 7), vels={'x': 0.7}))

    # ---------------------------------------------------------------- A': the high half with the horns
    hi = lines(TUNE_HIGH[:7], at(A2))
    P['fiddle'].add(hi)
    hv = harmonize([n for n in hi], allp, 3, drop2=False, key=(2, 'major'))
    P['tpt1'].add(shift(hv[0], 0, -12))
    P['tpt2'].add(shift(hv[1], 0, -12))
    P['tbn'].add(shift(hv[2], 0, -12))
    P['xylo'].add([n.copy(p=n.p + 12 if n.p < 84 else n.p, v=0.55, d=0.3) for n in hi if n.d >= 0.9])
    P['banjo'].add(roll(allp, A2, 7, 'forward'))
    P['bass'].add(two_beat(A2, 7, allp))
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(allp, '....x.......x...', 55, 67, n=3, vel=0.6, dur=0.18, t0=at(A2), t1=at(A2 + 7))])
    for b in range(7):
        P['drums'].add(grid('x..x..x.x..x....', 'kick', at(A2 + b)) + grid('ggggXgggggggXggg', 'snare', at(A2 + b), vels={'g': 0.3, 'X': 1.0}) +
                       grid('x.x.x.x.x.x.x.x.', 'hhc', at(A2 + b), vels={'x': 0.5}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(A2 + b), vels={'x': 0.45}))
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    # a drummer's fill at the end of each four-bar phrase that has none written
    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (A0 + 11, 'flams'), (B0 + 3, 'down'), (B0 + 11, 'snare'), (A2 + 3, 'toms')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def shorts():
    """Course-intro pieces from the fiddle tune: 6.0 s (three bars of the tune over banjo rolls, a D chord at 4.3 s,
    held) and 2.5 s (a banjo roll and a fiddle run up into a D chord at 1.4 s)."""
    out = {}
    s = Song('Windmill Run - course intro', 'meadow-run', BPM, 'D major', 4, 0, seed=24, tail_bars=0)
    s.about = "the fiddle tune's first bars over banjo rolls and the train beat, landing on a held D chord"
    P = {}
    P['fiddle'] = s.part('fiddle', 'fiddle', lag_ms=3, jitter_ms=5, mono=True, swing=0.53)
    P['banjo'] = s.part('banjo', 'banjo', lag_ms=-2, jitter_ms=4, vel_jitter=0.07, swing=0.53)
    P['bass'] = s.part('bass', 'upright', jitter_ms=4, swing=0.53)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=4, swing=0.53)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.5, vel_jitter=0.06, swing=0.53)
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=5, jitter_ms=5, mono=True)
    P['tpt2'] = s.part('tpt2', 'trumpet', lag_ms=6, jitter_ms=6, mono=True)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=7, jitter_ms=6, mono=True)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=5, swing=0.53)
    pr = chords('D | G | D A | D', 0)
    P['fiddle'].add(lines([TUNE_LOW[0], TUNE_LOW[1], TUNE_LOW[6], "[A4 D5]:2^ r:2"], 0))
    P['banjo'].add(roll(pr, 0, 3, 'forward') + [Note(12 + 0.06 * k, 1.5, p, 0.7) for k, p in enumerate([50, 57, 62, 66, 69])])
    P['bass'].add(lines(["D2:4 r:4 A1:4 r:4", "G1:4 r:4 D2:4 r:4", "D2:4 r:4 A1:4 C#2:4", "D2:2^ r:2"], 0))
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(pr[:4], '....x.......x...', 55, 67, n=3, vel=0.6, dur=0.18, t0=0, t1=12)])
    P['gtr'].add(lines(["r:1", "r:1", "r:1", "[D3 A3 D4 F#4]:2"], 0))
    P['tpt1'].add(lines(["r:1", "r:1", "r:1", "F#5:2^"], 0)); P['tpt2'].add(lines(["r:1", "r:1", "r:1", "D5:2^"], 0))
    P['tbn'].add(lines(["r:1", "r:1", "r:1", "A3:2^"], 0))
    for b in range(3):
        P['drums'].add(grid('x......xx.......', 'kick', 4 * b) + grid('ggggXgggggggXggg', 'snare', 4 * b, vels={'g': 0.28, 'X': 0.95}) +
                       grid('x.x.x.x.x.x.x.x.', 'hhc', 4 * b, vels={'x': 0.45}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', 4 * b, vels={'x': 0.45}))
    P['drums'].add(grid('x...............', 'crash', 0) + grid('x...............', 'kick', 12) + grid('x...............', 'crash', 12))
    out['intro-6s'] = (s, 6.0, 12)

    s = Song('Windmill Run - course intro short', 'meadow-run', BPM, 'D major', 2, 0, seed=25, tail_bars=0)
    s.about = 'a banjo roll, the fiddle running up the scale, a D chord hit'
    P = {}
    P['fiddle'] = s.part('fiddle', 'fiddle', lag_ms=3, jitter_ms=4, mono=True)
    P['banjo'] = s.part('banjo', 'banjo', lag_ms=-2, jitter_ms=4, vel_jitter=0.07)
    P['bass'] = s.part('bass', 'upright', jitter_ms=4)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3)
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=5, jitter_ms=5, mono=True)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=7, jitter_ms=6, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', jitter_ms=3)
    pr = chords('D | D', 0)
    P['banjo'].add(roll(pr, 0, 1, 'forward') + [Note(4 + 0.05 * k, 1.5, p, 0.72) for k, p in enumerate([50, 57, 62, 66, 69])])
    P['fiddle'].add(lines(["r:2 A4:16 B4:16 C#5:16 D5:16 E5:16 F#5:16 G5:16 G#5:16", "[A5 D6]:2^ r:2"], 0))
    P['bass'].add(lines(["D2:4 r:4 A1:4 C#2:4", "D2:2^ r:2"], 0))
    P['tpt1'].add(lines(["r:1", "F#5:2^"], 0)); P['tbn'].add(lines(["r:1", "D4:2^"], 0))
    P['gtr'].add(lines(["r:1", "[D3 A3 D4 F#4]:2"], 0))
    P['drums'].add(grid('x.......x.......|x...............', 'kick', 0) + grid('........xxxxxxxx|................', 'snare', 0, vels={'x': 0.6}) +
                   grid('................|x...............', 'crash', 0))
    out['intro-2s'] = (s, 2.5, 4)
    return out


MIX = {
    'tracks': {
        'fiddle': {'pan': 0.05, 'gain': -1.0, 'eq': [('hp', 180), ('peak', 2800, 1.0, 1.5), ('highshelf', 9000, 0.7, 1.0)], 'sends': {'hall': -13, 'room': -12}},
        'banjo': {'pan': -0.3, 'gain': -6.0, 'eq': [('hp', 150), ('peak', 250, 1.0, -2.0), ('peak', 3000, 1.0, 2.0)], 'sends': {'room': -12}},
        'bass': {'gain': 0.0, 'eq': [('hp', 35), ('peak', 100, 1.0, 2.5), ('peak', 700, 1.0, 1.5)], 'comp': {'thr': -20, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sat': 2.0},
        'gtr': {'pan': 0.4, 'gain': -9.0, 'eq': [('hp', 200), ('peak', 2500, 1.0, 1.5)], 'sends': {'room': -10}},
        'drums.kick': {'bus': 'drums', 'gain': 1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 3.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 2.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 90), ('peak', 200, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'room': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -9.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'tpt1': {'bus': 'horns', 'pan': -0.25, 'gain': -2.0, 'eq': [('hp', 200)], 'sends': {'hall': -14}},
        'tpt2': {'bus': 'horns', 'pan': -0.4, 'gain': -4.0, 'eq': [('hp', 200)], 'sends': {'hall': -14}},
        'tbn': {'bus': 'horns', 'pan': 0.2, 'gain': -3.0, 'eq': [('hp', 80)], 'sends': {'hall': -14}},
        'clar': {'pan': 0.35, 'gain': -5.0, 'eq': [('hp', 200)], 'sends': {'hall': -12}},
        'xylo': {'pan': 0.3, 'gain': -10.0, 'eq': [('hp', 500)], 'sends': {'hall': -12}},
        'cowbell': {'pan': 0.45, 'gain': -16.0, 'eq': [('hp', 400)], 'sends': {'room': -12}},
        'shaker': {'pan': -0.45, 'gain': -15.0, 'eq': [('hp', 2500)]},
        'piano': {'pan': -0.2, 'gain': -8.0, 'eq': [('hp', 150), ('peak', 2500, 1.0, 1.5)], 'sends': {'room': -10}},
    },
    'buses': {
        'horns': {'gain': -1.0, 'eq': [('peak', 450, 0.8, -1.5), ('highshelf', 8000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 15, 'rel_ms': 150}, 'sat': 1.0},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 12, 'rel_ms': 120, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '0.6s_Wooden Studio', 'predelay': 6, 'hp': 350, 'lp': 9000, 'gain': -3.0},
        'hall': {'ir': '1.7s_Nice Hall', 'predelay': 20, 'hp': 400, 'lp': 9000, 'gain': -4.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

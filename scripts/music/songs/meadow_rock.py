# Windmill Run, candidate B (track meadow-run): driving heartland / indie rock for rolling farmland, windmills
# and the long straight. D major, 160 bpm. Two overdriven rhythm guitars (palm-muted eighths in the verse, open
# power chords in the chorus, left and right), a lead guitar with bends and vibrato through the same amp, a picked
# electric bass on straight eighths, big live drums (four-on-the-floor and a heavy snare in the chorus), a
# tonewheel organ, eighth-note piano chords, and a supersaw doubling the chorus anthem.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (muted guitars and the organ, then drums and bass, then the pickup bar) | loop 44:
#   V 8 (the riff on the lead guitar over palm-muted eighths, D-C-G) | P 4 (the build: toms, then the snare)
#   C 8 (the anthem: lead guitar and supersaw over open power chords, organ, piano) | S 8 (the guitar solo over
#   Bm-G-D-A) | P' 4 (the build again) | C' 12 (the anthem again with a tag, ending on the pickup bar that also
#   ends the intro)
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note, chord_at
from studio.arrange import comp, pad, shift, drum_fill
from studio import instruments as _I

SLOT, CANDIDATE = 'meadow-run', 'b-heartland-rock'
STYLE = ('heartland / indie rock: overdriven rhythm guitars (palm mutes, power chords), lead guitar with bends, '
         'picked electric bass, live drums, tonewheel organ, eighth-note piano, supersaw on the anthem')
FORM = ['intro 4 (muted guitars and organ, drums and bass, pickup bar)', 'V 8 riff on the lead guitar over palm-muted eighths',
        'P 4 build (toms, snare)', 'C 8 anthem (lead guitar + supersaw, open power chords, organ, piano)',
        'S 8 guitar solo over Bm-G-D-A', "P' 4 build", "C' 12 anthem + tag, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 160, 4, 44
V0, P0, C0, S0, Q0, E0 = 4, 12, 16, 24, 32, 36
LAST = E0 + 11  # the pickup bar at the loop's end (= the intro's last)

PROG = {
    'intro': 'D | D | G A | D A',
    'V': 'D | D | C | G | D | D | C | G',
    'P': 'Em | G | A | A',
    'C': 'D | A | Bm | G | D | A | G | A',
    'S': 'Bm | G | D | A | Bm | G | Em | A',
    "P'": 'Em | G | A | A',
    "C'": 'D | A | Bm | G | D | A | G | A | G | A | G A | D A',
}
SECTIONS = [('intro', INTRO), ('V', 8), ('P', 4), ('C', 8), ('S', 8), ("P'", 4), ("C'", 12)]

RIFF = [  # the verse riff on the lead guitar, D mixolydian
    "r:8 A4:8 D5:8 E5:8 F#5:4 E5:8 D5:8", "E5:8 D5:8 A4:8 D5:8~ D5:2",
    "r:8 G4:8 C5:8 D5:8 E5:4 D5:8 C5:8", "D5:8 B4:8 G4:8 B4:8~ B4:2",
    "r:8 A4:8 D5:8 E5:8 F#5:4 A5:8 F#5:8", "E5:8 D5:8 A4:8 D5:8~ D5:2",
    "r:8 G4:8 C5:8 D5:8 E5:4 G5:8 E5:8", "D5:8 B4:8 A4:8 G4:8~ G4:4 r:8 A4:8",
]
ANTHEM = [  # the chorus: long notes falling a third, anticipated, over D-A-Bm-G
    "A5:4. F#5:8~ F#5:4 E5:8 D5:8", "E5:4. C#5:8~ C#5:2",
    "B5:4. F#5:8~ F#5:4 E5:8 D5:8", "D5:4. B4:8~ B4:4 A4:8 B4:8",
    "A5:4. F#5:8~ F#5:4 E5:8 D5:8", "E5:4. A5:8~ A5:2",
    "B5:4. A5:8~ A5:4 G5:8 E5:8", "E5:2. r:8 A4:8",
]
TAG = ["B5:4. A5:8~ A5:4 G5:8 E5:8", "E5:4. A5:8~ A5:2", "D5:4 E5:4 C#5:4 E5:4"]
SOLO = [
    "F#5:8 A5:8 B5:4!bend A5:8 F#5:8 E5:8 D5:8", "D6:4!bend B5:4 A5:8 B5:8 A5:8 F#5:8",
    "A5:2!vib F#5:8 E5:8 D5:8 E5:8", "F#5:8 E5:8 C#5:8 A4:8 B4:8 C#5:8 E5:8 A5:8",
    "B5:4.!bend A5:8 F#5:8 A5:8 B5:8 D6:8~", "D6:4 B5:8 A5:8 G5:8 A5:8 B5:4!vib",
    "G5:8 F#5:8 E5:8 D5:8 B4:8 D5:8 E5:8 G5:8", "A5:2.!vib r:4",
]
PRE_LEAD = ["E5:2.!vib D5:4", "D5:2.!vib B4:4", "C#5:1!vib", "r:2 r:8 A4:8 D5:8 E5:8"]
SPB = 60.0 / BPM


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def bends(notes, st=2.0):
    """Guitar bends: a note marked !bend starts a whole step low and is pushed up to pitch."""
    return [n.copy(x={**n.x, 'bend': st}) if 'bend' in n.art else n for n in notes]


def compose():
    s = Song('Windmill Run (heartland rock)', 'meadow-run', BPM, 'D major', INTRO, LOOP, seed=41)
    P = {}
    P['gtr1'] = s.part('gtr1', 'guitar', jitter_ms=4, vel_jitter=0.06)
    P['gtr2'] = s.part('gtr2', 'guitar', jitter_ms=4, vel_jitter=0.06, lag_ms=6)
    P['lead'] = s.part('lead', 'guitar', jitter_ms=3, mono=True)
    P['saw'] = s.part('saw', 'hr_saw', jitter_ms=1.5, mono=True)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=3, vel_jitter=0.05)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3, vel_jitter=0.05)
    P['organ'] = s.part('organ', 'hr_organ', jitter_ms=3)
    P['piano'] = s.part('piano', 'piano', jitter_ms=4, vel_jitter=0.06)
    P['pad'] = s.part('pad', 'hr_pad', jitter_ms=2)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=4)
    P['fx'] = s.part('fx', 'edrums', jitter_ms=0)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return chord_at(allp, tt + 0.01)

    def power(part, bar0, nbars, pattern, vel=0.75, high=False, detune=0.0):
        """Power chords (root, fifth, octave) on a sixteenth grid: 'X' accent, 'x' open, 'm' palm-muted, '-' hold,
        '.' rest; each chord rings until the next hit (or the next chord change)."""
        pat = pattern.replace(' ', '')
        for b in range(nbars):
            ons = [k for k, c in enumerate(pat) if c in 'Xxm']
            for i, k in enumerate(ons):
                c = pat[k]
                tt = at(bar0 + b) + 0.25 * k
                j = 1
                while k + j < 16 and pat[k + j] == '-':
                    j += 1
                d = 0.25 * j
                if c == 'm':
                    d = 0.22
                ch = chord(tt)
                r = 40 + ((ch.root - 40) % 12)
                ps = [r, r + 7, r + 12] if not high else [r + 7, r + 12, r + 19]
                v = vel * {'X': 1.0, 'x': 0.88, 'm': 0.7}[c]
                art = {'stac'} if c == 'm' else set()
                part.add([Note(tt, d, p, v, art=art, x={'detune': detune}) for p in ps])

    SCALE = {0, 2, 4, 6, 7, 9, 11}  # D major with C natural: the mixolydian verse borrows it

    def broot(ch):
        r = 28 + ((ch.root - 28) % 12)
        return r + 12 if r < 31 else r

    def eighths(bar0, nbars, vel=0.78, walk=True):
        """The bass: straight eighths on the root; at the end of every other bar, the scale note under the next
        chord's root leads into it."""
        for b in range(nbars):
            t0 = at(bar0 + b)
            nxt = chord(t0 + 4.0)
            lead_in = walk and b % 2 == 1 and nxt.root != chord(t0 + 3.5).root
            for k in range(8):
                tt = t0 + 0.5 * k
                r = broot(chord(tt))
                if lead_in and k == 7:
                    tgt = broot(nxt)
                    r = next(tgt - d for d in (1, 2) if (tgt - d) % 12 in SCALE)
                P['bass'].add(Note(tt, 0.46, r, vel * (1.0 if k % 2 == 0 else 0.86)))

    def verse_beat(bar, vel=0.9):
        P['drums'].add(grid('x.....x.x.......', 'kick', at(bar), vels={'x': vel}) + grid('....X.......X...', 'snare', at(bar), vels={'X': vel}) +
                       grid('x.x.x.x.x.x.x.x.', 'hhc', at(bar), vels={'x': 0.55}))

    def chorus_beat(bar):
        P['drums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.9}) + grid('....X.......X...', 'snare', at(bar), vels={'X': 1.0}) +
                       grid('x.x.x.x.x.x.x.x.', 'hh34', at(bar), vels={'x': 0.6}))
        P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.6}))

    # ---------------------------------------------------------------- intro
    power(P['gtr1'], 0, 3, 'mmmmmmmmmmmmmmmm'[:16].replace('m', 'm'), vel=0.62)
    power(P['gtr2'], 0, 3, 'm.m.m.m.m.m.m.m.', vel=0.6, high=True, detune=0.07)
    P['organ'].add(pad(prog['intro'][:3], 57, 71, n=4, vel=0.55))
    eighths(2, 1, vel=0.7, walk=False)
    P['drums'].add(grid('x...x...x...x...', 'kick', at(2), vels={'x': 0.75}) + grid('x.x.x.x.x.x.x.x.', 'toml', at(2), vels={'x': 0.55}) +
                   grid('........x.x.x.x.', 'tomh', at(2), vels={'x': 0.6}))
    P['drums'].add(grid('................|................|..............x.', 'snare', 0, vels={'x': 0.5}))
    P['fx'].add([Note(at(1), 8.0, 'rise', 0.5)])

    def pickup(bar):
        """The bar that ends the intro and the loop: a D hit with everything, then a fill over A with the lead's
        pickup into the riff."""
        P['lead'].add(lines(["D5:4^ r:4 r:8 A4:8 C#5:8 E5:8"], at(bar)))
        P['gtr1'].add(lines(["[D3 A3 D4]:4^ r:4 [A2 E3 A3]:8' [A2 E3 A3]:8' [A2 E3 A3]:8' [A2 E3 A3]:8'"], at(bar)))
        P['gtr2'].add(lines(["[A3 D4 A4]:4^ r:4 [E3 A3 E4]:8' [E3 A3 E4]:8' [E3 A3 E4]:8' [E3 A3 E4]:8'"], at(bar)))
        P['bass'].add(lines(["D2:4^ r:4 A1:8 A1:8 A1:8 A1:8"], at(bar)))
        P['organ'].add(lines(["[D4 F#4 A4 D5]:4^ r:4 [C#4 E4 A4]:2"], at(bar)))
        P['piano'].add(lines(["[D2 D3 F#4 A4 D5]:4^ r:4 r:2"], at(bar)))
        P['drums'].add(grid('x...............', 'kick', at(bar)) + grid('x...............', 'crash', at(bar)) +
                       grid('........x.x.x.xx', 'snare', at(bar), vels={'x': 0.75}) + grid('..........x.x...', 'tomh', at(bar), vels={'x': 0.75}) +
                       grid('.............xx.', 'toml', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(LAST)
    s.twin(INTRO - 1, LAST)

    # ---------------------------------------------------------------- V: the riff over palm-muted eighths
    P['lead'].add(lines(RIFF, at(V0)))
    power(P['gtr1'], V0, 8, 'X.m.m.x.m.m.x.m.', vel=0.72)
    power(P['gtr2'], V0, 8, 'X.m.m.x.m.m.x.m.', vel=0.68, detune=0.07)
    P['organ'].add(pad(prog['V'], 57, 72, n=4, vel=0.5))
    eighths(V0, 8, vel=0.78)
    for b in range(8):
        verse_beat(V0 + b)
    P['drums'].add(grid('x...............', 'crash', at(V0)))

    # ---------------------------------------------------------------- P: the build
    def build(bar0, lead=True):
        power(P['gtr1'], bar0, 4, 'x.x.x.x.x.x.x.x.', vel=0.72)
        power(P['gtr2'], bar0, 4, 'x---------------', vel=0.72, high=True, detune=0.07)
        P['organ'].add([n.copy(v=0.45 + 0.35 * (n.t - at(bar0)) / 16) for n in pad(prog['P'] if bar0 == P0 else prog["P'"], 57, 74, n=4, vel=1.0)])
        P['piano'].add([n.copy(v=0.35 + 0.3 * (n.t - at(bar0)) / 16) for n in comp(prog['P'] if bar0 == P0 else prog["P'"], 'x.x.x.x.x.x.x.x.', 62, 76, n=3, vel=1.0)])
        eighths(bar0, 4, vel=0.8, walk=False)
        for b in range(2):
            P['drums'].add(grid('x...x...x...x...', 'kick', at(bar0 + b), vels={'x': 0.85}) + grid('x.x.x.x.x.x.x.x.', 'toml', at(bar0 + b), vels={'x': 0.6}) +
                           grid('....X.......X...', 'snare', at(bar0 + b), vels={'X': 0.85}))
        P['drums'].add(grid('x...x...x...x...', 'kick', at(bar0 + 2), vels={'x': 0.85}) + grid('x.x.x.x.x.x.x.x.', 'snare', at(bar0 + 2), vels={'x': 0.7}))
        P['drums'].add(grid('x...x...x...x...', 'kick', at(bar0 + 3), vels={'x': 0.9}) + grid('xxxxxxxxxxxxxxxx', 'snare', at(bar0 + 3), vels={'x': 0.75}))
        P['drums'].add(grid('x...............', 'crash', at(bar0)))
        P['fx'].add([Note(at(bar0 + 2), 8.0, 'rise', 0.7)])
        if lead:
            P['lead'].add(lines(PRE_LEAD, at(bar0)))
    build(P0)

    # ---------------------------------------------------------------- C: the anthem
    def anthem(bar0, bars, tag=False):
        mel = lines(bars, at(bar0))
        P['lead'].add(mel)
        P['saw'].add(mel)
        n = len(bars)
        power(P['gtr1'], bar0, n, 'X.x.x.x.X.x.x.x.', vel=0.78)
        power(P['gtr2'], bar0, n, 'X-------x-------', vel=0.74, high=True, detune=0.07)
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + n) - 1e-9]
        P['organ'].add(pad(pr, 60, 76, n=4, vel=0.6))
        P['pad'].add(pad(pr, 55, 72, n=4, vel=0.5))
        P['piano'].add(comp(pr, 'x.x.x.x.x.x.x.x.', 62, 78, n=3, vel=0.5))
        for (st, d, ch) in pr:
            r = 26 + ((ch.root - 26) % 12)
            P['piano'].add([Note(st + k, 0.9, r + 12, 0.55) for k in range(int(d))] + [Note(st + k, 0.9, r, 0.45) for k in range(int(d))])
        eighths(bar0, n, vel=0.85)
        for b in range(n):
            chorus_beat(bar0 + b)
        for b in range(0, n, 4):
            P['drums'].add(grid('x...............', 'crash', at(bar0 + b)))
    anthem(C0, ANTHEM)

    # ---------------------------------------------------------------- S: the solo
    P['lead'].add(bends(lines(SOLO, at(S0))))
    power(P['gtr1'], S0, 8, 'X.x.x.x.X.x.x.x.', vel=0.72)
    power(P['gtr2'], S0, 8, 'X.m.m.x.m.m.x.m.', vel=0.66, high=True, detune=0.07)
    P['organ'].add(pad(prog['S'], 57, 74, n=4, vel=0.55))
    P['pad'].add(pad(prog['S'], 55, 72, n=4, vel=0.4))
    eighths(S0, 8, vel=0.82)
    for b in range(8):
        P['drums'].add(grid('x.....x.x.......', 'kick', at(S0 + b), vels={'x': 0.9}) + grid('....X.......X...', 'snare', at(S0 + b), vels={'X': 0.95}) +
                       grid('x.x.x.x.x.x.x.x.', 'ride', at(S0 + b), vels={'x': 0.55}))
    P['drums'].add(grid('x...............', 'crash', at(S0)) + grid('x...............', 'crash', at(S0 + 4)))

    # ---------------------------------------------------------------- P' and C': the build and the anthem again
    build(Q0)
    anthem(E0, ANTHEM + TAG)

    for bar, style in [(V0 + 3, 'snare'), (V0 + 7, 'toms'), (C0 + 3, 'snare'), (C0 + 7, 'toms'), (S0 + 3, 'flams'), (S0 + 7, 'toms'),
                       (E0 + 3, 'snare'), (E0 + 7, 'toms')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import modern, synths
    _I.RACK['hr_saw'] = lambda: modern.Supersaw(voices=7, detune=16, spread=0.6, cutoff=3000, env_amt=3000, env_decay=0.3, res=0.1,
                                                  attack=0.01, decay=0.5, sustain=0.8, release=0.25, gain_db=-12, vib=(5.2, 0.12, 0.3))
    _I.RACK['hr_organ'] = lambda: synths.Organ(drawbars='888600000', click=0.2, drive_db=9.0, leslie='slow', gain_db=-8.0)
    _I.RACK['hr_pad'] = lambda: modern.Pad(gain_db=-17, cutoff=2200, attack=0.3, release=0.8, voices=5, detune=12, air=0.02)
    _I.get.cache_clear()


_instruments()

MIX = {
    'tracks': {
        'gtr1': {'pan': -0.7, 'gain': -8.0, 'amp': {'drive_db': 20.0, 'tone': 0.5}, 'eq': [('hp', 90), ('peak', 3000, 1.0, 1.0)], 'sends': {'room': -14}},
        'gtr2': {'pan': 0.7, 'gain': -8.0, 'amp': {'drive_db': 20.0, 'tone': 1.0}, 'eq': [('hp', 110), ('peak', 3000, 1.0, 1.0)], 'sends': {'room': -14}},
        'lead': {'pan': 0.1, 'gain': -4.0, 'amp': {'drive_db': 18.0, 'tone': 1.5}, 'eq': [('hp', 150), ('peak', 2500, 1.0, 1.5)],
                 'sends': {'delay': -11, 'hall': -12}},
        'saw': {'pan': -0.1, 'gain': -9.0, 'width': 1.4, 'eq': [('hp', 300), ('lp', 9000)], 'sends': {'hall': -11, 'delay': -14}},
        'bass': {'gain': -1.0, 'eq': [('hp', 35), ('peak', 90, 1.0, 2.0), ('peak', 250, 1.0, -2.0), ('peak', 1500, 1.2, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 8, 'rel_ms': 100}, 'sat': 3.0},
        'organ': {'pan': -0.25, 'gain': -15.0, 'width': 1.3, 'eq': [('hp', 180), ('lp', 7000)], 'sends': {'room': -10}},
        'piano': {'pan': 0.25, 'gain': -7.0, 'eq': [('hp', 90), ('peak', 300, 1.0, -2.0), ('peak', 3000, 1.0, 2.0)],
                  'comp': {'thr': -20, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'room': -12}},
        'pad': {'gain': -8.0, 'width': 1.5, 'eq': [('hp', 250), ('lp', 7000)], 'sends': {'hall': -10}},
        'tamb': {'pan': 0.45, 'gain': -13.0, 'eq': [('hp', 3000)], 'sends': {'room': -10}},
        'fx.kick': {'gain': -30.0}, 'fx.snare': {'gain': -30.0}, 'fx.hats': {'gain': -30.0},
        'fx.fx': {'gain': -12.0, 'width': 1.5, 'sends': {'hall': -10}},
        'drums.kick': {'bus': 'drums', 'gain': 2.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 3.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 90), ('peak', 200, 1.0, 2.5), ('peak', 900, 1.5, -2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sends': {'plate': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.5)]},
        'drums.room': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 110, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '00.9s Recording Room-OST', 'predelay': 8, 'hp': 400, 'lp': 9000, 'gain': -4.0},
        'plate': {'ir': '1.3s_Horn Chamber', 'predelay': 15, 'hp': 450, 'lp': 10000, 'gain': -5.0},
        'hall': {'ir': '1.7s_Nice Hall', 'predelay': 20, 'hp': 450, 'lp': 9000, 'gain': -5.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.28, 'lp': 4500, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'eq': [('hp', 28)], 'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 1.5},
}


def shorts():
    """Course-intro pieces from the anthem: 6.0 s (its first bar and the turn to the tag over the whole band, landing
    on a held D chord at 3.0 s) and 2.5 s (a fill and the lead's pickup into a D hit at 0.75 s)."""
    out = {}

    def parts(s):
        P = {}
        P['gtr1'] = s.part('gtr1', 'guitar', jitter_ms=4)
        P['gtr2'] = s.part('gtr2', 'guitar', jitter_ms=4, lag_ms=6)
        P['lead'] = s.part('lead', 'guitar', jitter_ms=3, mono=True)
        P['saw'] = s.part('saw', 'hr_saw', jitter_ms=1.5, mono=True)
        P['bass'] = s.part('bass', 'ebass', jitter_ms=3)
        P['drums'] = s.part('drums', 'kit', jitter_ms=3)
        P['organ'] = s.part('organ', 'hr_organ', jitter_ms=3)
        P['piano'] = s.part('piano', 'piano', jitter_ms=4)
        P['pad'] = s.part('pad', 'hr_pad', jitter_ms=2)
        P['fx'] = s.part('fx', 'edrums', jitter_ms=0)
        return P

    def land(P, t, beats):
        P['lead'].add(Note(t, beats, 74, 0.9, art={'vib'}))
        P['saw'].add(Note(t, beats, 74, 0.8))
        P['gtr1'].add([Note(t, beats, p, 0.85) for p in (50, 57, 62)])
        P['gtr2'].add([Note(t, beats, p, 0.8, x={'detune': 0.07}) for p in (57, 62, 69)])
        P['bass'].add(Note(t, beats, 38, 0.9))
        P['organ'].add([Note(t, beats, p, 0.7) for p in (62, 66, 69, 74)])
        P['pad'].add([Note(t, beats, p, 0.6) for p in (57, 62, 66, 69)])
        P['piano'].add([Note(t, beats, p, 0.75) for p in (38, 50, 66, 69, 74)])
        P['drums'].add([Note(t, 1, 'kick', 1.0), Note(t, 1, 'crash', 1.0), Note(t, 1, 'snare', 0.8)])

    s = Song('Windmill Run (heartland rock) - course intro', 'meadow-run', BPM, 'D major', 4, 0, seed=42, tail_bars=0)
    s.about = "the anthem's first bar and its turn on the lead guitar and supersaw over the band, landing on a held D chord"
    P = parts(s)
    pr = chords('D | G A | D | D', 0)
    mel = lines([ANTHEM[0], "B5:4. A5:8~ A5:4 G5:8 E5:8"], 0)
    P['lead'].add(mel)
    P['saw'].add(mel)
    for part, hi, det in ((P['gtr1'], False, 0.0), (P['gtr2'], True, 0.07)):
        for b in range(2):
            for k in range(8):
                tt = 4 * b + 0.5 * k
                ch = chord_at(pr, tt + 0.01)
                r = 40 + ((ch.root - 40) % 12)
                ps = [r, r + 7, r + 12] if not hi else [r + 7, r + 12, r + 19]
                part.add([Note(tt, 0.48, p, 0.8 if k % 4 == 0 else 0.7, x={'detune': det}) for p in ps])
    P['bass'].add(lines(["D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8", "G1:8 G1:8 G1:8 G1:8 A1:8 A1:8 A1:8 A1:8"], 0))
    P['organ'].add(pad(pr[:3], 60, 76, n=4, vel=0.6))
    P['piano'].add(comp(pr[:3], 'x.x.x.x.x.x.x.x.', 62, 78, n=3, vel=0.5))
    P['drums'].add(grid('x...x...x...x...|x...x...x...x...', 'kick', 0, vels={'x': 0.9}) + grid('....X.......X...|....X.......X...', 'snare', 0) +
                   grid('x.x.x.x.x.x.x.x.|x.x.x.x.........', 'hh34', 0, vels={'x': 0.6}) + grid('x...............', 'crash', 0) +
                   grid('................|........x.x.xxxx', 'snare', 0, vels={'x': 0.7}))
    P['fx'].add([Note(0, 8.0, 'rise', 0.5)])
    land(P, 8.0, 8.0)
    out['intro-6s'] = (s, 6.0, 8)

    s = Song('Windmill Run (heartland rock) - course intro short', 'meadow-run', BPM, 'D major', 2, 0, seed=43, tail_bars=0)
    s.about = "a snare and tom fill with the lead guitar's pickup into a D chord hit"
    P = parts(s)
    P['lead'].add(lines(["r:8 A4:8 C#5:8 E5:8 r:2", "r:1"], 0))
    P['saw'].add(lines(["r:8 A4:8 C#5:8 E5:8 r:2", "r:1"], 0))
    P['gtr1'].add(lines(["[A2 E3 A3]:8' [A2 E3 A3]:8' [A2 E3 A3]:8' [A2 E3 A3]:8' r:2", "r:1"], 0))
    P['bass'].add(lines(["A1:8 A1:8 A1:8 A1:8 r:2", "r:1"], 0))
    P['drums'].add(grid('x.x.xxxx........', 'snare', 0, vels={'x': 0.75}) + grid('..x.x...........', 'tomh', 0, vels={'x': 0.7}) +
                   grid('.....xx.........', 'toml', 0, vels={'x': 0.8}))
    land(P, 2.0, 4.0)
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

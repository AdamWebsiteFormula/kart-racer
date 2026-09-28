# Windmill Run, candidate A (track meadow-run): folktronica / country-EDM for rolling farmland and windmills.
# G major, 132 bpm. Two strummed guitars (the folk-pop G / Cadd9 / Em7 shapes with the D-G drone on top, driving
# sixteenth strums with chucks on the backbeat), a picked guitar melody in the verse, piano chords, four-on-the-floor
# with big layered hand claps, a riser build with a snare roll and a drop gap, then the drop: a supersaw lead on a
# 3-3-2 hook, supersaw chord stabs and pads pumping under the kick, a sub bass and a plucked mid bass on the same
# 3-3-2, the guitars and piano doubling it. A piano breakdown with its own melody before the last drop.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (strums alone, piano, pad and a riser, then the pickup bar) | loop 44:
#   V 8 (verse: the picked guitar melody over strums, piano, kick and claps) | B 4 (the build: snare roll, riser,
#   the drop gap) | D 16 (the drop: the hook twice, the second time doubled an octave down by a saw and the guitar)
#   R 8 (breakdown: the piano melody, half-time, then a build) | D' 8 (the last drop, ending on the pickup bar that
#   also ends the intro)
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note, chord_at
from studio.arrange import comp, pad, shift, drum_fill, roots
from studio import instruments as _I

SLOT, CANDIDATE = 'meadow-run', 'a-country-edm'
STYLE = ('folktronica / country-EDM: strummed and picked guitars, piano, four-on-the-floor with layered hand claps, '
         'riser build and drop, supersaw lead hook, sidechained supersaw chords and pads, sub and pluck bass')
FORM = ['intro 4 (strums, piano, pad, riser, pickup bar)', 'V 8 verse (picked guitar melody over strums, kick and claps)',
        'B 4 build (snare roll, riser, drop gap)', 'D 16 drop (supersaw hook on a 3-3-2, twice, doubled the second time)',
        'R 8 breakdown (piano melody, half-time, build)', "D' 8 last drop, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 132, 4, 44
V0, B0, D0, R0, E0 = 4, 12, 16, 32, 40
LAST = E0 + 7  # the pickup bar at the loop's end (= the intro's last bar)

PROG = {
    'intro': 'G | Em7 | Cadd9 | G D',
    'V': 'G | D/F# | Em7 | Cadd9 | G | D/F# | Cadd9 | Dsus4 D',
    'B': 'Em7 | Cadd9 | Dsus4 | D',
    'D': ' | '.join(['G | D/F# | Em7 | Cadd9'] * 4),
    'R': 'Em7 | Cadd9 | G | D/F# | Em7 | Cadd9 | Am9 | Dsus4 D',
    "D'": 'G | D/F# | Em7 | Cadd9 | G | D/F# | Cadd9 D | G D',
}
SECTIONS = [('intro', INTRO), ('V', 8), ('B', 4), ('D', 16), ('R', 8), ("D'", 8)]

# the hook (the drop's lead): a 3-3-2 figure climbing through the chord and falling back
HOOK = [
    "B4:8. D5:8. G5:8 A5:8. G5:8. E5:8",
    "F#5:8. E5:8. D5:8~ D5:4 r:8 A4:8",
    "B4:8. D5:8. G5:8 B5:8. A5:8. G5:8",
    "A5:8. G5:8. E5:8~ E5:2",
    "B4:8. D5:8. G5:8 A5:8. G5:8. E5:8",
    "F#5:8. A5:8. D6:8~ D6:4 B5:8 A5:8",
    "G5:8. E5:8. D5:8 E5:8. G5:8. B5:8",
    "D5:8. E5:8. G5:8~ G5:2",
]
HOOK_TURN = "E5:8. D5:8. C5:8 D5:8. F#5:8. A5:8"   # the last drop's seventh bar, over Cadd9 D, up into the pickup
# the verse: the same rhythm, low and spare, on the picked guitar
VERSE = [
    "D4:8. G4:8. A4:8 B4:4 r:4",
    "A4:8. F#4:8. E4:8 D4:4 r:4",
    "E4:8. G4:8. A4:8 B4:8. D5:8. B4:8",
    "A4:8. G4:8. E4:8~ E4:2",
    "D4:8. G4:8. A4:8 B4:4 r:4",
    "A4:8. F#4:8. E4:8 A4:4 D5:4",
    "E5:8. D5:8. C5:8 E4:8. G4:8. A4:8",
    "A4:2 r:2",
]
# the breakdown's piano melody
BREAK = [
    "B4:4. D5:8~ D5:4 E5:4",
    "G5:2 E5:4 D5:4",
    "B4:4. D5:8~ D5:4 G5:4",
    "F#5:2 E5:4 D5:4",
    "B4:4. D5:8~ D5:4 E5:4",
    "G5:2 E5:4 G5:4",
    "C6:4. B5:8~ B5:4 A5:4",
    "G5:4 A5:4 F#5:2",
]

# guitar shapes, low string to high (MIDI): the folk-pop family that keeps D4 and G4 ringing on top
SHAPES = {
    'G': (43, 47, 50, 55, 62, 67), 'D/F#': (42, 50, 57, 62, 66), 'Em7': (40, 47, 52, 55, 62, 67),
    'Cadd9': (48, 52, 55, 62, 67), 'Dsus4': (50, 57, 62, 67), 'D': (50, 57, 62, 66), 'Am7': (45, 52, 55, 60, 64), 'Am9': (45, 52, 55, 60, 64),
}
STRUM_VERSE = 'D...D.U...U.D.U.'
STRUM_DROP = 'D.DUx.DUD.DUx.DU'
STRUM_PICKUP = 'D.......D.DU.UDU'
SPB = 60.0 / BPM


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def strum(prog, bar0, nbars, pattern, vel=0.7, spread_ms=8.0, detune=0.0, seed=1, jit_ms=3.0, ring=None):
    """A strummed guitar: per sixteenth 'D' down (low to high strings), 'd' a softer down, 'U' up (the top four
    strings, high to low), 'u' softer up, 'x' a muted chuck, '.' let ring. Each stroke rings until the next."""
    rng = np.random.default_rng(seed)
    sp = spread_ms / 1000.0 / SPB
    out = []
    for b in range(nbars):
        pat = pattern.replace('|', '').replace(' ', '')
        ons = [k for k, c in enumerate(pat) if c != '.']
        for i, k in enumerate(ons):
            c = pat[k]
            t = at(bar0 + b) + 0.25 * k
            nxt = ons[i + 1] if i + 1 < len(ons) else 16
            d = 0.25 * (nxt - k) if ring is None else ring
            ch = chord_at(prog, t + 0.01)
            # the hand lets go when the chord changes before the next stroke
            chg = [st for (st, _, _) in prog if t + 0.01 < st < t + d - 0.01]
            if chg:
                d = chg[0] - t
            shape = SHAPES[ch.sym]
            if c in 'Uu':
                strings = list(shape[::-1][:4])
            elif c == 'x':
                strings = list(shape[-4:])
            else:
                strings = list(shape)
            v = vel * {'D': 1.0, 'd': 0.82, 'U': 0.72, 'u': 0.6, 'x': 0.5}[c]
            j0 = rng.normal(0, jit_ms) / 1000.0 / SPB
            vv = v * (1 + rng.normal(0, 0.05))
            for j, p in enumerate(strings):
                tt = t + j0 + j * sp
                art = {'nohuman'} | ({'stac'} if c == 'x' else set())
                out.append(Note(tt, max(0.08, d - j * sp) if c != 'x' else 0.12, p, float(np.clip(vv * (0.9 + 0.1 * j / len(strings)), 0.05, 1.0)),
                                art=art, x={'detune': detune}))
    return out


def compose():
    s = Song('Windmill Run (country EDM)', 'meadow-run', BPM, 'G major', INTRO, LOOP, seed=31)
    P = {}
    P['lead'] = s.part('lead', 'ce_lead', jitter_ms=1.5, mono=True)
    P['lead2'] = s.part('lead2', 'ce_lead2', jitter_ms=1.5, mono=True)
    P['pluck'] = s.part('pluck', 'ce_pluck', jitter_ms=1.0)
    P['chords'] = s.part('chords', 'ce_chords', jitter_ms=2)
    P['pad'] = s.part('pad', 'ce_pad', jitter_ms=2)
    P['sub'] = s.part('sub', 'ce_sub', jitter_ms=0.5)
    P['bass'] = s.part('bass', 'ce_bass', jitter_ms=1.0)
    P['piano'] = s.part('piano', 'piano', jitter_ms=4, vel_jitter=0.06)
    P['gtr1'] = s.part('gtr1', 'guitar', jitter_ms=0, vel_jitter=0.05)
    P['gtr2'] = s.part('gtr2', 'guitar', jitter_ms=0, vel_jitter=0.05)
    P['gtrlead'] = s.part('gtrlead', 'guitar', jitter_ms=3, mono=True)
    P['edrums'] = s.part('edrums', 'ce_drums', jitter_ms=1.0, vel_jitter=0.04)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05)
    P['clapL'] = s.part('clapL', 'clap', jitter_ms=3)
    P['clapR'] = s.part('clapR', 'clap', jitter_ms=3, lag_ms=9)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=4)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return chord_at(allp, tt + 0.01)

    def guitars(bar0, nbars, pattern, vel=0.7):
        P['gtr1'].add(strum(allp, bar0, nbars, pattern, vel=vel, detune=-0.04, seed=bar0 * 7 + 1))
        P['gtr2'].add(strum(allp, bar0, nbars, pattern, vel=vel * 0.95, detune=0.06, seed=bar0 * 7 + 2, spread_ms=10.0))

    def sub(bar0, nbars, vel=0.8):
        for (st, d, ch) in allp:
            if at(bar0) - 1e-9 <= st < at(bar0 + nbars) - 1e-9:
                r = 28 + ((ch.bass - 28) % 12)
                P['sub'].add(Note(st, d * 0.97, r, vel))

    def bass(bar0, nbars, pattern='x..x..x.x..x..x.', vel=0.8, octave_on=()):
        for b in range(nbars):
            for k, c in enumerate(pattern):
                if c == '.':
                    continue
                tt = at(bar0 + b) + 0.25 * k
                j = 1
                while k + j < 16 and pattern[k + j] == '.':
                    j += 1
                r = 40 + ((chord(tt).bass - 40) % 12)
                p = r + 12 if k in octave_on else r
                P['bass'].add(Note(tt, 0.25 * j * 0.9, p, vel * (1.0 if k % 4 == 0 else 0.85)))

    def claps(bar, pat='....x.......x...', v=0.8):
        P['clapL'].add(grid(pat, 'handclap', at(bar), vels={'x': v}))
        P['clapR'].add(grid(pat, 'handclap', at(bar), vels={'x': v * 0.92}))
        P['edrums'].add(grid(pat, 'clap', at(bar), vels={'x': v * 0.8}))

    def verse_beat(bar):
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.82}))
        claps(bar, v=0.7)
        P['drums'].add(grid('x.x.x.x.x.x.x.x.', 'hhc', at(bar), vels={'x': 0.45}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.5}) +
                        grid('.x.x.x.x.x.x.x.x', 'LShaker_Shake1U', at(bar), vels={'x': 0.35}))

    def drop_beat(bar):
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.95}))
        claps(bar, v=0.9)
        P['drums'].add(grid('....x.......x...', 'snare', at(bar), vels={'x': 0.55}))
        P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.42, 'g': 0.26}))
        P['drums'].add(grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.5}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.5}) +
                        grid('.x.x.x.x.x.x.x.x', 'LShaker_Shake1U', at(bar), vels={'x': 0.35}))

    # ---------------------------------------------------------------- intro
    guitars(0, 3, STRUM_VERSE, vel=0.55)
    P['piano'].add(pad(prog['intro'][1:3], 60, 72, n=4, vel=0.42))
    P['pad'].add(pad(prog['intro'][2:3], 55, 69, n=4, vel=0.4))
    P['shaker'].add(sum([grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(b), vels={'x': 0.4}) for b in (1, 2)], []))
    P['edrums'].add([Note(at(1), 8.0, 'rise', 0.7)])
    P['drums'].add(grid('........x.x.xxxx', 'snare', at(2), vels={'x': 0.45}))

    def pickup(bar):
        """The bar that ends the intro and the loop: a G hit with everything, then the strums alone on D and a short
        riser into the verse."""
        P['lead'].add(lines(["B5:4^ r:4 r:2"], at(bar)))
        P['chords'].add(lines(["[G4 B4 D5]:4^ r:4 r:2"], at(bar)))
        P['pad'].add(lines(["[G3 D4 G4 B4]:4 r:4 r:2"], at(bar)))
        P['piano'].add(lines(["[G2 G3 D4 G4 B4]:4^ r:4 r:2"], at(bar)))
        P['sub'].add(lines(["G1:4 r:4 r:2"], at(bar)))
        P['bass'].add(lines(["G2:4^ r:4 r:2"], at(bar)))
        P['gtr1'].add(strum(allp, bar, 1, STRUM_PICKUP, vel=0.62, detune=-0.04, seed=11))
        P['gtr2'].add(strum(allp, bar, 1, STRUM_PICKUP, vel=0.58, detune=0.06, seed=12, spread_ms=10.0))
        P['edrums'].add([Note(at(bar), 1, 'kick', 1.0), Note(at(bar), 2, 'impact', 0.75), Note(at(bar) + 2, 2.0, 'rise', 0.5)])
        P['drums'].add(grid('x...............', 'crash', at(bar)) + grid('............x.xx', 'snare', at(bar), vels={'x': 0.4}))
        P['clapL'].add(grid('............x...', 'handclap', at(bar), vels={'x': 0.6}))
        P['clapR'].add(grid('............x...', 'handclap', at(bar), vels={'x': 0.55}))
    pickup(INTRO - 1)
    pickup(LAST)
    s.twin(INTRO - 1, LAST)

    # ---------------------------------------------------------------- V: the verse
    P['gtrlead'].add(lines(VERSE, at(V0)))
    guitars(V0, 8, STRUM_VERSE, vel=0.62)
    P['piano'].add(comp(prog['V'], 'x.......x.......', 60, 74, n=4, vel=0.36))
    P['pad'].add(pad(prog['V'][4:], 55, 69, n=4, vel=0.38))
    sub(V0, 8, vel=0.7)
    bass(V0, 8, pattern='x.x.x.x.x.x.x.x.', vel=0.62)
    for b in range(8):
        verse_beat(V0 + b)

    # ---------------------------------------------------------------- B: the build
    guitars(B0, 3, 'D.DUD.DUD.DUD.DU', vel=0.62)
    guitars(B0 + 3, 1, 'D.DUD.DU........', vel=0.7)
    pr = prog['B']
    P['piano'].add([n.copy(v=0.3 + 0.35 * (n.t - at(B0)) / 16) for n in comp(pr, 'x.x.x.x.x.x.x.x.', 60, 74, n=4, vel=1.0) if n.t < at(B0 + 3) + 2])
    P['pad'].add([n.copy(v=0.3 + 0.5 * (n.t - at(B0)) / 16) for n in pad(pr, 55, 71, n=4, vel=1.0)])
    for b in range(4):
        for k in range(16):
            tt = at(B0 + b) + 0.25 * k
            if tt >= at(B0 + 3) + 2:
                break
            tones = chord(tt).tones(62, 81)[:4]
            P['pluck'].add(Note(tt, 0.2, tones[[0, 1, 2, 3, 2, 1, 2, 3][k % 8] % len(tones)], 0.25 + 0.45 * (tt - at(B0)) / 16))
    sub(B0, 3, vel=0.65)
    P['sub'].add(Note(at(B0 + 3), 1.9, 38, 0.7))
    for b in range(3):
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(B0 + b), vels={'x': 0.85}))
        claps(B0 + b, v=0.65)
    P['edrums'].add(grid('x...x...........', 'kick', at(B0 + 3), vels={'x': 0.85}))
    roll = [('x.......x.......', 0.35), ('x...x...x...x...', 0.45), ('x.x.x.x.x.x.x.x.', 0.55), ('xxxxxxxx........', 0.7)]
    for b, (pat, v) in enumerate(roll):
        P['drums'].add([n.copy(v=v + 0.2 * k / 16) for k, n in enumerate(grid(pat, 'snare', at(B0 + b), vels={'x': 1.0}))])
    P['edrums'].add([Note(at(B0), 15.0, 'rise', 0.95)])

    # ---------------------------------------------------------------- D: the drop
    hook = lines(HOOK, at(D0))
    hook2 = lines(HOOK, at(D0 + 8))
    P['lead'].add(hook + hook2)
    P['pluck'].add([n.copy(d=min(n.d, 0.5), v=0.55) for n in hook + hook2])
    P['gtrlead'].add(shift([n.copy(v=0.7) for n in hook2], 0, -12))
    guitars(D0, 16, STRUM_DROP, vel=0.7)
    P['chords'].add(comp(prog['D'], 'x--x--x-x--x--x-', 60, 76, n=4, vel=0.6))
    P['piano'].add(comp(prog['D'], 'x--x--x-x--x--x-', 60, 76, n=4, vel=0.5))
    P['pad'].add(pad(prog['D'], 55, 70, n=4, vel=0.5))
    sub(D0, 16, vel=0.85)
    bass(D0, 16, vel=0.8, octave_on=(6, 14))
    for b in range(16):
        drop_beat(D0 + b)
    for bar in (D0, D0 + 8):
        P['drums'].add(grid('x...............', 'crash', at(bar)))
        P['edrums'].add([Note(at(bar), 2, 'impact', 0.8)])
    P['drums'].add(grid('x...............', 'crash', at(D0 + 4)) + grid('x...............', 'crash', at(D0 + 12)))

    # ---------------------------------------------------------------- R: the breakdown
    P['piano'].add(lines(BREAK, at(R0)))
    P['piano'].add([n.copy(v=0.42) for n in pad(prog['R'], 43, 57, n=3, vel=1.0)])
    P['pad'].add(pad(prog['R'], 55, 70, n=4, vel=0.45))
    for b in range(8):
        tt = at(R0 + b)
        for k in range(16):
            if b == 7 and k >= 8:
                break
            t2 = tt + 0.25 * k
            tones = chord(t2).tones(62, 79)[:4]
            P['pluck'].add(Note(t2, 0.2, tones[[0, 2, 1, 3, 2, 0, 3, 1][k % 8] % len(tones)], 0.22 + (0.2 * b / 7)))
    guitars(R0, 6, 'D...............', vel=0.55)
    guitars(R0 + 6, 2, 'D.DUD.DUD.DUD.DU', vel=0.6)
    sub(R0, 8, vel=0.6)
    P['edrums'].add([Note(at(R0), 2, 'impact', 0.6), Note(at(R0), 4, 'down', 0.6)])
    for b in range(4):
        P['edrums'].add(grid('x.........x.....', 'kick', at(R0 + b), vels={'x': 0.6}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(R0 + b), vels={'x': 0.4}))
    for b in range(4, 6):
        P['edrums'].add(grid('x.......x.......', 'kick', at(R0 + b), vels={'x': 0.7}))
        claps(R0 + b, '........x.......', v=0.7)
        P['drums'].add(grid('x.x.x.x.x.x.x.x.', 'hhc', at(R0 + b), vels={'x': 0.4}))
    for b in range(6, 8):
        P['edrums'].add(grid('x...x...x...x...' if b == 6 else 'x...x...........', 'kick', at(R0 + b), vels={'x': 0.85}))
    P['drums'].add([n.copy(v=0.4 + 0.3 * k / 24) for k, n in enumerate(grid('x.x.x.x.x.x.x.x.|xxxxxxxx........', 'snare', at(R0 + 6), vels={'x': 1.0}))])
    P['edrums'].add([Note(at(R0 + 6), 7.0, 'rise', 0.9)])
    P['drums'].add(grid('x...............', 'crash', at(R0 + 4)))

    # ---------------------------------------------------------------- D': the last drop
    last = lines(HOOK[:6] + [HOOK_TURN], at(E0))
    P['lead'].add(last)
    P['pluck'].add([n.copy(d=min(n.d, 0.5), v=0.55) for n in last])
    P['lead2'].add(shift(last, 0, -12, vel=0.9))
    P['gtrlead'].add(shift([n.copy(v=0.7) for n in last], 0, -12))
    guitars(E0, 7, STRUM_DROP, vel=0.72)
    pr = prog["D'"][:-2]
    P['chords'].add(comp(pr, 'x--x--x-x--x--x-', 60, 76, n=4, vel=0.62))
    P['piano'].add(comp(pr, 'x--x--x-x--x--x-', 60, 76, n=4, vel=0.52))
    P['pad'].add(pad(pr, 55, 70, n=4, vel=0.52))
    sub(E0, 7, vel=0.85)
    bass(E0, 7, vel=0.82, octave_on=(6, 14))
    for b in range(7):
        drop_beat(E0 + b)
    P['drums'].add(grid('x...............', 'crash', at(E0)) + grid('x...............', 'crash', at(E0 + 4)))
    P['edrums'].add([Note(at(E0), 2, 'impact', 0.85)])

    # fills at the ends of phrases
    for bar, style in [(V0 + 3, 'snare'), (V0 + 7, 'toms'), (D0 + 3, 'snare'), (D0 + 7, 'toms'), (D0 + 11, 'snare'),
                       (D0 + 15, 'down'), (E0 + 3, 'toms')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import modern
    _I.RACK['ce_lead'] = lambda: modern.Supersaw(voices=7, detune=20, spread=0.75, cutoff=3500, env_amt=5000, env_decay=0.22, res=0.12,
                                                   attack=0.003, decay=0.45, sustain=0.75, release=0.2, gain_db=-11, vib=(5.3, 0.1, 0.3))
    _I.RACK['ce_lead2'] = lambda: modern.Supersaw(voices=5, detune=12, spread=0.5, cutoff=2200, env_amt=3000, env_decay=0.2, release=0.15, gain_db=-17)
    _I.RACK['ce_pluck'] = lambda: modern.Pluck(gain_db=-14, cutoff=1300, env_amt=5500, env_decay=0.07, decay=0.22, release=0.05, detune=9, res=0.12, square=0.35)
    _I.RACK['ce_chords'] = lambda: modern.Supersaw(voices=5, detune=18, spread=0.9, cutoff=2000, env_amt=3000, env_decay=0.15, decay=0.3, sustain=0.5,
                                                     release=0.12, gain_db=-18)
    _I.RACK['ce_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=2000, attack=0.3, release=0.9, voices=5, detune=14, air=0.04, bright=0.8)
    _I.RACK['ce_drums'] = lambda: modern.DrumSynth(kick_tune=52.0, kick_decay=0.22)
    _I.RACK['ce_sub'] = lambda: modern.SubBass(gain_db=-9, harm=0.3, release=0.06)
    _I.RACK['ce_bass'] = lambda: modern.Pluck(gain_db=-9, cutoff=420, env_amt=2400, env_decay=0.08, decay=0.3, release=0.04, detune=6, res=0.2, square=0.3)
    _I.get.cache_clear()


_instruments()

GTR = {'eq': [('hp', 130), ('peak', 700, 1.0, -2.5), ('peak', 3500, 1.0, 2.5), ('highshelf', 9000, 0.7, 3.0)],
       'comp': {'thr': -20, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'room': -14}}
CLAP = {'bus': 'drums', 'gain': -5.0, 'eq': [('hp', 300), ('peak', 1200, 1.0, 2.0)], 'sends': {'hall': -10}}
MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -1.0, 'eq': [('hp', 220), ('peak', 3000, 1.0, 1.5)], 'sends': {'hall': -11, 'delay': -13},
                 'duck': {'by': 'edrums.kick', 'depth_db': 2.0, 'rel_ms': 120}},
        'lead2': {'gain': -6.0, 'width': 1.4, 'eq': [('hp', 250)], 'sends': {'hall': -12}, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0}},
        'pluck': {'pan': 0.15, 'gain': -7.0, 'width': 1.5, 'eq': [('hp', 400)], 'sends': {'delay': -9, 'hall': -13},
                  'duck': {'by': 'edrums.kick', 'depth_db': 3.0}},
        'chords': {'gain': -5.0, 'width': 1.5, 'eq': [('hp', 250), ('lp', 9000)], 'sends': {'hall': -12},
                   'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 160}},
        'pad': {'gain': -4.0, 'width': 1.5, 'eq': [('hp', 150), ('lp', 8000)], 'sends': {'hall': -10},
                'duck': {'by': 'edrums.kick', 'depth_db': 7.0, 'rel_ms': 180}},
        'sub': {'gain': -7.0, 'eq': [('hp', 32), ('lp', 180)], 'mono': True, 'duck': {'by': 'edrums.kick', 'depth_db': 8.0, 'att_ms': 2, 'rel_ms': 140}},
        'bass': {'gain': 0.0, 'eq': [('hp', 50), ('peak', 150, 1.0, 2.0), ('peak', 800, 1.0, 1.0)],
                 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 5, 'rel_ms': 60}, 'duck': {'by': 'edrums.kick', 'depth_db': 5.0, 'rel_ms': 120}},
        'piano': {'pan': -0.15, 'gain': -8.0, 'eq': [('hp', 110), ('peak', 600, 1.0, -2.0), ('peak', 3000, 1.0, 1.5)],
                  'comp': {'thr': -20, 'ratio': 2.5, 'att_ms': 10, 'rel_ms': 120}, 'sends': {'room': -12, 'hall': -14},
                  'duck': {'by': 'edrums.kick', 'depth_db': 2.0}},
        'gtr1': {'pan': -0.6, 'gain': -10.0, **GTR},
        'gtr2': {'pan': 0.6, 'gain': -10.0, **GTR},
        'gtrlead': {'pan': 0.1, 'gain': -4.0, 'eq': [('hp', 150), ('peak', 2500, 1.0, 2.0)], 'comp': {'thr': -20, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100},
                    'sends': {'delay': -10, 'hall': -13}},
        'edrums.kick': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 38), ('peak', 60, 1.0, 1.0), ('peak', 300, 1.2, -3.0), ('peak', 4000, 1.0, 2.0)],
                        'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 250)], 'sends': {'hall': -12}},
        'edrums.hats': {'bus': 'drums', 'gain': -12.0},
        'edrums.fx': {'gain': -8.0, 'width': 1.5, 'sends': {'hall': -10}},
        'drums.kick': {'bus': 'drums', 'gain': -30.0},
        'drums.snare': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 150), ('highshelf', 6000, 0.7, 2.0)], 'sends': {'hall': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 400), ('highshelf', 9000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -14.0, 'eq': [('hp', 200)]},
        'clapL': {**CLAP, 'pan': -0.35},
        'clapR': {**CLAP, 'pan': 0.35},
        'shaker': {'pan': 0.4, 'gain': -11.0, 'eq': [('hp', 2500)]},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 1.5},
    },
    'fx': {
        'hall': {'ir': '2.0s_Space Reverb', 'predelay': 25, 'hp': 450, 'lp': 10000, 'gain': -5.0},
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0,
               'target': [-14.0, -6.5, -7.5, -9.5, -10.0, -10.5, -11.5, -15.0, -19.5]},
}


def shorts():
    """Course-intro pieces from the hook: 6.0 s (the hook's first bar and the last drop's turn over strums, kick and
    claps under a riser, landing on a held G at 3.64 s) and 2.5 s (the turn's climb D-F#-A into a G hit at 0.91 s)."""
    out = {}

    def parts(s):
        P = {k: s.part(k, i, jitter_ms=1.5, mono=(k == 'lead')) for k, i in (
            ('lead', 'ce_lead'), ('pluck', 'ce_pluck'), ('chords', 'ce_chords'), ('pad', 'ce_pad'), ('sub', 'ce_sub'),
            ('bass', 'ce_bass'), ('edrums', 'ce_drums'))}
        P['piano'] = s.part('piano', 'piano', jitter_ms=3)
        P['gtr1'] = s.part('gtr1', 'guitar', jitter_ms=0)
        P['gtr2'] = s.part('gtr2', 'guitar', jitter_ms=0)
        P['drums'] = s.part('drums', 'kit', jitter_ms=2)
        P['clapL'] = s.part('clapL', 'clap', jitter_ms=3)
        P['clapR'] = s.part('clapR', 'clap', jitter_ms=3, lag_ms=9)
        return P

    def land(P, t, beats):
        P['lead'].add(Note(t, beats, 83, 0.85, art={'marc'}))
        P['chords'].add([Note(t, beats, p, 0.7) for p in (67, 71, 74, 79)])
        P['pad'].add([Note(t, beats, p, 0.6) for p in (55, 62, 67, 71)])
        P['piano'].add([Note(t, beats, p, 0.7) for p in (43, 55, 62, 67, 71)])
        P['sub'].add(Note(t, beats, 31, 0.85))
        P['bass'].add(Note(t, 1.0, 43, 0.85))
        P['edrums'].add([Note(t, 1, 'kick', 1.0), Note(t, 2, 'impact', 0.9)])
        P['drums'].add([Note(t, 1, 'crash', 0.9)])

    s = Song('Windmill Run (country EDM) - course intro', 'meadow-run', BPM, 'G major', 4, 0, seed=32, tail_bars=0)
    s.about = "the hook's first bar and the last drop's climb over strums, kick and claps under a riser, landing on a held G chord"
    P = parts(s)
    pr = chords('G | Cadd9 D | G | G', 0)
    P['lead'].add(lines([HOOK[0], HOOK_TURN], 0))
    P['pluck'].add([n.copy(d=min(n.d, 0.5), v=0.5) for n in lines([HOOK[0], HOOK_TURN], 0)])
    P['gtr1'].add(strum(pr, 0, 2, STRUM_DROP, vel=0.68, detune=-0.04, seed=41) + strum(pr, 2, 1, 'D...............', vel=0.7, seed=43, ring=6.0))
    P['gtr2'].add(strum(pr, 0, 2, STRUM_DROP, vel=0.64, detune=0.06, seed=42, spread_ms=10.0) +
                  strum(pr, 2, 1, 'D...............', vel=0.66, detune=0.06, seed=44, spread_ms=10.0, ring=6.0))
    P['chords'].add(comp(pr[:3], 'x--x--x-x--x--x-', 60, 76, n=4, vel=0.55))
    P['bass'].add(lines(["G2:8. G2:8. G2:8 G2:8. G2:8. G3:8", "C3:8. C3:8. C3:8 D3:8. D3:8. D3:8"], 0))
    P['sub'].add([Note(0, 4, 31, 0.8), Note(4, 2, 36, 0.8), Note(6, 2, 38, 0.8)])
    P['edrums'].add(grid('x...x...x...x...|x...x...x...x...', 'kick', 0, vels={'x': 0.9}) + [Note(0, 8.0, 'rise', 0.7)])
    for b in range(2):
        P['clapL'].add(grid('....x.......x...', 'handclap', 4 * b, vels={'x': 0.85}))
        P['clapR'].add(grid('....x.......x...', 'handclap', 4 * b, vels={'x': 0.8}))
        P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', 4 * b, vels={'x': 0.4, 'g': 0.25}))
    P['drums'].add(grid('........xxxxxxxx', 'snare', 4, vels={'x': 0.55}))
    land(P, 8.0, 5.0)
    out['intro-6s'] = (s, 6.0, 8)

    s = Song('Windmill Run (country EDM) - course intro short', 'meadow-run', BPM, 'G major', 2, 0, seed=33, tail_bars=0)
    s.about = "the hook's climb D-F#-A on the lead over strums and a snare run into a G chord hit"
    P = parts(s)
    pr = chords('D G | G', 0)
    P['lead'].add(lines(["D5:8. F#5:8. A5:8 r:2", "r:1"], 0))
    P['pluck'].add([n.copy(v=0.5) for n in lines(["D5:8. F#5:8. A5:8 r:2", "r:1"], 0)])

    def ring_last(ns, t_from, d):
        return [n.copy(d=d) if n.t >= t_from - 0.05 else n for n in ns]
    P['gtr1'].add(ring_last(strum(pr, 0, 1, 'D.DUx.DUD.......', vel=0.62, detune=-0.04, seed=45), 2.0, 3.5))
    P['gtr2'].add(ring_last(strum(pr, 0, 1, 'D.DUx.DUD.......', vel=0.58, detune=0.06, seed=46, spread_ms=10.0), 2.0, 3.5))
    P['drums'].add(grid('....xxxxxxxx....', 'snare', 0, vels={'x': 0.55}))
    P['edrums'].add([Note(0, 2.0, 'rise', 0.6)])
    land(P, 2.0, 3.0)
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

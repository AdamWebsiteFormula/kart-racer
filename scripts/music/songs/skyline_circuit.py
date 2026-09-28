# Skyline Circuit (track skyline-circuit): the finale, an orchestral-funk anthem for cloud islands, airships and sky
# bridges, sunset to starlight. E-flat major, 156 bpm. A full orchestra (strings, horns, trumpets, trombones, tuba,
# timpani, cymbals, harp, glockenspiel, chimes) over a funk rhythm section (drums, bass, guitar chops).
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (timpani and a brass fanfare on the anthem's triplet, the pickup bar) | loop 44:
#   A 8 (the anthem: horns and violins in unison) | A' 8 (the answer, trumpets on top, harmonized)
#   B 8 (C minor drive: string spiccato ostinato, horns' low melody, brass stabs) | C 8 (starlight: G-flat major,
#   violins soar, harp and glockenspiel, half-time) | A'' 12 (the anthem with everything, a four-bar tag ending on the
#   pickup bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import harmonize, comp, pad, shift

STYLE = 'orchestral-funk anthem: strings, horns, trumpets, trombones, tuba, timpani, cymbals, harp, glockenspiel, chimes, funk drums, bass, guitar'
FORM = ['intro 4 (timpani, brass fanfare, pickup bar)', 'A 8 anthem (horns + violins)', "A' 8 answer, trumpets on top",
        'B 8 C minor drive (spiccato ostinato, horn melody)', 'C 8 starlight bridge in G-flat (half-time)',
        "A'' 12 anthem with everything + tag, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 156, 4, 44
A0, A1, B0, C0, A2 = 4, 12, 20, 28, 36

PROG = {
    'intro': 'Eb | Cbmaj7 | Ab Bb | Eb Bb7',
    'A': 'Eb | Bb/D | Cm7 | Abmaj7 | Eb/G | Ab | Fm7 | Bb7sus4 Bb7',
    "A'": 'Eb | Bb/D | Cm7 | Abmaj7 | Fm7 | G7 | Cm7 F7 | Dm7b5 G7',
    'B': 'Cm | Cm | Ab | Ab | Fm | G7 | Cm | Ab7 Db7',
    'C': 'Gbmaj7 | Ebm7 | Cbmaj7 | Db7 | Gbmaj7 | Bbm7 | Cbmaj7 | Abm7 Bb7',
    "A''": 'Eb | Bb/D | Cm7 | Abmaj7 | Eb/G | Ab | Fm7 | Bb7sus4 Bb7 | Ab Bb | Gm7 Cm7 | Fm7 Bb7sus4 | Eb Bb7',
}

ANTHEM = [
    "Bb4:8 Eb5:4. F5:8t G5:8t Ab5:8t Bb5:4~",
    "Bb5:4 Ab5:8 G5:8 F5:4 D5:4",
    "Eb5:8 G5:4. C6:8t Bb5:8t Ab5:8t G5:4",
    "G5:2. Eb5:4",
    "Bb4:8 Eb5:4. F5:8t G5:8t Ab5:8t Bb5:4~",
    "Bb5:4 C6:8 Bb5:8 Ab5:4 Eb5:4",
    "F5:8 Ab5:4. C6:8t Bb5:8t Ab5:8t G5:4",
    "F5:2 D5:4 Bb4:4",
]
ANSWER = [
    "Bb4:8 Eb5:4. F5:8t G5:8t Ab5:8t Bb5:4~",
    "Bb5:4 C6:8 Bb5:8 Ab5:4 F5:4",
    "Eb5:8 G5:4. C6:8t Bb5:8t Ab5:8t G5:4",
    "Ab5:2. G5:4",
    "F5:8 Ab5:4. C6:8t Bb5:8t Ab5:8t F5:4",
    "G5:4. F5:8 D5:4 B4:4",
    "C5:8 Eb5:8 G5:8 C6:8 A5:4 F5:4",
    "Ab5:4 F5:4 D5:4 B4:4",
]
HORNS_B = [
    "C4:4. D4:8 Eb4:4 G4:4", "F4:4. Eb4:8 D4:2", "Eb4:4. F4:8 G4:4 Ab4:4", "Bb4:4. Ab4:8 G4:2",
    "Ab4:4. G4:8 F4:4 C5:4", "B4:2 D5:4 F5:4", "Eb5:2 D5:4 C5:4", "C5:4 Eb5:4 Db5:4 F5:4",
]
STAR = [
    "F5:2. Db5:4", "Gb5:4. F5:8 Db5:4 Bb4:4", "Eb5:2. Gb5:4", "F5:2 Ab5:4 Cb6:4",
    "Bb5:2. Ab5:4", "Db6:4. Bb5:8 Ab5:4 F5:4", "Gb5:2 Eb5:4 Bb4:4", "Cb5:4 Eb5:4 D5:4 F5:4",
]
TAG = ["C6:4. Bb5:8 Bb5:4. Ab5:8", "G5:4. F5:8 G5:4 Bb5:4", "Ab5:2 F5:4 Bb5:4"]
PICKUP = "[Bb4 Eb5 G5]:4^ r:4 F4:8t G4:8t Ab4:8t Bb4:8t C5:8t D5:8t"
FANFARE = ["r:1", "r:2 F5:8t G5:8t Ab5:8t Bb5:4", "C6:2 Bb5:8t Ab5:8t G5:8t F5:4"]


def lines(parts, t0):
    out = []
    for k, s in enumerate(parts):
        ns, _ = seq(s, t0 + 4 * k)
        out += ns
    return out


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Skyline Circuit', 'skyline-circuit', BPM, 'E-flat major', INTRO, LOOP, seed=67)
    P = {}
    for name, inst, lag in (('tpt1', 'trumpet', 4), ('tpt2', 'trumpet', 6), ('horns', 'horn', 8), ('tbn', 'trombone', 7), ('tuba', 'tuba', 6)):
        P[name] = s.part(name, inst, lag_ms=lag, jitter_ms=5, mono=(name in ('tpt1', 'tpt2', 'tuba')))
    P['vln'] = s.part('vln', 'violins', lag_ms=6, jitter_ms=5)
    P['vln2'] = s.part('vln2', 'violins', lag_ms=8, jitter_ms=6)
    P['vla'] = s.part('vla', 'violas', lag_ms=8, jitter_ms=6)
    P['vc'] = s.part('vc', 'celli', lag_ms=7, jitter_ms=6)
    P['timp'] = s.part('timp', 'timpani', jitter_ms=3)
    P['cym'] = s.part('cym', 'cymbals', jitter_ms=2)
    P['bd'] = s.part('bd', 'bassdrum', jitter_ms=2)
    P['harp'] = s.part('harp', 'harp', jitter_ms=2)
    P['glock'] = s.part('glock', 'glock', jitter_ms=2)
    P['chimes'] = s.part('chimes', 'chimes', jitter_ms=2)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3, vel_jitter=0.05, swing=0.52, swing_unit=0.25)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=3, swing=0.52, swing_unit=0.25, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=3, swing=0.52, swing_unit=0.25)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 8), ("A'", 8), ('B', 8), ('C', 8), ("A''", 12)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])

    def funk(bar0, nbars, heavy=False):
        for b in range(nbars):
            bar = bar0 + b
            P['drums'].add(grid('x..x..x...x..x..' if heavy else 'x.....x...x..x..', 'kick', at(bar)) +
                           grid('....X..g.g..X..g', 'snare', at(bar), vels={'g': 0.3}) +
                           grid('xyxyxyxyxyxyxy.y', 'hhc', at(bar), vels={'x': 0.6, 'y': 0.4}) +
                           grid('..............o.', 'hho', at(bar), vels={'o': 0.55}))

    def funk_bass(bar0, nbars):
        out = []
        for b in range(nbars):
            t0 = at(bar0 + b)
            ch = [c for c in allp if c[0] - 1e-9 <= t0 + 0.01 < c[0] + c[1] - 1e-9][0][2]
            ch2 = [c for c in allp if c[0] - 1e-9 <= t0 + 2.01 < c[0] + c[1] - 1e-9][0][2]
            r = 31 + ((ch.bass - 31) % 12)
            r2 = 31 + ((ch2.bass - 31) % 12)
            out += [Note(t0, 0.7, r, 0.85), Note(t0 + 0.75, 0.2, r, 0.6), Note(t0 + 1.5, 0.4, r + 12, 0.7, {'stac'}),
                    Note(t0 + 2, 0.7, r2, 0.8), Note(t0 + 2.75, 0.2, r2, 0.55), Note(t0 + 3.0, 0.45, r2 + 7, 0.65),
                    Note(t0 + 3.5, 0.45, r2 + 10 if ch2.ivs[1:2] and 10 in ch2.ivs else r2 + 12, 0.62)]
        return out

    def chops(bar0, nbars, pat='..x..x.x..x..x.x'):
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(pr, pat, 63, 76, n=3, vel=0.55, dur=0.12, t0=at(bar0), t1=at(bar0 + nbars))])

    def hit(bar, beat=0.0, vel=0.9, big=True):
        P['cym'].add([Note(at(bar) + beat, 2, 'clash' if big else 'susp', vel)])
        P['timp'].add([Note(at(bar) + beat, 1, 39, vel)])
        if big:
            P['bd'].add([Note(at(bar) + beat, 1, 'hit', vel)])

    # ---------------------------------------------------------------- intro
    P['timp'].add([Note(at(0), 4.0, 34, 0.5, set(), {})])
    P['timp'].add([Note(at(0) + 0.25 * k, 0.25, 34, 0.35 + 0.035 * k) for k in range(16)])
    P['cym'].add([Note(at(0), 4.0, 'swell', 0.8)])
    P['tuba'].add([Note(at(0), 3.9, 27, 0.6), Note(at(1), 3.9, 27, 0.65)])
    P['tbn'].add([Note(at(0), 3.9, 39, 0.55), Note(at(1), 3.9, 42, 0.6)])
    P['vla'].add([Note(at(0) + 0.125 * k, 0.125, 63 + (k // 8), 0.35 + 0.01 * k, {'stac'}) for k in range(32)])
    fan = lines(FANFARE, at(0))
    hv = harmonize(fan, allp, 3, drop2=False, key=(3, 'major'))
    P['tpt1'].add(hv[0]); P['tpt2'].add(hv[1]); P['horns'].add(shift(hv[2], 0, -12))
    P['horns'].add(pad(chords('Cbmaj7 | Ab Bb', at(1)), 58, 70, n=3, vel=0.6))
    P['vc'].add(pad(chords('Cbmaj7 | Ab Bb', at(1)), 40, 52, n=1, vel=0.6))
    hit(1, 0, 0.75, big=False)
    P['drums'].add(grid('................|x.....x...x.....|x.....x.x.x.x...', 'kick', at(1)) +
                   grid('................|....x.......x...|....x..x.xxxxxxx', 'snare', at(1), vels={'x': 0.7}))

    def pickup(bar):
        pk = lines([PICKUP], at(bar))
        head = [n for n in pk if n.t < at(bar) + 1]
        run = [n for n in pk if n.t >= at(bar) + 1]
        by = sorted(head, key=lambda n: -n.p)
        P['tpt1'].add(by[0].copy(art=frozenset({'marc'}))); P['tpt2'].add(by[1].copy(art=frozenset({'marc'})))
        P['horns'].add([n.copy(p=n.p - 12, art=frozenset({'marc'})) for n in by])
        P['vln'].add(run + [n.copy(p=n.p + 12) for n in run])
        P['vla'].add(shift(run, 0, -12))
        P['tbn'].add(lines(["[Eb3 G3]:8^ r:8 r:4 [D3 F3]:2"], at(bar)))
        P['tuba'].add(lines(["Eb2:8^ r:8 r:4 Bb1:2"], at(bar)))
        P['vc'].add(lines(["Eb3:8^ r:8 r:4 Bb2:2"], at(bar)))
        P['bass'].add(lines(["Eb2:8^ r:8 r:4 Bb1:8 Bb1:8 Bb2:8 Bb1:8"], at(bar)))
        P['timp'].add([Note(at(bar), 1, 39, 0.9)] + [Note(at(bar) + 2 + 0.25 * k, 0.25, 34, 0.45 + 0.05 * k) for k in range(8)])
        P['cym'].add([Note(at(bar), 2, 'clash', 0.85)])
        P['drums'].add(grid('x...............', 'kick', at(bar)) + grid('........xxxxXxXx', 'snare', at(bar), vels={'x': 0.7}) +
                       grid('........x.x.....', 'tomh', at(bar), vels={'x': 0.7}) + grid('............x.x.', 'toml', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(A2 + 11)
    s.twin(INTRO - 1, A2 + 11)

    # ---------------------------------------------------------------- A: the anthem
    an = lines(ANTHEM, at(A0))
    P['horns'].add(shift(an, 0, -12))
    P['vln'].add(an)
    P['vln2'].add(shift(an, 0, -12, vel=0.8))
    P['vla'].add(pad(prog['A'], 55, 67, n=2, vel=0.5))
    P['vc'].add([n.copy(p=n.p + 12, art=n.art | {'stac'}) for n in funk_bass(A0, 8) if n.d >= 0.4])
    P['tbn'].add(pad(prog['A'], 46, 58, n=2, vel=0.5))
    P['bass'].add(funk_bass(A0, 8))
    funk(A0, 8)
    chops(A0, 8)
    hit(A0, 0, 0.9)
    hit(A0 + 4, 0, 0.75, big=False)
    P['harp'].add([Note(at(A0 + 7) + 2 + k / 8, 0.5, p, 0.5) for k, p in enumerate([58, 63, 67, 70, 75, 79, 82, 87])])

    # ---------------------------------------------------------------- A': the answer, trumpets on top
    ans = lines(ANSWER, at(A1))
    hv = harmonize(ans, allp, 4, drop2=True, key=(3, 'major'))
    P['tpt1'].add(hv[0]); P['tpt2'].add(hv[1]); P['horns'].add(hv[2] + hv[3])
    P['vln'].add(shift(ans, 0, 12, vel=0.8))
    P['vln2'].add(ans)
    P['vla'].add(pad(prog["A'"], 55, 67, n=2, vel=0.5))
    P['tbn'].add(pad(prog["A'"], 46, 58, n=2, vel=0.55))
    P['tuba'].add([n for n in funk_bass(A1, 8) if n.d >= 0.6])
    P['bass'].add(funk_bass(A1, 8))
    funk(A1, 8, heavy=True)
    chops(A1, 8)
    hit(A1, 0, 0.9)
    P['glock'].add([n.copy(p=n.p + 12 if n.p < 84 else n.p, v=0.45, d=0.4) for n in ans if n.d >= 0.9])
    P['drums'].add(grid('x...............', 'crash', at(A1 + 4)) + grid('x.......xxxxxxxx', 'snare', at(A1 + 7), vels={'x': 0.7}))

    # ---------------------------------------------------------------- B: C minor drive
    hb = lines(HORNS_B, at(B0))
    P['horns'].add(hb)
    P['tbn'].add(shift(hb, 0, -12, vel=0.85))
    # string spiccato ostinato: 16ths on the chord tones
    for (st, d, ch) in prog['B']:
        tones = ch.tones(60, 75)
        pat = [tones[0], tones[-1], tones[1], tones[-1]] if len(tones) >= 3 else tones * 2
        for k in range(int(d / 0.25)):
            P['vln2'].add(Note(st + 0.25 * k, 0.22, pat[k % 4], 0.5 + (0.12 if k % 4 == 0 else 0), {'stac'}))
            P['vla'].add(Note(st + 0.25 * k, 0.22, pat[k % 4] - 12, 0.45 + (0.1 if k % 4 == 0 else 0), {'stac'}))
    stabs = comp(prog['B'], '......X.......x.', 67, 79, n=2, vel=0.75, dur=0.25)
    by_t = {}
    for n in stabs:
        by_t.setdefault(round(n.t, 3), []).append(n)
    for tt, ns in by_t.items():
        ns.sort(key=lambda n: -n.p)
        P['tpt1'].add(ns[0].copy(art=frozenset({'marc'}))); P['tpt2'].add(ns[1].copy(art=frozenset({'marc'})))
    for b in range(8):
        tt = at(B0 + b)
        ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
        r = 31 + ((ch.bass - 31) % 12)
        P['bass'].add([Note(tt + 0.5 * k, 0.42, r + (12 if k % 2 else 0), 0.8 if k % 2 == 0 else 0.68) for k in range(8)])
        P['vc'].add([Note(tt, 1.9, r + 12, 0.6), Note(tt + 2, 1.9, r + 12, 0.55)])
        P['drums'].add(grid('x.x...x.x.x...x.', 'kick', at(B0 + b)) + grid('....X.......X...', 'snare', at(B0 + b)) +
                       grid('x.x.x.x.x.x.x.x.', 'ride', at(B0 + b), vels={'x': 0.5}) + grid('......x.......x.', 'tomh', at(B0 + b), vels={'x': 0.5}))
    hit(B0, 0, 0.9)
    hit(B0 + 4, 0, 0.8, big=False)
    P['timp'].add([Note(at(B0 + b), 0.5, 36, 0.7) for b in range(8)] + [Note(at(B0 + b) + 2, 0.5, 36, 0.6) for b in range(8)])
    P['drums'].add(grid('x.......xxxxxxxx', 'snare', at(B0 + 7), vels={'x': 0.7}))

    # ---------------------------------------------------------------- C: starlight (G-flat major, half-time)
    star = lines(STAR, at(C0))
    P['vln'].add([n.copy(art=n.art | ({'vib'} if n.d >= 1.5 else set())) for n in star])
    P['vln2'].add(shift(star, 0, -12, vel=0.7))
    P['vc'].add(pad(prog['C'], 42, 54, n=1, vel=0.55))
    P['vla'].add(pad(prog['C'], 55, 67, n=2, vel=0.45))
    P['horns'].add(pad(prog['C'], 53, 65, n=2, vel=0.45))
    # harp arpeggios across each chord, glockenspiel stars on the offbeats
    for (st, d, ch) in prog['C']:
        tones = ch.tones(54, 84)
        for k in range(int(d / 0.5)):
            P['harp'].add(Note(st + 0.5 * k, 0.9, tones[(k * 2) % len(tones)], 0.42))
        P['glock'].add(Note(st + 1.5, 0.5, ch.tones(84, 96)[0], 0.35))
        P['glock'].add(Note(st + 3.5, 0.5, ch.tones(84, 96)[-1], 0.3))
    for b in range(8):
        P['drums'].add(grid('x.........x.....', 'kick', at(C0 + b)) + grid('........X.......', 'snare', at(C0 + b), vels={'X': 0.8}) +
                       grid('x.x.x.x.x.x.x.x.', 'ride', at(C0 + b), vels={'x': 0.4}))
        tt = at(C0 + b)
        ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
        ch2 = [c for c in allp if c[0] - 1e-9 <= tt + 2.01 < c[0] + c[1] - 1e-9][0][2]
        r = 31 + ((ch.bass - 31) % 12)
        r2 = 31 + ((ch2.bass - 31) % 12)
        P['bass'].add([Note(tt, 1.8, r, 0.75), Note(tt + 2.5, 0.45, r2 + 7, 0.6), Note(tt + 3, 0.9, r2, 0.7)])
    P['chimes'].add([Note(at(C0), 2, 66, 0.6), Note(at(C0 + 4), 2, 70, 0.6)])
    hit(C0, 0, 0.6, big=False)
    P['cym'].add([Note(at(C0 + 7), 4, 'swell', 0.8)])
    P['drums'].add(grid('................', 'kick', at(C0 + 7)) + grid('........xxxxXxXx', 'snare', at(C0 + 7), vels={'x': 0.7}))

    # ---------------------------------------------------------------- A'': the anthem with everything, then the tag
    an2 = lines(ANTHEM, at(A2)) + lines(TAG, at(A2 + 8))
    hv = harmonize(an2, allp, 4, drop2=True, key=(3, 'major'))
    P['tpt1'].add(hv[0]); P['tpt2'].add(hv[1]); P['horns'].add(hv[2] + shift(an2, 0, -12))
    P['tbn'].add(hv[3])
    P['vln'].add(shift(an2, 0, 12, vel=0.85))
    P['vln2'].add(an2)
    P['vla'].add(pad(prog["A''"][:-2], 55, 67, n=2, vel=0.5))
    P['vc'].add([n.copy(p=n.p + 12, art=n.art | {'stac'}) for n in funk_bass(A2, 11) if n.d >= 0.4])
    P['tuba'].add([n for n in funk_bass(A2, 11) if n.d >= 0.6])
    P['bass'].add(funk_bass(A2, 11))
    funk(A2, 11, heavy=True)
    chops(A2, 11)
    P['glock'].add([n.copy(p=n.p + 12 if n.p < 84 else n.p, v=0.45, d=0.4) for n in an2 if n.d >= 0.9])
    for bar in (A2, A2 + 4, A2 + 8):
        hit(bar, 0, 0.95)
    P['chimes'].add([Note(at(A2), 3, 75, 0.6), Note(at(A2 + 8), 3, 68, 0.6)])
    return s


MIX = {
    'tracks': {
        'tpt1': {'bus': 'brass', 'pan': -0.2, 'gain': -1.0, 'eq': [('hp', 200), ('peak', 3000, 1.0, 1.5)], 'sends': {'hall': -10}},
        'tpt2': {'bus': 'brass', 'pan': -0.35, 'gain': -3.0, 'eq': [('hp', 200)], 'sends': {'hall': -10}},
        'horns': {'bus': 'brass', 'pan': 0.3, 'gain': -2.0, 'eq': [('hp', 100), ('peak', 400, 1.0, -1.5)], 'sends': {'hall': -7}},
        'tbn': {'bus': 'brass', 'pan': 0.1, 'gain': -3.0, 'eq': [('hp', 70)], 'sends': {'hall': -10}},
        'tuba': {'bus': 'brass', 'pan': 0.0, 'gain': -5.0, 'eq': [('hp', 35), ('lp', 3000)], 'sends': {'hall': -14}},
        'vln': {'bus': 'strings', 'pan': -0.3, 'gain': -2.0, 'eq': [('hp', 250), ('highshelf', 8000, 0.7, 2.0)], 'sends': {'hall': -6}},
        'vln2': {'bus': 'strings', 'pan': -0.1, 'gain': -4.0, 'eq': [('hp', 220)], 'sends': {'hall': -7}},
        'vla': {'bus': 'strings', 'pan': 0.2, 'gain': -6.0, 'eq': [('hp', 150)], 'sends': {'hall': -7}},
        'vc': {'bus': 'strings', 'pan': 0.35, 'gain': -5.0, 'eq': [('hp', 60)], 'sends': {'hall': -9}},
        'timp': {'pan': -0.1, 'gain': -4.0, 'eq': [('hp', 40)], 'sends': {'hall': -6}},
        'cym': {'pan': 0.25, 'gain': -9.0, 'eq': [('hp', 300)], 'sends': {'hall': -6}},
        'bd': {'pan': 0.0, 'gain': -6.0, 'eq': [('hp', 30), ('lp', 4000)], 'sends': {'hall': -8}},
        'harp': {'pan': -0.4, 'gain': -8.0, 'eq': [('hp', 150)], 'sends': {'hall': -5}},
        'glock': {'pan': 0.4, 'gain': -12.0, 'eq': [('hp', 800)], 'sends': {'hall': -5}},
        'chimes': {'pan': 0.2, 'gain': -10.0, 'eq': [('hp', 300)], 'sends': {'hall': -5}},
        'drums.kick': {'bus': 'drums', 'gain': 1.5, 'eq': [('hp', 32), ('peak', 58, 1.0, 3.0), ('peak', 320, 1.2, -4.5), ('peak', 3500, 1.0, 2.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 2.0), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'hall': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.5)]},
        'drums.room': {'bus': 'drums', 'gain': -9.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'bass': {'gain': -1.0, 'eq': [('hp', 32), ('peak', 85, 1.0, 1.5), ('peak', 250, 1.0, -2.5), ('peak', 1200, 1.2, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 8, 'rel_ms': 100}, 'sat': 2.5},
        'gtr': {'pan': 0.5, 'gain': -11.0, 'eq': [('hp', 350), ('peak', 2800, 1.0, 1.5)], 'sends': {'room': -12}},
    },
    'buses': {
        'brass': {'gain': -1.0, 'eq': [('peak', 450, 0.8, -1.5), ('highshelf', 8000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 15, 'rel_ms': 150}, 'sat': 1.0},
        'strings': {'gain': -1.0, 'eq': [('peak', 350, 0.8, -2.0), ('highshelf', 7000, 0.7, 1.5)], 'comp': {'thr': -20, 'ratio': 2, 'att_ms': 20, 'rel_ms': 200}},
        'drums': {'gain': -1.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 110, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -4.0},
        'hall': {'ir': '3.6s_String Hall', 'predelay': 30, 'hp': 350, 'lp': 9500, 'gain': -4.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 250, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

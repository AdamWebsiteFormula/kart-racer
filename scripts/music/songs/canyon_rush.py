# Mesa Rush (track canyon-rush): surf rock with a mariachi-style trumpet pair, for red-rock desert, rope bridges
# and mine carts. E minor, 176 bpm. A tremolo-picked lead guitar drenched in spring reverb, a rhythm guitar,
# electric bass driving eighths, a surf drummer on the toms, two trumpets in thirds with vibrato, a trombone
# for the low stabs, tambourine. Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (tom roll and a guitar slide, the band's hits, the pickup bar) | loop 48:
#   A 16 (the lead guitar's tune, tremolo-picked) | B 16 (the trumpets take a western melody in thirds)
#   C 8 (the mine-cart break: a driving riff on the low strings and toms, trumpet shakes)
#   A' 8 (the tune with the trumpets in unison an octave down, ending on the pickup bar = intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import harmonize, comp, pad, shift, tremolo

STYLE = 'surf rock with mariachi-style trumpets: tremolo-picked lead guitar with spring reverb, rhythm guitar, bass, surf drums on the toms, two trumpets in thirds, trombone, tambourine'
FORM = ['intro 4 (tom roll, guitar slide, hits, pickup bar)', 'A 16 lead guitar tune (tremolo picked)', 'B 16 trumpets in thirds, western melody',
        'C 8 mine-cart break (low riff, toms, trumpet shakes)', "A' 8 tune with trumpets, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 176, 4, 48
A0, B0, C0, A2 = 4, 20, 36, 44

PROG = {
    'intro': 'Em | Em | C B7 | Em B7',
    'A': 'Em | Em | C | C | Am | Am | B7 | B7 | Em | Em | C | D | Am | B7 | Em | Em',
    'B': 'Am | D7 | G | C | F#m7b5 | B7 | Em | Em | Am | D7 | G | Cmaj7 | Am | B7 | Em | Em',
    'C': 'Em | Em | Em | Em | C | C | B7 | B7',
    "A'": 'Em | Em | C | C | Am | B7 | Em | Em B7',
}

TUNE = [
    "E5:4. D5:8 E5:4 G5:4", "B5:2. A5:8 G5:8", "A5:4. G5:8 E5:4 C5:4", "E5:2. r:4",
    "C5:4. B4:8 C5:4 E5:4", "A5:2 G5:4 F#5:4", "D#5:4 F#5:4 A5:4 B5:4", "B5:2 A5:4 F#5:4",
    "E5:4. D5:8 E5:4 G5:4", "B5:4. C6:8 B5:4 G5:4", "C6:4. B5:8 A5:4 G5:4", "F#5:4. G5:8 A5:4 D5:4",
    "E5:4. F#5:8 G5:4 A5:4", "B5:4 A5:4 G5:4 F#5:4", "E5:1", "r:1",
]
TRUMPETS_B = [
    "r:8 E5:8 A5:8 B5:8 C6:4. B5:8", "A5:4 F#5:4 r:8 D5:8 E5:8 F#5:8", "G5:4. F#5:8 G5:4 B5:4", "E5:2. r:8 E5:8",
    "A5:4. G5:8 F#5:4 E5:4", "D#5:4 F#5:4 B5:4 A5:4", "G5:2. F#5:8 E5:8", "E5:2 r:2",
    "r:8 E5:8 A5:8 B5:8 C6:4. B5:8", "C6:4 A5:4 r:8 F#5:8 G5:8 A5:8", "B5:4. A5:8 G5:4 D5:4", "E5:2. r:8 G5:8",
    "C6:4. B5:8 A5:4 G5:4", "F#5:4 A5:4 B5:4 D#5:4", "E5:2.!vib r:4", "r:1",
]
PICKUP = "E5:8^ r:8 r:4 B4:16 C5:16 C#5:16 D5:16 D#5:8 r:8"   # the lead's bar that ends the intro and the loop
RIFF_C = "E2:8 E2:8 G2:8 E2:8 A2:8 E2:8 Bb2:8 B2:8"


def lines(parts, t0):
    out = []
    for k, s in enumerate(parts):
        ns, _ = seq(s, t0 + 4 * k)
        out += ns
    return out


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Mesa Rush', 'canyon-rush', BPM, 'E minor', INTRO, LOOP, seed=37)
    P = {}
    P['lead'] = s.part('lead', 'guitar', lag_ms=0, jitter_ms=3, vel_jitter=0.06)
    P['rhy'] = s.part('rhy', 'guitar', lag_ms=2, jitter_ms=4)
    P['bass'] = s.part('bass', 'ebass', lag_ms=1, jitter_ms=3, mono=True)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.5, vel_jitter=0.06)
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=4, jitter_ms=5, mono=True)
    P['tpt2'] = s.part('tpt2', 'trumpet', lag_ms=7, jitter_ms=6, mono=True)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=6, jitter_ms=6, mono=True)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=4)
    P['organ'] = s.part('organ', 'combo_organ', jitter_ms=3)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 16), ('B', 16), ('C', 8), ("A'", 8)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])

    # ---------------------------------------------------------------- intro
    P['drums'].add(grid('................|................|x.......x.......', 'kick', at(0)) +
                   grid('xxxxxxxxxxxxxxxx|................|....X.......X...', 'toml', at(0), vels={'x': 0.55}) +
                   grid('................|xxxxxxxxxxxxxxxx|................', 'tomh', at(0), vels={'x': 0.6}) +
                   grid('................|................|x...............', 'crash', at(0)))
    # the surf slide: a low E sliding down, twice
    P['lead'].add([Note(at(0), 3.5, 52, 0.9, {'fall'}, {'fall_st': 19, 'fall_len': 0.9}),
                   Note(at(1), 3.5, 52, 0.9, {'fall'}, {'fall_st': 19, 'fall_len': 0.9})])
    P['bass'].add(lines(["E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8", "E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8 E1:8",
                         "C2:4^ r:4 B1:4^ r:4"], at(0)))
    P['tpt1'].add(lines(["r:1", "r:1", "G5:4^ r:4 F#5:4^ r:4"], at(0)))
    P['tpt2'].add(lines(["r:1", "r:1", "E5:4^ r:4 D#5:4^ r:4"], at(0)))
    P['tbn'].add(lines(["r:1", "r:1", "C4:4^ r:4 B3:4^ r:4"], at(0)))

    def pickup(bar):
        P['lead'].add(tremolo(lines([PICKUP], at(bar)), 0.25))
        P['bass'].add(lines(["E2:8^ r:8 r:4 B1:8 B1:8 B1:8 B1:8"], at(bar)))
        P['rhy'].add(lines(["[E3 B3 E4 G4]:8^ r:8 r:4 [B2 F#3 B3 D#4]:8 r:8 [B2 F#3 B3 D#4]:8 r:8"], at(bar)))
        P['tpt1'].add(lines(["G5:8^ r:8 r:4 r:4 F#5:4!shake"], at(bar)))
        P['tpt2'].add(lines(["E5:8^ r:8 r:4 r:4 D#5:4!shake"], at(bar)))
        P['tbn'].add(lines(["E3:8^ r:8 r:4 r:4 B2:4"], at(bar)))
        P['drums'].add(grid('x.......x.x.x.x.', 'kick', at(bar)) + grid('....x...xxxxxxxx', 'snare', at(bar), vels={'x': 0.75}) +
                       grid('x...............', 'crash', at(bar)))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the lead guitar's tune
    tune = lines(TUNE, at(A0))
    P['lead'].add(tremolo([n for n in tune], 0.25))
    # rhythm guitar: open eighth strums (down-up), chord tones low; bass driving eighths
    def strums(bar0, nbars, pat='x.xxx.xxx.xxx.xx', lo=52, hi=67, vel=0.5):
        P['rhy'].add([n.copy(art=n.art | {'stac'}) for n in comp(allp, pat, lo, hi, n=4, vel=vel, dur=0.2, t0=at(bar0), t1=at(bar0 + nbars))])
    strums(A0, 16)
    def drive(bar0, nbars, vel=0.75):
        out = []
        for b in range(nbars):
            for k in range(8):
                tt = at(bar0 + b) + 0.5 * k
                ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
                r = 40 + ((ch.bass - 40) % 12)
                p = r + (12 if k in (3, 7) and b % 2 else 0)
                out.append(Note(tt, 0.45, p, vel + (0.1 if k % 2 == 0 else 0)))
        return out
    P['bass'].add(drive(A0, 16))
    # drums: the surf beat (floor tom eighths, snare on 2 and 4, kick on 1 and 3)
    for b in range(16):
        bar = A0 + b
        P['drums'].add(grid('x.......x..x....', 'kick', at(bar)) + grid('....X.......X...', 'snare', at(bar)) +
                       grid('x.x.x.x.x.x.x.x.', 'toml', at(bar), vels={'x': 0.45}) +
                       grid('x.x.x.x.x.x.x.x.', 'hhc', at(bar), vels={'x': 0.35}))
        P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.6}))
    P['drums'].add(grid('x...............', 'crash', at(A0)) + grid('x...............', 'crash', at(A0 + 8)) +
                   grid('x.......xxxxxxxx', 'snare', at(A0 + 15), vels={'x': 0.7}))
    # trumpets answer the long notes of the tune in the second half
    P['tpt1'].add(lines(["r:1", "r:2 r:8 E5:8 F#5:8 G5:8", "r:1", "r:2 r:8 A5:8 B5:8 C6:8", "r:1", "r:1", "r:2 E6:4!fall r:4"], at(A0 + 8)))
    P['tpt2'].add(lines(["r:1", "r:2 r:8 C5:8 D5:8 E5:8", "r:1", "r:2 r:8 F#5:8 G5:8 A5:8", "r:1", "r:1", "r:2 B5:4!fall r:4"], at(A0 + 8)))
    P['organ'].add(pad(prog['A'], 59, 71, n=3, vel=0.4))

    # ---------------------------------------------------------------- B: the trumpets' western melody in thirds
    tb = lines(TRUMPETS_B, at(B0))
    tb = [n.copy(art=n.art | {'vib'}) if n.d >= 1.0 else n for n in tb]
    hv = harmonize(tb, allp, 2, drop2=False, key=(4, 'harmonic'))
    P['tpt1'].add(hv[0])
    P['tpt2'].add([n.copy(p=n.p if n.p < hv[0][i].p else n.p - 12) for i, n in enumerate(hv[1])])
    P['tbn'].add(pad(prog['B'], 47, 57, n=1, vel=0.5))
    # guitar under the trumpets: tremolo chords, quiet
    for (st, d, ch) in prog['B']:
        vs = [p for p in ch.tones(59, 71)][:3]
        for p in vs:
            P['lead'].add(tremolo([Note(st, d, p, 0.32)], 0.25))
    strums(B0, 16, 'x..x..x.x..x..x.', 45, 60, vel=0.45)
    P['bass'].add(drive(B0, 16, vel=0.68))
    for b in range(16):
        bar = B0 + b
        P['drums'].add(grid('x.......x.......', 'kick', at(bar)) + grid('....X.......X...', 'snare', at(bar)) +
                       grid('x.x.x.x.x.x.x.x.', 'ride', at(bar), vels={'x': 0.5}))
        P['tamb'].add(grid('..x...x...x...x.', 'Tamb1_Shake', at(bar), vels={'x': 0.45}))
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 8)) +
                   grid('x.......xxxxxxxx', 'snare', at(B0 + 15), vels={'x': 0.7}))

    # ---------------------------------------------------------------- C: the mine-cart break
    for b in range(8):
        semis = {4: -4, 5: -4, 6: -5, 7: -5}.get(b, 0)
        r = shift(lines([RIFF_C], at(C0 + b)), 0, semis)
        P['bass'].add(r)
        P['rhy'].add([n.copy(p=n.p + 12, v=0.55, art=n.art | {'stac'}) for n in r])
        P['drums'].add(grid('x...x...x...x...', 'kick', at(C0 + b)) + grid('..x...x...x...x.', 'snare', at(C0 + b), vels={'x': 0.6}) +
                       grid('xxxxxxxxxxxxxxxx', 'hhc', at(C0 + b), vels={'x': 0.4}) +
                       grid('x.......x.......', 'toml', at(C0 + b), vels={'x': 0.7}))
    P['tpt1'].add(lines(["r:1", "B5:2!shake r:2", "r:1", "C6:2!shake r:2", "r:1", "C6:4^ r:4 C6:4^ r:4", "B5:1!shake", "B5:4^ r:2."], at(C0)))
    P['tpt2'].add(lines(["r:1", "G5:2!shake r:2", "r:1", "A5:2!shake r:2", "r:1", "G5:4^ r:4 G5:4^ r:4", "F#5:1!shake", "F#5:4^ r:2."], at(C0)))
    P['tbn'].add(lines(["E3:4^ r:2.", "r:1", "E3:4^ r:2.", "r:1", "C3:4^ r:4 C3:4^ r:4", "C3:4^ r:4 C3:4^ r:4", "B2:1", "B2:4^ r:2."], at(C0)))
    P['drums'].add(grid('x...............', 'crash', at(C0)) + grid('x...............', 'crash', at(C0 + 4)) +
                   grid('x.......xxxxXxXx', 'snare', at(C0 + 7), vels={'x': 0.75}))

    # ---------------------------------------------------------------- A': the tune with the trumpets
    t2 = lines(["E5:4. D5:8 E5:4 G5:4", "B5:2. A5:8 G5:8", "A5:4. G5:8 E5:4 C5:4", "E5:2. r:4",
                "C5:4. B4:8 C5:4 E5:4", "B5:4 A5:4 G5:4 F#5:4", "E5:1"], at(A2))
    P['lead'].add(tremolo(t2, 0.25))
    P['tpt1'].add(shift([n.copy(art=n.art | ({'vib'} if n.d >= 1 else set())) for n in t2], 0, -12))
    hv = harmonize(shift(t2, 0, -12), allp, 2, drop2=False, key=(4, 'harmonic'))
    P['tpt2'].add([n.copy(p=n.p if n.p < hv[0][i].p else n.p - 12) for i, n in enumerate(hv[1])])
    strums(A2, 7)
    P['bass'].add(drive(A2, 7))
    for b in range(7):
        bar = A2 + b
        P['drums'].add(grid('x.......x..x....', 'kick', at(bar)) + grid('....X.......X...', 'snare', at(bar)) +
                       grid('x.x.x.x.x.x.x.x.', 'toml', at(bar), vels={'x': 0.5}) + grid('x.x.x.x.x.x.x.x.', 'hhc', at(bar), vels={'x': 0.4}))
        P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.6}))
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    P['organ'].add(pad(prog["A'"][:6], 59, 71, n=3, vel=0.4))
    return s


def _combo():
    from studio import synths
    return synths.Organ(drawbars='008808000', perc=None, click=0.1, drive_db=4.0, leslie='slow', gain_db=-8.0)


from studio import instruments as _I
_I.RACK['combo_organ'] = _combo

MIX = {
    'tracks': {
        'lead': {'pan': 0.1, 'gain': -1.0, 'sat': {'drive_db': 7.0, 'mix': 0.6}, 'eq': [('hp', 150), ('peak', 800, 0.8, -2.0), ('peak', 2500, 1.0, 3.0), ('highshelf', 6000, 0.7, 1.5)],
                 'sends': {'spring': -4, 'room': -14}},
        'rhy': {'pan': -0.45, 'gain': -9.0, 'sat': {'drive_db': 5.0, 'mix': 0.5}, 'eq': [('hp', 120), ('peak', 2000, 1.0, 1.5)], 'sends': {'spring': -12, 'room': -12}},
        'bass': {'gain': -1.0, 'eq': [('hp', 35), ('peak', 90, 1.0, 1.5), ('peak', 1200, 1.2, 2.0)], 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 8, 'rel_ms': 100}, 'sat': 3.0},
        'drums.kick': {'bus': 'drums', 'gain': 1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 3.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 2.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 90), ('peak', 200, 1.0, 2.0), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'spring': -16}},
        'drums.oh': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 150), ('peak', 180, 1.0, 2.0), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -7.0, 'eq': [('hp', 100)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'tpt1': {'bus': 'horns', 'pan': -0.2, 'gain': -1.0, 'eq': [('hp', 200), ('peak', 3000, 1.0, 1.5)], 'sends': {'hall': -11}},
        'tpt2': {'bus': 'horns', 'pan': 0.2, 'gain': -3.0, 'eq': [('hp', 200)], 'sends': {'hall': -11}},
        'tbn': {'bus': 'horns', 'pan': 0.05, 'gain': -4.0, 'eq': [('hp', 80)], 'sends': {'hall': -13}},
        'tamb': {'pan': 0.5, 'gain': -14.0, 'eq': [('hp', 3000)], 'sends': {'room': -10}},
        'organ': {'pan': -0.25, 'gain': -20.0, 'eq': [('hp', 250), ('lp', 6000)], 'sends': {'spring': -10}},
    },
    'buses': {
        'horns': {'gain': -1.0, 'eq': [('peak', 450, 0.8, -1.5), ('highshelf', 8000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 15, 'rel_ms': 150}, 'sat': 1.0},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 12, 'rel_ms': 120, 'mix': 0.6}, 'sat': 2.5},
    },
    'fx': {
        'spring': {'ir': '2.5s_Old Vintage', 'predelay': 0, 'hp': 300, 'lp': 7000, 'gain': -2.0},
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -4.0},
        'hall': {'ir': '1.7s_Nice Hall', 'predelay': 25, 'hp': 400, 'lp': 9000, 'gain': -3.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

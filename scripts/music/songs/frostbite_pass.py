# Frostbite Pass (track frostbite-pass): jazz samba with bells for a snowy mountain village and an ice lake.
# A-flat major, 138 bpm. Flute and harmon-muted trumpet in unison on a syncopated melody, a tine electric piano
# comping the partido-alto rhythm, upright bass, a samba kit groove, shaker, agogo, triangle and sleigh bells,
# glockenspiel sparkle, a string pad, a harp glissando into the bridge. Every note is written by hand here.
#
# Form (bars): intro 4 (bells and electric piano, then the groove and the pickup bar) | loop 40:
#   A 8 | A' 8 (the tune twice, the second ending home) | B 8 (the bridge: strings, flute and glockenspiel)
#   C 8 (the trumpet's break over F minor) | A'' 8 (the tune with everything, ending on the pickup bar = intro's last)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import harmonize, comp, pad, shift

STYLE = 'jazz samba with bells: flute and harmon-muted trumpet melody, electric piano, upright bass, samba drums, shaker, agogo, triangle, sleigh bells, glockenspiel, strings, harp'
FORM = ['intro 4 (bells + electric piano, groove, pickup bar)', 'A 8 tune', "A' 8 tune, home cadence", 'B 8 bridge with strings and glockenspiel',
        'C 8 harmon trumpet break over F minor', "A'' 8 tune with everything, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 138, 4, 40
A0, A1, B0, C0, A2 = 4, 12, 20, 28, 36

PROG = {
    'intro': 'Abmaj9 | Dbmaj9 | Abmaj9 | Ab69 Eb13',
    'A': 'Abmaj9 | Fm9 | Bbm9 | Eb13 | Abmaj9 | Dbmaj9 | Gm7b5 C7b9 | Fm9 Bb13',
    "A'": 'Abmaj9 | Fm9 | Bbm9 | Eb13 | Cm7 | F7b9 | Bbm9 Eb13 | Ab69',
    'B': 'Dbmaj9 | Dbm6 | Cm9 | F7#5 | Bbm9 | Eb13 | Abmaj9 | Gm7b5 C7b9',
    'C': 'Fm9 | Bb13 | Fm9 | Bb13 | Dbmaj9 | C7#9 | Fm9 | Bb13 Eb13',
    "A''": 'Abmaj9 | Fm9 | Bbm9 | Eb13 | Cm7 | F7b9 | Bbm9 Eb13 | Ab69 Eb13',
}

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
    "r:8 F5:8 Ab5:8 C6:8 Bb5:8 Ab5:8 F5:8 Eb5:8", "E5:4 G5:4 Bb5:4 Eb5:4",
    "Ab5:2. G5:4", "F5:8 D5:8 Bb4:8 G4:8 C5:8 Db5:8 D5:8 Eb5:8",
]
PICKUP = "Ab5:4^ r:4 r:8 G4:8 Ab4:8 Bb4:8"


def lines(parts, t0):
    out = []
    for k, s in enumerate(parts):
        ns, _ = seq(s, t0 + 4 * k)
        out += ns
    return out


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Frostbite Pass', 'frostbite-pass', BPM, 'A-flat major', INTRO, LOOP, seed=41)
    P = {}
    P['flute'] = s.part('flute', 'flute_vib', lag_ms=3, jitter_ms=5, mono=True)
    P['tpt'] = s.part('tpt', 'trumpet_harmon', lag_ms=5, jitter_ms=5, mono=True)
    P['ep'] = s.part('ep', 'epiano_frost', lag_ms=2, jitter_ms=4, swing=0.53, swing_unit=0.25)
    P['bass'] = s.part('bass', 'upright', lag_ms=0, jitter_ms=4, swing=0.53, swing_unit=0.25)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3.5, vel_jitter=0.07, swing=0.53, swing_unit=0.25)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=4, swing=0.53, swing_unit=0.25)
    P['agogo'] = s.part('agogo', 'agogo', jitter_ms=4, swing=0.53, swing_unit=0.25)
    P['tri'] = s.part('tri', 'triangle', jitter_ms=4, swing=0.53, swing_unit=0.25)
    P['sleigh'] = s.part('sleigh', 'sleigh', jitter_ms=4, swing=0.53, swing_unit=0.25)
    P['glock'] = s.part('glock', 'glock', lag_ms=2, jitter_ms=3)
    P['vln'] = s.part('vln', 'violins', lag_ms=8, jitter_ms=6)
    P['vla'] = s.part('vla', 'violas', lag_ms=8, jitter_ms=6)
    P['harp'] = s.part('harp', 'harp', jitter_ms=2)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=6, jitter_ms=6, mono=True)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 8), ("A'", 8), ('B', 8), ('C', 8), ("A''", 8)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])

    def melody(notes, flute_up=True):
        """Flute and harmon trumpet in unison; the trumpet drops an octave above A5, the flute doubles an octave up
        where the line sits low."""
        P['flute'].add([n.copy(p=n.p + 12) if (flute_up and n.p < 70) else n for n in notes])
        P['tpt'].add([n.copy(p=n.p - 12) if n.p > 81 else n for n in notes])

    # ---------------------------------------------------------------- intro: bells and electric piano, then the groove
    P['ep'].add(comp(prog['intro'][:3], 'x.....x...x.....', 60, 76, n=4, vel=0.55, dur=0.9))
    P['glock'].add(lines(["Eb6:8 C6:8 Ab5:8 Eb6:8 C6:8 Ab5:8 Eb6:4", "F6:8 Db6:8 Ab5:8 F6:8 Db6:8 Ab5:8 F6:4",
                          "Eb6:8 C6:8 Ab5:8 Eb6:8 G6:4 Bb5:4"], at(0)))
    P['sleigh'].add(grid('x...x...x...x...|x...x...x...x...|x.x.x.x.x.x.x.x.', 'Sleighbells_Hit', at(0), vels={'x': 0.5}))
    P['bass'].add(lines(["r:1", "r:1", "Ab1:4. Eb2:8~ Eb2:4. Ab1:8"], at(0)))
    P['drums'].add(grid('................|................|x..x....x..x....', 'kick', at(0)) +
                   grid('................|................|x.x.x.x.x.x.xxxx', 'hhc', at(0), vels={'x': 0.45}))

    def pickup(bar):
        melody(lines([PICKUP], at(bar)), flute_up=False)
        P['ep'].add(lines(["[C4 Eb4 F4 Bb4]:8^ r:8 r:4 [Db4 G4 C5]:4 [Db4 G4 C5]:8 r:8"], at(bar)))
        P["bass"].add(lines(["Ab1:4^ r:4 Eb2:4. G1:8"], at(bar)))
        P['glock'].add(lines(["Ab6:8 r:8 r:4 r:2"], at(bar)))
        P['drums'].add(grid('x.......x..x....', 'kick', at(bar)) + grid('....x...x.x.xxxx', 'snare', at(bar), vels={'x': 0.55}) +
                       grid('x...............', 'crash', at(bar)))
        P['shaker'].add(grid('xgxgxgxgxgxgxgxg', 'LShaker_Shake1D', at(bar), vels={'x': 0.5, 'g': 0.35}))
        P['vln'].add(lines(["r:2 [C5 Eb5]:2"], at(bar)))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- the groove
    def samba_bass(bar0, nbars):
        out = []
        for b in range(nbars):
            t0 = at(bar0 + b)
            ch1 = [c for c in allp if c[0] - 1e-9 <= t0 + 0.01 < c[0] + c[1] - 1e-9][0][2]
            ch2 = [c for c in allp if c[0] - 1e-9 <= t0 + 2.01 < c[0] + c[1] - 1e-9][0][2]
            r1 = 32 + ((ch1.bass - 32) % 12)
            r2 = 32 + ((ch2.bass - 32) % 12)
            f1 = r1 + 7 if r1 + 7 <= 45 else r1 - 5
            if ch2 is ch1:
                out += [Note(t0, 1.4, r1, 0.8), Note(t0 + 1.5, 1.9, f1, 0.7), Note(t0 + 3.5, 0.45, r1, 0.62)]
            else:
                out += [Note(t0, 1.4, r1, 0.8), Note(t0 + 1.5, 0.45, f1, 0.66), Note(t0 + 2, 1.4, r2, 0.78), Note(t0 + 3.5, 0.45, r2 + 7 if r2 + 7 <= 45 else r2 - 5, 0.62)]
        return out

    def groove(bar0, nbars, ride=False, bells=False):
        for b in range(nbars):
            bar = bar0 + b
            P['drums'].add(grid('x..xx..xx..xx..x', 'kick', at(bar), vels={'x': 0.62}) +
                           grid('x..x..x...x..x..', 'xstick', at(bar), vels={'x': 0.6}))
            if ride:
                P['drums'].add(grid('x.xxx.xxx.xxx.xx', 'ride', at(bar), vels={'x': 0.42}))
            else:
                P['drums'].add(grid('ggxgggxgggxgggxg', 'hhc', at(bar), vels={'x': 0.5, 'g': 0.3}))
            P['shaker'].add(grid('xgxgxgxgxgxgxgxg', 'LShaker_Shake1D', at(bar), vels={'x': 0.48, 'g': 0.32}))
            P['agogo'].add(grid('x.x...x.x.x...x.', 'Agogo_High', at(bar), vels={'x': 0.4}) + grid('....x.......x...', 'Agogo_Low', at(bar), vels={'x': 0.42}))
            P['tri'].add(grid('..x...x...x...x.', 'Triangle1_HitM', at(bar), vels={'x': 0.35}))
            if bells:
                P['sleigh'].add(grid('x.x.x.x.x.x.x.x.', 'Sleighbells_Hit', at(bar), vels={'x': 0.38}))

    def ep_comp(bar0, nbars, pat='x..x..x...x..x..', vel=0.55):
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['ep'].add(comp(pr, pat, 58, 74, n=4, vel=vel, dur=0.4, t0=at(bar0), t1=at(bar0 + nbars)))

    # A and A'
    melody(lines(TUNE_A, at(A0)))
    melody(lines(TUNE_A[:4] + TUNE_A2_END, at(A1)))
    for bar0 in (A0, A1):
        P['bass'].add(samba_bass(bar0, 8))
        groove(bar0, 8, ride=False, bells=(bar0 == A1))
        ep_comp(bar0, 8)
    P['drums'].add(grid('x...............', 'crash', at(A0)) + grid('x...............', 'crash', at(A1)) +
                   grid('x.......x.xxxxxx', 'snare', at(A1 + 7), vels={'x': 0.55}))
    P['glock'].add([n.copy(p=n.p + 12, v=0.5, d=0.4) for n in lines(TUNE_A2_END, at(A1 + 4)) if n.d >= 0.5])
    # harp glissando up into the bridge (A-flat major scale, a 32nd apart)
    sc = [56, 58, 60, 61, 63, 65, 67]
    gl = [Note(at(B0) - 1.0 + 1.0 * k / 21, 0.6, sc[k % 7] + 12 * (k // 7), 0.45 + 0.02 * k) for k in range(21)]
    P['harp'].add(gl)

    # B: the bridge
    tb = lines(TUNE_B, at(B0))
    P['flute'].add([n.copy(p=n.p + 12) if n.p < 70 else n for n in tb])
    P['glock'].add([n.copy(p=n.p + 12 if n.p < 84 else n.p, v=0.5, d=0.5) for n in tb])
    P['vln'].add(pad(prog['B'], 65, 77, n=2, vel=0.5))
    P['vla'].add(pad(prog['B'], 55, 65, n=2, vel=0.5))
    P['bass'].add(samba_bass(B0, 8))
    groove(B0, 8, ride=True, bells=True)
    ep_comp(B0, 8, 'x.......x.......', vel=0.5)
    P['tbn'].add(pad(prog['B'], 46, 56, n=1, vel=0.42))
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x.......x..xx.xx', 'snare', at(B0 + 7), vels={'x': 0.55}))

    # C: the trumpet's break over F minor
    P['tpt'].add(lines(SOLO_C, at(C0)))
    P['bass'].add(lines(["F1:8. F1:16 r:8 C2:8 F2:8 Eb2:8 C2:8 Ab1:8", "Bb1:8. Bb1:16 r:8 F2:8 Ab2:8 F2:8 D2:8 B1:8"] * 2 +
                        ["Db2:8. Db2:16 r:8 Ab2:8 F2:8 Db2:8 C2:8 Db2:8", "C2:8. C2:16 r:8 G2:8 E2:8 C2:8 Bb1:8 G1:8",
                         "F1:8. F1:16 r:8 C2:8 F2:8 Eb2:8 C2:8 Ab1:8", "Bb1:8. Bb1:16 r:8 F2:8 Eb2:4 Eb2:8 E2:8"], at(C0)))
    ep_comp(C0, 8, 'x..x..x.x..x..x.', vel=0.58)
    for b in range(8):
        P['drums'].add(grid('x.....x.x.....x.', 'kick', at(C0 + b)) + grid('....X.......X...', 'snare', at(C0 + b), vels={'X': 0.8}) +
                       grid('xgxgxgxgxgxgxgxg', 'hhc', at(C0 + b), vels={'x': 0.5, 'g': 0.3}))
        P['shaker'].add(grid('xgxgxgxgxgxgxgxg', 'LShaker_Shake1D', at(C0 + b), vels={'x': 0.45, 'g': 0.3}))
    P['vln'].add(pad(prog['C'][4:8], 67, 79, n=2, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(C0)) + grid('x...............', 'crash', at(C0 + 4)) +
                   grid('x.......xxxxxxxx', 'snare', at(C0 + 7), vels={'x': 0.6}))

    # A'': the tune with everything
    melody(lines(TUNE_A[:4] + TUNE_A2_END[:3], at(A2)))
    P['glock'].add([n.copy(p=n.p + 12 if n.p < 84 else n.p, v=0.5, d=0.4) for n in lines(TUNE_A[:4] + TUNE_A2_END[:3], at(A2)) if n.d >= 0.5])
    P['bass'].add(samba_bass(A2, 7))
    groove(A2, 7, ride=True, bells=True)
    ep_comp(A2, 7)
    P['vln'].add(pad(prog["A''"][:7], 65, 77, n=2, vel=0.45))
    P['vla'].add(pad(prog["A''"][:7], 55, 65, n=2, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    return s


def _ep():
    from studio import synths
    return synths.EPiano(gain_db=-3.0, release=0.3, bell=0.55, trem=(4.8, 0.3), chorus=True)


from studio import instruments as _I
_I.RACK['epiano_frost'] = _ep

MIX = {
    'tracks': {
        'flute': {'pan': -0.1, 'gain': -1.0, 'eq': [('hp', 250), ('peak', 3000, 1.0, 1.0), ('highshelf', 9000, 0.7, 1.5)], 'sends': {'hall': -9, 'room': -14}},
        'tpt': {'pan': 0.12, 'gain': -2.0, 'eq': [('hp', 250), ('peak', 2000, 1.0, 1.0)], 'sends': {'hall': -10, 'room': -12}},
        'ep': {'pan': -0.2, 'gain': -7.0, 'eq': [('hp', 120), ('peak', 300, 1.0, -2.0), ('highshelf', 5000, 0.7, 1.0)], 'sends': {'room': -10}},
        'bass': {'gain': -1.0, 'eq': [('hp', 35), ('peak', 100, 1.0, 1.5), ('peak', 700, 1.0, 2.0)], 'comp': {'thr': -20, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sat': 2.0},
        'drums.kick': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 2.0), ('peak', 320, 1.2, -4.0), ('peak', 3000, 1.0, 2.0)],
                       'comp': {'thr': -16, 'ratio': 3, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 100), ('highshelf', 6000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'room': -12}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -9.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'shaker': {'pan': 0.45, 'gain': -13.0, 'eq': [('hp', 2500)]},
        'agogo': {'pan': -0.4, 'gain': -15.0, 'eq': [('hp', 600)], 'sends': {'room': -10}},
        'tri': {'pan': 0.55, 'gain': -17.0, 'eq': [('hp', 2000)], 'sends': {'hall': -10}},
        'sleigh': {'pan': 0.35, 'gain': -16.0, 'eq': [('hp', 2500)], 'sends': {'hall': -8}},
        'glock': {'pan': 0.3, 'gain': -11.0, 'eq': [('hp', 800)], 'sends': {'hall': -6}},
        'vln': {'bus': 'strings', 'pan': -0.3, 'gain': -6.0, 'eq': [('hp', 200)], 'sends': {'hall': -6}},
        'vla': {'bus': 'strings', 'pan': 0.3, 'gain': -7.0, 'eq': [('hp', 150)], 'sends': {'hall': -6}},
        'harp': {'pan': -0.35, 'gain': -8.0, 'eq': [('hp', 150)], 'sends': {'hall': -5}},
        'tbn': {'pan': 0.15, 'gain': -9.0, 'eq': [('hp', 90), ('lp', 5000)], 'sends': {'hall': -10}},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 12, 'rel_ms': 120, 'mix': 0.5}, 'sat': 1.5},
        'strings': {'gain': 0.0, 'eq': [('peak', 400, 0.8, -1.5), ('highshelf', 7000, 0.7, 1.5)]},
    },
    'fx': {
        'room': {'ir': '0.7s_Small Studio', 'predelay': 6, 'hp': 350, 'lp': 9000, 'gain': -3.0},
        'hall': {'ir': '2.4s_String Reverb', 'predelay': 30, 'hp': 400, 'lp': 10000, 'gain': -3.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.0},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

# Skyline Circuit, candidate B (track skyline-circuit): a euphoric melodic EDM / trance-flavored anthem for the
# finale, cloud islands and sky bridges from sunset to starlight. E minor with its relative G major, 144 bpm.
# Four-on-the-floor with claps and offbeat open hats, a rolling sixteenth bass under a sine sub (both pumping against
# the kick), sidechained supersaw chords, pluck arpeggios, a seven-voice supersaw lead on the anthem doubled an octave
# down, builds with risers, snare rushes and cymbal swells; in the drops real strings, French horns and timpani
# layer the synths for the finale's scale.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (pad and arpeggio under a riser, the pickup bar) | loop 44:
#   A 8 (the drive: the anthem's call on a pluck lead over the rolling bass) | B 4 (build: snare rush, riser)
#   D 16 (the drop: the anthem on the supersaw lead; strings, horns and timpani join for the second eight)
#   C 8 (starlight: violins and horn sing the anthem slowly over pads, then the build) | D' 8 (the last drop with
#   everything, ending on the pickup bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio import instruments as _I

SLOT, CANDIDATE = 'skyline-circuit', 'b-edm-anthem'
STYLE = ('euphoric melodic EDM / trance anthem: four-on-the-floor, rolling sidechained bass and sub, supersaw chords, pluck '
         'arpeggios, seven-voice supersaw lead doubled an octave down, risers and snare rushes, strings, French horns and timpani in the drops')
FORM = ['intro 4 (pad and arpeggio under a riser, pickup bar)', 'A 8 drive (the anthem call on a pluck over the rolling bass)',
        'B 4 build (snare rush, riser)', 'D 16 drop (anthem on the supersaw; strings, horns, timpani join the second eight)',
        'C 8 starlight (violins and horn sing it slowly, then the build)', "D' 8 last drop with everything, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 144, 4, 44
A0, B0, D0, C0, E0 = 4, 12, 16, 32, 40
LAST = E0 + 7

PROG = {
    'intro': 'Em | Cmaj7 | G | C D',
    'A': 'Em | Em | Cmaj7 | Cmaj7 | G | G | D | Dsus4 D',
    'B': 'Am7 | Am7 | Cmaj7 | D',
    'D': 'Em | C | G | D | Em | C | G | D | Em | C | G | D | Em | C | Am7 | B7sus4 B7',
    'C': 'Cmaj7 | G/B | Am9 | Em | Cmaj7 | D | Am7 | B7sus4 B7',
    "D'": 'Em | C | G | D | Em | C | Am7 B7 | C D',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 4), ('D', 16), ('C', 8), ("D'", 8)]

# the anthem: a sighing call (long, then a turn), an answer that climbs back up, the call a third higher
ANTHEM = [
    "B5:4. A5:8 G5:8 A5:8~ A5:4",
    "G5:8 E5:8~ E5:4 r:8 E5:16 F#5:16 G5:8 B5:8",
    "D6:4. B5:8 A5:8 B5:8~ B5:4",
    "A5:8 F#5:8~ F#5:4 r:8 D5:16 E5:16 F#5:8 A5:8",
    "B5:4. A5:8 G5:8 A5:8~ A5:4",
    "G5:8 E5:8~ E5:4 r:8 E5:16 F#5:16 G5:8 C6:8",
    "D6:4. C6:8 B5:8 G5:8~ G5:4",
    "A5:8 F#5:8~ F#5:4 r:8 F#5:16 G5:16 A5:8 B5:8",
]
ANTHEM_END = ["C6:4. B5:8 A5:8 E5:8~ E5:4", "F#5:2 r:8 D#5:8 E5:8 F#5:8"]   # the drop's last two bars (Am7, B7)
ANTHEM_TURN = "C6:4 B5:8 A5:8 B5:4 A5:8 F#5:8"                          # the last drop's seventh bar (Am7 B7)
DRIVE = [
    "E5:4. D5:8 B4:8 D5:8~ D5:4",
    "r:2 r:8 B4:16 D5:16 E5:8 G5:8",
    "E5:4. D5:8 B4:8 D5:8~ D5:4",
    "r:2 r:8 C5:16 D5:16 E5:8 G5:8",
    "G5:4. F#5:8 D5:8 E5:8~ E5:4",
    "r:2 r:8 D5:16 E5:16 G5:8 B5:8",
    "A5:4. G5:8 F#5:8 E5:8~ E5:4",
    "r:2 D5:8 E5:8 F#5:8 A5:8",
]
BREAK = ["B5:2 A5:4 G5:4", "A5:2. B5:4", "C6:2 B5:4 A5:4", "B5:1"]
RISE = ["G5:1", "A5:1", "C6:1", "B5:2 r:2"]
PICKUP_LEAD = "E5:4^ r:4 r:8 G4:16 A4:16 B4:16 C5:16 D5:16 D#5:16"


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Skyline Circuit (EDM anthem)', 'skyline-circuit', BPM, 'E minor / G major', INTRO, LOOP, seed=613)
    P = {}
    P['lead'] = s.part('lead', 'sk_lead', jitter_ms=1.2, mono=True)
    P['lead2'] = s.part('lead2', 'sk_lead2', jitter_ms=1.2, mono=True)
    P['pluck'] = s.part('pluck', 'sk_pluck', jitter_ms=1.0)
    P['arp'] = s.part('arp', 'sk_arp', jitter_ms=1.0)
    P['chords'] = s.part('chords', 'sk_chords', jitter_ms=1.5)
    P['pad'] = s.part('pad', 'sk_pad', jitter_ms=2)
    P['bass'] = s.part('bass', 'sk_bass', jitter_ms=0.8)
    P['sub'] = s.part('sub', 'sk_sub', jitter_ms=0)
    P['vln'] = s.part('vln', 'violins', lag_ms=6, jitter_ms=5, mono=True)
    P['vla'] = s.part('vla', 'violas', lag_ms=6, jitter_ms=5)
    P['vc'] = s.part('vc', 'celli', lag_ms=6, jitter_ms=5)
    P['horn'] = s.part('horn', 'horn', lag_ms=8, jitter_ms=5, mono=True)
    P['timp'] = s.part('timp', 'timpani', lag_ms=2, jitter_ms=3)
    P['cym'] = s.part('cym', 'cymbals', jitter_ms=2)
    P['edrums'] = s.part('edrums', 'sk_edrums', jitter_ms=0.6, vel_jitter=0.03)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.0, vel_jitter=0.05)
    P['clap'] = s.part('clap', 'clap', jitter_ms=2.5)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def span(bar0, nbars):
        return [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]

    def root(tt, lo=28):
        return lo + ((chord(tt).bass - lo) % 12)

    # ---------------------------------------------------------------- the engine room
    def rolling(bar0, nbars, vel=0.82):
        """The rolling bass: the three sixteenths after every kick, the octave on the middle one."""
        out = []
        for b in range(nbars):
            for k in range(16):
                if k % 4 == 0:
                    continue
                tt = at(bar0 + b) + 0.25 * k
                r = root(tt)
                out.append(Note(tt, 0.2, r + 12 if k % 4 == 2 else r, vel * (0.92 if k % 4 == 3 else 0.8)))
        P['bass'].add(out)

    def sub(bar0, nbars, vel=0.82):
        for (st, d, ch) in span(bar0, nbars):
            P['sub'].add(Note(st, d * 0.97, 28 + ((ch.bass - 28) % 12), vel))

    def arp(bar0, nbars, vel=0.5, lo=64, hi=88, pattern=(0, 1, 2, 3, 2, 1, 2, 3), v_end=None):
        out = []
        for b in range(nbars):
            for k in range(16):
                tt = at(bar0 + b) + 0.25 * k
                tones = chord(tt).tones(lo, hi)[:4]
                v = vel if v_end is None else vel + (v_end - vel) * (tt - at(bar0)) / (4 * nbars)
                out.append(Note(tt, 0.2, tones[pattern[k % len(pattern)] % len(tones)], v * (1.0 if k % 4 == 0 else 0.82)))
        P['arp'].add(out)

    def beat(bar, hats='drop', clap=True, kick=True):
        if kick:
            P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.95}))
        if clap:
            P['edrums'].add(grid('....x.......x...', 'clap', at(bar), vels={'x': 0.72}))
            P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.75}))
            P['drums'].add(grid('....X.......X...', 'snare', at(bar), vels={'X': 0.7}))
        if hats == 'drop':
            P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.45, 'g': 0.28}) +
                           grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.55}))
            P['edrums'].add(grid('..x...x...x...x.', 'ohat', at(bar), vels={'x': 0.5}))
        elif hats == 'drive':
            P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.45, 'g': 0.28}))
            P['edrums'].add(grid('..x...x...x...x.', 'hat', at(bar), vels={'x': 0.5}))

    def chords_pump(bar0, nbars, vel=0.6, lo=55, hi=72):
        P['chords'].add(pad(span(bar0, nbars), lo, hi, n=4, vel=vel, legato=0.96))

    def orchestra(bar0, nbars, melody, vel=0.72):
        """Strings and horns under the synths: violins on the tune, the horn an octave down, violas and celli on the
        chords (celli on the roots in octaves)."""
        P['vln'].add([n.copy(v=vel) for n in melody])
        P['horn'].add([n.copy(p=n.p - 12, v=vel * 0.95) for n in melody if n.d >= 0.45])
        P['vla'].add(pad(span(bar0, nbars), 55, 69, n=3, vel=vel * 0.85))
        for (st, d, ch) in span(bar0, nbars):
            r = 36 + ((ch.bass - 36) % 12)
            P['vc'].add([Note(st, d * 0.97, r, vel * 0.85), Note(st, d * 0.97, r + 12, vel * 0.7)])

    def strings_bed(bar0, nbars, vel=0.55, melody=()):
        """A soft string bed: violas on the chords, celli on the roots, the violins on the tune's long notes."""
        P['vla'].add(pad(span(bar0, nbars), 55, 69, n=3, vel=vel))
        for (st, d, ch) in span(bar0, nbars):
            P['vc'].add(Note(st, d * 0.97, 36 + ((ch.bass - 36) % 12), vel))
        P['vln'].add([n.copy(v=vel) for n in melody if n.d >= 1.0])

    def timp_hit(bar, v=0.85):
        P['timp'].add([Note(at(bar), 1.5, 35 + ((chord(at(bar) + 0.1).bass - 35) % 12), v)])

    # ---------------------------------------------------------------- intro
    P['pad'].add(pad(prog['intro'][:3], 52, 71, n=4, vel=0.55))
    arp(0, 3, vel=0.25, v_end=0.55)
    P['sub'].add([Note(at(2), 3.9, 31, 0.6)])
    P['edrums'].add([Note(at(0), 12.0, 'rise', 0.75)])
    P['drums'].add(grid('................|................|x.......x.x.xxxx', 'snare', at(0), vels={'x': 0.45}))

    def pickup(bar):
        """The bar that ends the intro and the loop: a C chord hit, a D on the and-of-2, a fill, the lead's run up
        (D7 into a D-sharp leading tone) into the drive."""
        P['lead'].add(lines([PICKUP_LEAD], at(bar)))
        P['lead2'].add(shift(lines([PICKUP_LEAD], at(bar)), 0, -12, vel=0.85))
        P['chords'].add([Note(at(bar), 0.5, p, 0.85) for p in (60, 64, 67, 72)] + [Note(at(bar) + 1.5, 1.2, p, 0.85) for p in (62, 66, 69, 74)])
        P['pad'].add([Note(at(bar), 1.4, p, 0.55) for p in (52, 60, 64, 67)] + [Note(at(bar) + 1.5, 2.4, p, 0.55) for p in (54, 62, 66, 69)])
        P['bass'].add([Note(at(bar), 0.4, 36, 0.9), Note(at(bar) + 1.5, 0.9, 38, 0.9)])
        P['sub'].add([Note(at(bar), 1.4, 36, 0.85), Note(at(bar) + 1.5, 2.4, 38, 0.85)])
        P['timp'].add([Note(at(bar), 1.0, 36, 0.8), Note(at(bar) + 1.5, 1.0, 38, 0.8)])
        P['edrums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 1.0}) + [Note(at(bar), 2.0, 'impact', 0.6), Note(at(bar) + 2.0, 2.0, 'rise', 0.55)])
        P['drums'].add(grid('x.....x.........', 'crash', at(bar), vels={'x': 0.75}) + grid('........x.x.xxxx', 'snare', at(bar), vels={'x': 0.62}) +
                       grid('.........x..x...', 'tomh', at(bar), vels={'x': 0.72}) + grid('...........x..x.', 'toml', at(bar), vels={'x': 0.78}))
        P['clap'].add(grid('......x.........', 'handclap', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(LAST)
    s.twin(INTRO - 1, LAST)

    # ---------------------------------------------------------------- A: the drive
    dr = lines(DRIVE, at(A0))
    P['pluck'].add(dr)
    rolling(A0, 8, vel=0.78)
    sub(A0, 8, vel=0.75)
    arp(A0, 8, vel=0.42)
    P['pad'].add(pad(prog['A'], 52, 71, n=4, vel=0.45))
    strings_bed(A0, 8, vel=0.55, melody=dr)
    for b in range(8):
        beat(A0 + b, hats='drive')
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    P['edrums'].add([Note(at(A0), 2.0, 'impact', 0.6)])

    # ---------------------------------------------------------------- B: the build
    rolling(B0, 3, vel=0.8)
    sub(B0, 3, vel=0.75)
    P['bass'].add([Note(at(B0 + 3) + 0.25 * k, 0.2, 38 + (12 if k % 4 == 2 else 0), 0.8) for k in range(12) if k % 4])
    arp(B0, 4, vel=0.4, v_end=0.72)
    P['pad'].add([n.copy(v=0.35 + 0.35 * (n.t - at(B0)) / 16) for n in pad(prog['B'], 52, 71, n=4, vel=1.0)])
    P['lead2'].add(lines(["E5:1", "E5:1", "G5:1", "A5:2. r:4"], at(B0)))
    P['vla'].add([n.copy(v=0.4 + 0.3 * (n.t - at(B0)) / 16) for n in pad(prog['B'], 55, 69, n=3, vel=1.0)])
    P['vc'].add([Note(st, d * 0.97, 36 + ((ch.bass - 36) % 12), 0.4 + 0.3 * (st - at(B0)) / 16) for (st, d, ch) in prog['B']])
    P['vln'].add(lines(["E5:1", "E5:1", "G5:1", "A5:2. r:4"], at(B0)))
    for b in range(4):
        P['edrums'].add(grid('x...x...x...x...' if b < 3 else 'x...x...x.......', 'kick', at(B0 + b), vels={'x': 0.9}))
    P['drums'].add([n.copy(v=0.3 + 0.5 * (n.t - at(B0)) / 16) for n in
                    grid('x.......x.......|x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxx....', 'snare', at(B0), vels={'x': 1.0})])
    P['edrums'].add([Note(at(B0), 15.0, 'rise', 0.95)])
    P['timp'].add([Note(at(B0 + 3) + 0.25 * k, 0.25, 40, 0.3 + 0.05 * k) for k in range(12)])

    # ---------------------------------------------------------------- D: the drop
    an = lines(ANTHEM, at(D0)) + lines(ANTHEM[:6] + ANTHEM_END, at(D0 + 8))
    P['lead'].add(an)
    P['lead2'].add(shift(an, 0, -12, vel=0.85))
    rolling(D0, 16)
    sub(D0, 16)
    arp(D0, 16, vel=0.45)
    chords_pump(D0, 16)
    P['pad'].add(pad(prog['D'], 52, 71, n=4, vel=0.45))
    orchestra(D0, 8, lines(ANTHEM, at(D0)), vel=0.66)
    orchestra(D0 + 8, 8, lines(ANTHEM[:6] + ANTHEM_END, at(D0 + 8)))
    for b in range(16):
        beat(D0 + b)
    for bar in (D0, D0 + 4, D0 + 8, D0 + 12):
        P['drums'].add(grid('x...............', 'crash', at(bar)))
        timp_hit(bar)
    P['edrums'].add([Note(at(D0), 2.0, 'impact', 0.9), Note(at(D0), 1.0, 'boom', 0.7), Note(at(D0 + 8), 2.0, 'impact', 0.75)])
    P['cym'].add([Note(at(D0), 2.0, 'clash', 0.8), Note(at(D0 + 8), 2.0, 'clash', 0.75)])

    # ---------------------------------------------------------------- C: starlight, then the build
    br = lines(BREAK, at(C0))
    P['vln'].add([n.copy(v=0.7) for n in br])
    P['horn'].add([n.copy(p=n.p - 12, v=0.68) for n in br])
    P['pad'].add(pad(prog['C'][:4], 52, 71, n=4, vel=0.6))
    P['vla'].add(pad(prog['C'][:4], 55, 69, n=3, vel=0.55))
    for (st, d, ch) in prog['C'][:4]:
        P['vc'].add(Note(st, d * 0.97, 36 + ((ch.bass - 36) % 12), 0.6))
        P['sub'].add(Note(st, d * 0.97, 28 + ((ch.bass - 28) % 12), 0.55))
    for b in range(4):
        for k in range(8):
            tt = at(C0 + b) + 0.5 * k
            tones = chord(tt).tones(67, 88)[:4]
            P['pluck'].add(Note(tt, 0.3, tones[[0, 2, 1, 3, 2, 0, 3, 1][k] % len(tones)], 0.38))
        P['edrums'].add(grid('x.......x.......', 'kick', at(C0 + b), vels={'x': 0.55}))
        P['drums'].add(grid('..x...x...x...x.', 'hhc', at(C0 + b), vels={'x': 0.35}))
    P['edrums'].add([Note(at(C0), 2.0, 'impact', 0.7), Note(at(C0), 4.0, 'down', 0.6)])
    P['cym'].add([Note(at(C0), 2.0, 'susp', 0.6)])
    # the build
    rs = lines(RISE, at(C0 + 4))
    P['lead2'].add(rs)
    P['vln'].add([n.copy(v=0.72) for n in rs])
    P['vla'].add(pad(prog['C'][4:], 55, 69, n=3, vel=0.6))
    P['pad'].add([n.copy(v=0.4 + 0.3 * (n.t - at(C0 + 4)) / 16) for n in pad(prog['C'][4:], 52, 71, n=4, vel=1.0)])
    rolling(C0 + 4, 3, vel=0.75)
    sub(C0 + 4, 3, vel=0.72)
    arp(C0 + 4, 4, vel=0.35, v_end=0.7)
    for b in range(4):
        P['edrums'].add(grid('x...x...x...x...' if b < 3 else 'x...x...x.......', 'kick', at(C0 + 4 + b), vels={'x': 0.88}))
    P['drums'].add([n.copy(v=0.3 + 0.5 * (n.t - at(C0 + 4)) / 16) for n in
                    grid('x.......x.......|x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxx....', 'snare', at(C0 + 4), vels={'x': 1.0})])
    P['edrums'].add([Note(at(C0 + 4), 15.0, 'rise', 0.95)])
    P['timp'].add([Note(at(C0 + 7) + 0.25 * k, 0.25, 35, 0.3 + 0.05 * k) for k in range(12)])

    # ---------------------------------------------------------------- D': the last drop with everything
    last = lines(ANTHEM[:6] + [ANTHEM_TURN], at(E0))
    P['lead'].add(last)
    P['lead2'].add(shift(last, 0, -12, vel=0.85))
    orchestra(E0, 7, last, vel=0.76)
    rolling(E0, 7)
    sub(E0, 7)
    arp(E0, 7, vel=0.48)
    chords_pump(E0, 7, vel=0.62)
    P['pad'].add(pad(prog["D'"][:-1], 52, 71, n=4, vel=0.45))
    for b in range(7):
        beat(E0 + b)
    for bar in (E0, E0 + 4):
        P['drums'].add(grid('x...............', 'crash', at(bar)))
        timp_hit(bar, 0.9)
    P['edrums'].add([Note(at(E0), 2.0, 'impact', 0.9), Note(at(E0), 1.0, 'boom', 0.7)])
    P['cym'].add([Note(at(E0), 2.0, 'clash', 0.85)])

    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (D0 + 3, 'snare'), (D0 + 7, 'toms'), (D0 + 11, 'snare'), (D0 + 15, 'down'),
                       (E0 + 3, 'toms')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import modern
    _I.RACK['sk_lead'] = lambda: modern.Supersaw(voices=7, detune=20, spread=0.8, cutoff=3000, env_amt=5000, env_decay=0.25, res=0.12,
                                                   attack=0.003, decay=0.5, sustain=0.8, release=0.25, gain_db=-11, vib=(5.3, 0.1, 0.3))
    _I.RACK['sk_lead2'] = lambda: modern.Supersaw(voices=5, detune=12, spread=0.5, cutoff=2200, env_amt=3000, env_decay=0.2, release=0.18, gain_db=-16)
    _I.RACK['sk_chords'] = lambda: modern.Supersaw(voices=7, detune=18, spread=0.9, cutoff=2400, env_amt=2500, env_decay=0.3, decay=0.4, sustain=0.7,
                                                     release=0.15, gain_db=-18)
    _I.RACK['sk_pluck'] = lambda: modern.Pluck(gain_db=-13, cutoff=1500, env_amt=5500, env_decay=0.07, decay=0.25, release=0.06, detune=9, res=0.12, square=0.35)
    _I.RACK['sk_arp'] = lambda: modern.Pluck(gain_db=-16, cutoff=1300, env_amt=5000, env_decay=0.06, decay=0.18, release=0.05, detune=10, res=0.1, square=0.5)
    _I.RACK['sk_bass'] = lambda: modern.Pluck(gain_db=-8, cutoff=420, env_amt=2600, env_decay=0.07, decay=0.2, release=0.03, detune=6, res=0.2, square=0.3)
    _I.RACK['sk_sub'] = lambda: modern.SubBass(gain_db=-9, harm=0.25, release=0.06)
    _I.RACK['sk_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=2000, attack=0.35, release=1.0, voices=5, detune=14, air=0.03, bright=0.8)
    _I.RACK['sk_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.3)
    _I.get.cache_clear()


_instruments()

ORCH = {'bus': 'orch', 'sends': {'hall': -9}}
MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -1.0, 'eq': [('hp', 220), ('peak', 800, 1.0, -2.0), ('peak', 3000, 1.0, 1.5), ('highshelf', 8000, 0.7, 1.5)], 'sends': {'hall': -11, 'delay': -13},
                 'duck': {'by': 'edrums.kick', 'depth_db': 2.0, 'rel_ms': 120}},
        'lead2': {'gain': -6.0, 'width': 1.4, 'eq': [('hp', 180)], 'sends': {'hall': -12}, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0}},
        'pluck': {'pan': 0.1, 'gain': -4.0, 'width': 1.3, 'eq': [('hp', 300)], 'sends': {'delay': -9, 'hall': -12},
                  'duck': {'by': 'edrums.kick', 'depth_db': 2.0}},
        'arp': {'pan': 0.2, 'gain': -8.0, 'width': 1.6, 'eq': [('hp', 400)], 'sends': {'delay': -9, 'hall': -13}, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0}},
        'chords': {'gain': -5.0, 'width': 1.5, 'eq': [('hp', 150), ('peak', 800, 1.0, -1.5), ('lp', 9000)], 'sends': {'hall': -12},
                   'duck': {'by': 'edrums.kick', 'depth_db': 7.0, 'rel_ms': 170}},
        'pad': {'gain': -5.0, 'width': 1.5, 'eq': [('hp', 120), ('lp', 8000)], 'sends': {'hall': -10},
                'duck': {'by': 'edrums.kick', 'depth_db': 7.0, 'rel_ms': 180}},
        'sub': {'gain': -9.0, 'eq': [('hp', 38), ('lp', 180)], 'mono': True, 'duck': {'by': 'edrums.kick', 'depth_db': 9.0, 'att_ms': 2, 'rel_ms': 140}},
        'bass': {'gain': -1.0, 'eq': [('hp', 45), ('peak', 150, 1.0, 1.5), ('peak', 800, 1.0, 1.0)],
                 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 5, 'rel_ms': 60}, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0, 'rel_ms': 100}},
        'vln': {'pan': -0.25, 'gain': -5.0, 'eq': [('hp', 250), ('peak', 3000, 1.0, 1.0)], **ORCH},
        'vla': {'pan': 0.3, 'gain': -9.0, 'eq': [('hp', 180)], **ORCH},
        'vc': {'pan': 0.1, 'gain': -9.0, 'eq': [('hp', 60), ('peak', 250, 1.0, -2.0)], **ORCH},
        'horn': {'pan': -0.1, 'gain': -5.0, 'eq': [('hp', 90), ('peak', 400, 1.0, -1.5)], **ORCH},
        'timp': {'gain': -5.0, 'eq': [('hp', 40), ('peak', 300, 1.0, -2.0)], 'sends': {'hall': -12}},
        'cym': {'gain': -10.0, 'eq': [('hp', 300)], 'sends': {'hall': -12}},
        'edrums.kick': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 36), ('peak', 60, 1.0, 1.0), ('peak', 300, 1.2, -3.0), ('peak', 4000, 1.0, 2.0)],
                        'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 250)], 'sends': {'hall': -12}},
        'edrums.hats': {'bus': 'drums', 'gain': -13.0, 'eq': [('hp', 6000)]},
        'edrums.fx': {'gain': -8.0, 'width': 1.5, 'sends': {'hall': -10}},
        'drums.kick': {'bus': 'drums', 'gain': -30.0},
        'drums.snare': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 150), ('highshelf', 6000, 0.7, 2.0)], 'sends': {'hall': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -3.0, 'eq': [('hp', 400), ('highshelf', 9000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -14.0, 'eq': [('hp', 200)]},
        'clap': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 300), ('peak', 1200, 1.0, 2.0)], 'sends': {'hall': -10}},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 1.5},
        'orch': {'gain': -2.0, 'eq': [('peak', 450, 0.8, -1.5), ('highshelf', 8000, 0.7, 1.0)], 'comp': {'thr': -20, 'ratio': 2, 'att_ms': 20, 'rel_ms': 200}},
    },
    'fx': {
        'hall': {'ir': '2.0s_Space Reverb', 'predelay': 25, 'hp': 450, 'lp': 10000, 'gain': -8.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -8.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0,
               'target': [-14.0, -6.5, -7.5, -9.5, -10.0, -10.5, -11.5, -15.0, -19.5]},
}


def shorts():
    """Course-intro pieces from the anthem: 6.0 s (its first two bars with the drop's band, landing on a held E minor
    chord with the lead on B at 3.33 s) and 2.5 s (a snare roll, timpani roll and riser into an E minor drop hit at 0.83 s)."""
    out = {}

    def parts(s):
        P = {k: s.part(k, i, jitter_ms=1.2, mono=k in ('lead', 'lead2')) for k, i in (
            ('lead', 'sk_lead'), ('lead2', 'sk_lead2'), ('arp', 'sk_arp'), ('chords', 'sk_chords'), ('pad', 'sk_pad'),
            ('bass', 'sk_bass'), ('sub', 'sk_sub'), ('edrums', 'sk_edrums'))}
        P['vln'] = s.part('vln', 'violins', lag_ms=6, jitter_ms=4, mono=True)
        P['vla'] = s.part('vla', 'violas', lag_ms=6, jitter_ms=4)
        P['vc'] = s.part('vc', 'celli', lag_ms=6, jitter_ms=4)
        P['horn'] = s.part('horn', 'horn', lag_ms=8, jitter_ms=4, mono=True)
        P['timp'] = s.part('timp', 'timpani', jitter_ms=2)
        P['cym'] = s.part('cym', 'cymbals', jitter_ms=2)
        P['drums'] = s.part('drums', 'kit', jitter_ms=2)
        P['clap'] = s.part('clap', 'clap', jitter_ms=2.5)
        return P

    def land(P, t, beats, top, chord_ps, bass):
        P['lead'].add(Note(t, beats, top, 0.9, {'acc'}))
        P['lead2'].add(Note(t, beats, top - 12, 0.8))
        P['vln'].add(Note(t, beats, top, 0.8))
        P['horn'].add(Note(t, beats, top - 12, 0.8))
        P['chords'].add([Note(t, beats, p, 0.8) for p in chord_ps])
        P['pad'].add([Note(t, beats, p - 12, 0.6) for p in chord_ps])
        P['vla'].add([Note(t, beats, p, 0.7) for p in chord_ps[:3]])
        P['vc'].add([Note(t, beats, bass + 12, 0.75), Note(t, beats, bass + 24, 0.6)])
        P['sub'].add(Note(t, beats, bass, 0.85))
        P['bass'].add(Note(t, 0.5, bass + 12, 0.9))
        P['timp'].add(Note(t, 2.0, 43 if bass % 12 == 7 else 40, 0.9))
        P['edrums'].add([Note(t, 1, 'kick', 1.0), Note(t, 2, 'impact', 0.9)])
        P['drums'].add([Note(t, 1, 'crash', 0.9)])
        P['cym'].add([Note(t, 2, 'clash', 0.8)])

    s = Song('Skyline Circuit (EDM anthem) - course intro', 'skyline-circuit', BPM, 'E minor / G major', 3, 0, seed=614, tail_bars=0)
    s.about = "the anthem's first two bars over the drop's beat, rolling bass and pumping chords, landing on a held E minor chord with an impact"
    P = parts(s)
    pr = chords('Em | C | G', 0)
    an = lines(ANTHEM[:2], 0)
    P['lead'].add(an)
    P['lead2'].add(shift(an, 0, -12, vel=0.85))
    for k in range(32):
        if k % 4:
            tt = 0.25 * k
            r = 28 + (([c for c in pr if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2].bass - 28) % 12)
            P['bass'].add(Note(tt, 0.2, r + 12 if k % 4 == 2 else r, 0.8))
    P['sub'].add([Note(0, 3.9, 28, 0.8), Note(4, 3.9, 36, 0.8)])
    P['chords'].add(pad(pr[:2], 55, 72, n=4, vel=0.6, legato=0.96))
    for k in range(32):
        tt = 0.25 * k
        ch = [c for c in pr if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
        tones = ch.tones(64, 88)[:4]
        P['arp'].add(Note(tt, 0.2, tones[[0, 1, 2, 3, 2, 1, 2, 3][k % 8] % len(tones)], 0.45 * (1.0 if k % 4 == 0 else 0.82)))
    P['edrums'].add(grid('x...x...x...x...|x...x...x...x...', 'kick', 0, vels={'x': 0.95}) + grid('....x.......x...|....x.......x...', 'clap', 0, vels={'x': 0.72}) +
                    grid('..x...x...x...x.|..x...x...x...x.', 'ohat', 0, vels={'x': 0.5}) + [Note(0, 2.0, 'impact', 0.7), Note(4, 4.0, 'rise', 0.55)])
    P['drums'].add(grid('....X.......X...|....X.......xxxx', 'snare', 0, vels={'X': 0.7, 'x': 0.55}) +
                   grid('xgxgxgxgxgxgxgxg|xgxgxgxgxgxg....', 'hhc', 0, vels={'x': 0.45, 'g': 0.28}) + grid('x...............', 'crash', 0, vels={'x': 0.7}))
    P['clap'].add(grid('....x.......x...|....x.......x...', 'handclap', 0, vels={'x': 0.75}))
    P['timp'].add([Note(0, 1.5, 40, 0.8)])
    land(P, 8.0, 4.0, 83, (64, 67, 71, 76), 28)
    out['intro-6s'] = (s, 6.0, 8)

    s = Song('Skyline Circuit (EDM anthem) - course intro short', 'skyline-circuit', BPM, 'E minor', 2, 0, seed=615, tail_bars=0)
    s.about = 'a snare roll, a timpani roll and a riser under a swelling D chord into the drop: an E minor hit with an impact'
    P = parts(s)
    P['chords'].add([Note(0, 1.9, p, 0.45) for p in (62, 66, 69, 74)])
    P['pad'].add([Note(0, 1.9, p, 0.5) for p in (50, 54, 57, 62)])
    P['vla'].add([Note(0, 1.9, p, 0.5) for p in (57, 62, 66)])
    P['drums'].add([n.copy(v=0.3 + 0.4 * n.t / 2) for n in grid('xxxxxxxxxxxxxxxx', 'snare', 0, steps=32, vels={'x': 1.0})])
    P['timp'].add([Note(0.25 * k, 0.25, 38, 0.35 + 0.06 * k) for k in range(8)])
    P['edrums'].add([Note(0, 2.0, 'rise', 0.7)])
    land(P, 2.0, 3.0, 83, (64, 67, 71, 76), 28)
    P['edrums'].add([Note(2.0, 2.0, 'boom', 0.8)])
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])

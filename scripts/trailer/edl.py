# The trailer's edit, written against the title song's own beat grid (129 BPM, downbeats measured with
# librosa): every cut, caption, flash and sound lands on the music. Writes edl.json for render.mjs + mix.py.
import os, tempfile
import json

DIR = os.environ.get('TRAILER_DIR', os.path.join(tempfile.gettempdir(), 'rascal-trailer'))
# strong beats (bar downbeats) of title.mp3
D = [0.534, 2.392, 4.272, 6.153, 8.011, 9.892, 11.773, 13.653, 15.534, 17.415, 19.273, 21.153, 23.034, 24.915, 26.773,
     28.653, 30.534, 32.415, 34.273, 36.153, 38.034, 39.915, 41.773, 43.654, 45.534, 47.415, 49.296, 51.154, 53.034]
B = 0.4687  # one beat
half = lambda n: D[n] + 2 * B  # the bar's third beat
END = 54.6
FPS = 60

clips, texts, flashes, sfx = [], [], [], []

def clip(src, start, end, inn, **k):
    clips.append({'id': f'c{len(clips):02d}-{src}', 'src': src, 'start': round(start, 3), 'end': round(end, 3), 'in': round(inn, 3), **k})

def text(t, start, end, **k):
    texts.append({'text': t, 'start': round(start, 3), 'end': round(end, 3), **k})

def fx(src, t, gain=0, **k):
    sfx.append({'src': src, 't': round(t, 3), 'gain': gain, **k})

SUN, CORAL, TEAL, PAPER = ['#fff3b0', '#ffd23f', '#f2b705'], ['#ffc1b8', '#ff6f61', '#e84a3d'], ['#b8fff6', '#2ec4b6', '#1a9e92'], '#fffaf0'

# ---- A. the world (0 → 8.01): four places, a cut a bar, letterboxed ----
clip('intro-harbour-loop', 0.0, D[1], 0.05, push=0.05, fadeIn=0.45)
clip('intro-meadow-run', D[1], D[2], 1.22, push=0.04, punch=1.06)            # the giant goose charges the lens
clip('intro-boardwalk-nights', D[2], D[3], 1.65, push=0.04, punch=1.06)      # the neon loop, side on
clip('intro-skyline-circuit', D[3], D[4], 0.15, push=0.05, punch=1.06)       # the cloud islands
text('SIX WILD TRACKS', D[1] + 0.12, D[3] - 0.1, size=150, color=SUN, style='slam', rot=-0.035, y=0.2)
fx('honk', D[1] + 0.55, -3, pan=0.1)                                        # the goose
fx('throw', D[2] - 0.12, -9); fx('throw', D[3] - 0.12, -9)
fx('whaleSong', D[3] + 0.15, -9, pan=-0.3, fadeOut=0.5)

# ---- the racers (8.01 → 12.66): five hero shots, two beats each ----
heroes = [('hero-canyon-side', 0.35), ('hero-frost-low', 0.9), ('hero-skyline-front', 1.0), ('hero-harbor-orbit', 1.35), ('hero-meadow-front', 0.6)]
t = D[4]
cuts = [D[4], D[4] + 2 * B, D[5], D[5] + 2 * B, D[6], 12.66]
for (src, inn), a, b in zip(heroes, cuts, cuts[1:]):
    clip(src, a, b, inn, push=0.035, punch=1.05)
    fx('trail', a - 0.05, -10)
text('EIGHT RASCALS', D[4] + 0.1, D[6] - 0.05, size=150, color=CORAL, style='slam', rot=0.03, y=0.18)
fx('horn-boulder', D[4] + 0.25, -8, pan=0.3); fx('horn-momo', D[4] + 2 * B + 0.2, -8, pan=-0.3)
fx('horn-juniper', D[5] + 0.2, -8, pan=0.3); fx('horn-pip', D[5] + 2 * B + 0.2, -8, pan=-0.2)

# ---- B. the break (12.66 → 15.53): the start lamps, lamp 2 on the "Hey!", GO on the drop ----
GO = D[8]
clip('start', 12.66, 13.58, 0.0, push=0.05, focus=[0.5, 0.25])            # wide: lamp 1
clip('cd-front', 13.58, 14.58, 0.9, push=0.05, punch=1.06)                   # Pip on pole, revving, on the "Hey!": lamp 2
clip('cd-lamps', 14.58, GO + 0.35, 1.946, push=0.08, punch=1.05)             # the lamps close: lamp 3, then green on the drop
clip('start', GO + 0.35, GO + 1.881, 3.22, push=0.04, punch=1.06)            # the pack launches
for i, (n, at) in enumerate([('3', 12.66), ('2', 13.58), ('1', 14.58)]):
    # the "1" sits under the lamps' close-up, so the lamps it counts stay in sight
    text(n, at, at + 0.9 if i < 2 else GO, size=380, color=CORAL, style='slam', y=0.52 if i < 2 else 0.72, drift=0.08, glow='rgba(255,111,97,0.75)')
    fx('count', at, -1)
text('GO!', GO, GO + 1.2, size=400, color=TEAL, style='slam', y=0.7, drift=0.1, glow='rgba(46,196,182,0.8)')
fx('go', GO, 0, duck=5, duckLen=1.0)
fx('boostStart', GO + 0.08, -3)
flashes.append({'t': GO, 'len': 0.28, 'peak': 0.75})

# ---- C. the drop (15.53 → 30.53): racing, drift, the loop, items, creatures ----
clip('drift-boardwalk-nights', D[9], D[9] + 2 * B, 1.0, push=0.03, punch=1.08)
clip('drift-frostbite-pass', D[9] + 2 * B, D[10], 1.2, push=0.03, punch=1.08)
text('DRIFT & BOOST!', D[9] + 0.08, D[10] - 0.05, size=140, color=SUN, style='slam', rot=-0.03, y=0.3)
fx('drift', D[9], -7, len=1.8, fadeOut=0.3); fx('tierUp', D[9] + 0.5, -5); fx('tierUp2', D[9] + 1.2, -5); fx('boost3', D[10] - 0.15, -3)

clip('loop', D[10], D[11], 0.75, speed=1.55, push=0.02, punch=1.06)
fx('loop', D[10] + 0.05, -2, duck=3, duckLen=1.6)
text('LOOP THE LOOP!', D[10] + 0.1, D[11] - 0.05, size=130, color=TEAL, style='slam', rot=0.03, y=0.22)

clip('use-strikeBall', D[11], D[12], 0.42, push=0.03, punch=1.06)
text('13 CRAZY ITEMS', D[11] + 0.1, D[13] - 0.1, size=140, color=CORAL, style='slam', rot=-0.035, y=0.22)
fx('strikeRoll', D[11] + 0.05, 0, duck=3, duckLen=1.5); fx('strike', D[12] - 0.35, -3)
clip('use-bubble', D[12], D[12] + 2 * B, 0.3, push=0.03, punch=1.06); fx('shieldUp', D[12] + 0.03, 0, duck=3, duckLen=0.8); fx('throw', D[12] - 0.1, -8)
clip('use-pogoSpring', D[12] + 2 * B, D[13], 0.5, push=0.03, punch=1.06); fx('boing', D[12] + 2 * B + 0.1, 1, duck=3, duckLen=0.8); fx('throw', D[12] + 2 * B - 0.1, -8)
clip('use-airHorn', D[13], D[13] + 2 * B, 0.42, push=0.03, punch=1.06); fx('airHorn', D[13] + 0.2, -4, duck=3, duckLen=0.8); fx('throw', D[13] - 0.1, -8)
clip('use-tripleFizz', D[13] + 2 * B, D[14], 0.45, push=0.03, punch=1.06); fx('fizz', D[13] + 2 * B + 0.05, 0, duck=3, duckLen=0.8); fx('throw', D[13] + 2 * B - 0.1, -8)

clip('use-windUpMouse', D[14], D[15], 1.25, push=0.04, punch=1.06)           # the giant crab
clip('hero-boardwalk-front', D[15], D[16], 0.1, push=0.04, punch=1.05)       # the kraken behind Nova
text('GIANT CREATURES!', D[14] + 0.1, D[16] - 0.1, size=140, color=SUN, style='slam', rot=0.03, y=0.2)
fx('crabClack', D[14] + 0.6, 1, pan=0.4, duck=3, duckLen=0.8); fx('crabClack', D[14] + 1.2, -2, pan=0.5)
fx('krakenRise', D[15] + 0.05, 0, pan=0.4, duck=3, duckLen=1.2)

# ---- D. the Final Lap Shift (30.53 → 43.65) ----
clip('shift-canyon-rush', D[16], D[18], 0.03, push=0.05)                      # blue sky, then sunset on D[17]
text('EVERY FINAL LAP...', D[16] + 0.1, D[17] - 0.05, size=130, color=PAPER, style='rise', y=0.25)
text('THE TRACK FIGHTS BACK!', D[17], D[18] - 0.05, size=150, color=CORAL, style='slam', y=0.25, glow='rgba(255,111,97,0.7)', rot=-0.02)
fx('finalLap', D[16] + 0.05, -1, duck=4, duckLen=1.8)
fx('shift', D[17] - 0.2, 0, duck=6, duckLen=2.2)
flashes.append({'t': D[17], 'len': 0.35, 'peak': 0.6, 'color': '#ffe0c0'})

clip('hero-storm', D[18], D[20], 0.6, push=0.05, punch=1.05)                 # the storm rolls in over Gus
fx('stomp', D[18] + 1.45, -2, rate=0.7, duck=4, duckLen=1.2)                  # thunder
fx('snowThud', D[18] + 1.5, -6, rate=0.6)
clip('shift-boardwalk-nights', D[20], D[22], 2.2, push=0.05, punch=1.05)    # fireworks finale
for i, (dt, pan) in enumerate([(0.3, -0.5), (0.75, 0.4), (1.3, 0.1), (1.9, -0.3), (2.35, 0.5), (2.9, -0.1), (3.4, 0.3)]):
    fx('pop', D[20] + dt, -6, pan=pan); fx('balloon', D[20] + dt + 0.05, -11, pan=pan)

clip('shift-harbour-loop', D[22], D[23], 0.4, push=0.05, punch=1.05)
clip('win', D[23], D[24], 0.0, push=0.04)                                     # Pip crosses the line
fx('finish', D[23] + 1.55, -2, duck=5, duckLen=2.5)

# ---- E. the payoff (45.53 →): the leap, the podium, the logo ----
clip('win', D[24], D[25], 2.15, push=0.06, punch=1.05)
flashes.append({'t': D[24], 'len': 0.25, 'peak': 0.55})
for dt, pan in [(0.1, -0.4), (0.4, 0.4), (0.7, 0.0)]: fx('pop', D[24] + dt, -8, pan=pan)
fx('horn-pip', D[24] + 0.35, -5)
clip('podium2', D[25], D[26], 1.9, push=0.05, punch=1.05)
for dt, pan in [(0.2, -0.3), (0.6, 0.4), (1.1, -0.1), (1.5, 0.3)]: fx('pop', D[25] + dt, -8, pan=pan)
fx('tierUp3', D[25] + 0.1, -6)

# end card: the Boardwalk flyover, slow, blurred and dimmed under the logo
clip('intro-boardwalk-nights', D[26], END, 0.2, speed=0.45, push=0.06, blur=10, dim=0.35)
logos = [{'start': D[26], 'end': END, 'size': 250, 'y': 0.4, 'hold': True, 'pop': D[28]}]
text('PLAY FREE IN YOUR BROWSER', D[26] + 0.9, END, size=86, color=SUN, style='rise', y=0.79, stroke=0.12)
text('adamwebsiteformula.github.io/kart-racer', D[26] + 1.5, END, size=50, color=PAPER, style='rise', y=0.89, plate='#1b1b2f', stroke=0.1)
fx('boost3', D[26] - 0.1, -1, duck=4, duckLen=1.2); fx('boostTrick', D[26] + 0.02, -4); fx('tierUp3', D[26] + 0.15, -4)
# the button: the song stops dead on the last downbeat with the GO blast, the logo pops
fx('go', D[28], 0); fx('tierUp3', D[28] + 0.05, -5)
flashes.append({'t': D[28], 'len': 0.3, 'peak': 0.5})
flashes.append({'t': D[26], 'len': 0.4, 'peak': 0.8})

edl = {
    'fps': FPS, 'duration': END,
    'clips': clips, 'texts': texts, 'flashes': flashes, 'logos': logos,
    'letterbox': [{'start': 0.0, 'end': 12.4, 'open': 0.5, 'size': 0.095}],
    'fades': [{'start': 0.0, 'end': 0.45, 'to': 'clear'}, {'start': END - 0.5, 'end': END, 'to': 'black'}],
    'audio': {
        'music': [{'src': 'title', 'in': 0.0, 'start': 0.0, 'end': D[28] + 0.12, 'fadeIn': 0.05, 'fadeOut': 0.12, 'gain': 0}],
        'sfx': sfx,
    },
}
json.dump(edl, open(f'{DIR}/edl.json', 'w'), indent=1)
print(f'{len(clips)} clips, {len(texts)} captions, {len(sfx)} sounds, {END} s')
# every caption on screen at least 1.2 s (the countdown numbers excepted)
for x in texts:
    if x['end'] - x['start'] < 1.2 and x['text'] not in ('3', '2', '1'): print('SHORT caption:', x['text'], round(x['end'] - x['start'], 2))

# SOP — Audio

## Purpose
Web Audio bus graph, engine loop crossfade by RPM, drift/boost/item/UI SFX, music with final-lap lift and hit low-pass, positional opponents.

## Inputs
Race events, kart RPM, settings volumes.

## Outputs
Sound.

## Constraints
One AudioContext unlocked on first gesture; master→music/sfx→compressor; music only with commercial rights; credits in CREDITS.md.

## Tests (must pass before merge)
Manual: Safari and Chrome unlock; tab-hidden suspends; final-lap lift audible; sliders persist.

## References
web.dev Racer sound; research plan §7.3–7.4.

## Approach
_Synthesised 23 Sept 2026 from research plan §7.3–7.4, design §5, §11, the web.dev Racer sound case study as summarised in the plan, Starter-Kit-Racing (synthesised engine audio), the ui-hud settings (`masterVolume`, `musicVolume`, `sfxVolume`) and the race-manager and items event unions._

### The decision that shapes everything
**Every sound and every note is synthesised in code with Web Audio.** No sample files, no music files. The plan's music route (buy a month of Suno Pro, or self-host Stable Audio, or fall back to CC-BY) needs money, a GPU or a credit line, and each carries licence risk for a prize entry. Code we write is original and ours: zero licence risk, zero download weight, nothing to put in CREDITS.md. The cost is that the music is chiptune-flavoured rather than recorded brass; the design's ska/funk styles are written as patterns (off-beat skank chords, walking bass, brass-like filtered saw stabs, noise drums).

### The model
`src/audio/` is two layers again.
1. **Pure** (`director.ts`, `music/patterns.ts`, `music/theory.ts`, `engine.ts` maths): events and state → *cues* (plain data: which sound, which racer, what gain and pitch). Unit-tested headless.
2. **Web Audio** (`bus.ts`, `sfx.ts`, `music/player.ts`, `engine.ts` voices): one `AudioContext`, created and resumed on the first user gesture; graph `sources → sfx | music → master → DynamicsCompressor → destination`; the music bus runs through a `BiquadFilter` low-pass that dips to 700 Hz for 0.45 s when the player is hit. Suspended on `visibilitychange` hidden, resumed when visible. Volumes come from the save settings through `setVolumes()`.

**Engine.** The player's engine is two detuned oscillators (saw + square) through a low-pass whose cutoff follows RPM, plus a filtered-noise layer for tyre scrub. RPM is derived from speed over the kart's top speed with a fake gearbox (4 gears, rev drop on upshift) so it sounds like a kart, not a siren. Boost adds a bright layer. Drift screech gain follows lateral slip. The three nearest AI karts get a cheap single-oscillator engine each, stereo-panned and distance-attenuated; the rest are silent.

**SFX** (`sfx.ts`): every effect is a small patch — oscillator type, pitch envelope, gain envelope, optional noise and filter sweep — played through one generic voice. ±3 % seeded pitch variation on repeats (plan §7.4). Cues: countdown (3 low beeps, go high), lap chime, final-lap sting, finish fanfare, balloon pop, coin, roulette tick, item ready, item use per role, hit and spin, shield up/pop, air horn, fog whoosh, boost per source (drift tiers 1/2/3 rise in pitch), drift spark tier-up, hop, landing, wall bump, kart bump, wrong way, position gained/lost, UI move/confirm/back, and a horn per racer (design §5: chirp, purr-rev, chime, whistle, squeak, tick-tock, rumble, foghorn).

**Music** (`music/`): a lookahead scheduler (25 ms timer, 0.12 s horizon, `AudioContext` time) plays patterns of bars. Songs: `title` (sunny, mid-tempo), `race-sunrise` (ska: off-beat chords, walking bass, 150 bpm), `race-summit` (funk), `results` (short loop). **Final-lap lift**: on `phase: finalLap` the race song jumps up a whole tone, gains a lead layer and runs 6 % faster, on the next bar line. Countdown mutes the drums; `go` brings them in.

**Director** (`director.ts`, pure): `(RaceEvent[], ItemEvent[], playerId, UI transitions) → Cue[]`. Only the player's own item, hit, lap, position and wrong-way events are heard at full level; other racers' item uses and hits are heard only when near (distance from the camera kart), at reduced gain.

### Module boundaries (`src/audio/`)
| File | Owns | Test |
|---|---|---|
| `types.ts` | `Cue`, `SfxId`, `SongId` | — |
| `constants.ts` | Gains, envelopes, ranges, scheduler timing | sane |
| `director.ts` | Events → cues, near/far rule | each event maps; far events quiet |
| `engine.ts` | RPM from speed with gears; voice | gear shifts drop RPM; range |
| `music/theory.ts` | Note → frequency, scales, chords | A4 = 440; chord tones |
| `music/patterns.ts` | The songs as data | every bar sums to the time signature; in key |
| `music/player.ts` | Lookahead scheduler, final-lap lift | schedule math with a fake clock |
| `sfx.ts` | Patch table and the generic voice | every `SfxId` has a patch |
| `bus.ts` | Context, unlock, graph, volumes, suspend | fake-context: graph wiring, volume mapping |
| `audio.ts` | `GameAudio`: the facade `main.ts` calls | — |
| `index.ts` | exports | — |

### Tests
1. Director: countdown, go, lap, final lap, finish, balloon, coin, item used, hit, shield, horn, wrong-way, position change each produce the right cue; another racer's hit 100 m away produces nothing, 10 m away a quiet cue.
2. Engine: RPM stays in [idle, redline]; accelerating through gears gives the saw-tooth RPM curve; reverse is idle-ish.
3. Theory: `freq('A4') === 440`, `freq('A5') === 880`; a C major chord is C E G.
4. Patterns: every bar of every song sums to its time signature; every note of every melodic part is in the song's key or marked chromatic.
5. Scheduler: with a fake clock, notes land at `start + beat × 60/bpm`; the final-lap lift starts on the next bar and raises every pitch a whole tone.
6. Bus: with a fake `AudioContext`, the graph is master → compressor → destination, music and sfx feed master, volumes map `master × music` onto the gains, a hidden tab suspends.
7. SFX: every `SfxId` in the union has a patch; every cue the director can emit has a patch.
8. Manual (SOP gate): Safari and Chrome unlock on the first key or click; tab-hidden suspends; the final-lap lift is audible; the sliders persist (they live in the save, ui-hud tested).

## Decisions
_(append dated one-liners as they are made)_
- 2026-09-23: Built. `src/audio/` = `types`, `constants`, `director`, `engine`, `sfx` (46 patches), `bus`, `audio` (GameAudio), `music/{theory,patterns,sequencer,instruments}`. 19 tests. Four original songs: Sunrise ska (F major, 150 bpm, 16 bars), Summit funk (E dorian, 112 bpm, 16 bars), title (G major, 118 bpm), results (C major, 100 bpm).
- 2026-09-23: No sample or music files at all; every sound is code. Nothing to credit, nothing to license, zero download weight.
- 2026-09-23: The ear sits on the camera. Pan uses the screen's right (forward × up), because with a camera looking along +z world +x is on the left of the screen.
- 2026-09-23: Menus play `title`; a race plays its cup song with the drums held until `go`; the results screen plays `results`. Other racers' hops and drifts are silent; their walls, bumps, hits, balloons and item uses are heard when within 45 m.
- 2026-09-23: Checked by rendering offline in the browser: every song peaks 0.43–0.52 with RMS 0.10–0.14 after the bus, every SFX peaks 0.06–0.67. Nothing clips; nothing is silent. The SOP's manual gate (hear it in Safari and Chrome) is still Adam's.
- 2026-09-23: Critique (Codex `gpt-5.5`), all four accepted: the scheduler starts on the context's `statechange` to running, so the first gesture is enough; the final-lap lift lands on the next bar after the event even when the lookahead already booked into it; other racers peak at `otherGain` 0.6 of the player's level; no destructuring swaps in the per-frame engine sort.

- 2026-09-23: Recorded audio from ElevenLabs (scripts/elevenlabs: catalog.ts holds every prompt, generate.ts makes the files and public/audio/manifest.json). 58 sound effects cost 643 credits; 7 songs (9.6 min) with music_v2_5. The synth stays as the fallback for anything missing or not decoded yet.
- 2026-09-23: Every recording is levelled in the browser at decode time (loudest 50 ms for effects, mean for loops and songs), then set by one mix table (samples.ts MIX), so no audio tool is needed offline.
- 2026-09-23: Songs loop on whole bars: the bar is measured from the onsets near the tempo the prompt asked for, the loop ends on the last 4-bar phrase before the fade, and is nudged ±80 ms to line the beats up. The pass before rings on 150 ms past the loop point.
- 2026-09-23: Race songs start on the go, not during the countdown. Final lap: the song stops for the fanfare, then comes back from the top at ×1.06 (a semitone up, the classic lift).
- 2026-09-23: The engine is three recorded loops (idle, mid, high) crossfaded at equal power by rpm, pitched by rpm / band rpm, plus a recorded drift screech (plan §7.4). Rivals use the mid loop, panned.
- 2026-09-23: Every racer has a hit yelp (design §11): creature noises, never words. Only cast racers yelp.
- 2026-09-24: The final-lap fanfare and the music lift play on the player's own last lap (their `lap` event with `isFinal`), not on the shift (the leader's): a trailing player used to hear the fanfare up to 4.8 s early and nothing on their real final lap. The two stay together because `SongPlayer.lift` pauses the song for the fanfare.
- 2026-09-24: Race cues stop when the race screen closes (main.ts calls `audio.tick` only while `racing`): the sim keeps the field driving under the results, GP table and Knockout cut, and its bumps, pads and creatures played on over the results song for as long as it stayed open, up to 8 bumps a second (the engines were already quiet there).
- 2026-09-24: Gained or lost place is measured from the player's grid rank (`newRace(song, trackId, gridRank)` seeds the director from the tracker's `shownRank` at load): with no seed the first pass off the back row played `losePlace` every race.
- 2026-09-24: One `bump` cue per kart contact: collide.ts raises one on each kart, so the player's partner and the second of two other karts (by racer id) stay quiet. The player's rubs no longer thud twice, and the jostle after the go makes half the bonks (it reached 16-22 a second).
- 2026-09-24: Hazard hits with no kart event are heard through `hazardHit`: a bumper car's shove plays `bump`, a rockfall's slow plays `hit` (a spin already plays through its kart `hit`, a vent's launch through its own cue). Both used to be silent.
- 2026-09-24: Seam review: the finish fanfare follows the race's own winning line (`finishLine(config)`, passed by main.ts through `newRace(…, finishLine)`): a Knockout round's cut line, only 1st in its final (the HUD's WIN THE FINAL), else the podium (`AUDIO.podium`, 3). It was top 3 everywhere, so 2nd in the Knockout final heard the victory fanfare and was then shown OUT, and a safe 4th to 6th heard the nice-try jingle before "Safe!". A solo run's one racer is 1st, so Time Trial and Daily keep the fanfare.

- 2026-09-24: `?mute` on the address gives the game a silent bus (AudioBus.silent: no audio context is ever built), so automated browser checks make no sound. Every agent loads the game with it and closes its tabs when done (CLAUDE.md, Browser checks). Why: a hidden test page played the title music at night in Adam's home.
- 2026-09-24: Detail review (no singing, no human voices, a Mario Kart World feel): the `loop` sound no longer asks for a crowd shouting (remade); tests hold every song prompt to "Instrumental, no vocals", every song request to `force_instrumental: true` (catalog `songBody`, the only place generate.ts gets it) and every sound prompt to no crowd, cheer, chant, shout or singing. The seven songs were not remade: they already carry both, and swapping an approved soundtrack unheard was not worth it (Adam's headphone check is the last word). Crossing the line fades the race song (`finishFade`) so the sting plays alone, and the results song waits for its last chord (`STING_SECONDS`). The pause menu drops the music to 30 % behind a 1.2 kHz low-pass (`AUDIO.pause`). New cues, recorded and synth: `hitConfirm` (your item lands on a rival, full level however far, once a tick), `slipstream`, `tierUp2`/`tierUp3` (each spark tier its own zap, pitched ×1 / 1.12 / 1.26) and the `offroad` rumble loop on dirt and mud (synth noise stands in when the loop is missing).
## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_
- 2026-09-23: **Recorded songs came out a third as loud as the synth songs (−9 dB).** Cause: a mastered recording has far more peak for its average than a synth loop, so levelling it to a quiet mean left it thin. Fix: measure both through an AnalyserNode on the music bus with the master at zero, and raise the song target. Rule: level new audio against what it replaces by measurement, with the master muted, never by guesswork.
- 2026-09-23: **Pan was mirrored.** Cause: used the kart's `rightOf` (up × forward = +x at heading 0); the camera's screen right is forward × up, the opposite. Fix: `right = −dx cos h + dz sin h`. Rule: for anything the player hears or sees, derive left/right from the camera, not the kart.
- 2026-09-23: **A sequencer test failed one run in some.** Cause: the window ended exactly on a note, and `beat × 60 / bpm` round-trips with a rounding error either side. Fix: window edges between notes. Rule: never put a test boundary on a grid value that went through floating-point maths.

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

## Lessons (repair loop writes here)
_(error → cause → fix → rule; newest first)_

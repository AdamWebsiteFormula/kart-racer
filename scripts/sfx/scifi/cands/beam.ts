// Tractor Beam (was Grapple Anchor): the lock-on, the hum while it reels in (a new loop id), and the slingshot release.
// Seeker Drone (was Wind-Up Mouse): the launch. Held items: the lock behind the kart, and the block.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, EL, fade, FS, hp, KI, lp, METAL, OUT, pitch, rec, sat, snap, SPRING, syn, thump, trim, TUNNEL, verb } from '../parts.ts';

const BRIEF_LOCK = 'The Tractor Beam fires in a polished cartoon sci-fi kart racer: a quick lock-on as it grabs the kart ahead, then a humming energy beam switching on. Cool and techy, about a second. No voice.';
const BRIEF_BEAM = 'The Tractor Beam reels the player in towards the kart ahead in a polished cartoon sci-fi kart racer: a pulsing energy-beam hum that feels like being pulled, a seamless loop. Alive but not annoying. No voice, no siren.';
const BRIEF_SLING = 'The Tractor Beam lets go and slingshots the player past the kart ahead in a polished cartoon sci-fi kart racer: a snap of released energy and a fast whoosh past with a burst of speed. Exciting, under a second. No voice.';
const BRIEF_DRONE = 'The player launches a Seeker Drone in a polished cartoon sci-fi kart racer: a small hover drone buzzes to life with a little robotic chirp and zips off along the road after rivals. Cute, quick and techy, about a second. No voice.';
const BRIEF_BLOCK = 'An item held behind the kart blocks a shot from behind in a polished cartoon sci-fi kart racer (both are destroyed): a quick clank and energy zap as the shot deflects. Short and crisp. No voice.';
const BRIEF_TRAIL = 'The player holds an item behind the kart as a shield in a polished cartoon sci-fi kart racer: a quick mechanical lock as it clamps into place. Tiny, crisp and satisfying. No voice.';

export const BEAM: Cand[] = [
  // ---------------------------------------------------------------- Tractor Beam: lock on
  {
    id: 'anchor', name: 'anchorA', brief: BRIEF_LOCK,
    what: 'A, lock and beam: one quick target-lock blip, a magnetic "thunk" as the beam grabs, then the beam swelling on: a real force field\'s hum with a synthesized pulsing hum and an endlessly rising Shepard tone inside it (the pull).',
    why: 'A real force field (LilMati, CC0) and Kenney\'s metal impact (CC0); synthesis for the hum (additive, pulsing) and the Shepard-Risset rise.',
    layers: [
      syn('beeps', { seconds: 0.1, notes: [[0, 1760, 0.035, 1]], wave: 'sine', blip: 2, harmonics: [[2, 0.1]] }, -10),
      rec(KI('impactMetal_light_001.ogg'), -9, [pitch(-5), lp(4000)], 0.06),
      thump(-7, 140, 60, 0.08, 0.06),
      rec(FS(702771), -5, [trim(0.0, 1.3), hp(80), fade(0.05, 0.3)], 0.08),
      syn('hum', { seconds: 1.2, seed: 191, hz: 98, partials: 14, tilt: 1.1, voices: 3, detune: 10, pulse: [10, 0.35], env: [[0, 0], [0.12, 1], [0.8, 0.8], [1.18, 0]] }, -6,
        [{ op: 'phaser', rate: 1.5, lo: 300, hi: 3000, stages: 6, fb: 0.4, mix: 0.35 }], 0.08),
      syn('shepard', { seconds: 1.2, seed: 192, rate: 1.2, center: 900, spread: 1.3, fifth: 0.3, env: [[0, 0], [0.2, 1], [0.9, 0.7], [1.18, 0]] }, -12, [], 0.08),
    ],
    master: [hp(50), verb(0.6, 0.12), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'anchor', name: 'anchorB', brief: BRIEF_LOCK,
    what: 'B, magnetic clamp: a real heavy "ka-chunk" and servo as the beam\'s clamp fires, an electric crackle as it connects, and a deep beam hum pulsing on.',
    why: 'Real mechanics (Mish7913\'s metal clank, Burningmonkey\'s servo, CC0), a synthesized arc and pulsing hum.',
    layers: [
      rec(FS(741351), 0, [trim(0.2, 0.7), hp(120), fade(0.001, 0.2)]),
      rec(FS(322021), -9, [trim(0.15, 0.5), hp(300), fade(0.005, 0.1)], 0.04),
      syn('arc', { seconds: 0.35, seed: 193, buzz: 130, hum: 0.2, sparks: 0.8, intensity: [[0, 1], [0.33, 0]] }, -9, [], 0.05),
      syn('hum', { seconds: 1.1, seed: 194, hz: 98, partials: 16, tilt: 1.0, voices: 3, detune: 10, pulse: [8, 0.4], buzz: 0.15, env: [[0, 0], [0.15, 1], [0.8, 0.8], [1.08, 0]] }, -4, [], 0.1),
    ],
    master: [hp(45), verb(0.5, 0.1), comp(-14, 2.5), ...cap(1.25, 0.4), OUT],
  },
  {
    id: 'anchor', name: 'anchorC', brief: BRIEF_LOCK,
    what: 'C, energy grab: a bright electric zap as the beam fires, a real force field swelling, and a resonant wobble settling into the hum.',
    why: 'A real zap (JoelAudio, CC0) and a real force field (LilMati, CC0); synthesis for the wobbling hum.',
    layers: [
      rec(FS(136542), -3, [trim(0, 0.25), hp(500), fade(0.001, 0.1)]),
      rec(FS(702772), -2, [trim(0.0, 1.2), hp(80), fade(0.08, 0.3)], 0.02),
      syn('hum', { seconds: 1.1, seed: 195, hz: [[0, 130], [0.3, 110]], partials: 12, tilt: 1.1, voices: 3, detune: 12, pulse: [[[0, 18], [1.0, 7]], 0.5], env: [[0, 0], [0.05, 1], [0.8, 0.7], [1.08, 0]] }, -5, [], 0.03),
    ],
    master: [hp(45), verb(0.5, 0.12), comp(-14, 2.5), ...cap(1.25, 0.4), OUT],
  },
  // ---------------------------------------------------------------- Tractor Beam: reeling in (new loop id: beamLoop)
  {
    id: 'beamLoop', name: 'beamLoopA', brief: BRIEF_BEAM, loop: 2.0, xfade: 0.1,
    what: 'A, endless pull: a Shepard-Risset tone that seems to rise for ever (two octaves a loop, so the loop never "restarts"), inside a pulsing beam hum.',
    why: 'Synthesis: the Shepard-Risset glissando (sine voices an octave apart under a fixed bell) is the classic sound of endless ascent; the hum and its pulse are whole cycles of the 2 s loop.',
    layers: [
      syn('shepard', { seconds: 2.2, seed: 201, rate: 1.0, center: 700, spread: 1.3, fifth: 0.3 }, -2),
      syn('hum', { seconds: 2.2, seed: 202, hz: 110, period: 2.0, partials: 12, tilt: 1.2, voices: 3, detune: 0.5, pulse: [10, 0.3] }, -7),
    ],
    master: [hp(60), lp(9000), OUT],
  },
  {
    id: 'beamLoop', name: 'beamLoopB', brief: BRIEF_BEAM, loop: 2.0, xfade: 0.1,
    what: 'B, magnetic hum: a real oscillating energy loop with a deep pulsing magnetic hum under it.',
    why: 'A real "oscillating energy" recording (cabled_mess, CC0) for its movement; the hum synthesized to whole cycles of the loop.',
    layers: [
      rec(FS(351446), 0, [trim(4.0, 6.2), hp(60)]),
      syn('hum', { seconds: 2.2, seed: 203, hz: 73.5, period: 2.0, partials: 16, tilt: 1.0, voices: 3, detune: 0.5, pulse: [7, 0.35], buzz: 0.15 }, -6),
    ],
    master: [hp(45), OUT],
  },
  {
    id: 'beamLoop', name: 'beamLoopC', brief: BRIEF_BEAM, loop: 2.0, xfade: 0.1,
    what: 'C, energy tether: a real energy drone with an electric arc buzzing through it and a quick tremolo, like a live wire under tension.',
    why: 'A real energy drone (cabled_mess, CC0); a synthesized arc and tremolo at whole cycles of the loop.',
    layers: [
      rec(FS(351453), 0, [trim(6.0, 8.2), hp(60)]),
      syn('arc', { seconds: 2.2, seed: 204, buzz: 150, hum: 0.6, sparks: 0.25, rate: 20, intensity: 1.0 }, -8, [{ op: 'tremolo', rate: 8, depth: 0.3, stereo: 0.3 }]),
    ],
    master: [hp(45), OUT],
  },
  // ---------------------------------------------------------------- Tractor Beam: the slingshot
  {
    id: 'slingshot', name: 'slingshotA', brief: BRIEF_SLING,
    what: 'A, release and whoosh: the beam lets go with a bright falling "pyoo", then a real big whoosh tears past (Doppler) with a burst of the boosts\' flame.',
    why: 'A real big swoosh (Electroviolence, CC0) moved past the ear; the flame is the game\'s own steam-vent take pitched down (the boost family); the release zap synthesized.',
    layers: [
      syn('zap', { seconds: 0.1, seed: 211, hz: [[0, 1800], [0.08, 500]], index: [[0, 1.2], [0.08, 0]], ratio: 2, voices: 2, detune: 8, env: [[0, 0], [0.002, 1], [0.09, 0]] }, -7),
      rec(FS(234547), 0, [trim(0.15, 0.7), hp(150), fade(0.003, 0.2), { op: 'doppler', speed: 35, dist: 1.5, at: 0.18, pan: 0.7 }]),
      rec(EL('steamVent'), -6, [pitch(-4), lp(6000), { op: 'env', pts: [[0, 1], [0.05, 0.8], [0.3, 0.3], [0.6, 0]] }, trim(0, 0.7)], 0.01),
      thump(-9, 120, 50, 0.1),
    ],
    master: [hp(45), sat(1.3, 0.2), comp(-14, 2.5), ...cap(0.9, 0.3), OUT],
  },
  {
    id: 'slingshot', name: 'slingshotB', brief: BRIEF_SLING,
    what: 'B, energy twang: the beam snaps like a spring (a dispersive "twang"), a quick whoosh flies past and a small kick.',
    why: 'Synthesis for the twang (a dispersive spring chirp), a real quick whoosh (florianreichel, CC0).',
    layers: [
      syn('laser', { seconds: 0.6, seed: 212, sections: 700, coef: -0.8, bright: 9000, echoes: [1, 0.06, 0.3], lo: 200 }, 0),
      rec(FS(683101), -4, [hp(400), fade(0.003, 0.1), { op: 'doppler', speed: 30, dist: 1.2, at: 0.08, pan: 0.7 }], 0.03),
      thump(-7, 130, 55, 0.1),
    ],
    master: [hp(50), conv(SPRING, 0.12, { decay: 0.4 }), comp(-14, 2.5), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'slingshot', name: 'slingshotC', brief: BRIEF_SLING,
    what: 'C, magnetic launch: a quick upward swoop as the beam flings you, a bright electric crack at the release and a jet whoosh past.',
    why: 'A real jet pass-by whoosh (Nox_Sound, CC0) and a real zap (JoelAudio, CC0); a synthesized fast Shepard swoop.',
    layers: [
      syn('shepard', { seconds: 0.25, seed: 213, rate: 4.0, center: 1200, spread: 1.2, env: [[0, 0], [0.02, 1], [0.24, 0]] }, -6),
      rec(FS(136542), -6, [trim(0, 0.15), hp(800), fade(0.001, 0.06)]),
      rec(FS(623015), 0, [trim(0.9, 2.0), hp(100), fade(0.005, 0.35)]),
    ],
    master: [hp(45), comp(-14, 2.5), ...cap(0.9, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Seeker Drone
  {
    id: 'mouse', name: 'mouseA', brief: BRIEF_DRONE,
    what: 'A, quadcopter launch: a real little quadcopter spinning up and flying off, with a quick robotic chirp as it locks onto its target.',
    why: 'A real quadcopter drone (qubodup, CC0); the chirp synthesized (three rising blips, sine with a chirpy onset).',
    layers: [
      rec(FS(854356), 0, [trim(0.1, 1.7), hp(100), fade(0.003, 0.4)]),
      syn('beeps', { seconds: 0.3, notes: [[0.02, 2093, 0.03, 1], [0.07, 2637, 0.03, 1], [0.12, 3136, 0.05, 1]], wave: 'sine', blip: 3 }, -14),
    ],
    master: [hp(80), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'mouse', name: 'mouseB', brief: BRIEF_DRONE,
    what: 'B, drone zip: a real small flight drone revving up and whooshing away, a servo tick as it drops, and a chirp.',
    why: 'A real electronic flight drone (qubodup, CC0) and a real servo (JoontheFloof, CC0); the chirp synthesized.',
    layers: [
      rec(FS(740244), -8, [trim(0.12, 0.4), hp(500), fade(0.002, 0.08)]),
      rec(FS(741030), -2, [trim(0.05, 0.7), hp(120), fade(0.005, 0.2)], 0.03),
      rec(FS(741031), 0, [trim(0.05, 1.3), hp(120), fade(0.005, 0.4)], 0.35),
      syn('beeps', { seconds: 0.2, notes: [[0.05, 2349, 0.03, 1], [0.1, 3136, 0.04, 1]], wave: 'sine', blip: 3 }, -15),
    ],
    master: [hp(80), comp(-14, 2.5), ...cap(1.35, 0.4), OUT],
  },
  {
    id: 'mouse', name: 'mouseC', brief: BRIEF_DRONE,
    what: 'C, synth seeker: a synthesized four-rotor drone spinning up from a stop and flying off past you (Doppler), with a real quadcopter\'s air under it and a chirp.',
    why: 'Synthesis for the rotors (four buzzing blade-pass tones, each trimmed by a flight controller) moved past the ear; a real quadcopter fly-by (qubodup, CC0) for air.',
    layers: [
      syn('rotor', { seconds: 1.3, seed: 221, hz: [[0, 60], [0.25, 230], [1.3, 270]], harm: 10, tilt: 1.2, whine: [8, 0.12], air: 0.2, env: [[0, 0], [0.06, 1], [0.8, 0.8], [1.28, 0]] }, 0,
        [{ op: 'doppler', speed: 20, dist: 1.2, at: 0.4, pan: 0.7 }]),
      rec(FS(854352), -10, [trim(0.8, 2.0), hp(200), fade(0.05, 0.4)], 0.1),
      syn('beeps', { seconds: 0.2, notes: [[0.03, 2093, 0.03, 1], [0.08, 2793, 0.04, 1]], wave: 'sine', blip: 3 }, -15),
    ],
    master: [hp(80), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  // ---------------------------------------------------------------- held items
  {
    id: 'blocked', name: 'blockedA', brief: BRIEF_BLOCK,
    what: 'A, deflect clank: a bright metal clank as the shot hits the held item, a sharp electric zap and a few sparks.',
    why: 'Kenney\'s metal impact (CC0), a real zap (JoelAudio, CC0), synthesized sparks.',
    layers: [
      rec(KI('impactMetal_medium_002.ogg'), 0, [pitch(2)]),
      rec(FS(136542), -6, [trim(0, 0.14), hp(800), fade(0.001, 0.06)]),
      syn('crackle', { seconds: 0.25, seed: 231, rate: 200, lo: 2500, hi: 10000, decay: 0.0015, spread: 12, width: 0.8, env: [[0, 1], [0.24, 0]] }, -12),
    ],
    master: [hp(120), verb(0.35, 0.1), ...cap(0.5, 0.2), OUT],
  },
  {
    id: 'blocked', name: 'blockedB', brief: BRIEF_BLOCK,
    what: 'B, force-field knock: a real force field being struck, its resonance wobbling, with a small zap.',
    why: 'A real force-field knock (modusmogulus, CC0) cut short, a real zap (JoelAudio, CC0).',
    layers: [
      rec(FS(787866), 0, [trim(0.03, 0.55), fade(0.001, 0.2)]),
      rec(FS(136542), -8, [trim(0, 0.12), hp(1000), fade(0.001, 0.05)]),
    ],
    master: [hp(100), ...cap(0.5, 0.2), OUT],
  },
  {
    id: 'blocked', name: 'blockedC', brief: BRIEF_BLOCK,
    what: 'C, shield tink: a bright struck-metal "tink" with a falling ring and a fizzle of sparks.',
    why: 'Synthesis (a struck resonator bending down, a crackle) in a metal impulse response made in code.',
    layers: [
      syn('ring', { seconds: 0.4, seed: 232, hz: [[0, 3136], [0.3, 2600]], modes: [[1, 1, 0.12], [2.32, 0.4, 0.07], [4.25, 0.25, 0.04]], strike: 0.001, hardness: 12000, detune: 0 }, 0),
      syn('crackle', { seconds: 0.2, seed: 233, rate: 220, lo: 2500, hi: 10000, decay: 0.0015, spread: 12, width: 0.6, env: [[0, 1], [0.18, 0]] }, -10),
      snap(-6, 3000, 12000, 0.01),
    ],
    master: [hp(200), conv(METAL, 0.12, { decay: 0.25 }), ...cap(0.45, 0.2), OUT],
  },
  {
    id: 'trail', name: 'trailA', brief: BRIEF_TRAIL,
    what: 'A, mag-lock: a short servo whirr and a crisp latch click as the item locks behind the kart.',
    why: 'A real servo (JoontheFloof, CC0) and a real switch flip (IanStarGem, CC0).',
    layers: [
      rec(FS(740242), -5, [trim(0.2, 0.42), hp(400), fade(0.002, 0.06)]),
      rec(FS(278205), 0, [trim(0.04, 0.3), fade(0.001, 0.1)], 0.07),
    ],
    master: [hp(150), verb(0.25, 0.08), ...cap(0.4, 0.15), OUT],
  },
  {
    id: 'trail', name: 'trailB', brief: BRIEF_TRAIL,
    what: 'B, clamp: a solid little magnetic "chunk" with a short hum blip as it locks on.',
    why: 'Kenney\'s metal impact (CC0) pitched down with a synthesized punch and hum blip.',
    layers: [
      rec(KI('impactMetal_light_003.ogg'), 0, [pitch(-3), lp(5000)]),
      thump(-8, 160, 80, 0.06),
      syn('hum', { seconds: 0.14, seed: 234, hz: 196, partials: 8, tilt: 1.3, voices: 2, detune: 6, env: [[0, 0], [0.01, 1], [0.13, 0]] }, -12, [], 0.02),
    ],
    master: [hp(100), verb(0.25, 0.08), ...cap(0.35, 0.12), OUT],
  },
  {
    id: 'trail', name: 'trailC', brief: BRIEF_TRAIL,
    what: 'C, lock chirp: a crisp switch click and a tiny electronic "bip" confirming the lock.',
    why: 'A real switch flip (IanStarGem, CC0) and a synthesized blip.',
    layers: [
      rec(FS(278204), 0, [trim(0.04, 0.3), fade(0.001, 0.1)]),
      syn('beeps', { seconds: 0.12, notes: [[0.05, 2349, 0.03, 1]], wave: 'sine', blip: 2 }, -10),
    ],
    master: [hp(150), verb(0.2, 0.06), ...cap(0.35, 0.12), OUT],
  },
];

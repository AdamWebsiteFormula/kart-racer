// Tractor Beam (was Grapple Anchor): the lock-on, the hum while it reels in (a new loop id), and the slingshot release.
// Seeker Drone (was Wind-Up Mouse): the launch. Held items: the lock behind the kart, and the block.
import type { Cand } from '../parts.ts';
import { cap, comp, conv, EL, EVEN, fade, FCP, FS, GAME, hp, KI, lp, METAL, OUT, pitch, rec, snap, SPRING, syn, thump, trim, verb } from '../parts.ts';

const BRIEF_LOCK = `The Tractor Beam fires in ${GAME}: a quick lock-on as it grabs the kart ahead, then a heavy energy beam switching on. Techy and powerful, about a second. No voice.`;
const BRIEF_BEAM = `The Tractor Beam reels the player in towards the kart ahead in ${GAME}: a strong, steady energy-beam hum that feels like being pulled, a seamless loop. Alive but never pulsing like an alarm or a siren. No voice.`;
const BRIEF_SLING = `The Tractor Beam lets go and slingshots the player past the kart ahead in ${GAME}: a snap of released energy and a fast whoosh past with a burst of speed. Exciting, under a second. No voice.`;
const BRIEF_DRONE = `The player launches a Seeker Drone in ${GAME}: a small, fast hover drone spins up and zips off along the road after rivals. Quick, techy and a little menacing in a fun way, about a second. No voice, nothing cute.`;
const BRIEF_BLOCK = `An item held behind the kart blocks a shot from behind in ${GAME} (both are destroyed): a quick clank and energy zap as the shot deflects. Short and crisp. No voice.`;
const BRIEF_TRAIL = `The player holds an item behind the kart as a shield in ${GAME}: a quick mechanical lock as it clamps into place. Tiny, crisp and satisfying. No voice.`;

const ZAP = FS(136542); // JoelAudio, ELECTRIC_ZAP_001 (CC0)
const BREAKER = FS(131599); // EchoCinematics, Kill Switch (Large Breaker Switch) (CC0)
const MAINS = FS(733737); // chungus43A, 60Hz electrical mains hum (CC0): the local ear hears "a tractor beam humming"
const GEN = FS(452768); // Euphrosyyn, Scifi_Generator_Lp (CC0)
const TOYDRONE = FS(188241); // qubodup, Toy Engine Flying Around (CC0): "a small drone flying", 0.62

export const BEAM: Cand[] = [
  // ---------------------------------------------------------------- Tractor Beam: lock on
  {
    id: 'anchor', name: 'anchorA', brief: BRIEF_LOCK,
    what: 'A, lock and throw the switch: two quick identical lock ticks, a big real breaker switch "ka-chunk" as the beam engages, then a real electrical hum swelling through a phaser with a faint endless rise inside it (the pull).',
    why: 'Real recordings for the weight and the hum (EchoCinematics\' breaker switch, chungus43A\'s mains hum, CC0); a synthesized lock tick and a quiet Shepard-Risset rise; no melody.',
    layers: [
      syn('beeps', { seconds: 0.12, notes: [[0, 2093, 0.018, 1], [0.05, 2093, 0.018, 1]], wave: 'sine' }, -14),
      rec(BREAKER, -2, [trim(0.24, 0.9), fade(0.001, 0.3)], 0.09),
      rec(MAINS, -5, [trim(1.0, 2.2), hp(50), { op: 'phaser', rate: 1.2, lo: 300, hi: 3000, stages: 6, fb: 0.4, mix: 0.35 }, fade(0.08, 0.3)], 0.12),
      syn('shepard', { seconds: 1.1, seed: 192, rate: 1.0, center: 900, spread: 1.2, env: [[0, 0], [0.3, 1], [0.9, 0.6], [1.08, 0]] }, -17, [], 0.12),
    ],
    master: [hp(45), verb(0.5, 0.1), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'anchor', name: 'anchorB', brief: BRIEF_LOCK,
    what: 'B, magnetic grapple: a real metal latch catching, a servo, a crackling arc as the beam connects and a real high-voltage buzz swelling on.',
    why: 'Real recordings (deleted_user_7\'s metal latch, Burningmonkey\'s servo, Johnnie_Holiday\'s high voltage, CC0); a synthesized arc.',
    layers: [
      rec(FS(383797), -2, [trim(0.62, 1.0), hp(200), fade(0.002, 0.1)]),
      rec(FS(322021), -9, [trim(0.15, 0.5), hp(300), fade(0.005, 0.1)], 0.03),
      syn('arc', { seconds: 0.35, seed: 193, buzz: 130, hum: 0.2, sparks: 0.8, intensity: [[0, 1], [0.33, 0]] }, -9, [], 0.05),
      rec(FS(612159), -3, [trim(5.2, 6.4), hp(80), fade(0.02, 0.35)], 0.06),
    ],
    master: [hp(45), verb(0.5, 0.1), comp(-14, 2.5), ...cap(1.25, 0.4), OUT],
  },
  {
    id: 'anchor', name: 'anchorC', brief: BRIEF_LOCK,
    what: 'C, energy tether: a real electric crack as the beam fires, a real high-voltage discharge locking on and a generator hum swelling behind it.',
    why: 'A real zap (JoelAudio, CC0), a real high-voltage discharge (follytowers, CC0), a sci-fi generator hum (Euphrosyyn, CC0).',
    layers: [
      rec(ZAP, -3, [trim(0, 0.25), hp(500), fade(0.001, 0.1)]),
      rec(FS(415960), -3, [trim(0.15, 1.3), hp(150), fade(0.01, 0.35)], 0.02),
      rec(GEN, -6, [trim(2.0, 3.1), hp(60), fade(0.1, 0.3)], 0.05),
    ],
    master: [hp(45), verb(0.5, 0.12), comp(-14, 2.5), ...cap(1.25, 0.4), OUT],
  },
  // ---------------------------------------------------------------- Tractor Beam: reeling in (new loop id: beamLoop)
  {
    id: 'beamLoop', name: 'beamLoopA', brief: BRIEF_BEAM, loop: 2.0, xfade: 0.1,
    what: 'A, pulling hum: a real electrical hum through a slow phaser, a band of air drawn along with it and, very quietly inside, a tone that seems to rise for ever (the pull).',
    why: 'A real mains hum (chungus43A, CC0; the local ear: "a tractor beam humming") as the identity; a quiet Shepard-Risset rise and a steady band of noise synthesized; no throb (the ears hear a pulsing hum as an alarm).',
    layers: [
      rec(MAINS, 0, [trim(1.0, 3.2), hp(40), EVEN, { op: 'phaser', rate: 0.5, lo: 300, hi: 2500, stages: 6, fb: 0.3, mix: 0.3 }]),
      syn('shepard', { seconds: 2.2, seed: 201, rate: 1.0, center: 700, spread: 1.3 }, -15),
      syn('whoosh', { seconds: 2.2, seed: 202, hz: 1800, q: 0.8, air: 0.1 }, -18),
    ],
    master: [hp(40), lp(9000), OUT],
  },
  {
    id: 'beamLoop', name: 'beamLoopB', brief: BRIEF_BEAM, loop: 2.0, xfade: 0.1,
    what: 'B, generator beam: a real sci-fi generator hum with a deep additive hum of detuned voices under it, moving slowly through a phaser.',
    why: 'A real generator loop (Euphrosyyn, CC0) evened; an additive hum tuned to whole cycles of the 2 s loop.',
    layers: [
      rec(GEN, 0, [trim(8.0, 10.2), hp(40), EVEN]),
      syn('hum', { seconds: 2.2, seed: 203, hz: 73.5, period: 2.0, partials: 16, tilt: 1.1, voices: 3, detune: 0.5 }, -8),
    ],
    master: [hp(40), { op: 'phaser', rate: 0.5, lo: 250, hi: 2000, stages: 6, fb: 0.3, mix: 0.3 }, lp(9000), OUT],
  },
  {
    id: 'beamLoop', name: 'beamLoopC', brief: BRIEF_BEAM, loop: 2.0, xfade: 0.1,
    what: 'C, energy tether: a real energy drone with an electric arc buzzing through it and a light, quick shimmer, like a live wire under tension.',
    why: 'A real energy drone (cabled_mess, CC0); a synthesized arc and a light tremolo at whole cycles of the loop.',
    layers: [
      rec(FS(351453), 0, [trim(6.0, 8.2), hp(60), EVEN]),
      syn('arc', { seconds: 2.2, seed: 204, buzz: 150, hum: 0.6, sparks: 0.25, rate: 20, intensity: 1.0 }, -8, [{ op: 'tremolo', rate: 8, depth: 0.15, stereo: 0.3 }]),
    ],
    master: [hp(45), OUT],
  },
  // ---------------------------------------------------------------- Tractor Beam: the slingshot
  {
    id: 'slingshot', name: 'slingshotA', brief: BRIEF_SLING,
    what: 'A, release and whoosh: the beam lets go with a real electric crack, a real super-heavy swoosh tears past and a short burst of flame follows you.',
    why: 'Real recordings: a zap (JoelAudio), a super-heavy swoosh (bolkmar), a fire whoosh (hnhnh), all CC0.',
    layers: [
      rec(ZAP, -4, [trim(0, 0.1), hp(800), fade(0.001, 0.04)]),
      rec(FS(475131), 0, [hp(150), fade(0.002, 0.2)], 0.01),
      rec(FS(244926), -8, [trim(0.08, 0.6), fade(0.005, 0.25)], 0.02),
    ],
    master: [hp(45), comp(-14, 2.5), ...cap(0.8, 0.3), OUT],
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
      rec(ZAP, -6, [trim(0, 0.15), hp(800), fade(0.001, 0.06)]),
      rec(FS(623015), 0, [trim(0.9, 2.0), hp(100), fade(0.005, 0.35)]),
    ],
    master: [hp(45), comp(-14, 2.5), ...cap(0.9, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Seeker Drone
  {
    id: 'mouse', name: 'mouseA', brief: BRIEF_DRONE,
    what: 'A, drone launch: a real small drone spinning up from a stop and zipping away down the road (Doppler: it drops in pitch and pans as it goes).',
    why: 'A real toy drone engine (qubodup, CC0) bent up from a stop and moved away from the ear. No chirps (robot chirps read as cute). The local ear: "a small hovering drone zipping away", 0.67.',
    layers: [
      rec(TOYDRONE, 0, [trim(9.6, 11.2), { op: 'bend', st: [[0, -10], [0.25, 0], [1.5, 1]] }, { op: 'doppler', speed: 14, dist: 1.0, at: 0.35, pan: 0.7 }, fade(0.02, 0.3)]),
    ],
    master: [hp(80), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'mouse', name: 'mouseB', brief: BRIEF_DRONE,
    what: 'B, motor spin-up: a sharp electric motor spins up as the drone arms, then it hums off down the road away from you.',
    why: 'A real toy drone engine (qubodup, CC0) moved away from the ear; Apple\'s Final Cut Pro "Electric Screwdriver" only as a quiet processed spin-up (0.4 s, 6 dB under). The local ear: 0.74.',
    layers: [
      rec(FCP('Mech:Tech/Electric Screwdriver FX 01.caf'), -6, [trim(0.0, 0.4), hp(300), fade(0.003, 0.1)]),
      rec(TOYDRONE, 0, [trim(2.6, 4.2), { op: 'doppler', speed: 14, dist: 1.0, at: 0.3, pan: 0.7 }, fade(0.05, 0.3)], 0.15),
    ],
    master: [hp(80), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'mouse', name: 'mouseC', brief: BRIEF_DRONE,
    what: 'C, synth seeker: a synthesized four-rotor drone spinning up from a stop and flying off past you (Doppler), a real toy drone engine inside it for texture.',
    why: 'Synthesis for the rotors (four buzzing blade-pass tones, each trimmed by a flight controller), moved past the ear; a real toy drone engine (qubodup, CC0).',
    layers: [
      syn('rotor', { seconds: 1.3, seed: 221, hz: [[0, 60], [0.25, 230], [1.3, 270]], harm: 10, tilt: 1.2, whine: [8, 0.12], air: 0.2, env: [[0, 0], [0.06, 1], [0.8, 0.8], [1.28, 0]] }, 0,
        [{ op: 'doppler', speed: 20, dist: 1.2, at: 0.4, pan: 0.7 }]),
      rec(TOYDRONE, -8, [trim(10.0, 11.3), { op: 'doppler', speed: 20, dist: 1.2, at: 0.4, pan: 0.7 }, fade(0.05, 0.4)], 0.1),
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
      rec(ZAP, -6, [trim(0, 0.14), hp(800), fade(0.001, 0.06)]),
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
      rec(ZAP, -8, [trim(0, 0.12), hp(1000), fade(0.001, 0.05)]),
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
    what: 'A, latch: two real latch clicks as the item locks behind the kart, over a low magnetic thunk.',
    why: 'A real metal latch (deleted_user_7, CC0); a synthesized low punch.',
    layers: [
      thump(-8, 170, 90, 0.05),
      rec(FS(383797), 0, [trim(0.64, 0.98), hp(250), fade(0.002, 0.08)]),
    ],
    master: [hp(120), verb(0.25, 0.08), ...cap(0.4, 0.15), OUT],
  },
  {
    id: 'trail', name: 'trailB', brief: BRIEF_TRAIL,
    what: 'B, mag-lock: a short servo whirr and a crisp switch click as the item locks behind the kart.',
    why: 'A real servo (JoontheFloof, CC0) and a real switch flip (IanStarGem, CC0).',
    layers: [
      rec(FS(740242), -5, [trim(0.2, 0.42), hp(400), fade(0.002, 0.06)]),
      rec(FS(278205), 0, [trim(0.04, 0.3), fade(0.001, 0.1)], 0.07),
    ],
    master: [hp(150), verb(0.25, 0.08), ...cap(0.4, 0.15), OUT],
  },
  {
    id: 'trail', name: 'trailC', brief: BRIEF_TRAIL,
    what: 'C, small breaker: a small, tight version of a big breaker switch\'s "ka-chunk", pitched up so it is light and quick.',
    why: 'A real large breaker switch (EchoCinematics, CC0) pitched up 5 semitones and cut short.',
    layers: [rec(BREAKER, 0, [trim(0.25, 0.6), pitch(5), fade(0.001, 0.1)])],
    master: [hp(150), ...cap(0.3, 0.12), OUT],
  },
];

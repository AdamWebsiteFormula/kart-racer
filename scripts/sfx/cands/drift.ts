// Drift squeal candidates (28 Sept 2026, for Adam's ears; not installed): the tire squeal loop under the engine at
// every corner, its level following the slip (audio.ts). Built from real CC0 tire squeals on Freesound (audible-edge's
// Chrysler and Nissan and Volvo takes, 2009) rather than a generated take: a real squeal's partials waver and beat the
// way rubber does, which no clean synth tone does.
import type { Recipe } from '../types.ts';

const BRIEF = "The steady tire squeal of a small kart drifting sideways through a long corner in a polished cartoon kart racing game (Mario Kart World quality): a smooth, sustained rubber screech, real and rich, never shrill or grating, heard at nearly every corner under the engine; a seamless loop.";
const CHRYSLER = 71739;

export const RECIPES: readonly Recipe[] = [
  {
    id: 'drift', name: 'driftA', brief: BRIEF, loop: 4.0, xfade: 0.3,
    why: "A: one real tire squeal (audible-edge, 'Chrysler LHS tire squeal 04', CC0): the long sustained stretch, a warm squeal on 474 Hz with its partials at 947, 1421 and 1916 Hz wavering against each other; the car's engine rumble under 420 Hz filtered out, a touch of the 2.5-4 kHz edge taken off, smoothed by a slow compressor so it holds its level, a 0.3 s crossfade at the wrap.",
    layers: [{ src: { freesound: CHRYSLER }, fx: [{ op: 'trim', from: 3.2, to: 8.0 }, { op: 'hp', hz: 420, order: 4 }, { op: 'peak', hz: 3200, db: -2.5, q: 0.9 }, { op: 'normalize', db: 0 }] }],
    master: [{ op: 'comp', threshold: -18, ratio: 3, attack: 0.05, release: 0.4 }, { op: 'highshelf', hz: 7000, db: -3 }, { op: 'limit', ceiling: -1 }],
  },
  {
    id: 'drift', name: 'driftB', brief: BRIEF, loop: 3.6, xfade: 0.3,
    why: "B: a smaller, brighter kart tire: the Chrysler squeal (audible-edge, CC0), a later stretch, pitched up 3 semitones (474 -> 564 Hz, its partials at 1.1, 1.7 and 2.3 kHz), with a stick-slip model's rubber scrub (physics.py) 12 dB under it; the rumble under 500 Hz out, the 3 kHz edge softened, held level by a slow compressor.",
    layers: [
      { src: { freesound: CHRYSLER }, fx: [{ op: 'trim', from: 8.4, to: 13.4 }, { op: 'pitch', st: 3 }, { op: 'hp', hz: 500, order: 4 }, { op: 'peak', hz: 3200, db: -3, q: 1 }, { op: 'normalize', db: 0 }, { op: 'gain', db: 0 }] },
      { src: { synth: 'squeal', args: { seconds: 4.4, hz: 1127, zones: 3, detune: 8, wander: 50, wanderRate: 2, harsh: 0.3, grain: 0.2, scrub: 0.6, scrubHz: 1800, top: 6000, seed: 33 } }, fx: [{ op: 'hp', hz: 600 }, { op: 'normalize', db: 0 }, { op: 'gain', db: -12 }] },
    ],
    master: [{ op: 'comp', threshold: -18, ratio: 3, attack: 0.05, release: 0.4 }, { op: 'highshelf', hz: 7000, db: -4 }, { op: 'limit', ceiling: -1 }],
  },
  {
    id: 'drift', name: 'driftC', brief: BRIEF, loop: 4.0, xfade: 0.3,
    why: "C: two tires: the warm Chrysler squeal (audible-edge, CC0) leaning left and a later stretch of the same squeal a quarter tone up leaning right (another tire, its partials beating against the first), a stick-slip friction model (physics.py: three tread zones near 947 Hz, wandering 40 cents) quietly holding the pitch between them, and the rubber's scrub; wide, rich and even.",
    layers: [
      { src: { freesound: CHRYSLER }, fx: [{ op: 'trim', from: 3.2, to: 8.0 }, { op: 'hp', hz: 420, order: 4 }, { op: 'pan', pos: -0.35 }, { op: 'normalize', db: 0 }, { op: 'gain', db: 0 }] },
      { src: { freesound: CHRYSLER }, fx: [{ op: 'trim', from: 8.4, to: 13.4 }, { op: 'pitch', st: 0.5 }, { op: 'hp', hz: 440, order: 4 }, { op: 'pan', pos: 0.35 }, { op: 'normalize', db: 0 }, { op: 'gain', db: -3 }] },
      { src: { synth: 'squeal', args: { seconds: 4.8, hz: 947, zones: 3, detune: 7, wander: 40, wanderRate: 1.5, harsh: 0.35, grain: 0.15, scrub: 0.25, scrubHz: 1600, top: 5000, seed: 21, body: [[950, 3, 1], [1900, 4, 0.5], [2850, 5, 0.2]] } }, fx: [{ op: 'normalize', db: 0 }, { op: 'gain', db: -11 }] },
    ],
    master: [{ op: 'peak', hz: 3000, db: -2, q: 0.9 }, { op: 'comp', threshold: -18, ratio: 3, attack: 0.05, release: 0.4 }, { op: 'highshelf', hz: 7000, db: -3 }, { op: 'limit', ceiling: -1 }],
  },
];

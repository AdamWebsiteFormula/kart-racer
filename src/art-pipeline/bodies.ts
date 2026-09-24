// The two shared kart bodies (design §5: Classic and Buggy, unlocked later; §10). Cosmetic only: the
// racer owns the class, and every body keeps the kart footprint (KART_FIT, kartRadius 0.85) with its
// wheels where the signature karts have theirs, so the sim, the camera and the shadow never notice.
// Code-modelled in the house toon style (one vertex-coloured geometry), painted in the racer's own
// two colours, which an alt paint repaints. The driver sits in the cockpit at SEAT: the racer's model
// file cut down to the driver (glb.ts DRIVER_CUTS), or the code-built driver.
import { ModelBuilder, type V3 } from './model.ts';
import type { Exhaust } from './racers.ts';

export type BodyId = 'standard' | 'classic' | 'buggy';
/** 'standard' is each racer's signature kart; the rest are the shared bodies. */
export const BODY_IDS: readonly BodyId[] = Object.freeze(['standard', 'classic', 'buggy']);
export const isBodyId = (id: unknown): id is BodyId => BODY_IDS.includes(id as BodyId);

/** Where a driver sits: their cut (the hips) lands at `y`, centred at `z`, down inside the cockpit rim. */
export const SEAT = Object.freeze({ y: 0.6, z: -0.14 });

/** Each racer's two colours (design §4), which the shared bodies wear. */
export const KART_COLOURS: Readonly<Record<string, { primary: string; secondary: string }>> = Object.freeze({
  pip: { primary: '#2ec4b6', secondary: '#ff6f61' },
  momo: { primary: '#3b3b3b', secondary: '#ffd23f' },
  nova: { primary: '#b39ddb', secondary: '#ffffff' },
  juniper: { primary: '#b7410e', secondary: '#2d6a4f' },
  otto: { primary: '#64b5f6', secondary: '#e53935' },
  sprocket: { primary: '#f5e6c8', secondary: '#b08d57' },
  boulder: { primary: '#708090', secondary: '#6a994e' },
  gus: { primary: '#e63946', secondary: '#ffffff' },
});

const INK = '#1b1b2f';
const TYRE = '#2a2630';
const CHROME = '#cfd6de';
const PAN = '#3a3a44';
const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

/** The pipes each body burns from (the flame colour is the racer's: EXHAUST[racerId].flame). */
export const BODY_EXHAUST: Readonly<Record<Exclude<BodyId, 'standard'>, Omit<Exhaust, 'flame'>>> = Object.freeze({
  classic: { ports: [[-0.2, 0.42, -1.04], [0.2, 0.42, -1.04]], dir: unit([0, 0.3, -1]) },
  buggy: { ports: [[-0.24, 1.02, -0.98], [0.24, 1.02, -0.98]], dir: unit([0, 0.8, -1]) },
});

function wheel(m: ModelBuilder, x: number, z: number, r: number, w: number, hub: string, seg: number): void {
  m.cyl(r, r, w, TYRE, [x, r, z], [0, 0, Math.PI / 2], seg);
  m.cyl(r * 0.55, r * 0.55, w + 0.02, CHROME, [x, r, z], [0, 0, Math.PI / 2], 10, false);
  m.cyl(r * 0.32, r * 0.32, w + 0.04, hub, [x, r, z], [0, 0, Math.PI / 2], 8, false);
}

/** Two pipes: a tube back to each port, a flange and a dark bore. */
function pipes(m: ModelBuilder, e: Omit<Exhaust, 'flame'>, len = 0.3): void {
  const d = e.dir;
  // a cylinder's +Y turned onto d by a pitch about X (every body's pipes point straight back and up)
  const rot: V3 = [Math.atan2(d[2], d[1]), 0, 0];
  for (const p of e.ports) {
    const back = (k: number): V3 => [p[0] - d[0] * k, p[1] - d[1] * k, p[2] - d[2] * k];
    m.cyl(0.07, 0.062, len, CHROME, back(len / 2), rot, 10);
    m.cyl(0.085, 0.085, 0.05, CHROME, back(0.025), rot, 10);
    m.cyl(0.05, 0.05, 0.052, INK, back(0.02), rot, 8, false);
  }
}

/** Classic: a low open-wheel go-kart with a bullet nose, side pods, a padded cockpit and a rear wing. */
function classic(m: ModelBuilder, a: string, b: string): void {
  for (const [x, z, r] of [[-0.68, 0.66, 0.27], [0.68, 0.66, 0.27], [-0.68, -0.64, 0.3], [0.68, -0.64, 0.3]]) wheel(m, x, z, r, 0.26, b, 14);
  m.box([0.9, 0.08, 1.84], PAN, [0, 0.22, 0]);                                        // floor pan
  m.ball([0.5, 0.25, 0.98], a, [0, 0.42, -0.04]);                                    // hull
  m.cone(0.27, 0.46, a, [0, 0.4, 0.93], [Math.PI / 2, 0, 0], 12);                      // bullet nose
  m.ball([0.09, 0.09, 0.09], b, [0, 0.4, 1.15], undefined, 10);                       // nose tip
  m.box([1.26, 0.05, 0.2], b, [0, 0.24, 1.04]);                                        // front wing
  for (const x of [-1, 1]) {
    m.box([0.05, 0.14, 0.24], b, [x * 0.62, 0.3, 1.04], undefined, false);           // wing end plates
    m.ball([0.16, 0.13, 0.52], b, [x * 0.5, 0.38, -0.06]);                          // side pods
  }
  m.box([0.14, 0.02, 0.9], b, [0, 0.66, 0.42], [-0.14, 0, 0], false);                 // racing stripe
  m.cyl(0.13, 0.13, 0.02, '#ffffff', [0, 0.6, 0.72], [-0.32, 0, 0], 16, false);       // number disc
  m.torus(0.34, 0.075, b, [0, SEAT.y + 0.06, SEAT.z], [Math.PI / 2, 0, 0]);           // padded cockpit rim
  m.box([0.5, 0.34, 0.1], PAN, [0, SEAT.y + 0.2, SEAT.z - 0.38], [0.12, 0, 0]);       // seat back
  m.cyl(0.02, 0.02, 0.3, INK, [0, 0.72, SEAT.z + 0.46], [-0.9, 0, 0], 6, false);      // steering column
  m.torus(0.12, 0.022, INK, [0, 0.83, SEAT.z + 0.36], [Math.PI / 2 - 0.9, 0, 0], false); // wheel
  m.box([0.52, 0.2, 0.34], '#5a5a66', [0, 0.46, -0.8]);                               // engine
  for (const x of [-0.22, 0.22]) m.cyl(0.025, 0.025, 0.48, CHROME, [x, 0.74, -0.94], [0.2, 0, 0], 6, false); // wing struts
  m.box([1.14, 0.05, 0.3], a, [0, 0.98, -0.95], [0.1, 0, 0]);                          // rear wing
  for (const x of [-1, 1]) m.box([0.04, 0.22, 0.34], b, [x * 0.58, 0.96, -0.95], undefined, false);
  pipes(m, BODY_EXHAUST.classic);
}

/** Buggy: a dune buggy on chunky tyres, with fenders, a roll bar behind the seat, headlamps and a bare engine. */
function buggy(m: ModelBuilder, a: string, b: string): void {
  for (const [x, z] of [[-0.68, 0.64], [0.68, 0.64], [-0.68, -0.64], [0.68, -0.64]]) wheel(m, x, z, 0.35, 0.32, b, 9);
  m.box([0.78, 0.1, 1.7], PAN, [0, 0.36, 0]);                                         // skid pan
  m.box([0.84, 0.28, 1.24], a, [0, 0.56, -0.06]);                                     // tub
  m.box([0.78, 0.2, 0.46], a, [0, 0.58, 0.72], [-0.42, 0, 0]);                        // sloped nose
  m.box([0.96, 0.07, 0.07], CHROME, [0, 0.42, 1.02]);                                 // bumper
  for (const x of [-1, 1]) {
    m.box([0.4, 0.06, 0.66], b, [x * 0.68, 0.8, 0.64], [0.14, 0, 0]);                 // front fender
    m.box([0.4, 0.06, 0.66], b, [x * 0.68, 0.8, -0.64], [-0.14, 0, 0]);               // rear fender
    m.ball([0.1, 0.1, 0.06], [1.6, 1.35, 0.55], [x * 0.24, 0.74, 0.92], undefined, 10, false); // headlamp (glows)
    m.cyl(0.035, 0.035, 0.62, b, [x * 0.38, 0.98, SEAT.z - 0.44], undefined, 6);      // roll bar posts
    m.cyl(0.03, 0.03, 0.66, b, [x * 0.3, 0.98, -0.76], [0.95, 0, 0], 6, false);       // back braces
  }
  m.cyl(0.035, 0.035, 0.8, b, [0, 1.28, SEAT.z - 0.44], [0, 0, Math.PI / 2], 6);      // roll bar top
  m.box([0.7, 0.05, 0.05], INK, [0, 0.72, 0.4], undefined, false);                    // dash
  m.torus(0.34, 0.075, b, [0, SEAT.y + 0.12, SEAT.z], [Math.PI / 2, 0, 0]);           // padded cockpit rim
  m.cyl(0.02, 0.02, 0.3, INK, [0, 0.76, SEAT.z + 0.46], [-0.9, 0, 0], 6, false);
  m.torus(0.12, 0.022, INK, [0, 0.88, SEAT.z + 0.36], [Math.PI / 2 - 0.9, 0, 0], false);
  m.box([0.56, 0.3, 0.36], '#5a5a66', [0, 0.8, -0.78]);                               // engine
  m.cyl(0.13, 0.13, 0.12, CHROME, [0, 1.0, -0.72], undefined, 12);                    // air filter
  pipes(m, BODY_EXHAUST.buggy, 0.34);
}

const BODIES: Record<Exclude<BodyId, 'standard'>, (m: ModelBuilder, a: string, b: string) => void> = { classic, buggy };

/** Build a shared body into `m` in these two colours (the racer's own, or their alt paint's). */
export function bodyInto(m: ModelBuilder, body: Exclude<BodyId, 'standard'>, primary: string, secondary: string): ModelBuilder {
  BODIES[body](m, primary, secondary);
  return m;
}

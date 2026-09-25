// The eight racers and their signature karts (design §4, §5), modelled from primitives.
// Origin on the ground, facing +Z, sized to the collision circle (kartRadius 0.85).
// Each racer is one vertex-coloured mesh plus one ink hull: two draw calls per kart.
import { Euler, Quaternion, Vector3, type Color } from 'three';
import { ModelBuilder, type V3 } from './model.ts';

const INK = '#1b1b2f';
const TYRE = '#2a2630';
const HUB = '#d9d4c7';
const SKIN_WHITE = '#fffaf0';
const CHROME = '#cfd6de';

const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const BACK = unit([0, 0.45, -1]);
const UP = unit([0, 1, -0.3]);

/**
 * Exhaust (design §5: the exhaust burns in the racer's colour). Where each pipe's mouth sits, the
 * way it points (back and a little up; Boulder's truck stacks point up), and the flame colour:
 * the racer's accent, or their second colour where the accent is too dark to burn. `splay`: how
 * far a side pipe turns out (SPLAY when absent; 0 for pipes measured on a racer's body, which point
 * where they point: models/racers/manifest.json body.exhaust).
 */
export interface Exhaust { ports: readonly V3[]; dir: V3; flame: string; size?: number; splay?: number }

/** How far a side pipe turns outward, so a pair of flames makes a V the chase camera can see. */
const SPLAY = 0.35;

/** The way one pipe points: the exhaust's direction, turned outward for a pipe off the centre line. */
export function portDir(e: Exhaust, p: V3): V3 {
  const side = p[0] > 0.01 ? 1 : p[0] < -0.01 ? -1 : 0;
  return unit([e.dir[0] + side * (e.splay ?? SPLAY), e.dir[1], e.dir[2]]);
}

const Y_AXIS = new Vector3(0, 1, 0);
/** Euler angles that turn a primitive's +Y axis onto `d`. */
function aimY(d: V3): V3 {
  const e = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(Y_AXIS, new Vector3(d[0], d[1], d[2])));
  return [e.x, e.y, e.z];
}
export const EXHAUST: Readonly<Record<string, Exhaust>> = Object.freeze({
  pip: { ports: [[-0.24, 0.36, -1.02], [0.24, 0.36, -1.02]], dir: BACK, flame: '#2ec4b6' },
  momo: { ports: [[-0.3, 0.55, -1.08], [0.3, 0.55, -1.08]], dir: BACK, flame: '#ffd23f' },
  nova: { ports: [[0, 0.62, -1.3]], dir: [0, 0, -1], flame: '#b388ff', size: 1.4 }, // her thruster is the exhaust
  juniper: { ports: [[-0.36, 0.4, -1.02], [0.36, 0.4, -1.02]], dir: BACK, flame: '#ff7a2e' },
  otto: { ports: [[-0.28, 0.4, -0.95], [0.28, 0.4, -0.95]], dir: BACK, flame: '#64b5f6' },
  sprocket: { ports: [[-0.22, 0.42, -1.1], [0.22, 0.42, -1.1]], dir: BACK, flame: '#ffcf7a' },
  boulder: { ports: [[-0.5, 1.62, -0.86], [0.5, 1.62, -0.86]], dir: UP, flame: '#8bd65a', size: 1.2 },
  gus: { ports: [[-0.4, 0.5, -1.06], [0.4, 0.5, -1.06]], dir: BACK, flame: '#ff4a3d' },
});

/** The pipes for an exhaust: a tube ending at each port, a flange, and a dark bore the flames come out of. */
function pipes(m: ModelBuilder, e: Exhaust, colour: string = CHROME, len = 0.32): void {
  for (const p of e.ports) {
    const [dx, dy, dz] = portDir(e, p);
    const rot = aimY([dx, dy, dz]);
    const back = (q: V3, d: number): V3 => [q[0] - dx * d, q[1] - dy * d, q[2] - dz * d];
    m.cyl(0.07, 0.062, len, colour, back(p, len / 2), rot, 10);
    m.cyl(0.085, 0.085, 0.05, colour, back(p, 0.025), rot, 10);
    m.cyl(0.05, 0.05, 0.052, INK, back(p, 0.02), rot, 8, false);
  }
}

type Kart = (m: ModelBuilder) => void;
type Driver = (m: ModelBuilder) => void;

/** Each code-built kart's wheels: radius, half track, half wheelbase, tyre width, hub colour (wheels()). */
const WHEELS: Readonly<Record<string, readonly [r: number, x: number, z: number, w: number, hub?: string]>> = Object.freeze({
  pip: [0.25, 0.5, 0.62, 0.22],
  momo: [0.3, 0.64, 0.6, 0.26],
  nova: [0.24, 0.56, 0.52, 0.2, '#ffffff'],
  juniper: [0.3, 0.64, 0.62, 0.26],
  otto: [0.24, 0.58, 0.56, 0.2],
  sprocket: [0.26, 0.56, 0.62, 0.2, '#b08d57'],
  boulder: [0.42, 0.7, 0.62, 0.34, '#708090'],
  gus: [0.32, 0.66, 0.66, 0.26],
});

/** Where each code-built driver's hips are (y) and their middle along z, before any SEATED move. */
const HIPS: Readonly<Record<string, { y: number; at: number }>> = Object.freeze({
  boulder: { y: 1.0, at: -0.2 },
  gus: { y: 0.95, at: 0.05 },
});
const STANDARD_HIPS = Object.freeze({ y: 0.62, at: -0.2 });

/** Four wheels; `r` radius, `x` half track, `z` half wheelbase. */
function wheels(m: ModelBuilder, r = 0.27, x = 0.6, z = 0.58, w = 0.22, hub = HUB): void {
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    m.cyl(r, r, w, TYRE, [sx * x, r, sz * z], [0, 0, Math.PI / 2], 14);
    m.cyl(r * 0.45, r * 0.45, w + 0.02, hub, [sx * x, r, sz * z], [0, 0, Math.PI / 2], 10, false);
  }
}

/** A seated body blob and head at the standard driver spot; returns the head centre. */
function seat(m: ModelBuilder, body: string, head: string, headR = 0.3, headScale: V3 = [1, 1, 1], y = 0.62): V3 {
  m.ball([0.26, 0.28, 0.24], body, [0, y + 0.18, -0.2]);
  const h: V3 = [0, y + 0.62, -0.16];
  m.ball([headR * headScale[0], headR * headScale[1], headR * headScale[2]], head, h);
  return h;
}

function eyes(m: ModelBuilder, h: V3, r = 0.075, spread = 0.12, up = 0.04, fwd = 0.25): void {
  m.eye(r, [h[0] - spread, h[1] + up, h[2] + fwd]);
  m.eye(r, [h[0] + spread, h[1] + up, h[2] + fwd]);
}

// ---------------------------------------------------------------- the karts
const KARTS: Record<string, Kart> = {
  // Pip: delivery scooter with a parcel rack
  pip: (m) => {
    wheels(m, ...WHEELS.pip);
    m.box([0.7, 0.32, 1.7], '#2ec4b6', [0, 0.42, 0]);
    m.box([0.62, 0.55, 0.18], '#2ec4b6', [0, 0.78, 0.62], [-0.35, 0, 0]);   // leg shield
    m.cyl(0.03, 0.03, 0.5, INK, [0, 1.0, 0.72], [0, 0, Math.PI / 2], 6);   // bars
    m.box([0.5, 0.36, 0.42], '#ff6f61', [0, 0.78, -0.78]);                 // parcel
    m.box([0.52, 0.06, 0.06], '#f6d365', [0, 0.97, -0.78], undefined, false); // tape
    m.ball([0.1, 0.1, 0.06], '#ffd23f', [0, 0.52, 0.86], undefined, 10);  // headlamp
    pipes(m, EXHAUST.pip);
  },
  // Momo: stripped buggy with an exposed engine
  momo: (m) => {
    wheels(m, ...WHEELS.momo);
    m.box([0.9, 0.16, 1.6], '#3b3b3b', [0, 0.36, 0]);
    for (const x of [-0.42, 0.42]) m.cyl(0.035, 0.035, 1.2, '#ffd23f', [x, 0.7, 0.05], [Math.PI / 2 - 0.35, 0, 0], 6); // roll cage
    m.cyl(0.035, 0.035, 0.84, '#ffd23f', [0, 1.02, -0.3], [0, 0, Math.PI / 2], 6);
    m.box([0.56, 0.36, 0.4], '#6b6b6b', [0, 0.62, -0.68]);                 // engine block
    for (const x of [-0.18, 0, 0.18]) m.cyl(0.05, 0.05, 0.22, '#c0c0c0', [x, 0.9, -0.68], undefined, 8, false);
    pipes(m, EXHAUST.momo);
    m.box([0.84, 0.08, 0.28], '#ffd23f', [0, 0.46, 0.82]);                 // front bumper
  },
  // Nova: a rounded pod with a little thruster
  nova: (m) => {
    wheels(m, ...WHEELS.nova);
    m.ball([0.62, 0.36, 0.95], '#b39ddb', [0, 0.6, 0]);
    m.ball([0.64, 0.12, 0.97], '#ffffff', [0, 0.5, 0], undefined, 16, false); // belt stripe
    m.cone(0.2, 0.36, '#ffffff', [0, 0.62, -1.02], [-Math.PI / 2, 0, 0]);  // thruster
    m.cone(0.13, 0.26, '#7ee8fa', [0, 0.62, -1.18], [-Math.PI / 2, 0, 0], 10, false); // glow
    for (const x of [-0.6, 0.6]) m.box([0.36, 0.05, 0.3], '#ffffff', [x * 1.05, 0.66, -0.35], [0, 0, x > 0 ? -0.4 : 0.4]); // fins
  },
  // Juniper: a wood-panel off-roader
  juniper: (m) => {
    wheels(m, ...WHEELS.juniper);
    m.box([1.1, 0.42, 1.8], '#b7410e', [0, 0.56, 0]);
    for (const x of [-0.56, 0.56]) m.box([0.02, 0.24, 1.3], '#a0703c', [x, 0.56, -0.05], undefined, false); // wood panels
    m.box([1.12, 0.3, 0.45], '#2d6a4f', [0, 0.62, 0.72]);                  // hood
    m.box([1.0, 0.05, 0.05], INK, [0, 0.86, 0.95], undefined, false);      // grille
    m.cyl(0.04, 0.04, 1.0, '#2d6a4f', [0, 1.28, -0.5], [0, 0, Math.PI / 2], 6); // roll bar
    for (const x of [-0.5, 0.5]) m.cyl(0.04, 0.04, 0.55, '#2d6a4f', [x, 1.02, -0.5], undefined, 6);
    m.cyl(0.26, 0.26, 0.12, TYRE, [0, 0.8, -0.98], [Math.PI / 2, 0, 0], 12); // spare
    pipes(m, EXHAUST.juniper);
  },
  // Otto: a water-scooter kart with a rear float
  otto: (m) => {
    wheels(m, ...WHEELS.otto);
    m.box([0.8, 0.3, 1.5], '#64b5f6', [0, 0.46, 0.05]);
    m.cone(0.42, 0.45, '#64b5f6', [0, 0.46, 0.9], [Math.PI / 2, Math.PI / 4, 0], 4); // bow
    m.box([0.84, 0.06, 1.3], '#ffffff', [0, 0.63, 0.05], undefined, false);
    m.torus(0.34, 0.12, '#e53935', [0, 0.72, -0.8], [Math.PI / 2, 0, 0]);  // float
    for (let i = 0; i < 4; i++) m.box([0.1, 0.26, 0.26], '#ffffff', [Math.cos(i * Math.PI / 2) * 0.34, 0.72, -0.8 + Math.sin(i * Math.PI / 2) * 0.34], undefined, false);
    pipes(m, EXHAUST.otto);
  },
  // Sprocket: a tin-toy racer with a wind-up key
  sprocket: (m) => {
    wheels(m, ...WHEELS.sprocket);
    m.ball([0.5, 0.34, 1.05], '#f5e6c8', [0, 0.56, 0]);
    m.ball([0.52, 0.08, 1.07], '#b08d57', [0, 0.56, 0], undefined, 16, false);
    for (const z of [0.4, 0.1, -0.2]) m.cyl(0.03, 0.03, 0.04, '#b08d57', [0.46, 0.66, z], [0, 0, Math.PI / 2], 6, false); // rivets
    m.cyl(0.04, 0.04, 0.35, '#b08d57', [0, 0.95, -0.72], [Math.PI / 2 - 0.2, 0, 0], 6); // key stem
    m.torus(0.13, 0.04, '#b08d57', [-0.14, 1.02, -0.9], [0, Math.PI / 2, 0]);
    m.torus(0.13, 0.04, '#b08d57', [0.14, 1.02, -0.9], [0, Math.PI / 2, 0]);
    m.box([0.18, 0.1, 0.05], '#ff6f61', [0, 0.72, 1.0], undefined, false); // number plate
    pipes(m, EXHAUST.sprocket, '#b08d57');
  },
  // Boulder: a stone monster truck
  boulder: (m) => {
    wheels(m, ...WHEELS.boulder);
    m.box([1.1, 0.4, 1.7], '#708090', [0, 0.92, 0]);
    m.rock(0.34, '#8a96a3', [0.3, 1.14, 0.55], [0.3, 0.5, 0.1], [1.2, 0.6, 1]);
    m.rock(0.3, '#5f6b77', [-0.32, 1.12, -0.6], [0.8, 0.1, 0.4], [1.1, 0.7, 1]);
    for (const [x, z] of [[-0.4, 0.4], [0.42, -0.3], [0, 0.75]]) m.ball([0.2, 0.07, 0.18], '#6a994e', [x, 1.14, z], undefined, 10, false); // moss
    m.box([1.2, 0.1, 0.3], '#4b5563', [0, 0.72, 0.9]);
    pipes(m, EXHAUST.boulder, CHROME, 0.62);                               // truck stacks
  },
  // Big Gus: a food-truck kart with a striped awning
  gus: (m) => {
    wheels(m, ...WHEELS.gus);
    m.box([1.15, 0.7, 1.85], '#e63946', [0, 0.78, 0]);
    m.box([0.02, 0.32, 0.9], SKIN_WHITE, [0.58, 0.9, -0.1], undefined, false); // serving hatch
    for (let i = 0; i < 6; i++) m.box([0.22, 0.04, 0.5], i % 2 ? '#ffffff' : '#e63946', [0.66, 1.2 - 0.01 * i, -0.52 + i * 0.2 - 0.02], [0, 0, -0.35]); // awning
    m.box([0.9, 0.25, 0.1], '#ffd23f', [0, 1.28, 0.9], undefined, false);  // sign
    m.cone(0.16, 0.3, '#ffffff', [0, 1.42, -0.6]);                          // chimney hat
    pipes(m, EXHAUST.gus);
  },
};

// ---------------------------------------------------------------- the drivers
const DRIVERS: Record<string, Driver> = {
  // hummingbird courier, goggles too big
  pip: (m) => {
    const h = seat(m, '#2ec4b6', '#2ec4b6', 0.28);
    m.cone(0.045, 0.5, INK, [h[0], h[1] - 0.02, h[2] + 0.46], [Math.PI / 2, 0, 0], 6);   // beak
    for (const x of [-0.12, 0.12]) m.torus(0.1, 0.035, '#ff6f61', [h[0] + x, h[1] + 0.08, h[2] + 0.22]);  // goggles
    eyes(m, h, 0.07, 0.12, 0.08, 0.22);
    for (const x of [-1, 1]) m.ball([0.05, 0.2, 0.12], '#ff6f61', [x * 0.3, 1.0, -0.2], [0, 0, x * 0.6], 8); // wings
    m.ball([0.12, 0.05, 0.1], '#ff6f61', [0, h[1] + 0.3, h[2] - 0.05], [0.3, 0, 0], 8);  // crest
  },
  // cat mechanic in overalls
  momo: (m) => {
    const h = seat(m, '#ffd23f', '#3b3b3b', 0.3);
    for (const x of [-0.16, 0.16]) m.cone(0.1, 0.2, '#3b3b3b', [h[0] + x, h[1] + 0.3, h[2]], [0, 0, x > 0 ? -0.25 : 0.25], 4);
    eyes(m, h, 0.08, 0.12, 0.04, 0.24);
    m.ball([0.05, 0.04, 0.03], '#ff9fb2', [h[0], h[1] - 0.06, h[2] + 0.29], undefined, 8, false); // nose
    m.ball([0.07, 0.03, 0.02], '#7a7a7a', [h[0] + 0.15, h[1] - 0.1, h[2] + 0.26], undefined, 8, false); // oil smudge
  },
  // moth astronaut, helmet visor down
  nova: (m) => {
    const h = seat(m, '#b39ddb', '#ffffff', 0.34);
    m.ball([0.26, 0.2, 0.08], '#3a3a6a', [h[0], h[1] + 0.02, h[2] + 0.28], undefined, 14, false);  // visor
    m.ball([0.1, 0.05, 0.03], '#7ee8fa', [h[0] - 0.08, h[1] + 0.08, h[2] + 0.34], undefined, 8, false); // glint
    for (const x of [-0.1, 0.1]) {
      m.cyl(0.015, 0.015, 0.34, INK, [h[0] + x * 1.4, h[1] + 0.44, h[2]], [0, 0, -x * 3], 5);
      m.ball([0.05, 0.05, 0.05], '#ffd23f', [h[0] + x * 2.6, h[1] + 0.6, h[2]], undefined, 8);
    }
    for (const x of [-1, 1]) m.ball([0.04, 0.34, 0.22], '#d8ccf0', [x * 0.28, 1.1, -0.34], [0.2, 0, x * 0.5], 10); // wings
  },
  // fox park ranger with hat and whistle
  juniper: (m) => {
    const h = seat(m, '#2d6a4f', '#b7410e', 0.29);
    m.cone(0.13, 0.28, '#b7410e', [h[0], h[1] - 0.05, h[2] + 0.3], [Math.PI / 2, 0, 0], 8);  // snout
    m.ball([0.04, 0.04, 0.04], INK, [h[0], h[1] - 0.05, h[2] + 0.45], undefined, 8, false);
    m.ball([0.14, 0.1, 0.1], '#ffffff', [h[0], h[1] - 0.13, h[2] + 0.18], undefined, 10, false); // cheek fluff
    for (const x of [-0.17, 0.17]) m.cone(0.08, 0.2, '#b7410e', [h[0] + x, h[1] + 0.3, h[2] - 0.02], [0, 0, x > 0 ? -0.3 : 0.3], 4);
    m.cyl(0.36, 0.36, 0.04, '#6b8f3a', [h[0], h[1] + 0.22, h[2]]);          // hat brim
    m.cyl(0.19, 0.22, 0.2, '#6b8f3a', [h[0], h[1] + 0.33, h[2]]);           // hat crown
    eyes(m, h, 0.065, 0.12, 0.06, 0.22);
  },
  // otter lifeguard
  otto: (m) => {
    const h = seat(m, '#e53935', '#8d6e63', 0.3);
    for (const x of [-0.24, 0.24]) m.ball([0.07, 0.07, 0.05], '#8d6e63', [h[0] + x, h[1] + 0.2, h[2]], undefined, 8);
    m.ball([0.17, 0.12, 0.1], '#d7ccc8', [h[0], h[1] - 0.08, h[2] + 0.22], undefined, 10); // muzzle
    m.ball([0.05, 0.035, 0.03], INK, [h[0], h[1] - 0.03, h[2] + 0.32], undefined, 8, false);
    eyes(m, h, 0.065, 0.13, 0.08, 0.2);
    m.ball([0.05, 0.2, 0.05], '#8d6e63', [0.3, 1.2, -0.1], [0, 0, -0.7], 8);  // waving arm
  },
  // wind-up robot toy
  sprocket: (m) => {
    m.box([0.46, 0.42, 0.38], '#f5e6c8', [0, 0.82, -0.2]);                 // body
    const h: V3 = [0, 1.28, -0.16];
    m.box([0.46, 0.38, 0.4], '#f5e6c8', h);                                // head
    m.box([0.36, 0.14, 0.02], INK, [h[0], h[1] + 0.02, h[2] + 0.21], undefined, false); // visor band
    for (const x of [-0.09, 0.09]) m.ball([0.045, 0.045, 0.02], '#7ee8fa', [h[0] + x, h[1] + 0.02, h[2] + 0.225], undefined, 8, false);
    m.cyl(0.015, 0.015, 0.2, INK, [h[0], h[1] + 0.29, h[2]], undefined, 5);
    m.ball([0.05, 0.05, 0.05], '#ff6f61', [h[0], h[1] + 0.41, h[2]], undefined, 8);
    for (const x of [-0.25, 0.25]) m.cyl(0.05, 0.05, 0.08, '#b08d57', [h[0] + x, h[1], h[2]], [0, 0, Math.PI / 2], 8); // ear bolts
  },
  // round friendly rock golem with moss
  boulder: (m) => {
    m.rock(0.36, '#708090', [0, 1.28, -0.2], [0.2, 0.4, 0], [1.1, 0.95, 1]);   // body
    const h: V3 = [0, 1.78, -0.1];
    m.rock(0.3, '#8a96a3', h, [0.5, 0.2, 0.3], [1.1, 0.9, 1]);
    m.ball([0.26, 0.08, 0.22], '#6a994e', [h[0], h[1] + 0.22, h[2]], undefined, 10);  // moss cap
    eyes(m, h, 0.06, 0.11, 0.02, 0.24);
    for (const x of [-1, 1]) m.rock(0.13, '#5f6b77', [x * 0.44, 1.2, 0.05], [0.4, x, 0]); // fists
  },
  // walrus chef
  gus: (m) => {
    const h: V3 = [0, 1.62, 0.12];
    m.ball([0.34, 0.3, 0.3], '#9c7a64', [0, 1.22, 0.05]);                  // body in the window
    m.ball([0.32, 0.3, 0.3], '#9c7a64', h);
    m.ball([0.2, 0.13, 0.12], '#c9a78e', [h[0], h[1] - 0.08, h[2] + 0.24], undefined, 10); // muzzle
    for (const x of [-0.08, 0.08]) m.cone(0.035, 0.26, '#fffaf0', [h[0] + x, h[1] - 0.26, h[2] + 0.3], [Math.PI, 0, 0], 6); // tusks
    eyes(m, h, 0.06, 0.13, 0.1, 0.22);
    m.cyl(0.24, 0.2, 0.08, '#ffffff', [h[0], h[1] + 0.28, h[2]]);          // hat band
    m.ball([0.28, 0.22, 0.26], '#ffffff', [h[0], h[1] + 0.46, h[2]], undefined, 12); // toque
    m.box([0.05, 0.36, 0.14], '#9e9e9e', [0.42, 1.36, 0.2], [0, 0, -0.5]);   // spatula
  },
};

export const RACER_IDS = Object.freeze(Object.keys(KARTS));

/**
 * How far each code-built driver moves to sit in a shared body's cockpit (bodies.ts SEAT): most sit
 * at the standard spot already; Boulder rides high in his truck and Gus stands in his food truck.
 */
const SEATED: Readonly<Record<string, V3>> = Object.freeze({ boulder: [0, -0.62, 0], gus: [0, -0.5, -0.2], sprocket: [0, -0.04, 0] });

/** Options for a racer's code-built model: an alt paint's recolour, and a shared body in place of the signature kart. */
export interface RacerModelOptions {
  recolor?: (c: Color) => Color;
  /** builds the shared body (bodies.ts) in place of the signature kart; the driver is seated in it */
  body?: (m: ModelBuilder) => void;
}

/** The builder for one racer, or null for an unknown id. */
export function racerModel(id: string, opts: RacerModelOptions = {}): ModelBuilder | null {
  const k = KARTS[id], d = DRIVERS[id];
  if (!k || !d) return null;
  const m = new ModelBuilder();
  m.recolor = opts.recolor ?? null;
  if (opts.body) {
    opts.body(m);
    m.shift = SEATED[id] ?? [0, 0, 0];
  } else k(m);
  m.driverPart = m.partCount;
  d(m);
  m.shift = [0, 0, 0];
  return m;
}

type WheelPair = { x: number; z: number; r: number; w: number };
/**
 * What the rig (rig.ts) needs of a code-built racer: the signature kart's wheels (the +X ones:
 * tyre middle, axle z, radius, half width) and the driver's hips and middle, where `racerModel`
 * seats them (moved by SEATED in a shared body, whose wheels are the body's own).
 */
export function codeRig(id: string, inBody: boolean): { wheels: { front: WheelPair; rear: WheelPair } | null; hips: { y: number; at: number } } | null {
  const w = WHEELS[id];
  if (!w) return null;
  const h = HIPS[id] ?? STANDARD_HIPS, s = inBody ? SEATED[id] ?? [0, 0, 0] : [0, 0, 0];
  const pair = (z: number): WheelPair => ({ x: w[1], z, r: w[0], w: w[3] / 2 });
  return { wheels: inBody ? null : { front: pair(w[2]), rear: pair(-w[2]) }, hips: { y: h.y + s[1], at: h.at + s[2] } };
}

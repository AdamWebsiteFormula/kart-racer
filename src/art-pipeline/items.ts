// The items as the race shows them (design §8; the new set of 28 Sept 2026, Adam: "something cool and
// maybe a little more edgy", "still rated G, just in a cool way"): what flies (the Laser Blaster's bolt, the
// Homing Rocket, the Seeker Drone), what lies on the road (the Oil Slick's chrome canister and its slick, the
// Decoy Mine, which is the pickup balloon itself with a clamp and a light of its own), and what karts carry
// or become (the Laser Blaster's charged orb, the Nitro canisters, the Jump Jets' thrusters, the Tractor
// Beam's emitter, Jet Mode's fighter jet, in parts so its wings unfold). Each solid model is one merged
// geometry built in code (itemKit.ts) with a finish per vertex, drawn in one PBR material (itemMaterial:
// chrome, paint, glass and lights in one batched draw); the light round them (a bolt's halo, the flames,
// the beam, glows) is a set of additive energy models (energyMaterial). The rescue claw and the slick keep
// the old toon models. Built once and shared.
import {
  AdditiveBlending, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, MeshBasicMaterial, MeshStandardMaterial,
  ShaderMaterial, SphereGeometry, TorusGeometry, type BufferGeometry,
} from 'three';
import { EnergyBuilder, FINISH, ItemBuilder, plateXZ } from './itemKit.ts';
import { isPbr, litWorld } from './look.ts';
import { ModelBuilder } from './model.ts';

/** The items' palette (sRGB), and the lights' glow colors. */
const C = Object.freeze({
  white: '#eef1f6', red: '#ff3a2f', dark: '#262a33', chrome: '#dde3ec', steel: '#5b616e', rubber: '#16171b', glass: '#1a2230',
  orange: '#ff7a1a', amber: '#ffb020', pink: '#ff4fb4', hot: '#fff0f8', cyan: '#35e3ff', blue: '#1e5eff', green: '#5dff8a',
  /** the pickup balloon's (decor.ts balloon) */
  skin: '#ff2e63', ribbon: '#fffaf0',
});

/** Jet Mode's fighter jet: its parts, painted in the racer's colors by the view (hull: accent; wings and fins: secondary). Metres, nose along +Z. */
export const JET = Object.freeze({
  /** where each wing folds up from (x either side of the hull, at the wing root) */
  hinge: 0.3,
  /** the two afterburners' nozzle exits (x either side, y, z) */
  nozzle: Object.freeze([0.17, 0, -1.62] as const),
  /** half the span and the length, for fitting */
  span: 1.34, length: 3.2,
});

type Build = () => BufferGeometry;

/** A wing (+x, the right; `sx` −1 mirrors it), folded flat. */
function wing(sx: 1 | -1): BufferGeometry {
  const b = new ItemBuilder();
  const pts: [number, number][] = [[0.28, 0.5], [1.3, -0.45], [1.3, -0.72], [0.28, -0.98]];
  b.part(plateXZ(pts.map(([x, z]) => [x * sx, z]), 0.07, 0.02), '#ffffff', FINISH.paint, [0, -0.02, 0]);
  // a rail along each wingtip
  b.cyl(0.035, 0.035, 0.66, '#ffffff', FINISH.paint, [1.31 * sx, -0.02, -0.56], [Math.PI / 2, 0, 0], 10);
  b.cone(0.035, 0.12, '#e6e6e6', FINISH.paint, [1.31 * sx, -0.02, -0.17], [Math.PI / 2, 0, 0], 10);
  return b.build();
}

const SOLID: Readonly<Record<string, Build>> = {
  // ---- Laser Blaster: the bolt (flying, along +Z) and the charged orb held behind the kart
  laserBolt: () => new ItemBuilder()
    .capsule(0.1, 1.6, C.hot, FINISH.light(5), [0, 0, 0], [Math.PI / 2, 0, 0], 10)
    .build(),
  laserOrb: () => new ItemBuilder()
    .ball([0.12, 0.12, 0.12], C.hot, FINISH.light(4.5), [0, 0, 0], undefined, 14)
    .torus(0.2, 0.02, C.chrome, FINISH.chrome, [0, 0, 0], [Math.PI / 2, 0, 0])
    .torus(0.2, 0.02, C.chrome, FINISH.chrome, [0, 0, 0])
    .torus(0.205, 0.014, C.pink, FINISH.light(3), [0, 0, 0], [0, Math.PI / 2, 0])
    .build(),
  // ---- Homing Rocket: nose along +Z, white with a red nose and fins, a glowing band, a chrome nozzle
  rocket: () => {
    const b = new ItemBuilder();
    b.cyl(0.16, 0.16, 0.8, C.white, FINISH.paint, [0, 0, 0.02], [Math.PI / 2, 0, 0], 20);
    b.lathe([[0.16, 0], [0.155, 0.08], [0.14, 0.17], [0.11, 0.27], [0.07, 0.36], [0.02, 0.42], [0, 0.44]], C.red, FINISH.paint, [0, 0, 0.42], [Math.PI / 2, 0, 0], 20);
    b.torus(0.163, 0.016, C.chrome, FINISH.chrome, [0, 0, 0.42]);
    b.cyl(0.166, 0.166, 0.1, C.dark, FINISH.steel, [0, 0, -0.3], [Math.PI / 2, 0, 0], 20);
    b.torus(0.168, 0.012, C.orange, FINISH.light(4), [0, 0, -0.2]);
    for (let k = 0; k < 4; k++) {
      b.part(plateXZ([[0.12, -0.05], [0.36, -0.36], [0.36, -0.5], [0.12, -0.45]], 0.03, 0.008), C.red, FINISH.paint, [0, 0, 0], [0, 0, Math.PI / 4 + (k * Math.PI) / 2]);
    }
    b.lathe([[0.11, 0], [0.125, 0.06], [0.14, 0.12]], C.steel, FINISH.steel, [0, 0, -0.35], [-Math.PI / 2, 0, 0], 18);
    b.disc(0.1, '#ffd9a0', FINISH.light(5), [0, 0, -0.42], [-Math.PI / 2, 0, 0]);
    return b.build();
  },
  // ---- Oil Slick: a chrome canister, standing on y = 0 (the view lays it on its side by the slick)
  canister: () => {
    const b = new ItemBuilder();
    b.cyl(0.19, 0.19, 0.46, C.chrome, FINISH.chrome, [0, 0.29, 0], undefined, 22);
    b.cyl(0.196, 0.196, 0.05, C.rubber, FINISH.rubber, [0, 0.13, 0], undefined, 22);
    b.cyl(0.196, 0.196, 0.05, C.rubber, FINISH.rubber, [0, 0.45, 0], undefined, 22);
    b.cyl(0.18, 0.18, 0.06, C.dark, FINISH.steel, [0, 0.03, 0], undefined, 22);
    b.ball([0.19, 0.08, 0.19], C.chrome, FINISH.chrome, [0, 0.52, 0], undefined, 18);
    b.cyl(0.045, 0.05, 0.1, C.dark, FINISH.steel, [0, 0.62, 0], undefined, 12);
    b.torus(0.07, 0.016, C.red, FINISH.paint, [0, 0.67, 0], [Math.PI / 2, 0, 0]);
    b.box([0.14, 0.03, 0.03], C.red, FINISH.paint, [0, 0.67, 0]);
    b.ball([0.028, 0.028, 0.028], C.amber, FINISH.light(5), [0, 0.3, 0.19], undefined, 8);
    return b.build();
  },
  // ---- Decoy Mine: the pickup balloon exactly (decor.ts balloon: its shape, color and matte skin, self-lit
  // at night like the real ones), plus a small dark clamp round its neck that only shows up close. Its red
  // light is `mineLight`, drawn when it blinks
  mine: () => {
    const b = new ItemBuilder();
    b.ball([0.78, 0.92, 0.78], C.skin, FINISH.balloon, [0, 0.12, 0], undefined, 18);
    b.ball([0.5, 0.56, 0.5], C.skin, FINISH.balloon, [0, -0.42, 0], undefined, 12);
    b.cone(0.13, 0.16, C.skin, FINISH.balloon, [0, -0.93, 0], undefined, 8);
    for (const z of [0.67, -0.67]) {
      b.ball([0.13, 0.24, 0.06], '#ffffff', FINISH.balloon, [-0.3, 0.4, z], [0, 0, 0.4], 10);
      b.ball([0.05, 0.05, 0.03], '#ffffff', FINISH.balloon, [-0.44, 0.08, z * 0.93], undefined, 6);
    }
    for (let k = 0; k < 4; k++) b.cyl(0.022, 0.022, 0.32, C.ribbon, FINISH.balloon, [0, -1.18 - k * 0.3, 0], [0, 0, (k % 2 ? 0.05 : -0.05) * 2.5], 4);
    b.torus(0.125, 0.03, '#2a2d35', FINISH.steel, [0, -0.8, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 18);
    return b.build();
  },
  mineLight: () => new ItemBuilder()
    .torus(0.13, 0.034, '#ff2a2a', FINISH.light(6), [0, -0.8, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 18)
    .ball([0.05, 0.05, 0.05], '#ff2a2a', FINISH.light(6), [0, -1.02, 0], undefined, 8)
    .build(),
  // ---- Seeker Drone: a hover drone flying along +Z, a glowing amber visor band (a sensor, not a face)
  drone: () => {
    const b = new ItemBuilder();
    b.ball([0.3, 0.12, 0.36], C.white, FINISH.paint, [0, 0, 0], undefined, 20);
    b.ball([0.25, 0.07, 0.3], C.dark, FINISH.steel, [0, -0.06, 0], undefined, 16);
    b.ball([0.15, 0.1, 0.17], C.glass, FINISH.glass, [0, 0.09, -0.03], undefined, 14);
    b.part(new SphereGeometry(1, 18, 3, Math.PI / 2 - 0.75, 1.5, Math.PI / 2 - 0.2, 0.34), C.amber, FINISH.light(4.5), [0, 0.005, 0], undefined, [0.308, 0.125, 0.368]);
    b.part(new SphereGeometry(1, 28, 2, 0, Math.PI * 2, Math.PI / 2 + 0.18, 0.12), C.orange, FINISH.paint, [0, 0, 0], undefined, [0.306, 0.123, 0.366]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 0.4, z = sz * 0.3;
      b.box([0.3, 0.035, 0.05], C.dark, FINISH.steel, [x * 0.62, 0, z * 0.62], [0, Math.atan2(-z, x), 0]);
      b.torus(0.12, 0.022, C.chrome, FINISH.chrome, [x, 0.02, z], [Math.PI / 2, 0, 0], Math.PI * 2, 20);
      b.cyl(0.028, 0.028, 0.05, C.dark, FINISH.steel, [x, 0.02, z], undefined, 8);
    }
    b.box([0.02, 0.1, 0.12], C.white, FINISH.paint, [0, 0.1, -0.3], [0.3, 0, 0]);
    b.ball([0.022, 0.022, 0.022], '#ff3030', FINISH.light(5), [0, 0.16, -0.34], undefined, 6);
    return b.build();
  },
  // ---- Nitro: one canister, standing on y = 0 (Triple Nitro orbits three)
  nitro: () => {
    const b = new ItemBuilder();
    b.cyl(0.115, 0.115, 0.03, C.chrome, FINISH.chrome, [0, 0.015, 0], undefined, 20);
    b.cyl(0.12, 0.12, 0.34, C.blue, FINISH.candy, [0, 0.2, 0], undefined, 20);
    b.ball([0.12, 0.075, 0.12], C.blue, FINISH.candy, [0, 0.37, 0], undefined, 18);
    b.cyl(0.1225, 0.1225, 0.08, C.white, FINISH.paint, [0, 0.19, 0], undefined, 20);
    b.cyl(0.124, 0.124, 0.018, C.cyan, FINISH.light(4), [0, 0.19, 0], undefined, 20);
    b.cyl(0.035, 0.04, 0.07, C.chrome, FINISH.chrome, [0, 0.46, 0], undefined, 12);
    b.cyl(0.055, 0.055, 0.03, C.chrome, FINISH.chrome, [0, 0.5, 0], undefined, 14);
    b.box([0.11, 0.022, 0.03], C.red, FINISH.paint, [0, 0.525, 0]);
    return b.build();
  },
  // ---- Jump Jets: one thruster pod, its nozzle's exit at y = 0 pointing down, its strut toward +x (the kart)
  thruster: () => {
    const b = new ItemBuilder();
    b.capsule(0.1, 0.2, C.white, FINISH.paint, [0, 0.27, 0], undefined, 16);
    b.cyl(0.103, 0.103, 0.05, C.orange, FINISH.paint, [0, 0.3, 0], undefined, 18);
    b.lathe([[0.105, 0], [0.085, 0.07], [0.07, 0.13]], C.steel, FINISH.steel, [0, 0, 0], undefined, 16);
    b.disc(0.08, '#ffe2b0', FINISH.light(5), [0, 0.03, 0], [Math.PI, 0, 0]);
    b.box([0.24, 0.05, 0.09], C.dark, FINISH.steel, [0.16, 0.3, 0]);
    b.ball([0.022, 0.022, 0.022], C.cyan, FINISH.light(4), [-0.1, 0.36, 0], undefined, 6);
    return b.build();
  },
  // ---- Tractor Beam: the emitter on the kart's nose, facing +Z
  beamEmitter: () => {
    const b = new ItemBuilder();
    b.cyl(0.07, 0.08, 0.1, C.dark, FINISH.steel, [0, 0, 0.05], [Math.PI / 2, 0, 0], 14);
    b.lathe([[0.03, 0], [0.09, 0.03], [0.15, 0.07], [0.17, 0.09]], C.chrome, FINISH.chrome, [0, 0, 0.08], [Math.PI / 2, 0, 0], 20);
    b.ball([0.05, 0.05, 0.05], C.green, FINISH.light(5), [0, 0, 0.14], undefined, 10);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + Math.PI / 2;
      b.cone(0.018, 0.14, C.chrome, FINISH.chrome, [Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.2], [Math.PI / 2, 0, 0], 6);
    }
    return b.build();
  },
  // ---- Jet Mode: a sleek little fighter, nose along +Z (swept wings, twin tails, two afterburners; no
  // bullet shape, no face). The hull, wings and fins are white: the view paints them in the racer's colors
  jetHull: () => {
    const b = new ItemBuilder();
    const prof: [number, number][] = [[0, -1.5], [0.27, -1.5], [0.3, -1.3], [0.33, -0.9], [0.34, -0.4], [0.34, 0.1], [0.32, 0.45], [0.28, 0.8], [0.22, 1.1], [0.14, 1.35], [0.06, 1.52], [0, 1.6]];
    b.lathe(prof, '#ffffff', FINISH.paint, [0, 0, 0], [Math.PI / 2, 0, 0], 22, [1.15, 1, 0.78]);
    b.ball([0.13, 0.1, 0.8], '#d9d9d9', FINISH.paint, [0, 0.2, -0.55], undefined, 16);
    for (const sx of [-1, 1]) {
      b.box([0.16, 0.2, 0.75], '#ffffff', FINISH.paint, [sx * 0.33, -0.06, 0.2]);
      b.part(plateXZ([[sx * 0.28, 1.05], [sx * 0.3, 0.45], [sx * 0.5, 0.45]], 0.035, 0.01), '#ffffff', FINISH.paint);
    }
    return b.build();
  },
  jetWingL: () => wing(-1),
  jetWingR: () => wing(1),
  jetFins: () => {
    const b = new ItemBuilder();
    for (const sx of [-1, 1]) {
      // a tail: its outline in (up, along), stood up and canted out 17°
      b.part(plateXZ([[0.18, -0.72], [0.92, -1.18], [0.92, -1.42], [0.18, -1.48]], 0.05, 0.015), '#ffffff', FINISH.paint, [sx * 0.24, 0, 0], [0, 0, Math.PI / 2 - sx * 0.3]);
      b.part(plateXZ([[sx * 0.26, -1.05], [sx * 0.78, -1.38], [sx * 0.78, -1.55], [sx * 0.26, -1.55]], 0.04, 0.012), '#ffffff', FINISH.paint);
    }
    return b.build();
  },
  jetTrim: () => {
    const b = new ItemBuilder();
    b.ball([0.16, 0.15, 0.48], C.glass, FINISH.glass, [0, 0.2, 0.62], undefined, 20);
    b.lathe([[0.15, 1.33], [0.13, 1.42], [0.08, 1.52], [0.03, 1.59], [0, 1.62]], '#2a2e36', FINISH.paint, [0, 0, 0], [Math.PI / 2, 0, 0], 22, [1.15, 1, 0.78]);
    for (const sx of [-1, 1]) {
      b.lathe([[0.13, 0], [0.145, 0.1], [0.155, 0.2]], C.steel, FINISH.steel, [sx * JET.nozzle[0], JET.nozzle[1], -1.42], [-Math.PI / 2, 0, 0], 18);
      b.torus(0.155, 0.018, C.chrome, FINISH.chrome, [sx * JET.nozzle[0], JET.nozzle[1], JET.nozzle[2]]);
      b.disc(0.125, '#bfe6ff', FINISH.light(5), [sx * JET.nozzle[0], JET.nozzle[1], -1.5], [-Math.PI / 2, 0, 0]);
      b.box([0.13, 0.15, 0.03], '#0e1014', FINISH.steel, [sx * 0.33, -0.06, 0.58]);
    }
    b.box([0.06, 0.02, 1.4], '#6fd0ff', FINISH.light(3), [0, -0.26, -0.2]);
    return b.build();
  },
};

// ---- the light round them: additive, one RGBA color a vertex (alpha: its share of the light)
/** A cone of fire from the origin back along −Z (length 1, radius 1): a white-hot core inside the flame's color, both fading to the tip. */
function flame(core: [number, number, number], body: [number, number, number]): BufferGeometry {
  const cone = (r: number, len: number) => new ConeGeometry(r, len, 16, 1, false).translate(0, len / 2, 0).rotateX(-Math.PI / 2);
  return new EnergyBuilder()
    .part(cone(0.45, 0.62), (p) => { const t = Math.min(1, -p.z / 0.62); return [core[0], core[1], core[2], (1 - t) * (1 - t)]; })
    .part(cone(1, 1), (p) => { const t = Math.min(1, -p.z); return [body[0], body[1], body[2], Math.pow(1 - t, 1.4) * 0.85]; })
    .build();
}

const ENERGY: Readonly<Record<string, Build>> = {
  // the Laser Blaster's bolt: a hot pink halo round the white core, and a fading streak behind
  boltGlow: () => new EnergyBuilder()
    .part(new CapsuleGeometry(0.22, 1.65, 4, 12), [2.4, 0.4, 1.4, 0.9], [0, 0, 0], [Math.PI / 2, 0, 0])
    .part(new CapsuleGeometry(0.42, 2.0, 4, 12), [1.3, 0.14, 0.75, 0.38], [0, 0, 0], [Math.PI / 2, 0, 0])
    .part(new ConeGeometry(0.2, 2.4, 12, 1, true).translate(0, 1.2, 0).rotateX(-Math.PI / 2), (p) => [2.2, 0.3, 1.3, Math.max(0, 1 + (p.z + 0.85) / 2.4) * 0.5], [0, 0, -0.85])
    .build(),
  /** a round glow (radius 1, white: the view gives each its color and strength) */
  glowOrb: () => new EnergyBuilder().part(new SphereGeometry(1, 16, 12), [1, 1, 1, 1]).build(),
  flameHot: () => flame([3.0, 2.5, 1.9], [2.2, 0.8, 0.12]),
  flameBlue: () => flame([2.4, 2.8, 3.2], [0.3, 0.9, 2.7]),
  /** a beam from the origin along +Z (length 1): a bright core in a wide soft glow (white: the view colors it) */
  beam: () => {
    const tube = (r: number) => new CylinderGeometry(r, r, 1, 16, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
    return new EnergyBuilder().part(tube(0.35), [1.6, 1.6, 1.6, 1]).part(tube(1), [0.6, 0.6, 0.6, 0.35]).build();
  },
  /** a thin ring in the XY plane (radius 1), facing +Z */
  ring: () => new EnergyBuilder().part(new TorusGeometry(1, 0.07, 8, 40), [1, 1, 1, 1]).build(),
  /** a flat round glow facing up (radius 1), bright in the middle, gone at the rim */
  disc: () => new EnergyBuilder().part(new CircleGeometry(1, 24).rotateX(-Math.PI / 2), (p) => [1, 1, 1, Math.max(0, 1 - Math.hypot(p.x, p.z))]).build(),
  // the Seeker Drone's four spinning rotors (a faint blur in each ring) and the amber glow of its hover jet under it
  droneFx: () => {
    const e = new EnergyBuilder();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) e.part(new CircleGeometry(0.11, 16).rotateX(-Math.PI / 2), (p) => [1.2, 1.2, 1.3, 0.22 * (0.4 + 0.6 * Math.min(1, Math.hypot(p.x - sx * 0.4, p.z - sz * 0.3) / 0.11))], [sx * 0.4, 0.02, sz * 0.3]);
    e.part(new CircleGeometry(0.26, 20).rotateX(-Math.PI / 2), (p) => [3.0, 1.5, 0.3, Math.max(0, 1 - Math.hypot(p.x, p.z) / 0.26) * 0.8], [0, -0.12, 0]);
    return e.build();
  },
};

const TOON: Readonly<Record<string, Build>> = {
  // a flat black pool; its own shader gives it the oily rainbow sheen
  oilSlick: () => {
    const m = new ModelBuilder();
    m.cyl(1.2, 1.2, 0.03, '#0a0a12', [0, 0.02, 0], undefined, 24, false);
    m.cyl(0.55, 0.55, 0.035, '#0a0a12', [0.95, 0.02, 0.5], undefined, 14, false);
    m.cyl(0.4, 0.4, 0.035, '#0a0a12', [-0.9, 0.02, -0.6], undefined, 12, false);
    return m.build();
  },
  // the rescue claw: a fairground claw-machine grabber, hub at the top (y = 0), three chrome
  // prongs hanging below it and curling in, a red light on the cap
  claw: () => {
    const m = new ModelBuilder();
    m.cyl(0.62, 0.7, 0.55, '#f2b705', [0, 0, 0], undefined, 16);                   // hub
    m.ball([0.45, 0.3, 0.45], '#f2b705', [0, 0.3, 0], undefined, 12);             // cap
    m.ball([0.14, 0.14, 0.14], [2.4, 0.4, 0.3], [0, 0.6, 0], undefined, 8, false); // light
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2, sx = Math.sin(a), cz = Math.cos(a);
      m.box([0.18, 1.2, 0.18], '#d9dee8', [sx * 0.7, -0.75, cz * 0.7], [cz * 0.35, 0, -sx * 0.35]);     // upper prong, splayed out
      m.box([0.16, 0.9, 0.16], '#d9dee8', [sx * 0.78, -1.65, cz * 0.78], [-cz * 0.5, 0, sx * 0.5]);     // lower prong, curling in
      m.cone(0.12, 0.3, '#c9ced8', [sx * 0.6, -2.12, cz * 0.6], [Math.PI, 0, 0], 6);                     // tip
    }
    return m.build();
  },
};

/** The solid kinds (the PBR batch), the energy kinds (the additive batch), the toon ones. */
export const SOLID_ITEM_KINDS = Object.freeze(Object.keys(SOLID));
export const ENERGY_ITEM_KINDS = Object.freeze(Object.keys(ENERGY));

const cache = new Map<string, BufferGeometry>();
/** The item model for a view kind, or null. Cached and shared: never dispose it. */
export function itemGeometry(kind: string): BufferGeometry | null {
  let g = cache.get(kind);
  if (!g) {
    const build = SOLID[kind] ?? ENERGY[kind] ?? TOON[kind];
    if (!build) return null;
    g = build();
    g.computeBoundingSphere();
    g.computeBoundingBox();
    cache.set(kind, g);
  }
  return g;
}
export const ITEM_MODEL_KINDS = Object.freeze([...SOLID_ITEM_KINDS, ...ENERGY_ITEM_KINDS, ...Object.keys(TOON)]);

// ---------------------------------------------------------------- materials

/** The pickup balloons' night glow, which the Decoy Mine mirrors (the race sets it from its track's own every frame: game/session.ts). */
export const ITEM_PICKUP_GLOW = { value: 0 };

/**
 * How the items take the painted sky in the PBR look: their share of its light (the world's is 0.4: a
 * racer's is its own), and how much more of its reflection a fully metal part takes (chrome must mirror the
 * sky, where the world's rough surfaces only catch a sheen).
 */
export const ITEM_LOOK = Object.freeze({ env: 0.7, chrome: 2.4 });

let solid: MeshStandardMaterial | null = null;
/**
 * The solid items' one material: vertex colors, and each vertex's own metalness, roughness and glow (the
 * `pbr` attribute, itemKit.ts); a lit part adds its color times its glow (above 1 blooms), the Decoy Mine's
 * skin adds the pickup balloons' night glow, and metal mirrors more of the sky. In the PBR look it takes the
 * world's sun and sky (look.ts litWorld), as the racers do. Shared, never disposed.
 */
export function itemMaterial(): MeshStandardMaterial {
  if (solid) return solid;
  const m = itemFinish(new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 }));
  m.name = 'items';
  m.userData.shared = true;
  m.userData.lookEnv = ITEM_LOOK.env;
  if (isPbr()) litWorld(m);
  solid = m;
  return m;
}

/** Each vertex's own finish (the `pbr` attribute) into a MeshStandardMaterial's shader: itemMaterial's, and the item icons' (game/itemIcons.ts). */
export function itemFinish(m: MeshStandardMaterial): MeshStandardMaterial {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uItemPickupGlow = ITEM_PICKUP_GLOW;
    shader.vertexShader = `attribute vec4 pbr;\nvarying vec4 vItemPbr;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vItemPbr = pbr;')}`;
    shader.fragmentShader = `uniform float uItemPickupGlow;\nvarying vec4 vItemPbr;\n${shader.fragmentShader}`
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vItemPbr.y;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vItemPbr.x;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * ( vItemPbr.z + vItemPbr.w * uItemPickupGlow );')
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>\n  radiance *= mix( 1.0, ${ITEM_LOOK.chrome.toFixed(2)}, vItemPbr.x );`);
  };
  m.customProgramCacheKey = () => 'items-pbr';
  return m;
}

let energy: MeshBasicMaterial | null = null;
/**
 * The items' light: additive, unlit, its RGBA vertex colors times each copy's own (the view's hue and
 * strength), its edges fading as they turn from the eye (a soft halo, not a hard shell), seen from either
 * side, never fogged (a light far off stays a light). Shared, never disposed.
 */
export function energyMaterial(): MeshBasicMaterial {
  if (energy) return energy;
  const m = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false });
  m.name = 'item-light';
  m.userData.shared = true;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying float vItemFace;\n${shader.vertexShader}`
      .replace('#include <batching_vertex>', '#include <batching_vertex>\n#include <beginnormal_vertex>\n#include <defaultnormal_vertex>')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vItemFace = abs( dot( normalize( transformedNormal ), normalize( -mvPosition.xyz ) ) );');
    shader.fragmentShader = `varying float vItemFace;\n${shader.fragmentShader}`
      .replace('#include <opaque_fragment>', 'diffuseColor.a *= smoothstep( 0.0, 1.0, vItemFace );\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'item-light';
  energy = m;
  return m;
}

/** Seconds for the oil film's and the shield's swirl; the game loop ticks it. */
export const BUBBLE_CLOCK = { value: 0 };

const SLICK_VERT = `
varying vec3 vW; varying vec3 vV;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SLICK_FRAG = `
uniform float time; uniform float film;
varying vec3 vW; varying vec3 vV;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  vec2 p = vW.xz * 1.7;
  // marbled film: wobbly rings of colour on a black pool, drifting slowly
  float n = sin(p.x * 1.3 + sin(p.y * 1.7 + time * 0.4) * 1.6) + sin(p.y * 1.1 - sin(p.x * 2.1 - time * 0.3) * 1.3);
  // thin bright bands, and only in some patches: oil is mostly black
  float bands = pow(0.5 + 0.5 * sin(n * 5.0), 3.0);
  float patchy = smoothstep(0.1, 0.9, sin(p.x * 0.55 + time * 0.2) * sin(p.y * 0.65 - time * 0.15) + 0.55);
  float graze = 1.0 - clamp(vV.y, 0.0, 1.0);
  vec3 hueFilm = hue(n * 0.35 + graze * 0.6 + time * 0.02);
  vec3 c = vec3(0.008, 0.008, 0.014) + hueFilm * bands * patchy * 0.13 * film * (0.6 + graze * 1.6);
  // the sky's sheen on the wet surface, and a glossy glint
  c += vec3(0.30, 0.34, 0.42) * pow(graze, 4.0) * 0.4;
  gl_FragColor = vec4(c, 1.0);
}`;

let slick: ShaderMaterial | null = null;
/**
 * Oil: a glossy black pool marbled with drifting rainbow film and the sky's sheen. Shared, never disposed.
 * `film` (a copy's own, not the shared one) scales the rainbow: the item picture's, seen from above, shows it stronger.
 */
export function oilSlickMaterial(film?: number): ShaderMaterial {
  if (!slick) {
    slick = new ShaderMaterial({ vertexShader: SLICK_VERT, fragmentShader: SLICK_FRAG, uniforms: { time: BUBBLE_CLOCK, film: { value: 1 } } });
    slick.userData.shared = true;
  }
  if (film === undefined) return slick;
  const m = slick.clone();
  m.uniforms.time = BUBBLE_CLOCK;
  m.uniforms.film = { value: film };
  return m;
}

/**
 * The Energy Shield's look: a hex force field. `cells`: hexes round the kart's side-to-side axis (the
 * grid's poles sit at the kart's flanks, where the eye only grazes it, so the back and top the chase camera
 * sees are undistorted); `rgb`: its linear color (above 1 blooms); `edge`: a hex rim's width (share of a
 * cell); `rise`: seconds it takes to sweep up from the ground when it comes on; `flicker`: the seconds left
 * from which it flickers before it goes.
 */
export const SHIELD = Object.freeze({
  cells: 7.5, rgb: Object.freeze([0.35, 1.6, 2.4] as const), edge: 0.09, rise: 0.3, flicker: 1.5,
  /** its size round a kart (x across, y up, z along) and its middle's height */
  radii: Object.freeze([1.5, 1.2, 1.85] as const), lift: 0.8,
});

const SHIELD_VERT = `
attribute vec3 aShield;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vS;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  vP = normalize(position);
  vS = aShield;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SHIELD_FRAG = `
uniform float time;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vS;
// a hex grid: (distance to the cell's rim, cell id)
vec3 hexCell(vec2 p) {
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  vec4 r = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
  vec2 a = abs(r.xy);
  return vec3(0.5 - max(dot(a, s * 0.5), a.x), r.zw);
}
void main() {
  // vS: seconds since it came on, its strength (0..1: the flicker as it runs out), a seed
  float age = vS.x, strength = vS.y;
  // the grid round the kart's side-to-side axis: longitude round x, latitude along it
  float lon = atan(vP.y, vP.z), lat = asin(clamp(vP.x, -1.0, 1.0));
  vec3 hx = hexCell(vec2(lon, lat * 1.1) * ${SHIELD.cells.toFixed(2)});
  float rim = 1.0 - smoothstep(0.0, ${SHIELD.edge.toFixed(3)}, hx.x);
  float fres = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  // cells light up now and then, a band of light sweeps up over it
  float cellSeed = fract(sin(dot(hx.yz, vec2(12.9898, 78.233)) + vS.z) * 43758.5453);
  float twinkle = smoothstep(0.93, 1.0, sin(time * 2.2 + cellSeed * 40.0) * 0.5 + 0.5);
  float band = smoothstep(0.82, 1.0, sin(vP.y * 3.0 - time * 3.4 + vS.z) * 0.5 + 0.5);
  // coming on: it grows up from the ground over its first moments, the front of the wave white-hot
  float up = vP.y * 0.5 + 0.5, grown = age / ${SHIELD.rise.toFixed(2)};
  float shown = smoothstep(grown + 0.05, grown - 0.05, up);
  float wave = smoothstep(0.18, 0.0, abs(up - grown)) * step(grown, 1.2);
  vec3 col = vec3(${SHIELD.rgb.map((v) => v.toFixed(2)).join(', ')});
  float light = rim * (0.28 + fres * 1.2) + pow(fres, 3.0) * 0.9 + twinkle * 0.35 + band * rim * 0.8;
  vec3 c = col * light + vec3(1.6, 2.0, 2.2) * wave;
  float a = clamp((light * 0.9 + wave) * shown * strength, 0.0, 1.0);
  gl_FragColor = vec4(c * shown * strength, a);
  // straight to the screen (the Low tier, no post chain): tone mapped and in the screen's colors like the rest
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

let shield: ShaderMaterial | null = null;
/**
 * The Energy Shield: a hex force field round the kart, its rims and its edge-on rim bright, a cell
 * twinkling here and there and a band of light sweeping up over it; it grows up from the ground when it
 * comes on and flickers as it runs out (each copy's `aShield`). Added over what is behind it. Shared, never
 * disposed.
 */
export function shieldMaterial(): ShaderMaterial {
  if (!shield) {
    shield = new ShaderMaterial({
      vertexShader: SHIELD_VERT, fragmentShader: SHIELD_FRAG, uniforms: { time: BUBBLE_CLOCK },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    });
    shield.userData.shared = true;
  }
  return shield;
}

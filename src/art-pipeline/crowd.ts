// Spectators (review, 24 Sept 2026: four of five video critiques found the mid-ground by the road empty,
// "no life, spectators or micro-details"; Mario Kart World lines its roads with cheering crowds).
// Original, G-rated townsfolk critters for each biome, code-built in the toon style:
// - every critter is an instance of ONE shared rig (a blobby body, head, snout, ears, arms, feet, hat, a
//   flag or a glow stick), shaped into its species by a small table in the vertex shader (ear length and
//   pinch, snout, body and head proportions, wings) and painted from per-species and per-biome colour
//   tables: the stands' crowds (seen close from the grid) are one InstancedMesh of the full rig, everyone
//   along the road (seen only at racing speed) one InstancedMesh of a lite rig: two draws;
// - their stands, bleachers, rope lines and floating cloud platforms are one static toon mesh: one draw;
// - none casts a shadow (no dark blot on the road that could read as a hazard's warning);
// - life is all in the vertex shader, a pure function of the clock and a few uniforms: idle bobbing,
//   waving, pumping, swaying and hopping; heads and bodies turn to follow the pack as it passes (the
//   player's kart as the camera sees it); a cheer burst (jumps, arms up) as it comes by their spot;
//   a cheer from every stand when the Final Lap Shift comes. Past CROWD.lodFar they shrink away; the
//   governor's Low (no shadow map) drops the crowd's draws.
// - no sound: the audio rules forbid crowd and cheer sounds.
// Placed outside the course limit (off-road tracks) or the solid edge (pier, sky road) by CLEAR metres
// and more, on level land, clear of every prop, the start gantry and the vista's perched birds; the
// checks in crowd.test.ts sweep the chase camera's corridor and every road, shortcuts and final lap included.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4,
  Mesh, MeshToonMaterial, OctahedronGeometry, Quaternion, SphereGeometry, Vector3, type Camera, type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VistaContext, VistaParts } from '../track-builder/mesh/index.ts';
import { hashString, mulberry32 } from '../track-builder/mesh/decor.ts';
import { glowFromVertexColours } from '../track-builder/mesh/glow.ts';
import { ModelBuilder, type Paint, type V3 } from './model.ts';
import { WATER_CLOCK } from './surfaces.ts';
import { toonRamp } from './toon.ts';

// ---------------------------------------------------------------- numbers

/** Species a track's crowd may mix, and cheer groups (stands, clusters, stretches of village) per track. */
export const CROWD_SPECIES = 4;
export const CROWD_GROUPS = 32;
/** Hat kinds in the hat table (0: none). */
const HAT_KINDS = 8;

/** How the crowd moves: all of it read by the vertex shader and by `crowdPose` (the checks). */
export const CROWD = Object.freeze({
  /** seconds a cheer burst lasts, and the stagger across a group (s, by each one's phase) */
  cheer: 3.2, stagger: 0.45,
  /** the pack sets a group off when it comes this near the group's spot on the road; back on watch once this far and the cheer is done */
  tripNear: 32, tripFar: 80,
  /** heads and bodies follow the pack fully within turnNear metres, not at all past turnFar */
  turnNear: 40, turnFar: 95,
  /** the pack, as the chase camera sees it: this far ahead of the lens, level */
  focusAhead: 6,
  /** the crowd shrinks away between these distances from the lens (m) */
  lodNear: 110, lodFar: 140,
  /** biggest lift of a jump or a cheer (m), turn limits (rad) */
  maxLift: 0.42, maxTurn: 1.3,
});

/** Metres past the course limit (or a pier's or sky road's solid edge) a stand, a critter or a rope line keeps at the least. */
export const CLEAR = 1.6;
/**
 * A sea coast's flat top is one height from the shoulder out to its own edge (COAST.flat, scene.ts):
 * a spot a hair past the 0.6 m water check can still sit metres shy of where the slope (and the sea)
 * begins, since the flat top reads the same height right up to its own lip. `ground()` also rules out
 * anywhere the coast dips toward the water within this many metres (SEA_RING), over the fan of angles
 * below either side of the road's own outward line (SEA_FAN, radians), so nobody stands at that lip
 * looking out over open water with the beach's edge out of frame (bug hunt, 25 Sept 2026: a village
 * pair on Harbour Loop's start straight read as floating over the harbour on the GP results backdrop;
 * their own point was dry, but the coast fell away within 9 m of them, outward, unseen by the
 * single-point check; a full circle round the point instead false-failed the whole beach, only
 * COAST.flat m wide end to end, so the fan looks only the one way the water can actually be).
 */
const SEA_RING: readonly number[] = [9];
const SEA_FAN: readonly number[] = [-0.5, 0, 0.5];
/** A pier's deck (land.ts, a walled sea track): flat this far past the curb (the shoulder and the coast's flat, less a margin), this far under the road. */
const PIER_DECK = 6 + 14 - 2, PIER_DROP = 0.4 + 0.12;

// ---------------------------------------------------------------- the rig (metres, feet at the origin, facing +Z)

const PART = { body: 0, belly: 1, head: 2, snout: 3, nose: 4, eye: 5, ear: 6, arm: 7, foot: 8, brim: 9, crown: 10, pompom: 11, collar: 12, stick: 13, flag: 14 } as const;
const SLOT = { body: 0, belly: 1, head: 2, mask: 3, snout: 4, nose: 5, eye: 6, foot: 7, ear: 8, earIn: 9, arm: 10, crown: 11, trim: 12, collar: 13, stick: 14, flag: 15 } as const;

const NECK_Y = 0.74;
const HEAD_C: V3 = [0, 0.98, 0.02], HEAD_R = 0.27;
const SNOUT_P: V3 = [0, 0.915, 0.19];
const NOSE_C: V3 = [0, 0.94, 0.345];
const HAT_A: V3 = [0, 1.21, 0.02];
const CROWN_H = 0.2;
/** A critter's height at scale 1 (to the top of its head), for the checks and for sizing. */
export const RIG_HEIGHT = 1.25;
/** Every critter is drawn this much bigger than its rig (townsfolk about 1.8 m tall: reviews found 1.25 m and 1.6 m ones small at racing speed, 22 m and more from the racing line past the 12 m verge). */
export const CRITTER_SCALE = 1.45;

/** Which optional parts a biome's rig carries (a part no species or kit there uses costs nothing); `lite`: the rig for critters only ever seen at racing speed, about half the triangles. */
interface RigParts { mask: boolean; brim: boolean; crown: boolean; pompom: boolean; collar: boolean; stick: boolean; flag: boolean; feet: boolean; lite: boolean }

type Paintf = (x: number, y: number, z: number) => number;

function tagged(g: BufferGeometry, id: number, pivot: V3, side: number, paint: number | Paintf, u?: Paintf): BufferGeometry {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.index) {
    const n = g.getAttribute('position').count, idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new BufferAttribute(idx, 1));
  }
  const pos = g.getAttribute('position'), n = pos.count;
  const rig = new Float32Array(n * 4), piv = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    rig[i * 4] = id; rig[i * 4 + 1] = typeof paint === 'number' ? paint : paint(x, y, z); rig[i * 4 + 2] = side; rig[i * 4 + 3] = u ? u(x, y, z) : 0;
    piv[i * 3] = pivot[0]; piv[i * 3 + 1] = pivot[1]; piv[i * 3 + 2] = pivot[2];
  }
  g.setAttribute('aRig', new BufferAttribute(rig, 4));
  g.setAttribute('aPivot', new BufferAttribute(piv, 3));
  g.clearGroups();
  return g;
}

const ball = (c: V3, r: V3, w: number, h: number) => new SphereGeometry(1, w, h).scale(r[0], r[1], r[2]).translate(c[0], c[1], c[2]);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const RIGS = new Map<string, BufferGeometry>();

/** The shared rig for a set of optional parts (cached; each crowd clones it). */
export function rigGeometry(parts: RigParts): BufferGeometry {
  const key = JSON.stringify(parts);
  const hit = RIGS.get(key);
  if (hit) return hit;
  const g: BufferGeometry[] = [], lite = parts.lite;
  // segments round and down each part: the full rig, or the lite one (seen from 15 m and more, at speed)
  const q = (full: [number, number], light: [number, number]) => (lite ? light : full);
  // body and a belly patch on its front
  g.push(tagged(ball([0, 0.4, 0], [0.33, 0.4, 0.29], ...q([7, 4], [5, 3])), PART.body, [0, 0, 0], 0, SLOT.body));
  g.push(tagged(ball([0, 0.36, 0.2], [0.22, 0.26, 0.13], ...q([6, 3], [4, 2])), PART.belly, [0, 0.36, 0.2], 0, SLOT.belly));
  // the head: a band round the eyes takes the mask colour (a raccoon's mask, a penguin's white face)
  g.push(tagged(ball(HEAD_C, [HEAD_R, HEAD_R, HEAD_R], ...(parts.mask ? q([7, 5], [5, 4]) : q([7, 4], [5, 3]))), PART.head, HEAD_C, 0,
    (_x, y, z) => (parts.mask && z > 0.1 && y > 0.88 && y < 1.08 ? SLOT.mask : SLOT.head)));
  // the snout, its pole along +Z so it pinches cleanly to a beak
  g.push(tagged(new SphereGeometry(1, ...q([5, 3], [3, 2])).rotateX(Math.PI / 2).scale(0.12, 0.085, 0.1).translate(0, 0.915, 0.245), PART.snout, SNOUT_P, 0, SLOT.snout,
    (_x, _y, z) => clamp01((z - 0.145) / 0.2)));
  if (!lite) g.push(tagged(new OctahedronGeometry(1, 0).scale(0.035, 0.03, 0.03).translate(...NOSE_C), PART.nose, NOSE_C, 0, SLOT.nose));
  for (const s of [-1, 1]) {
    const eye: V3 = [s * 0.1, 1.02, 0.26];
    g.push(tagged(lite ? new OctahedronGeometry(1, 0).scale(0.045, 0.055, 0.035).translate(...eye) : ball(eye, [0.04, 0.05, 0.03], 5, 3), PART.eye, eye, s, SLOT.eye));
    // ears stand on the head, pointing up from their base; their front face is the inner ear
    const ear: V3 = [s * 0.14, 1.19, -0.01];
    g.push(tagged(ball([ear[0], ear[1] + 0.1, ear[2]], [0.075, 0.12, 0.04], ...q([5, 3], [4, 2])), PART.ear, ear, s,
      (x, y, z) => (z > ear[2] + 0.01 && Math.abs(x - ear[0]) < 0.05 && y > ear[1] + 0.02 ? SLOT.earIn : SLOT.ear), (_x, y) => clamp01((y - ear[1]) / 0.22)));
    const shoulder: V3 = [s * 0.28, 0.6, 0.04];
    g.push(tagged(ball([s * 0.31, 0.46, 0.05], [0.075, 0.16, 0.075], ...q([5, 3], [4, 2])), PART.arm, shoulder, s, SLOT.arm));
    if (parts.feet && !lite) {
      const foot: V3 = [s * 0.13, 0.045, 0.1];
      g.push(tagged(ball(foot, [0.085, 0.045, 0.12], 4, 2), PART.foot, foot, s, SLOT.foot));
    }
  }
  // the hat: a brim, a crown that tapers (a dome, a cone), a pompom on top; about the hat's anchor on the head
  if (parts.brim) g.push(tagged(new CylinderGeometry(0.3, 0.3, 0.035, lite ? 5 : 7, 1).translate(HAT_A[0], HAT_A[1] + 0.0175, HAT_A[2]), PART.brim, HAT_A, 0, SLOT.trim));
  if (parts.crown) {
    const base: V3 = [HAT_A[0], HAT_A[1] + 0.02, HAT_A[2]];
    g.push(tagged(new CylinderGeometry(0.175, 0.195, CROWN_H, lite ? 5 : 6, 1).translate(base[0], base[1] + CROWN_H / 2, base[2]), PART.crown, base, 0, SLOT.crown,
      (_x, y) => clamp01((y - base[1]) / CROWN_H)));
  }
  if (parts.pompom) {
    const c: V3 = [HAT_A[0], HAT_A[1] + 0.02 + CROWN_H + 0.04, HAT_A[2]];
    g.push(tagged(lite ? new OctahedronGeometry(0.08, 0).translate(...c) : ball(c, [0.07, 0.07, 0.07], 4, 3), PART.pompom, c, 0, SLOT.trim));
  }
  if (parts.collar) g.push(tagged(new CylinderGeometry(0.2, 0.25, 0.08, lite ? 5 : 7, 1, true).translate(0, 0.77, 0), PART.collar, [0, 0.77, 0], 0, SLOT.collar));
  // held in the right hand (+X), along the arm: pointing down while it hangs, up and out when raised
  const hand: V3 = [0.28, 0.6, 0.04];
  if (parts.stick) g.push(tagged(new BoxGeometry(0.035, 0.62, 0.035).translate(0.33, 0.02, 0.07), PART.stick, hand, 1, SLOT.stick));
  if (parts.flag) g.push(tagged(new BoxGeometry(0.02, 0.2, 0.3).translate(0.33, -0.19, 0.22), PART.flag, hand, 1, SLOT.flag));
  const out = mergeGeometries(g, false)!;
  for (const x of g) x.dispose();
  RIGS.set(key, out);
  return out;
}

// ---------------------------------------------------------------- species (original critters, no look-alikes)

type V4 = [number, number, number, number];
interface Species {
  /** body width, height, depth scales; hover (m over its spot, a cloud sprite) */ body: V4;
  /** head width, height, depth scales; raise (m) */ head: V4;
  /** ears: length, width, pinch toward the tip (0 round, 1 a point), splay outward (rad) */ ear: V4;
  /** ears: tilt forward (rad, negative back), spacing, thickness; how far back the eyes sit (m, eyes on stalks) */ ear2: V4;
  /** snout: length, width, height, pinch (a beak pinches to a point) */ snout: V4;
  /** eyes: spacing, raise (m), size; nose size */ eye: V4;
  /** arm size, wing (0 an arm, 1 a flat wing), foot size, belly patch size */ limb: V4;
  colours: { body: Paint; head?: Paint; light: Paint; snout: Paint; nose: Paint; eye?: Paint; feet: Paint; ear?: Paint; earIn: Paint; arm?: Paint; mask?: Paint };
  /** metres tall at scale 1 (ears aside), to size it among the others */
  size: number;
}

const INK = '#1b1b2f';

export const SPECIES: Readonly<Record<string, Species>> = Object.freeze({
  // ---- Harbor Loop: otters, gull-folk, crabs in sun hats
  otter: {
    body: [1, 1.02, 1, 0], head: [1, 0.95, 1, -0.02], ear: [0.42, 0.95, 0, 0.55], ear2: [0.1, 1.08, 1, 0], snout: [0.9, 1.3, 1.1, 0], eye: [1, 0, 1, 1], limb: [1, 0, 1, 1],
    colours: { body: '#8b5a3c', light: '#f3dcb8', snout: '#f3dcb8', nose: '#2a1d1a', feet: '#6b4430', ear: '#7a4c33', earIn: '#d9a38a', arm: '#7d5036' }, size: 1,
  },
  gull: {
    body: [0.95, 1, 1.05, 0], head: [0.92, 0.95, 1, 0], ear: [0, 1, 0, 0], ear2: [0, 1, 1, 0], snout: [1.55, 0.55, 0.5, 0.85], eye: [1, 0.02, 1, 0], limb: [0.95, 1, 1, 0.9],
    colours: { body: '#fbfbf7', light: '#ffffff', snout: '#ffb627', nose: '#ff9f1c', feet: '#ff9f1c', earIn: '#fbfbf7', arm: '#b3bfcc' }, size: 1,
  },
  crab: {
    body: [1.45, 0.62, 1.05, 0], head: [0.8, 0.6, 0.8, -0.3], ear: [1.8, 0.35, 0, 0.12], ear2: [0.55, 1.2, 0.9, 0.05], snout: [0, 1, 1, 0], eye: [1.6, 0.5, 1.35, 0], limb: [1.55, 0, 0.9, 0.8],
    colours: { body: '#f25a3a', light: '#ff8a6a', snout: '#f25a3a', nose: '#f25a3a', feet: '#d94a2c', ear: '#f25a3a', earIn: '#f25a3a', arm: '#ff6b4a' }, size: 0.95,
  },
  // ---- Meadow Run: sheep, rabbits, farm mice
  sheep: {
    body: [1.12, 0.98, 1.08, 0], head: [0.9, 0.9, 0.95, -0.04], ear: [0.8, 0.85, 0.2, 1.35], ear2: [0.15, 1.1, 1, 0], snout: [0.7, 1.1, 1, 0], eye: [1, 0, 0.9, 0.8], limb: [0.85, 0, 1, 0],
    colours: { body: '#fbf7ee', head: '#f1dcc0', light: '#fbf7ee', snout: '#f1dcc0', nose: '#3a2a2a', feet: '#3a2f2a', ear: '#3f3531', earIn: '#d9a38a', arm: '#3f3531' }, size: 1,
  },
  rabbit: {
    body: [0.95, 1, 0.95, 0], head: [0.95, 0.95, 0.95, 0], ear: [2, 0.8, 0.3, 0.12], ear2: [-0.15, 0.75, 1, 0], snout: [0.6, 1.1, 1, 0], eye: [1, 0.01, 1, 0.8], limb: [0.9, 0, 1, 1],
    colours: { body: '#b08968', light: '#fff4e6', snout: '#fff4e6', nose: '#ff8fa3', feet: '#fff4e6', earIn: '#ffb3c1', arm: '#a47e5f' }, size: 0.95,
  },
  mouse: {
    body: [0.9, 0.9, 0.9, 0], head: [1, 0.95, 1, 0], ear: [0.9, 1.6, 0, 0.55], ear2: [0, 1.2, 0.8, 0], snout: [1.1, 0.8, 0.8, 0.5], eye: [0.95, 0.01, 1, 0.9], limb: [0.85, 0, 1, 1],
    colours: { body: '#9c8f86', light: '#efe4d6', snout: '#efe4d6', nose: '#ff8fa3', feet: '#ffb3c1', earIn: '#ffb3c1', arm: '#8d8078' }, size: 0.88,
  },
  // ---- Canyon Rush: jackrabbits, lizards, prairie dogs
  jackrabbit: {
    body: [0.9, 1.05, 0.9, 0], head: [0.9, 0.95, 0.95, 0], ear: [2.6, 0.95, 0.45, 0.28], ear2: [-0.1, 0.8, 1, 0], snout: [0.7, 1, 0.95, 0.1], eye: [1, 0, 1, 0.8], limb: [0.9, 0, 1.1, 1],
    colours: { body: '#c9a27a', light: '#f5e6cf', snout: '#f5e6cf', nose: '#6b4a3a', feet: '#f5e6cf', earIn: '#f0a3a3', arm: '#b8906a' }, size: 0.95,
  },
  lizard: {
    body: [0.95, 0.92, 1, 0], head: [1.1, 0.8, 1.05, -0.02], ear: [0, 1, 0, 0], ear2: [0, 1, 1, 0], snout: [1.3, 1.25, 0.75, 0.15], eye: [1.25, 0.07, 1.3, 0.4], limb: [0.85, 0, 1, 1],
    colours: { body: '#5fbf6a', light: '#f2e27a', snout: '#6fcf7a', nose: '#3a6b3f', feet: '#4fa35a', earIn: '#5fbf6a', arm: '#4fa35a' }, size: 1,
  },
  prairiedog: {
    body: [0.85, 1.15, 0.85, 0], head: [0.9, 0.9, 0.95, 0.02], ear: [0.35, 0.75, 0, 0.7], ear2: [0, 1, 1, 0], snout: [0.75, 1.1, 1, 0], eye: [0.95, 0.01, 1, 0.9], limb: [0.8, 0, 0.9, 1],
    colours: { body: '#b98b5a', light: '#ecd3a8', snout: '#ecd3a8', nose: '#3a2a22', feet: '#8c6440', ear: '#a57a4c', earIn: '#d9a38a', arm: '#a57a4c' }, size: 1,
  },
  // ---- Frostbite Pass: penguins, blue arctic foxes, snow hares
  penguin: {
    body: [1, 1.05, 1, 0], head: [0.9, 0.9, 0.95, -0.03], ear: [0, 1, 0, 0], ear2: [0, 1, 1, 0], snout: [1, 0.5, 0.45, 0.8], eye: [0.95, 0, 0.95, 0], limb: [0.95, 1, 1.1, 1.15],
    colours: { body: '#26283a', light: '#ffffff', snout: '#ffa62b', nose: '#ffa62b', feet: '#ffa62b', earIn: '#26283a', arm: '#26283a', mask: '#ffffff' }, size: 1,
  },
  fox: {
    body: [0.9, 1, 0.95, 0], head: [0.95, 0.9, 1, 0], ear: [1.25, 1, 0.9, 0.3], ear2: [0, 0.95, 0.9, 0], snout: [1.45, 0.9, 0.8, 0.55], eye: [0.95, 0.02, 0.95, 0.8], limb: [0.9, 0, 1, 1],
    colours: { body: '#aebbd0', light: '#f4f7fb', snout: '#f4f7fb', nose: '#2b2b3a', feet: '#e3e8f2', ear: '#98a6bd', earIn: '#e8ecf5', arm: '#9fadc3' }, size: 1,
  },
  hare: {
    body: [0.92, 1, 0.92, 0], head: [0.95, 0.95, 0.95, 0], ear: [2.2, 0.85, 0.3, 0.2], ear2: [-0.12, 0.78, 1, 0], snout: [0.6, 1.1, 1, 0], eye: [1, 0.01, 1, 0.8], limb: [0.9, 0, 1.1, 1],
    colours: { body: '#e3d6c3', light: '#ffffff', snout: '#fbf6ee', nose: '#ff7a93', feet: '#fbf6ee', ear: '#d9cbb6', earIn: '#ff9fb3', arm: '#d6c8b3' }, size: 0.95,
  },
  // ---- Boardwalk Nights: raccoons and cats in party hats with glow sticks
  raccoon: {
    body: [1, 0.98, 1, 0], head: [1.05, 0.92, 1, 0], ear: [0.8, 0.95, 0.6, 0.45], ear2: [0, 1.05, 0.9, 0], snout: [0.9, 0.85, 0.8, 0.45], eye: [1, 0.01, 1, 0.9], limb: [0.9, 0, 1, 1],
    colours: { body: '#8c8f99', light: '#e6e3dc', snout: '#e6e3dc', nose: '#1e1e24', eye: '#fffbe8', feet: '#3a3a44', ear: '#6f7280', earIn: '#3a3a44', arm: '#6f7280', mask: '#34343e' }, size: 1,
  },
  'cat-orange': {
    body: [0.9, 0.95, 0.9, 0], head: [1.05, 0.95, 1, 0], ear: [0.95, 1, 0.95, 0.35], ear2: [0, 1.05, 0.8, 0], snout: [0.55, 1, 0.9, 0], eye: [1.05, 0.01, 1.05, 0.7], limb: [0.85, 0, 0.9, 1],
    colours: { body: '#f29e4c', light: '#fff1e0', snout: '#fff1e0', nose: '#ff8fa3', feet: '#fff1e0', earIn: '#ffb3c1', arm: '#e58f3f' }, size: 0.92,
  },
  'cat-tux': {
    body: [0.9, 0.95, 0.9, 0], head: [1.05, 0.95, 1, 0], ear: [0.95, 1, 0.95, 0.35], ear2: [0, 1.05, 0.8, 0], snout: [0.55, 1, 0.9, 0], eye: [1.05, 0.01, 1.05, 0.7], limb: [0.85, 0, 0.9, 1],
    colours: { body: '#2e2e38', light: '#ffffff', snout: '#ffffff', nose: '#ff8fa3', eye: '#ffe066', feet: '#ffffff', earIn: '#ffb3c1', arm: '#2e2e38' }, size: 0.92,
  },
  'cat-lilac': {
    body: [0.9, 0.95, 0.9, 0], head: [1.05, 0.95, 1, 0], ear: [0.95, 1, 0.95, 0.35], ear2: [0, 1.05, 0.8, 0], snout: [0.55, 1, 0.9, 0], eye: [1.05, 0.01, 1.05, 0.7], limb: [0.85, 0, 0.9, 1],
    colours: { body: '#c7c2d6', light: '#ffffff', snout: '#ffffff', nose: '#ff8fa3', feet: '#ffffff', earIn: '#ffb3c1', arm: '#b8b2c9' }, size: 0.92,
  },
  // ---- Skyline Circuit: sky birds with crests, cloud sprites (puffs, dot eyes, no mouth, no arms)
  'bird-blue': {
    body: [0.95, 0.95, 1, 0], head: [1, 1, 1, 0], ear: [1.1, 0.45, 0.85, 0.1], ear2: [-0.55, 0.25, 0.7, 0], snout: [1.2, 0.55, 0.5, 0.85], eye: [1, 0.02, 1.05, 0], limb: [1.1, 1, 0.9, 0.9],
    colours: { body: '#5aa9e6', light: '#fff7e0', snout: '#ffc93c', nose: '#ffc93c', feet: '#ffb627', ear: '#ff7eb6', earIn: '#ff7eb6', arm: '#4a92cf' }, size: 0.95,
  },
  'bird-gold': {
    body: [0.95, 0.95, 1, 0], head: [1, 1, 1, 0], ear: [1.1, 0.45, 0.85, 0.1], ear2: [-0.55, 0.25, 0.7, 0], snout: [1.2, 0.55, 0.5, 0.85], eye: [1, 0.02, 1.05, 0], limb: [1.1, 1, 0.9, 0.9],
    colours: { body: '#ffd23f', light: '#fff7e0', snout: '#ff9f1c', nose: '#ff9f1c', feet: '#ff9f1c', ear: '#ff6f61', earIn: '#ff6f61', arm: '#f2bf2a' }, size: 0.95,
  },
  sprite: {
    body: [1.35, 0.72, 1.1, 0.7], head: [1.15, 0.85, 1, -0.2], ear: [1.2, 2.2, 0, 1.45], ear2: [0, 1.35, 4, 0], snout: [0.25, 1.4, 0.9, 0], eye: [1, 0, 0.9, 0], limb: [0, 0, 0, 0],
    colours: { body: '#fff3ec', light: '#fff3ec', snout: '#ffc9d2', nose: '#ffc9d2', eye: '#5b4a6b', feet: '#fff3ec', ear: '#fff3ec', earIn: '#fff3ec', arm: '#fff3ec' }, size: 0.9,
  },
});

// ---------------------------------------------------------------- hats and held kit

interface Hat { brim: number; crown: number; taper: number; pom: number; crownColour?: Paint; trim: Paint }
/** Hat kinds by index: 0 none, 1 sun hat, 2 sailor cap, 3 straw hat, 4 ranch hat, 5 beanie, 6 party cone, 7 a cloud's top puff. */
export const HATS: readonly Hat[] = Object.freeze([
  { brim: 0, crown: 0, taper: 1, pom: 0, trim: '#ffffff' },
  { brim: 1.3, crown: 0.5, taper: 0.8, pom: 0, trim: '#f3d38b' },
  { brim: 0.72, crown: 0.62, taper: 1.08, pom: 0, crownColour: '#fffaf0', trim: '#2f4f7f' },
  { brim: 1.1, crown: 0.8, taper: 0.85, pom: 0, crownColour: '#f0c96a', trim: '#e2b653' },
  { brim: 1.1, crown: 1, taper: 0.78, pom: 0, trim: '#f5e6cf' },
  { brim: 0, crown: 0.85, taper: 0.45, pom: 1, trim: '#ffffff' },
  { brim: 0, crown: 1.9, taper: 0, pom: 0.6, trim: '#fff3b0' },
  { brim: 0, crown: 0, taper: 1, pom: 2.5, trim: '#fff3ec' },
]);

// ---------------------------------------------------------------- biomes: who comes, what they wear, where they stand

/** A place the crowd gathers, on the lap-1 main line at `t`, on the side of the road toward or away from the track's middle. */
export interface Spot {
  /** corners: a group on the outside of each of the lap's `n` sharpest bends not already watched; lining: a small group every `every` metres round the lap wherever nobody watches yet (`t`: where the first stands) */
  kind: 'stand' | 'bleacher' | 'group' | 'village' | 'corners' | 'lining';
  t: number;
  side?: 'in' | 'out';
  /** the road's lateral side (+1, -1) instead of `side` (the corners find their outsides) */
  lat?: number;
  /** stand, bleacher: tiers and metres long */
  rows?: number; length?: number;
  /** group, village: how many (corners: how many bends); village: over this much lap (t) from `t`, both sides */
  n?: number; span?: number;
  /** corners, lining: critters in each group; lining: metres between groups */
  size?: number; every?: number;
  /** only these species come (villagers hovering over the void are sprites) */
  only?: string[];
}

interface StandStyle { frame: Paint; seatA: Paint; seatB: Paint; awningA: Paint; awningB: Paint; snow?: boolean; neon?: Paint; cloud?: boolean; rope: Paint }

interface Biome {
  species: string[];
  /** how often each species comes (same order) */
  mix: number[];
  /** hats by species (hat kind, weight) */
  hats: Record<string, [number, number][]>;
  /** accent colours: hat crowns, collars, flags (linear RGB over 1 glows: the glow sticks) */
  palette: Paint[];
  /** glow stick colours, linear, over 1 */
  glow?: [number, number, number][];
  /** share holding a flag (1) or a glow stick (2) */
  held: number; heldKind: 1 | 2;
  collar: number;
  sea?: boolean;
  /** a pier (walled, over the sea): its planked deck runs flat PIER_DECK metres past the edge, the road's height less PIER_DROP (track-builder land.ts) */
  pier?: boolean;
  /** no ground: every group floats on a cloud platform */
  sky?: boolean;
  /** how much the crowd lights itself (a night track, a sky of clouds) */
  selfLit?: number;
  /** stretches of lap (t from, to) and the side where a shortcut, a tunnel or a lake crossing leaves the road: no crowd there (the vista context knows only the main road) */
  keepOut?: [number, number, 'in' | 'out'][];
  stand: StandStyle;
  spots: Spot[];
}

const NEON: [number, number, number][] = [[2.6, 0.3, 1.6], [0.3, 2.2, 2.6], [2.4, 2.1, 0.3], [0.5, 2.6, 0.8]];

export const BIOMES: Readonly<Record<string, Biome>> = Object.freeze({
  harbour: {
    species: ['otter', 'gull', 'crab'], mix: [0.45, 0.3, 0.25],
    hats: { otter: [[2, 0.5], [1, 0.25], [0, 0.25]], gull: [[2, 0.55], [0, 0.45]], crab: [[1, 1]] },
    palette: ['#ff6f61', '#2ec4b6', '#ffd23f', '#3a6ea5', '#ff9ec7', '#7fc8ff', '#fffaf0', '#f4845f'],
    held: 0.3, heldKind: 1, collar: 0, sea: true, keepOut: [[0.66, 0.965, 'in']],
    stand: { frame: '#f4efe4', seatA: '#2ec4b6', seatB: '#3a6ea5', awningA: '#ff6f61', awningB: '#fffaf0', rope: '#ff6f61' },
    spots: [
      { kind: 'stand', t: 0.034, side: 'out', rows: 3, length: 10 },
      { kind: 'stand', t: 0.05, side: 'in', rows: 2, length: 7 },
      { kind: 'bleacher', t: 0.232, side: 'out', rows: 2, length: 6 },
      { kind: 'group', t: 0.315, side: 'out', n: 6 },
      { kind: 'group', t: 0.39, side: 'in', n: 6 },
      { kind: 'corners', t: 0, n: 3, size: 6 },
      { kind: 'lining', t: 0.1, every: 48, size: 5 },
      { kind: 'village', t: 0.08, span: 0.1, n: 7 },
    ],
  },
  meadow: {
    species: ['sheep', 'rabbit', 'mouse'], mix: [0.35, 0.35, 0.3],
    hats: { sheep: [[0, 0.7], [3, 0.3]], rabbit: [[3, 0.4], [0, 0.6]], mouse: [[3, 0.6], [0, 0.4]] },
    palette: ['#e8384f', '#ffd23f', '#7fc8ff', '#fffaf0', '#6bbf59', '#ff9f1c', '#b388eb', '#f4845f'],
    held: 0.3, heldKind: 1, collar: 0, keepOut: [[0.335, 0.58, 'in']],
    stand: { frame: '#b07a44', seatA: '#e8384f', seatB: '#ffd23f', awningA: '#e8384f', awningB: '#fffaf0', rope: '#ffd23f' },
    spots: [
      { kind: 'stand', t: 0.075, side: 'out', rows: 3, length: 10 },
      { kind: 'stand', t: 0.09, side: 'in', rows: 2, length: 7 },
      { kind: 'bleacher', t: 0.985, side: 'out', rows: 2, length: 6 },
      { kind: 'group', t: 0.765, side: 'out', n: 6 },
      { kind: 'group', t: 0.87, side: 'in', n: 6 },
      { kind: 'corners', t: 0, n: 3, size: 6 },
      { kind: 'lining', t: 0.15, every: 48, size: 5 },
      { kind: 'village', t: 0.58, span: 0.1, n: 6 },
    ],
  },
  canyon: {
    species: ['jackrabbit', 'lizard', 'prairiedog'], mix: [0.35, 0.3, 0.35],
    hats: { jackrabbit: [[4, 0.6], [0, 0.4]], lizard: [[4, 0.7], [0, 0.3]], prairiedog: [[4, 0.45], [0, 0.55]] },
    palette: ['#3ec9c0', '#ff6f61', '#ffd23f', '#fffaf0', '#e85d75', '#2a9d8f', '#f4a259', '#8ecae6'],
    held: 0.28, heldKind: 1, collar: 0.35, keepOut: [[0.3, 0.685, 'in']],
    stand: { frame: '#9a6538', seatA: '#3ec9c0', seatB: '#f4a259', awningA: '#3ec9c0', awningB: '#fffaf0', rope: '#ff6f61' },
    spots: [
      { kind: 'stand', t: 0.034, side: 'out', rows: 3, length: 10 },
      { kind: 'stand', t: 0.05, side: 'in', rows: 2, length: 7 },
      { kind: 'bleacher', t: 0.265, side: 'out', rows: 2, length: 6 },
      { kind: 'group', t: 0.79, side: 'in', n: 6 },
      { kind: 'group', t: 0.935, side: 'out', n: 6 },
      { kind: 'corners', t: 0, n: 3, size: 6 },
      { kind: 'lining', t: 0.1, every: 48, size: 5 },
      { kind: 'village', t: 0.9, span: 0.1, n: 6 },
    ],
  },
  frost: {
    species: ['penguin', 'fox', 'hare'], mix: [0.45, 0.25, 0.3],
    hats: { penguin: [[5, 0.85], [0, 0.15]], fox: [[5, 1]], hare: [[5, 1]] },
    palette: ['#ff2d95', '#7fc8ff', '#ffd23f', '#e8384f', '#2ec4b6', '#b388eb', '#ff9f1c', '#fffaf0'],
    held: 0, heldKind: 1, collar: 0.7, keepOut: [[0.53, 0.78, 'in']],
    stand: { frame: '#7a5236', seatA: '#ff2d95', seatB: '#7fc8ff', awningA: '#ff2d95', awningB: '#fffaf0', snow: true, rope: '#ff2d95' },
    spots: [
      { kind: 'stand', t: 0.045, side: 'out', rows: 3, length: 10 },
      { kind: 'stand', t: 0.06, side: 'in', rows: 2, length: 6 },
      { kind: 'bleacher', t: 0.495, side: 'out', rows: 2, length: 6 },
      { kind: 'group', t: 0.355, side: 'out', n: 6 },
      { kind: 'corners', t: 0, n: 3, size: 6 },
      { kind: 'lining', t: 0.12, every: 52, size: 5 },
      { kind: 'village', t: 0.9, span: 0.12, n: 6 },
    ],
  },
  boardwalk: {
    species: ['raccoon', 'cat-orange', 'cat-tux', 'cat-lilac'], mix: [0.4, 0.22, 0.2, 0.18],
    hats: { raccoon: [[6, 0.6], [0, 0.4]], 'cat-orange': [[6, 0.55], [0, 0.45]], 'cat-tux': [[6, 0.55], [0, 0.45]], 'cat-lilac': [[6, 0.55], [0, 0.45]] },
    palette: ['#ff2d95', '#2ee6ff', '#ffd23f', '#9b5de5', '#00f5d4', '#f15bb5', '#fee440', '#ff6f61'],
    glow: NEON, held: 0.5, heldKind: 2, collar: 0, sea: true, pier: true, selfLit: 0.5, keepOut: [[0.29, 0.43, 'out']],
    stand: { frame: '#2d2350', seatA: '#4c3c72', seatB: '#3a2d5a', awningA: '#ff2d95', awningB: '#2ee6ff', neon: [0.25, 1.5, 1.8], rope: '#ff2d95' },
    spots: [
      { kind: 'stand', t: 0.133, side: 'in', rows: 3, length: 10 },
      { kind: 'stand', t: 0.105, side: 'in', rows: 2, length: 7 },
      { kind: 'bleacher', t: 0.472, side: 'out', rows: 2, length: 7 },
      { kind: 'group', t: 0.8, side: 'in', n: 6 },
      { kind: 'group', t: 0.36, side: 'in', n: 6 },
      { kind: 'corners', t: 0, n: 3, size: 6 },
      { kind: 'lining', t: 0.2, every: 48, size: 5 },
      { kind: 'village', t: 0.56, span: 0.16, n: 7 },
    ],
  },
  skyline: {
    species: ['bird-blue', 'bird-gold', 'sprite'], mix: [0.35, 0.3, 0.35],
    hats: { 'bird-blue': [[0, 1]], 'bird-gold': [[0, 1]], sprite: [[7, 1]] },
    palette: ['#ffb4a2', '#ffd23f', '#7fc8ff', '#fffaf0', '#b388eb', '#ff7eb6', '#f4c64e', '#2ec4b6'],
    held: 0.3, heldKind: 1, collar: 0, sky: true, selfLit: 0.12, keepOut: [[0.46, 0.78, 'in']],
    stand: { frame: '#fff7ea', seatA: '#f4c64e', seatB: '#ffb4a2', awningA: '#f4c64e', awningB: '#fffaf0', cloud: true, rope: '#f4c64e' },
    spots: [
      { kind: 'stand', t: 0.034, side: 'out', rows: 3, length: 10 },
      { kind: 'bleacher', t: 0.05, side: 'in', rows: 2, length: 7 },
      { kind: 'group', t: 0.3, side: 'out', n: 6 },
      { kind: 'group', t: 0.44, side: 'out', n: 6 },
      { kind: 'corners', t: 0, n: 3, size: 5 },
      { kind: 'lining', t: 0.12, every: 50, size: 5 },
      { kind: 'village', t: 0.1, span: 0.12, n: 6, only: ['sprite'] },
    ],
  },
});

// ---------------------------------------------------------------- the shader

const f = (x: number) => x.toFixed(4);

const PARS = /* glsl */ `
uniform float uClock;
uniform vec3 uFocus;
uniform float uTrig[${CROWD_GROUPS}];
uniform vec4 uShape[${CROWD_SPECIES * 7}];
uniform vec3 uCol[${CROWD_SPECIES * 11}];
uniform vec3 uPal[8];
uniform vec4 uHat[${HAT_KINDS}];
uniform vec4 uHatCrown[${HAT_KINDS}];
uniform vec3 uHatTrim[${HAT_KINDS}];
uniform vec3 uGlowCol[4];
attribute vec4 aRig;
attribute vec3 aPivot;
attribute vec4 iLook;
attribute vec4 iAnim;
varying vec3 vPaint;
varying float vGlow;
mat3 cRotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 cRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 cRotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
`;

// The pose (replaces beginnormal_vertex: both the position and the normal come out of it). Mirrors crowdPose().
const POSE = /* glsl */ `
vec3 crowdQ;
vec3 objectNormal;
{
  int sp = int(iLook.x + 0.5);
  vec4 B = uShape[sp * 7], H = uShape[sp * 7 + 1], E = uShape[sp * 7 + 2], E2 = uShape[sp * 7 + 3];
  vec4 S = uShape[sp * 7 + 4], Y = uShape[sp * 7 + 5], L = uShape[sp * 7 + 6];
  int part = int(aRig.x + 0.5), slot = int(aRig.y + 0.5);
  float side = aRig.z, u = aRig.w;
  int hat = int(iLook.z + 0.5);
  int held = int(mod(iLook.w, 4.0) + 0.5);
  float collar = step(3.5, iLook.w);
  vec4 HT = uHat[hat];
  float T = uClock, ph = iAnim.x, style = iAnim.y, grp = iAnim.z;
  // ---- idle life by style
  float tempo = 1.3 + 0.8 * fract(ph * 7.31);
  float beat = T * tempo + ph * 3.7;
  float lift = 0.0, sway = 0.0, sq = 0.03 * sin(beat * 6.2831853);
  float aL = 0.3, aR = 0.3;
  if (style < 0.5) { float b = max(0.0, sin(beat * 6.2831853)); lift = 0.11 * b * b; aL = 0.5 + 0.3 * b; aR = aL; }
  else if (style < 1.5) { aR = 2.5 + 0.35 * sin(T * 8.5 + ph * 6.2831853); aL = 0.3 + 0.08 * sin(beat * 6.2831853); }
  else if (style < 2.5) { float b = 0.5 + 0.5 * sin(beat * 8.8); aL = 1.2 + 1.3 * b; aR = 1.2 + 1.3 * (1.0 - b); lift = 0.035 * b; }
  else if (style < 3.5) { float w = sin(T * 2.3 + ph * 6.2831853); sway = 0.13 * w; aL = 0.8 + 0.35 * w; aR = 0.8 - 0.35 * w; }
  else { float fr = fract(T / 1.8 + ph); float hop = fr < 0.3 ? sin(fr / 0.3 * 3.14159265) : 0.0; lift = 0.3 * hop; aL = 0.4 + 2.2 * hop; aR = aL; }
  if (held > 0) aR = max(aR, 2.3);
  // ---- the cheer burst: the pack passed this group's spot (or the Final Lap Shift came)
  float t0 = grp < -0.5 ? -1.0 : uTrig[int(grp + 0.5)];
  float k = t0 < 0.0 ? -1.0 : T - t0 - ph * ${f(CROWD.stagger)};
  float cheer = k < 0.0 ? 0.0 : smoothstep(0.0, 0.2, k) * (1.0 - smoothstep(${f(CROWD.cheer - 0.7)}, ${f(CROWD.cheer)}, k));
  float jb = abs(sin(k * 6.9));
  lift = mix(lift, 0.36 * jb, cheer);
  aL = mix(aL, 2.75 + 0.3 * sin(T * 12.0 + ph * 6.2831853), cheer);
  aR = mix(aR, 2.75 + 0.3 * sin(T * 12.0 + ph * 6.2831853 + 1.6), cheer);
  lift += B.w * (1.0 + 0.15 * sin(T * 1.4 + ph * 6.2831853));
  // ---- turning to follow the pack
  vec3 ip = instanceMatrix[3].xyz;
  vec3 dF = uFocus - ip;
  float rel = clamp(atan(dot(dF, instanceMatrix[0].xyz), dot(dF, instanceMatrix[2].xyz)), ${f(-CROWD.maxTurn)}, ${f(CROWD.maxTurn)});
  float wt = 1.0 - smoothstep(${f(CROWD.turnNear)}, ${f(CROWD.turnFar)}, length(dF.xz));
  float look = 0.35 * sin(T * 0.45 + ph * 11.0);
  float yawB = 0.45 * wt * rel;
  float yawH = clamp(mix(look, rel, wt) - yawB, -1.0, 1.0);
  // ---- the species' shape, then the parts' own motion
  vec3 p = position, nn = normal;
  vec3 neck = vec3(0.0, ${f(NECK_Y)} * B.y + H.w, 0.0);
  float keep = 1.0;
  if (part == 0) { p *= B.xyz; nn /= B.xyz; }
  else if (part == 1) { p = (aPivot + (p - aPivot) * L.w) * B.xyz; nn /= B.xyz; keep = step(0.01, L.w); }
  else if (part == 7 || part >= 13) {
    vec3 sh = aPivot * B.xyz, d = p - aPivot;
    if (part == 7) { vec3 sc = L.x * vec3(1.0 + 0.6 * L.y, 1.0 + 0.25 * L.y, 1.0 - 0.6 * L.y); d *= sc; nn /= max(sc, vec3(0.05)); keep = step(0.01, L.x); }
    else keep = part == 13 ? step(0.5, float(held)) : step(0.5, float(held)) * step(float(held), 1.5);
    float a = side > 0.0 ? aR : aL;
    mat3 R = cRotZ(side * a) * cRotX(-0.25 * sin(a));
    p = sh + R * d; nn = R * nn;
  }
  else if (part == 8) { p = aPivot * vec3(B.x, 1.0, B.z) + (p - aPivot) * L.z; keep = step(0.01, L.z); }
  else if (part == 12) { p = vec3(0.0, neck.y + 0.03, 0.0) + (p - aPivot) * vec3(B.x, 1.0, B.z) * 0.95; keep = collar; }
  else {
    vec3 d = p - aPivot, base = aPivot;
    bool hatPart = part >= 9;
    if (part == 3) { float pin = 1.0 - S.w * u; vec3 sc = vec3(S.y * pin, S.z * mix(1.0, pin, 0.6), S.x); d *= sc; nn /= max(sc, vec3(0.05)); keep = step(0.01, S.x); }
    else if (part == 4) { base = vec3(${f(SNOUT_P[0])}, ${f(SNOUT_P[1])}, ${f(SNOUT_P[2])}) + (aPivot - vec3(${f(SNOUT_P[0])}, ${f(SNOUT_P[1])}, ${f(SNOUT_P[2])})) * vec3(S.y * (1.0 - S.w), S.z * mix(1.0, 1.0 - S.w, 0.6), S.x); d *= Y.w; keep = step(0.01, Y.w) * step(0.01, S.x); }
    else if (part == 5) { base = vec3(aPivot.x * Y.x, aPivot.y + Y.y, aPivot.z - E2.w); d *= Y.z; }
    else if (part == 6) {
      float pin = 1.0 - E.z * u;
      vec3 sc = vec3(E.y * pin, E.x, E2.z * pin);
      d *= sc; nn /= max(sc, vec3(0.05));
      mat3 R = cRotZ(-side * E.w) * cRotX(E2.x);
      d = R * d; nn = R * nn;
      base = vec3(aPivot.x * E2.y, aPivot.y, aPivot.z);
      keep = step(0.01, E.x);
    }
    else if (part == 9) { d.xz *= HT.x; keep = step(0.01, HT.x); }
    else if (part == 10) { d.y *= HT.y; d.xz *= mix(1.0, HT.z, u); keep = step(0.01, HT.y); }
    else if (part == 11) { base = vec3(${f(HAT_A[0])}, ${f(HAT_A[1] + 0.02)} + ${f(CROWN_H)} * HT.y + 0.04 * HT.w, ${f(HAT_A[2])}); d *= HT.w; keep = step(0.01, HT.w); }
    p = base + d;
    if (hatPart) {
      vec3 A = vec3(${f(HAT_A[0])}, ${f(HAT_A[1])}, ${f(HAT_A[2])});
      p = neck + H.xyz * (A - vec3(0.0, ${f(NECK_Y)}, 0.0)) + H.x * (p - A);
    } else { p = neck + H.xyz * (p - vec3(0.0, ${f(NECK_Y)}, 0.0)); nn /= H.xyz; }
    mat3 R = cRotY(yawH);
    p = neck + R * (p - neck); nn = R * nn;
  }
  if (keep < 0.5) p = vec3(0.0, 0.4, 0.0);
  // ---- the whole critter: squash, sway, turn, lift, and shrink away far off
  p.y *= 1.0 + sq; p.xz *= 1.0 - 0.5 * sq;
  mat3 Rb = cRotY(yawB) * cRotZ(sway);
  p = Rb * p; nn = Rb * nn;
  p.y += lift;
  p *= 1.0 - smoothstep(${f(CROWD.lodNear)}, ${f(CROWD.lodFar)}, distance(cameraPosition, ip));
  crowdQ = p;
  objectNormal = normalize(nn);
  // ---- paint
  int cb = sp * 11, acc = int(iLook.y + 0.5);
  float tint = 1.0 + 0.1 * iAnim.w;
  vec3 col = uCol[cb] * tint;
  if (slot == 1) col = uCol[cb + 2];
  else if (slot == 2) col = uCol[cb + 1] * tint;
  else if (slot == 3) col = uCol[cb + 10];
  else if (slot == 4) col = uCol[cb + 3];
  else if (slot == 5) col = uCol[cb + 4];
  else if (slot == 6) col = uCol[cb + 5];
  else if (slot == 7) col = uCol[cb + 6];
  else if (slot == 8) col = uCol[cb + 7] * tint;
  else if (slot == 9) col = uCol[cb + 8];
  else if (slot == 10) col = uCol[cb + 9] * tint;
  else if (slot == 11) col = uHatCrown[hat].w > 0.5 ? uHatCrown[hat].xyz : uPal[acc];
  else if (slot == 12) col = uHatTrim[hat];
  else if (slot == 13) col = uPal[(acc + 3) % 8];
  else if (slot == 14) col = held == 2 ? uGlowCol[acc % 4] : vec3(0.85, 0.72, 0.52);
  else if (slot == 15) col = uPal[(acc + 2) % 8];
  // only a glow stick shines past white (a tinted white wing must not bloom)
  vGlow = slot == 14 && held == 2 ? 1.0 : 0.0;
  vPaint = vGlow > 0.5 ? col : min(col, vec3(1.0));
}
`;

/** The uniforms one crowd's material reads (one set per track; the program is shared). */
interface CrowdUniforms {
  uClock: { value: number };
  uFocus: { value: Vector3 };
  uTrig: { value: Float32Array };
  uShape: { value: Float32Array };
  uCol: { value: Float32Array };
  uPal: { value: Float32Array };
  uHat: { value: Float32Array };
  uHatCrown: { value: Float32Array };
  uHatTrim: { value: Float32Array };
  uGlowCol: { value: Float32Array };
  uSelfLit: { value: number };
}

const lin = (c: Paint): Color => (typeof c === 'object' ? new Color().setRGB(c[0], c[1], c[2]) : new Color(c));

function crowdUniforms(biome: Biome): CrowdUniforms {
  const shape = new Float32Array(CROWD_SPECIES * 7 * 4), col = new Float32Array(CROWD_SPECIES * 11 * 3);
  biome.species.forEach((name, i) => {
    const s = SPECIES[name];
    [s.body, s.head, s.ear, s.ear2, s.snout, s.eye, s.limb].forEach((v, k) => shape.set(v, (i * 7 + k) * 4));
    const c = s.colours;
    [c.body, c.head ?? c.body, c.light, c.snout, c.nose, c.eye ?? INK, c.feet, c.ear ?? c.body, c.earIn, c.arm ?? c.body, c.mask ?? c.head ?? c.body].forEach((p, k) => {
      const x = lin(p);
      col.set([x.r, x.g, x.b], (i * 11 + k) * 3);
    });
  });
  const pal = new Float32Array(8 * 3);
  biome.palette.forEach((p, k) => { const x = lin(p); pal.set([x.r, x.g, x.b], k * 3); });
  const hat = new Float32Array(HAT_KINDS * 4), crown = new Float32Array(HAT_KINDS * 4), trim = new Float32Array(HAT_KINDS * 3);
  HATS.forEach((h, k) => {
    hat.set([h.brim, h.crown, h.taper, h.pom], k * 4);
    const c = h.crownColour ? lin(h.crownColour) : null;
    crown.set(c ? [c.r, c.g, c.b, 1] : [0, 0, 0, 0], k * 4);
    const t = lin(h.trim);
    trim.set([t.r, t.g, t.b], k * 3);
  });
  const glow = new Float32Array(4 * 3);
  (biome.glow ?? NEON).forEach((g, k) => glow.set(g, k * 3));
  return {
    uClock: WATER_CLOCK, uFocus: { value: new Vector3(0, -1e4, 0) }, uTrig: { value: new Float32Array(CROWD_GROUPS).fill(-1) },
    uShape: { value: shape }, uCol: { value: col }, uPal: { value: pal }, uHat: { value: hat }, uHatCrown: { value: crown }, uHatTrim: { value: trim }, uGlowCol: { value: glow },
    uSelfLit: { value: biome.selfLit ?? 0 },
  };
}

/** The crowd's material: the scenery's toon look and lights, posed and painted in its vertex shader. */
function crowdMaterial(u: CrowdUniforms): MeshToonMaterial {
  const m = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp() });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <beginnormal_vertex>', POSE)
      .replace('#include <begin_vertex>', 'vec3 transformed = crowdQ;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaint;\nvarying float vGlow;\nuniform float uSelfLit;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vPaint;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  // a glow stick lights itself; a night crowd (or a sky of cloud sprites) a little too
  totalEmissiveRadiance += vPaint * (vGlow * 0.9 + uSelfLit);`);
  };
  m.customProgramCacheKey = () => 'crowd-1';
  return m;
}

// ---------------------------------------------------------------- the pose on the CPU (the checks)

/** One critter as the shader sees it (per-instance attributes and where it stands). */
export interface Spectator {
  species: string;
  /** feet, world metres; yaw (radians, local +Z faces the road); scale */
  at: V3; yaw: number; scale: number;
  /** iLook: species index, accent, hat, held + 4 × collar */
  look: V4;
  /** iAnim: phase 0..1, style 0..4, cheer group (-1 none), fur tint -1..1 */
  anim: V4;
  /** what it stands on: a stand's tier or a cloud platform, the ground, or nothing (a sprite hovering) */
  on: 'stand' | 'ground' | 'air';
  /** drawn with the lite rig (everyone but the stands' crowds: only ever seen at racing speed) */
  lite: boolean;
}

/**
 * The pose the vertex shader gives a critter at `clock` (the whole-body part of it): how high it is off
 * its spot, its sway, its body and head turn, its arms, and how much it is cheering. Pure: the same
 * inputs always give the same pose.
 */
export function crowdPose(s: Spectator, clock: number, focus: V3, trig: ArrayLike<number>, hover = 0): { lift: number; sway: number; yawBody: number; yawHead: number; armL: number; armR: number; cheer: number } {
  const T = clock, [ph, style, grp] = s.anim, held = Math.round(s.look[3] % 4);
  const TAU = Math.PI * 2, fract = (x: number) => x - Math.floor(x), smooth = (a: number, b: number, x: number) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const tempo = 1.3 + 0.8 * fract(ph * 7.31), beat = T * tempo + ph * 3.7;
  let lift = 0, sway = 0, aL = 0.3, aR = 0.3;
  if (style < 0.5) { const b = Math.max(0, Math.sin(beat * TAU)); lift = 0.11 * b * b; aL = aR = 0.5 + 0.3 * b; }
  else if (style < 1.5) { aR = 2.5 + 0.35 * Math.sin(T * 8.5 + ph * TAU); aL = 0.3 + 0.08 * Math.sin(beat * TAU); }
  else if (style < 2.5) { const b = 0.5 + 0.5 * Math.sin(beat * 8.8); aL = 1.2 + 1.3 * b; aR = 1.2 + 1.3 * (1 - b); lift = 0.035 * b; }
  else if (style < 3.5) { const w = Math.sin(T * 2.3 + ph * TAU); sway = 0.13 * w; aL = 0.8 + 0.35 * w; aR = 0.8 - 0.35 * w; }
  else { const fr = fract(T / 1.8 + ph), hop = fr < 0.3 ? Math.sin((fr / 0.3) * Math.PI) : 0; lift = 0.3 * hop; aL = aR = 0.4 + 2.2 * hop; }
  if (held > 0) aR = Math.max(aR, 2.3);
  const t0 = grp < -0.5 ? -1 : trig[Math.round(grp)];
  const k = t0 < 0 ? -1 : T - t0 - ph * CROWD.stagger;
  const cheer = k < 0 ? 0 : smooth(0, 0.2, k) * (1 - smooth(CROWD.cheer - 0.7, CROWD.cheer, k));
  const jb = Math.abs(Math.sin(k * 6.9));
  lift += (0.36 * jb - lift) * cheer;
  aL += (2.75 + 0.3 * Math.sin(T * 12 + ph * TAU) - aL) * cheer;
  aR += (2.75 + 0.3 * Math.sin(T * 12 + ph * TAU + 1.6) - aR) * cheer;
  lift += hover * (1 + 0.15 * Math.sin(T * 1.4 + ph * TAU));
  const dx = focus[0] - s.at[0], dz = focus[2] - s.at[2];
  const lx = dx * Math.cos(s.yaw) - dz * Math.sin(s.yaw), lz = dx * Math.sin(s.yaw) + dz * Math.cos(s.yaw);
  const rel = Math.max(-CROWD.maxTurn, Math.min(CROWD.maxTurn, Math.atan2(lx, lz)));
  const wt = 1 - smooth(CROWD.turnNear, CROWD.turnFar, Math.hypot(dx, dz));
  const look = 0.35 * Math.sin(T * 0.45 + ph * 11);
  const yawBody = 0.45 * wt * rel;
  const yawHead = Math.max(-1, Math.min(1, look + (rel - look) * wt - yawBody));
  return { lift, sway, yawBody, yawHead, armL: aL, armR: aR, cheer };
}

// ---------------------------------------------------------------- stands, bleachers, rope lines, cloud platforms

const TIER_RISE = 0.55, TIER_DEPTH = 1.2, SEAT_GAP = 1.3;

/** A stand facing +Z, its front edge's middle at the origin, `rows` tiers rising back toward -Z; a roof over a grandstand. Where each tier's critters stand. */
function standModel(st: StandStyle, rows: number, length: number, roof: boolean, palette: readonly Paint[]): { geo: BufferGeometry; seats: V3[] } {
  const m = new ModelBuilder();
  const L = length, D = rows * TIER_DEPTH, top = rows * TIER_RISE, foot = st.cloud ? 0.4 : 0.8;
  for (let i = 0; i < rows; i++) {
    const h = (i + 1) * TIER_RISE, z = -(i + 0.5) * TIER_DEPTH;
    m.box([L, h + foot, TIER_DEPTH], st.frame, [0, (h - foot) / 2, z], undefined, false);
    m.box([L + 0.02, 0.09, TIER_DEPTH * 0.72], i % 2 ? st.seatB : st.seatA, [0, h + 0.03, z + TIER_DEPTH * 0.1], undefined, false);
    if (st.neon) m.box([L + 0.04, 0.07, 0.07], st.neon, [0, h - 0.02, -i * TIER_DEPTH + 0.02], undefined, false);
  }
  // a back wall with a rail, and stepped side walls
  m.box([L + 0.3, top + foot + 1.1, 0.16], st.frame, [0, (top + 1.1 - foot) / 2, -D - 0.08], undefined, false);
  for (const s of [-1, 1]) {
    for (let i = 0; i < rows; i++) {
      const h = (i + 1) * TIER_RISE + 0.35;
      m.box([0.16, h + foot, TIER_DEPTH], st.frame, [s * (L / 2 + 0.08), (h - foot) / 2, -(i + 0.5) * TIER_DEPTH], undefined, false);
    }
  }
  if (roof) {
    const H = top + 3.1, n = Math.max(4, Math.round(L / 1.5)), w = L / n;
    // a striped canopy, sloping down to the front, a scalloped valance, pennants along its back
    const tilt = 0.16, depth = D + 1.0, cz = -D / 2 + 0.2;
    for (const s of [-1, 1]) {
      for (const z of [-0.2, -D + 0.1]) {
        const topY = H - (z - cz) * Math.sin(tilt) - 0.04;
        m.cyl(0.07, 0.08, topY + foot, st.frame, [s * (L / 2 - 0.1), (topY - foot) / 2, z], undefined, 6, false);
      }
    }
    for (let k = 0; k < n; k++) {
      const x = -L / 2 + (k + 0.5) * w;
      m.box([w + 0.01, 0.08, depth], k % 2 ? st.awningB : st.awningA, [x, H, cz], [tilt, 0, 0], false);
      m.cone(w * 0.5, 0.4, k % 2 ? st.awningB : st.awningA, [x, H - 0.28 - Math.sin(tilt) * depth * 0.5, cz + depth / 2 - 0.02], [Math.PI, 0, 0], 3, false);
      if (st.snow) m.box([w + 0.02, 0.1, depth], '#f6faff', [x, H + 0.09, cz], [tilt, 0, 0], false);
      if (st.neon && k % 2 === 0) m.box([w * 0.8, 0.06, 0.06], st.neon, [x, H - 0.05 - Math.sin(tilt) * depth * 0.5, cz + depth / 2 + 0.02], undefined, false);
    }
    for (let k = 0; k <= n; k++) {
      const x = -L / 2 + k * w;
      m.cone(0.22, 0.5, palette[k % palette.length], [x, H + 0.55 + Math.sin(tilt) * depth * 0.5, cz - depth / 2 + 0.1], undefined, 3, false);
    }
  } else {
    // a bleacher: a flag pole at each end
    for (const s of [-1, 1]) {
      const x = s * (L / 2 + 0.1), hgt = top + 2.2;
      m.cyl(0.05, 0.06, hgt + foot, st.frame, [x, (hgt - foot) / 2, -D + 0.1], undefined, 5, false);
      m.box([0.03, 0.45, 0.8], palette[s > 0 ? 0 : 1], [x, hgt - 0.3, -D + 0.1 + 0.42], undefined, false);
    }
  }
  if (st.cloud) cloudBase(m, L + 1.2, D + 1.6, -D / 2, -foot);
  const seats: V3[] = [];
  for (let i = 0; i < rows; i++) {
    const n = Math.max(2, Math.floor(L / SEAT_GAP));
    for (let k = 0; k < n; k++) seats.push([-L / 2 + 0.45 + (k * (L - 0.9)) / Math.max(1, n - 1), (i + 1) * TIER_RISE + 0.08, -(i + 0.45) * TIER_DEPTH]);
  }
  return { geo: m.build(), seats };
}

/** A floating platform of cloud (Skyline): puffs under a flat top, `w` × `d` metres, its top at y. */
function cloudBase(m: ModelBuilder, w: number, d: number, cz: number, y: number): void {
  m.ball([w / 2 + 0.3, 0.35, d / 2 + 0.3], '#fffaf5', [0, y - 0.2, cz], undefined, 12, false);
  const n = Math.max(3, Math.round(w / 2.2));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + ((k + 0.5) * w) / n;
    m.ball([1.3, 0.8, d / 2.2], k % 2 ? '#fff3ec' : '#ffe8e0', [x, y - 0.75, cz + ((k % 3) - 1) * 0.3], undefined, 8, false);
  }
  m.box([w, 0.1, 0.12], '#f4c64e', [0, y, cz + d / 2], undefined, false);
}

/** A rope line in front of a group on the ground: posts and a rope, `w` metres along X, facing +Z; post k stands at height `ys[k]` (it follows the ground). */
function ropeLine(st: StandStyle, w: number, ys: readonly number[]): BufferGeometry {
  const m = new ModelBuilder(), n = ys.length;
  const x = (k: number) => -w / 2 + (k * w) / (n - 1);
  for (let k = 0; k < n; k++) {
    m.cyl(0.05, 0.06, 1.2, st.frame, [x(k), ys[k] + 0.3, 0], undefined, 5, false);
    m.ball([0.08, 0.08, 0.08], st.rope, [x(k), ys[k] + 0.92, 0], undefined, 5, false);
  }
  // the rope from post to post, sagging a little
  for (let k = 0; k + 1 < n; k++) {
    const dx = x(k + 1) - x(k), dy = ys[k + 1] - ys[k], len = Math.hypot(dx, dy);
    m.box([len, 0.05, 0.05], st.rope, [(x(k) + x(k + 1)) / 2, (ys[k] + ys[k + 1]) / 2 + 0.74, 0], [0, 0, Math.atan2(dy, dx)], false);
  }
  return m.build();
}

// ---------------------------------------------------------------- placement

/** What a crowd put where, for the checks: every critter, every stand's footprint, the cheer groups. */
export interface CrowdLayout {
  spectators: Spectator[];
  /** footprints of stands, rope lines and platforms: centre, yaw, half-sizes (across the road, along it), top height */
  solids: { at: V3; yaw: number; half: [number, number]; top: number; kind: string }[];
  /** each cheer group's spot on the road (the pack passing near it sets it off) and its kind */
  groups: { at: V3; kind: Spot['kind'] }[];
}

const UP = new Vector3(0, 1, 0);
const M4 = new Matrix4(), Q4 = new Quaternion(), P4 = new Vector3(), S4 = new Vector3();

class Placer {
  readonly ctx: VistaContext;
  readonly biome: Biome;
  readonly rng: () => number;
  /** the main line every ~2 m: centre, limit (m from the centre to the course limit or the solid edge) */
  private readonly xs: Float32Array; private readonly zs: Float32Array; private readonly ys: Float32Array; private readonly lim: Float32Array;
  readonly length: number;
  readonly avoid: [number, number, number][];
  /** circles the crowd itself has claimed, filed by grid cell (CLAIM_CELL m; no claim is wider than a cell) */
  private readonly mine = new Map<number, number[]>();
  constructor(ctx: VistaContext, biome: Biome, avoid: [number, number, number][]) {
    this.ctx = ctx; this.biome = biome; this.avoid = avoid;
    this.rng = mulberry32(hashString(`crowd:${ctx.biome}`));
    let len = 0, prev = ctx.road!(0).p;
    for (let i = 1; i <= 400; i++) { const p = ctx.road!(i / 400).p; len += Math.hypot(p[0] - prev[0], p[2] - prev[2]); prev = p; }
    this.length = len;
    const n = Math.max(64, Math.round(len / 2));
    this.xs = new Float32Array(n); this.zs = new Float32Array(n); this.ys = new Float32Array(n); this.lim = new Float32Array(n);
    for (let i = 0; i < n; i++) { const r = ctx.road!(i / n); this.xs[i] = r.p[0]; this.ys[i] = r.p[1]; this.zs[i] = r.p[2]; this.lim[i] = r.limit; }
    // each segment filed under every grid cell within NEAR metres of it, so a query reads a few dozen, not all
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, r = NEAR + Math.max(this.lim[i], this.lim[j]);
      const x0 = Math.floor((Math.min(this.xs[i], this.xs[j]) - r) / CELL), x1 = Math.floor((Math.max(this.xs[i], this.xs[j]) + r) / CELL);
      const z0 = Math.floor((Math.min(this.zs[i], this.zs[j]) - r) / CELL), z1 = Math.floor((Math.max(this.zs[i], this.zs[j]) + r) / CELL);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const k = cellKey(cx, cz);
          let list = this.cells.get(k);
          if (!list) this.cells.set(k, (list = []));
          list.push(i);
        }
      }
    }
  }
  private readonly cells = new Map<number, number[]>();
  /** Metres from (x, z) out past the main line's course limit (negative: inside it), and the road's height there (past NEAR metres of it: far, as good as clear). */
  clearance(x: number, z: number): { past: number; y: number } {
    const list = this.cells.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return { past: NEAR, y: 0 };
    const n = this.xs.length;
    let best = Infinity, by = 0;
    for (const i of list) {
      const j = (i + 1) % n, ax = this.xs[i], az = this.zs[i], bx = this.xs[j] - ax, bz = this.zs[j] - az;
      const l2 = bx * bx + bz * bz, k = l2 > 0 ? clamp01(((x - ax) * bx + (z - az) * bz) / l2) : 0;
      const d = Math.hypot(x - ax - bx * k, z - az - bz * k) - (this.lim[i] + (this.lim[j] - this.lim[i]) * k);
      if (d < best) { best = d; by = this.ys[i] + (this.ys[j] - this.ys[i]) * k; }
    }
    return { past: best, y: by };
  }
  /**
   * The ground under (x, z), or null where there is none to stand on (the sea, no ground). `away`:
   * the unit direction from the road that placed this candidate (its `ox, oz`); when given and the
   * biome is a sea, also refuses a spot the coast falls away from within SEA_RING m, roughly that way
   * on (a lone critter with no footing to read by). Omitted by a stand or a rope post's footprint or
   * foundation points, which already check their own footprint is level and get their solidity from
   * the model built there, and by the generic `level()` probes, which only re-sample close by.
   */
  ground(x: number, z: number, roadY: number, away?: readonly [number, number]): number | null {
    if (this.biome.sky) return null;
    if (this.biome.pier) {
      // the scene gives a pier no land function: its deck is flat out to PIER_DECK past the curb
      const c = this.clearance(x, z);
      return c.past <= PIER_DECK ? c.y - PIER_DROP : null;
    }
    const g = this.ctx.groundAt?.(x, z) ?? this.ctx.groundY;
    if (!Number.isFinite(g)) return null;
    // a sea track's land (its coast) stands over the water; the water is no place to stand, nor the coast's slope into it
    if (this.biome.sea) {
      if (g < this.ctx.groundY + 0.6 || g < roadY - 2.5) return null;
      // the flat top reads this same height right up to its own edge, so a point can pass alone while
      // the coast already falls away a few (or a few more) metres on, back toward the road that placed
      // it: refuse anywhere the sea shows within SEA_RING m of a fan either side of that line, at each
      // ring so a dip past the nearer one is never missed between the two (a full circle round the
      // point instead false-failed a beach only COAST.flat m wide: the road side of it is never the sea)
      if (away) {
        const base = Math.atan2(away[0], away[1]);
        for (const R of SEA_RING) for (const d of SEA_FAN) {
          const a = base + d;
          const gg = this.ctx.groundAt?.(x + Math.sin(a) * R, z + Math.cos(a) * R) ?? this.ctx.groundY;
          if (gg < this.ctx.groundY + 0.6) return null;
        }
      }
    }
    return g;
  }
  /** Is a circle of radius r at (x, z) free of props, the start gantry, the vista's perches and the crowd itself? */
  free(x: number, z: number, r: number): boolean {
    if (!(this.ctx.clear?.(x, z, r) ?? true)) return false;
    for (const [ax, az, ar] of this.avoid) if ((x - ax) ** 2 + (z - az) ** 2 < (r + ar) ** 2) return false;
    const ci = Math.floor(x / CLAIM_CELL), cj = Math.floor(z / CLAIM_CELL);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        const c = this.mine.get(cellKey(i, j));
        if (!c) continue;
        for (let k = 0; k < c.length; k += 3) if ((x - c[k]) ** 2 + (z - c[k + 1]) ** 2 < (r + c[k + 2]) ** 2) return false;
      }
    }
    return true;
  }
  claim(x: number, z: number, r: number): void {
    const k = cellKey(Math.floor(x / CLAIM_CELL), Math.floor(z / CLAIM_CELL));
    let c = this.mine.get(k);
    if (!c) this.mine.set(k, (c = []));
    c.push(x, z, r);
  }
  /** Is the road's lateral side `lat` (+1, -1) at t where a shortcut leaves it (the biome's keepOut)? */
  forbidden(t: number, lat: number): boolean {
    const u = ((t % 1) + 1) % 1, side = lat === this.frame(u).out ? 'out' : 'in';
    return (this.biome.keepOut ?? []).some(([a, b, sd]) => sd === side && (a <= b ? u >= a && u <= b : u >= a || u <= b));
  }
  /** The road at t: where, which way, which way is out from the track's middle (+1: +lateral), how far its limit stands. */
  frame(t: number): { p: V3; along: [number, number]; right: [number, number]; limit: number; out: number } {
    const r = this.ctx.road!(((t % 1) + 1) % 1), [cx, cz] = this.ctx.centre;
    const out = (r.p[0] - cx) * r.right[0] + (r.p[2] - cz) * r.right[1] > 0 ? 1 : -1;
    return { p: r.p, along: r.along, right: r.right, limit: r.limit, out };
  }
}

/** The placer's road index: grid cells of CELL metres; a segment is filed under every cell within NEAR metres of its course limit. */
const CELL = 16, NEAR = 40, CLAIM_CELL = 4;
const cellKey = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);

/** t offsets to try round a spot: 0, +1, -1, +2, ... steps of `metres`, out to `reach` metres. */
function around(p: Placer, metres: number, reach: number): number[] {
  const out = [0];
  for (let k = 1; k * metres <= reach; k++) out.push((k * metres) / p.length, (-k * metres) / p.length);
  return out;
}

interface Built {
  spectators: Spectator[];
  standGeos: BufferGeometry[];
  layout: CrowdLayout;
}

/** A stand, a bleacher: a straight structure along the road's chord at the spot, its front CLEAR+ past the limit, on level land. */
function placeStand(p: Placer, spot: Spot, st: StandStyle, group: number, b: Built, kit: (only?: string[]) => KitPick): boolean {
  const rows = spot.rows ?? 2, L0 = spot.length ?? 8, roof = spot.kind === 'stand';
  const side = spot.side ?? 'out', other = side === 'out' ? 'in' : 'out';
  // as asked; shorter; then across the road (a house, a cliff or the sea where it was asked for)
  const tries: ['in' | 'out', number][] = [[side, L0], [side, Math.max(5, L0 * 0.7)], [other, L0], [other, Math.max(5, L0 * 0.7)]];
  for (const [sd, L] of tries) if (tryStand(p, spot, sd, L, rows, roof, st, group, b, kit)) return true;
  return false;
}

function tryStand(p: Placer, spot: Spot, side: 'in' | 'out', L: number, rows: number, roof: boolean, st: StandStyle, group: number, b: Built, kit: (only?: string[]) => KitPick): boolean {
  const D = rows * TIER_DEPTH + 0.3;
  for (const extra of [0.4, 1.4, 2.6, 4]) {
    for (const dt of around(p, 2, 30)) {
      const f = p.frame(spot.t + dt), s = side === 'out' ? f.out : -f.out;
      if (p.forbidden(spot.t + dt, s)) continue;
      const ox = f.right[0] * s, oz = f.right[1] * s; // away from the road
      const d0 = f.limit + CLEAR + extra;
      const fx = f.p[0] + ox * d0, fz = f.p[2] + oz * d0;
      // its footprint: along the chord, D deep away from the road
      let ok = true, lo = Infinity, hi = -Infinity, sumY = 0, nY = 0;
      for (let v = -L / 2 - 1.5; v <= L / 2 + 1.51 && ok; v += 1.5) {
        for (let w = -0.5; w <= D + 1.51 && ok; w += Math.max(0.5, D / 3)) {
          const x = fx + f.along[0] * v + ox * w, z = fz + f.along[1] * v + oz * w;
          const c = p.clearance(x, z);
          if (c.past < CLEAR + 0.2) { ok = false; break; }
          if (!p.free(x, z, 0.9)) { ok = false; break; }
          if (!p.biome.sky) {
            // the structure itself reads as solid ground (its own model bridges to the footprint's
            // height average below), so this dense sample skips the lip check meant for a lone critter
            const g = p.ground(x, z, f.p[1]);
            if (g === null) { ok = false; break; }
            lo = Math.min(lo, g); hi = Math.max(hi, g); sumY += g; nY++;
          }
        }
      }
      if (!ok || (!p.biome.sky && hi - lo > 0.6)) continue;
      const y = p.biome.sky ? f.p[1] - 0.35 : sumY / nY;
      const yaw = Math.atan2(-ox, -oz);
      const { geo, seats } = standModel(st, rows, L, roof, p.biome.palette);
      M4.compose(P4.set(fx, y, fz), Q4.setFromAxisAngle(UP, yaw), S4.set(1, 1, 1));
      geo.applyMatrix4(M4);
      b.standGeos.push(geo);
      const cx = fx + ox * D / 2, cz = fz + oz * D / 2;
      for (let v = -L / 2; v <= L / 2 + 0.01; v += 1.5) for (let w = 0; w <= D; w += 1) p.claim(fx + f.along[0] * v + ox * w, fz + f.along[1] * v + oz * w, 0.9);
      b.layout.solids.push({ at: [cx, y, cz], yaw, half: [D / 2 + (roof ? 0.6 : 0), L / 2 + 0.3], top: y + rows * TIER_RISE + (roof ? 3.8 : 2.4), kind: spot.kind });
      // critters on the tiers, a few seats left empty
      const pos = new Vector3();
      for (const seat of seats) {
        if (p.rng() < 0.12) continue;
        pos.set(seat[0] + (p.rng() - 0.5) * 0.18, seat[1], seat[2] + (p.rng() - 0.5) * 0.12).applyMatrix4(M4);
        b.spectators.push(critter(p, kit(spot.only), [pos.x, pos.y, pos.z], yaw + (p.rng() - 0.5) * 0.3, group, 'stand', false));
      }
      b.layout.groups.push({ at: [f.p[0], f.p[1], f.p[2]], kind: spot.kind });
      return true;
    }
  }
  return false;
}

/** A group on the ground (or a cloud platform over the void): a loose crowd behind a rope line. */
function placeGroup(p: Placer, spot: Spot, st: StandStyle, group: number, b: Built, kit: (only?: string[]) => KitPick): void {
  const side = spot.side ?? 'out';
  if (tryGroup(p, spot, side, st, group, b, kit)) return;
  tryGroup(p, spot.lat ? { ...spot, lat: -spot.lat } : spot, side === 'out' ? 'in' : 'out', st, group, b, kit);
}

/** Metres between critters along a group's rope line, and between its two rows. */
const LINE_GAP = 1.2, ROW_GAP = 1.1;

function tryGroup(p: Placer, spot: Spot, side: 'in' | 'out', st: StandStyle, group: number, b: Built, kit: (only?: string[]) => KitPick): boolean {
  // two staggered rows along a rope line facing the road (Mario Kart World lines its barriers so): the
  // front row just behind the rope, nobody hiding behind anybody from the road
  const n = spot.n ?? 5, perRow = Math.ceil(n / 2), W = (perRow - 0.5) * LINE_GAP + 1.2;
  for (const extra of [0, 0.8, 1.8]) {
    for (const dt of around(p, 2, 40)) {
      const f = p.frame(spot.t + dt), s = spot.lat ?? (side === 'out' ? f.out : -f.out);
      if (p.forbidden(spot.t + dt, s)) continue;
      const ox = f.right[0] * s, oz = f.right[1] * s, ax = f.along[0], az = f.along[1];
      const d0 = f.limit + CLEAR + extra; // the rope line
      const rx = f.p[0] + ox * d0, rz = f.p[2] + oz * d0;
      const yaw = Math.atan2(-ox, -oz);
      const platformY = f.p[1] - 0.35;
      const spots: V3[] = [];
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < perRow && spots.length < n; k++) {
          const v = (k - (perRow - 1) / 2) * LINE_GAP + (r ? LINE_GAP / 2 : 0) + (p.rng() - 0.5) * 0.25;
          const w = 0.85 + r * ROW_GAP + (p.rng() - 0.5) * 0.2;
          const x = rx + ax * v + ox * w, z = rz + az * v + oz * w;
          if (p.clearance(x, z).past < CLEAR + 0.5 || !p.free(x, z, 0.45)) continue;
          let y = platformY;
          if (!p.biome.sky) {
            const g = p.ground(x, z, f.p[1], [ox, oz]);
            if (g === null || !level(p, x, z, f.p[1], 0.45, 0.35) || !level(p, x, z, f.p[1], LIP, 0.6)) continue;
            y = g;
          }
          spots.push([x, y, z]);
        }
      }
      if (spots.length < Math.ceil(n * 0.7)) continue;
      for (const q of spots) {
        p.claim(q[0], q[2], 0.5);
        b.spectators.push(critter(p, kit(spot.only), q, yaw + (p.rng() - 0.5) * 0.35, group, p.biome.sky ? 'stand' : 'ground'));
      }
      const M = M4.compose(P4.set(0, 0, 0), Q4.setFromAxisAngle(UP, yaw), S4.set(1, 1, 1));
      if (p.biome.sky) {
        // the cloud platform they stand on, over the void
        const m = new ModelBuilder(), cx = rx + ox * (0.85 + ROW_GAP / 2), cz = rz + oz * (0.85 + ROW_GAP / 2);
        // (its front no nearer the road than the rope line would be: its puffs reach half its depth and 0.3 m more)
        cloudBase(m, W + 1.2, ROW_GAP + 1.1, 0, 0);
        b.standGeos.push(m.build().applyMatrix4(M.setPosition(cx, platformY, cz)));
        b.layout.solids.push({ at: [cx, platformY, cz], yaw, half: [(ROW_GAP + 1.1) / 2 + 0.45, W / 2 + 1], top: platformY + 0.2, kind: 'platform' });
      } else {
        // the rope line in front, each post on the ground under it (its posts reach 0.3 m into it)
        const posts = Math.max(2, Math.round(W / 2) + 1);
        const ys = Array.from({ length: posts }, (_, k) => p.ground(rx + ax * (-W / 2 + (k * W) / (posts - 1)), rz + az * (-W / 2 + (k * W) / (posts - 1)), f.p[1]));
        if (ys.every((g) => g !== null) && p.free(rx, rz, 0.3)) {
          const ry = Math.min(...(ys as number[]));
          b.standGeos.push(ropeLine(st, W, (ys as number[]).map((g) => g - ry)).applyMatrix4(M.setPosition(rx, ry, rz)));
          b.layout.solids.push({ at: [rx, ry, rz], yaw, half: [0.12, W / 2 + 0.1], top: Math.max(...(ys as number[])) + 1, kind: 'rope' });
        }
      }
      b.layout.groups.push({ at: [f.p[0], f.p[1], f.p[2]], kind: 'group' });
      return true;
    }
  }
  return false;
}

/** Metres of lap per cheer group along a village. */
const VILLAGE_STRETCH = 60;

/** Villagers along a stretch of the lap: ones and twos, on both sides, each its own little look at the road; a cheer group every VILLAGE_STRETCH metres. */
function placeVillage(p: Placer, spot: Spot, b: Built, kit: (only?: string[]) => KitPick): void {
  const n = spot.n ?? 6, span = spot.span ?? 0.1;
  const chunks = Math.max(1, Math.ceil((span * p.length) / VILLAGE_STRETCH));
  const groupOf = new Map<number, number>();
  let placed = 0;
  for (let tries = 0; placed < n && tries < n * 40; tries++) {
    const u = p.rng(), t = spot.t + u * span, f = p.frame(t), s = p.rng() < 0.5 ? 1 : -1;
    if (p.forbidden(t, s)) continue;
    const ox = f.right[0] * s, oz = f.right[1] * s;
    const d0 = f.limit + CLEAR + 0.5 + p.rng() * 6;
    const x = f.p[0] + ox * d0, z = f.p[2] + oz * d0;
    if (p.clearance(x, z).past < CLEAR + 0.5 || !p.free(x, z, 0.6)) continue;
    let y = f.p[1] + 0.3 + p.rng() * 1.8; // a sprite hovering by the road
    if (!p.biome.sky) {
      const g = p.ground(x, z, f.p[1], [ox, oz]);
      if (g === null || !level(p, x, z, f.p[1], 0.45, 0.3) || !level(p, x, z, f.p[1], LIP, 0.6)) continue;
      y = g;
    }
    const chunk = Math.min(chunks - 1, Math.floor(u * chunks));
    let group = groupOf.get(chunk);
    if (group === undefined && b.layout.groups.length < CROWD_GROUPS) {
      const c = p.frame(spot.t + ((chunk + 0.5) / chunks) * span);
      b.layout.groups.push({ at: [c.p[0], c.p[1], c.p[2]], kind: 'village' });
      group = b.layout.groups.length - 1;
      groupOf.set(chunk, group);
    }
    // a little cluster: this one and one or two friends beside it along the road, facing the road
    const yaw = Math.atan2(-ox, -oz), friends = 1 + Math.floor(p.rng() * 2);
    const here: V3[] = [[x, y, z]];
    for (let k = 1; k <= friends && placed + here.length < n; k++) {
      const v = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.15, w = (p.rng() - 0.5) * 0.6;
      const fx = x + f.along[0] * v + ox * w, fz = z + f.along[1] * v + oz * w;
      if (p.clearance(fx, fz).past < CLEAR + 0.5 || !p.free(fx, fz, 0.45)) continue;
      let fy = y + (p.rng() - 0.5) * 0.8;
      if (!p.biome.sky) {
        const g = p.ground(fx, fz, f.p[1], [ox, oz]);
        if (g === null || !level(p, fx, fz, f.p[1], 0.45, 0.3) || !level(p, fx, fz, f.p[1], LIP, 0.6)) continue;
        fy = g;
      }
      here.push([fx, fy, fz]);
    }
    for (const q of here) {
      p.claim(q[0], q[2], 0.5);
      b.spectators.push(critter(p, kit(spot.only), q, yaw + (p.rng() - 0.5) * 0.6, group ?? -1, p.biome.sky ? 'air' : 'ground'));
      placed++;
    }
  }
}

/** How much the road turns over 24 m about t (the change in its unit direction) and which way (+: toward its +lateral side, whose outside is -lateral). */
function turnAt(p: Placer, t: number): { turn: number; toward: number } {
  const span = 12 / p.length, a = p.frame(t - span), c = p.frame(t + span), m = p.frame(t);
  const dx = c.along[0] - a.along[0], dz = c.along[1] - a.along[1];
  return { turn: Math.hypot(dx, dz), toward: dx * m.right[0] + dz * m.right[1] };
}

/** Small groups all round the lap, `every` metres apart, on a bend's outside (else alternating sides), wherever no group watches within 40 m. */
function placeLining(p: Placer, spot: Spot, st: StandStyle, b: Built, kit: (only?: string[]) => KitPick): void {
  const count = Math.max(1, Math.floor(p.length / (spot.every ?? 90)));
  let alt = 1;
  for (let k = 0; k < count && b.layout.groups.length < CROWD_GROUPS; k++) {
    const t = (spot.t + k / count) % 1, f = p.frame(t);
    if (b.layout.groups.some((g) => Math.hypot(g.at[0] - f.p[0], g.at[2] - f.p[2]) < 40)) continue;
    const c = turnAt(p, t);
    alt = -alt;
    const lat = c.turn > 0.2 ? (c.toward > 0 ? -1 : 1) : alt;
    placeGroup(p, { kind: 'group', t, lat, n: spot.size ?? 4 }, st, b.layout.groups.length, b, kit);
  }
}

/** The lap's sharpest bends (t, and the lateral side of each one's outside), sharpest first, `apart` metres apart and clear of `taken` t's by `clear` metres. */
function bends(p: Placer, n: number, taken: number[], apart = 90, clear = 45): { t: number; lat: number }[] {
  const N = 400, out: { t: number; lat: number; turn: number }[] = [];
  const all = Array.from({ length: N }, (_, i) => ({ t: i / N, ...turnAt(p, i / N) }));
  const gap = (a: number, b: number) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d) * p.length; };
  for (let i = 0; i < N; i++) {
    const c = all[i], l = all[(i + N - 1) % N], r = all[(i + 1) % N];
    if (c.turn < 0.3 || c.turn < l.turn || c.turn < r.turn) continue; // a real bend (17° or more over 24 m), at its sharpest
    out.push({ t: c.t, lat: c.toward > 0 ? -1 : 1, turn: c.turn });
  }
  out.sort((a, b) => b.turn - a.turn);
  const picked: { t: number; lat: number }[] = [];
  for (const c of out) {
    if (picked.length >= n) break;
    if (picked.some((q) => gap(q.t, c.t) < apart) || taken.some((t) => gap(t, c.t) < clear)) continue;
    picked.push({ t: c.t, lat: c.lat });
  }
  return picked;
}

/** Metres round a critter's spot over which the land must hold level too: the drawn coast is a 2.5 m grid, and a spot at a flat top's lip stands over its slope. */
const LIP = 2.2;

/** Is the ground within `tol` metres across a circle of radius r at (x, z)? */
function level(p: Placer, x: number, z: number, roadY: number, r: number, tol: number): boolean {
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, g = p.ground(x + Math.cos(a) * r, z + Math.sin(a) * r, roadY);
    if (g === null) return false;
    lo = Math.min(lo, g); hi = Math.max(hi, g);
  }
  return hi - lo <= tol;
}

interface KitPick { species: number; hat: number; held: number; collar: boolean }

function critter(p: Placer, k: KitPick, at: V3, yaw: number, group: number, on: Spectator['on'], lite = true): Spectator {
  const name = p.biome.species[k.species], s = SPECIES[name];
  const held = k.held;
  // who holds something waves it; the rest bounce, pump, sway, hop or wave
  const r = p.rng(), style = held > 0 ? 1 : r < 0.2 ? 0 : r < 0.45 ? 2 : r < 0.55 ? 3 : r < 0.8 ? 4 : 1;
  return {
    species: name, at, yaw, scale: CRITTER_SCALE * s.size * (0.92 + p.rng() * 0.16),
    look: [k.species, Math.floor(p.rng() * 8), k.hat, held + (k.collar ? 4 : 0)],
    anim: [p.rng(), style, group, p.rng() * 2 - 1], on, lite,
  };
}

function pick<T>(rng: () => number, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// ---------------------------------------------------------------- the crowd

/** A track's crowd: its meshes, its layout (for the checks), and what drives it each frame. */
export interface Crowd {
  /** the stands' crowds (full rig); `meshes` has it and the lite crowd along the road */
  mesh: InstancedMesh;
  meshes: InstancedMesh[];
  stands: Mesh | null;
  layout: CrowdLayout;
  /** per frame: the lens and its level forward, the clock, the detail level (0: the governor's Low, the crowd is not drawn) */
  tick(cam: V3, forward: [number, number], clock: number, detail: number): void;
  /** the Final Lap Shift: every group cheers */
  shift(clock: number): void;
  /** the cheer groups' trigger clock seconds (-1: waiting) */
  trig: Float32Array;
  /** the pack, as the crowd last saw it */
  focus: Vector3;
}

const DIR = new Vector3();
/** the lens and its level forward, reused every frame (the render loop makes no garbage) */
const LENS: V3 = [0, 0, 0], AHEAD: [number, number] = [0, 1];

/** Builds a track's crowd from its vista context, keeping out of `avoid` circles ([x, z, r]); null for a biome with none. */
export function buildCrowd(ctx: VistaContext, avoid: [number, number, number][] = []): Crowd | null {
  const biome = BIOMES[ctx.biome];
  if (!biome || !ctx.road) return null;
  const p = new Placer(ctx, biome, avoid);
  // the start gantry's pillars stand just past the limit either side of the line
  const st = nearestFrame(p, ctx.start);
  for (const s of [-1, 1]) avoid.push([ctx.start[0] + st.right[0] * s * (st.limit + 0.9), ctx.start[1] + st.right[1] * s * (st.limit + 0.9), 2]);
  const b: Built = { spectators: [], standGeos: [], layout: { spectators: [], solids: [], groups: [] } };
  const kit = (only?: string[]): KitPick => {
    const species = pick(p.rng, biome.species.map((_s, i) => i), biome.mix.map((w, i) => (!only || only.includes(biome.species[i]) ? w : 0)));
    const hats = biome.hats[biome.species[species]] ?? [[0, 1]];
    const hat = pick(p.rng, hats.map((h) => h[0]), hats.map((h) => h[1]));
    const held = p.rng() < biome.held ? biome.heldKind : 0;
    return { species, hat, held, collar: p.rng() < biome.collar };
  };
  const taken = biome.spots.filter((s) => s.kind !== 'corners' && s.kind !== 'village' && s.kind !== 'lining').map((s) => s.t);
  for (const spot of biome.spots) {
    if (b.layout.groups.length >= CROWD_GROUPS) break;
    if (spot.kind === 'stand' || spot.kind === 'bleacher') {
      // no room for the structure (a slope, a cliff, a village): a group behind a rope line watches there instead
      if (!placeStand(p, spot, biome.stand, b.layout.groups.length, b, kit)) placeGroup(p, { ...spot, kind: 'group', n: 6 }, biome.stand, b.layout.groups.length, b, kit);
    }
    else if (spot.kind === 'group') placeGroup(p, spot, biome.stand, b.layout.groups.length, b, kit);
    else if (spot.kind === 'village') placeVillage(p, spot, b, kit);
    else if (spot.kind === 'lining') placeLining(p, spot, biome.stand, b, kit);
    else {
      // a group on the outside of each sharp bend nobody watches yet
      for (const c of bends(p, spot.n ?? 3, taken)) {
        if (b.layout.groups.length >= CROWD_GROUPS) break;
        placeGroup(p, { kind: 'group', t: c.t, lat: c.lat, n: spot.size ?? 5 }, biome.stand, b.layout.groups.length, b, kit);
      }
    }
  }
  if (!b.spectators.length) return null;
  b.layout.spectators = b.spectators;

  // two InstancedMeshes: the full rig for the stands' crowds (seen close from the grid), the lite rig for
  // everyone seen only at racing speed; each critter's matrix, look and life per instance
  const uniforms = crowdUniforms(biome);
  const instanced = (lite: boolean): InstancedMesh | null => {
    const who = b.spectators.filter((s) => s.lite === lite);
    if (!who.length) return null;
    const parts: RigParts = {
      mask: biome.species.some((s) => !!SPECIES[s].colours.mask),
      brim: who.some((s) => HATS[s.look[2]].brim > 0),
      crown: who.some((s) => HATS[s.look[2]].crown > 0),
      pompom: who.some((s) => HATS[s.look[2]].pom > 0),
      collar: who.some((s) => s.look[3] >= 4),
      stick: who.some((s) => s.look[3] % 4 > 0),
      flag: who.some((s) => s.look[3] % 4 === 1),
      feet: biome.species.some((s) => SPECIES[s].limb[2] > 0),
      lite,
    };
    const geo = rigGeometry(parts).clone();
    const look = new Float32Array(who.length * 4), anim = new Float32Array(who.length * 4);
    const m = new InstancedMesh(geo, crowdMaterial(uniforms), who.length);
    m.name = lite ? 'crowd-lite' : 'crowd';
    who.forEach((s, i) => {
      m.setMatrixAt(i, M4.compose(P4.set(...s.at), Q4.setFromAxisAngle(UP, s.yaw), S4.setScalar(s.scale)));
      look.set(s.look, i * 4);
      anim.set(s.anim, i * 4);
    });
    geo.setAttribute('iLook', new InstancedBufferAttribute(look, 4));
    geo.setAttribute('iAnim', new InstancedBufferAttribute(anim, 4));
    m.instanceMatrix.needsUpdate = true;
    // posed in the vertex shader, and its onBeforeRender must run every frame (the triggers): never culled
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = true;
    m.userData.count = who.length;
    return m;
  };
  const meshes = [instanced(false), instanced(true)].filter((m): m is InstancedMesh => m !== null);
  const mesh = meshes[0];

  let stands: Mesh | null = null;
  if (b.standGeos.length) {
    const sg = mergeGeometries(b.standGeos, false)!;
    for (const g of b.standGeos) g.dispose();
    const mat = new MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
    glowFromVertexColours(mat); // a neon trim lights itself
    stands = new Mesh(sg, mat);
    stands.name = 'crowd-stands';
    stands.castShadow = false;
    stands.receiveShadow = true;
  }

  const trig = uniforms.uTrig.value, focus = uniforms.uFocus.value;
  const armed = new Uint8Array(CROWD_GROUPS).fill(1);
  const groups = b.layout.groups;
  const crowd: Crowd = {
    mesh, meshes, stands, layout: b.layout, trig, focus,
    tick: (cam, forward, clock, detail) => {
      for (const m of meshes) m.count = detail > 0 ? m.userData.count : 0;
      focus.set(cam[0] + forward[0] * CROWD.focusAhead, cam[1], cam[2] + forward[1] * CROWD.focusAhead);
      for (let g = 0; g < groups.length && g < CROWD_GROUPS; g++) {
        const at = groups[g].at, d = Math.hypot(focus.x - at[0], focus.z - at[2]);
        const t0 = trig[g], since = t0 < 0 ? -1 : clock >= t0 ? clock - t0 : Infinity; // the clock wraps every hour
        if (armed[g] && d < CROWD.tripNear) { trig[g] = clock; armed[g] = 0; }
        else if (!armed[g] && d > CROWD.tripFar && since > CROWD.cheer + CROWD.stagger) armed[g] = 1;
      }
    },
    shift: (clock) => { for (let g = 0; g < groups.length && g < CROWD_GROUPS; g++) { trig[g] = clock; armed[g] = 0; } },
  };
  // the lens each frame drives the crowd (no game code): where the pack is, the cheers, and the governor's
  // Low (no shadow map) dropping the draw
  // (on both meshes: whichever draws first each frame ticks; a second tick in the same frame changes nothing)
  const tick = (renderer: WebGLRenderer, _scene: unknown, camera: Camera) => {
    camera.getWorldDirection(DIR);
    const h = Math.hypot(DIR.x, DIR.z) || 1;
    LENS[0] = camera.position.x; LENS[1] = camera.position.y; LENS[2] = camera.position.z;
    AHEAD[0] = DIR.x / h; AHEAD[1] = DIR.z / h;
    crowd.tick(LENS, AHEAD, WATER_CLOCK.value, renderer.shadowMap.enabled ? 1 : 0);
  };
  for (const m of meshes) m.onBeforeRender = tick;
  mesh.userData.crowd = crowd;
  return crowd;
}

function nearestFrame(p: Placer, at: [number, number]): { right: [number, number]; limit: number } {
  let best = 0, bd = Infinity;
  for (let i = 0; i < 400; i++) {
    const r = p.ctx.road!(i / 400), d = (r.p[0] - at[0]) ** 2 + (r.p[2] - at[1]) ** 2;
    if (d < bd) { bd = d; best = i / 400; }
  }
  const r = p.ctx.road!(best);
  return { right: r.right, limit: r.limit };
}

/** The vista's parts with the crowd added (its meshes in the world, a cheer on the Final Lap Shift), keeping clear of the vista's perched birds. */
export function withCrowd(parts: VistaParts | null, ctx: VistaContext): VistaParts | null {
  const perches: [number, number, number][] = [];
  const fliers = (parts?.life?.fliers ?? []) as readonly { kind: string; home: V3 }[];
  for (const f of fliers) if (f.kind === 'perch') perches.push([f.home[0], f.home[2], 3]);
  const crowd = buildCrowd(ctx, perches);
  if (!crowd) return parts;
  const out: VistaParts = parts ?? {};
  out.world = [...(out.world ?? []), ...crowd.meshes, ...(crowd.stands ? [crowd.stands] : [])];
  const shift = out.shift;
  out.shift = (sky) => { shift?.(sky); crowd.shift(WATER_CLOCK.value); };
  return out;
}

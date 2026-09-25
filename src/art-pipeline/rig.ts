// A racer model's moving parts, as morph targets. The AI-made model files are one fused surface
// (no wheel or driver nodes, 24 Sept 2026), so the parts KartView animates are soft regions of
// that surface: 'lean' (the driver's upper body rolls toward +X about the hips), 'look' (the head
// turns toward +X), 'nod' (the head tips forward), 'steer' (the front wheels turn toward +X about
// their own uprights) and 'heave' (the body rises on its wheels: the suspension). Each target
// holds the displacement of RIG_UNIT radians (or metres, for heave), so the influence KartView
// sets is the angle over RIG_UNIT; a soft mask fades each region into the kart, so nothing tears
// where they meet. A turn's displacement is its tangent: at the few degrees the animation uses it
// is the turn to within a hair (1 % stretch at 8°). Morph targets are per mesh, not per material,
// so every kart moves on its own with no material copies and no extra draw call, and the shadow
// pass moves with them. KART_ANIM (kart-controller anim.ts) has the angles.
import { BufferAttribute, Matrix3, type BufferGeometry, type Matrix4 } from 'three';
import type { DriverCut } from './glb.ts';

/** The morph targets every rigged kart carries, in this order (always all five, so all share one shader). */
export const RIG_TARGETS = Object.freeze(['lean', 'look', 'nod', 'steer', 'heave'] as const);
/**
 * Radians of turn (metres of heave) each target holds: tiny, so a model's bounding box and sphere
 * (three grows them by every target's largest move at full weight) grow by a millimetre or two;
 * KartView sets angle / RIG_UNIT.
 */
export const RIG_UNIT = 0.001;
export type RigTarget = (typeof RIG_TARGETS)[number];

/**
 * A wheel pair in the fitted kart frame (glb.ts fitToKart): the tyre's middle across (`x`, the +X
 * wheel; the other is its mirror), its axle's `z`, its radius `r` (the axle is `r` up) and its
 * half width `w`.
 */
export interface WheelRig { x: number; z: number; r: number; w: number }
export interface Wheels { front: WheelRig; rear: WheelRig }

/**
 * Each racer model's wheels, measured from where the tyres touch the ground (the only part of a
 * kart that does) and checked on renders with the wheels turned hard and the body dropped on
 * them (24 Sept 2026).
 */
export const MODEL_WHEELS: Readonly<Record<string, Wheels>> = Object.freeze({
  pip: { front: { x: 0.52, z: 0.63, r: 0.3, w: 0.16 }, rear: { x: 0.54, z: -0.4, r: 0.3, w: 0.17 } },
  momo: { front: { x: 0.55, z: 0.755, r: 0.3, w: 0.14 }, rear: { x: 0.55, z: -0.405, r: 0.3, w: 0.14 } },
  nova: { front: { x: 0.535, z: 0.6, r: 0.285, w: 0.12 }, rear: { x: 0.535, z: -0.53, r: 0.285, w: 0.12 } },
  juniper: { front: { x: 0.53, z: 0.705, r: 0.31, w: 0.14 }, rear: { x: 0.535, z: -0.522, r: 0.31, w: 0.145 } },
  otto: { front: { x: 0.505, z: 0.505, r: 0.22, w: 0.125 }, rear: { x: 0.505, z: -0.488, r: 0.22, w: 0.125 } },
  sprocket: { front: { x: 0.63, z: 0.527, r: 0.29, w: 0.135 }, rear: { x: 0.634, z: -0.486, r: 0.29, w: 0.14 } },
  boulder: { front: { x: 0.62, z: 0.59, r: 0.39, w: 0.2 }, rear: { x: 0.615, z: -0.47, r: 0.41, w: 0.19 } },
  gus: { front: { x: 0.63, z: 0.63, r: 0.29, w: 0.16 }, rear: { x: 0.645, z: -0.54, r: 0.29, w: 0.16 } },
});

/** The shared bodies' wheels (bodies.ts builds them exactly here). */
export const BODY_WHEELS: Readonly<Record<'classic' | 'buggy', Wheels>> = Object.freeze({
  classic: { front: { x: 0.68, z: 0.66, r: 0.27, w: 0.13 }, rear: { x: 0.68, z: -0.64, r: 0.3, w: 0.13 } },
  buggy: { front: { x: 0.68, z: 0.64, r: 0.35, w: 0.16 }, rear: { x: 0.68, z: -0.64, r: 0.35, w: 0.16 } },
});

/** How soft the regions' edges are (m), and how far over its axles the body rides fully on its springs. */
export const RIG_SOFT = Object.freeze({ edge: 0.05, hips: 0.1, wheel: 0.05, springs: 0.35 });

const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 0..1: how much of the driver a point in the kart frame is (DriverCut's box with soft edges, minus its drop boxes). */
export function driverWeight(cut: DriverCut, x: number, y: number, z: number): number {
  const e = RIG_SOFT.edge;
  let w = smooth(cut.y - e, cut.y + RIG_SOFT.hips, y)
    * (1 - smooth(cut.x - e, cut.x + e * 0.5, Math.abs(x)))
    * smooth(cut.z[0] - e, cut.z[0] + e * 0.5, z)
    * (1 - smooth(cut.z[1] - e * 0.5, cut.z[1] + e, z));
  for (const b of cut.drop ?? []) {
    const inside = smooth(b[0] - e, b[0], x) * (1 - smooth(b[1], b[1] + e, x))
      * smooth(b[2] - e, b[2], y) * (1 - smooth(b[3], b[3] + e, y))
      * smooth(b[4] - e, b[4], z) * (1 - smooth(b[5], b[5] + e, z));
    w *= 1 - inside;
  }
  return w;
}

/** 0..1: how much of a wheel pair (either side: the mask is mirrored) a point in the kart frame is. */
export function wheelWeight(wh: WheelRig, x: number, y: number, z: number): number {
  const s = RIG_SOFT.wheel;
  const across = Math.abs(x);
  // the whole tyre to its tread, fading out just past it
  const round = 1 - smooth(wh.r + s * 0.2, wh.r + s * 1.2, Math.hypot(y - wh.r, z - wh.z));
  // inboard it stops at the tyre's inner face; outboard it takes the hub and anything on it
  const inner = smooth(wh.x - wh.w - s, wh.x - wh.w, across);
  const outer = 1 - smooth(wh.x + wh.w + s, wh.x + wh.w + 2 * s, across);
  return round * inner * outer;
}

/**
 * 0..1: how much a point rides on the springs (the body and all on it) rather than with the
 * wheels: nothing up to the axles, all of it RIG_SOFT.springs above them, never the tyres.
 */
export function bodyWeight(wheels: Wheels, x: number, y: number, z: number): number {
  const axle = Math.min(wheels.front.r, wheels.rear.r);
  return smooth(axle, axle + RIG_SOFT.springs, y) * (1 - wheelWeight(wheels.front, x, y, z)) * (1 - wheelWeight(wheels.rear, x, y, z));
}

/** What to rig: the driver's box, the wheels, and where a code-built model's driver starts. */
export interface KartRig {
  /** the driver's box (glb.ts DRIVER_CUTS), pivoting at its hips (y) and middle (at) */
  driver?: DriverCut | null;
  /** vertices before this index are never the driver (a code-built model merges its driver's parts last) */
  driverFrom?: number;
  /** the wheels: the front pair steers, the body rides over both pairs */
  wheels?: Wheels | null;
  /** the whole geometry rides on the springs (a driver cut out and seated on its own) */
  onSprings?: boolean;
}

/**
 * Add the five targets to `g`. `toKart` takes `g`'s positions into the fitted kart frame (the
 * identity for a code-built geometry). A target with nothing to move stays zero. Returns `g`.
 */
export function rigKart(g: BufferGeometry, toKart: Matrix4 | null, rig: KartRig): BufferGeometry {
  const { driver = null, driverFrom = 0, wheels = null, onSprings = false } = rig;
  const pos = g.getAttribute('position');
  const n = pos.count;
  const e = toKart?.elements;
  const kx = new Float32Array(n), ky = new Float32Array(n), kz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (e) {
      kx[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
      ky[i] = e[1] * x + e[5] * y + e[9] * z + e[13];
      kz[i] = e[2] * x + e[6] * y + e[10] * z + e[14];
    } else { kx[i] = x; ky[i] = y; kz[i] = z; }
  }
  const lean = new Float32Array(n * 3), look = new Float32Array(n * 3), nod = new Float32Array(n * 3);
  const steer = new Float32Array(n * 3), heave = new Float32Array(n * 3);
  if (driver) {
    const wd = new Float32Array(n);
    let top = driver.y;
    for (let i = driverFrom; i < n; i++) {
      wd[i] = driverWeight(driver, kx[i], ky[i], kz[i]);
      if (wd[i] > 0.5 && ky[i] > top) top = ky[i];
    }
    // the head: the top part of the driver turns to look; its upright through the head's middle
    const h0 = driver.y + 0.4 * (top - driver.y), h1 = driver.y + 0.65 * (top - driver.y);
    const wl = new Float32Array(n);
    let sz = 0, sw = 0;
    for (let i = 0; i < n; i++) {
      wl[i] = wd[i] * smooth(h0, h1, ky[i]);
      if (wl[i] > 0.5) { sz += kz[i] * wl[i]; sw += wl[i]; }
    }
    const lookZ = sw > 0 ? sz / sw : driver.at;
    for (let i = 0; i < n; i++) {
      const dx = kx[i], dy = ky[i] - driver.y, dz = kz[i] - driver.at, w = wd[i];
      // one radian about −Z through the hips: the top goes toward +X
      lean[i * 3] = w * dy; lean[i * 3 + 1] = -w * dx;
      // one radian about +X through the hips: the head goes forward and down
      nod[i * 3 + 1] = -w * dz; nod[i * 3 + 2] = w * dy;
      // one radian about +Y through the head's middle: the face turns toward +X
      const lz = kz[i] - lookZ, v = wl[i];
      look[i * 3] = v * lz; look[i * 3 + 2] = -v * dx;
    }
  }
  if (wheels) {
    const f = wheels.front;
    for (let i = 0; i < n; i++) {
      const x = kx[i], y = ky[i], z = kz[i];
      // one metre up on the springs: the body and all on it, not the tyres
      heave[i * 3 + 1] = bodyWeight(wheels, x, y, z);
      if (z < f.z - f.r - RIG_SOFT.wheel * 2) continue;
      const w = wheelWeight(f, x, y, z);
      if (w <= 0) continue;
      // one radian about +Y through this side's front wheel: its front goes toward +X
      const dx = x - Math.sign(x) * f.x, dz = z - f.z;
      steer[i * 3] = w * dz; steer[i * 3 + 2] = -w * dx;
    }
  } else if (onSprings) {
    for (let i = 0; i < n; i++) heave[i * 3 + 1] = 1;
  }
  // RIG_UNIT radians' (or metres') worth, back in the geometry's own frame (a direction: the linear part's inverse)
  const inv = (toKart ? new Matrix3().setFromMatrix4(toKart).invert() : new Matrix3()).multiplyScalar(RIG_UNIT).elements;
  const attr = (a: Float32Array, name: RigTarget) => {
    for (let i = 0; i < n; i++) {
      const x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2];
      a[i * 3] = inv[0] * x + inv[3] * y + inv[6] * z;
      a[i * 3 + 1] = inv[1] * x + inv[4] * y + inv[7] * z;
      a[i * 3 + 2] = inv[2] * x + inv[5] * y + inv[8] * z;
    }
    const b = new BufferAttribute(a, 3);
    b.name = name;
    return b;
  };
  g.morphAttributes.position = [attr(lean, 'lean'), attr(look, 'look'), attr(nod, 'nod'), attr(steer, 'steer'), attr(heave, 'heave')];
  g.morphTargetsRelative = true;
  g.userData.rigUnit = RIG_UNIT; // KartView reads it: influence = angle (or metres) / rigUnit
  return g;
}

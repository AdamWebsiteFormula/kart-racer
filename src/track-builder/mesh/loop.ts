// The loop-the-loop's ring (design.md Track thrills): the track the karts ride (kart-controller
// loopPose, the same path), neon rails along both edges, and two gantries that hold it up at its
// front and back. Three meshes, whatever the number of loops.
import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, MeshToonMaterial, type Texture,
} from 'three';
import { loopFrame } from '../../kart-controller/loop.ts';
import type { Track } from '../track.ts';
import type { Vec3 } from '../types.ts';

const TAU = Math.PI * 2;
/** Segments round a ring; the first and last few degrees merge into the road and are not drawn. */
const SEGMENTS = 144, SKIP = 0.1;
/** The riding surface sits this far outside the path, so wheels touch it and never sink in. */
const SKIN = 0.04;
/** Neon rail: height above the track, metres. */
const RAIL = 0.45;
/** Gantry: post width, metres; posts stand this far outside the road edge. */
const POST = 0.6, POST_OUT = 1.4;
const STRIPE_A = new Color('#f4ecff'), STRIPE_B = new Color('#ff4fa3');

interface Buf { pos: number[]; col: number[]; idx: number[] }
const buf = (): Buf => ({ pos: [], col: [], idx: [] });

function quad(b: Buf, a: Vec3, c: Vec3, d: Vec3, e: Vec3, colour: Color): void {
  const i = b.pos.length / 3;
  for (const p of [a, c, d, e]) { b.pos.push(p[0], p[1], p[2]); b.col.push(colour.r, colour.g, colour.b); }
  b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
}

/** An axis-aligned-in-frame box from its centre and three half-extent vectors. */
function box(b: Buf, c: Vec3, x: Vec3, y: Vec3, z: Vec3, colour: Color): void {
  const p = (sx: number, sy: number, sz: number): Vec3 => [
    c[0] + x[0] * sx + y[0] * sy + z[0] * sz, c[1] + x[1] * sx + y[1] * sy + z[1] * sz, c[2] + x[2] * sx + y[2] * sy + z[2] * sz,
  ];
  quad(b, p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), colour);
  quad(b, p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), colour);
  quad(b, p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1), colour);
  quad(b, p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), colour);
  quad(b, p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), colour);
  quad(b, p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), colour);
}

function geometry(b: Buf): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(b.pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(b.col, 3));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  return g;
}

/** The ring track, its rails and its gantries for every loop on the track (none: an empty list). */
export function buildLoopMeshes(track: Track, gradientMap: Texture | null): Mesh[] {
  if (track.loops.length === 0) return [];
  const ring = buf(), rails = buf(), frames = buf();
  const white = new Color('#ffffff');
  const steel = new Color('#3b2f6e');
  for (const l of track.loops) {
    const f = loopFrame(track, l);
    const o = f.origin, R = l.radius, w = l.width / 2 + l.spread;
    const entry = -l.shift / 2;
    /** a point on the ring at angle a, lateral lat, `out` metres outside the path (away from the centre) */
    const at = (a: number, lat: number, out: number): Vec3 => {
      const r = R + out, fwd = r * Math.sin(a), up = R - r * Math.cos(a);
      return [o[0] + f.right[0] * lat + f.forward[0] * fwd, o[1] + up, o[2] + f.right[2] * lat + f.forward[2] * fwd];
    };
    for (let i = 0; i < SEGMENTS; i++) {
      const a0 = SKIP + ((TAU - 2 * SKIP) * i) / SEGMENTS, a1 = SKIP + ((TAU - 2 * SKIP) * (i + 1)) / SEGMENTS;
      const c0 = entry + l.shift * (a0 / TAU), c1 = entry + l.shift * (a1 / TAU);
      // the riding surface: candy stripes every few segments
      quad(ring, at(a0, c0 - w, SKIN), at(a0, c0 + w, SKIN), at(a1, c1 + w, SKIN), at(a1, c1 - w, SKIN), (i >> 2) % 2 ? STRIPE_B : STRIPE_A);
      // the underside, a dark steel skin a little further out
      quad(ring, at(a0, c0 + w, SKIN + 0.25), at(a0, c0 - w, SKIN + 0.25), at(a1, c1 - w, SKIN + 0.25), at(a1, c1 + w, SKIN + 0.25), steel);
      // neon rails: a low wall along each edge, standing in from the track toward the centre
      for (const side of [-1, 1]) {
        const e0 = c0 + side * w, e1 = c1 + side * w;
        quad(rails, at(a0, e0, SKIN + 0.25), at(a1, e1, SKIN + 0.25), at(a1, e1, -RAIL), at(a0, e0, -RAIL), white);
      }
    }
    // two gantries, at the ring's front and back (where it stands vertical at its middle height)
    const span = f.halfWidth + POST_OUT;
    const up: Vec3 = [0, 1, 0];
    for (const dir of [-1, 1]) {
      const fx = f.forward[0] * dir * (R + 0.6), fz = f.forward[2] * dir * (R + 0.6);
      for (const side of [-1, 1]) {
        const cx = o[0] + f.right[0] * side * span + fx, cz = o[2] + f.right[2] * side * span + fz;
        const h = (R + 1.4) / 2;
        box(frames, [cx, o[1] + h, cz], [f.right[0] * POST / 2, 0, f.right[2] * POST / 2], [0, h, 0], [f.forward[0] * POST / 2, 0, f.forward[2] * POST / 2], steel);
      }
      // the beam the ring hangs on
      box(frames, [o[0] + fx, o[1] + R, o[2] + fz], [f.right[0] * span, 0, f.right[2] * span], [up[0] * 0.3, 0.3, up[2] * 0.3], [f.forward[0] * 0.3, 0, f.forward[2] * 0.3], steel);
    }
  }
  const out: Mesh[] = [];
  const ringMesh = new Mesh(geometry(ring), new MeshToonMaterial({ vertexColors: true, gradientMap, side: DoubleSide, emissive: new Color('#2a1850') }));
  ringMesh.name = 'loop';
  ringMesh.receiveShadow = true;
  out.push(ringMesh);
  // neon: unlit and brighter than white, so the bloom catches it
  const railMesh = new Mesh(geometry(rails), new MeshBasicMaterial({ color: new Color(0.25, 2.4, 2.8), side: DoubleSide }));
  railMesh.name = 'loopRails';
  out.push(railMesh);
  const frameMesh = new Mesh(geometry(frames), new MeshToonMaterial({ vertexColors: true, gradientMap }));
  frameMesh.name = 'loopGantries';
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  out.push(frameMesh);
  return out;
}

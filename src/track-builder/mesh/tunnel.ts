// The mine on Canyon Rush (a shortcut's `tunnel`: track-builder/tunnel.ts). A rock bore portal to
// portal (walls at the curb, an arched roof), timber frames every tunnelFrameSpacing metres, lanterns
// on alternate walls, and a heavy timber portal with a header board at each end. The mesa over it is
// the land (terrain.ts). One mesh, vertex colours, one draw call; the lanterns light themselves.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshToonMaterial, type Texture } from 'three';
import { BUILDER } from '../constants.ts';
import type { TunnelLine } from '../tunnel.ts';
import type { Vec3 } from '../types.ts';
import { glowFromVertexColours } from './glow.ts';
import type { Rgb } from './palette.ts';

/** Colours are written as seen (sRGB) and stored linear, as vertex colours are read. */
const lin = (r: number, g: number, b: number): Rgb => [r, g, b].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as unknown as Rgb;
/** Rock bands up the bore (dark, lamp-lit), and on the cliff face at each portal (canyon strata in the sun). */
const BANDS: readonly Rgb[] = [lin(0.45, 0.24, 0.16), lin(0.55, 0.31, 0.2), lin(0.4, 0.21, 0.14), lin(0.5, 0.28, 0.18)];
const FACE: readonly Rgb[] = [lin(0.8, 0.42, 0.26), lin(0.88, 0.56, 0.36), lin(0.7, 0.36, 0.23), lin(0.84, 0.49, 0.31)];
/** Metres the cliff face at a portal reaches past the bore on each side (the mesa's top edge and a little more). */
const FACE_REACH = 12;
/** Timber, a lantern's flame (above 1: it lights itself), iron. */
const WOOD: Rgb = lin(0.42, 0.25, 0.13), WOOD_LIGHT: Rgb = lin(0.6, 0.4, 0.22), LAMP: Rgb = [2.6, 1.6, 0.5], IRON: Rgb = lin(0.16, 0.14, 0.13);
/** Segments across the roof; the floor edge sits this far under the curb's top (the curb skirt meets it). */
const ARCH = 8, FLOOR = -0.5;

interface Buf { pos: number[]; col: number[]; idx: number[] }

const hash = (i: number): number => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function quad(b: Buf, a: Vec3, c: Vec3, d: Vec3, e: Vec3, colour: Rgb): void {
  const i = b.pos.length / 3;
  for (const p of [a, c, d, e]) { b.pos.push(p[0], p[1], p[2]); b.col.push(colour[0], colour[1], colour[2]); }
  b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
}

/** A box from its centre and three half-extent vectors, all faces out. */
function box(b: Buf, c: Vec3, x: Vec3, y: Vec3, z: Vec3, colour: Rgb): void {
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

const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

/** groundAt: the land as drawn (scene.ts), for the cliff face's outline; without it the face stands tunnelHill tall. */
export function buildTunnels(tunnels: readonly TunnelLine[], gradientMap: Texture | null, groundAt?: (x: number, z: number) => number): Mesh | null {
  if (!tunnels.length) return null;
  const b: Buf = { pos: [], col: [], idx: [] };
  const { kerbWidth, tunnelWall: WALL, tunnelApex: APEX, tunnelHill: HILL, tunnelFrameSpacing, tunnelLanternSpacing } = BUILDER;
  for (const t of tunnels) {
    const L = t.lut, ds = L.length / L.step;
    // a road frame at sample i: centre, right, up, forward, and the bore's half width
    const frame = (i: number) => {
      const th = Math.hypot(L.tx[i], L.tz[i]) || 1;
      return {
        c: [L.px[i], L.py[i], L.pz[i]] as Vec3, r: [L.rx[i], 0, L.rz[i]] as Vec3, up: [0, 1, 0] as Vec3,
        f: [L.tx[i] / th, 0, L.tz[i] / th] as Vec3, w: L.hw[i] + kerbWidth + 0.02, tanB: Math.tan(L.bank[i]),
      };
    };
    const at = (fr: ReturnType<typeof frame>, l: number, h: number): Vec3 =>
      [fr.c[0] + fr.r[0] * l, fr.c[1] - l * fr.tanB + h, fr.c[2] + fr.r[2] * l];

    // 1. the bore: one ring every metre, walls up to WALL, an arch to APEX; the rock bulges a little
    const P = ARCH + 3, step = Math.max(1, Math.round(1 / ds));
    const rings: number[] = [];
    for (let i = t.i0; i < t.i1; i += step) rings.push(i);
    rings.push(t.i1);
    const base = b.pos.length / 3;
    rings.forEach((i, ri) => {
      const fr = frame(i), W = fr.w, edge = ri === 0 || ri === rings.length - 1;
      for (let k = 0; k < P; k++) {
        let l: number, h: number, nl: number, nh: number;
        if (k === 0 || k === P - 1) { l = k === 0 ? -W : W; h = FLOOR; nl = Math.sign(l); nh = 0; }
        else {
          const th = Math.PI * (1 - (k - 1) / ARCH);
          l = W * Math.cos(th); h = WALL + (APEX - WALL) * Math.sin(th);
          nl = Math.cos(th); nh = Math.sin(th);
        }
        const bump = edge ? 0 : (hash(i * 31 + k * 7) - 0.5) * 0.35;
        const p = at(fr, l + nl * bump, h + nh * bump);
        b.pos.push(p[0], p[1], p[2]);
        const band = BANDS[Math.floor((p[1] + 40) / 1.6) % BANDS.length];
        const shade = (h > WALL ? 0.82 : 1) * (0.88 + 0.24 * hash(i * 13 + k));
        b.col.push(band[0] * shade, band[1] * shade, band[2] * shade);
      }
    });
    for (let ri = 0; ri + 1 < rings.length; ri++) {
      for (let k = 0; k + 1 < P; k++) {
        const a0 = base + ri * P + k, a1 = a0 + 1, b0 = a0 + P, b1 = b0 + 1;
        b.idx.push(a0, b0, a1, a1, b0, b1);
      }
    }

    // 2. timber frames along it, and lanterns on alternate walls between them
    const frames = Math.floor((t.i1 - t.i0) * ds / tunnelFrameSpacing);
    for (let k = 1; k < frames; k++) {
      const fr = frame(t.i0 + Math.round((k * tunnelFrameSpacing) / ds)), W = fr.w;
      const mul = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
      const wood = scale(WOOD, 0.85 + 0.3 * hash(k * 5));
      for (const side of [-1, 1]) box(b, at(fr, side * (W - 0.24), (WALL + FLOOR) / 2), mul(fr.r, 0.22), mul(fr.up, (WALL - FLOOR) / 2 + 0.1), mul(fr.f, 0.22), wood);
      box(b, at(fr, 0, WALL + 0.12), mul(fr.r, W - 0.05), mul(fr.up, 0.24), mul(fr.f, 0.26), wood);
    }
    const lanterns = Math.floor((t.i1 - t.i0) * ds / tunnelLanternSpacing);
    for (let k = 1; k < lanterns; k++) {
      const fr = frame(t.i0 + Math.round(((k - 0.5) * tunnelLanternSpacing) / ds)), side = k % 2 === 0 ? 1 : -1;
      const mul = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
      box(b, at(fr, side * (fr.w - 0.38), WALL - 0.8), mul(fr.r, 0.17), mul(fr.up, 0.24), mul(fr.f, 0.17), LAMP);
      box(b, at(fr, side * (fr.w - 0.38), WALL - 0.48), mul(fr.r, 0.22), mul(fr.up, 0.07), mul(fr.f, 0.22), IRON);
      box(b, at(fr, side * (fr.w - 0.2), WALL - 0.44), mul(fr.r, 0.2), mul(fr.up, 0.04), mul(fr.f, 0.05), IRON);
    }

    // 3. the cliff face the mesa ends in at each portal, the mouth cut out of it: rings from the bore's
    // outline out to the land's (the mesa's top and flanks), bulging a little, strata by height
    for (const [i, dir] of [[t.i0, -1], [t.i1, 1]] as const) {
      const fr = frame(i), W = fr.w, X = W + FACE_REACH;
      const off = (p: Vec3, m: number): Vec3 => [p[0] + fr.f[0] * dir * m, p[1], p[2] + fr.f[2] * dir * m];
      const land = (l: number, inside: number): number => {
        const p = off(at(fr, l, 0), -inside);
        return groundAt ? groundAt(p[0], p[2]) : fr.c[1] + (inside > 0 ? HILL : -0.2);
      };
      const inner: Vec3[] = [], outer: Vec3[] = [];
      for (let k = 0; k < P; k++) {
        let l: number, h: number;
        if (k === 0 || k === P - 1) { l = k === 0 ? -W : W; h = FLOOR; }
        else { const th = Math.PI * (1 - (k - 1) / ARCH); l = W * Math.cos(th); h = WALL + (APEX - WALL) * Math.sin(th); }
        inner.push(off(at(fr, l, h), 0.15));
        const ol = k === 0 || k === 1 ? -X : k >= P - 2 ? X : -X + (2 * X * (k - 1)) / ARCH;
        const top = k === 0 || k === P - 1 ? land(ol, -1.5) - 0.6 : Math.max(land(ol, 1.5), fr.c[1] + APEX + 0.6) + 0.25;
        const q = at(fr, ol, 0);
        outer.push(off([q[0], top, q[2]], 0.15));
      }
      const RINGS = 4, fb = b.pos.length / 3;
      for (let j = 0; j <= RINGS; j++) {
        for (let k = 0; k < P; k++) {
          const a = inner[k], o = outer[k], u = j / RINGS;
          const bulge = j === 0 || j === RINGS ? 0 : (hash(i * 17 + j * 5 + k) - 0.35) * 1.1;
          const p: Vec3 = [a[0] + (o[0] - a[0]) * u + fr.f[0] * dir * bulge, a[1] + (o[1] - a[1]) * u, a[2] + (o[2] - a[2]) * u + fr.f[2] * dir * bulge];
          b.pos.push(p[0], p[1], p[2]);
          const band = FACE[Math.floor((p[1] + 40) / 1.4) % FACE.length], shade = 0.86 + 0.26 * hash(i * 3 + j * 11 + k * 7);
          b.col.push(band[0] * shade, band[1] * shade, band[2] * shade);
        }
      }
      for (let j = 0; j < RINGS; j++) {
        for (let k = 0; k + 1 < P; k++) {
          const a0 = fb + j * P + k, a1 = a0 + 1, b0 = a0 + P, b1 = b0 + 1;
          b.idx.push(a0, b0, a1, a1, b0, b1);
        }
      }
    }

    // 4. a heavy timber portal at each end: posts, a lintel, a header board
    for (const [i, dir] of [[t.i0, -1], [t.i1, 1]] as const) {
      const fr = frame(i), W = fr.w;
      const mul = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
      const out = (p: Vec3): Vec3 => [p[0] + fr.f[0] * dir * 0.3, p[1], p[2] + fr.f[2] * dir * 0.3];
      for (const side of [-1, 1]) box(b, out(at(fr, side * (W + 0.3), (APEX + 0.6 + FLOOR) / 2)), mul(fr.r, 0.45), mul(fr.up, (APEX + 0.6 - FLOOR) / 2), mul(fr.f, 0.5), WOOD);
      box(b, out(at(fr, 0, APEX + 0.35)), mul(fr.r, W + 1.1), mul(fr.up, 0.45), mul(fr.f, 0.55), WOOD);
      box(b, out(at(fr, 0, APEX + 1.35)), mul(fr.r, Math.min(3.2, W * 0.6)), mul(fr.up, 0.5), mul(fr.f, 0.18), WOOD_LIGHT);
      // a lantern either side of the mouth
      for (const side of [-1, 1]) box(b, out(at(fr, side * (W + 1.05), WALL)), mul(fr.r, 0.2), mul(fr.up, 0.28), mul(fr.f, 0.2), LAMP);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(b.pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(b.col, 3));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  const mat = new MeshToonMaterial({ vertexColors: true, gradientMap, side: DoubleSide });
  glowFromVertexColours(mat);
  const m = new Mesh(g, mat);
  m.name = 'tunnels';
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

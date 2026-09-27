// The mine on Mesa Rush (a shortcut's `tunnel`: track-builder/tunnel.ts). A rock bore portal to
// portal (walls at the curb, an arched roof), timber frames every tunnelFrameSpacing metres, lanterns
// on alternate walls, and a heavy timber portal with a header board at each end. The mesa over it is
// the land (terrain.ts). One mesh, vertex colours, one draw call; the lanterns light themselves and the
// bore round them (BORE_LIGHT): burning low until the Final Lap Shift, when they flicker on one after
// another from the mouth in (the only route is the mine now, "now lit": design §6; the shift's stage
// sets `userData.lamps`), and the road through it takes their pools (lightBoreRoad).
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

/** `lamp`: per vertex, metres into the bore from its mouth for a lantern's glass, else -1; `cur` is what the next quads get. */
interface Buf { pos: number[]; col: number[]; idx: number[]; lamp: number[]; cur: number }

/**
 * The bore's own light, baked per vertex at build time (27 Sept 2026, the fresh-eyes review's item 10: on laps 1
 * and 2 "most of the screen goes black" in the mine; Mario Kart World's covered stretches are dimmer but always
 * readable, with lit walls, lamps and a glowing exit: YouTube ngiIINHSiJc 6:44 underpass, 6:58, 10:34 to 10:38
 * the train's warm planks with a pool of light on the floor). Each lantern throws a warm pool on the rock and the
 * timber round it (`reach` m, faces turned to it more, `wrap` of it on faces edge-on), a dim warm `fill` lies
 * everywhere in the bore (their light off the walls), and the day spills in at both mouths (`dayReach` m). Before
 * the Final Lap Shift the lanterns burn low (`ember` of their light, their glass at `glass`); each one's pool comes
 * up to full as its lantern flickers on, from the mouth inward. Added after the scene's own lights, from the rock's
 * and the timber's colors before the baked shading (bake.ts), which would darken the light of the lanterns too.
 */
export const BORE_LIGHT = Object.freeze({
  ember: 0.38, glass: 0.3, reach: 2.8, wrap: 0.35, most: 2.2, power: 3.4,
  warm: [1, 0.7, 0.42] as const,
  fill: 0.18,
  dayReach: 6.5, day: 1.15, dayColor: [1, 0.86, 0.7] as const,
});

/** A lantern: where its glass is and how far into the bore (m from its first mouth; its flicker waits for that). */
export interface Lantern { x: number; y: number; z: number; at: number }

/** The nearest of a tunnel line's points to (x, z): its index and squared distance, into `out` (every 4th point, then the ones round the best). */
function nearestOnLine(t: TunnelLine, x: number, z: number, out: { k: number; d2: number }): void {
  const n = t.x.length;
  let bd = Infinity, bk = 0;
  for (let i = 0; i < n; i += 4) { const dx = t.x[i] - x, dz = t.z[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bk = i; } }
  const lo = Math.max(0, bk - 4), hi = Math.min(n - 1, bk + 4);
  for (let i = lo; i <= hi; i++) { const dx = t.x[i] - x, dz = t.z[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bk = i; } }
  // the last point too (the coarse pass may step over it)
  { const dx = t.x[n - 1] - x, dz = t.z[n - 1] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bk = n - 1; } }
  out.k = bk; out.d2 = bd;
}

/** The road's pools (lightBoreRoad): how much brighter at a pool's heart, m across, the fill between, the most they add up to. */
export const BORE_ROAD = Object.freeze({ road: 1.9, roadReach: 3.6, roadFill: 0.4, most: 1.6 });
/** The final lap's road through the bore: its lanterns' level (they are lit) and the bore's shade it never had baked. */
export const FINAL_ROAD = Object.freeze({ level: 0.8, shade: 0.6 });

/**
 * The road through a bore, lit by its lanterns (27 Sept 2026: "the road readable"): each lantern's warm pool on
 * the road under it (`roadReach` m across, `road` brighter at its heart) and their fill (`roadFill`), multiplied
 * into the road's vertex colors once at build time, at `level` of the lanterns' light (BORE_LIGHT.ember for the
 * shortcut's road on laps 1 and 2; `FINAL_ROAD.level` for the final lap's road, built with the shift, when they are
 * lit). `shade`: the bore's own shade for a road the baked shading never saw (the final lap's, built ahead unbaked:
 * `FINAL_ROAD.shade`, about what the bake gives the shortcut's road in the bore). Only what lies inside a bore changes.
 * Returns how many vertices it lit.
 */
export function lightBoreRoad(geo: BufferGeometry, lanterns: readonly Lantern[], tunnels: readonly TunnelLine[], level: number, shade = 1): number {
  const pos = geo.getAttribute('position'), col = geo.getAttribute('color');
  if (!pos || !col || !lanterns.length) return 0;
  const R = BORE_ROAD, W = BORE_LIGHT.warm, R2 = R.roadReach * R.roadReach, near = { k: 0, d2: 0 };
  let lit = 0;
  for (const t of tunnels) {
    const ds = t.lut.length / t.lut.step, n = t.x.length;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      if (x < t.minX - 12 || x > t.maxX + 12 || z < t.minZ - 12 || z > t.maxZ + 12) continue;
      nearestOnLine(t, x, z, near);
      const bk = near.k, bd = near.d2;
      // inside the bore: beside its line (not past a mouth), at its road's height
      if (bk === 0 || bk === n - 1 || bd > 10 * 10 || Math.abs(y - t.y[bk]) > 2.5) continue;
      const depth = Math.min(bk, n - 1 - bk) * ds, inside = Math.min(1, depth / 3);
      let sum = 0;
      for (const q of lanterns) { const dx = q.x - x, dz = q.z - z; sum += 1 / (1 + (dx * dx + dz * dz) / R2); }
      const k = level * inside * (Math.min(R.most, sum) * R.road + R.roadFill), s = 1 + (shade - 1) * inside;
      col.setXYZ(v, col.getX(v) * s * (1 + W[0] * k), col.getY(v) * s * (1 + W[1] * k), col.getZ(v) * s * (1 + W[2] * k));
      lit++;
    }
  }
  if (lit) col.needsUpdate = true;
  return lit;
}

/**
 * Each vertex's share of the bore's light (BORE_LIGHT): `lampLit` its color under the lanterns at full, `lampAt` how
 * far in the lantern lighting it most is (its pool flickers on with it), `dayLit` its color in the day spilling in
 * from the nearer mouth (and the fill). `pos`, `col` and `nrm` flat xyz; `lamp` > -0.5 marks a lantern's own glass.
 */
export function boreLight(pos: ArrayLike<number>, col: ArrayLike<number>, nrm: ArrayLike<number>, lamp: ArrayLike<number>, lanterns: readonly Lantern[], tunnels: readonly TunnelLine[]):
  { lampLit: Float32Array; lampAt: Float32Array; dayLit: Float32Array } {
  const L = BORE_LIGHT, n = lamp.length, R2 = L.reach * L.reach, far2 = (4 * L.reach) ** 2, near = { k: 0, d2: 0 };
  const lampLit = new Float32Array(n * 3), lampAt = new Float32Array(n), dayLit = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    if (lamp[v] > -0.5) continue; // a lantern's glass lights itself
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const nx = nrm[v * 3], ny = nrm[v * 3 + 1], nz = nrm[v * 3 + 2];
    let sum = 0, best = 0, at = 0;
    for (const q of lanterns) {
      const dx = q.x - x, dy = q.y - y, dz = q.z - z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > far2) continue;
      const d = Math.sqrt(d2) || 1, facing = Math.abs(nx * dx + ny * dy + nz * dz) / d;
      const f = (L.wrap + (1 - L.wrap) * facing) / (1 + d2 / R2);
      sum += f;
      if (f > best) { best = f; at = q.at; }
    }
    const k = Math.min(L.most, sum) * L.power;
    lampAt[v] = at;
    // how far into the bore it is from the nearer mouth (0 at a mouth and outside it)
    let depth = 0;
    for (const t of tunnels) {
      nearestOnLine(t, x, z, near);
      if (near.d2 > 12 * 12) continue;
      const ds = t.lut.length / t.lut.step;
      depth = Math.max(depth, Math.min(near.k, t.x.length - 1 - near.k) * ds);
    }
    // the day at a mouth (none right at it and outside: the sky lights that); the lanterns' fill, anywhere in
    const inside = Math.min(1, depth / 1.5), day = L.day * inside * Math.exp(-depth / L.dayReach), lit = k + L.fill * inside;
    for (let c = 0; c < 3; c++) {
      const albedo = col[v * 3 + c];
      lampLit[v * 3 + c] = albedo * L.warm[c] * lit;
      dayLit[v * 3 + c] = albedo * L.dayColor[c] * day;
    }
  }
  return { lampLit, lampAt, dayLit };
}

const hash = (i: number): number => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function quad(b: Buf, a: Vec3, c: Vec3, d: Vec3, e: Vec3, colour: Rgb): void {
  const i = b.pos.length / 3;
  for (const p of [a, c, d, e]) { b.pos.push(p[0], p[1], p[2]); b.col.push(colour[0], colour[1], colour[2]); b.lamp.push(b.cur); }
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
  const b: Buf = { pos: [], col: [], idx: [], lamp: [], cur: -1 };
  const glassAt: Lantern[] = [];
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
        b.lamp.push(-1);
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
      b.cur = (k - 0.5) * tunnelLanternSpacing;
      const glass = at(fr, side * (fr.w - 0.38), WALL - 0.8);
      box(b, glass, mul(fr.r, 0.17), mul(fr.up, 0.24), mul(fr.f, 0.17), LAMP);
      glassAt.push({ x: glass[0], y: glass[1], z: glass[2], at: b.cur });
      b.cur = -1;
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
          b.lamp.push(-1);
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
      // a lantern either side of the mouth (the far mouth's light last)
      b.cur = dir < 0 ? 0 : (t.i1 - t.i0) * ds;
      for (const side of [-1, 1]) {
        const glass = out(at(fr, side * (W + 1.05), WALL));
        box(b, glass, mul(fr.r, 0.2), mul(fr.up, 0.28), mul(fr.f, 0.2), LAMP);
        glassAt.push({ x: glass[0], y: glass[1], z: glass[2], at: b.cur });
      }
      b.cur = -1;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(b.pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(b.col, 3));
  g.setAttribute('lamp', new Float32BufferAttribute(b.lamp, 1));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  // the bore's own light (BORE_LIGHT), from the colors as built (the baked shading comes later, to `color` only)
  const light = boreLight(b.pos, b.col, g.getAttribute('normal').array, b.lamp, glassAt, tunnels);
  g.setAttribute('lampLit', new Float32BufferAttribute(light.lampLit, 3));
  g.setAttribute('lampAt', new Float32BufferAttribute(light.lampAt, 1));
  g.setAttribute('dayLit', new Float32BufferAttribute(light.dayLit, 3));
  const mat = new MeshToonMaterial({ vertexColors: true, gradientMap, side: DoubleSide });
  glowFromVertexColours(mat);
  const lamps = { since: { value: -1 }, reduced: { value: 0 } };
  lanternsLight(mat, lamps);
  const m = new Mesh(g, mat);
  m.name = 'tunnels';
  m.userData.lamps = lamps;
  // where the lanterns are, for the road under them (lightBoreRoad)
  m.userData.lanterns = glassAt;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** When the lanterns light after the Final Lap Shift: `delay` s after it at the mouth, then `speed` m of bore a second. */
export const LANTERNS = Object.freeze({ delay: 0.35, speed: 60 });

/**
 * 0..1: how far a lantern `at` m into the bore is lit, `since` s after the Final Lap Shift (-1 before it): off
 * until LANTERNS.delay plus its distance at LANTERNS.speed, then two flickers over 0.3 s (reduced motion: straight
 * on), then steady with a faint shimmer. The shader's `lampOn` is the same.
 */
export function lampOn(since: number, at: number, reduced: boolean): number {
  const t = since - (LANTERNS.delay + at / LANTERNS.speed);
  if (since < 0 || t <= 0) return 0;
  const flick = reduced || t >= 0.3 ? 1 : (((t * 6.5 + at * 0.37) % 1) >= 0.45 ? 1 : 0);
  return flick * (0.95 + 0.05 * Math.sin(since * 7 + at));
}

/**
 * The lanterns' light: low (their glass at BORE_LIGHT.glass, their pools at BORE_LIGHT.ember) until `since`
 * (seconds since the Final Lap Shift) reaches each one, when it flickers on twice over 0.3 s and burns steady
 * with a faint shimmer (reduced motion: straight on), its pool with it; the day spilling in at the mouths all
 * along. The glass lights from its own color, LAMP, not the vertex color: the baked shading (bake.ts) darkens
 * that below the glow line (glow.ts). Small lights, never a screen-sized flash.
 */
function lanternsLight(m: MeshToonMaterial, u: { since: { value: number }; reduced: { value: number } }): void {
  const prev = m.onBeforeCompile;
  const L = BORE_LIGHT, f = (x: number) => x.toFixed(3);
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uLampSince = u.since;
    shader.uniforms.uLampReduced = u.reduced;
    shader.vertexShader = `attribute float lamp;\nattribute vec3 lampLit;\nattribute float lampAt;\nattribute vec3 dayLit;\nvarying float vLamp;\nvarying vec3 vLampLit;\nvarying float vLampAt;\nvarying vec3 vDayLit;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLamp = lamp; vLampLit = lampLit; vLampAt = lampAt; vDayLit = dayLit;')}`;
    shader.fragmentShader = `uniform float uLampSince;\nuniform float uLampReduced;\nvarying float vLamp;\nvarying vec3 vLampLit;\nvarying float vLampAt;\nvarying vec3 vDayLit;
float lampOn(float at) {
  float t = uLampSince - (${LANTERNS.delay.toFixed(2)} + at / ${LANTERNS.speed.toFixed(1)});
  if (uLampSince < 0.0 || t <= 0.0) return 0.0;
  float flick = uLampReduced > 0.5 || t >= 0.3 ? 1.0 : step(0.45, fract(t * 6.5 + at * 0.37));
  return flick * (0.95 + 0.05 * sin(uLampSince * 7.0 + at));
}
${shader.fragmentShader}`.replace('#include <aomap_fragment>', `#include <aomap_fragment>
      if (vLamp > -0.5) {
        float lit = lampOn(vLamp);
        totalEmissiveRadiance = vec3(${f(LAMP[0] * 0.9)}, ${f(LAMP[1] * 0.9)}, ${f(LAMP[2] * 0.9)}) * mix(${f(L.glass)}, 1.0, lit);
        reflectedLight.directDiffuse *= mix(0.3, 1.0, lit);
        reflectedLight.indirectDiffuse *= mix(0.3, 1.0, lit);
      } else {
        // the lanterns' pools and their fill, low until each one's lantern comes on; the day at the mouths
        totalEmissiveRadiance += vLampLit * mix(${f(L.ember)}, 1.0, lampOn(vLampAt)) + vDayLit;
      }`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|lamps2`;
}

// Hand-built road ribbon (appendix A§3: not TubeGeometry). Per LUT sample: road (2 verts),
// kerb each side (face, top, inner face), shoulder each side falling SHOULDER_DROP over
// SHOULDER_WIDTH. Every strip of a chunk lands in ONE indexed BufferGeometry with vertex
// colours and UV v = arcLength / ROAD_TILE_LENGTH.
import { BufferAttribute, BufferGeometry } from 'three';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import { SURFACES } from '../types.ts';
import type { Rgb, TrackPalette } from './palette.ts';

interface Strip {
  /** lateral of the left (a) and right (b) vertex as a function of halfWidth */
  a: (hw: number) => number;
  b: (hw: number) => number;
  /** height above the banked road surface */
  ah: number;
  bh: number;
  colour: (sampleIndex: number, arcLength: number) => Rgb;
}

/** Sample indices covering local u0..u1 inclusive. On a closed LUT u1 = 1 reaches index n, which wraps to 0 and closes the seam. */
export function sampleRange(lut: Lut, u0: number, u1: number): { i0: number; i1: number } {
  return { i0: Math.floor(u0 * lut.step), i1: Math.ceil(u1 * lut.step) };
}

export function buildRibbon(lut: Lut, u0: number, u1: number, palette: TrackPalette): BufferGeometry {
  const { kerbWidth: kw, kerbHeight: kh, shoulderWidth: sw, shoulderDrop: drop, roadTileLength: tile } = BUILDER;
  const stripe = (s: number): Rgb => (Math.floor(s / (tile / 4)) % 2 === 0 ? palette.kerbA : palette.kerbB);
  const kerb = (_: number, s: number) => stripe(s);
  const road = (i: number) => palette.surfaces[SURFACES[lut.surface[i]]];
  const shoulder = () => palette.shoulder;
  const strips: Strip[] = [
    { a: (hw) => -(hw + kw + sw), ah: -drop, b: (hw) => -(hw + kw), bh: 0, colour: shoulder },
    { a: (hw) => -(hw + kw), ah: 0, b: (hw) => -(hw + kw), bh: kh, colour: kerb },
    { a: (hw) => -(hw + kw), ah: kh, b: (hw) => -hw, bh: kh, colour: kerb },
    { a: (hw) => -hw, ah: kh, b: (hw) => -hw, bh: 0, colour: kerb },
    { a: (hw) => -hw, ah: 0, b: (hw) => hw, bh: 0, colour: road },
    { a: (hw) => hw, ah: 0, b: (hw) => hw, bh: kh, colour: kerb },
    { a: (hw) => hw, ah: kh, b: (hw) => hw + kw, bh: kh, colour: kerb },
    { a: (hw) => hw + kw, ah: kh, b: (hw) => hw + kw, bh: 0, colour: kerb },
    { a: (hw) => hw + kw, ah: 0, b: (hw) => hw + kw + sw, bh: -drop, colour: shoulder },
  ];

  const { i0, i1 } = sampleRange(lut, u0, u1);
  const count = i1 - i0 + 1;
  const perStrip = count * 2;
  const total = strips.length * perStrip;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const idx = new Uint32Array(strips.length * (count - 1) * 6);

  let v = 0, f = 0;
  for (const strip of strips) {
    const base = v;
    for (let i = i0; i <= i1; i++) {
      const j = lut.idx(i);
      const hw = lut.hw[j];
      const s = (i / lut.step) * lut.length;
      const tanB = Math.tan(lut.bank[j]);
      const c = strip.colour(j, s);
      for (const side of [0, 1] as const) {
        const l = side === 0 ? strip.a(hw) : strip.b(hw);
        const h = side === 0 ? strip.ah : strip.bh;
        pos[v * 3] = lut.px[j] + lut.rx[j] * l;
        pos[v * 3 + 1] = lut.py[j] - l * tanB + h;
        pos[v * 3 + 2] = lut.pz[j] + lut.rz[j] * l;
        col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
        uv[v * 2] = side; uv[v * 2 + 1] = s / tile;
        v++;
      }
    }
    // quads a0 b0 / a1 b1 → (a0, a1, b0), (b0, a1, b1): normals face up (tangent × right)
    for (let k = 0; k < count - 1; k++) {
      const a0 = base + k * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
      idx[f++] = a0; idx[f++] = a1; idx[f++] = b0;
      idx[f++] = b0; idx[f++] = a1; idx[f++] = b1;
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(new BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

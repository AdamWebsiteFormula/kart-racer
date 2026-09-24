// Hand-built road ribbon (appendix A§3: not TubeGeometry). Per LUT sample: road (2 verts),
// kerb each side (face, top, inner face), shoulder each side falling SHOULDER_DROP over
// SHOULDER_WIDTH. Every strip of a chunk lands in ONE indexed BufferGeometry with vertex
// colours and UV v = arcLength / ROAD_TILE_LENGTH. A `mark` attribute says what each strip is
// (ROAD_MARK): the road material paints crisp kerb stripes and the road lines from it (scene.ts).
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
  /** what the strip is, for the material (ROAD_MARK) */
  mark: number;
}

/** The `mark` attribute: the road surface, a kerb, a shoulder, or a strip that blends under the main road. */
export const ROAD_MARK = Object.freeze({ road: 0, kerb: 1, shoulder: 2, plain: 3, cliffShoulder: 4 });

/** Sample indices covering local u0..u1 inclusive. On a closed LUT u1 = 1 reaches index n, which wraps to 0 and closes the seam. */
export function sampleRange(lut: Lut, u0: number, u1: number): { i0: number; i1: number } {
  return { i0: Math.floor(u0 * lut.step), i1: Math.ceil(u1 * lut.step) };
}

export interface RibbonOptions {
  /** an off-road track: no shoulder strip on a walled side (the land meets the curb), a skirt under the curb */
  offroad?: boolean;
  /** local-u length at each end where kerbs and shoulders vanish and the ribbon sinks under the main road (branches) */
  blend?: number;
}

const BLEND_SINK = 0.03;

export function buildRibbon(lut: Lut, u0: number, u1: number, palette: TrackPalette, opts: RibbonOptions = {}): BufferGeometry {
  const { kerbWidth: kw, kerbHeight: kh, shoulderWidth: sw, shoulderDrop: drop, roadTileLength: tile } = BUILDER;
  const blend = opts.blend ?? 0;
  const blended = (i: number) => { const u = i / lut.step; return blend > 0 && (u < blend || u > 1 - blend); };
  const stripe = (s: number): Rgb => (Math.floor(s / (tile / 4)) % 2 === 0 ? palette.kerbA : palette.kerbB);
  const roadColour = (i: number) => palette.surfaces[SURFACES[lut.surface[i]]];
  const kerb = (i: number, s: number) => (blended(i) ? roadColour(i) : stripe(s));
  const road = (i: number) => roadColour(i);
  const shoulder = (i: number) => (blended(i) ? roadColour(i) : palette.shoulder);
  const M = ROAD_MARK;
  const strips: Strip[] = [
    { a: (hw) => -(hw + kw + sw), ah: -drop, b: (hw) => -(hw + kw), bh: 0, colour: shoulder, mark: M.shoulder },
    { a: (hw) => -(hw + kw), ah: opts.offroad ? -0.45 : 0, b: (hw) => -(hw + kw), bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => -(hw + kw), ah: kh, b: (hw) => -hw, bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => -hw, ah: kh, b: (hw) => -hw, bh: 0, colour: kerb, mark: M.kerb },
    { a: (hw) => -hw, ah: 0, b: (hw) => hw, bh: 0, colour: road, mark: M.road },
    { a: (hw) => hw, ah: 0, b: (hw) => hw, bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => hw, ah: kh, b: (hw) => hw + kw, bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => hw + kw, ah: kh, b: (hw) => hw + kw, bh: opts.offroad ? -0.45 : 0, colour: kerb, mark: M.kerb },
    { a: (hw) => hw + kw, ah: 0, b: (hw) => hw + kw + sw, bh: -drop, colour: shoulder, mark: M.shoulder },
  ];

  const { i0, i1 } = sampleRange(lut, u0, u1);
  const count = i1 - i0 + 1;
  const perStrip = count * 2;
  const total = strips.length * perStrip;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const mark = new Float32Array(total);
  const bend = new Float32Array(total);
  // how sharply the road turns here: the heading change across a few samples, per metre, eased
  // from a gentle sweep (radius ~80 m) to a real corner (radius ~40 m)
  const K = 4, ds = (2 * K * lut.length) / lut.step;
  const bendAt = (j: number): number => {
    const a = lut.idx(j - K), b = lut.idx(j + K);
    const cross = lut.rx[a] * lut.rz[b] - lut.rz[a] * lut.rx[b], dot = lut.rx[a] * lut.rx[b] + lut.rz[a] * lut.rz[b];
    const k = Math.abs(Math.atan2(cross, dot)) / ds;
    const x = Math.max(0, Math.min(1, (k - 0.012) / 0.013));
    return x * x * (3 - 2 * x);
  };
  const idx = new Uint32Array(strips.length * (count - 1) * 6);

  let v = 0, f = 0;
  for (const strip of strips) {
    const base = v;
    for (let i = i0; i <= i1; i++) {
      const j = lut.idx(i);
      const hw = lut.hw[j];
      const s = (i / lut.step) * lut.length; // unwrapped so uv v stays continuous across the seam
      const tanB = Math.tan(lut.bank[j]);
      const c = strip.colour(j, (j / lut.step) * lut.length); // wrapped so the seam vertex gets one stripe colour
      const inBlend = blended(i);
      for (const side of [0, 1] as const) {
        const l = side === 0 ? strip.a(hw) : strip.b(hw);
        // in the blend the kerb and shoulder lie flat and the whole ribbon sinks so the main road draws on top
        const h = (inBlend ? 0 : side === 0 ? strip.ah : strip.bh) - (inBlend ? BLEND_SINK : 0);
        pos[v * 3] = lut.px[j] + lut.rx[j] * l;
        pos[v * 3 + 1] = lut.py[j] - l * tanB + h;
        pos[v * 3 + 2] = lut.pz[j] + lut.rz[j] * l;
        col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
        uv[v * 2] = side; uv[v * 2 + 1] = s / tile;
        // a branch's blended ends are plain: no stripes, no lines where it slides under the main road
        // a shoulder on an open edge (a cliff lip) is drawn; on an off-road track a walled one is not (scene.ts discards it)
        const sideOpen = (lut.open[j] & (l < 0 ? 1 : 2)) !== 0;
        mark[v] = inBlend && strip.mark !== M.road ? M.plain : strip.mark === M.shoulder && sideOpen ? M.cliffShoulder : strip.mark;
        bend[v] = lut.closed || (i - K >= 0 && i + K <= lut.step) ? bendAt(i) : 0;
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
  g.setAttribute('mark', new BufferAttribute(mark, 1));
  g.setAttribute('bend', new BufferAttribute(bend, 1));
  g.setIndex(new BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

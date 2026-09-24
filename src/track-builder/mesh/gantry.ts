// The start/finish (critique 2026-09-23: "a thin white line"): a checkered band across the road and
// an arch over it, two striped pillars in the track's accent with a checkered beam, a light board
// and a pennant on each post. One mesh, vertex colours, one draw call.
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshToonMaterial, type Texture } from 'three';
import { BUILDER } from '../constants.ts';
import type { Track } from '../track.ts';
import type { Vec3 } from '../types.ts';
import { glowFromVertexColours } from './glow.ts';
import type { Rgb, TrackPalette } from './palette.ts';

/** Metres of one checker square on the band and the beam. */
const SQUARE = 0.75;
/** The beam's underside above the road, its height, the pillars' width, their distance past the curb. */
const CLEAR = 6.2, BEAM = 1.3, PILLAR = 0.8, OUT = 0.9;
const WHITE: Rgb = [0.96, 0.96, 0.94], BLACK: Rgb = [0.08, 0.08, 0.1], RED: Rgb = [2.2, 0.35, 0.25]; // RED lights itself (glow.ts)

interface Buf { pos: number[]; col: number[]; idx: number[] }

function quad(b: Buf, a: Vec3, c: Vec3, d: Vec3, e: Vec3, colour: Rgb): void {
  const i = b.pos.length / 3;
  for (const p of [a, c, d, e]) { b.pos.push(p[0], p[1], p[2]); b.col.push(colour[0], colour[1], colour[2]); }
  b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
}

/** A box from its centre and three half-extent vectors (right, up, forward handed), all faces out. */
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

export function buildStartGantry(track: Track, palette: TrackPalette, gradientMap: Texture | null): Mesh {
  const b: Buf = { pos: [], col: [], idx: [] };
  const t0 = track.startT, L = track.length;
  const c = track.sample(t0, 0);
  const hw = c.halfWidth;
  const h = Math.hypot(c.tangent[0], c.tangent[2]) || 1;
  const f: Vec3 = [c.tangent[0] / h, 0, c.tangent[2] / h], r: Vec3 = [f[2], 0, -f[0]];
  const o = c.position;
  const at = (fwd: number, lat: number, y = 0): Vec3 => {
    const p = track.sample(t0 + fwd / L, lat).position;
    return [p[0], p[1] + y, p[2]];
  };

  // the checkered band on the road, two squares deep, following the road's bank
  const cols = Math.max(2, Math.round((2 * hw) / SQUARE));
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < cols; k++) {
      const l0 = -hw + (2 * hw * k) / cols, l1 = -hw + (2 * hw * (k + 1)) / cols;
      const f0 = (row - 1) * SQUARE, f1 = row * SQUARE;
      quad(b, at(f0, l0, 0.012), at(f0, l1, 0.012), at(f1, l1, 0.012), at(f1, l0, 0.012), (row + k) % 2 ? BLACK : WHITE);
    }
  }

  // two pillars just past the curbs, banded accent and white
  const accent = palette.accent;
  const span = hw + BUILDER.kerbWidth + OUT;
  const top = CLEAR + BEAM;
  for (const side of [-1, 1]) {
    const base: Vec3 = [o[0] + r[0] * side * span, o[1] - 0.5, o[2] + r[2] * side * span];
    const bands = 5, seg = (top + 0.5) / bands;
    for (let k = 0; k < bands; k++) {
      const cy = base[1] + seg * (k + 0.5);
      box(b, [base[0], cy, base[2]], [r[0] * PILLAR / 2, 0, r[2] * PILLAR / 2], [0, seg / 2, 0], [f[0] * PILLAR / 2, 0, f[2] * PILLAR / 2], k % 2 ? WHITE : accent);
    }
    // a pennant on the post: a thin flag in the accent, pointing back down the road
    const px = base[0], py = base[1] + top + 0.5, pz = base[2];
    quad(b, [px, py, pz], [px, py + 1.4, pz], [px - f[0] * 1.3, py + 1.05, pz - f[2] * 1.3], [px - f[0] * 1.3, py + 0.95, pz - f[2] * 1.3], accent);
    box(b, [px, py + 0.75, pz], [0.05, 0, 0], [0, 0.75, 0], [0, 0, 0.05], WHITE);
  }

  // the beam: checkered on both faces, accent on top and bottom
  const bx = Math.max(2, Math.round((2 * span) / SQUARE)), by = 2;
  const beamY = o[1] + CLEAR;
  for (const face of [-1, 1]) {
    const off = face * 0.35;
    for (let j = 0; j < by; j++) {
      for (let k = 0; k < bx; k++) {
        const l0 = -span + (2 * span * k) / bx, l1 = -span + (2 * span * (k + 1)) / bx;
        const y0 = beamY + (BEAM * j) / by, y1 = beamY + (BEAM * (j + 1)) / by;
        const P = (l: number, y: number): Vec3 => [o[0] + r[0] * l + f[0] * off, y, o[2] + r[2] * l + f[2] * off];
        const colour = (j + k) % 2 ? BLACK : WHITE;
        if (face > 0) quad(b, P(l0, y0), P(l1, y0), P(l1, y1), P(l0, y1), colour);
        else quad(b, P(l1, y0), P(l0, y0), P(l0, y1), P(l1, y1), colour);
      }
    }
  }
  box(b, [o[0], beamY + BEAM + 0.08, o[2]], [r[0] * (span + 0.4), 0, r[2] * (span + 0.4)], [0, 0.08, 0], [f[0] * 0.45, 0, f[2] * 0.45], accent);
  box(b, [o[0], beamY - 0.08, o[2]], [r[0] * (span + 0.4), 0, r[2] * (span + 0.4)], [0, 0.08, 0], [f[0] * 0.45, 0, f[2] * 0.45], accent);

  // the light board under the beam, facing the grid: five red lamps
  const board: Vec3 = [o[0] - f[0] * 0.2, beamY - 0.75, o[2] - f[2] * 0.2];
  box(b, board, [r[0] * 2.3, 0, r[2] * 2.3], [0, 0.5, 0], [f[0] * 0.2, 0, f[2] * 0.2], BLACK);
  for (let k = 0; k < 5; k++) {
    const l = -1.8 + k * 0.9;
    box(b, [board[0] + r[0] * l - f[0] * 0.22, board[1], board[2] + r[2] * l - f[2] * 0.22], [r[0] * 0.28, 0, r[2] * 0.28], [0, 0.28, 0], [f[0] * 0.05, 0, f[2] * 0.05], RED);
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(b.pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(b.col, 3));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  const mat = new MeshToonMaterial({ vertexColors: true, gradientMap, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, emissive: new Color(0x000000), side: DoubleSide });
  glowFromVertexColours(mat);
  const m = new Mesh(g, mat);
  m.name = 'start-line';
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

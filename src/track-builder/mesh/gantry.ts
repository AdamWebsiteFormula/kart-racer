// The start/finish (critique 2026-09-23: "a thin white line"): a checkered band across the road and
// an arch over it, two striped pillars in the track's accent with a checkered beam, a light board
// and a pennant on each post. One mesh, vertex colours, one draw call; the board's lamps are a
// second (one instancer, 'start-lamps') so they can count the race down.
import {
  BufferGeometry, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshToonMaterial, type Texture,
} from 'three';
import { BUILDER, COUNTDOWN_STEP_SECONDS, COUNTDOWN_STEPS } from '../constants.ts';
import type { Track } from '../track.ts';
import type { Vec3 } from '../types.ts';
import { glowFromVertexColours } from './glow.ts';
import type { Rgb, TrackPalette } from './palette.ts';

/** Metres of one checker square on the band and the beam. */
const SQUARE = 0.75;
/** The beam's underside above the road, its height, the pillars' width, their distance past the curb. */
const CLEAR = 6.2, BEAM = 1.3, PILLAR = 0.8, OUT = 0.9;
const WHITE: Rgb = [0.96, 0.96, 0.94], BLACK: Rgb = [0.08, 0.08, 0.1];

/**
 * The start lamps: one per countdown beat, lit red one by one with the beats, all green on the go
 * for one beat, then dark. Unlit (MeshBasicMaterial), linear RGB with the other channels near
 * zero, so the tone mapping keeps them red and green (a 2.2 red with 0.3 green and blue through
 * the toon glow read as peach squares).
 */
export const LAMP = Object.freeze({
  radius: 0.36, gap: 1.05,
  dark: [0.16, 0.025, 0.02] as Rgb, red: [1.6, 0.05, 0.03] as Rgb, go: [0.02, 1.1, 0.12] as Rgb,
});

/** Red lamps lit at race `time` (seconds since the go, negative in the countdown), or -1 for all green. */
export function startLampsLit(time: number): number {
  if (time > 0) return time <= COUNTDOWN_STEP_SECONDS ? -1 : 0;
  const into = time + COUNTDOWN_STEPS * COUNTDOWN_STEP_SECONDS; // seconds into the countdown
  if (into <= 0) return 0;
  // the HUD's number turns on the tick after each beat; so does the next lamp
  return Math.min(COUNTDOWN_STEPS, Math.ceil(into / COUNTDOWN_STEP_SECONDS - 1e-6));
}

const lampColour = new Color();
/** Light the board for race `time`; only touches the GPU when a lamp changes. */
export function setStartLamps(lamps: InstancedMesh, time: number): void {
  const lit = startLampsLit(time);
  if (lamps.userData.lit === lit) return;
  lamps.userData.lit = lit;
  for (let k = 0; k < lamps.count; k++) {
    const c = lit < 0 ? LAMP.go : k < lit ? LAMP.red : LAMP.dark;
    lamps.setColorAt(k, lampColour.setRGB(c[0], c[1], c[2]));
  }
  lamps.instanceColor!.needsUpdate = true;
}

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

  // two pillars just past where a kart can drive (past the curb; on an off-road track past the course
  // limit out on the sand, or karts would drive through them), banded accent and white
  const accent = palette.accent;
  const span = Math.max(hw + BUILDER.kerbWidth, c.wall ?? hw) + OUT;
  for (const side of [-1, 1]) {
    const foot = track.sample(t0, side * span).groundY - 0.5;
    const base: Vec3 = [o[0] + r[0] * side * span, foot, o[2] + r[2] * side * span];
    const top = o[1] + CLEAR + BEAM - foot - 0.5;
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

  // the light board under the beam, facing the grid: a round lamp per countdown beat, each under a
  // visor (the lamps themselves are the instancer below)
  const board: Vec3 = [o[0] - f[0] * 0.2, beamY - 0.75, o[2] - f[2] * 0.2];
  const boardHalf = ((COUNTDOWN_STEPS - 1) * LAMP.gap) / 2 + LAMP.radius + 0.3;
  box(b, board, [r[0] * boardHalf, 0, r[2] * boardHalf], [0, 0.5, 0], [f[0] * 0.2, 0, f[2] * 0.2], BLACK);
  const lampAt = (k: number): Vec3 => {
    const l = ((COUNTDOWN_STEPS - 1) / 2 - k) * LAMP.gap; // lamp 0 on the left as the grid sees it
    return [board[0] + r[0] * l - f[0] * 0.21, board[1], board[2] + r[2] * l - f[2] * 0.21];
  };
  for (let k = 0; k < COUNTDOWN_STEPS; k++) {
    const p = lampAt(k);
    box(b, [p[0] - f[0] * 0.14, p[1] + LAMP.radius + 0.05, p[2] - f[2] * 0.14], [r[0] * (LAMP.radius + 0.06), 0, r[2] * (LAMP.radius + 0.06)], [0, 0.03, 0], [f[0] * 0.14, 0, f[2] * 0.14], BLACK);
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

  // the lamps: a disc facing the grid, brighter at its centre like a lens, one instance per beat
  const disc = new CircleGeometry(LAMP.radius, 24).rotateY(Math.atan2(-f[0], -f[2]));
  const n = disc.getAttribute('position').count;
  const lens = new Float32Array(n * 3).fill(0.7);
  lens.fill(1, 0, 3); // vertex 0 is the centre
  disc.setAttribute('color', new Float32BufferAttribute(lens, 3));
  const lamps = new InstancedMesh(disc, new MeshBasicMaterial({ vertexColors: true }), COUNTDOWN_STEPS);
  lamps.name = 'start-lamps';
  const place = new Matrix4();
  for (let k = 0; k < COUNTDOWN_STEPS; k++) { const p = lampAt(k); lamps.setMatrixAt(k, place.makeTranslation(p[0], p[1], p[2])); }
  setStartLamps(lamps, -Infinity);
  m.add(lamps);
  return m;
}

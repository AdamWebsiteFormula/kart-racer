// Ramps, trick bumps and boost pads: the road's launchers (design.md Track thrills).
// Ramps and bumps are drawn from the very profile the karts drive on (kart-controller
// jumpProfile): a striped wedge across the road up to a bright lip, or a mound of the shoulder's
// colour with a painted crest line. One merged mesh each, one material each. Boost pads glow and
// their chevrons scroll forward, so a pad reads at speed and at night.
import {
  BufferGeometry, DataTexture, DoubleSide, Float32BufferAttribute, LinearFilter, LinearMipmapLinearFilter, Mesh,
  MeshToonMaterial, RepeatWrapping, RGBAFormat, ShaderMaterial, SRGBColorSpace, UniformsLib, UniformsUtils, type Texture,
} from 'three';
import { edgeTaper, jumpProfile } from '../../kart-controller/ground.ts';
import type { Track } from '../track.ts';
import type { Vec3 } from '../types.ts';
import type { Rgb, TrackPalette } from './palette.ts';

/** Above the road, so the foot of a ramp never flickers into it. */
const LIFT = 0.03;
/** Rows along a ramp / a bump, columns across the road. */
const ALONG = { ramp: 6, hump: 14 } as const;
const ACROSS = 14;
/** Metres across the road per texture repeat (one chevron column). */
const TILE = 3;
/** Texture bands (v): the side walls, then the ramp face, then the lip band. */
const SIDE_V = 0.03, FACE_V0 = 0.06, LIP_V0 = 0.86;

interface Part { pos: number[]; uv: number[]; idx: number[]; shade: number[] }
const part = (): Part => ({ pos: [], uv: [], idx: [], shade: [] });

/** A grid of rows × columns of points into the part, two triangles per cell. */
function grid(p: Part, rows: Vec3[][], uvs: [number, number][][], shade: (i: number) => number = () => 1): void {
  const base = p.pos.length / 3, cols = rows[0].length;
  for (let i = 0; i < rows.length; i++) {
    const c = shade(i);
    for (let k = 0; k < cols; k++) {
      p.pos.push(rows[i][k][0], rows[i][k][1], rows[i][k][2]);
      p.uv.push(uvs[i][k][0], uvs[i][k][1]);
      p.shade.push(c, c, c);
    }
  }
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let k = 0; k + 1 < cols; k++) {
      const a = base + i * cols + k, b = a + 1, c = a + cols, d = c + 1;
      p.idx.push(a, c, b, b, c, d);
    }
  }
}

function toGeometry(p: Part): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p.pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(p.uv, 2));
  g.setAttribute('color', new Float32BufferAttribute(p.shade, 3));
  g.setIndex(p.idx);
  g.computeVertexNormals();
  return g;
}

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const scale = (a: Rgb, k: number): Rgb => [Math.min(1, a[0] * k), Math.min(1, a[1] * k), Math.min(1, a[2] * k)];
const WHITE: Rgb = [1, 0.97, 0.9];
const LIP: Rgb = [1, 0.82, 0.25];

/** An sRGB DataTexture from a pixel function (no canvas: the scene is also built headless in tests). */
function paint(w: number, h: number, px: (u: number, v: number) => Rgb): DataTexture {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = px((x + 0.5) / w, (y + 0.5) / h), o = (y * w + x) * 4;
      data[o] = c[0] * 255; data[o + 1] = c[1] * 255; data[o + 2] = c[2] * 255; data[o + 3] = 255;
    }
  }
  const t = new DataTexture(data, w, h, RGBAFormat);
  t.wrapS = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** The ramp: the track's accent with white chevrons pointing up the ramp, a gold lip band, darker walls. */
function rampTexture(palette: TrackPalette): DataTexture {
  const accent = palette.accent;
  return paint(64, 128, (u, v) => {
    if (v < FACE_V0) return scale(accent, 0.62);
    if (v >= LIP_V0) return v > 0.92 && v < 0.95 ? WHITE : LIP;
    // two bold arrows up each 3 m column, with a gap between columns so each reads as an arrow
    const y = (v - FACE_V0) / (LIP_V0 - FACE_V0);
    const x = Math.abs(u - 0.5) * 2;
    const ch = (((y * 2 + x * 0.55) % 1) + 1) % 1;
    return x < 0.78 && ch < 0.3 ? WHITE : accent;
  });
}

/** Trick bumps by biome: sand dunes, snow moguls, turf humps; elsewhere the shoulder's colour. */
const HUMP_TINT: Readonly<Partial<Record<string, Rgb>>> = Object.freeze({
  canyon: [0.96, 0.7, 0.46], frost: [0.95, 0.975, 1], meadow: [0.55, 0.78, 0.36],
});

/** A trick bump: its biome's ground with a dashed accent line along its crest. */
function humpTexture(palette: TrackPalette, biome: string): DataTexture {
  const ground = HUMP_TINT[biome] ?? palette.shoulder;
  // smooth colour (noise shimmers into a carpet at a distance); the crest line is the only mark
  return paint(64, 128, (u, v) => {
    if (v < FACE_V0 * 0.5) return scale(ground, 0.8);
    if (Math.abs(v - 0.5) < 0.035 && u % 0.5 < 0.32) return mix(palette.accent, WHITE, 0.15);
    return ground;
  });
}

/**
 * The ramps and bumps of every open branch as up to two meshes, `ramps` and `humps`. Each
 * mesh's userData.count is how many it holds; its texture is its own (dispose with the material).
 */
export function buildJumpMeshes(track: Track, palette: TrackPalette, gradientMap: Texture | null): Mesh[] {
  const ramps = part(), humps = part();
  let nRamps = 0, nHumps = 0;
  const L = track.length;
  for (const f of track.features) {
    if (f.kind !== 'jump' || !f.rise || !f.run) continue;
    if (f.branch !== 0 && !track.branches.list[f.branch]?.open) continue;
    const hump = f.shape === 'hump';
    const p = hump ? humps : ramps;
    if (hump) nHumps++; else nRamps++;
    const n = hump ? ALONG.hump : ALONG.ramp;
    const d0 = hump ? f.run / 2 : f.run, d1 = hump ? -f.run / 2 : 0;
    const top: Vec3[][] = [], topUv: [number, number][][] = [];
    const foot: Vec3[][] = [[], []]; // road points along each kerb, for the side walls
    const footUv: [number, number][][] = [[], []];
    for (let i = 0; i <= n; i++) {
      const d = d0 + (d1 - d0) * (i / n);
      const t = f.t - d / L;
      const hw = track.sample(t, 0, f.branch).halfWidth;
      const h = jumpProfile(f.shape, f.run, f.rise, d) + LIFT;
      const row: Vec3[] = [], ruv: [number, number][] = [];
      for (let k = 0; k <= ACROSS; k++) {
        const lat = -hw + (2 * hw * k) / ACROSS;
        const q = track.sample(t, lat, f.branch).position;
        // a bump rounds off at the kerbs (the same taper the karts drive on); a ramp is square
        const hk = hump ? (h - LIFT) * edgeTaper(f.edge, lat, hw) + LIFT : h;
        row.push([q[0], q[1] + hk, q[2]]);
        ruv.push([lat / TILE, hump ? i / n : FACE_V0 + (1 - FACE_V0) * (i / n)]);
        if (k === 0 || k === ACROSS) {
          const s = k === 0 ? 0 : 1;
          foot[s].push([q[0], q[1] + LIFT, q[2]]);
          footUv[s].push([(i / n) * (f.run / TILE), SIDE_V * 0.5]);
        }
      }
      top.push(row);
      topUv.push(ruv);
    }
    // a bump is lit at its crest and shaded in its troughs, so its shape reads from the kart
    grid(p, top, topUv, hump ? (i) => 0.52 + 0.6 * (jumpProfile(f.shape, f.run!, f.rise!, d0 + (d1 - d0) * (i / n)) / f.rise!) : undefined);
    // the side walls, from the road up to the top along both kerbs
    for (const s of [0, 1]) {
      const k = s === 0 ? 0 : ACROSS;
      const upper = top.map((r) => r[k]);
      grid(p, [foot[s], upper], [footUv[s], footUv[s].map(([u]) => [u, SIDE_V] as [number, number])]);
    }
    // a ramp's lip: straight down from its top edge to the road, in the gold band
    if (!hump) {
      const lip = top[n], rise = f.rise;
      const base = lip.map((q) => [q[0], q[1] - rise, q[2]] as Vec3);
      const u = topUv[n].map(([x]) => x);
      grid(p, [base, lip], [u.map((x) => [x, LIP_V0 + 0.01] as [number, number]), u.map((x) => [x, 0.99] as [number, number])]);
    }
  }
  const out: Mesh[] = [];
  const make = (name: string, p: Part, count: number, map: DataTexture) => {
    const mat = new MeshToonMaterial({ map, gradientMap, side: DoubleSide, vertexColors: true });
    const m = new Mesh(toGeometry(p), mat);
    m.name = name;
    m.userData.count = count;
    // they take the karts' shadows but cast none: a low surface casting onto itself shows acne
    m.castShadow = false;
    m.receiveShadow = true;
    out.push(m);
  };
  if (nRamps) make('ramps', ramps, nRamps, rampTexture(palette));
  if (nHumps) make('humps', humps, nHumps, humpTexture(palette, track.def.biome));
  return out;
}

// ---------------------------------------------------------------- boost pads

const PAD_CLOCK = { value: 0 };
/** Scroll the chevrons of every boost pad (race or attract-mode seconds). Visual only. */
export function tickPads(time: number): void { PAD_CLOCK.value = time; }

const PAD_VERT = `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const PAD_FRAG = `
uniform float time;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float f = 1.0 - vUv.y;                 // 0 at the back of the pad, 1 at the front
  float x = abs(vUv.x - 0.5) * 2.0;      // 0 on the centre line, 1 at the edge
  // linear colours kept under 1 so the filmic tone map leaves them a saturated orange
  vec3 base = mix(vec3(0.85, 0.10, 0.01), vec3(0.95, 0.42, 0.02), f);
  // three chevrons pointing forward, scrolling forward
  float ch = fract(f * 3.0 + x * 0.9 - time * 2.4);
  float arrow = smoothstep(0.0, 0.05, ch) * (1.0 - smoothstep(0.3, 0.36, ch));
  vec3 c = mix(base, vec3(1.0, 0.86, 0.5), arrow); // bright, but under the bloom threshold
  // a dark rim frames the glowing panel
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  c = mix(vec3(0.05, 0.02, 0.01), c, smoothstep(0.04, 0.06, e));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** The glowing, scrolling boost-pad material. One per scene (the clock is shared). */
export function padMaterial(): ShaderMaterial {
  const uniforms = { ...UniformsUtils.clone(UniformsLib.fog), time: PAD_CLOCK };
  return new ShaderMaterial({ vertexShader: PAD_VERT, fragmentShader: PAD_FRAG, uniforms, fog: true });
}

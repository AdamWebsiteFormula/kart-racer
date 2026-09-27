// The sea's ripples (Adam, 26 Sept 2026: "The water still looks solid and blue and does not look like it
// has waves"). The Gerstner swell (waterWaves.ts) is real geometry, but it is metres long, fades out 55-90
// m from the lens and from the chase camera the sea is mostly farther than that, so it read as one flat,
// pale band. Mario Kart World's sea shows a ripple pattern at every distance, lighter crests over darker
// troughs, the sky in every facet and sun glints on the ripple tops (research, art-pipeline SOP 26 Sept
// 2026). The standard real-time answer is a few scrolling detail-normal layers at different scales,
// speeds and directions (three.js's own Water.js samples one normal map four times; Catlike Coding's
// "Waves" and "Flow" tutorials; Unity's and Godot's stylized water): here one small tiling height and
// slope map, made in code at load (no image file), sampled in world space by RIPPLE_LAYERS.
//
// The map is a sum of sine waves with whole-number wave vectors, so it tiles exactly; each texel holds
// the local slope (for the normal) and height (for crest and trough shading). It is mipmapped with
// anisotropic filtering, so a far layer averages out smoothly instead of aliasing (no shimmer); the
// fragment shader also fades each layer out by its own distance and widens the sun's glint where the
// normal varies faster than the pixels can hold (surfaces.ts: Kaplanyan's and Filament's specular
// anti-aliasing), so the glints twinkle near the kart without crawling in the distance.
import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three';

/** The map: `size`² texels (a power of two for mipmaps), `waves` sines, wave numbers `kMin`..`kMax` per tile, spread `spread` rad round the wind. */
export const RIPPLE = Object.freeze({ size: 256, waves: 30, kMin: 3, kMax: 17, spread: 1.35, seed: 0x5eaf1e });

/**
 * One detail layer: its tile in metres, its direction (radians, the tile turned so the layers never line
 * up), its drift in metres a second, its slope (how far it tips the normal), and where it fades out
 * (metres from the lens; the finest go first). Each layer holds wavelengths from tile/kMax to tile/kMin.
 * Real waves of those lengths run at their deep-water speed sqrt(g·λ/2π) (Kinsman, "Wind Waves", 1965;
 * the dispersion the swell uses): 1.5-3.5 m/s for the chop's 1.4-7.7 m waves, under 1 m/s for the
 * finest ripples. Scrolled as a whole, a layer drifts slower than that, 0.55-0.9 m/s, so the sea reads
 * calm, but at least a third of its own finest wavelength in half a second, so a still pair 0.5 s apart
 * always differs (tested).
 */
export interface RippleLayer { tile: number; angle: number; drift: readonly [number, number]; slope: number; fade: readonly [number, number] }

export const RIPPLE_LAYERS: readonly RippleLayer[] = Object.freeze([
  // the chop: reads from the chase camera across the whole bay, out to the horizon
  { tile: 23, angle: 0.4, drift: [0.8, 0.47] as const, slope: 0.34, fade: [900, 1400] as const },
  { tile: 8.5, angle: 2.1, drift: [-0.6, 0.53] as const, slope: 0.3, fade: [260, 520] as const },
  // the ripples: in front of the kart and round the shore, posts and boats
  { tile: 3.1, angle: -1.2, drift: [0.57, -0.4] as const, slope: 0.26, fade: [60, 150] as const },
  { tile: 1.15, angle: 3.6, drift: [-0.37, -0.41] as const, slope: 0.2, fade: [14, 38] as const },
]);

/** A small deterministic generator (the same map on every load, so stills and tests repeat). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

interface Wave { kx: number; ky: number; amp: number; phase: number }

/** The sines: whole-number wave vectors (so the map tiles), round the wind (+x) within ±spread, a few against it, amplitude ∝ k^-1.6. */
export function rippleWaves(): Wave[] {
  const r = rng(RIPPLE.seed), out: Wave[] = [], seen = new Set<string>();
  while (out.length < RIPPLE.waves) {
    const k = RIPPLE.kMin + (RIPPLE.kMax - RIPPLE.kMin) * Math.pow(r(), 1.3);
    const against = r() < 0.2;
    const a = (r() * 2 - 1) * RIPPLE.spread + (against ? Math.PI : 0);
    const kx = Math.round(Math.cos(a) * k), ky = Math.round(Math.sin(a) * k);
    const key = `${kx},${ky}`;
    if ((kx === 0 && ky === 0) || seen.has(key)) continue;
    seen.add(key);
    out.push({ kx, ky, amp: Math.pow(Math.hypot(kx, ky), -1.6) * (against ? 0.5 : 1), phase: r() * Math.PI * 2 });
  }
  return out;
}

/**
 * The map's height and slope at every texel (row-major, y then x): `h` in about [-1, 1] and the slope
 * (∂h/∂x, ∂h/∂y per tile length) scaled so the steepest texel is 1. Separable: each sine of (a + b)
 * is sin a·cos b + cos a·sin b from per-column and per-row tables, so a 256² map takes a few ms.
 */
export function rippleField(size: number = RIPPLE.size):{ h: Float32Array; sx: Float32Array; sy: Float32Array } {
  const waves = rippleWaves(), n = size * size;
  const h = new Float32Array(n), sx = new Float32Array(n), sy = new Float32Array(n);
  const sa = new Float32Array(size), ca = new Float32Array(size), sb = new Float32Array(size), cb = new Float32Array(size);
  for (const w of waves) {
    for (let i = 0; i < size; i++) {
      const a = (2 * Math.PI * w.kx * i) / size + w.phase, b = (2 * Math.PI * w.ky * i) / size;
      sa[i] = Math.sin(a); ca[i] = Math.cos(a); sb[i] = Math.sin(b); cb[i] = Math.cos(b);
    }
    const gx = w.amp * 2 * Math.PI * w.kx, gy = w.amp * 2 * Math.PI * w.ky;
    for (let y = 0; y < size; y++) {
      const row = y * size, s2 = sb[y], c2 = cb[y];
      for (let x = 0; x < size; x++) {
        const s = sa[x] * c2 + ca[x] * s2, c = ca[x] * c2 - sa[x] * s2;
        h[row + x] += w.amp * s;
        sx[row + x] += gx * c;
        sy[row + x] += gy * c;
      }
    }
  }
  let hMax = 0, sMax = 0;
  for (let i = 0; i < n; i++) { hMax = Math.max(hMax, Math.abs(h[i])); sMax = Math.max(sMax, Math.hypot(sx[i], sy[i])); }
  for (let i = 0; i < n; i++) { h[i] /= hMax; sx[i] /= sMax; sy[i] /= sMax; }
  return { h, sx, sy };
}

let shared: DataTexture | null = null;
/**
 * The ripple map as a texture, made once and shared (never disposed by a scene, like the water material
 * itself): R, G the slope (0.5 flat), B the height (0.5 the mean), A unused (1). Linear data, repeating,
 * trilinear with mipmaps and up to 8x anisotropic filtering (three clamps it to what the GPU has).
 */
export function rippleTexture(): DataTexture {
  if (shared) return shared;
  const size = RIPPLE.size, f = rippleField(size), data = new Uint8Array(size * size * 4);
  const enc = (v: number) => Math.max(0, Math.min(255, Math.round((v * 0.5 + 0.5) * 255)));
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = enc(f.sx[i]);
    data[i * 4 + 1] = enc(f.sy[i]);
    data[i * 4 + 2] = enc(f.h[i]);
    data[i * 4 + 3] = 255;
  }
  const t = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  t.name = 'WaterRipples';
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = NoColorSpace;
  t.needsUpdate = true;
  shared = t;
  return t;
}

const f = (n: number): string => n.toFixed(5);

/**
 * GLSL: `lkRipples(worldXZ, t, dist)` sums RIPPLE_LAYERS from uRipple: .xy the world-space slope
 * (∂h/∂x, ∂h/∂z; the normal tips by it), .z the height in about [-1, 1] (crests +, troughs -), each layer
 * faded out between its own two distances from the lens. Each layer's map is turned by its angle, so its
 * slope is turned back into world space.
 */
export const RIPPLE_GLSL = `
uniform sampler2D uRipple;
vec3 lkRipples(vec2 p, float t, float dist) {
  vec3 acc = vec3(0.0);
  float hw = 0.0;
${RIPPLE_LAYERS.map((l) => {
    const c = Math.cos(l.angle), s = Math.sin(l.angle);
    return `  {
    float k = ${f(l.slope)} * (1.0 - smoothstep(${l.fade[0].toFixed(1)}, ${l.fade[1].toFixed(1)}, dist));
    if (k > 0.0) {
      vec2 q = vec2(dot(vec2(${f(c)}, ${f(-s)}), p), dot(vec2(${f(s)}, ${f(c)}), p));
      vec4 r = texture2D(uRipple, (q + vec2(${f(l.drift[0])}, ${f(l.drift[1])}) * t) * ${f(1 / l.tile)});
      vec2 d = (r.xy * 2.0 - 1.0) * k;
      acc.xy += vec2(dot(vec2(${f(c)}, ${f(s)}), d), dot(vec2(${f(-s)}, ${f(c)}), d));
      acc.z += (r.z * 2.0 - 1.0) * k;
      hw += k;
    }
  }`;
  }).join('\n')}
  acc.z /= max(hw, 1e-3);
  return acc;
}
`;

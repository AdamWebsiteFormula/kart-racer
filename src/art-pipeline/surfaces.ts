// The big flat surfaces: stylized water that drifts and sparkles, and painted ground and road
// textures (AI-made, public/textures). Everything here is shared across races and never disposed
// by a scene. WATER_CLOCK is the one time uniform every water material reads; the game ticks it.
import {
  Color, MeshToonMaterial, MirroredRepeatWrapping, RepeatWrapping, ShaderMaterial, SRGBColorSpace, TextureLoader,
  Texture, UniformsLib, UniformsUtils, type Material,
} from 'three';
import { toonRamp } from './toon.ts';

/** Seconds, advanced by the game loop; every water surface animates from it. */
export const WATER_CLOCK = { value: 0 };

const WATER_VERT = `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const WATER_FRAG = `
uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sparkle; uniform vec3 horizon;
varying vec3 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 p = vWorld.xz * 0.06;
  // two slow drifting layers make soft patches of deep and shallow water
  float n = noise(p + vec2(time * 0.04, time * 0.025)) * 0.6 + noise(p * 2.3 - vec2(time * 0.03, -time * 0.05)) * 0.4;
  vec3 c = mix(deep, shallow, smoothstep(0.3, 0.8, n));
  // cartoon sparkle: thin bright lines where two moving ripple fields cross the same level
  vec2 q = vWorld.xz * 0.22;
  float d = abs(noise(q + vec2(time * 0.35, 0.0)) - noise(q * 1.07 - vec2(0.0, time * 0.3)));
  // a thin line at any distance: its width follows the screen, not the world
  float line = 1.0 - smoothstep(0.0, max(0.012, fwidth(d) * 1.4), d);
  float view = length(cameraPosition.xz - vWorld.xz);
  c = mix(c, sparkle, line * 0.6 * (1.0 - smoothstep(60.0, 260.0, view)));
  // towards the horizon the water mirrors the sky
  vec3 v = normalize(cameraPosition - vWorld);
  c = mix(c, horizon, pow(1.0 - clamp(v.y, 0.0, 1.0), 4.0) * 0.55);
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

const WATERS: Readonly<Record<string, { deep: string; shallow: string; sparkle: string; horizon: string }>> = Object.freeze({
  harbour: { deep: '#1b7fc0', shallow: '#46c2e6', sparkle: '#f2fdff', horizon: '#bfe8f7' },
  boardwalk: { deep: '#0a1440', shallow: '#1d3f86', sparkle: '#9fe6ff', horizon: '#6a3a9a' },
});

const waterCache = new Map<string, ShaderMaterial>();
/** The water for a biome (harbour blue by default), shared by every race on it. */
export function waterMaterial(biome: string): ShaderMaterial {
  const key = WATERS[biome] ? biome : 'harbour';
  let m = waterCache.get(key);
  if (!m) {
    const w = WATERS[key];
    m = new ShaderMaterial({
      vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true,
      uniforms: UniformsUtils.merge([UniformsLib.fog, {
        time: { value: 0 }, deep: { value: new Color(w.deep) }, shallow: { value: new Color(w.shallow) },
        sparkle: { value: new Color(w.sparkle) }, horizon: { value: new Color(w.horizon) },
      }]),
    });
    m.uniforms.time = WATER_CLOCK; // one clock for every water surface
    m.userData.shared = true;
    waterCache.set(key, m);
  }
  return m;
}

/** Painted ground per biome (public/textures/<name>.webp) and how many metres one tile covers. */
const GROUNDS: Readonly<Record<string, { file: string; metres: number }>> = Object.freeze({
  meadow: { file: 'grass', metres: 14 },
  canyon: { file: 'sand', metres: 16 },
  frost: { file: 'snow', metres: 16 },
});

const texCache = new Map<string, Texture>();
function texture(file: string): Texture {
  let t = texCache.get(file);
  if (!t) {
    // no page (headless tests): an empty texture, nothing to load
    t = typeof document === 'undefined' ? new Texture() : new TextureLoader().load(`${import.meta.env?.BASE_URL ?? '/'}textures/${file}.webp`);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = MirroredRepeatWrapping;
    t.anisotropy = 8;
    t.userData.shared = true;
    texCache.set(file, t);
  }
  return t;
}

const groundCache = new Map<string, Material>();
/**
 * The ground under a track: water for the sea tracks, a painted texture for the land ones, or
 * undefined to keep the scene's flat toon colour. `size` is the ground plane's side in metres.
 */
export function groundMaterial(biome: string, kind: string, size: number): Material | undefined {
  if (kind === 'water') return waterMaterial(biome);
  const g = GROUNDS[biome];
  if (!g || kind !== 'plane') return undefined;
  const key = `${biome}:${size}`;
  let m = groundCache.get(key);
  if (!m) {
    // every ground plane is the same size, so the shared texture carries the repeat itself
    const t = texture(g.file);
    t.repeat.set(size / g.metres, size / g.metres);
    m = new MeshToonMaterial({ color: 0xffffff, map: t, gradientMap: toonRamp() });
    m.userData.shared = true;
    groundCache.set(key, m);
  }
  return m;
}

/** The road's fine grain (a neutral grey, so each biome's road colour shows through), repeating along the track. */
export function roadGrain(): Texture {
  const t = texture('asphalt');
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

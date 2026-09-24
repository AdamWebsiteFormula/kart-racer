// The big flat surfaces: stylized water that drifts and sparkles, and painted ground and road
// textures (AI-made, public/textures). Everything here is shared across races and never disposed
// by a scene. WATER_CLOCK is the one time uniform every water material reads; the game ticks it.
import {
  CanvasTexture, Color, MeshToonMaterial, MirroredRepeatWrapping, RepeatWrapping, ShaderMaterial, SRGBColorSpace, TextureLoader,
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

/**
 * Frostbite's snow (detail review, 24 Sept 2026: "flat pure white"): soft blue hollows, wind ripples
 * and a glint of sparkle near the camera, in world space on the ground plane and on the land under
 * the road alike, so the two meet with no seam. Same draw calls, same textures.
 */
const SNOW_PARS = `varying vec3 vSnowW;
float snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float snowNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), u.x), mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;
const SNOW_FRAG = `{
  vec2 w = vSnowW.xz;
  float view = length(cameraPosition.xz - w);
  // soft blue hollows and drifts, two sizes
  float n = snowNoise(w * 0.028) * 0.65 + snowNoise(w * 0.085 + 7.0) * 0.35;
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.58, 0.71, 0.97), smoothstep(0.4, 0.72, n) * 0.85);
  // wind ripples: thin cool shadow lines across the wind, bent by the drifts, fading with distance
  float ripple = sin(dot(w, vec2(0.83, 0.55)) * 1.25 + snowNoise(w * 0.05) * 6.0);
  diffuseColor.rgb *= 1.0 - 0.22 * smoothstep(0.55, 0.97, ripple) * (1.0 - smoothstep(30.0, 110.0, view)) * vec3(1.0, 0.7, 0.3);
  // sparkle: a few ice glints near the camera, bright enough for the bloom
  vec2 cell = floor(w * 2.2), f = fract(w * 2.2) - 0.5;
  float glint = step(0.986, snowHash(cell)) * (1.0 - smoothstep(0.04, 0.1, length(f))) * (1.0 - smoothstep(12.0, 40.0, view));
  totalEmissiveRadiance += vec3(0.85, 0.93, 1.0) * glint * 1.4;
}`;
/** Add the snow to a toon material's shader (it needs `transformed` and `totalEmissiveRadiance`). */
function snowShader(shader: { vertexShader: string; fragmentShader: string }): void {
  shader.vertexShader = `varying vec3 vSnowW;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSnowW = (modelMatrix * vec4(transformed, 1.0)).xyz;')}`;
  shader.fragmentShader = `${SNOW_PARS}\n${shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SNOW_FRAG}`)}`;
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
    if (biome === 'frost') {
      m.onBeforeCompile = snowShader;
      m.customProgramCacheKey = () => 'ground-snow';
    }
    m.userData.shared = true;
    groundCache.set(key, m);
  }
  return m;
}

/** Start loading every painted surface now, so no race opens on a black ground while one arrives. */
export function preloadSurfaces(): void {
  for (const g of Object.values(GROUNDS)) texture(g.file);
  texture('asphalt');
}

/** The road's fine grain (a neutral grey, so each biome's road colour shows through), repeating along the track. */
export function roadGrain(): Texture {
  const t = texture('asphalt');
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** A wide wooden deck (Boardwalk Nights): warm planks with grain and dark gaps, 4 planks a tile. */
function planks(): Texture {
  let t = texCache.get('planks');
  if (!t) {
    if (typeof document === 'undefined') t = new Texture();
    else {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      if (g) {
        for (let p = 0; p < 4; p++) {
          const y = p * 64, shade = [0, -10, 6, -4][p];
          g.fillStyle = `rgb(${196 + shade}, ${150 + shade}, ${108 + shade})`;
          g.fillRect(0, y, 256, 64);
          // grain: long soft streaks along the plank
          for (let k = 0; k < 26; k++) {
            g.fillStyle = `rgba(${90 + (k % 3) * 20}, ${56 + (k % 2) * 10}, 30, ${0.05 + (k % 4) * 0.02})`;
            g.fillRect(0, y + 4 + ((k * 37) % 56), 256, 1 + (k % 2));
          }
          // plank ends staggered along the deck
          g.fillStyle = 'rgba(40, 24, 16, 0.55)';
          g.fillRect(((p * 97) % 256), y, 2, 64);
          g.fillStyle = 'rgba(30, 18, 12, 0.85)';
          g.fillRect(0, y + 61, 256, 3); // gap
        }
      }
      t = new CanvasTexture(c);
    }
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    t.userData.shared = true;
    texCache.set('planks', t);
  }
  return t;
}

/** The coast's two surfaces per sea biome: the flat top and the beach, metres per tile, and how the sand is toned. */
const COASTS: Readonly<Record<string, { top: () => Texture; topMetres: number; beach: string; beachMetres: number; beachTint: string; beachSat: number }>> = Object.freeze({
  harbour: { top: () => texture('grass'), topMetres: 14, beach: 'sand', beachMetres: 10, beachTint: '#fff6de', beachSat: 0.5 },
  boardwalk: { top: planks, topMetres: 2.6, beach: 'sand', beachMetres: 10, beachTint: '#c9b8d6', beachSat: 0.25 },
  // land tracks: the hills and cliffs under raised roads
  canyon: { top: () => texture('sand'), topMetres: 16, beach: 'sand', beachMetres: 9, beachTint: '#ffd9bf', beachSat: 0.8 },
  frost: { top: () => texture('snow'), topMetres: 16, beach: 'snow', beachMetres: 12, beachTint: '#dde8f6', beachSat: 1 },
  meadow: { top: () => texture('grass'), topMetres: 14, beach: 'grass', beachMetres: 12, beachTint: '#e2e6b8', beachSat: 0.85 },
});

const coastCache = new Map<string, Material>();
/**
 * The coast of a sea track: the top texture on the flat land, a pale beach sand down the slope,
 * mixed by the geometry's `blend` attribute (0 top → 1 beach) and sampled by world metres (the
 * geometry's `uv`); vertex colours darken the wet sand. Both textures are the shared ones, read
 * through their own uniforms so no repeat is touched. Undefined for a biome with no coast.
 * Shared, never disposed.
 */
export function coastMaterial(biome: string): Material | undefined {
  const spec = COASTS[biome];
  if (!spec) return undefined;
  let m = coastCache.get(biome);
  if (!m) {
    const mat = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp(), vertexColors: true });
    const uniforms = {
      topMap: { value: spec.top() }, topScale: { value: 1 / spec.topMetres },
      beachMap: { value: texture(spec.beach) }, beachScale: { value: 1 / spec.beachMetres },
      beachTint: { value: new Color(spec.beachTint) }, beachSat: { value: spec.beachSat },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'attribute float blend;\nvarying float vBlend;\nvarying vec2 vWorldUv;\n'
        + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBlend = blend;\n  vWorldUv = uv;');
      shader.fragmentShader = 'uniform sampler2D topMap;\nuniform sampler2D beachMap;\nuniform float topScale;\nuniform float beachScale;\nuniform vec3 beachTint;\nuniform float beachSat;\nvarying float vBlend;\nvarying vec2 vWorldUv;\n'
        + shader.fragmentShader.replace(
          '#include <map_fragment>',
          [
            '#include <map_fragment>',
            '  vec3 topTexel = texture2D(topMap, vWorldUv * topScale).rgb;',
            '  vec3 sandTexel = texture2D(beachMap, vWorldUv * beachScale).rgb;',
            '  sandTexel = mix(vec3(dot(sandTexel, vec3(0.299, 0.587, 0.114))), sandTexel, beachSat) * beachTint;',
            '  diffuseColor.rgb *= mix(topTexel, sandTexel, smoothstep(0.0, 1.0, vBlend));',
          ].join('\n'),
        );
      if (biome === 'frost') snowShader(shader);
    };
    mat.customProgramCacheKey = () => `coast-${biome}`;
    mat.userData.shared = true;
    coastCache.set(biome, mat);
    m = mat;
  }
  return m;
}

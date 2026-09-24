// Painted skies (research plan §7.1: a painted sky sphere keeps the toon look). Each preset is a
// gradient; a preset with a painted panorama (public/skies/<id>.webp, made with AI) wraps it round
// the dome once the file arrives. Presets by the track's `environment.sky` id; the Final Lap Shift
// can switch to another one. The horizon colour is the fog colour, so it matches the painting's.
import { BackSide, Color, Mesh, ShaderMaterial, SRGBColorSpace, TextureLoader, type Object3D, type Texture } from 'three';

/**
 * The scene's lights under a sky: the sun (or moon), the sky's own light, and the fill. `grade` is
 * the post chain's colour lift under it (post.ts, DAY_GRADE when absent); `glow` how much the
 * balloons and coins light themselves (0 by day), so pickups still read on a night road.
 */
export interface SkyLight { sun: string; sunI: number; sky: string; skyI: number; ambient: string; ambientI: number; earth: string; grade?: number; glow?: number }

/** `panoHorizon`: how far up its file the painting's own horizon sits (0 = the bottom edge); below it, a painted cloud sea. */
export interface SkyPreset { top: string; horizon: string; ground: string; sun: string; light?: SkyLight; panoHorizon?: number }

/** The post chain's saturation lift after the filmic curve under a plain sky (post.ts). */
export const DAY_GRADE = 0.12;

/** A clear day: the lights every day sky uses. */
export const DAY_LIGHT: SkyLight = Object.freeze({ sun: '#fff0d8', sunI: 2.5, sky: '#cfe8ff', skyI: 0.65, ambient: '#bcd8ff', ambientI: 0.28, earth: '#7a6a4f' });

/** Lights for the skies that are not a plain day (sunsets, a storm, snow, nights). */
const LIGHTS: Readonly<Record<string, SkyLight>> = Object.freeze({
  // each day sky's own afternoon: a warm key, cool shadows, less flat fill
  'harbour-day': { sun: '#ffdcb0', sunI: 2.6, sky: '#cfe6ff', skyI: 0.6, ambient: '#b8d4ff', ambientI: 0.25, earth: '#7a6a4f' },
  'meadow-day': { sun: '#fff0cc', sunI: 2.6, sky: '#d2ecff', skyI: 0.6, ambient: '#c0dcff', ambientI: 0.25, earth: '#6a7a3f' },
  'canyon-day': { sun: '#ffd9a8', sunI: 2.7, sky: '#bcd8ff', skyI: 0.55, ambient: '#c8b8e8', ambientI: 0.25, earth: '#8a4a2f' },
  'harbour-tide': { sun: '#ffb27a', sunI: 2.0, sky: '#ffc9a8', skyI: 0.75, ambient: '#ffcfb0', ambientI: 0.45, earth: '#8a5a4a' },
  'meadow-storm': { sun: '#c9d4e0', sunI: 1.0, sky: '#9aa8b8', skyI: 0.85, ambient: '#8a9aad', ambientI: 0.55, earth: '#4f5a4a' },
  // a peach key and violet shade (detail review 2026-09-24: an orange sun on orange sand, pink fog
  // and the day's colour lift turned the whole final lap one clipped red)
  'canyon-dusk': { sun: '#ffc49a', sunI: 1.7, sky: '#8f86e0', skyI: 0.9, ambient: '#8a7ad0', ambientI: 0.55, earth: '#6a3a3a', grade: 0.03, glow: 0.12 },
  'frost-day': { sun: '#fff0dc', sunI: 1.9, sky: '#c6dcff', skyI: 0.55, ambient: '#a8c4f0', ambientI: 0.28, earth: '#8898b8' },
  'frost-blizzard': { sun: '#e8f0ff', sunI: 1.1, sky: '#dde8f5', skyI: 1.05, ambient: '#c8d6e8', ambientI: 0.65, earth: '#a8b4c4' },
  'boardwalk-night': { sun: '#8fa6ff', sunI: 0.6, sky: '#4a3aa0', skyI: 0.42, ambient: '#5a4ac0', ambientI: 0.22, earth: '#1a1040', glow: 0.5 },
  'boardwalk-fireworks': { sun: '#c8b0ff', sunI: 1.05, sky: '#8a4ab0', skyI: 0.75, ambient: '#9a6ad0', ambientI: 0.5, earth: '#3a1a50', glow: 0.4 },
  'skyline-dawn': { sun: '#ffc890', sunI: 2.4, sky: '#ffc0d8', skyI: 0.6, ambient: '#d0b8f0', ambientI: 0.3, earth: '#9fb8ec' },
  'skyline-night': { sun: '#a8c0ff', sunI: 1.0, sky: '#4060c0', skyI: 0.7, ambient: '#5068c8', ambientI: 0.5, earth: '#2a3a78', grade: 0.06, glow: 0.3 },
});

/** The lights under a sky preset (a plain day when it has none of its own). */
export const lightOf = (id: string | undefined): SkyLight => (id && LIGHTS[id]) || DAY_LIGHT;

export const SKIES: Readonly<Record<string, SkyPreset>> = Object.freeze({
  'harbour-day': { top: '#1484f5', horizon: '#f6dbb0', ground: '#cfe9f5', sun: '#fff6c9' },
  'harbour-tide': { top: '#1f67c4', horizon: '#de826a', ground: '#b9d6e6', sun: '#ffe0a3' },
  'meadow-day': { top: '#1b8ffa', horizon: '#dbfccc', ground: '#d8efc2', sun: '#fff7cf' },
  'meadow-storm': { top: '#1e3c65', horizon: '#96b0a8', ground: '#7d8a80', sun: '#c7d0d8' },
  'canyon-day': { top: '#1d71e3', horizon: '#fee5ae', ground: '#e8b38a', sun: '#fff0c2' },
  'canyon-dusk': { top: '#1b1e69', horizon: '#b53e5f', ground: '#c8553d', sun: '#ffd27a' },
  'frost-day': { top: '#32a0fb', horizon: '#daf1fd', ground: '#e3eef7', sun: '#ffffff' },
  'frost-blizzard': { top: '#90a9ca', horizon: '#e6f1fc', ground: '#cfd9e2', sun: '#eef3f7' },
  'boardwalk-night': { top: '#02155a', horizon: '#dc73f2', ground: '#1a1440', sun: '#ff2e97' },
  'boardwalk-fireworks': { top: '#0e164e', horizon: '#ec89ca', ground: '#221a52', sun: '#ffd23f' },
  // the two cloud-sea paintings put their horizon about a quarter of the way up the file
  'skyline-dawn': { top: '#2c8af4', horizon: '#9b9be3', ground: '#9fb8ec', sun: '#fff1c1', panoHorizon: 0.26 },
  'skyline-night': { top: '#05206d', horizon: '#3a58bd', ground: '#2a3a78', sun: '#f2b705', panoHorizon: 0.24 },
});

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** How far below the horizon a painting's cloud sea reaches (radians): the file's rows under its own horizon. */
const BELOW_SPAN = 0.35;
const BELOW = BELOW_SPAN.toFixed(2);

// two skies, A (the one a Final Lap Shift leaves) and B (the current one), blended by `fade`
const FRAG = `
uniform vec3 topA; uniform vec3 horizonA; uniform vec3 groundA; uniform vec3 sunA;
uniform sampler2D panoA; uniform float hasPanoA; uniform float panoHorizonA;
uniform vec3 topB; uniform vec3 horizonB; uniform vec3 groundB; uniform vec3 sunB;
uniform sampler2D panoB; uniform float hasPanoB; uniform float panoHorizonB;
uniform vec3 sunDir; uniform float panoSpan; uniform float fade;
varying vec3 vDir;
vec3 paint(vec3 d, vec3 top, vec3 horizon, vec3 ground, vec3 sun, sampler2D pano, float hasPano, float panoHorizon) {
  float y = d.y;
  // two soft bands above the horizon, a quick fade below it: a painted look, not a photo
  vec3 c = y > 0.0 ? mix(horizon, top, smoothstep(0.0, 0.55, pow(y, 0.8))) : mix(horizon, ground, smoothstep(0.0, 0.2, -y));
  if (hasPano > 0.5) {
    // once round the dome; the painting's own horizon (panoHorizon up the file) sits on ours, its
    // top panoSpan up, and the painted cloud sea under that horizon covers the first BELOW_SPAN below ours
    float u = atan(d.x, -d.z) / 6.2831853 + 0.5;
    float e = asin(clamp(y, -1.0, 1.0));
    float v = e >= 0.0 ? panoHorizon + e / panoSpan * (1.0 - panoHorizon) : panoHorizon * (1.0 + e / ${BELOW});
    v = clamp(v, 0.002, 0.998);
    // no mipmaps: u jumps from 1 to 0 at the seam, and a mip picked from that jump draws a line down the sky
    vec3 a = textureLod(pano, vec2(u, v), 0.0).rgb;
    // the one seam: the left edge fades into a mirror of the right edge, so both sides meet
    vec3 b = textureLod(pano, vec2(1.0 - u, v), 0.0).rgb;
    vec3 p = mix(b, a, smoothstep(0.0, 0.04, u));
    // a little richer than the file: the tone mapping after this pass softens paint the most
    float l = dot(p, vec3(0.2126, 0.7152, 0.0722));
    p = max(mix(vec3(l), p, 1.18), 0.0) * 1.08;
    // a painting with no cloud sea stops at the horizon; one with a sea fades out near its bottom row
    float under = panoHorizon > 0.0 ? 1.0 - smoothstep(0.75, 1.0, -e / ${BELOW}) : smoothstep(-0.03, 0.0, y);
    float w = (1.0 - smoothstep(0.8, 0.998, v)) * under;
    c = mix(c, p, w);
  }
  float s = max(dot(d, normalize(sunDir)), 0.0);
  return mix(c, sun, (smoothstep(0.985, 0.995, s) + 0.25 * pow(s, 24.0)) * (1.0 - 0.85 * hasPano));
}
void main() {
  vec3 d = normalize(vDir);
  vec3 c = paint(d, topB, horizonB, groundB, sunB, panoB, hasPanoB, panoHorizonB);
  if (fade < 1.0) c = mix(paint(d, topA, horizonA, groundA, sunA, panoA, hasPanoA, panoHorizonA), c, smoothstep(0.0, 1.0, fade));
  gl_FragColor = vec4(c, 1.0);
}`;

/** The painted panoramas that ship with the game (public/skies). */
export const PANORAMAS: ReadonlySet<string> = new Set<string>(Object.keys(SKIES));
/** How far up the sky a panorama reaches from the horizon (radians). */
const PANO_SPAN = 0.85;
/** Seconds a Final Lap Shift takes to turn one sky into the next (the lights ease over about the same, main.ts). */
export const SKY_FADE = 1.5;
const panoCache = new Map<string, Promise<Texture | null>>();
/** Panoramas already decoded, so a sky whose file is here paints on its first frame. */
const panoReady = new Map<string, Texture>();

/** A preset's panorama, loaded once and shared; null when it has none or the file fails. */
function panorama(id: string): Promise<Texture | null> {
  if (!PANORAMAS.has(id)) return Promise.resolve(null);
  let p = panoCache.get(id);
  if (!p) {
    p = new TextureLoader().loadAsync(`${import.meta.env?.BASE_URL ?? '/'}skies/${id}.webp`).then((t) => {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      t.userData.shared = true;
      panoReady.set(id, t);
      return t;
    }).catch(() => null);
    panoCache.set(id, p);
  }
  return p;
}

/**
 * Fetch a sky's painting ahead of time (the Final Lap Shift's, as the race loads), so the shift
 * fades into the painting and not its plain gradient; the caller can upload it to the GPU too.
 */
export function preloadSky(id: string | undefined): Promise<Texture | null> {
  return id ? panorama(id) : Promise.resolve(null);
}

type Side = 'A' | 'B';
const SIDE_KEYS = ['top', 'horizon', 'ground', 'sun', 'pano', 'hasPano', 'panoHorizon'] as const;
const COLOUR_KEYS: ReadonlySet<string> = new Set(['top', 'horizon', 'ground', 'sun']);

function setSide(mat: ShaderMaterial, side: Side, p: SkyPreset): void {
  const u = mat.uniforms;
  for (const k of ['top', 'horizon', 'ground', 'sun'] as const) (u[`${k}${side}`].value as Color).set(p[k]);
  u[`pano${side}`].value = null;
  u[`hasPano${side}`].value = 0;
  u[`panoHorizon${side}`].value = p.panoHorizon ?? 0;
}

function setPano(mat: ShaderMaterial, side: Side, t: Texture): void {
  mat.uniforms[`pano${side}`].value = t;
  mat.uniforms[`hasPano${side}`].value = 1;
}

export function skyMaterial(p: SkyPreset): ShaderMaterial {
  const uniforms: Record<string, { value: unknown }> = { sunDir: { value: [0.45, 0.8, 0.35] }, panoSpan: { value: PANO_SPAN }, fade: { value: 1 } };
  for (const side of ['A', 'B'] as const) for (const k of SIDE_KEYS) uniforms[`${k}${side}`] = { value: COLOUR_KEYS.has(k) ? new Color() : null };
  const mat = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: BackSide, depthWrite: false, fog: false, uniforms });
  setSide(mat, 'A', p);
  setSide(mat, 'B', p);
  return mat;
}

/**
 * Swap the scene's flat sky dome for the painted one, or (a Final Lap Shift) start the painted one
 * fading into the next sky; fadeSky moves the fade on. Returns the new horizon colour for the fog.
 */
export function paintSky(group: Object3D, id: string | undefined, fallback: SkyPreset = SKIES['harbour-day']): Color {
  const preset = (id && SKIES[id]) || fallback;
  const dome = group.getObjectByName('sky') as Mesh | undefined;
  if (dome) {
    let mat = dome.material as ShaderMaterial;
    if (!mat.uniforms?.fade) {
      const old = dome.material as { dispose(): void };
      mat = skyMaterial(preset);
      dome.material = mat;
      old.dispose();
    } else {
      // the sky on screen becomes the one the new sky fades in over
      const u = mat.uniforms;
      for (const k of SIDE_KEYS) {
        const b = u[`${k}B`].value;
        if (b instanceof Color) (u[`${k}A`].value as Color).copy(b); else u[`${k}A`].value = b;
      }
      u.fade.value = 0;
      setSide(mat, 'B', preset);
    }
    mat.userData.sky = id;
    // the painting: at once when its file is here, else when it arrives (the gradient already matches its colours)
    const ready = id ? panoReady.get(id) : undefined;
    if (ready) setPano(mat, 'B', ready);
    else if (id) void panorama(id).then((t) => { if (t && mat.userData.sky === id) setPano(mat, 'B', t); });
  }
  return new Color(preset.horizon);
}

/** Move a Final Lap Shift's sky fade on by `dt` seconds; returns how far it has got (0..1, eased as the shader eases it). */
export function fadeSky(dome: Object3D | undefined, dt: number): number {
  const u = ((dome as Mesh | undefined)?.material as ShaderMaterial | undefined)?.uniforms?.fade;
  if (!u) return 1;
  if (u.value < 1) u.value = Math.min(1, u.value + dt / SKY_FADE);
  const f = u.value as number;
  return f * f * (3 - 2 * f);
}

/** Roughly the light on an unlit far-off face under a sky (half the key, the sky light, the fill), linear RGB. */
export function skyIllum(l: SkyLight): Color {
  return new Color(l.sun).multiplyScalar(l.sunI * 0.5)
    .add(new Color(l.sky).multiplyScalar(l.skyI))
    .add(new Color(l.ambient).multiplyScalar(l.ambientI));
}

/** The darkest and brightest a sky change tints what does not take the scene's lights. */
const TINT_MIN = 0.2, TINT_MAX = 1.1;

/**
 * How what does not take the scene's lights (the horizon ring) should change colour when the sky
 * goes from `from` to `to`: the ratio of their light, per channel (a sunset violet and dimmer, a
 * night deep blue), linear RGB.
 */
export function skyTint(from: SkyLight, to: SkyLight): [number, number, number] {
  const a = skyIllum(from), b = skyIllum(to);
  const r = (x: number, y: number) => Math.min(TINT_MAX, Math.max(TINT_MIN, y / Math.max(x, 1e-3)));
  return [r(a.r, b.r), r(a.g, b.g), r(a.b, b.b)];
}

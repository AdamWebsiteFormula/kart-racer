// Painted skies (research plan §7.1: a painted sky sphere keeps the toon look). Each preset is a
// gradient; a preset with a painted panorama (public/skies/<id>.webp, made with AI) wraps it round
// the dome once the file arrives. Presets by the track's `environment.sky` id; the Final Lap Shift
// can switch to another one. The horizon colour is the fog colour, so it matches the painting's.
import { BackSide, Color, Mesh, ShaderMaterial, SRGBColorSpace, TextureLoader, type Object3D, type Texture } from 'three';

/** The scene's lights under a sky: the sun (or moon), the sky's own light, and the fill. */
export interface SkyLight { sun: string; sunI: number; sky: string; skyI: number; ambient: string; ambientI: number; earth: string }

export interface SkyPreset { top: string; horizon: string; ground: string; sun: string; light?: SkyLight }

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
  'canyon-dusk': { sun: '#ff8f60', sunI: 1.5, sky: '#9a78c8', skyI: 0.7, ambient: '#7a6ab0', ambientI: 0.45, earth: '#6a3a3a' },
  'frost-day': { sun: '#fff0dc', sunI: 1.9, sky: '#c6dcff', skyI: 0.55, ambient: '#a8c4f0', ambientI: 0.28, earth: '#8898b8' },
  'frost-blizzard': { sun: '#e8f0ff', sunI: 1.1, sky: '#dde8f5', skyI: 1.05, ambient: '#c8d6e8', ambientI: 0.65, earth: '#a8b4c4' },
  'boardwalk-night': { sun: '#8fa6ff', sunI: 0.6, sky: '#4a3aa0', skyI: 0.42, ambient: '#5a4ac0', ambientI: 0.22, earth: '#1a1040' },
  'boardwalk-fireworks': { sun: '#c8b0ff', sunI: 1.05, sky: '#8a4ab0', skyI: 0.75, ambient: '#9a6ad0', ambientI: 0.5, earth: '#3a1a50' },
  'skyline-dawn': { sun: '#ffc890', sunI: 2.4, sky: '#ffc0d8', skyI: 0.6, ambient: '#d0b8f0', ambientI: 0.3, earth: '#9fb8ec' },
  'skyline-night': { sun: '#a8c0ff', sunI: 1.0, sky: '#4060c0', skyI: 0.7, ambient: '#5068c8', ambientI: 0.5, earth: '#2a3a78' },
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
  'skyline-dawn': { top: '#2c8af4', horizon: '#9b9be3', ground: '#9fb8ec', sun: '#fff1c1' },
  'skyline-night': { top: '#05206d', horizon: '#3a58bd', ground: '#2a3a78', sun: '#f2b705' },
});

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sun; uniform vec3 sunDir;
uniform sampler2D pano; uniform float hasPano; uniform float panoSpan;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  // two soft bands above the horizon, a quick fade below it: a painted look, not a photo
  vec3 c = y > 0.0 ? mix(horizon, top, smoothstep(0.0, 0.55, pow(y, 0.8))) : mix(horizon, ground, smoothstep(0.0, 0.2, -y));
  if (hasPano > 0.5) {
    // once round the dome; the painting's bottom edge sits on the horizon, its top panoSpan up
    float u = atan(d.x, -d.z) / 6.2831853 + 0.5;
    float v = clamp(asin(clamp(y, 0.0, 1.0)) / panoSpan, 0.002, 0.998);
    vec3 a = texture2D(pano, vec2(u, v)).rgb;
    // the one seam: the left edge fades into a mirror of the right edge, so both sides meet
    vec3 b = texture2D(pano, vec2(1.0 - u, v)).rgb;
    vec3 p = mix(b, a, smoothstep(0.0, 0.04, u));
    // a little richer than the file: the tone mapping after this pass softens paint the most
    float l = dot(p, vec3(0.2126, 0.7152, 0.0722));
    p = max(mix(vec3(l), p, 1.18), 0.0) * 1.08;
    float w = (1.0 - smoothstep(0.8, 0.998, v)) * smoothstep(-0.03, 0.0, y);
    c = mix(c, p, w);
  }
  float s = max(dot(d, normalize(sunDir)), 0.0);
  c = mix(c, sun, (smoothstep(0.985, 0.995, s) + 0.25 * pow(s, 24.0)) * (1.0 - 0.85 * hasPano));
  gl_FragColor = vec4(c, 1.0);
}`;

/** The painted panoramas that ship with the game (public/skies). */
export const PANORAMAS: ReadonlySet<string> = new Set<string>(Object.keys(SKIES));
/** How far up the sky a panorama reaches from the horizon (radians). */
const PANO_SPAN = 0.85;
const panoCache = new Map<string, Promise<Texture | null>>();

/** A preset's panorama, loaded once and shared; null when it has none or the file fails. */
function panorama(id: string): Promise<Texture | null> {
  if (!PANORAMAS.has(id)) return Promise.resolve(null);
  let p = panoCache.get(id);
  if (!p) {
    p = new TextureLoader().loadAsync(`${import.meta.env?.BASE_URL ?? '/'}skies/${id}.webp`).then((t) => {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      t.userData.shared = true;
      return t;
    }).catch(() => null);
    panoCache.set(id, p);
  }
  return p;
}

export function skyMaterial(p: SkyPreset): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new Color(p.top) }, horizon: { value: new Color(p.horizon) }, ground: { value: new Color(p.ground) },
      sun: { value: new Color(p.sun) }, sunDir: { value: [0.45, 0.8, 0.35] },
      pano: { value: null }, hasPano: { value: 0 }, panoSpan: { value: PANO_SPAN },
    },
  });
}

/** Swap the scene's flat sky dome for the painted one. Returns the horizon colour for the fog. */
export function paintSky(group: Object3D, id: string | undefined, fallback: SkyPreset = SKIES['harbour-day']): Color {
  const preset = (id && SKIES[id]) || fallback;
  const dome = group.getObjectByName('sky') as Mesh | undefined;
  if (dome) {
    const old = dome.material as { dispose(): void };
    const mat = skyMaterial(preset);
    dome.material = mat;
    old.dispose();
    // the painting fades in when it arrives (the gradient already matches its colours)
    if (id) void panorama(id).then((t) => { if (t && dome.material === mat) { mat.uniforms.pano.value = t; mat.uniforms.hasPano.value = 1; } });
  }
  return new Color(preset.horizon);
}

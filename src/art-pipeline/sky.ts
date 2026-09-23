// Painted gradient skies (research plan §7.1: a painted sky sphere keeps the toon look).
// Presets by the track's `environment.sky` id; the Final Lap Shift can switch to another one.
import { BackSide, Color, Mesh, ShaderMaterial, type Object3D } from 'three';

export interface SkyPreset { top: string; horizon: string; ground: string; sun: string }

export const SKIES: Readonly<Record<string, SkyPreset>> = Object.freeze({
  'harbour-day': { top: '#5fb8ec', horizon: '#fdf0d5', ground: '#cfe9f5', sun: '#fff6c9' },
  'harbour-tide': { top: '#3f7fb6', horizon: '#ffd9b0', ground: '#b9d6e6', sun: '#ffe0a3' },
  'meadow-day': { top: '#6ec3f0', horizon: '#f4fbe0', ground: '#d8efc2', sun: '#fff7cf' },
  'meadow-storm': { top: '#4b5566', horizon: '#9aa6b2', ground: '#7d8a80', sun: '#c7d0d8' },
  'canyon-day': { top: '#58a6e0', horizon: '#ffd9a8', ground: '#e8b38a', sun: '#fff0c2' },
  'frost-day': { top: '#8fc9f0', horizon: '#f2f8ff', ground: '#e3eef7', sun: '#ffffff' },
  'boardwalk-night': { top: '#0b0b33', horizon: '#5a1f6e', ground: '#1a1440', sun: '#ff2e97' },
  'skyline-dawn': { top: '#f59e8b', horizon: '#ffe3b3', ground: '#ffd0a8', sun: '#fff1c1' },
  'skyline-night': { top: '#0a1a4a', horizon: '#3a4a8f', ground: '#1b2a5c', sun: '#f2b705' },
});

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sun; uniform vec3 sunDir;
varying vec3 vDir;
void main() {
  float y = vDir.y;
  // two soft bands above the horizon, a quick fade below it: a painted look, not a photo
  vec3 c = y > 0.0 ? mix(horizon, top, smoothstep(0.0, 0.55, pow(y, 0.8))) : mix(horizon, ground, smoothstep(0.0, 0.2, -y));
  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
  c = mix(c, sun, smoothstep(0.985, 0.995, s) + 0.25 * pow(s, 24.0));
  gl_FragColor = vec4(c, 1.0);
}`;

export function skyMaterial(p: SkyPreset): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new Color(p.top) }, horizon: { value: new Color(p.horizon) }, ground: { value: new Color(p.ground) },
      sun: { value: new Color(p.sun) }, sunDir: { value: [0.45, 0.8, 0.35] },
    },
  });
}

/** Swap the scene's flat sky dome for the painted one. Returns the horizon colour for the fog. */
export function paintSky(group: Object3D, id: string | undefined, fallback: SkyPreset = SKIES['harbour-day']): Color {
  const preset = (id && SKIES[id]) || fallback;
  const dome = group.getObjectByName('sky') as Mesh | undefined;
  if (dome) {
    const old = dome.material as { dispose(): void };
    dome.material = skyMaterial(preset);
    old.dispose();
  }
  return new Color(preset.horizon);
}

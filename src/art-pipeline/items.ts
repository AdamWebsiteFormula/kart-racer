// The items as the race shows them (design §8), modelled in code in the same toon style as the
// decor: what flies (Beach Ball, Homing Kite, Wind-Up Mouse), what lies on the road (the Oil Can
// and its slick; the Decoy Balloon is the pickup balloon itself), and what karts carry (Triple
// Fizz bottles, the Pogo Spring, the Grapple Anchor and its chain, the Strike Ball). Each model
// is one merged vertex-coloured geometry, built once and shared.
import {
  AdditiveBlending, BufferAttribute, CanvasTexture, Color, MeshPhysicalMaterial, RepeatWrapping, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, TubeGeometry, Curve, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { decorGeometry } from './decor.ts';
import { ModelBuilder } from './model.ts';


/** A sphere painted in `colours` gores around its axis, white caps top and bottom. */
function stripedBall(r: number, colours: readonly string[]): BufferGeometry {
  const g = new SphereGeometry(r, 32, 20);
  g.deleteAttribute('uv');
  const p = g.getAttribute('position');
  const col = new Float32Array(p.count * 3);
  const cs = colours.map((c) => new Color(c));
  const white = new Color('#fffaf0');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x) + Math.PI;
    const c = Math.abs(y) > r * 0.9 ? white : cs[Math.floor((a / (Math.PI * 2)) * cs.length) % cs.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
  return g;
}

/** A coil spring along +Y from 0 to 1 (scaled in Y to stretch it). */
class Helix extends Curve<Vector3> {
  private readonly r: number;
  private readonly turns: number;
  constructor(r: number, turns: number) { super(); this.r = r; this.turns = turns; }
  getPoint(t: number, out = new Vector3()): Vector3 {
    const a = t * this.turns * Math.PI * 2;
    return out.set(Math.cos(a) * this.r, t, Math.sin(a) * this.r);
  }
}

function coloured(g: BufferGeometry, hex: string): BufferGeometry {
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const c = new Color(hex), n = g.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new BufferAttribute(a, 3));
  return g;
}

type Build = () => BufferGeometry;

const MODELS: Readonly<Record<string, Build>> = {
  // radius 0.6, centred: red, sun, blue gores between white ones, and a little valve
  beachBall: () => {
    const valve = new ModelBuilder().cyl(0.07, 0.08, 0.06, '#fffaf0', [0, 0.6, 0], undefined, 8, false).build();
    return mergeGeometries([stripedBall(0.6, ['#ff4b3a', '#fffaf0', '#ffc93c', '#fffaf0', '#2f7de1', '#fffaf0']).toNonIndexed(), valve.toNonIndexed()], false)!;
  },
  // a diamond kite flying nose first along +Z, face up to the camera behind it, with its bow tail
  homingKite: () => {
    const m = new ModelBuilder();
    // four panels: two sky blue, two sun yellow
    m.box([0.62, 0.04, 0.62], '#3fb7f0', [0.22, 0, 0.22], [0, Math.PI / 4, 0], false);
    m.box([0.62, 0.04, 0.62], '#ffd23c', [-0.22, 0, 0.22], [0, Math.PI / 4, 0], false);
    m.box([0.62, 0.04, 0.62], '#ffd23c', [0.22, 0, -0.22], [0, Math.PI / 4, 0], false);
    m.box([0.62, 0.04, 0.62], '#3fb7f0', [-0.22, 0, -0.22], [0, Math.PI / 4, 0], false);
    m.box([0.05, 0.08, 1.24], '#8a5a2b', [0, 0.03, 0], undefined, false);      // spine
    m.box([0.9, 0.08, 0.05], '#8a5a2b', [0, 0.03, 0.1], undefined, false);     // spar
    for (let k = 0; k < 3; k++) m.box([0.22, 0.04, 0.1], '#ff3b5c', [(k % 2 ? 0.08 : -0.08), -0.02, -0.8 - k * 0.3], [0, 0.4 * (k % 2 ? 1 : -1), 0], false); // bows
    m.cyl(0.015, 0.015, 1, '#fffaf0', [0, -0.02, -1.05], [Math.PI / 2, 0, 0], 4, false); // tail string
    return m.build();
  },
  // the tipped can beside its slick (the slick itself is the glossy `oilSlick` below)
  oilCan: () => {
    const m = new ModelBuilder();
    m.cyl(0.32, 0.32, 0.62, '#1d3a8a', [0.55, 0.32, 0], [0, 0, Math.PI / 2 - 0.25], 14);
    m.torus(0.3, 0.05, '#c9d4ef', [0.84, 0.39, 0], [0, Math.PI / 2, 0.25]);   // rim
    m.cyl(0.05, 0.08, 0.5, '#1d3a8a', [0.25, 0.46, 0], [0, 0, 1.1], 8);       // spout
    m.torus(0.14, 0.035, '#1d3a8a', [0.62, 0.66, 0], [0, 0, 0.25]);           // handle
    return m.build();
  },
  // a flat black pool; the physical material gives it the rainbow sheen
  oilSlick: () => {
    const m = new ModelBuilder();
    m.cyl(1.2, 1.2, 0.03, '#0a0a12', [0, 0.02, 0], undefined, 24, false);
    m.cyl(0.55, 0.55, 0.035, '#0a0a12', [0.95, 0.02, 0.5], undefined, 14, false);
    m.cyl(0.4, 0.4, 0.035, '#0a0a12', [-0.9, 0.02, -0.6], undefined, 12, false);
    return m.build();
  },
  // the pickup balloon itself: it only works if it looks real
  decoyBalloon: () => decorGeometry('balloon')!.body,
  // a tin clockwork mouse running along +Z with a gold key on its back
  windUpMouse: () => {
    const m = new ModelBuilder();
    m.ball([0.36, 0.3, 0.52], '#b8bec9', [0, 0.36, 0]);                         // body
    m.ball([0.2, 0.2, 0.22], '#c7ccd6', [0, 0.46, 0.46]);                       // head
    m.ball([0.06, 0.06, 0.06], '#ff7aa8', [0, 0.46, 0.68], undefined, 8, false); // nose
    for (const x of [-1, 1]) {
      m.ball([0.16, 0.18, 0.04], '#c7ccd6', [x * 0.2, 0.68, 0.36], [0, 0, x * 0.3]); // ears
      m.ball([0.11, 0.13, 0.02], '#ff9fbf', [x * 0.2, 0.68, 0.385], [0, 0, x * 0.3], 8, false);
      m.eye(0.055, [x * 0.1, 0.54, 0.6]);
      m.cyl(0.09, 0.09, 0.06, '#e03a3a', [x * 0.3, 0.1, 0.25], [0, 0, Math.PI / 2], 10, false); // wheels
      m.cyl(0.09, 0.09, 0.06, '#e03a3a', [x * 0.3, 0.1, -0.25], [0, 0, Math.PI / 2], 10, false);
    }
    m.cyl(0.03, 0.03, 0.22, '#f2b705', [0, 0.72, -0.12], undefined, 6, false);  // key stem
    m.torus(0.1, 0.035, '#f2b705', [-0.1, 0.86, -0.12], [0, Math.PI / 2, 0]);   // key bows
    m.torus(0.1, 0.035, '#f2b705', [0.1, 0.86, -0.12], [0, Math.PI / 2, 0]);
    m.cyl(0.02, 0.012, 0.6, '#ff9fbf', [0, 0.3, -0.72], [Math.PI / 2 - 0.4, 0, 0], 5, false); // tail
    return m.build();
  },
  // one soda bottle (Triple Fizz orbits three), standing on y = 0
  fizzBottle: () => {
    const m = new ModelBuilder();
    m.cyl(0.14, 0.15, 0.36, '#34d6c8', [0, 0.18, 0], undefined, 12);
    m.cyl(0.06, 0.13, 0.14, '#34d6c8', [0, 0.43, 0], undefined, 12, false);
    m.cyl(0.055, 0.055, 0.1, '#34d6c8', [0, 0.55, 0], undefined, 10, false);
    m.cyl(0.07, 0.07, 0.05, '#e8352e', [0, 0.62, 0], undefined, 10, false);      // cap
    m.cyl(0.152, 0.152, 0.14, '#ff9f1c', [0, 0.2, 0], undefined, 12, false);     // label
    m.ball([0.05, 0.05, 0.02], '#fff3b0', [0, 0.2, 0.15], undefined, 6, false);  // star on the label
    return m.build();
  },
  // a chrome coil from y = 0 to 1 (stretched to the jump), a red pad on top, a yellow foot
  pogoSpring: () => {
    const coil = coloured(new TubeGeometry(new Helix(0.34, 5), 90, 0.05, 6, false), '#d9dee8');
    const m = new ModelBuilder();
    m.cyl(0.46, 0.46, 0.1, '#e8352e', [0, 1, 0], undefined, 16, false);
    m.cyl(0.42, 0.46, 0.08, '#ffc93c', [0, 0, 0], undefined, 16, false);
    return mergeGeometries([coil.toNonIndexed(), m.build().toNonIndexed()], false)!;
  },
  // the anchor that hooks a kart, crown down, ring up (the chain runs to the ring)
  grappleAnchor: () => {
    const m = new ModelBuilder();
    m.box([0.12, 0.9, 0.12], '#d9a521', [0, 0.45, 0]);                          // shank
    m.torus(0.13, 0.045, '#d9a521', [0, 0.98, 0]);                              // ring
    m.box([0.6, 0.1, 0.1], '#1d3a8a', [0, 0.72, 0]);                            // stock
    for (const x of [-1, 1]) {
      m.box([0.42, 0.11, 0.11], '#d9a521', [x * 0.2, 0.08, 0], [0, 0, x * 0.5]); // arms
      m.cone(0.12, 0.26, '#1d3a8a', [x * 0.4, 0.28, 0], [0, 0, x * -0.3], 3);   // flukes
    }
    return m.build();
  },
  // one chain link, long axis +Z (the chain lays them nose to tail)
  chainLink: () => new ModelBuilder().torus(0.12, 0.035, '#9aa3b5', [0, 0, 0], [0, Math.PI / 2, 0], false).build(),
};

const cache = new Map<string, BufferGeometry>();
/** The item model for a view kind, or null. Cached and shared: never dispose it. */
export function itemGeometry(kind: string): BufferGeometry | null {
  let g = cache.get(kind);
  if (!g) {
    const build = MODELS[kind];
    if (!build) return null;
    g = build();
    g.computeBoundingSphere();
    g.computeBoundingBox();
    cache.set(kind, g);
  }
  return g;
}
export const ITEM_MODEL_KINDS = Object.freeze(Object.keys(MODELS));

/** A marbled bowling-ball skin: magenta, violet and electric blue swirls, three finger holes. */
function marble(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 512, h = 256, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(w, h);
  const deep = new Color('#2a0f6b'), mid = new Color('#b01fd6'), hi = new Color('#2fa8ff');
  const out = new Color();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI;
      // swirl: wrapped sines stay seamless round the ball
      const s = Math.sin(u * 2 + Math.sin(v * 3 + Math.sin(u * 3) * 1.4) * 2.2 + Math.cos(v * 5) * 0.8);
      const k = (s + 1) / 2;
      out.copy(deep).lerp(mid, Math.min(1, k * 1.6)).lerp(hi, Math.max(0, k - 0.72) * 3);
      const i = (y * w + x) * 4;
      img.data[i] = out.r * 255; img.data[i + 1] = out.g * 255; img.data[i + 2] = out.b * 255; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // three finger holes near the top of the ball
  for (const [hx, hy, r] of [[0.46, 0.2, 13], [0.54, 0.2, 13], [0.5, 0.3, 16]] as const) {
    g.beginPath(); g.ellipse(hx * w, hy * h, r * 1.15, r, 0, 0, Math.PI * 2);
    g.fillStyle = '#0c0418'; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

let strike: MeshPhysicalMaterial | null = null;
/** The Strike Ball's lacquered marble (clearcoat catches the sky). Shared, never disposed. */
export function strikeBallMaterial(): MeshPhysicalMaterial {
  strike ??= new MeshPhysicalMaterial({ map: marble(), roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  strike.userData.shared = true;
  return strike;
}

/** Seconds for the soap and oil films' swirl; the game loop ticks it. */
export const BUBBLE_CLOCK = { value: 0 };

const SLICK_VERT = `
varying vec3 vW; varying vec3 vV;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SLICK_FRAG = `
uniform float time;
varying vec3 vW; varying vec3 vV;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  vec2 p = vW.xz * 1.7;
  // marbled film: wobbly rings of colour on a black pool, drifting slowly
  float n = sin(p.x * 1.3 + sin(p.y * 1.7 + time * 0.4) * 1.6) + sin(p.y * 1.1 - sin(p.x * 2.1 - time * 0.3) * 1.3);
  // thin bright bands, and only in some patches: oil is mostly black
  float bands = pow(0.5 + 0.5 * sin(n * 5.0), 3.0);
  float patchy = smoothstep(0.1, 0.9, sin(p.x * 0.55 + time * 0.2) * sin(p.y * 0.65 - time * 0.15) + 0.55);
  float graze = 1.0 - clamp(vV.y, 0.0, 1.0);
  vec3 film = hue(n * 0.35 + graze * 0.6 + time * 0.02);
  vec3 c = vec3(0.008, 0.008, 0.014) + film * bands * patchy * 0.09 * (0.6 + graze * 1.5);
  // the sky's sheen on the wet surface
  c += vec3(0.30, 0.34, 0.42) * pow(graze, 4.0) * 0.35;
  gl_FragColor = vec4(c, 1.0);
}`;

let slick: ShaderMaterial | null = null;
/** Oil: a black pool marbled with drifting rainbow film and the sky's sheen. Shared, never disposed. */
export function oilSlickMaterial(): ShaderMaterial {
  if (!slick) {
    slick = new ShaderMaterial({ vertexShader: SLICK_VERT, fragmentShader: SLICK_FRAG, uniforms: { time: BUBBLE_CLOCK } });
    slick.userData.shared = true;
  }
  return slick;
}


const SOAP_VERT = `
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SOAP_FRAG = `
uniform float time;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  // thin-film bands: the colour runs with the view angle and swirls slowly over the film
  float swirl = sin(vP.x * 2.3 + time * 0.9) * 0.18 + sin(vP.y * 3.1 - time * 0.7) * 0.14 + sin(vP.z * 2.7 + time * 0.5) * 0.12;
  vec3 film = hue(f * 1.6 + swirl + time * 0.05);
  // a soft window highlight up and to the left
  float glint = pow(max(0.0, dot(normalize(vN), normalize(vec3(-0.45, 0.75, 0.5)))), 40.0);
  vec3 c = film * (0.25 + f * 1.1) + vec3(glint * 1.6);
  gl_FragColor = vec4(c, clamp(0.06 + pow(f, 1.6) * 0.75 + glint, 0.0, 1.0));
}`;

let soap: ShaderMaterial | null = null;
/**
 * The Bubble shield: a clear soap film whose rainbow bands follow the view angle and swirl,
 * added over what is behind it, with a bright window glint. Shared, never disposed.
 */
export function bubbleMaterial(): ShaderMaterial {
  if (!soap) {
    soap = new ShaderMaterial({
      vertexShader: SOAP_VERT, fragmentShader: SOAP_FRAG, uniforms: { time: BUBBLE_CLOCK },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    });
    soap.userData.shared = true;
  }
  return soap;
}

// Boost flames (design §5; Mario Kart World's are compact, bright jets with a hot core). One mesh
// per kart holds a jet on each of its exhaust pipes, so a boosting kart is one draw call. A jet is
// a soft teardrop from the pipe mouth: white-hot at its root and through its middle, the boost's
// colour round that and on to a flickering tip, and soft at its silhouette, so it reads as fire,
// not a see-through cone. Premultiplied blending adds the glow and lets the colour hold over a
// bright sky (plain additive washed it pale). Length, width, colour and flicker are uniforms the
// game drives per frame (vfx-juice/flames.ts); a rival's fade with its kart near the lens, smoothly (no dither).
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, DoubleSide, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, Sphere, Vector2, Vector3,
} from 'three';
import type { V3 } from './model.ts';
import { EXHAUST, portDir, type Exhaust } from './racers.ts';

/** A racer's flame colour in linear RGB, pushed past 1 by `gain` so it glows. `hex`: another colour (an alt paint's flame). */
export function flameColour(racerId: string, gain = 2.6, hex?: string): [number, number, number] {
  const c = new Color(hex ?? EXHAUST[racerId]?.flame ?? '#ff8a3d');
  return [c.r * gain, c.g * gain, c.b * gain];
}

/**
 * The jet's profile: radius (share of its width) at each share of its length. Rounded at the root
 * (it starts inside the pipe), widest a fifth of the way out, then a long taper to a point.
 */
export const JET_PROFILE: readonly (readonly [number, number])[] = Object.freeze([
  [0, 0], [0.02, 0.5], [0.06, 0.8], [0.12, 0.96], [0.2, 1], [0.3, 0.95], [0.42, 0.84], [0.56, 0.67], [0.7, 0.48], [0.84, 0.27], [0.94, 0.1], [1, 0],
] as const);
const SIDES = 10;
/** the length:width the normals are shaped for (the jets run about 4 to 5 times as long as they are wide) */
const ASPECT = 4.5;

const cache = new Map<string, BufferGeometry>();

/**
 * The jets for an exhaust layout: one per pipe, from its mouth along its (splayed) direction, 1 m
 * long and 1 m wide at the uniforms' 1. Per vertex: `position` the pipe's mouth, `aAxis` its
 * direction, `aRadial` the offset across it (a share of the width), `aS` the share of the length,
 * `aPipe` which pipe (so each can flicker on its own). Cached per layout; never disposed.
 */
export function flameGeometry(e: Exhaust): BufferGeometry {
  const key = JSON.stringify([e.ports, e.dir]);
  const hit = cache.get(key);
  if (hit) return hit;
  const rings = JET_PROFILE.length, perJet = rings * (SIDES + 1);
  const n = e.ports.length * perJet;
  const pos = new Float32Array(n * 3), axis = new Float32Array(n * 3), radial = new Float32Array(n * 3), normal = new Float32Array(n * 3);
  const along = new Float32Array(n), pipe = new Float32Array(n);
  const index: number[] = [];
  const a = new Vector3(), u = new Vector3(), w = new Vector3(), r = new Vector3(), nm = new Vector3();
  const centre = new Vector3();
  e.ports.forEach((p: V3, j) => {
    const d = portDir(e, p);
    a.set(d[0], d[1], d[2]).normalize();
    // two unit vectors across the jet
    u.set(0, 1, 0);
    if (Math.abs(a.dot(u)) > 0.9) u.set(1, 0, 0);
    u.cross(a).normalize();
    w.crossVectors(a, u).normalize();
    centre.add(new Vector3(p[0], p[1], p[2]));
    for (let i = 0; i < rings; i++) {
      const [s, rad] = JET_PROFILE[i];
      // the profile's slope (radius per length), for the normal
      const [s0, r0] = JET_PROFILE[Math.max(0, i - 1)], [s1, r1] = JET_PROFILE[Math.min(rings - 1, i + 1)];
      const slope = (r1 - r0) / Math.max(1e-6, s1 - s0);
      for (let k = 0; k <= SIDES; k++) {
        const th = (k / SIDES) * Math.PI * 2;
        r.copy(u).multiplyScalar(Math.cos(th)).addScaledVector(w, Math.sin(th));
        const v = j * perJet + i * (SIDES + 1) + k;
        pos.set(p, v * 3);
        axis.set([a.x, a.y, a.z], v * 3);
        radial.set([r.x * rad, r.y * rad, r.z * rad], v * 3);
        // out across the jet, leaning back along it where the jet widens and forward where it tapers
        nm.copy(r).multiplyScalar(ASPECT).addScaledVector(a, -slope).normalize();
        normal.set([nm.x, nm.y, nm.z], v * 3);
        along[v] = s;
        pipe[v] = j;
      }
    }
    for (let i = 0; i < rings - 1; i++) {
      for (let k = 0; k < SIDES; k++) {
        const v0 = j * perJet + i * (SIDES + 1) + k, v1 = v0 + SIDES + 1;
        index.push(v0, v1, v0 + 1, v0 + 1, v1, v1 + 1);
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aAxis', new BufferAttribute(axis, 3));
  g.setAttribute('aRadial', new BufferAttribute(radial, 3));
  g.setAttribute('normal', new BufferAttribute(normal, 3));
  g.setAttribute('aS', new BufferAttribute(along, 1));
  g.setAttribute('aPipe', new BufferAttribute(pipe, 1));
  g.setIndex(index);
  // the attribute `position` holds only the mouths: bound the jets at their longest by hand
  g.boundingSphere = new Sphere(centre.multiplyScalar(1 / Math.max(1, e.ports.length)), 2.6);
  g.userData.shared = true;
  cache.set(key, g);
  return g;
}

const FLAME_VERT = `
attribute vec3 aAxis; attribute vec3 aRadial; attribute float aS; attribute float aPipe;
uniform vec2 uLen; uniform vec2 uWid; uniform float uTime; uniform float uWave;
varying float vS; varying vec3 vNormal; varying vec3 vView;
void main() {
  float len = aPipe < 0.5 ? uLen.x : uLen.y;
  float wid = aPipe < 0.5 ? uWid.x : uWid.y;
  // a ripple running down the jet, growing toward the tip (none under reduced motion: uWave 0)
  float ripple = 1.0 + uWave * aS * 0.24 * sin(aS * 11.0 - uTime * 43.0 + aPipe * 2.1);
  vec3 p = position + aAxis * (aS * len) + aRadial * (wid * ripple);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vS = aS;
  vNormal = normalize(normalMatrix * normal);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FLAME_FRAG = `
uniform vec3 uColor; uniform vec3 uHot; uniform float uTime; uniform float uWave; uniform float uFade; uniform float uGain; uniform float uSeed; uniform float uKart;
varying float vS; varying vec3 vNormal; varying vec3 vView;
void main() {
  float dist = length(vView);
  // 1 looking through the jet's middle, 0 at its silhouette: soft edges read as a flame's volume
  float facing = abs(dot(normalize(vNormal), vView / max(dist, 1e-4)));
  float soft = smoothstep(0.0, 0.65, facing);
  float body = smoothstep(0.0, 0.07, vS) * (1.0 - smoothstep(0.42, 1.0, vS));
  // bands of heat running down the jet (steady under reduced motion)
  float heat = 1.0 - uWave * 0.22 * (0.5 + 0.5 * sin(vS * 19.0 - uTime * 57.0 + uSeed));
  // the white-hot core: near the mouth and through the middle
  float core = (1.0 - smoothstep(0.04, 0.4, vS)) * smoothstep(0.62, 0.98, facing);
  // a rival's flames fade with its kart (its ghost's opacity), and are gone right against the lens
  float a = soft * body * heat * uKart;
  if (uFade > 0.0) a *= smoothstep(0.6, 1.6, dist);
  if (a <= 0.003) discard;
  gl_FragColor = vec4(mix(uColor, uHot, core) * (uGain * a), a * 0.62);
}`;

/** The uniforms of one kart's flames: the game writes these each frame. */
export interface FlameUniforms {
  /** each pipe's jet length and width, metres (x: pipe 0, y: pipe 1) */
  uLen: { value: Vector2 }; uWid: { value: Vector2 };
  uTime: { value: number };
  /** 1 flickers, 0 holds still (reduced motion) */
  uWave: { value: number };
  /** the boost's colour and the hot core's (linear, above 1 blooms) */
  uColor: { value: Color }; uHot: { value: Color };
  /** 0 never fades (your own kart); above 0 (a rival's) the flames go right against the lens */
  uFade: { value: number };
  /** the kart's own opacity (a rival's ghost near the lens, game/kartFade.ts; 1 otherwise) */
  uKart: { value: number };
  uGain: { value: number };
  uSeed: { value: number };
}

/** A kart's own flame material (its colour and flicker are its own); freed with the race. */
export function flameMaterial(): ShaderMaterial & { uniforms: FlameUniforms } {
  const uniforms: FlameUniforms = {
    uLen: { value: new Vector2(0.5, 0.5) }, uWid: { value: new Vector2(0.12, 0.12) }, uTime: { value: 0 }, uWave: { value: 1 },
    uColor: { value: new Color(1.6, 0.6, 0.15) }, uHot: { value: new Color(2.2, 1.8, 1.1) }, uFade: { value: 0 }, uGain: { value: 1 }, uSeed: { value: 0 }, uKart: { value: 1 },
  };
  return new ShaderMaterial({
    vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, uniforms: uniforms as unknown as ShaderMaterial['uniforms'],
    transparent: true, depthWrite: false, side: DoubleSide, fog: false,
    blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
  }) as ShaderMaterial & { uniforms: FlameUniforms };
}

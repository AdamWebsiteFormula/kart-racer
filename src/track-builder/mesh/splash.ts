// Rain splashes (Adam, 26 Sept 2026: "the rain, when it falls, it does not splash when it hits the
// ground"). Meadow Run's Final Lap Shift storm (shiftStage.ts) has falling streaks; where the drops land
// on the road and the grass nothing happened. Mario Kart World's rain, watched twice (art-pipeline SOP,
// 26 Sept 2026): small white splashes popping on the surface near the camera, dozens at a time, each
// gone in a fraction of a second, with a small ring that spreads and fades, and fine spray behind the
// tires on the wet road. Here: one instanced mesh (one draw) of short-lived splashes, each a little
// crown standing on the surface (turned to the camera about the vertical: spikes shooting up and out,
// each throwing a droplet off its tip) over a flat ring spreading round it, posed and animated in the
// shaders from each one's place and birth time. The CPU only lands a few new ones a frame on the
// surface as drawn, ahead of and round the kart the camera follows (`surface`: the road's own banked
// deck, else the land beside it), into a ring buffer: no garbage per frame, the ring (a few kilobytes)
// uploaded. Reduced motion: about a third as many, calmer and slower, no spikes or flying droplets.
import {
  BufferAttribute, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NormalBlending, ShaderMaterial, Color,
} from 'three';
import type { Vec3 } from '../types.ts';

/**
 * How the splashes fall: `rate` new ones a second in full rain (reduced motion keeps `reducedShare` of
 * them); each lives `life` s (`reducedLife` with reduced motion: slower, calmer rings); `size` its crown's
 * half width in metres; where they land, in the frame of the kart the camera follows: `along` metres
 * ahead (the camera rides about 5.5 m behind), more near than far (`nearBias`), across a half width
 * that opens from `halfNear` with `spread` per metre ahead (the chase camera's own view); `capacity`
 * slots in the ring buffer (rate × life with room to spare).
 */
export const SPLASH = Object.freeze({
  rate: 600, reducedShare: 0.35, life: 0.3, reducedLife: 0.55, size: 0.16,
  along: [-4.5, 21] as const, nearBias: 1.35, halfNear: 3.2, spread: 0.95,
  capacity: 320, maxPerFrame: 40,
  colour: [0.8, 0.86, 0.95] as const, alpha: 0.75,
});

export interface SplashUniforms { uTime: { value: number }; uFlash: { value: number }; uReduced: { value: number } }

const SPLASH_VERT = `
uniform float uTime;
uniform float uLife;
uniform float uSize;
uniform float uReduced;
attribute vec2 aCorner;
attribute float aPart;
attribute vec4 aSplash;
attribute float aSeed;
varying vec2 vUv;
varying float vAge;
varying float vPart;
varying float vSeed;
varying float vFade;
void main() {
  float age = (uTime - aSplash.w) / uLife;
  vUv = aCorner; vPart = aPart; vSeed = aSeed; vAge = age;
  vFade = 0.0;
  // not born yet, or gone: nothing drawn
  if (age < 0.0 || age >= 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float size = uSize * (0.75 + 0.5 * fract(aSeed * 13.7));
  vec3 base = aSplash.xyz;
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.0;
  float l = length(toCam);
  vec3 face = l > 1e-4 ? toCam / l : vec3(0.0, 0.0, 1.0);
  vec3 world;
  if (aPart < 0.5) {
    // the crown: standing on the surface, turned to the camera about the vertical, a hair toward it so
    // it never sinks into the road
    vec3 side = vec3(face.z, 0.0, -face.x);
    world = base + side * aCorner.x * size * 1.4 + vec3(0.0, aCorner.y * size * 1.6, 0.0) + face * 0.04;
  } else {
    // the ring, flat on the surface
    world = base + vec3(aCorner.x * size * 2.4, 0.025, aCorner.y * size * 2.4);
  }
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  // none against the lens
  vFade = smoothstep(0.8, 2.2, -mv.z);
}`;

const SPLASH_FRAG = `
uniform vec3 uColour;
uniform float uAlpha;
uniform float uFlash;
uniform float uReduced;
varying vec2 vUv;
varying float vAge;
varying float vPart;
varying float vSeed;
varying float vFade;
// distance from p to the segment a-b, and how far along it (0 at a, 1 at b) the nearest point is
float lkSeg(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a, ba = b - a;
  h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float k = vAge, a = 0.0;
  if (vPart < 0.5) {
    // in units of the splash's size, the same across and up (the quad is 2.8 wide, 1.6 tall)
    vec2 p = vec2(vUv.x * 1.4, vUv.y * 1.6);
    // a low sheet thrown up round the drop
    float sheet = 1.0 - smoothstep(0.0, 1.0, length(vec2(p.x * 0.9, p.y * 2.4)) / (0.25 + 0.4 * sqrt(k)));
    a = sheet * smoothstep(0.0, 0.06, k) * (1.0 - smoothstep(0.2, 0.6, k)) * 0.8;
    if (uReduced < 0.5) {
      // the crown: five spikes fanned up and out from the sheet, shooting up and falling back from their
      // roots, each throwing a droplet off its tip that flies on and falls
      float grow = smoothstep(0.0, 0.28, k), fall = smoothstep(0.3, 0.72, k);
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float r = fract(sin(vSeed * 91.7 + fi * 17.3) * 43758.5453);
        float ang = (fi - 2.0) * 0.42 + (r - 0.5) * 0.3;
        vec2 dir = vec2(sin(ang), cos(ang)), root = vec2((fi - 2.0) * 0.12, 0.0);
        vec2 tip = root + dir * (0.6 + 0.45 * r) * grow;
        float h, d = lkSeg(p, root + (tip - root) * fall, tip, h);
        float w = mix(0.075, 0.03, h) * (1.0 - 0.4 * fall);
        a = max(a, (1.0 - smoothstep(w * 0.5, w, d)) * (1.0 - fall));
        float kk = max(k - 0.28, 0.0);
        vec2 drop = tip + dir * kk * (1.2 + 0.6 * r) + vec2(0.0, -3.4 * kk * kk);
        a = max(a, (1.0 - smoothstep(0.035, 0.065, length(p - drop))) * step(0.28, k) * (1.0 - smoothstep(0.7, 1.0, k)));
      }
    }
  } else {
    // the ring: spreads from the drop and fades
    float r = length(vUv), rr = 0.15 + 0.8 * k, w = 0.09 * (1.0 - 0.4 * k) + 0.02;
    a = (1.0 - smoothstep(0.0, w, abs(r - rr))) * (1.0 - k) * 0.7;
  }
  a *= vFade * uAlpha * (1.0 + uFlash);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColour * (1.0 + uFlash * 1.5), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** The one draw: `capacity` splash slots over two quads each (the crown and the ring). */
export function splashMesh(u: SplashUniforms, capacity: number = SPLASH.capacity): { mesh: Mesh; spots: InstancedBufferAttribute; seeds: InstancedBufferAttribute } {
  const g = new InstancedBufferGeometry();
  // crown (v 0 on the surface, 1 at its top), then ring
  const corner = new Float32Array([-1, 0, 1, 0, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1]);
  const part = new Float32Array([0, 0, 0, 0, 1, 1, 1, 1]);
  g.setAttribute('position', new BufferAttribute(new Float32Array(8 * 3), 3)); // three wants one; the shader places everything
  g.setAttribute('aCorner', new BufferAttribute(corner, 2));
  g.setAttribute('aPart', new BufferAttribute(part, 1));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  // every slot starts long dead (born at -1e6)
  const spot = new Float32Array(capacity * 4);
  for (let i = 0; i < capacity; i++) spot[i * 4 + 3] = -1e6;
  const spots = new InstancedBufferAttribute(spot, 4);
  spots.setUsage(DynamicDrawUsage);
  const seeds = new InstancedBufferAttribute(new Float32Array(capacity), 1);
  seeds.setUsage(DynamicDrawUsage);
  g.setAttribute('aSplash', spots);
  g.setAttribute('aSeed', seeds);
  g.instanceCount = capacity;
  const m = new ShaderMaterial({
    vertexShader: SPLASH_VERT, fragmentShader: SPLASH_FRAG, transparent: true, depthWrite: false, blending: NormalBlending,
    uniforms: {
      uTime: u.uTime, uFlash: u.uFlash, uReduced: u.uReduced, uLife: { value: SPLASH.life }, uSize: { value: SPLASH.size },
      uColour: { value: new Color(...SPLASH.colour) }, uAlpha: { value: SPLASH.alpha },
    },
  });
  const mesh = new Mesh(g, m);
  mesh.name = 'shift-splashes';
  mesh.frustumCulled = false;
  mesh.renderOrder = 3; // with the rain, over the clouds
  mesh.userData.ownMaterial = true;
  mesh.userData.ownGeometry = true;
  return { mesh, spots, seeds };
}

/**
 * Lands the splashes. `surface(p)` reads (x, z) from p[0], p[1], puts the height of the surface as drawn
 * there in p[2] and says whether there is one (none: nothing lands there; numbers go through `p`, never as
 * arguments or a return, so a frame boxes none);
 * `update` each frame of the show: the race clock (the rain's own), the kart the camera follows and its
 * heading, how hard it rains (0..1) and reduced motion. Allocation-free.
 */
export class SplashField {
  readonly mesh: Mesh;
  readonly u: SplashUniforms;
  private readonly spots: InstancedBufferAttribute;
  private readonly seeds: InstancedBufferAttribute;
  private readonly capacity: number;
  private next = 0;
  private owed = 0;
  private last = -1;
  private seed = 0x2b7e151;
  /** splashes landed so far (for checks) */
  landed = 0;

  private readonly surface: (p: Float64Array) => boolean;
  private readonly at = new Float64Array(3);

  constructor(u: SplashUniforms, surface: (p: Float64Array) => boolean, capacity: number = SPLASH.capacity) {
    this.u = u;
    this.surface = surface;
    const s = splashMesh(u, capacity);
    this.mesh = s.mesh; this.spots = s.spots; this.seeds = s.seeds; this.capacity = capacity;
  }

  update(clock: number, focus: Vec3 | null, heading: number, density: number, reduced: boolean): void {
    this.u.uTime.value = clock;
    this.u.uReduced.value = reduced ? 1 : 0;
    (this.mesh.material as ShaderMaterial).uniforms.uLife.value = reduced ? SPLASH.reducedLife : SPLASH.life;
    const dt = clock - this.last;
    this.last = clock;
    // nothing owed across a pause, a jump in the clock or a dry spell
    if (!focus || density <= 0 || !(dt > 0 && dt < 0.25)) { this.owed = 0; return; }
    this.owed += SPLASH.rate * density * (reduced ? SPLASH.reducedShare : 1) * dt;
    let n = Math.min(SPLASH.maxPerFrame, Math.floor(this.owed));
    this.owed -= Math.floor(this.owed);
    const sh = Math.sin(heading), ch = Math.cos(heading), a0 = SPLASH.along[0], a1 = SPLASH.along[1];
    const spots = this.spots.array as Float32Array, seeds = this.seeds.array as Float32Array, fx = focus[0], fz = focus[2];
    // (the generator's state and every number stay in locals here: a frame makes no garbage)
    let st = this.seed | 0, next = this.next, wrote = 0;
    while (n-- > 0) {
      // ahead of the kart and to its sides, as far as the chase camera sees, more near than far
      st = (Math.imul(st, 1664525) + 1013904223) | 0;
      const along = a0 + (a1 - a0) * Math.pow((st >>> 0) / 4294967296, SPLASH.nearBias);
      st = (Math.imul(st, 1664525) + 1013904223) | 0;
      const lat = (((st >>> 0) / 4294967296) * 2 - 1) * (SPLASH.halfNear + (along - a0) * SPLASH.spread);
      // forward (sin h, 0, cos h), right (cos h, 0, -sin h)
      const x = fx + sh * along + ch * lat, z = fz + ch * along - sh * lat;
      const at = this.at;
      at[0] = x; at[1] = z;
      if (!this.surface(at)) continue;
      const y = at[2];
      spots[next * 4] = x; spots[next * 4 + 1] = y; spots[next * 4 + 2] = z;
      // born spread over this frame, so a frame's batch does not pop as one
      st = (Math.imul(st, 1664525) + 1013904223) | 0;
      spots[next * 4 + 3] = clock - dt * ((st >>> 0) / 4294967296);
      st = (Math.imul(st, 1664525) + 1013904223) | 0;
      seeds[next] = (st >>> 0) / 4294967296;
      next = next + 1 === this.capacity ? 0 : next + 1;
      wrote++;
    }
    this.seed = st;
    this.next = next;
    if (!wrote) return;
    this.landed += wrote;
    // the whole ring goes up (a few kilobytes): a list of update ranges would be new objects every frame
    this.spots.needsUpdate = true;
    this.seeds.needsUpdate = true;
  }

  /** The slots alive at `clock` (for checks). */
  alive(clock: number): number {
    const life = this.u.uReduced.value > 0.5 ? SPLASH.reducedLife : SPLASH.life, spots = this.spots.array as Float32Array;
    let n = 0;
    for (let i = 0; i < this.capacity; i++) { const age = clock - spots[i * 4 + 3]; if (age >= 0 && age < life) n++; }
    return n;
  }

  /** Slot i's landing spot and birth (for checks). */
  spot(i: number): [number, number, number, number] {
    const s = this.spots.array as Float32Array;
    return [s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3]];
  }
}

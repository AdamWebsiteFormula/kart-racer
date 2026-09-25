// The mesh a kart burns and sparks with: one per kart on its chassis, one draw call, drawn only while
// it boosts or drifts (flames.ts drives its uniforms). Mario Kart World's boost fire (studied frame by
// frame, 25 Sept 2026) is a compact jet with a glowing blue-white ring at the nozzle and crisp,
// flat-banded tongues round it; its ignition is an electric flash, a shock ring and a billow of cartoon
// fire; its drift sparks are star-bursts pinned to the rear tires. So one mesh holds, for each pipe:
//   - the jet: a tube leaving along the pipe and swept back by the air toward its point, shaded as a
//     volume: each pixel's heat is how near its view ray passes the jet's axis, and how near the
//     nozzle, so it reads as fire from the side and end-on alike (the chase camera looks nearly down
//     back-pointing pipes) and from any pipe, up, back or out; scrolling noise eats its skin into
//     licking tongues, and the heat is cut into flat color bands (edge, body, inner, core), crisp,
//     not a soft see-through cone;
//   - the nozzle flare (a small white heart in a saturated blue ring) and the ignition's flash (jagged
//     bolts out of a white heart); a soft glow round the jet; the ignition's three fire billows;
// and for the whole kart the ignition's shock hoop, a star at each rear tire's contact patch (the drift
// sparks' anchored part: a small white heart, bent crackling rays and a halo in the tier's color, a thin
// light streak, and at a tier-up a shell with a swinging crescent), and white wind arcs round a boosting
// kart. Premultiplied blending lets one material both cover (the flame's bands hold their color over a
// bright sky) and add light (the flares, glows, halos and streaks glow at night); the bloom catches
// everything past 1.
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, FrontSide, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, Sphere, Vector2, Vector3,
} from 'three';
import { portDir, type Exhaust } from '../art-pipeline/index.ts';

export const JET = Object.freeze({
  /** the heat where each color band starts: under `edge` nothing draws (the flame's skin) */
  bands: Object.freeze({ edge: 0.17, body: 0.3, inner: 0.48, core: 0.78 }),
  /** a jet's root is rounded over this share of its length, then it tapers to a point as (1 - x)^`taper` */
  root: 0.16, taper: 1.9,
  /** tube sides round a jet */
  sides: 14,
  /** shares of its length the tube's rings sit at (dense at the rounded root and the point) */
  rings: Object.freeze([0, 0.02, 0.05, 0.09, 0.14, 0.2, 0.27, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74, 0.81, 0.87, 0.92, 0.96, 0.985, 1]),
  /** the ignition's fire puffs a pipe */
  puffs: 3,
  /** the noise across a jet's skin (more: more, thinner tongues) */
  tongues: 1.1,
  /** the nozzle flare's half size (times the jet's radius) steady, and how much the ignition's flash adds */
  flare: 0.72, flash: 0.5,
  /** the ignition flash's jagged bolts a pipe (re-dealt every frame; held under reduced motion) */
  bolts: 6,
  /** the soft light round a burning jet: its half size (times the jet's length, plus its radius) and brightness (added light) */
  glowSize: 0.62, glow: 0.3,
  /** an ignition billow's half size (times the jet's radius) */
  puff: 1.2,
  /** a wheel star's quad is this many times as wide as it is tall (room for its light streak) */
  starAspect: 2.2,
  /** rays a star, and how many times a second they crackle into a new pattern (held under reduced motion) */
  starRays: 7, starHz: 24,
  /** a tier-up's shell spreads this far past the star (times its size) */
  starGrow: 0.9,
  /**
   * The wind round a boosting kart (Mario Kart World's mushroom wraps the kart in white air): thin
   * arcs from its nose round its sides to its tail, each with a streak of light running back along
   * it. Each is a curve in the kart's frame (KART_FIT: 2.1 m long, 1.7 wide) from `nose` through
   * `side` to `tail` (x for the right side, mirrored), drawn `arcWidth` m wide, facing the lens.
   */
  arcs: Object.freeze([
    Object.freeze({ nose: [0.3, 0.5, 1.2], side: [1.02, 0.55, 0.15], tail: [0.82, 0.62, -1.25] }),
    Object.freeze({ nose: [0.18, 1.05, 1.0], side: [0.9, 1.15, 0.0], tail: [0.62, 1.25, -1.2] }),
  ] as const),
  arcSegments: 16, arcWidth: 0.05,
  /** a streak runs the length of an arc this many times a second */
  arcRate: 1.7,
});

/** The mesh's parts (aInfo.z): the shader draws each its own way. */
export const PART = Object.freeze({ jet: 0, flare: 1, ring: 2, puff: 3, star: 4, wind: 5, glow: 6 } as const);

/** A point on a wind arc at `u` (0 nose .. 1 tail): a quadratic Bézier through the arc's side point. */
export function arcPoint(a: (typeof JET.arcs)[number], u: number, out: Vector3): Vector3 {
  // the control point that puts the curve through `side` at u = 0.5
  const c = (i: number) => 2 * a.side[i] - 0.5 * (a.nose[i] + a.tail[i]);
  const k0 = (1 - u) * (1 - u), k1 = 2 * u * (1 - u), k2 = u * u;
  return out.set(k0 * a.nose[0] + k1 * c(0) + k2 * a.tail[0], k0 * a.nose[1] + k1 * c(1) + k2 * a.tail[1], k0 * a.nose[2] + k1 * c(2) + k2 * a.tail[2]);
}

/** A jet's radius (share of its width) at `s`, the share of its length: rounded at the root, widest at JET.root, then a taper to a point. */
export function jetProfile(s: number): number {
  const x = Math.min(1, Math.max(0, s));
  return x < JET.root ? Math.sqrt(x / JET.root) : 1 - Math.pow((x - JET.root) / (1 - JET.root), JET.taper);
}

const cache = new Map<string, BufferGeometry>();

/**
 * The mesh for an exhaust layout (cached per layout, never freed): per vertex `position` is the
 * anchor (a pipe's mouth; the pipes' middle for the ring; the chassis origin for the stars, which the
 * shader places at the wheels), `aAxis` the pipe's direction, `aSide` a jet's unit radial direction or
 * a lens-facing quad's corner, `aInfo` (share of the length or which puff or which wheel side, which
 * pipe or arc, which part, the profile radius). Drawn in this order: glows, puffs, jets, flares, ring,
 * stars, wind arcs.
 */
export function jetGeometry(e: Exhaust): BufferGeometry {
  const key = JSON.stringify([e.ports, e.dir, e.splay ?? null]);
  const hit = cache.get(key);
  if (hit) return hit;
  const pos: number[] = [], axis: number[] = [], side: number[] = [], info: number[] = [], index: number[] = [];
  const a = new Vector3(), u = new Vector3(), w = new Vector3(), r = new Vector3(), center = new Vector3(), mean = new Vector3();
  const dirs = e.ports.map((p) => portDir(e, p));
  for (let j = 0; j < e.ports.length; j++) { center.add(new Vector3(...e.ports[j])); mean.add(new Vector3(...dirs[j])); }
  center.multiplyScalar(1 / Math.max(1, e.ports.length));
  mean.normalize();
  const vert = (p: readonly number[], d: readonly number[], sx: number, sy: number, sz: number, s: number, pipe: number, kind: number, rad: number): number => {
    pos.push(p[0], p[1], p[2]); axis.push(d[0], d[1], d[2]); side.push(sx, sy, sz); info.push(s, pipe, kind, rad);
    return pos.length / 3 - 1;
  };
  // a lens-facing quad: corners (-1,-1), (1,-1), (-1,1), (1,1), wound as the view plane is (x right, y up): front-facing
  const quad = (p: readonly number[], d: readonly number[], s: number, pipe: number, kind: number): void => {
    const v = vert(p, d, -1, -1, 0, s, pipe, kind, 0);
    vert(p, d, 1, -1, 0, s, pipe, kind, 0); vert(p, d, -1, 1, 0, s, pipe, kind, 0); vert(p, d, 1, 1, 0, s, pipe, kind, 0);
    index.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
  };
  e.ports.forEach((p, j) => quad(p, dirs[j], 0, j, PART.glow));
  e.ports.forEach((p, j) => { for (let i = 0; i < JET.puffs; i++) quad(p, dirs[j], i, j, PART.puff); });
  e.ports.forEach((p, j) => {
    const d = dirs[j];
    a.set(d[0], d[1], d[2]).normalize();
    // two unit vectors across the jet: (u, w, a) right-handed
    u.set(0, 1, 0);
    if (Math.abs(a.dot(u)) > 0.9) u.set(1, 0, 0);
    u.cross(a).normalize();
    w.crossVectors(a, u).normalize();
    const n = JET.sides, first = pos.length / 3;
    for (const s of JET.rings) {
      const rad = jetProfile(s);
      for (let k = 0; k <= n; k++) {
        const th = (k / n) * Math.PI * 2;
        r.copy(u).multiplyScalar(Math.cos(th)).addScaledVector(w, Math.sin(th));
        vert(p, d, r.x, r.y, r.z, s, j, PART.jet, rad);
      }
    }
    // outward-facing: round the ring, then along the jet (around × along points out); drawn FrontSide
    for (let i = 0; i < JET.rings.length - 1; i++) {
      for (let k = 0; k < n; k++) {
        const v0 = first + i * (n + 1) + k, v1 = v0 + n + 1;
        index.push(v0, v0 + 1, v1, v0 + 1, v1 + 1, v1);
      }
    }
  });
  e.ports.forEach((p, j) => quad(p, dirs[j], 0, j, PART.flare));
  quad([center.x, center.y, center.z], [mean.x, mean.y, mean.z], 0, 0, PART.ring);
  for (const s of [-1, 1]) quad([0, 0, 0], [0, 0, -1], s, 0, PART.star);
  // the wind arcs, each side: a ribbon along the curve, its two edges (aSide.x -1, 1) spread across it
  // on screen by the shader; wound (edge -1, next -1, edge +1) so it faces the lens whichever way it runs
  let arc = 0;
  for (const a of JET.arcs) {
    for (const side of [-1, 1]) {
      const first = pos.length / 3, n = JET.arcSegments;
      for (let i = 0; i <= n; i++) {
        const u0 = i / n;
        arcPoint(a, u0, r).x *= side;
        arcPoint(a, Math.min(1, u0 + 0.01), w).x *= side;
        arcPoint(a, Math.max(0, u0 - 0.01), u).x *= side;
        w.sub(u).normalize();
        for (const across of [-1, 1]) vert([r.x, r.y, r.z], [w.x, w.y, w.z], across, 0, 0, u0, arc, PART.wind, 0);
      }
      for (let i = 0; i < n; i++) {
        const v = first + i * 2;
        index.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
      arc++;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aAxis', new BufferAttribute(new Float32Array(axis), 3));
  g.setAttribute('aSide', new BufferAttribute(new Float32Array(side), 3));
  g.setAttribute('aInfo', new BufferAttribute(new Float32Array(info), 4));
  g.setIndex(index);
  // `position` holds only anchors: bound the jets at their longest, the ring and the wheel stars by hand
  g.boundingSphere = new Sphere(new Vector3(0, center.y * 0.5, center.z * 0.6), 3);
  g.userData.shared = true;
  cache.set(key, g);
  return g;
}

const B = JET.bands;
const f3 = (x: number): string => x.toFixed(3);

const JET_VERT = `
attribute vec3 aAxis; attribute vec3 aSide; attribute vec4 aInfo;
uniform vec2 uLen; uniform vec2 uWid; uniform float uTime; uniform float uWave; uniform float uOn;
uniform float uPop; uniform float uFlash; uniform float uRing; uniform vec3 uWind; uniform float uBend;
uniform float uStar; uniform float uStarFlash; uniform vec3 uWheel; uniform float uArc;
varying vec3 vView; varying vec2 vUv; varying vec3 vNoise; varying vec3 vA; varying vec3 vM; varying vec3 vB;
varying float vS; varying float vWid; varying float vKind; varying float vSeed;
/** v turned by the rotation that takes unit a onto unit b */
vec3 jetTurn(vec3 v, vec3 a, vec3 b) {
  vec3 k = cross(a, b);
  float sn = length(k), cs = dot(a, b);
  if (sn < 1e-5) return v;
  k /= sn;
  return v * cs + cross(k, v) * sn + k * dot(k, v) * (1.0 - cs);
}
void main() {
  float s = aInfo.x, pipe = aInfo.y, kind = aInfo.z;
  float len = pipe < 0.5 ? uLen.x : uLen.y;
  float wid = pipe < 0.5 ? uWid.x : uWid.y;
  vKind = kind; vS = s; vWid = wid; vSeed = pipe * 17.31 + s * 3.7; vUv = aSide.xy;
  vNoise = vec3(0.0); vA = vec3(0.0); vM = vec3(0.0); vB = vec3(0.0);
  bool off = false;
  vec4 mv;
  // the jet leaves along its pipe and the air sweeps its point toward the kart's wake: a curve from the
  // mouth (a quadratic Bezier, its control on the pipe's line), so a stack pointing up still burns up
  // out of its mouth before it bends back
  vec3 tipDir = normalize(aAxis + (uWind - aAxis) * uBend);
  vec3 c1 = aAxis * (len * 0.5), c2 = tipDir * len;
  if (kind < 0.5) {
    vec3 b = 2.0 * s * (1.0 - s) * c1 + s * s * c2;
    vec3 tang = normalize(2.0 * (1.0 - s) * c1 + 2.0 * s * (c2 - c1) + aAxis * 1e-4);
    // its cross-section turned from the pipe's line to the curve's, its point swaying
    vec3 across = cross(tang, vec3(0.0, 1.0, 0.0));
    float sway = uWave * s * s * 0.05 * sin(uTime * 17.0 + pipe * 2.3);
    vec3 p = position + b + jetTurn(aSide, aAxis, tang) * (wid * aInfo.w) + across * sway;
    mv = modelViewMatrix * vec4(p, 1.0);
    // the curve as two straight pieces for the heat: mouth, middle, point
    vA = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vM = (modelViewMatrix * vec4(position + 0.5 * c1 + 0.25 * c2, 1.0)).xyz;
    vB = (modelViewMatrix * vec4(position + c2, 1.0)).xyz;
    // the noise rides the skin and runs out along the jet: tongues licking away from the nozzle
    vNoise = aSide * ${f3(JET.tongues)} + aAxis * (s * 2.4 - uTime * 5.5 * uWave);
    off = uOn < 0.5;
  } else if (kind < 1.5) {
    // the nozzle flare, just out of the pipe; the ignition's flash swells it
    mv = modelViewMatrix * vec4(position + aAxis * (0.03 + 0.08 * uFlash), 1.0);
    mv.xy += aSide.xy * wid * (${f3(JET.flare)} + 0.25 * uPop + ${f3(JET.flash)} * uFlash);
    off = uOn < 0.5;
  } else if (kind < 2.5) {
    // the ignition's shock ring: a hoop across the exhaust's line as the air bends it (a circle from
    // behind, an ellipse from the side; behind the kart at speed even from upright stacks), riding back
    // a little as it spreads and breaks up; mirrored to face the lens either way
    vec3 hu = normalize(cross(tipDir, abs(tipDir.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
    vec3 hw = cross(tipDir, hu);
    vec3 hc = position + tipDir * (0.15 + 0.45 * max(uRing, 0.0));
    vec4 cv = modelViewMatrix * vec4(hc, 1.0);
    float face = dot((modelViewMatrix * vec4(tipDir, 0.0)).xyz, -cv.xyz) >= 0.0 ? 1.0 : -1.0;
    float rad = mix(0.3, 1.5, max(uRing, 0.0)) * 1.2;
    mv = modelViewMatrix * vec4(hc + (hu * (aSide.x * face) + hw * aSide.y) * rad, 1.0);
    vUv = aSide.xy * 1.2;
    off = uOn < 0.5 || uRing < 0.0;
  } else if (kind < 3.5) {
    // the ignition's billows along the jet: they swell as the pop fades and burn away
    float grow = 1.0 - uPop, at = min(1.0, (0.12 + 0.3 * s) * (0.8 + 0.5 * grow));
    vec3 c = position + 2.0 * at * (1.0 - at) * c1 + at * at * c2 + vec3(0.0, 0.08 * s * grow, 0.0);
    mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += aSide.xy * wid * (${f3(JET.puff)} + 0.25 * s) * (0.8 + 0.7 * grow);
    off = uOn < 0.5 || uPop <= 0.002;
  } else if (kind < 4.5) {
    // a wheel star at the rear tire's contact patch on side s, a little toward the lens so the road does not cut it
    mv = modelViewMatrix * vec4(s * uWheel.x, uWheel.y, uWheel.z, 1.0);
    mv.xyz += normalize(-mv.xyz) * 0.3;
    float size = uStar * (1.0 + ${f3(JET.starGrow)} * uStarFlash);
    mv.xy += aSide.xy * vec2(${f3(JET.starAspect)}, 1.0) * size;
    vUv = aSide.xy * vec2(${f3(JET.starAspect)}, 1.0);
    off = uStar <= 0.0;
  } else if (kind < 5.5) {
    // a wind arc: a thin ribbon along its curve, spread across it on screen (the curve turned a
    // quarter to the left, so the ribbon keeps its winding whichever way it runs)
    mv = modelViewMatrix * vec4(position, 1.0);
    vec2 t2 = (modelViewMatrix * vec4(aAxis, 0.0)).xy;
    t2 = length(t2) > 1e-5 ? normalize(t2) : vec2(1.0, 0.0);
    mv.xy += vec2(-t2.y, t2.x) * (aSide.x * ${f3(JET.arcWidth)});
    vUv = vec2(aSide.x, s);
    vSeed = pipe; // which arc: each runs its streak out of step
    off = uArc <= 0.0;
  } else {
    // the soft light round a burning jet, on its curve a little under half way out
    mv = modelViewMatrix * vec4(position + 0.495 * c1 + 0.2025 * c2, 1.0);
    mv.xy += aSide.xy * (len * ${f3(JET.glowSize)} + wid);
    off = uOn < 0.5;
  }
  vView = -mv.xyz;
  gl_Position = off ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * mv;
}`;

const JET_FRAG = `
uniform vec3 uMouth; uniform vec3 uFringe; uniform vec3 uCore; uniform vec3 uInner; uniform vec3 uBody; uniform vec3 uEdge;
uniform float uGain; uniform float uTime; uniform float uWave; uniform float uPop; uniform float uFlash; uniform float uRing;
uniform vec3 uStarCol; uniform vec3 uStarHot; uniform float uStarGain; uniform float uStarRays; uniform float uStarFlash;
uniform float uFade; uniform float uKart; uniform float uSeed; uniform float uArc;
varying vec3 vView; varying vec2 vUv; varying vec3 vNoise; varying vec3 vA; varying vec3 vM; varying vec3 vB;
varying float vS; varying float vWid; varying float vKind; varying float vSeed;
float jetHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float jetHash1(float x) { return fract(sin(x * 91.3458) * 47453.5453); }
float jetNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(jetHash(i), jetHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(jetHash(i + vec3(0.0, 1.0, 0.0)), jetHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(jetHash(i + vec3(0.0, 0.0, 1.0)), jetHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(jetHash(i + vec3(0.0, 1.0, 1.0)), jetHash(i + vec3(1.0)), f.x), f.y), f.z);
}
float jetFbm(vec3 p) { return 0.64 * jetNoise(p) + 0.36 * jetNoise(p * 2.13 + vec3(5.2, 1.3, 7.7)); }
float jetProfile(float s) { return s < ${f3(JET.root)} ? sqrt(max(s, 0.0) / ${f3(JET.root)}) : 1.0 - pow(clamp((s - ${f3(JET.root)}) / ${f3(1 - JET.root)}, 0.0, 1.0), ${f3(JET.taper)}); }
/**
 * The heat a view ray d (from the lens) picks up passing the piece of the jet from a to b, which runs
 * s0..s1 of its length: the point on the piece the ray passes closest, how close (against the jet's
 * radius there) and how near the nozzle that point is. A ray looking straight down the piece finds its
 * start, the hotter end. sig gets the share of the length that point is at; a miss is cold.
 */
float jetHeat(vec3 a, vec3 b, float s0, float s1, vec3 d, float wid, out float sig) {
  vec3 ax = b - a;
  float aa = dot(ax, ax), bd = dot(ax, d), den = aa - bd * bd;
  float t = den > 1e-7 ? (bd * dot(d, a) - dot(ax, a)) / den : 0.0;
  t = clamp(t, 0.0, 1.0) * smoothstep(0.0, 0.03 * aa, den);
  vec3 q = a + ax * t;
  sig = mix(s0, s1, t);
  float x = length(q - d * dot(d, q)) / max(wid * jetProfile(sig), 1e-3);
  return (1.0 - pow(min(x, 1.0), 1.4)) * (1.0 - 0.7 * sig) + 0.14 * (1.0 - smoothstep(0.0, 0.2, sig)) - step(1.0, x);
}
/** heat → the flame's flat bands, each edge anti-aliased over w */
vec3 jetBands(float h, float w) {
  vec3 c = mix(uEdge, uBody, smoothstep(${f3(B.body)} - w, ${f3(B.body)} + w, h));
  c = mix(c, uInner, smoothstep(${f3(B.inner)} - w, ${f3(B.inner)} + w, h));
  return mix(c, uCore, smoothstep(${f3(B.core)} - w, ${f3(B.core)} + w, h));
}
void main() {
  float dist = length(vView);
  // a rival's flames fade with its kart (its ghost's opacity), and are gone right against the lens
  float fade = uKart * (uFade > 0.0 ? smoothstep(0.6, 1.6, dist) : 1.0);
  vec3 col = vec3(0.0);
  float cover = 0.0; // how much of what is behind it the pixel hides (0: pure added light)
  if (vKind < 0.5) {
    // the heat along this pixel's view ray, the hotter of the jet's two pieces (it curves)
    vec3 d = -vView / max(dist, 1e-4);
    float s1, s2;
    float h1 = jetHeat(vA, vM, 0.0, 0.5, d, vWid, s1), h2 = jetHeat(vM, vB, 0.5, 1.0, d, vWid, s2);
    float h = max(h1, h2), sig = h1 >= h2 ? s1 : s2;
    // the skin burns away into tongues, more toward the point
    h += (jetFbm(vNoise + vec3(uSeed, vSeed, 0.0)) - 0.5) * (0.3 + 0.75 * vS);
    float w = max(fwidth(h) * 0.75, 0.008);
    float a = smoothstep(${f3(B.edge)} - w, ${f3(B.edge)} + w, h);
    if (a <= 0.003) discard;
    col = jetBands(h, w);
    // Mario Kart World's nozzle: a blue-white ring and a violet fringe before the flame's own color
    float nozzle = 1.0 - smoothstep(0.04, 0.3, sig);
    col = mix(col, uFringe, nozzle * smoothstep(${f3(B.body)} - w, ${f3(B.body)} + w, h) * (1.0 - smoothstep(${f3(B.core)} - w, ${f3(B.core)} + w, h)) * 0.8);
    col = mix(col, uMouth, nozzle * smoothstep(${f3(B.core)} - w, ${f3(B.core)} + w, h) * 0.85);
    col *= uGain * a;
    // the bands cover (the color holds over a bright sky); the white-hot middle half adds light
    cover = a * mix(0.95, 0.55, smoothstep(${f3(B.core)} - w, ${f3(B.core)} + w, h));
  } else if (vKind < 1.5) {
    // the nozzle flare: a small white heart inside a saturated blue ring at the pipe's mouth, a faint
    // violet glow round it (a whole bright disc read as a reversing light from the chase camera)
    float r = length(vUv);
    float heart = 1.0 - smoothstep(0.06, 0.28, r);
    float rimLine = smoothstep(0.26, 0.4, r) * (1.0 - smoothstep(0.46, 0.64, r));
    float halo = pow(max(0.0, 1.0 - r), 2.5);
    col = (vec3(1.9, 2.0, 2.2) * heart * 0.5 + uMouth * rimLine * 0.7 + uFringe * halo * 0.2) * (0.8 + 0.4 * uPop);
    if (uFlash > 0.0) {
      // the ignition's flash: electricity, not a ball: a small white heart and jagged cyan bolts
      // shooting out of it, a new set every frame (held under reduced motion)
      float ang = atan(vUv.y, vUv.x), tick = mod(floor(uTime * 60.0), 997.0) * uWave;
      float bolts = 0.0;
      for (int i = 0; i < ${JET.bolts}; i++) {
        float fi = float(i);
        float a0 = (fi + jetHash1(tick * 5.17 + fi * 3.1 + vSeed)) * ${f3((Math.PI * 2) / JET.bolts)};
        // each bolt zigzags as it runs out, and stops short or long
        float zig = (jetNoise(vec3(r * 7.0, fi * 5.3, tick * 0.37 + vSeed)) - 0.5) * 1.1;
        float dang = abs(mod(ang - a0 - zig + 3.14159, 6.28318) - 3.14159) * r;
        float reach = mix(0.55, 1.0, jetHash1(tick * 1.7 + fi * 7.7 + vSeed));
        bolts = max(bolts, (1.0 - smoothstep(0.018, 0.045, dang)) * (1.0 - smoothstep(reach * 0.75, reach, r)) * step(0.1, r));
      }
      float heart = 1.0 - smoothstep(0.05, 0.3, r);
      col += (vec3(2.4, 2.5, 2.7) * heart + mix(vec3(1.9, 2.3, 2.6), vec3(0.35, 1.5, 2.6), smoothstep(0.2, 0.9, r)) * bolts) * uFlash;
    }
  } else if (vKind < 2.5) {
    // the shock ring: a bright leading edge with a soft trail inside it, thinner and broken as it spreads
    float r = length(vUv);
    float thick = mix(0.3, 0.08, uRing);
    float band = smoothstep(1.0 - thick, 1.0 - thick * 0.15, r) * (1.0 - smoothstep(1.0, 1.0 + thick * 0.12, r));
    band *= mix(0.35, 1.0, smoothstep(1.0 - thick * 0.45, 1.0 - thick * 0.1, r));
    if (band <= 0.0) discard; // most of its quad: before any noise
    float ang = atan(vUv.y, vUv.x);
    float n = jetNoise(vec3(cos(ang) * 2.6, sin(ang) * 2.6, uRing * 3.0 + uSeed));
    band *= smoothstep(0.3, 0.6, n + 0.4 * (1.0 - uRing));
    float a = band * (1.0 - uRing) * (1.0 - uRing);
    if (a <= 0.003) discard;
    col = mix(uInner, uCore, band) * a * 0.9;
  } else if (vKind < 3.5) {
    // an ignition billow: a ball of the same banded fire, eaten away as the pop dies
    float r = length(vUv);
    if (r >= 1.0) discard; // its quad's corners: before any noise
    // fire, not smoke: its heat stays in the flame's own bands (a hot heart only at the very first)
    float h = (1.0 - r) * 0.8 + (jetFbm(vec3(vUv * 1.7, uTime * 2.2 * uWave) + vec3(uSeed + vSeed)) - 0.5) * 0.9 - (1.0 - uPop) * 0.85;
    float w = max(fwidth(h) * 0.75, 0.008);
    float a = smoothstep(${f3(B.edge)} - w, ${f3(B.edge)} + w, h);
    if (a <= 0.003) discard;
    col = jetBands(h, w) * a;
    cover = a * 0.9;
  } else if (vKind < 4.5) {
    // a wheel star: white-hot core, sharp tapering rays in the tier's color (a new pattern starHz times
    // a second; held under reduced motion), a halo, a thin horizontal light streak; a tier-up adds a shell
    // spreading round the tire and a bigger glow
    // the quad grows for a tier-up's shell; the star itself keeps its size
    float rq = length(vUv);
    vec2 uv = vUv * (1.0 + ${f3(JET.starGrow)} * uStarFlash);
    float r = length(uv);
    // outside the star, its shell and its streak's thin line: nothing (most of its wide quad)
    if (rq > 1.0 && r > 1.0 && abs(uv.y) > 0.15) discard;
    float tick = mod(floor(uTime * ${f3(JET.starHz)}), 997.0) * uWave;
    float ang = atan(uv.y, uv.x);
    float rays = 0.0;
    for (int i = 0; i < ${JET.starRays}; i++) {
      float fi = float(i);
      float ra = (fi + jetHash1(tick * 7.13 + fi * 1.37 + vSeed)) * ${f3((Math.PI * 2) / JET.starRays)};
      // some rays long, some stubs (five to seven show), each bent a little: crackling filaments, not a glint
      float rl = mix(0.12, 1.0, jetHash1(tick * 3.71 + fi * 2.9 + vSeed + 11.0));
      float bend = (jetHash1(tick * 2.31 + fi * 4.07 + vSeed + 5.0) - 0.5) * 2.2;
      float across = abs(mod(ang - ra - bend * r + 3.14159, 6.28318) - 3.14159) * r;
      float hw = 0.07 * max(0.0, 1.0 - r / rl) + 0.004;
      rays = max(rays, (1.0 - smoothstep(hw * 0.45, hw, across)) * (1.0 - smoothstep(rl * 0.55, rl, r)));
    }
    rays *= uStarRays;
    // a small white-hot heart (a fifth of the star), the rays and the halo in the tier's own color
    float core = exp(-r * r * 110.0);
    float halo = exp(-r * r * 4.0) * (0.55 - 0.3 * uStarFlash);
    float streak = exp(-abs(uv.y) * 45.0) * pow(max(0.0, 1.0 - abs(uv.x) / ${f3(JET.starAspect)}), 3.0) * uStarRays;
    // the tier-up's shell: a bright rim spreading out round the tire over a faint fill, brightest in a
    // crescent that swings half way round it as it goes
    float shellR = mix(0.98, 0.3, uStarFlash);
    float swing = 0.2 + 0.8 * pow(0.5 + 0.5 * cos(atan(vUv.y, vUv.x) - (1.0 - uStarFlash) * 3.14159 - vSeed), 4.0);
    float shell = uStarFlash * ((1.0 - smoothstep(0.0, 0.03 + 0.09 * swing, abs(rq - shellR))) * swing * 1.4 + 0.12 * (1.0 - smoothstep(shellR - 0.06, shellR, rq)));
    vec3 streakCol = mix(vec3(1.5, 1.5, 1.7), vec3(0.7, 0.42, 1.7), clamp(abs(uv.x) / ${f3(JET.starAspect)} * 1.6, 0.0, 1.0));
    col = (uStarHot * core * 1.3 + uStarCol * (rays * 1.1 + halo + shell * 1.2) + streakCol * streak * 0.45) * uStarGain;
    cover = clamp(core + rays * 0.85 + shell * 0.5, 0.0, 1.0) * 0.8;
    if (max(col.r, max(col.g, col.b)) < 0.004) discard;
  } else if (vKind < 5.5) {
    // a wind arc: a streak of white air running back along it (a sharp head, a fading tail), soft across
    float head = fract(uTime * ${f3(JET.arcRate)} + vSeed * 0.29) * 1.6;
    float d = head - vUv.y;
    float streak = step(0.0, d) * (1.0 - smoothstep(0.0, 0.5, d)) * smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
    float a = streak * (1.0 - vUv.x * vUv.x) * uArc;
    if (a <= 0.003) discard;
    col = vec3(1.35, 1.4, 1.5) * a;
    cover = a * 0.35;
  } else {
    // the light round a burning jet: a soft warm glow, added (it lights what is behind it, never hides it)
    float r = length(vUv);
    if (r >= 1.0) discard;
    float g = (1.0 - r) * (1.0 - r);
    col = mix(uBody, uInner, 0.5) * (g * ${f3(JET.glow)} * uGain);
  }
  gl_FragColor = vec4(col * fade, cover * fade);
}`;

/** The uniforms of one kart's mesh: flames.ts writes these each frame. */
export interface JetUniforms {
  /** each pipe's jet length and width (radius), meters (x: pipe 0, y: pipe 1 and on) */
  uLen: { value: Vector2 }; uWid: { value: Vector2 };
  uTime: { value: number };
  /** 1 flickers and licks, 0 holds still (reduced motion) */
  uWave: { value: number };
  /** 1 while the kart boosts: the jets, flares, puffs and ring burn */
  uOn: { value: number };
  /** the ignition: its swell (1 at the fire, 0 when over), its white flash, its shock ring's progress (below 0: none) */
  uPop: { value: number }; uFlash: { value: number }; uRing: { value: number };
  /** where the air blows the jets (chassis space, unit) and how far their points bend into it (0..1) */
  uWind: { value: Vector3 }; uBend: { value: number };
  /** the flame's bands (linear, above 1 blooms): the nozzle's ring, its violet fringe, then core, inner, body and edge */
  uMouth: { value: Color }; uFringe: { value: Color }; uCore: { value: Color }; uInner: { value: Color }; uBody: { value: Color }; uEdge: { value: Color };
  uGain: { value: number };
  /** the wheel stars: half height (m; 0 none), how much of their rays show (0: a charging glow), a tier-up's flash (1 → 0), brightness, colors */
  uStar: { value: number }; uStarRays: { value: number }; uStarFlash: { value: number }; uStarGain: { value: number };
  uStarCol: { value: Color }; uStarHot: { value: Color };
  /** a rear tire's contact patch in chassis space: (half track to its outer half, height, along) */
  uWheel: { value: Vector3 };
  /** the wind arcs round a boosting kart: how strongly they show (0: not at all) */
  uArc: { value: number };
  /** 0 never fades (your own kart); above 0 (a rival's) the flames go right against the lens */
  uFade: { value: number };
  /** the kart's own opacity (a rival's ghost near the lens, game/kartFade.ts; 1 otherwise) */
  uKart: { value: number };
  uSeed: { value: number };
}

/** A kart's own material (its colors, timing and wheels are its own); freed with the race. */
export function jetMaterial(): ShaderMaterial & { uniforms: JetUniforms } {
  const uniforms: JetUniforms = {
    uLen: { value: new Vector2(0.6, 0.6) }, uWid: { value: new Vector2(0.15, 0.15) }, uTime: { value: 0 }, uWave: { value: 1 }, uOn: { value: 0 },
    uPop: { value: 0 }, uFlash: { value: 0 }, uRing: { value: -1 }, uWind: { value: new Vector3(0, 0, -1) }, uBend: { value: 0 },
    uMouth: { value: new Color(1.5, 2.1, 3) }, uFringe: { value: new Color(1.2, 0.45, 2.2) }, uCore: { value: new Color(3, 2.7, 2.2) },
    uInner: { value: new Color(2.6, 1.7, 0.3) }, uBody: { value: new Color(2.1, 0.55, 0.05) }, uEdge: { value: new Color(1.2, 0.16, 0.02) }, uGain: { value: 1 },
    uStar: { value: 0 }, uStarRays: { value: 1 }, uStarFlash: { value: 0 }, uStarGain: { value: 1 },
    uStarCol: { value: new Color(0.3, 0.9, 2.2) }, uStarHot: { value: new Color(2.2, 2.4, 2.6) }, uWheel: { value: new Vector3(0.6, 0.12, -0.7) }, uArc: { value: 0 },
    uFade: { value: 0 }, uKart: { value: 1 }, uSeed: { value: 0 },
  };
  return new ShaderMaterial({
    vertexShader: JET_VERT, fragmentShader: JET_FRAG, uniforms: uniforms as unknown as ShaderMaterial['uniforms'],
    transparent: true, depthWrite: false, side: FrontSide, fog: false,
    blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
  }) as ShaderMaterial & { uniforms: JetUniforms };
}

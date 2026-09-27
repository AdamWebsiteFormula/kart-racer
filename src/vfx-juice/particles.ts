// One particle pool: camera-facing soft dots in a single InstancedMesh, integrated on the CPU.
// Live particles are packed at the front of the buffers every frame, so `count` is exact and
// the GPU draws only what is alive. Additive, no depth writes: sparks, flames, dust, confetti.
// A streak pool draws each particle as a crisp capsule stretched along its motion (drift sparks,
// flame flakes): a white-hot core line inside a saturated color, brightest at its head, with
// premultiplied blending so the color partly covers what is behind it and holds over a bright road
// (added light alone washed an orange spark to pale yellow by day).
import {
  AdditiveBlending, CustomBlending, InstancedBufferAttribute, InstancedMesh, NormalBlending, OneFactor, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial,
} from 'three';

export const PARTICLE = Object.freeze({
  /** every particle fades out between these view depths (metres): nothing near the lens fills the screen */
  nearFade: [1.2, 3.5] as const,
  /**
   * the widest a particle draws, in metres per metre of view depth (a cap on its size on screen); `shape` is a
   * star's or an impact burst's (SHAPE), in any pool: a contact's burst reads at the chase camera's 5 to 7 m
   */
  maxSize: { glow: 0.12, soft: 0.3, confetti: 0.04, spark: 0.04, shape: 0.3 },
  /** the longest a streak draws, in metres per metre of view depth (a spark at 3 m is at most 0.6 m long) */
  maxStreak: 0.2,
  /** a confetti piece is a paper strip this tall for its width */
  strip: 0.5,
  /** confetti turns at this many rad/s either way, and flips over (its width through zero) at this many */
  spin: [1.5, 6] as const, flutter: [5, 13] as const,
});

/** How much of what is behind it a streak's middle hides (premultiplied: the rest of it is added light). */
export const STREAK_COVER = 0.55;

/**
 * What a particle is drawn as, beyond its pool's own disc, puff or paper strip (SpawnOpts.shape; the
 * contact effects, contact.ts): a cartoon star (five points, a darker rim, a pale heart) or an impact
 * burst (uneven spikes round a white-hot heart, a new set of spikes per particle). Both turn by
 * SpawnOpts.spin and never flip like confetti.
 */
export const SHAPE = Object.freeze({ none: 0, star: 1, burst: 2 });
/** A star's inner corners as a share of its points' reach; an impact burst's spike count and its shortest spike. */
export const STAR_INNER = 0.46, BURST_SPIKES = 9, BURST_SHORT = 0.52;

/**
 * The cartoon star's edge: signed distance (quad half-widths, + outside) of `p` (the quad's middle at 0, its
 * edges at ±1) from a five-pointed star with a point straight up. The angle is folded into half of one point
 * (0 to 36°), where the edge is the straight line from the tip to the inner corner. Mirrors the shader's own.
 */
export function starEdge(px: number, py: number, inner = STAR_INNER): number {
  const seg = (2 * Math.PI) / 5;
  let an = Math.atan2(px, py);
  an = ((an + seg / 2) % seg + seg) % seg - seg / 2;
  an = Math.abs(an);
  const r = Math.hypot(px, py), fx = r * Math.sin(an), fy = r * Math.cos(an);
  const [nx, ny] = starNormal(inner);
  return fx * nx + (fy - 1) * ny;
}

/** The outward normal of a star's edge in its folded half point (from the tip, (0, 1), to the inner corner). */
function starNormal(inner: number): [number, number] {
  const half = Math.PI / 5, ex = inner * Math.sin(half), ey = inner * Math.cos(half) - 1, el = Math.hypot(ex, ey);
  return [-ey / el, ex / el];
}
const STAR_N = starNormal(STAR_INNER);

/** How much of a particle shows at `depth` metres from the lens (the shader's near fade). */
export function nearFade(depth: number): number {
  const [a, b] = PARTICLE.nearFade;
  const t = Math.min(1, Math.max(0, (depth - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The size a particle of `size` metres draws at `depth` metres, capped at `maxSize` per metre of depth. */
export function drawnSize(size: number, depth: number, maxSize: number): number {
  return Math.min(size, depth * maxSize);
}

/** The length a streak of `length` metres draws at `depth` metres, capped at PARTICLE.maxStreak per metre of depth. */
export function drawnStreak(length: number, depth: number): number {
  return Math.min(length, depth * PARTICLE.maxStreak);
}

const VERT = `
attribute vec3 aOffset; attribute vec4 aColor; attribute float aSize; attribute vec3 aSpin; attribute float aShape;
uniform float uTime; uniform float uMaxSize; uniform float uStrip; uniform float uMaxShape;
varying vec4 vColor; varying vec2 vUv; varying float vKind; varying float vSeed;
#ifdef STREAKS
attribute vec3 aStreak; uniform float uMaxStreak; varying vec3 vShape;
#endif
void main() {
  vUv = uv;
  vKind = aShape; vSeed = aSpin.x;
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  float depth = -mv.z;
  // never bigger on screen than uMaxSize per metre of depth (a star or a burst: uMaxShape), and gone near the lens
  float shaped = step(0.5, aShape);
  float w = min(aSize, depth * mix(uMaxSize, uMaxShape, shaped));
#ifdef STREAKS
  // a capsule from where the spark was a moment ago (its motion against its kart, aStreak) to where
  // it is: head at the particle, the quad padded half a width round each end
  vec2 s2 = (modelViewMatrix * vec4(aStreak, 0.0)).xy;
  float sl = length(s2);
  float len = min(sl, depth * uMaxStreak);
  vec2 axis = sl > 1e-5 ? s2 / sl : vec2(0.0, 1.0);
  float along = mix(-len - 0.5 * w, 0.5 * w, position.y + 0.5);
  // across is the axis turned clockwise: (across, axis) keeps the quad's winding, so it is not culled as a back face
  mv.xy += vec2(axis.y, -axis.x) * (position.x * w) + axis * along;
  float hw = max(0.5 * w, 1e-5);
  // in half-widths: across, along from the capsule's middle, half the core segment's length
  vShape = vec3(position.x * 2.0, (along + 0.5 * len) / hw, 0.5 * len / hw);
  float shade = 1.0;
#else
  // aSpin: phase, turn rate, flip rate. A confetti strip turns and flips over like paper (its
  // width through zero); a round particle has no spin and draws as it always did; a star or a
  // burst (aShape) turns but never flips, and is square
  float a = aSpin.x + uTime * aSpin.y;
  float flip = shaped > 0.5 ? 1.0 : cos(aSpin.x * 3.0 + uTime * aSpin.z);
  vec2 p = vec2(position.x * flip, position.y * mix(uStrip, 1.0, shaped));
  p = vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
  mv.xy += p * w;
  float shade = uStrip < 1.0 && shaped < 0.5 ? 0.62 + 0.38 * abs(flip) : 1.0; // the paper catches the light as it flips
#endif
  vColor = vec4(aColor.rgb * shade, aColor.a * smoothstep(${PARTICLE.nearFade[0].toFixed(2)}, ${PARTICLE.nearFade[1].toFixed(2)}, depth));
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec4 vColor; varying vec2 vUv; varying float vKind; varying float vSeed;
uniform float uSquare; uniform float uPuff;
#ifdef STREAKS
varying vec3 vShape;
#endif
void main() {
#ifdef STREAKS
  // 0 on the streak's axis, 1 at its rim; the head end bright, the tail dimmer
  float d = length(vec2(vShape.x, max(abs(vShape.y) - vShape.z, 0.0)));
  float head = clamp((vShape.y + vShape.z + 1.0) / (2.0 * vShape.z + 2.0), 0.0, 1.0);
  float core = 1.0 - smoothstep(0.0, 0.45, d);
  float a = (1.0 - smoothstep(0.3, 1.0, d)) * mix(0.35, 1.0, head) * vColor.a;
  if (a <= 0.004) discard;
  // a white-hot core line inside the saturated color: crisp, and the tier color stays on the rim;
  // premultiplied, it covers a little of what is behind it (the color holds over a bright road)
  float top = max(vColor.r, max(vColor.g, vColor.b));
  vec3 c = mix(vColor.rgb * 1.05, vec3(top) * 1.2, core * core * 0.4);
  gl_FragColor = vec4(c * a, a * ${STREAK_COVER.toFixed(2)});
#else
  vec3 rgb = vColor.rgb;
  float a;
  if (vKind > 1.5) {
    // an impact burst: uneven spikes (a new set per particle, from its phase) round a white-hot heart, the tips toward orange
    vec2 q = (vUv - 0.5) * 2.0;
    float r = length(q);
    float s = (atan(q.y, q.x) / 6.2831853 + 0.5) * ${BURST_SPIKES.toFixed(1)};
    float f = fract(s) - 0.5;
    float len = ${BURST_SHORT.toFixed(2)} + ${(1 - BURST_SHORT).toFixed(2)} * fract(sin((floor(s) + vSeed * 7.13) * 78.233) * 43758.5453);
    float edge = mix(0.3, len * 0.97, pow(1.0 - abs(f) * 2.0, 2.2));
    a = 1.0 - smoothstep(edge - 0.05, edge, r);
    float top = max(rgb.r, max(rgb.g, rgb.b));
    rgb = mix(rgb * mix(vec3(1.0), vec3(1.0, 0.55, 0.3), smoothstep(0.3, 0.9, r)), vec3(1.1, 1.05, 0.85) * top, 1.0 - smoothstep(0.06, 0.3, r));
  } else if (vKind > 0.5) {
    // a cartoon star: five points (the angle folded into half of one, where the edge is one straight line),
    // a darker orange rim and a pale heart
    vec2 q = (vUv - 0.5) * 2.0 / 0.94;
    float r = length(q);
    float an = abs(mod(atan(q.x, q.y) + 0.6283185, 1.2566371) - 0.6283185);
    float d = dot(r * vec2(sin(an), cos(an)) - vec2(0.0, 1.0), vec2(${STAR_N[0].toFixed(5)}, ${STAR_N[1].toFixed(5)}));
    a = 1.0 - smoothstep(-0.03, 0.03, d);
    float top = max(rgb.r, max(rgb.g, rgb.b));
    rgb = mix(rgb, vec3(1.0, 1.0, 0.8) * top, (1.0 - smoothstep(0.0, 0.34, r)) * 0.35);
    rgb = mix(rgb, vColor.rgb * vec3(0.95, 0.48, 0.16), smoothstep(-0.2, -0.12, d));
  } else {
    float d = length(vUv - 0.5);
    // a spark is a disc with a soft rim; dust and smoke (uPuff) a puff with no hard edge
    a = uSquare > 0.5 ? 1.0 : 1.0 - smoothstep(mix(0.25, 0.05, uPuff), 0.5, d);
  }
  a *= vColor.a;
  if (a <= 0.004) discard;
  gl_FragColor = vec4(rgb, a);
#endif
}`;

export interface SpawnOpts {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; g: number; b: number;
  size: number; life: number;
  gravity?: number; drag?: number; grow?: number;
  /** a velocity the particle rides with, untouched by drag and gravity (a spark carried along by its kart); default none */
  cx?: number; cy?: number; cz?: number;
  /** streak pools: seconds of its motion against its kart (its own velocity) a spark is drawn stretched over; 0 draws it round */
  stretch?: number;
  /** 0..1: the most opaque it draws (the pipes' faint puffs); default 1 */
  alpha?: number;
  /** SHAPE: a cartoon star or an impact burst instead of the pool's own disc, puff or strip; default none */
  shape?: number;
  /** a star's or a burst's turn (rad/s) and where it starts (rad; a burst's spikes are dealt from it too) */
  spin?: number;
  phase?: number;
}

export class ParticlePool {
  readonly mesh: InstancedMesh;
  readonly capacity: number;
  /** whether each particle draws as a streak along its motion */
  readonly streaks: boolean;
  count = 0;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  /** the carrier velocity each particle rides with (no drag, no gravity) */
  private readonly car: Float32Array;
  private readonly col: Float32Array;
  private readonly rgb: Float32Array;
  private readonly size: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  private readonly grow: Float32Array;
  private readonly spin: Float32Array;
  private readonly stretch: Float32Array;
  private readonly streak: Float32Array;
  /** each particle's most opaque (SpawnOpts.alpha) */
  private readonly opa: Float32Array;
  /** each particle's SHAPE */
  private readonly shape: Float32Array;
  private readonly spins: boolean;
  private time = 0;
  private seed = 0x9e3779b9;
  private readonly mat: ShaderMaterial;
  private readonly aOffset: InstancedBufferAttribute;
  private readonly aColor: InstancedBufferAttribute;
  private readonly aSize: InstancedBufferAttribute;
  private readonly aSpin: InstancedBufferAttribute;
  private readonly aShape: InstancedBufferAttribute;
  private readonly aStreak: InstancedBufferAttribute | null = null;

  /**
   * `square`: confetti, paper strips that turn and flip as they fall. `maxSize`: the size cap in
   * metres per metre of view depth (PARTICLE.maxSize). `streaks`: each particle is drawn stretched
   * along its own velocity (additive pools only: drift sparks and boost embers).
   */
  constructor(
    capacity = 2048, additive = true, square = false,
    maxSize = square ? PARTICLE.maxSize.confetti : additive ? PARTICLE.maxSize.glow : PARTICLE.maxSize.soft,
    streaks = false,
  ) {
    this.capacity = capacity;
    this.streaks = streaks;
    const n = capacity;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.car = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4); this.rgb = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.baseSize = new Float32Array(n);
    this.life = new Float32Array(n); this.maxLife = new Float32Array(n);
    this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.grow = new Float32Array(n);
    this.spin = new Float32Array(n * 3);
    this.stretch = new Float32Array(streaks ? n : 0);
    this.streak = new Float32Array(streaks ? n * 3 : 0);
    this.opa = new Float32Array(n);
    this.shape = new Float32Array(n);
    this.spins = square;
    const geo = new PlaneGeometry(1, 1);
    this.aOffset = new InstancedBufferAttribute(this.pos, 3);
    this.aColor = new InstancedBufferAttribute(this.col, 4);
    this.aSize = new InstancedBufferAttribute(this.size, 1);
    this.aSpin = new InstancedBufferAttribute(this.spin, 3);
    this.aShape = new InstancedBufferAttribute(this.shape, 1);
    geo.setAttribute('aOffset', this.aOffset);
    geo.setAttribute('aSpin', this.aSpin);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aShape', this.aShape);
    if (streaks) {
      this.aStreak = new InstancedBufferAttribute(this.streak, 3);
      geo.setAttribute('aStreak', this.aStreak);
    }
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      // streaks write premultiplied color (part cover, part added light)
      blending: streaks ? CustomBlending : additive ? AdditiveBlending : NormalBlending,
      blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      defines: streaks ? { STREAKS: 1 } : {},
      uniforms: {
        uSquare: { value: square ? 1 : 0 }, uPuff: { value: additive || square ? 0 : 1 }, uTime: { value: 0 },
        uMaxSize: { value: maxSize }, uStrip: { value: square ? PARTICLE.strip : 1 }, uMaxStreak: { value: PARTICLE.maxStreak },
        uMaxShape: { value: Math.max(maxSize, PARTICLE.maxSize.shape) },
      },
    });
    this.mesh = new InstancedMesh(geo, this.mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
  }

  /** Add one particle. When full, the oldest (slot 0 after packing) is overwritten. */
  spawn(o: SpawnOpts): void {
    let i = this.count;
    if (i >= this.capacity) i = this.oldest();
    else this.count++;
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = o.vx; this.vel[i * 3 + 1] = o.vy; this.vel[i * 3 + 2] = o.vz;
    this.car[i * 3] = o.cx ?? 0; this.car[i * 3 + 1] = o.cy ?? 0; this.car[i * 3 + 2] = o.cz ?? 0;
    this.rgb[i * 3] = o.r; this.rgb[i * 3 + 1] = o.g; this.rgb[i * 3 + 2] = o.b;
    this.baseSize[i] = o.size; this.size[i] = o.size;
    this.life[i] = o.life; this.maxLife[i] = o.life;
    this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 0; this.grow[i] = o.grow ?? 0;
    this.opa[i] = o.alpha ?? 1;
    if (this.streaks) this.stretch[i] = o.stretch ?? 0;
    this.shapeOf(i, o);
  }

  /** A particle's shape and turn: a star or a burst turns as told; a confetti strip its own way; anything else none. */
  private shapeOf(i: number, o: SpawnOpts): void {
    const shape = o.shape ?? 0;
    this.shape[i] = shape;
    if (shape > 0) {
      this.spin[i * 3] = o.phase ?? 0; this.spin[i * 3 + 1] = o.spin ?? 0; this.spin[i * 3 + 2] = 0;
      this.shaped = true;
    } else if (this.spins) {
      const [s0, s1] = PARTICLE.spin, [f0, f1] = PARTICLE.flutter;
      this.spin[i * 3] = this.rnd() * Math.PI * 2;
      this.spin[i * 3 + 1] = (s0 + this.rnd() * (s1 - s0)) * (this.rnd() < 0.5 ? -1 : 1);
      this.spin[i * 3 + 2] = f0 + this.rnd() * (f1 - f0);
    } else { this.spin[i * 3] = 0; this.spin[i * 3 + 1] = 0; this.spin[i * 3 + 2] = 0; }
  }

  /** whether a star or a burst has been drawn since the pool was made: their turn and shape then go up every frame */
  private shaped = false;

  /**
   * Draw one particle for this frame only, as it stands (no motion; gone at the next update): what must sit
   * exactly where something is each frame, as a dizzy star circling a racer's head does. Call after update().
   * `o.life` is unused; `o.alpha` is its opacity. When full, the oldest is overwritten.
   */
  place(o: SpawnOpts): void {
    let i = this.count;
    if (i >= this.capacity) i = this.oldest();
    else this.count++;
    const j = i * 3;
    this.pos[j] = o.x; this.pos[j + 1] = o.y; this.pos[j + 2] = o.z;
    this.vel[j] = 0; this.vel[j + 1] = 0; this.vel[j + 2] = 0;
    this.car[j] = 0; this.car[j + 1] = 0; this.car[j + 2] = 0;
    this.rgb[j] = o.r; this.rgb[j + 1] = o.g; this.rgb[j + 2] = o.b;
    this.col[i * 4] = o.r; this.col[i * 4 + 1] = o.g; this.col[i * 4 + 2] = o.b; this.col[i * 4 + 3] = o.alpha ?? 1;
    this.baseSize[i] = o.size; this.size[i] = o.size;
    // no life left: the next update drops it
    this.life[i] = 0; this.maxLife[i] = 1;
    this.grav[i] = 0; this.drag[i] = 0; this.grow[i] = 0; this.opa[i] = o.alpha ?? 1;
    if (this.streaks) { this.stretch[i] = 0; this.streak[j] = 0; this.streak[j + 1] = 0; this.streak[j + 2] = 0; }
    this.shapeOf(i, o);
    this.mesh.count = this.count;
    this.aOffset.needsUpdate = this.aColor.needsUpdate = this.aSize.needsUpdate = this.aSpin.needsUpdate = this.aShape.needsUpdate = true;
    if (this.aStreak) this.aStreak.needsUpdate = true;
  }

  /** Visual-only randomness for the spins (never touches the sim). */
  private rnd(): number { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 0xffffffff; }

  private oldest(): number {
    let k = 0, best = Infinity;
    for (let i = 0; i < this.count; i++) if (this.life[i] < best) { best = this.life[i]; k = i; }
    return k;
  }

  /** Integrate, fade, and pack the live ones to the front. */
  update(dt: number): void {
    this.time += dt;
    this.mat.uniforms.uTime.value = this.time;
    let w = 0;
    for (let i = 0; i < this.count; i++) {
      const life = this.life[i] - dt;
      if (life <= 0) continue;
      if (w !== i) this.move(i, w);
      this.life[w] = life;
      const k = Math.max(0, 1 - this.drag[w] * dt), j = w * 3;
      this.vel[j] *= k; this.vel[j + 1] = this.vel[j + 1] * k - this.grav[w] * dt; this.vel[j + 2] *= k;
      this.pos[j] += (this.vel[j] + this.car[j]) * dt;
      this.pos[j + 1] += (this.vel[j + 1] + this.car[j + 1]) * dt;
      this.pos[j + 2] += (this.vel[j + 2] + this.car[j + 2]) * dt;
      if (this.streaks) {
        // the streak is the particle's own motion (not its carrier's): a spark keeping pace with its
        // kart draws short, one flung off it draws long
        const st = this.stretch[w];
        this.streak[j] = this.vel[j] * st; this.streak[j + 1] = this.vel[j + 1] * st; this.streak[j + 2] = this.vel[j + 2] * st;
      }
      const f = life / this.maxLife[w];
      this.size[w] = this.baseSize[w] * (1 + this.grow[w] * (1 - f));
      const a = Math.min(1, f * 2.5) * this.opa[w];
      this.col[w * 4] = this.rgb[j]; this.col[w * 4 + 1] = this.rgb[j + 1]; this.col[w * 4 + 2] = this.rgb[j + 2]; this.col[w * 4 + 3] = a;
      w++;
    }
    this.count = w;
    this.mesh.count = w;
    this.aOffset.needsUpdate = this.aColor.needsUpdate = this.aSize.needsUpdate = true;
    if (this.spins || this.shaped) this.aSpin.needsUpdate = true;
    if (this.shaped) this.aShape.needsUpdate = true;
    if (this.aStreak) this.aStreak.needsUpdate = true;
  }

  private move(from: number, to: number): void {
    for (let c = 0; c < 3; c++) {
      this.pos[to * 3 + c] = this.pos[from * 3 + c]; this.vel[to * 3 + c] = this.vel[from * 3 + c]; this.rgb[to * 3 + c] = this.rgb[from * 3 + c];
      this.car[to * 3 + c] = this.car[from * 3 + c];
      this.spin[to * 3 + c] = this.spin[from * 3 + c];
    }
    this.baseSize[to] = this.baseSize[from]; this.maxLife[to] = this.maxLife[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]; this.grow[to] = this.grow[from];
    this.opa[to] = this.opa[from];
    this.shape[to] = this.shape[from];
    if (this.streaks) this.stretch[to] = this.stretch[from];
  }

  clear(): void { this.count = 0; this.mesh.count = 0; }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}

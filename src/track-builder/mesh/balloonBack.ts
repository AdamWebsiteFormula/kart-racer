// A popped balloon coming back (Adam, 28 Sept 2026: "The balloons, after they are selected, just appear
// without any animation. Looks cheap."). Mario Kart World's item box comes back in a few frames, not at
// once: about half size and pale white at first, whole in about 0.1 s, its colors back by 0.2 s
// (youtube.com/watch?v=MgkCwst1RqI, 7.37 to 7.60 s). Ours is a balloon, so it is blown up: from the frame
// the sim has it back (race-manager's timer at 0: the view never brings one back early), its body swells
// out of its knot with a springy wobble (it overshoots, stretches and squashes, and settles), its ribbon
// unrolls down from the knot, it shines white as it comes and takes its color back, and a little sparkle
// goes off round it (vfx-juice, from `came`). Reduced motion: a quick fade in its place, nothing moving.
//
// How, pictures only: each balloon instancer draws its own copy of the balloon's geometry with one float
// more per copy, `balloonBack`, the scene-clock time that copy's balloon came back. Its material, its
// near-lens ghost copies (ghost.ts: they draw the same geometry) and its shadow (the depth material here)
// reshape the model in its own frame before the copy's matrix, so whatever the matrix does (the balloon's
// place, a bob, a sway) goes on as it was, and the matrix still hides a popped one. A balloon back longer
// than `seconds` ago is drawn exactly as before.
import { DynamicDrawUsage, InstancedBufferAttribute, MeshDepthMaterial, type BufferGeometry, type InstancedMesh, type Material, type WebGLProgramParametersWithUniforms } from 'three';

export const BALLOON_BACK = Object.freeze({
  /** seconds from back to settled: after this the shader leaves the balloon as modelled */
  seconds: 0.6,
  /** the model's knot (art-pipeline decor.ts `balloon`): its foot, and the neck the body swells out of */
  knot: -1.01, neck: -0.85,
  /** the body's size: a spring from nothing to whole, easing in over `tau` seconds and ringing every `period` (whole at 0.13 s, 11 % over at 0.2 s, settled by 0.4 s) */
  tau: 0.1, period: 0.5,
  /** its squash and stretch on top: this much taller (and half as much narrower) as it swells, squat as it overshoots, tall again, turning over every `wobblePeriod`, dying over `wobbleTau` */
  wobble: 0.25, wobblePeriod: 0.24, wobbleTau: 0.18,
  /** the ribbon unrolls from the knot over `unroll` seconds, starting `unrollDelay` in */
  unrollDelay: 0.03, unroll: 0.3,
  /** it comes pale, its colour this far toward white (still shaded: MKW's pale box), back by `shineSeconds`; and glowing `shineGlow` of white at the start */
  shine: 0.75, shineSeconds: 0.2, shineGlow: 0.3,
  /** reduced motion: no motion, it fades in over this long (a dither: the balloons are solid) */
  fade: 0.2,
});

/** `balloonBack` for a balloon that has not come back in this race: long settled. */
export const SETTLED = -1e4;

/** The balloon's shape `age` seconds after it came back: its body's scale across (x, z) and up, the ribbon's share unrolled, the shine and how much of it shows. */
export interface BalloonPose { across: number; up: number; ribbon: number; shine: number; alpha: number }

/**
 * The pose at `age` seconds after the balloon came back (the shader's own sums, written out here for the
 * tests and anyone tuning): outside [0, seconds), and with reduced motion, the body and ribbon as modelled.
 */
export function balloonPose(age: number, reduced: boolean, out: BalloonPose = { across: 1, up: 1, ribbon: 1, shine: 0, alpha: 1 }): BalloonPose {
  const B = BALLOON_BACK;
  out.across = 1; out.up = 1; out.ribbon = 1; out.shine = 0; out.alpha = 1;
  if (!(age >= 0 && age < B.seconds)) return out;
  if (reduced) { out.alpha = smoothstep(0, B.fade, age); return out; }
  const env = 1 - smoothstep(0.7 * B.seconds, B.seconds, age);
  const grow = 1 - Math.exp(-age / B.tau) * Math.cos((2 * Math.PI * age) / B.period);
  const q = B.wobble * Math.exp(-age / B.wobbleTau) * Math.sin((2 * Math.PI * age) / B.wobblePeriod);
  out.across = 1 + (grow * (1 - 0.5 * q) - 1) * env;
  out.up = 1 + (grow * (1 + q) - 1) * env;
  const u = Math.min(1, Math.max(0, (age - B.unrollDelay) / B.unroll));
  out.ribbon = 1 - (1 - u) ** 3;
  out.shine = B.shine * (1 - smoothstep(0, B.shineSeconds, age));
  return out;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const f = (x: number) => x.toFixed(5);
const B = BALLOON_BACK;

/** The vertex side: every copy's age from its `balloonBack`, then the body swelled about the neck, the ribbon unrolled below the knot. */
const VERT_PARS = `attribute float balloonBack;
uniform float uBalloonNow;
uniform float uBalloonReduced;
varying float vBalloonShine;
varying float vBalloonAlpha;
`;
const VERT_BODY = `
  {
    float bbAge = uBalloonNow - balloonBack;
    vBalloonShine = 0.0;
    vBalloonAlpha = 1.0;
    if (bbAge >= 0.0 && bbAge < ${f(B.seconds)}) {
      if (uBalloonReduced > 0.5) {
        vBalloonAlpha = smoothstep(0.0, ${f(B.fade)}, bbAge);
      } else {
        float bbEnv = 1.0 - smoothstep(${f(0.7 * B.seconds)}, ${f(B.seconds)}, bbAge);
        float bbGrow = 1.0 - exp(-bbAge / ${f(B.tau)}) * cos(${f((2 * Math.PI) / B.period)} * bbAge);
        float bbQ = ${f(B.wobble)} * exp(-bbAge / ${f(B.wobbleTau)}) * sin(${f((2 * Math.PI) / B.wobblePeriod)} * bbAge);
        vec2 bbS = mix(vec2(1.0), bbGrow * vec2(1.0 - 0.5 * bbQ, 1.0 + bbQ), bbEnv);
        float bbY = transformed.y;
        if (bbY >= ${f(B.knot)}) {
          // the body (and the knot, less and less toward its foot) about the neck
          vec2 bbK = mix(vec2(1.0), bbS, smoothstep(${f(B.knot)}, ${f(B.neck)}, bbY));
          transformed.xz *= bbK.x;
          transformed.y = ${f(B.neck)} + (bbY - ${f(B.neck)}) * bbK.y;
        } else {
          // the ribbon, unrolling down from the knot's foot
          float bbU = clamp((bbAge - ${f(B.unrollDelay)}) / ${f(B.unroll)}, 0.0, 1.0);
          bbU = 1.0 - (1.0 - bbU) * (1.0 - bbU) * (1.0 - bbU);
          transformed.y = ${f(B.knot)} + (bbY - ${f(B.knot)}) * bbU;
        }
        vBalloonShine = ${f(B.shine)} * (1.0 - smoothstep(0.0, ${f(B.shineSeconds)}, bbAge));
      }
    }
  }`;

/** The fragment side: the reduced-motion fade as an ordered dither (the balloon stays solid), and the pale shine (its colour toward white, lit as ever, and a little glow). */
const FRAG_PARS = `varying float vBalloonShine;
varying float vBalloonAlpha;
float bbDither(vec2 p) {
  vec2 q = mod(floor(p), 4.0), a = mod(q, 2.0), b = floor(q * 0.5);
  return (4.0 * mod(2.0 * a.x + 3.0 * a.y, 4.0) + mod(2.0 * b.x + 3.0 * b.y, 4.0) + 0.5) / 16.0;
}
`;
const FRAG_CUT = `
  if (vBalloonAlpha < 1.0 && vBalloonAlpha <= bbDither(gl_FragCoord.xy)) discard;`;
const FRAG_PALE = `
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vBalloonShine);`;
const FRAG_GLOW = `
  totalEmissiveRadiance += vec3(${f(B.shineGlow / B.shine)}) * vBalloonShine;`;

type Shader = WebGLProgramParametersWithUniforms;

/** The balloon's clock and reduced-motion switch as the shaders read them (one pair per scene). */
export interface BalloonUniforms { now: { value: number }; reduced: { value: number } }

/**
 * Patch `m` (a balloon instancer's own material, or the depth material of its shadow) to draw each copy as
 * its balloon comes back. Patch before any patch that copies the material (ghost.ts NearGhost): those copies
 * take the patches made so far. `shine`: the colour pass's white shine (not the shadow's).
 */
export function patchBalloonBack(m: Material, u: BalloonUniforms, shine = true): void {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader: Shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uBalloonNow = u.now;
    shader.uniforms.uBalloonReduced = u.reduced;
    shader.vertexShader = VERT_PARS + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>${VERT_BODY}`);
    let frag = FRAG_PARS + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>${FRAG_CUT}`);
    if (shine) frag = frag.replace('#include <color_fragment>', `#include <color_fragment>${FRAG_PALE}`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>${FRAG_GLOW}`);
    shader.fragmentShader = frag;
  };
  m.customProgramCacheKey = () => `${key()}|bback${shine ? '' : 'd'}`;
  m.needsUpdate = true;
}

/** A balloon instancer's geometry: a copy of the balloon's own (shared with the Decoy Balloon, so never touched) with `balloonBack` for `capacity` copies, all settled. */
export function balloonBackGeometry(src: BufferGeometry, capacity: number): BufferGeometry {
  const g = src.clone();
  const a = new InstancedBufferAttribute(new Float32Array(Math.max(1, capacity)).fill(SETTLED), 1);
  a.setUsage(DynamicDrawUsage);
  g.setAttribute('balloonBack', a);
  return g;
}

/**
 * The scene's balloons coming back: when each came back (by the scene's clock), the shaders' clock, and
 * this frame's arrivals for the sparkle. `update` once a frame after the popped ones are hidden; it
 * allocates nothing on a frame with no arrival.
 */
export class BalloonBack {
  readonly uniforms: BalloonUniforms = { now: { value: 0 }, reduced: { value: 0 } };
  /** the shadow's depth material: the same shapes (and the fade's dither) as the balloons, for every balloon instancer */
  readonly depth = new MeshDepthMaterial();
  /** the balloons that came back on this frame: where their bodies' middles are (x, y, z, x, y, z, …) */
  readonly came: number[] = [];
  /** by pickup index (race-manager's pickupStates): when it came back, gone now, its timer at the last frame */
  private backAt = new Float32Array(0);
  private gone = new Uint8Array(0);
  private left = new Float32Array(0);
  /** by pickup index: its copy in the instancer on show (-1: none, a closed shortcut's) */
  private slotOf = new Int32Array(0);
  private mesh: InstancedMesh | null = null;
  private last = -Infinity;

  constructor() {
    patchBalloonBack(this.depth, this.uniforms, false);
  }

  /** The body's middle above a copy's place (model y of the body's centre, decor.ts). */
  static readonly BODY_Y = 0.12;

  /**
   * `time`: the scene's clock (race time); `timers`: race-manager's pickupStates (none: nothing changes);
   * `mesh`, `slots` and `mats`: the balloon instancer on show, which pickup each of its copies is and where
   * each copy was placed (16 a copy); `reduced`: reduced motion.
   */
  update(
    time: number, timers: readonly { respawnRemaining: number }[] | undefined, mesh: InstancedMesh | undefined,
    slots: readonly number[] | undefined, mats: Float32Array | undefined, reduced: boolean,
  ): void {
    const u = this.uniforms;
    u.now.value = time;
    u.reduced.value = reduced ? 1 : 0;
    this.came.length = 0;
    if (!timers || !mesh || !slots || !mats) { this.last = time; return; }
    const n = timers.length;
    let all = false;
    // a new race's timers, or the clock run back (a restart): every balloon as it stands, settled
    if (this.backAt.length !== n || time < this.last) {
      if (this.backAt.length !== n) { this.backAt = new Float32Array(n); this.gone = new Uint8Array(n); this.left = new Float32Array(n); this.slotOf = new Int32Array(n); }
      this.backAt.fill(SETTLED);
      for (let j = 0; j < n; j++) { this.left[j] = timers[j].respawnRemaining; this.gone[j] = this.left[j] > 0 ? 1 : 0; }
      this.last = time;
      all = true;
    }
    // a new instancer (a Final Lap Shift's balloons, swapped in): its copies' pickups, and all written
    if (mesh !== this.mesh || all) {
      this.mesh = mesh;
      this.slotOf.fill(-1);
      for (let k = 0; k < slots.length; k++) if (slots[k] < n) this.slotOf[slots[k]] = k;
      all = true;
    }
    const attr = mesh.geometry.getAttribute('balloonBack') as InstancedBufferAttribute | undefined;
    let changed = all;
    for (let j = 0; j < n; j++) {
      const r = timers[j].respawnRemaining;
      if (r > 0) { this.gone[j] = 1; this.left[j] = r; continue; }
      if (!this.gone[j]) continue;
      this.gone[j] = 0;
      // back on the tick its timer ran out: its time left at the last frame after the last frame
      this.backAt[j] = Math.min(time, Math.max(this.last, this.last + this.left[j]));
      changed = true;
      const k = this.slotOf[j];
      if (k < 0 || k * 16 + 14 >= mats.length) continue;
      this.came.push(mats[k * 16 + 12], mats[k * 16 + 13] + BalloonBack.BODY_Y, mats[k * 16 + 14]);
    }
    this.last = time;
    if (!changed || !attr) return;
    const a = attr.array as Float32Array;
    for (let k = 0; k < slots.length && k < a.length; k++) a[k] = slots[k] < n ? this.backAt[slots[k]] : SETTLED;
    attr.needsUpdate = true;
  }

  /** The time pickup `j` came back (SETTLED: not this race). */
  backTime(j: number): number { return this.backAt[j] ?? SETTLED; }

  dispose(): void { this.depth.dispose(); }
}

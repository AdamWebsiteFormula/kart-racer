// Post-processing in one EffectPass (SOP): bloom that only catches HDR colours (sparks, flames,
// glints are brighter than 1.0; the toon world is not), the boost lens (edge streaks and a colour
// fringe, on boost only), a soft vignette, and ACES tone mapping. `quality: low` turns the whole chain off.
import {
  BlendFunction, BloomEffect, BrightnessContrastEffect, Effect, EffectAttribute, HueSaturationEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { ACESFilmicToneMapping, HalfFloatType, NoToneMapping, Uniform, type Camera, type Scene, type WebGLRenderer } from 'three';
import { DAY_GRADE } from '../art-pipeline/index.ts';

/**
 * The boost lens (critiques of 24 Sept 2026: "no blur, weak sense of speed"): while a boost runs, the
 * screen's edges streak toward its middle, a radial blur of `taps` samples (dithered, so no banding),
 * and fringe a little, red out and blue in. Masked to an ellipse fitted to the screen, from `inner` to
 * `inner + soft` of the way to its edges: the road ahead and your kart stay sharp. It samples the scene,
 * so it takes the EffectPass's one convolution slot, the plain chromatic aberration's before it; off a
 * boost it returns the colour untouched. Measured on an M4 Pro at 1920x1080: see docs/sops/vfx-juice.md.
 */
// fringe 0.0015 (was 0.0045): at 0.45 % of the screen the red/blue split drew rainbow outlines on bright
// ridges during boosts (screenshot review 24 Sept 2026); a hair of it still reads as speed
export const LENS = Object.freeze({ taps: 8, streak: 0.075, inner: 0.62, soft: 0.55, fringe: 0.0015 });

const LENS_FRAG = `uniform float level;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
  if (level <= 0.0) return;
  vec2 d = uv - 0.5;
  float m = level * smoothstep(${LENS.inner.toFixed(3)}, ${(LENS.inner + LENS.soft).toFixed(3)}, length(d) * 2.0);
  if (m <= 0.002) return;
  vec3 base = texture2D(inputBuffer, uv).rgb;
  // interleaved gradient noise: each pixel's taps start at a different point along the streak
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec2 step = d * (${LENS.streak.toFixed(4)} * m / ${(LENS.taps - 1).toFixed(1)});
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${LENS.taps}; i++) sum += texture2D(inputBuffer, uv - step * (float(i) + j)).rgb;
  float red = texture2D(inputBuffer, uv + d * (${LENS.fringe.toFixed(4)} * m)).r;
  float blue = texture2D(inputBuffer, uv - d * (${LENS.fringe.toFixed(4)} * m)).b;
  // added to what the chain has so far (the bloom is in it; the scene samples are not)
  outputColor.rgb += sum / ${LENS.taps.toFixed(1)} - base + vec3(red - base.r, 0.0, blue - base.b);
}`;

/** The boost lens as one effect; `level` 0..1. */
class BoostLensEffect extends Effect {
  constructor() {
    super('BoostLensEffect', LENS_FRAG, { attributes: EffectAttribute.CONVOLUTION, uniforms: new Map([['level', new Uniform(0)]]) });
  }
  get level(): number { return this.uniforms.get('level')!.value as number; }
  set level(v: number) { this.uniforms.get('level')!.value = v; }
}

/**
 * The chain's last step: no colour channel below 0. The grade's lift (HueSaturationEffect clamps only
 * the top) pushes a strong colour's weakest channel negative, and the sRGB encode after the chain takes
 * pow() of it: NaN. Chrome wrote that channel as 0; Firefox drew the whole pixel black (the grass's dark
 * greens, Pip's teal kart, every balloon; cross-browser sweep, 24 Sept 2026). Floored here, every
 * browser draws what Chrome did.
 */
export const FLOOR_FRAG = 'void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) { outputColor = vec4(max(inputColor.rgb, 0.0), inputColor.a); }';
class FloorEffect extends Effect {
  constructor() { super('FloorEffect', FLOOR_FRAG, { blendFunction: BlendFunction.SRC }); }
}

/**
 * Bloom never spreads a NaN or an Inf (26 Sept 2026: one NaN pixel on a prop turned whole frames black,
 * 1-5 times a lap on five of six tracks; bloom's mip-chain blur spreads one bad pixel over the screen).
 * The same guard as Unity's post stack, "Stop NaN propagation" (its manual, post-processing 3.2). It is
 * patched into bloom's threshold pass, the one read of the scene that every blur level starts from, so
 * it costs no extra pass or draw. It tests the float's exponent bits, not isnan(): a fast-math shader
 * compiler may drop isnan().
 */
export const BLOOM_INPUT = 'vec4 texel=texture2D(inputBuffer,vUv);';
export const BLOOM_GUARD = 'if(any(equal(floatBitsToUint(texel)&uvec4(0x7f800000u),uvec4(0x7f800000u))))texel=vec4(0.0);';

/** Adds BLOOM_GUARD to `bloom`'s threshold shader; false if postprocessing's shader no longer has the line it follows (post.test.ts fails on that). */
export function guardBloomInput(bloom: BloomEffect): boolean {
  const m = bloom.luminanceMaterial;
  if (m.fragmentShader.includes(BLOOM_GUARD)) return true;
  if (!m.fragmentShader.includes(BLOOM_INPUT)) return false;
  m.fragmentShader = m.fragmentShader.replace(BLOOM_INPUT, BLOOM_INPUT + BLOOM_GUARD);
  m.needsUpdate = true;
  return true;
}

/** The colour lift eased toward `to` over `dt` seconds, at the rate the scene's lights ease (main.ts applyLight). */
export const easeGrade = (from: number, to: number, dt: number): number => from + (to - from) * (1 - Math.exp(-dt * 1.6));

/**
 * MSAA samples for a screen whose pixel-ratio cap is `dprCap`. A Retina screen (cap 1.5 or more)
 * gets none: its pixels are small enough to hide the steps, and 4x MSAA on the half-float buffer
 * cost 9.0 ms against 5.2 ms a frame at 3840x2160 on an M4 Pro (2026-09-24). Keyed to the screen, not the
 * governed ratio, so stepping resolution down never turns MSAA back on and costs more.
 */
export const msaaSamples = (dprCap: number): number => (dprCap >= 1.5 ? 0 : 4);

export class Post {
  private readonly composer: EffectComposer;
  private readonly lens = new BoostLensEffect();
  private readonly grade: HueSaturationEffect;
  /** the colour lift the current sky wants (SkyLight.grade); render() eases to it with the lights */
  gradeTo = DAY_GRADE;
  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly camera: Camera;
  private level = 0;
  enabled = true;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 4 });
    this.composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({ luminanceThreshold: 1.0, luminanceSmoothing: 0.15, intensity: 1.1, mipmapBlur: true, radius: 0.7 });
    guardBloomInput(bloom);
    const vignette = new VignetteEffect({ darkness: 0.32, offset: 0.4 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    // the filmic curve flattens colour a little: give it back, cartoon-bright but not garish
    // (less under a sunset or a night: warm light on warm ground is saturated enough already)
    this.grade = new HueSaturationEffect({ saturation: DAY_GRADE });
    const punch = new BrightnessContrastEffect({ contrast: 0.07 });
    this.composer.addPass(new EffectPass(camera, bloom, this.lens, vignette, tone, this.grade, punch, new FloorEffect()));
    this.setEnabled(true);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    // the tone map lives in the effect chain when it is on, in the renderer when it is off
    this.renderer.toneMapping = on ? NoToneMapping : ACESFilmicToneMapping;
  }

  /** Jump straight to the sky's colour lift (a new race, not a Final Lap Shift). */
  snapGrade(): void { this.grade.saturation = this.gradeTo; }

  setSize(w: number, h: number): void { this.composer.setSize(w, h); }

  /** Change the MSAA samples (rebuilds the buffers, so only when they differ). */
  setSamples(n: number): void { if (this.composer.multisampling !== n) this.composer.multisampling = n; }

  /** `boost` 0..1 (how hard the player's boost is felt, Vfx.boostLevel) drives the lens, eased in fast and out slower; reduced motion keeps it at zero. */
  render(dt: number, boost: number, reduced: boolean): void {
    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    const want = reduced ? 0 : Math.max(0, Math.min(1, boost));
    this.level += (want - this.level) * Math.min(1, dt * (want > this.level ? 10 : 3));
    this.lens.level = this.level > 0.005 ? this.level : 0;
    this.grade.saturation = easeGrade(this.grade.saturation, this.gradeTo, dt);
    this.composer.render(dt);
  }

  dispose(): void { this.composer.dispose(); }
}

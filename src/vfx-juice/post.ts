// Post-processing in one EffectPass (SOP): bloom that only catches HDR colours (sparks, flames,
// glints are brighter than 1.0; the toon world is not), chromatic aberration on boost only,
// a soft vignette, and ACES tone mapping. `quality: low` turns the whole chain off.
import {
  BloomEffect, BrightnessContrastEffect, ChromaticAberrationEffect, HueSaturationEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { ACESFilmicToneMapping, HalfFloatType, NoToneMapping, Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';
import { DAY_GRADE } from '../art-pipeline/index.ts';

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
  private readonly chroma: ChromaticAberrationEffect;
  private readonly grade: HueSaturationEffect;
  /** the colour lift the current sky wants (SkyLight.grade); render() eases to it with the lights */
  gradeTo = DAY_GRADE;
  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly offset = new Vector2();
  private level = 0;
  enabled = true;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 4 });
    this.composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({ luminanceThreshold: 1.0, luminanceSmoothing: 0.15, intensity: 1.1, mipmapBlur: true, radius: 0.7 });
    this.chroma = new ChromaticAberrationEffect({ offset: this.offset, radialModulation: true, modulationOffset: 0.35 });
    const vignette = new VignetteEffect({ darkness: 0.32, offset: 0.4 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    // the filmic curve flattens colour a little: give it back, cartoon-bright but not garish
    // (less under a sunset or a night: warm light on warm ground is saturated enough already)
    this.grade = new HueSaturationEffect({ saturation: DAY_GRADE });
    const punch = new BrightnessContrastEffect({ contrast: 0.07 });
    this.composer.addPass(new EffectPass(camera, bloom, this.chroma, vignette, tone, this.grade, punch));
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

  /** `boost` 0..1 drives the colour fringe; reduced motion keeps it at zero. */
  render(dt: number, boost: boolean, reduced: boolean): void {
    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    this.level += ((boost && !reduced ? 1 : 0) - this.level) * Math.min(1, dt * (boost ? 10 : 3));
    // a hint of fringe on boost, never enough to split palms and roofs into red and cyan
    this.offset.set(0.0012 * this.level, 0.0006 * this.level);
    this.chroma.offset = this.offset;
    this.grade.saturation = easeGrade(this.grade.saturation, this.gradeTo, dt);
    this.composer.render(dt);
  }

  dispose(): void { this.composer.dispose(); }
}

// Post-processing in one EffectPass (SOP): bloom that only catches HDR colours (sparks, flames,
// glints are brighter than 1.0; the toon world is not), chromatic aberration on boost only,
// a soft vignette, and ACES tone mapping. `quality: low` turns the whole chain off.
import {
  BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { ACESFilmicToneMapping, HalfFloatType, NoToneMapping, Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';

export class Post {
  private readonly composer: EffectComposer;
  private readonly chroma: ChromaticAberrationEffect;
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
    this.composer.addPass(new EffectPass(camera, bloom, this.chroma, vignette, tone));
    this.setEnabled(true);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    // the tone map lives in the effect chain when it is on, in the renderer when it is off
    this.renderer.toneMapping = on ? NoToneMapping : ACESFilmicToneMapping;
  }

  setSize(w: number, h: number): void { this.composer.setSize(w, h); }

  /** `boost` 0..1 drives the colour fringe; reduced motion keeps it at zero. */
  render(dt: number, boost: boolean, reduced: boolean): void {
    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    this.level += ((boost && !reduced ? 1 : 0) - this.level) * Math.min(1, dt * (boost ? 10 : 3));
    this.offset.set(0.004 * this.level, 0.002 * this.level);
    this.chroma.offset = this.offset;
    this.composer.render(dt);
  }

  dispose(): void { this.composer.dispose(); }
}

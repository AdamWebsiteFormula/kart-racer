// The sea's own scene depth, without a second scene render or a depth pre-pass (research brief, 26
// Sept 2026: Nintendo "Ask the Developer" Vol.18 Pt.3 — MKW's shoal floor shows through crystal-clear
// shallow water, deep water reads blue; Digital Foundry's MKW tech review; best practice: Roystan
// "Toon Water", Cyanilux "Shoreline shader breakdown", Ameye "stylized water"). The water mesh's own
// `onBeforeRender` fires right after every opaque thing has drawn and before any other see-through
// thing (scene.ts gives water `renderOrder = -2`), so whatever is already in the current render
// target's depth buffer at that moment is exactly the opaque scene. We copy it with one WebGL2
// `blitFramebuffer` into a small DepthTexture of our own — no extra draw call, no extra scene render —
// and the water's fragment shader (surfaces.ts) reads it back to reconstruct the world height of
// whatever is behind each pixel: the sandy seabed, a pier post's submerged foot, a boat hull.
//
// `uHasDepth` (a shader uniform) is 0 whenever the copy could not be done — the renderer has no
// active render target (the performance governor's Low tier draws straight to the canvas), the
// context is not WebGL2, or the source/destination framebuffers are not where three's internals say
// they should be — so the shader falls back to today's opaque look rather than showing anything torn
// or half-drawn.
import {
  DepthTexture, Vector2, WebGLRenderTarget,
  type Camera, type PerspectiveCamera, type ShaderMaterial, type WebGLRenderer,
} from 'three';

/**
 * The shallow-to-deep look, tuned to the research brief: colour keeps shifting shallow (turquoise) to
 * deep (this material's own `deep` tone) out to `colorAt` metres of vertical depth below the surface;
 * alpha is `alphaAt0` right at the surface (so the seabed and anything standing in the shallows show
 * through) and reaches 1 by `opaqueAt` — sooner than the colour finishes shifting, so the last stretch
 * from `opaqueAt` to `colorAt` reads as increasingly deep-toned water at full opacity, not a sudden
 * pop to solid; `foamWidth` is the soft band, in metres of vertical depth, where the shoreline foam
 * shows. Depth here is always the vertical (world-space) drop from the water's own surface to
 * whatever is found behind a pixel, never the camera-ray distance, so the shoreline holds still as
 * the camera moves (Cyanilux's shoreline breakdown gives the same reason for the same choice).
 * land.ts's `SEABED_UNDER` keeps the coast's own seabed geometry sloping a little past `colorAt`, so
 * the slope never shows a cut edge.
 */
export const WATER_DEPTH = Object.freeze({
  alphaAt0: 0.3,
  opaqueAt: 2.5,
  colorAt: 4.0,
  foamWidth: 0.35,
});

/** The alpha at vertical depth `d` (metres below the surface): WATER_DEPTH's own curve, mirrored in WATER_DEPTH_GLSL. `d = 0` is the shoreline itself (alphaAt0, the shallowest real water); fully opaque strictly above the surface (d < 0): dry land found behind the water, nothing there to fade for. */
export function waterAlphaAt(d: number): number {
  if (d < 0) return 1;
  const k = Math.min(1, d / WATER_DEPTH.opaqueAt);
  const s = k * k * (3 - 2 * k);
  return WATER_DEPTH.alphaAt0 + (1 - WATER_DEPTH.alphaAt0) * s;
}

/** How far the colour has shifted from shallow to deep at vertical depth `d`: 0 at the surface, 1 by WATER_DEPTH.colorAt. */
export function waterColorMixAt(d: number): number {
  if (d <= 0) return 0;
  const k = Math.min(1, d / WATER_DEPTH.colorAt);
  return k * k * (3 - 2 * k);
}

/** The foam mask at vertical depth `d`: 1 right at the surface (d = 0, the shoreline), gone by WATER_DEPTH.foamWidth down; 0 strictly above the surface (dry land found behind the water, not a shoreline). */
export function waterFoamAt(d: number): number {
  if (d < 0) return 0;
  return Math.max(0, 1 - d / WATER_DEPTH.foamWidth);
}

const f = (x: number): string => x.toFixed(4);

/**
 * GLSL for the water's fragment shader (surfaces.ts): the uniforms and varying the depth copy needs,
 * `lkSceneDropBelow()` (the vertical depth below the surface of whatever is behind this pixel, or a
 * large number when there is nothing useful there — the sky, or the copy did not run this frame: the
 * same "read as fully opaque, fully blue" result as a real deep spot, so no special case is needed
 * where it is used) and GLSL twins of `waterAlphaAt`/`waterColorMixAt`/`waterFoamAt` above, built from
 * the very same WATER_DEPTH numbers so the two can never drift apart.
 */
export const WATER_DEPTH_GLSL = `
uniform sampler2D uSceneDepth;
uniform float uHasDepth;
uniform float uNear;
uniform float uFar;
uniform vec2 uResolution;

/** perspectiveDepthToViewZ (three.js packing.glsl), hand-inlined: a non-reversed depth buffer only (this renderer never turns USE_REVERSED_DEPTH_BUFFER on). */
float lkViewZFromDepth(float depth) { return (uNear * uFar) / ((uFar - uNear) * depth - uFar); }

/**
 * The vertical (world-space) drop from this fragment's own surface height (vWorld.y) to whatever the
 * depth buffer found behind it, reconstructed along the same camera ray this fragment is on (so no
 * inverse view matrix is needed: the found point is cameraPosition + (vWorld - cameraPosition) times
 * the ratio of the two points' linear view-space depths — this fragment's own, from gl_FragCoord.z,
 * not a varying carried from the vertex shader: on the water's own giant two-triangle plane a
 * hand-carried view-space-Z varying measured many times too deep near a shallow shoreline, out of all
 * proportion to gl_FragCoord.z's own (hardware, perspective-correct) read of the very same point —
 * read gl_FragCoord.z instead, exactly as the depth buffer itself would have stored for this pixel).
 * A large number for "nothing useful found" (uHasDepth off, or a cleared/background pixel) so every
 * caller's own depth curve already reads that as "fully deep" without a separate branch.
 */
float lkSceneDropBelow() {
  if (uHasDepth < 0.5) return 1.0e4;
  vec2 suv = gl_FragCoord.xy / uResolution;
  float raw = texture2D(uSceneDepth, suv).x;
  if (raw >= 0.9999) return 1.0e4;
  float sceneViewZ = lkViewZFromDepth(raw);
  float ownViewZ = lkViewZFromDepth(gl_FragCoord.z);
  float k = sceneViewZ / ownViewZ;
  float sceneY = cameraPosition.y + (vWorld.y - cameraPosition.y) * k;
  return vWorld.y - sceneY;
}

float lkWaterAlpha(float dep) {
  if (dep < 0.0) return 1.0;
  float k = min(1.0, dep / ${f(WATER_DEPTH.opaqueAt)});
  float s = k * k * (3.0 - 2.0 * k);
  return ${f(WATER_DEPTH.alphaAt0)} + (1.0 - ${f(WATER_DEPTH.alphaAt0)}) * s;
}
float lkWaterColorMix(float dep) {
  if (dep <= 0.0) return 0.0;
  float k = min(1.0, dep / ${f(WATER_DEPTH.colorAt)});
  return k * k * (3.0 - 2.0 * k);
}
float lkWaterFoam(float dep) {
  if (dep < 0.0) return 0.0;
  return max(0.0, 1.0 - dep / ${f(WATER_DEPTH.foamWidth)});
}
`;

/** The uniforms `WATER_DEPTH_GLSL` reads, ready to merge into the water material's own uniforms object. */
export function waterDepthUniforms(): Record<string, { value: unknown }> {
  return {
    uSceneDepth: { value: null }, uHasDepth: { value: 0 }, uNear: { value: 0.3 }, uFar: { value: 1400 },
    uResolution: { value: new Vector2(1, 1) },
  };
}

// ---- the copy itself: one shared target (only one sea plane is ever drawn in a frame) ----

let target: WebGLRenderTarget | null = null;
let targetW = 0, targetH = 0;

/** (Re)allocates the shared depth-copy target for `w`×`h`, disposing the old one on a resize. */
function depthTarget(w: number, h: number): WebGLRenderTarget {
  if (target && targetW === w && targetH === h) return target;
  target?.dispose();
  target = new WebGLRenderTarget(w, h, { depthBuffer: true, stencilBuffer: false, generateMipmaps: false });
  target.texture.name = 'WaterDepth.unused';
  // default DepthTexture: type UnsignedIntType, format DepthFormat — DEPTH_COMPONENT24 internally
  // (three's WebGLTextures getInternalDepthFormat), matching Post's own composer buffers exactly
  // (postprocessing.js EffectComposer: no stencil, no depthTexture of its own unless a pass asks for
  // one, which none of ours do — see art-pipeline SOP Decisions, 26 Sept 2026), so blitFramebuffer's
  // depth-format-must-match rule is satisfied without reading anything back from the renderer.
  target.depthTexture = new DepthTexture(w, h);
  target.depthTexture.name = 'WaterDepth.depth';
  targetW = w; targetH = h;
  return target;
}

interface FbProps { __webglFramebuffer?: WebGLFramebuffer | WebGLFramebuffer[] | null; __webglMultisampledFramebuffer?: WebGLFramebuffer }

/** The framebuffer actually being drawn into for `rt` right now: the multisampled one while samples > 0 and no render-to-texture extension resolves it directly, else the plain one. Null if three has not set either up (nothing to copy yet). */
function activeFramebuffer(renderer: WebGLRenderer, rt: WebGLRenderTarget): WebGLFramebuffer | null {
  const p = renderer.properties.get(rt) as FbProps;
  const fb = p.__webglMultisampledFramebuffer ?? p.__webglFramebuffer;
  return fb && !Array.isArray(fb) ? fb : null;
}

const RES = new Vector2();

/**
 * Copies the depth of everything drawn so far into the material's `uSceneDepth`, and sets the rest of
 * its depth uniforms from `camera`. Called from the water mesh's own `onBeforeRender` (waterDepthHook
 * below); sets `uHasDepth` to 0 (today's opaque fallback, surfaces.ts) rather than throwing whenever
 * the renderer has no active render target or anything about the copy is missing.
 */
function captureSceneDepth(renderer: WebGLRenderer, material: ShaderMaterial, camera: Camera): void {
  const u = material.uniforms;
  try {
    const rt = renderer.getRenderTarget();
    const gl = renderer.getContext();
    if (!rt || !(gl instanceof WebGL2RenderingContext)) { u.uHasDepth.value = 0; return; }
    const srcFb = activeFramebuffer(renderer, rt);
    if (!srcFb) { u.uHasDepth.value = 0; return; }

    const w = rt.width, h = rt.height;
    const dst = depthTarget(w, h);
    renderer.initRenderTarget(dst);
    const dstFb = (renderer.properties.get(dst) as FbProps).__webglFramebuffer;
    if (!dstFb || Array.isArray(dstFb)) { u.uHasDepth.value = 0; return; }

    const state = renderer.state;
    state.bindFramebuffer(gl.READ_FRAMEBUFFER, srcFb);
    state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstFb);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    // restore the draw target three thinks (and, for real, had) bound before this hook ran, so its
    // own framebuffer-binding cache (WebGLState) stays true and the water's own draw lands in the
    // right place right after this returns
    state.bindFramebuffer(gl.FRAMEBUFFER, srcFb);

    u.uSceneDepth.value = dst.depthTexture;
    u.uHasDepth.value = 1;
    const cam = camera as PerspectiveCamera;
    u.uNear.value = cam.near ?? 0.3;
    u.uFar.value = cam.far ?? 1400;
    RES.set(w, h);
    (u.uResolution.value as Vector2).copy(RES);
  } catch {
    u.uHasDepth.value = 0;
  }
}

/** The onBeforeRender hook to assign to the water mesh (art-pipeline surfaces.ts sets it through the ground mesh's material.userData.attachDepth; track-builder never imports this module directly). */
export function waterDepthHook(material: ShaderMaterial): (renderer: WebGLRenderer, scene: unknown, camera: Camera) => void {
  return (renderer, _scene, camera) => captureSceneDepth(renderer, material, camera);
}

/** Test-only: drops the shared depth-copy target so a later real capture starts clean. Never called outside tests. */
export function __resetWaterDepthForTest(): void {
  target?.dispose();
  target = null; targetW = 0; targetH = 0;
}

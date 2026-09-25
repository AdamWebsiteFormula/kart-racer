// Near-lens ghosts (review, 25 Sept 2026): the Harbor crab scuttling across the road in front of the
// chase camera, the kraken's tentacle slammed across Boardwalk's planks and the balloons the finish
// camera flies through all dissolved in the props' stipple (glow.ts fadeNearCamera), a coarse noisy
// shape over a third of the frame with the kart buried under it. Something big the lens can meet
// fades out smoothly instead, as the items do: the part of it within `fade` metres of the lens is
// drawn see-through, its opacity the square of the way from `near` (gone) to `fade` (whole), as one
// clean layer, never its own insides; the rest of it stays solid.
//
// How, with nothing extra drawn while it is far (nearly always): the thing's own material leaves out
// every fragment within `fade` of the lens while its ghost is on; two hidden children share its
// geometry (and its instances): a depth-only copy that writes those near fragments' depth, all but
// the nearly gone ones, then a see-through copy of its look that draws them, which only the front
// surface passes. Both draw in the see-through pass after the sparks, dust and confetti
// (LENS_GHOST.order), so what flies behind a ghost shows through it. `update(eye)` puts the ghost on
// while any part of the thing (its bounding box, or one instance's sphere) is within `fade` of the
// lens, and off again after; it allocates nothing. The copies hang in the scene hidden, so the race's
// warm-up compiles them with the rest; the thing keeps its own shadow (the shadow pass never sees the patch).
import { InstancedMesh, Matrix4, Mesh, Vector2, Vector3, type Material, type WebGLProgramParametersWithUniforms } from 'three';

export const LENS_GHOST = Object.freeze({
  /** the copies' draw order in the see-through pass: after the particles (10) and speed lines (20), before a rival's ghost (kartFade.ts, 100 on) */
  order: 60,
  /** below this opacity a near fragment writes no depth (it is all but gone: nothing behind it is hidden) */
  depthBelow: 0.02,
});

type Shader = WebGLProgramParametersWithUniforms;

/** The view-space position the patches read, as a varying of their own (any built-in material takes it). */
function viewVarying(shader: Shader): void {
  shader.vertexShader = `varying vec3 vGhostView;\n${shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vGhostView = mvPosition.xyz;')}`;
  shader.fragmentShader = `varying vec3 vGhostView;\nuniform vec2 uGhostRange;\n${shader.fragmentShader}`;
}

/** The opacity at view distance `d` for a (near, fade) range: the GLSL both copies share. */
const ALPHA = 'float ghostT = clamp((length(vGhostView) - uGhostRange.x) / (uGhostRange.y - uGhostRange.x), 0.0, 1.0); float ghostA = ghostT * ghostT;';

/** The opacity (0..1) a part at view distance `d` metres is drawn with, for a ghost's (near, fade) range. */
export function ghostOpacity(d: number, near: number, fade: number): number {
  const t = Math.min(1, Math.max(0, (d - near) / (fade - near)));
  return t * t;
}

export class NearGhost {
  /** (near, fade): metres from the lens where a part is gone, and from where it is whole (shared by the patches) */
  readonly range: { value: Vector2 };
  /** 1 while the ghost is on: the solid material leaves out what the copies draw */
  private readonly on = { value: 0 };
  private readonly mesh: Mesh;
  private readonly depth: Mesh;
  private readonly ghost: Mesh;
  private readonly instanced: boolean;
  private shown = false;
  private gone = false;

  /**
   * `mesh`: a Mesh or an InstancedMesh with one material of its own (it is patched here; a shared one
   * would be left out near the lens wherever it is drawn). Patches after this one are not copied into
   * the ghost, so patch the material first.
   */
  constructor(mesh: Mesh, near: number, fade: number) {
    this.mesh = mesh;
    this.range = { value: new Vector2(near, fade) };
    const src = mesh.material as Material;
    const prev = src.onBeforeCompile, prevKey = src.customProgramCacheKey.bind(src);
    const { on, range } = this;
    src.onBeforeCompile = (shader, renderer) => {
      prev.call(src, shader, renderer);
      viewVarying(shader);
      shader.uniforms.uGhostRange = range;
      shader.uniforms.uGhostOn = on;
      shader.fragmentShader = `uniform float uGhostOn;\n${shader.fragmentShader}`.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uGhostOn > 0.5 && length(vGhostView) < uGhostRange.y) discard;`);
    };
    src.customProgramCacheKey = () => `${prevKey()}|ghostsolid`;
    src.needsUpdate = true;
    /** a copy of the material with everything patched on it so far, and `frag` on top */
    const variant = (key: string, frag: (s: string) => string): Material => {
      const v = src.clone();
      v.userData = { ...v.userData, shared: false };
      v.onBeforeCompile = (shader, renderer) => {
        prev.call(src, shader, renderer);
        viewVarying(shader);
        shader.uniforms.uGhostRange = range;
        shader.fragmentShader = frag(shader.fragmentShader);
      };
      v.customProgramCacheKey = () => `${prevKey()}|${key}`;
      v.transparent = true;
      return v;
    };
    // the depth copy: the near fragments' depth, a hair behind them so the see-through copy's own front passes
    const depthMat = variant('ghostdepth', (s) => s.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      { ${ALPHA} if (ghostT >= 1.0 || ghostA < ${LENS_GHOST.depthBelow.toFixed(2)}) discard; }`));
    depthMat.colorWrite = false;
    depthMat.depthWrite = true;
    depthMat.polygonOffset = true;
    depthMat.polygonOffsetFactor = 1;
    depthMat.polygonOffsetUnits = 1;
    // the see-through copy: the near fragments at the square of the way from near to fade
    const ghostMat = variant('ghost', (s) => s
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (length(vGhostView) >= uGhostRange.y) discard;`)
      .replace('#include <opaque_fragment>', `{ ${ALPHA} diffuseColor.a *= ghostA; }
      #include <opaque_fragment>`));
    ghostMat.depthWrite = false;
    this.instanced = (mesh as InstancedMesh).isInstancedMesh === true;
    // (not 'ghost': a Time Trial's ghost kart goes by that name in the same scene)
    this.depth = this.copy(depthMat, LENS_GHOST.order - 1, 'lens-ghost-depth');
    this.ghost = this.copy(ghostMat, LENS_GHOST.order, 'lens-ghost');
    mesh.add(this.depth, this.ghost);
    mesh.userData.nearGhost = this;
  }

  /** A hidden child drawing the mesh's geometry (and instances) with `material`. */
  private copy(material: Material, order: number, name: string): Mesh {
    const m = this.mesh;
    let c: Mesh;
    if (this.instanced) {
      const im = m as InstancedMesh, ci = new InstancedMesh(im.geometry, material, 1);
      // the same instances: the buffers are the mesh's own (never freed here)
      ci.instanceMatrix = im.instanceMatrix;
      ci.instanceColor = im.instanceColor;
      ci.count = im.count;
      c = ci;
    } else c = new Mesh(m.geometry, material);
    c.name = name;
    c.renderOrder = order;
    c.visible = false;
    c.frustumCulled = false;
    c.castShadow = false;
    c.receiveShadow = m.receiveShadow;
    c.userData.ghostCopy = true;
    return c;
  }

  /** Set the (near, fade) range, metres. */
  setRange(near: number, fade: number): void { this.range.value.set(near, fade); }

  /**
   * Metres from `eye` to the nearest point the thing can draw, never more: its bounding box as it
   * stands (the Rumblesaur's bounding sphere is 12 m round, its box hugs it), or its nearest
   * instance's bounding sphere.
   */
  distance(eye: Vector3): number {
    const m = this.mesh, g = m.geometry;
    m.updateWorldMatrix(true, false);
    if (!this.instanced) {
      if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox!, e = m.matrixWorld.elements;
      // the eye in the thing's own frame, and the box's nearest point to it; scaled back by the least stretch
      V.copy(eye).applyMatrix4(M.copy(m.matrixWorld).invert());
      const dx = Math.max(b.min.x - V.x, 0, V.x - b.max.x), dy = Math.max(b.min.y - V.y, 0, V.y - b.max.y), dz = Math.max(b.min.z - V.z, 0, V.z - b.max.z);
      return Math.hypot(dx, dy, dz) * Math.sqrt(Math.min(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
    }
    if (!g.boundingSphere) g.computeBoundingSphere();
    const r0 = g.boundingSphere!.radius, im = m as InstancedMesh, a = im.instanceMatrix.array as Float32Array, w = m.matrixWorld;
    let best = Infinity;
    for (let i = 0; i < im.count; i++) {
      M.fromArray(a, i * 16).premultiply(w);
      const e = M.elements;
      const s = Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
      if (s === 0) continue; // a popped balloon, a taken coin: hidden by a zero scale
      V.copy(g.boundingSphere!.center).applyMatrix4(M);
      best = Math.min(best, V.distanceTo(eye) - r0 * s);
    }
    return best;
  }

  /** On while any part is within `fade` of `eye` (and the thing is shown), off again after. Once a frame, before the draw. */
  update(eye: Vector3): void {
    if (this.gone) return;
    const on = this.mesh.visible && this.distance(eye) < this.range.value.y;
    this.on.value = on ? 1 : 0;
    if (on !== this.shown) { this.shown = on; this.depth.visible = this.ghost.visible = on; }
    if (on && this.instanced) (this.depth as InstancedMesh).count = (this.ghost as InstancedMesh).count = (this.mesh as InstancedMesh).count;
  }

  /** Whether the ghost is drawing this frame. */
  get active(): boolean { return this.shown; }

  /** Free the copies' materials and take them off the mesh (the geometry and instances are the mesh's). Safe to call twice. */
  dispose(): void {
    if (this.gone) return;
    this.gone = true;
    this.on.value = 0;
    for (const c of [this.depth, this.ghost]) { c.removeFromParent(); (c.material as Material).dispose(); }
    if (this.mesh.userData.nearGhost === this) delete this.mesh.userData.nearGhost;
  }
}

const M = new Matrix4(), V = new Vector3();

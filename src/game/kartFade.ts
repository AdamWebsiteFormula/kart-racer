// A rival's kart about to cut into the lens turns into a see-through ghost for that moment, so its
// insides never show: a proper alpha fade, not the old screen-door dither (critique of 24 Sept 2026:
// "a coarse stipple that reads as cheap"). Only that close (CAM.kartFade): Mario Kart World keeps rivals
// solid near the camera, beside you and right behind you (25 Sept 2026, checked in its footage).
//
// How, with no cost while a kart is far (nearly always): every rival mesh gets two hidden children
// sharing its geometry (and its morph targets, so the driver still leans and the wheels still
// steer): a depth-only copy drawn first, then a see-through copy that only its front surface passes,
// so the ghost shows one clean layer, not its own insides. While the kart is within CAM.kartFade of
// the lens the mesh itself wears a material that never draws (its children still do) and the two
// copies show; its opacity is the kart's, eased from its nearest point's distance. Ghosts draw last
// (their kart's group order), back to front, after the sparks and flames: what burns behind a ghost
// (your own flames and sparks) shows through it, and its depth copy hides nothing but its own
// insides. The copies' materials are made up front and live in the scene hidden, so the race's
// warm-up (performance/warmup.ts) compiles them with the rest. The switch runs from the scene's
// onBeforeRender, where the camera for this very frame is known.
import { Mesh, MeshBasicMaterial, SkinnedMesh, type Camera, type Material, type Object3D, type Scene, type ShaderMaterial } from 'three';
import { KART_FIT } from '../art-pipeline/index.ts';
import { CAM } from './camera.ts';

export const GHOST = Object.freeze({
  /** a rival is gone with its nearest point this close to the lens (metres); whole from CAM.kartFade out */
  near: 0.45,
  /** below this opacity even the depth copy draws nothing (the kart is all but gone) */
  depthBelow: 0.02,
  /** ghost karts' group order: after everything else in the see-through pass (particles are 10), the farthest first */
  order: 100,
});

/**
 * A rival's opacity with its nearest point `d` metres from the lens: 0 at GHOST.near, 1 from `fade`
 * out, rising as the square of the way between (it stays faint until it is well clear).
 */
export function ghostAlpha(d: number, fade: number = CAM.kartFade): number {
  const t = Math.min(1, Math.max(0, (d - GHOST.near) / (fade - GHOST.near)));
  return t * t;
}

/** Metres from (x, y, z) in a kart's own frame (origin on the ground, facing +Z) to its KART_FIT box. */
export function kartBoxDistance(x: number, y: number, z: number): number {
  const hx = KART_FIT.width / 2, hy = KART_FIT.height / 2, hz = KART_FIT.length / 2;
  const qx = Math.max(Math.abs(x) - hx, 0), qy = Math.max(Math.abs(y - hy) - hy, 0), qz = Math.max(Math.abs(z) - hz, 0);
  return Math.hypot(qx, qy, qz);
}

/** Worn by a kart mesh while its ghost copies stand in for it: never drawn (its children still are). Shared, never disposed. */
const UNDRAWN = new MeshBasicMaterial({ visible: false });
UNDRAWN.userData.shared = true;

interface Part {
  mesh: Mesh;
  solid: Material | Material[];
  undrawn: Material | Material[];
  depth: Mesh;
  ghost: Mesh;
}
/** `groups`: every Group in the kart (three takes a mesh's group order from its nearest Group, so each carries the kart's) */
interface Rival { root: Object3D; groups: Object3D[]; parts: Part[]; alpha: { value: number }; on: boolean; dist: number }

/** `m`'s patch and program key, then ours on top (a clone copies neither, so it would lose the other systems' patches). */
function variant(src: Material, alpha: { value: number }, key: string, frag: (s: string) => string): Material {
  const v = src.clone();
  v.userData.shared = false;
  v.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile(shader, renderer);
    shader.uniforms.uGhost = alpha;
    shader.fragmentShader = frag(`uniform float uGhost;\n${shader.fragmentShader}`);
  };
  v.customProgramCacheKey = () => `${src.customProgramCacheKey()}|${key}`;
  return v;
}

/** The see-through copy: the kart's own look at the kart's opacity, only where the depth copy let it through. */
function ghostMaterial(src: Material, alpha: { value: number }): Material {
  const v = variant(src, alpha, 'ghost', (s) => s.replace('#include <opaque_fragment>', 'diffuseColor.a *= uGhost;\n#include <opaque_fragment>'));
  v.transparent = true;
  v.depthWrite = false;
  return v;
}

/** The depth-only copy, drawn first: the ghost's front surface, and nothing once the kart is nearly gone. */
function depthMaterial(src: Material, alpha: { value: number }): Material {
  const v = variant(src, alpha, 'ghostdepth', (s) => s.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n  if (uGhost < ${GHOST.depthBelow.toFixed(2)}) discard;`));
  v.transparent = true; // drawn in the see-through pass, just before its ghost
  v.colorWrite = false;
  v.depthWrite = true;
  // a hair behind the surface, so the ghost's own front always passes the depth test
  v.polygonOffset = true;
  v.polygonOffsetFactor = 1;
  v.polygonOffsetUnits = 1;
  return v;
}

const each = <T>(m: Material | Material[], f: (x: Material) => T): T | T[] => (Array.isArray(m) ? m.map(f) : f(m));

/**
 * A copy of a kart's mesh in other materials, sharing its geometry: a rigged kart's (art-pipeline
 * rigged.ts) is skinned to the kart's own skeleton with its bind, so the ghost moves as the kart does
 * (a plain mesh on a skinned geometry would draw the driver standing at the bind pose).
 */
function copyOf(mesh: Mesh, material: Material | Material[]): Mesh {
  const sk = mesh as SkinnedMesh;
  if (!sk.isSkinnedMesh) return new Mesh(mesh.geometry, material);
  const c = new SkinnedMesh(mesh.geometry, material);
  c.bind(sk.skeleton, sk.bindMatrix);
  c.boundingSphere = sk.boundingSphere?.clone() ?? null;
  return c;
}

/** Rival karts near the lens, for one race. Build it, `add` each rival's kart once its flames are on, `dispose` with the race. */
export class KartFader {
  private readonly rivals: Rival[] = [];
  /** the ghosts this frame, farthest first (reused: no garbage) */
  private readonly ghosts: Rival[] = [];

  /** `scene`: the one the race draws in (its onBeforeRender runs every fader, once hooked). */
  constructor(scene: Scene) {
    hook(scene);
    LIVE.push(this);
  }

  /** A rival's kart: ghost copies for each of its meshes (hidden until it nears the lens), and its flames fade with it. */
  add(root: Object3D): void {
    const alpha = { value: 1 };
    const meshes: Mesh[] = [], groups: Object3D[] = [];
    root.traverse((o) => {
      if ((o as Object3D & { isGroup?: boolean }).isGroup) groups.push(o);
      const m = o as Mesh;
      if (!m.isMesh || !m.material) return;
      if (m.name === 'exhaust-flame') {
        // the flames fade with the kart (its opacity, shared), smoothly: glowing light needs no ghost pass
        const u = (m.material as ShaderMaterial).uniforms;
        if (u?.uKart) { u.uKart = alpha; u.uFade.value = CAM.kartFade; }
        return;
      }
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.some((x) => x.transparent || !x.visible)) return; // already see-through (glass) or never drawn
      meshes.push(m);
    });
    const parts: Part[] = meshes.map((mesh) => {
      const depth = copyOf(mesh, each(mesh.material, (x) => depthMaterial(x, alpha)));
      const ghost = copyOf(mesh, each(mesh.material, (x) => ghostMaterial(x, alpha)));
      depth.name = 'ghost-depth';
      ghost.name = 'ghost';
      depth.renderOrder = mesh.renderOrder - 1;
      ghost.renderOrder = mesh.renderOrder;
      // the kart still casts its shadow while it is a ghost (from the depth copy)
      depth.castShadow = mesh.castShadow;
      depth.customDepthMaterial = mesh.customDepthMaterial;
      ghost.castShadow = false;
      depth.receiveShadow = ghost.receiveShadow = mesh.receiveShadow;
      for (const c of [depth, ghost]) {
        c.visible = false;
        c.frustumCulled = mesh.frustumCulled;
        // the same morph targets and influences as the mesh (the driver leans, the wheels steer)
        c.morphTargetDictionary = mesh.morphTargetDictionary;
        if (mesh.morphTargetInfluences) c.morphTargetInfluences = mesh.morphTargetInfluences;
      }
      mesh.add(depth, ghost);
      return { mesh, solid: mesh.material, undrawn: each(mesh.material, () => UNDRAWN), depth, ghost };
    });
    this.rivals.push({ root, groups, parts, alpha, on: false, dist: Infinity });
  }

  /** Each rival's opacity from the camera drawing this frame, and its meshes switched to their ghosts near the lens. Allocates nothing. */
  update(camera: Camera): void {
    const c = camera.matrixWorld.elements;
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      const e = r.root.matrixWorld.elements;
      // the lens in the kart's own frame (unit axes: a model's fitting scale does not count)
      const dx = c[12] - e[12], dy = c[13] - e[13], dz = c[14] - e[14];
      const sx = Math.hypot(e[0], e[1], e[2]) || 1, sy = Math.hypot(e[4], e[5], e[6]) || 1, sz = Math.hypot(e[8], e[9], e[10]) || 1;
      r.dist = kartBoxDistance(
        (dx * e[0] + dy * e[1] + dz * e[2]) / sx, (dx * e[4] + dy * e[5] + dz * e[6]) / sy, (dx * e[8] + dy * e[9] + dz * e[10]) / sz,
      );
      const a = ghostAlpha(r.dist);
      r.alpha.value = a;
      const on = a < 0.999;
      // set every frame, not only on a change: the warm-up's one draw shows and hides everything round it
      for (let j = 0; j < r.parts.length; j++) {
        const p = r.parts[j];
        p.mesh.material = on ? p.undrawn : p.solid;
        p.depth.visible = on;
        p.ghost.visible = on;
        if (on && p.mesh.morphTargetInfluences) p.depth.morphTargetInfluences = p.ghost.morphTargetInfluences = p.mesh.morphTargetInfluences;
      }
      r.on = on;
    }
    // ghosts draw after the effects, back to front, each one's depth copy just before it
    const g = this.ghosts;
    g.length = 0;
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      if (!r.on) { order(r, 0); continue; }
      let k = g.length;
      g.push(r);
      while (k > 0 && g[k - 1].dist < r.dist) { g[k] = g[k - 1]; k--; }
      g[k] = r;
    }
    for (let i = 0; i < g.length; i++) order(g[i], GHOST.order + i);
  }

  /** Stop following a rival's kart (its model was swapped for another: session.ts); its own materials are put back. */
  remove(root: Object3D): void {
    const i = this.rivals.findIndex((r) => r.root === root);
    if (i < 0) return;
    const r = this.rivals[i];
    order(r, 0);
    for (const p of r.parts) p.mesh.material = p.solid;
    this.rivals.splice(i, 1);
  }

  /** The race is over: stop following its karts (their copies' materials go with the race's). */
  dispose(): void {
    const i = LIVE.indexOf(this);
    if (i >= 0) LIVE.splice(i, 1);
    for (const r of this.rivals) { order(r, 0); for (const p of r.parts) p.mesh.material = p.solid; }
    this.rivals.length = 0;
  }
}

/** A kart's draw order among the see-through things (0: in its usual place). */
function order(r: Rival, n: number): void {
  for (let i = 0; i < r.groups.length; i++) r.groups[i].renderOrder = n;
}

/** The faders of the races alive now (a new race is built before the old one is freed). */
const LIVE: KartFader[] = [];
const HOOKED = new WeakSet<Scene>();

/** Run every live fader before each draw of `scene`, with that draw's camera. */
function hook(scene: Scene): void {
  if (HOOKED.has(scene)) return;
  HOOKED.add(scene);
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args: Parameters<Scene['onBeforeRender']>) {
    prev.apply(this, args);
    for (let i = 0; i < LIVE.length; i++) LIVE[i].update(args[2]);
  };
}

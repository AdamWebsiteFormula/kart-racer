// The shadow pass draws every caster with one shared depth material, and three picks that
// material's shader again (a full parameter scan and key string) each time it goes from an
// instanced caster to a plain one or back. With decor instanced and karts plain that was every few
// casters, every frame: 13 % of all the memory the game allocated (2026-09-24 heap profile). One
// depth material of their own for the instanced casters keeps both shaders steady.
import { MeshDepthMaterial, type InstancedMesh, type Material, type Object3D } from 'three';

/** The depth material every plain-shadowed instanced caster shares (never freed). */
export const INSTANCED_DEPTH = new MeshDepthMaterial();
INSTANCED_DEPTH.userData.shared = true;

/** Whether three would give this caster's material its own depth variant anyway (a cut-out or displaced shadow). */
function ownVariant(m: Material): boolean {
  const x = m as Material & { map?: unknown; alphaMap?: unknown; displacementMap?: unknown; displacementScale?: number };
  return (m.alphaTest > 0 && !!(x.map || x.alphaMap)) || (!!x.displacementMap && x.displacementScale !== 0) || m.alphaToCoverage;
}

/** Give every instanced shadow caster under `root` the instanced depth material; returns how many it set. */
export function splitShadowDepth(root: Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const im = o as InstancedMesh;
    if (!im.isInstancedMesh || !im.castShadow || im.customDepthMaterial) return;
    const mats = Array.isArray(im.material) ? im.material : [im.material];
    if (mats.some(ownVariant)) return;
    im.customDepthMaterial = INSTANCED_DEPTH;
    n++;
  });
  return n;
}

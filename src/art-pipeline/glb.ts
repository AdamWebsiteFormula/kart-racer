// Racer models from files (made with AI image-to-3D, listed in public/models/manifest.json).
// Loaded once at boot; a racer without a model, or before its model arrives, keeps its
// code-built kart (racers.ts). Every model is fitted to the kart footprint: facing +Z,
// centred on the kart, wheels on y = 0, one uniform scale.
import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, type Material, type MeshStandardMaterial, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { decorGeometry } from './decor.ts';
import type { V3 } from './model.ts';

/** The footprint a model is fitted into (metres): nose to tail, side to side, ground to top. */
export const KART_FIT = Object.freeze({ length: 2.1, width: 1.7, height: 2.2 });

export interface ModelSpec {
  url: string;
  /** extra turn about Y (radians) when the source model does not face +Z */
  yaw?: number;
  /** a lamp: its own colours glow this strongly (its bright glass passes the bloom, its dark post stays dark) */
  glow?: number;
}
export type ModelManifest = Record<string, ModelSpec>;

/** Uniform scale, then the offset that centres the box on X and Z and stands it on y = 0. Pure. */
export function fitToKart(min: V3, max: V3, fit = KART_FIT): { scale: number; offset: V3 } {
  const sx = Math.max(1e-6, max[0] - min[0]), sy = Math.max(1e-6, max[1] - min[1]), sz = Math.max(1e-6, max[2] - min[2]);
  const scale = Math.min(fit.length / sz, fit.width / sx, fit.height / sy);
  return { scale, offset: [-((min[0] + max[0]) / 2) * scale, -min[1] * scale, -((min[2] + max[2]) / 2) * scale] };
}

/** The racer models: load them once, then hand out clones that share geometry and materials. */
export class RacerModels {
  private readonly templates = new Map<string, Group>();
  private loading: Promise<void> | null = null;
  private readonly base: string;
  private readonly get_: typeof fetch;

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  /** Fetch the manifest and every model. Safe to call again; fails soft (no file: code karts). */
  load(): Promise<void> {
    this.loading ??= (async () => {
      const r = await this.get_(`${this.base}models/manifest.json`).catch(() => null);
      if (!r?.ok) return;
      const manifest = (await r.json().catch(() => ({}))) as ModelManifest;
      const loader = new GLTFLoader();
      await Promise.all(Object.entries(manifest).map(async ([racerId, spec]) => {
        try {
          const gltf = await loader.loadAsync(`${this.base}${spec.url}`);
          this.templates.set(racerId, this.fitted(gltf.scene, spec.yaw ?? 0));
        } catch { /* a broken file leaves that racer on its code-built kart */ }
      }));
    })();
    return this.loading;
  }

  private fitted(scene: Object3D, yaw: number): Group {
    scene.rotation.y = yaw;
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const { scale, offset } = fitToKart([box.min.x, box.min.y, box.min.z], [box.max.x, box.max.y, box.max.z]);
    const root = new Group();
    root.scale.setScalar(scale);
    root.position.set(offset[0], offset[1], offset[2]);
    root.add(scene);
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      // shared by every clone and every race: a finished race must not dispose them
      for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as Material[]) mat.userData.shared = true;
    });
    const holder = new Group();
    holder.add(root);
    return holder;
  }

  has(racerId: string): boolean { return this.templates.has(racerId); }

  /** A fresh copy of a racer's model (geometry and materials shared), or null when there is none. */
  make(racerId: string): Group | null {
    const t = this.templates.get(racerId);
    if (!t) return null;
    const g = t.clone(true);
    g.name = `racer-${racerId}`;
    return g;
  }
}

/** The game's one set of racer models. main.ts starts the load at boot. */
export const RACER_MODELS = new RacerModels();

// ---------------------------------------------------------------- scenery

/** A mesh's geometry as plain floats with its node transform baked in (quantised files store int16). */
export function bakedGeometry(mesh: Mesh): BufferGeometry {
  const src = mesh.geometry, g = new BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = src.getAttribute(name);
    if (!a) continue;
    const size = a.itemSize, out = new Float32Array(a.count * size);
    for (let i = 0; i < a.count; i++) {
      out[i * size] = a.getX(i);
      if (size > 1) out[i * size + 1] = a.getY(i);
      if (size > 2) out[i * size + 2] = a.getZ(i);
    }
    g.setAttribute(name, new BufferAttribute(out, size));
  }
  if (src.index) g.setIndex(src.index.clone());
  mesh.updateWorldMatrix(true, false);
  g.applyMatrix4(mesh.matrixWorld);
  return g;
}

/**
 * Fit a geometry onto the box of the code-built model it replaces: the same height, centred on
 * the same spot, standing on the same floor, so every placement and clearance stays true. Pure.
 */
export function fitToBox(g: BufferGeometry, target: Box3): BufferGeometry {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const s = (target.max.y - target.min.y) / Math.max(1e-6, b.max.y - b.min.y);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  g.translate((target.min.x + target.max.x) / 2, target.min.y, (target.min.z + target.max.z) / 2);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * Scenery models from files (public/models/props.json, made with AI image-to-3D): each replaces
 * the code-built model of the same name, fitted to its box. Loaded once at boot; a prop without a
 * file, or before it arrives, stays code-built.
 */
export class PropModels {
  private readonly ready = new Map<string, { geometry: BufferGeometry; material: Material }>();
  private loading: Promise<void> | null = null;
  private readonly base: string;
  private readonly get_: typeof fetch;

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  load(): Promise<void> {
    this.loading ??= (async () => {
      const r = await this.get_(`${this.base}models/props.json`).catch(() => null);
      if (!r?.ok) return;
      const manifest = (await r.json().catch(() => ({}))) as ModelManifest;
      const loader = new GLTFLoader();
      await Promise.all(Object.entries(manifest).map(async ([name, spec]) => {
        const target = decorGeometry(name)?.body.boundingBox;
        if (!target) return;
        try {
          const gltf = await loader.loadAsync(`${this.base}${spec.url}`);
          let mesh: Mesh | undefined;
          gltf.scene.traverse((o) => { if (!mesh && (o as Mesh).isMesh) mesh = o as Mesh; });
          if (!mesh) return;
          const geometry = bakedGeometry(mesh);
          geometry.rotateY(spec.yaw ?? 0);
          fitToBox(geometry, target);
          const material = mesh.material as Material;
          material.userData.shared = true;
          const std = material as MeshStandardMaterial;
          if (spec.glow && std.isMeshStandardMaterial) { std.emissiveMap = std.map; std.emissive.set(0xffffff); std.emissiveIntensity = spec.glow; }
          this.ready.set(name, { geometry, material });
        } catch { /* a broken file leaves that prop code-built */ }
      }));
    })();
    return this.loading;
  }

  get(name: string): { geometry: BufferGeometry; material: Material } | undefined { return this.ready.get(name); }
}

/** The game's one set of scenery models. main.ts starts the load at boot. */
export const PROP_MODELS = new PropModels();

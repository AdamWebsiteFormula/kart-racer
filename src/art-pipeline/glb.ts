// Racer models from files (made with AI image-to-3D, listed in public/models/manifest.json).
// Loaded once at boot; a racer without a model, or before its model arrives, keeps its
// code-built kart (racers.ts). Every model is fitted to the kart footprint: facing +Z,
// centred on the kart, wheels on y = 0, one uniform scale.
import { Box3, Group, Mesh, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { V3 } from './model.ts';

/** The footprint a model is fitted into (metres): nose to tail, side to side, ground to top. */
export const KART_FIT = Object.freeze({ length: 2.1, width: 1.7, height: 2.2 });

export interface ModelSpec {
  url: string;
  /** extra turn about Y (radians) when the source model does not face +Z */
  yaw?: number;
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

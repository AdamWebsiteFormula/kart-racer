// Racer models from files (made with AI image-to-3D, listed in public/models/manifest.json).
// Loaded once at boot; a racer without a model, or before its model arrives, keeps its
// code-built kart (racers.ts). Every model is fitted to the kart footprint: facing +Z,
// centred on the kart, wheels on y = 0, one uniform scale.
import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, Source, type Material, type MeshStandardMaterial, type Object3D, type Texture } from 'three';
import { SEAT } from './bodies.ts';
import { paintFor, repaintPixels, type PaintRule } from './paints.ts';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { decorGeometry } from './decor.ts';
import type { V3 } from './model.ts';
import { MODEL_WHEELS, rigKart } from './rig.ts';
import { atOnce, type Schedule } from '../performance/loadQueue.ts';
import type { TrackDefinition } from '../track-builder/types.ts';

/** The footprint a model is fitted into (metres): nose to tail, side to side, ground to top. */
export const KART_FIT = Object.freeze({ length: 2.1, width: 1.7, height: 2.2 });

export interface ModelSpec {
  url: string;
  /** extra turn about Y (radians) when the source model does not face +Z */
  yaw?: number;
  /** a lamp: its own colours glow this strongly (its bright glass passes the bloom, its dark post stays dark) */
  glow?: number;
  /** a prop: match the code-built model's height (default) or its widest side (a flat cloud bank) */
  fit?: 'height' | 'width';
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
  private list: Promise<ModelManifest | null> | null = null;
  /** the manifest once in (null: not yet, or none) */
  private manifest: ModelManifest | null = null;
  private listFailed = false;
  /** racers not started yet, the most wanted first (want() puts a race's own racers at the front) */
  private todo: string[] | null = null;
  /** each racer's load, from the moment it starts */
  private readonly started = new Map<string, Promise<void>>();
  /** racers whose file failed (they stay on their code-built karts) */
  private readonly failed = new Set<string>();
  private loader: GLTFLoader | null = null;
  private readonly base: string;
  private readonly get_: typeof fetch;

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  /** The manifest, fetched once (not through the line: it is a few hundred bytes). */
  private files(): Promise<ModelManifest | null> {
    this.list ??= this.get_(`${this.base}models/manifest.json`)
      .then((r) => (r.ok ? r.json() as Promise<ModelManifest> : null))
      .catch(() => null)
      .then((m) => {
        this.manifest = m && typeof m === 'object' ? m : null;
        this.listFailed = this.manifest === null;
        this.todo ??= this.manifest ? Object.keys(this.manifest).filter((id) => !this.started.has(id)) : [];
        return this.manifest;
      });
    return this.list;
  }

  /**
   * Fetch the manifest and every model, each file through `schedule` (performance/loadQueue.ts: a
   * few at a time, in turn); each turn loads the most wanted racer not started yet, so a race asking
   * for its own racers (want) jumps the line. Safe to call again; fails soft (no file: code karts).
   */
  load(schedule: Schedule = atOnce): Promise<void> {
    this.loading ??= (async () => {
      const manifest = await this.files();
      if (!manifest) return;
      await Promise.all(Object.keys(manifest).map(() => schedule(() => this.next())));
    })();
    return this.loading;
  }

  /**
   * These racers first (a race picked before their models came down: main.ts, its racers, the
   * player's first): each one not started yet moves to the front of the line and gets a turn of its
   * own through `schedule` (a better rank than the rest). Resolves once each of them is in or failed.
   */
  want(ids: readonly string[], schedule: Schedule): Promise<void> {
    return (async () => {
      const manifest = await this.files();
      if (!manifest) return;
      const listed = ids.filter((id) => Object.hasOwn(manifest, id));
      const fresh = listed.filter((id) => !this.started.has(id));
      this.todo = [...fresh, ...(this.todo ?? []).filter((id) => !fresh.includes(id))];
      // each turn takes the front of the line: the wanted racers, whichever turn comes first
      await Promise.all(fresh.map(() => schedule(() => this.next())));
      await Promise.all(listed.map((id) => this.started.get(id)));
    })();
  }

  /** Load the most wanted racer not started yet (nothing when every one has started). */
  private next(): Promise<void> {
    const id = this.todo?.shift();
    const spec = id !== undefined ? this.manifest?.[id] : undefined;
    if (id === undefined || !spec) return Promise.resolve();
    const p = (async () => {
      try {
        const gltf = await (this.loader ??= new GLTFLoader()).loadAsync(`${this.base}${spec.url}`);
        this.templates.set(id, rigRacer(this.fitted(gltf.scene, spec.yaw ?? 0), id));
      } catch { this.failed.add(id); /* a broken file leaves that racer on its code-built kart */ }
    })();
    this.started.set(id, p);
    return p;
  }

  /** Nothing more will come for this racer: its model is in, its file failed, or it has none (once the list is in or failed). */
  settled(racerId: string): boolean {
    return this.templates.has(racerId) || this.failed.has(racerId) || this.listFailed || (this.manifest !== null && !Object.hasOwn(this.manifest, racerId));
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

  /**
   * A fresh copy of a racer's model (geometry and materials shared), or null when there is none. With
   * an alt paint (paints.ts), it wears that paint's material: the colour texture repainted once, shared.
   */
  make(racerId: string, paintId?: string): Group | null {
    const t = this.templates.get(racerId);
    if (!t) return null;
    const g = t.clone(true);
    g.name = `racer-${racerId}`;
    const alt = this.paintMaterial(racerId, paintId);
    if (alt) g.traverse((o) => { if ((o as Mesh).isMesh) (o as Mesh).material = alt; });
    return g;
  }

  /**
   * The driver alone, cut out of the racer's model (DRIVER_CUTS) and seated at bodies.ts SEAT, for a
   * shared body; null when the racer has no model file. The cut geometry is made once and shared.
   */
  driver(racerId: string, paintId?: string): Mesh | null {
    const t = this.templates.get(racerId), cut = DRIVER_CUTS[racerId];
    if (!t || !cut) return null;
    let geo = this.drivers.get(racerId);
    if (!geo) {
      let src: Mesh | undefined;
      t.updateMatrixWorld(true);
      t.traverse((o) => { if (!src && (o as Mesh).isMesh) src = o as Mesh; });
      if (!src) return null;
      geo = clipDriver(bakedGeometry(src), cut);
      // it leans, looks and nods about its hips, seated at SEAT, and rides the body's springs (rig.ts)
      rigKart(geo, null, { driver: { y: SEAT.y, x: 2, z: [-2, 2], at: SEAT.z }, onSprings: true });
      this.drivers.set(racerId, geo);
      this.driverMaterial.set(racerId, src.material as Material);
    }
    const m = new Mesh(geo, this.paintMaterial(racerId, paintId) ?? this.driverMaterial.get(racerId)!);
    m.name = `driver-${racerId}`;
    m.castShadow = true;
    return m;
  }

  private readonly drivers = new Map<string, BufferGeometry>();
  private readonly driverMaterial = new Map<string, Material>();
  private readonly paints = new Map<string, Material | null>();
  /** repaints a colour texture (browser: through a canvas); tests put a fake here */
  repaintTexture: (map: Texture, rules: readonly PaintRule[]) => Texture | null = repaintTextureInCanvas;

  /** The racer's material in an alt paint (made once, shared by every kart and race), or null for their own colours. */
  paintMaterial(racerId: string, paintId: string | undefined): Material | null {
    const paint = paintFor(racerId, paintId);
    const t = this.templates.get(racerId);
    if (!paint || !t) return null;
    const key = `${racerId}|${paint.id}`;
    if (this.paints.has(key)) return this.paints.get(key)!;
    let base: Material | undefined;
    t.traverse((o) => { if (!base && (o as Mesh).isMesh) base = (o as Mesh).material as Material; });
    const std = base as MeshStandardMaterial | undefined;
    const map = std?.map ? this.repaintTexture(std.map, paint.rules) : null;
    let out: Material | null = null;
    if (std && map) {
      const m = std.clone();
      m.map = map;
      m.userData.shared = true; // every race's kart shares it: a finished race must not dispose it
      m.userData.paint = paint.id;
      out = m;
    }
    this.paints.set(key, out);
    return out;
  }
}

/**
 * A fitted model's moving parts as morph targets (rig.ts): its driver (DRIVER_CUTS) leans, looks
 * and nods, its front wheels (MODEL_WHEELS) steer and its body rides on them. Every clone shares
 * the targets and has its own influences, which KartView sets. Returns `holder`.
 */
export function rigRacer(holder: Group, racerId: string): Group {
  holder.updateMatrixWorld(true);
  holder.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || m.geometry.morphAttributes.position) return;
    rigKart(m.geometry, m.matrixWorld, { driver: DRIVER_CUTS[racerId], wheels: MODEL_WHEELS[racerId] });
    m.updateMorphTargets();
  });
  return holder;
}

/** Repaint a texture's pixels through a canvas (once); null where there is no 2D canvas (tests, very old browsers). */
function repaintTextureInCanvas(map: Texture, rules: readonly PaintRule[]): Texture | null {
  const img = map.image as { width?: number; height?: number } | null;
  const w = img?.width ?? 0, h = img?.height ?? 0;
  if (!w || !h || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext?.('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img as CanvasImageSource, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  repaintPixels(data.data, rules);
  ctx.putImageData(data, 0, 0);
  return textureWithImage(map, c);
}

/**
 * A copy of `map` (same sampler, flip and colour space) showing `image`. A texture's clone shares its
 * Source with the original, so setting the clone's image repaints the original too (every kart of the
 * racer wore the alt paint, 24 Sept 2026): the copy gets a Source of its own.
 */
export function textureWithImage(map: Texture, image: unknown): Texture {
  const t = map.clone();
  t.source = new Source(image);
  t.needsUpdate = true;
  return t;
}

/**
 * Where each racer's driver is, in the fitted kart frame (glb.ts fitToKart): triangles whose centre
 * is above `y`, within `x` of the centre line and between `z[0]` and `z[1]`, and in none of the
 * `drop` boxes ([x0, x1, y0, y1, z0, z1]: a food-truck awning, a roll cage over a head), are the
 * driver. `at` is the driver's middle along z, which lands on bodies.ts SEAT.z. Tuned by eye
 * against front, back and side renders (24 Sept 2026); the cut sits under the cockpit rim.
 */
export interface DriverCut { y: number; x: number; z: readonly [number, number]; at: number; drop?: readonly (readonly [number, number, number, number, number, number])[] }
export const DRIVER_CUTS: Readonly<Record<string, DriverCut>> = Object.freeze({
  pip: { y: 0.62, x: 0.6, z: [-0.45, 0.9], at: -0.2 },
  momo: { y: 0.58, x: 0.34, z: [-0.55, 0.45], at: -0.1, drop: [[-1, 1, 1.38, 3, -1, 1]] },
  nova: { y: 0.66, x: 0.9, z: [-0.7, 0.4], at: -0.1 },
  juniper: { y: 0.66, x: 0.45, z: [-0.45, 0.45], at: 0 },
  otto: { y: 0.56, x: 0.5, z: [-0.5, 0.5], at: 0 },
  sprocket: { y: 0.55, x: 0.45, z: [-0.5, 0.5], at: 0 },
  boulder: { y: 0.8, x: 0.66, z: [-0.55, 0.6], at: 0 },
  gus: { y: 0.82, x: 0.6, z: [-0.75, 0.8], at: 0.1, drop: [[0.3, 1, 0.8, 3, -1, 0.1], [-1, 1, 0.8, 1.05, -1, -0.45]] },
});

/**
 * Keep only the driver's triangles (by their centres, see DriverCut), then move them so the cut sits
 * at SEAT. `g` is in the fitted kart frame (bakedGeometry of a fitted template). Pure: returns a new
 * geometry that shares nothing with `g`.
 */
export function clipDriver(g: BufferGeometry, cut: DriverCut): BufferGeometry {
  const pos = g.getAttribute('position');
  const src = g.index ? Array.from(g.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const keep: number[] = [];
  const inDrop = (x: number, y: number, z: number) => (cut.drop ?? []).some((b) => x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3] && z >= b[4] && z <= b[5]);
  for (let i = 0; i + 2 < src.length; i += 3) {
    const a = src[i], b = src[i + 1], c = src[i + 2];
    const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    if (y < cut.y || Math.abs(x) > cut.x || z < cut.z[0] || z > cut.z[1] || inDrop(x, y, z)) continue;
    keep.push(a, b, c);
  }
  // compact: only the vertices the kept triangles use
  const remap = new Map<number, number>();
  const order: number[] = [];
  const idx = new Uint32Array(keep.length);
  keep.forEach((v, i) => { let n = remap.get(v); if (n === undefined) { n = order.length; remap.set(v, n); order.push(v); } idx[i] = n; });
  const out = new BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const size = a.itemSize, arr = new Float32Array(order.length * size);
    order.forEach((v, i) => { for (let k = 0; k < size; k++) arr[i * size + k] = a.getComponent(v, k); });
    out.setAttribute(name, new BufferAttribute(arr, size));
  }
  out.setIndex(new BufferAttribute(idx, 1));
  out.translate(0, SEAT.y - cut.y, SEAT.z - cut.at);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
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
 * Fit a geometry onto the box of the code-built model it replaces: the same height (or the same
 * widest side), centred on the same spot, standing on the same floor, so every placement and
 * clearance stays true. One uniform scale. Pure.
 */
export function fitToBox(g: BufferGeometry, target: Box3, by: 'height' | 'width' = 'height'): BufferGeometry {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const wide = (x: Box3) => Math.max(x.max.x - x.min.x, x.max.z - x.min.z);
  const s = by === 'width' ? wide(target) / Math.max(1e-6, wide(b)) : (target.max.y - target.min.y) / Math.max(1e-6, b.max.y - b.min.y);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  g.translate((target.min.x + target.max.x) / 2, target.min.y, (target.min.z + target.max.z) / 2);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * The scenery models a track's scene asks for (PROP_MODELS names): its landmark, its decor and its
 * hazards' creatures and props. Pure; the names with no model file are the caller's to skip. A track
 * can load just these first (main.ts: the title's track before the rest).
 */
export function trackProps(def: Pick<TrackDefinition, 'landmark' | 'environment' | 'hazards'>): string[] {
  const out = new Set<string>();
  if (def.landmark) out.add(def.landmark);
  for (const d of def.environment?.decor ?? []) out.add(d.asset);
  for (const h of def.hazards ?? []) {
    if (h.creature) out.add(h.creature);
    if (h.asset) out.add(h.asset);
  }
  return [...out];
}

/**
 * Scenery models from files (public/models/props.json, made with AI image-to-3D): each replaces
 * the code-built model of the same name, fitted to its box. A prop without a file, or before it
 * arrives, stays code-built; main.ts loads the title's track's first, then the rest.
 */
export class PropModels {
  private readonly ready = new Map<string, { geometry: BufferGeometry; material: Material }>();
  private manifest: Promise<ModelManifest | null> | null = null;
  /** each prop's load, started once */
  private readonly started = new Map<string, Promise<void>>();
  private loader: GLTFLoader | null = null;
  private readonly base: string;
  private readonly get_: typeof fetch;

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  /**
   * Fetch the models of `names` (every prop in the manifest when left out), each file through
   * `schedule` (performance/loadQueue.ts: a few at a time, in turn). A prop already asked for is not
   * asked again. Safe to call again; fails soft (no file: code-built props).
   */
  load(names?: Iterable<string>, schedule: Schedule = atOnce): Promise<void> {
    return (async () => {
      const manifest = await (this.manifest ??= this.get_(`${this.base}models/props.json`)
        .then((r) => (r.ok ? r.json() as Promise<ModelManifest> : null)).catch(() => null));
      if (!manifest) return;
      const want = names ? [...names].filter((n) => Object.hasOwn(manifest, n)) : Object.keys(manifest);
      await Promise.all(want.map((name) => {
        let p = this.started.get(name);
        if (!p) {
          p = schedule(() => this.loadOne(name, manifest[name])).catch(() => undefined);
          this.started.set(name, p);
        }
        return p;
      }));
    })();
  }

  private async loadOne(name: string, spec: ModelSpec): Promise<void> {
    const target = decorGeometry(name)?.body.boundingBox;
    if (!target) return;
    try {
      const gltf = await (this.loader ??= new GLTFLoader()).loadAsync(`${this.base}${spec.url}`);
      let mesh: Mesh | undefined;
      gltf.scene.traverse((o) => { if (!mesh && (o as Mesh).isMesh) mesh = o as Mesh; });
      if (!mesh) return;
      const geometry = bakedGeometry(mesh);
      geometry.rotateY(spec.yaw ?? 0);
      fitToBox(geometry, target, spec.fit);
      const material = mesh.material as Material;
      material.userData.shared = true;
      const std = material as MeshStandardMaterial;
      if (spec.glow && std.isMeshStandardMaterial) { std.emissiveMap = std.map; std.emissive.set(0xffffff); std.emissiveIntensity = spec.glow; }
      this.ready.set(name, { geometry, material });
    } catch { /* a broken file leaves that prop code-built */ }
  }

  get(name: string): { geometry: BufferGeometry; material: Material } | undefined { return this.ready.get(name); }
}

/** The game's one set of scenery models. main.ts starts the load at boot. */
export const PROP_MODELS = new PropModels();

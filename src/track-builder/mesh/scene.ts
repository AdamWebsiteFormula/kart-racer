// buildTrackScene(track, assets) → TrackScene. Reads the sim layer, never the other way.
// Everything here is a Mesh or InstancedMesh with exactly one material, so the object
// count is the draw-call count. Placeholder geometries stand in until art-pipeline
// supplies real ones through `assets`.
import {
  BackSide, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Group,
  InstancedMesh, InstancedBufferAttribute, Mesh, MeshToonMaterial, PlaneGeometry, SphereGeometry, Matrix4,
} from 'three';
import { headingOf } from '../../kart-controller/types.ts';
import { BUILDER } from '../constants.ts';
import type { Track } from '../track.ts';
import type { BakedFeature, TrackChanged } from '../types.ts';
import { buildBranchChunks, chunkTouched, rebuildChunk, type Chunk } from './chunks.ts';
import { hashString, mulberry32, placeBarriers, placeDecor, pushTransform, type DecorPlacement } from './decor.ts';
import { paletteFor, type Rgb, type TrackPalette } from './palette.ts';

export interface TrackAssets {
  /** keyed by decor asset, barrier asset, `balloon`, `coin`, `boostPad`, `ramp`, hazard asset, landmark id */
  geometries?: Record<string, BufferGeometry>;
}

export interface TrackScene {
  group: Group;
  palette: TrackPalette;
  chunks: Chunk[];
  decor: DecorPlacement[];
  /** name → instancer; names: barriers, balloons, coins, boostPads, ramps, hazard:<asset>, decor:<asset> */
  instancers: Map<string, InstancedMesh>;
  fog: { color: Rgb; density: number };
  sky: string | undefined;
  /** move hazards to their position at race time `time` (seconds) */
  update(time: number): void;
  /** Mesh + InstancedMesh objects in the group (draw-call proxy) */
  drawables(): number;
  dispose(): void;
}

const SKY_RADIUS = 900;
const GROUND_SIZE = 2400;
const START_LINE_LENGTH = 1.5;

function toColor(c: Rgb): Color { return new Color(c[0], c[1], c[2]); }

function placeholder(name: string): BufferGeometry {
  switch (name) {
    case 'balloon': return new SphereGeometry(BUILDER.balloonRadius, 12, 8);
    case 'coin': return new CylinderGeometry(BUILDER.coinRadius, BUILDER.coinRadius, 0.1, 12).rotateX(Math.PI / 2);
    case 'boostPad': return new BoxGeometry(1, 0.05, 1).translate(0, 0.025, 0);
    case 'ramp': return new BoxGeometry(1, 0.6, 3).translate(0, 0.3, 0);
    case 'barrier': return new BoxGeometry(0.6, 0.8, 0.6).translate(0, 0.4, 0);
    case 'hazard': return new SphereGeometry(BUILDER.hazardRadius, 8, 6);
    case 'landmark': return new ConeGeometry(4, 24, 8).translate(0, 12, 0);
    default: return new BoxGeometry(2, 4, 2).translate(0, 2, 0);
  }
}

function geometryFor(assets: TrackAssets, name: string, fallback = name): BufferGeometry {
  return assets.geometries?.[name] ?? placeholder(fallback);
}

function instancer(name: string, geometry: BufferGeometry, colour: Rgb, matrices: Float32Array, capacity = matrices.length / 16): InstancedMesh {
  const mat = new MeshToonMaterial({ color: toColor(colour) });
  const m = new InstancedMesh(geometry, mat, Math.max(1, capacity));
  m.name = name;
  m.count = matrices.length / 16;
  m.instanceMatrix = new InstancedBufferAttribute(padTo(matrices, Math.max(1, capacity) * 16), 16);
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = true;
  return m;
}

function padTo(a: Float32Array, length: number): Float32Array {
  if (a.length === length) return a;
  const out = new Float32Array(length);
  out.set(a.subarray(0, Math.min(a.length, length)));
  return out;
}

function featureMatrices(track: Track, kind: BakedFeature['kind']): Float32Array {
  const out: number[] = [];
  for (const f of track.features) {
    if (f.kind !== kind) continue;
    const c = track.sample(f.t, 0, f.branch);
    const yaw = headingOf(c.tangent);
    if (kind === 'pickup') pushTransform(out, [f.position[0], f.position[1] + BUILDER.balloonHeight, f.position[2]], yaw);
    else if (kind === 'coin') pushTransform(out, [f.position[0], f.position[1] + BUILDER.coinRadius + 0.2, f.position[2]], yaw);
    else if (kind === 'boostPad') pushTransform(out, f.position, yaw, [f.width, 1, BUILDER.boostPadHalfLength * 2]);
    else pushTransform(out, f.position, yaw, [f.width, 1, 1]);
  }
  return Float32Array.from(out);
}

export function buildTrackScene(track: Track, assets: TrackAssets = {}): TrackScene {
  const def = track.def;
  const env = def.environment ?? {};
  const palette = paletteFor(def);
  const group = new Group();
  group.name = `track-${def.id}`;
  const instancers = new Map<string, InstancedMesh>();
  const branches = track.branches;

  // road chunks: one shared toon material, vertex colours
  const roadMaterial = new MeshToonMaterial({ vertexColors: true });
  const chunks: Chunk[] = [];
  for (const b of branches.list) chunks.push(...buildBranchChunks(b, branches.main, palette, roadMaterial));
  for (const c of chunks) group.add(c.mesh);

  // barriers
  const addBarriers = () => {
    instancers.get('barriers')?.removeFromParent();
    const m = instancer('barriers', geometryFor(assets, `${def.biome}-barrier`, 'barrier'), palette.barrier, placeBarriers(branches));
    instancers.set('barriers', m);
    group.add(m);
  };
  addBarriers();

  // decor: one instancer per asset, seeded by the track id
  const groundY = env.ground?.y ?? 0;
  const rng = mulberry32(hashString(def.id));
  const decor: DecorPlacement[] = [];
  for (const entry of env.decor ?? []) {
    const p = placeDecor(branches, entry, rng, groundY);
    decor.push(p);
    const m = instancer(`decor:${entry.asset}`, geometryFor(assets, entry.asset, 'decor'), palette.decor, p.matrices);
    instancers.set(m.name, m);
    group.add(m);
  }

  // features: balloons, coins, boost pads, ramps
  const featureNames: [string, BakedFeature['kind'], string, Rgb][] = [
    ['balloons', 'pickup', 'balloon', palette.accent],
    ['coins', 'coin', 'coin', [1, 0.84, 0.2]],
    ['boostPads', 'boostPad', 'boostPad', palette.surfaces.boost],
    ['ramps', 'jump', 'ramp', palette.surfaces.road],
  ];
  const addFeatures = () => {
    for (const [name, kind, geo, colour] of featureNames) {
      instancers.get(name)?.removeFromParent();
      const mats = featureMatrices(track, kind);
      if (mats.length === 0) { instancers.delete(name); continue; }
      const m = instancer(name, geometryFor(assets, geo), colour, mats);
      instancers.set(name, m);
      group.add(m);
    }
  };
  addFeatures();

  // hazards: one instancer per asset, capacity = authored count, moved by update(time)
  const hazardAsset = new Map<string, string>();
  const hazardCapacity = new Map<string, number>();
  (def.hazards ?? []).forEach((h, i) => {
    const asset = h.asset ?? h.type;
    hazardAsset.set(h.id ?? `hazard-${i}`, asset);
    hazardCapacity.set(asset, (hazardCapacity.get(asset) ?? 0) + 1);
  });
  for (const [asset, cap] of hazardCapacity) {
    const m = instancer(`hazard:${asset}`, geometryFor(assets, asset, 'hazard'), palette.accent, new Float32Array(0), cap);
    instancers.set(m.name, m);
    group.add(m);
  }
  const scratch = new Matrix4();
  const update = (time: number) => {
    const counts = new Map<string, number>();
    for (const m of instancers.values()) if (m.name.startsWith('hazard:')) counts.set(m.name, 0);
    for (const h of track.activeHazards(time)) {
      if (h.type === 'gust') continue;
      const name = `hazard:${hazardAsset.get(h.id) ?? h.type}`;
      const m = instancers.get(name);
      if (!m) continue;
      const i = counts.get(name) ?? 0;
      if (i * 16 >= m.instanceMatrix.array.length) continue;
      scratch.makeTranslation(h.position[0], h.position[1] + h.radius, h.position[2]);
      m.setMatrixAt(i, scratch);
      counts.set(name, i + 1);
    }
    for (const [name, n] of counts) {
      const m = instancers.get(name)!;
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }
  };
  update(0);

  // start line: one quad, polygon offset so it never z-fights the road
  const start = track.sample(track.startT, 0);
  const startLine = new Mesh(
    new PlaneGeometry(start.halfWidth * 2, START_LINE_LENGTH).rotateX(-Math.PI / 2),
    new MeshToonMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  startLine.name = 'start-line';
  startLine.position.set(start.position[0], start.position[1] + 0.01, start.position[2]);
  startLine.rotation.y = headingOf(start.tangent);
  group.add(startLine);

  // ground: one plane (or water), none for sky tracks
  const groundKind = env.ground?.kind ?? 'plane';
  if (groundKind !== 'none') {
    const ground = new Mesh(new PlaneGeometry(GROUND_SIZE, GROUND_SIZE).rotateX(-Math.PI / 2), new MeshToonMaterial({ color: toColor(palette.ground) }));
    ground.name = `ground-${groundKind}`;
    ground.position.y = groundY;
    ground.receiveShadow = true;
    group.add(ground);
  }

  // sky: one dome
  const sky = new Mesh(new SphereGeometry(SKY_RADIUS, 24, 12), new MeshToonMaterial({ color: toColor(palette.background), side: BackSide, fog: false }));
  sky.name = 'sky';
  group.add(sky);

  // landmark: at the loop's bounding-box centre on the ground
  if (def.landmark) {
    const lut = branches.main.lut;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < lut.n; i++) {
      if (lut.px[i] < minX) minX = lut.px[i]; if (lut.px[i] > maxX) maxX = lut.px[i];
      if (lut.pz[i] < minZ) minZ = lut.pz[i]; if (lut.pz[i] > maxZ) maxZ = lut.pz[i];
    }
    const landmark = new Mesh(geometryFor(assets, def.landmark, 'landmark'), new MeshToonMaterial({ color: toColor(palette.accent) }));
    landmark.name = `landmark-${def.landmark}`;
    landmark.position.set((minX + maxX) / 2, groundKind === 'none' ? lut.minY : groundY, (minZ + maxZ) / 2);
    landmark.castShadow = true;
    group.add(landmark);
  }

  const scene: TrackScene = {
    group, palette, chunks, decor, instancers,
    fog: { color: env.fogColor ? hexOrDefault(env.fogColor, palette.background) : palette.background, density: env.fogDensity ?? 0 },
    sky: env.sky,
    update,
    drawables: () => {
      let n = 0;
      group.traverse((o) => { if ((o as Mesh).isMesh) n++; });
      return n;
    },
    dispose: () => {
      unsubscribe();
      group.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (m.material as MeshToonMaterial).dispose();
      });
      group.clear();
    },
  };

  // Final Lap Shift: instant swap of what changed
  let lastLength = track.length;
  const unsubscribe = track.onChanged((e: TrackChanged) => {
    const routeMoved = Math.abs(e.length - lastLength) > 1e-9;
    lastLength = e.length;
    // only the main LUT ever changes (route or baked surface); branch LUTs are visually fixed
    for (const c of chunks) {
      if (c.branch !== 0) continue;
      const b = branches.main;
      if (routeMoved || chunkTouched(c, b, e.changedRanges)) rebuildChunk(c, b, palette);
    }
    if (routeMoved) addBarriers();
    addFeatures();
    if (e.fogDensity !== undefined) scene.fog.density = e.fogDensity;
    if (e.sky !== undefined) scene.sky = e.sky;
  });

  return scene;
}

function hexOrDefault(hex: string, fallback: Rgb): Rgb {
  const c = new Color(hex);
  return Number.isFinite(c.r) ? [c.r, c.g, c.b] : fallback;
}

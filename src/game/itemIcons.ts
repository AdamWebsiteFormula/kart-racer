// The item pictures on the HUD's slots and in How to Play (design §8; 28 Sept 2026, the new set): each item
// rendered from the very models the race draws (art-pipeline items.ts), in one studio look for all thirteen,
// three-quarters from the front and above, on a clear background: the solid parts lit in PBR with a studio's
// reflections, the lights added over them and bloomed into a soft halo. Where an item is an act, not a thing
// (the Laser Blaster's shot, the Shockwave, the EMP Blast), a small model of its own stands for it here only:
// a toy-like sci-fi blaster, a pulse emitter, an EMP core. A dev tool, never imported by the game:
// scripts/headless/item-icons.mjs runs it in the dev server's page and writes public/art/items/<id>.webp.
import {
  ACESFilmicToneMapping, AmbientLight, Box3, CatmullRomCurve3, Color, DirectionalLight, Euler, Group, HemisphereLight, InstancedBufferAttribute, InstancedMesh,
  Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, Quaternion, Scene, SphereGeometry, SRGBColorSpace, TubeGeometry,
  Vector3, WebGLRenderer, type BufferGeometry, type Material, type Object3D,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { energyMaterial, itemGeometry, SHIELD, shieldMaterial } from '../art-pipeline/index.ts';
import { itemFinish } from '../art-pipeline/items.ts';
import { EnergyBuilder, FINISH, ItemBuilder, plateXZ } from '../art-pipeline/itemKit.ts';

/** The render (px, square), the lens, the air round the item in the frame, the halo's blur (px) and strength. */
export const ITEM_ICON = Object.freeze({ size: 512, fov: 24, margin: 0.05, halo: 16, haloStrength: 0.85 });

/** The icons' one Jet Mode livery (every racer's own shows in the race): hot coral hull, white wings and tails. */
const JET_ICON = Object.freeze({ hull: '#ff5a3c', trim: '#f4f6fa' });

// ---- the icon-only models
/** The Laser Blaster: a chunky sci-fi blaster, a toy's shapes and colors (never a real one's), pointing +Z. */
function blaster(): BufferGeometry {
  const b = new ItemBuilder();
  b.capsule(0.16, 0.46, '#f4f6fa', FINISH.paint, [0, 0.05, -0.02], [Math.PI / 2, 0, 0], 18);
  b.cyl(0.075, 0.09, 0.52, '#2b2f38', FINISH.steel, [0, 0.08, 0.5], [Math.PI / 2, 0, 0], 16);
  for (let k = 0; k < 3; k++) b.torus(0.1, 0.03, '#dde3ec', FINISH.chrome, [0, 0.08, 0.36 + k * 0.13]);
  b.cyl(0.115, 0.085, 0.13, '#ff3a8a', FINISH.paint, [0, 0.08, 0.8], [Math.PI / 2, 0, 0], 18);
  b.ball([0.065, 0.065, 0.04], '#fff0f8', FINISH.light(5), [0, 0.08, 0.87], undefined, 12);
  b.part(plateXZ([[0, -0.32], [0.17, -0.12], [0.17, 0.12], [0, 0.22]], 0.035, 0.01), '#2ec4b6', FINISH.paint, [0, 0.19, -0.05], [0, 0, Math.PI / 2]);
  b.box([0.12, 0.36, 0.16], '#2ec4b6', FINISH.paint, [0, -0.2, -0.24], [0.38, 0, 0]);
  for (const sx of [-1, 1]) b.box([0.02, 0.08, 0.24], '#ff4fb4', FINISH.light(3.5), [sx * 0.162, 0.06, 0], undefined);
  b.torus(0.075, 0.016, '#2b2f38', FINISH.steel, [0, -0.1, 0.02], [0, Math.PI / 2, 0]);
  return b.build();
}

/** The Shockwave: a pulse emitter, a chrome puck round a glowing core. */
function pulser(): BufferGeometry {
  const b = new ItemBuilder();
  b.cyl(0.32, 0.36, 0.14, '#dde3ec', FINISH.chrome, [0, 0.07, 0], undefined, 32);
  b.ball([0.26, 0.15, 0.26], '#2b2f38', FINISH.steel, [0, 0.14, 0], undefined, 24);
  b.torus(0.335, 0.032, '#35e3ff', FINISH.light(4), [0, 0.1, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 44);
  b.ball([0.12, 0.12, 0.12], '#bff6ff', FINISH.light(5), [0, 0.27, 0], undefined, 14);
  return b.build();
}

/** The EMP Blast: a charged core between two chrome rings. */
function empCore(): BufferGeometry {
  const b = new ItemBuilder();
  b.ball([0.2, 0.2, 0.2], '#5a3cff', FINISH.light(1.8), [0, 0, 0], undefined, 20);
  b.cyl(0.11, 0.17, 0.09, '#3a3f4b', FINISH.steel, [0, 0.2, 0], undefined, 18);
  b.cyl(0.17, 0.11, 0.09, '#3a3f4b', FINISH.steel, [0, -0.2, 0], undefined, 18);
  b.torus(0.31, 0.035, '#454b58', FINISH.steel, [0, 0, 0], [Math.PI / 2 + 0.35, 0, 0.25], Math.PI * 2, 40);
  b.torus(0.31, 0.035, '#454b58', FINISH.steel, [0, 0, 0], [0.3, 0.95, 0], Math.PI * 2, 40);
  b.torus(0.312, 0.012, '#7b6bff', FINISH.light(2.5), [0, 0, 0], [Math.PI / 2 + 0.35, 0, 0.25], Math.PI * 2, 40);
  return b.build();
}

/** Lightning: jagged arcs off a core `r` metres round, blue-white (a seeded zigzag each). */
function arcs(r: number, count: number, seed: number): BufferGeometry {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const e = new EnergyBuilder();
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + rnd() * 0.5, up = (rnd() - 0.5) * 1.2;
    const dir = new Vector3(Math.cos(a), up, Math.sin(a)).normalize();
    const pts: Vector3[] = [];
    for (let j = 0; j <= 5; j++) {
      const d = r + (j / 5) * r * 1.3;
      pts.push(dir.clone().multiplyScalar(d).add(new Vector3((rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1)));
    }
    e.part(new TubeGeometry(new CatmullRomCurve3(pts, false, 'catmullrom', 0), 24, 0.022, 5, false), [0.55, 0.85, 2.1, 1]);
  }
  return e.build();
}

// ---- the scenes
/** An icon's scene: its solid parts and its light, the view's yaw and pitch, and whether the light's reach is framed too (the Shockwave's rings). */
interface IconScene { solid: Object3D[]; glow: Object3D[]; yaw: number; pitch: number; frameGlow?: boolean }

let studio: MeshStandardMaterial | null = null;
/** The solid parts' material here: the race's per-vertex finish, lit by the studio's room (not the race's sky). */
function studioMaterial(tint?: string): MeshStandardMaterial {
  studio ??= itemFinish(new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 }));
  if (!tint) return studio;
  const m = studio.clone();
  m.onBeforeCompile = studio.onBeforeCompile;
  m.customProgramCacheKey = studio.customProgramCacheKey;
  m.color = new Color(tint);
  return m;
}
const solidOf = (g: BufferGeometry | null, at: Vector3 = new Vector3(), q: Quaternion = new Quaternion(), s = 1, tint?: string): Mesh => {
  const m = new Mesh(g ?? undefined, studioMaterial(tint));
  m.position.copy(at); m.quaternion.copy(q); m.scale.setScalar(s);
  return m;
};
const kind = (name: string) => itemGeometry(name) as BufferGeometry;
/** A glow of `name`, in color (r, g, b) at strength a (the race's energy models take their color per copy; here per mesh). */
const glowOf = (g: BufferGeometry, at: Vector3, q: Quaternion, scale: Vector3, rgb: readonly [number, number, number] = [1, 1, 1], a = 1): Mesh => {
  const m = new Mesh(g, energyMaterial().clone());
  (m.material as MeshBasicMaterial).color.setRGB(rgb[0] * a, rgb[1] * a, rgb[2] * a);
  (m.material as MeshBasicMaterial).onBeforeCompile = energyMaterial().onBeforeCompile;
  (m.material as MeshBasicMaterial).customProgramCacheKey = energyMaterial().customProgramCacheKey;
  m.position.copy(at); m.quaternion.copy(q); m.scale.copy(scale);
  return m;
};
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
const Q = (x = 0, y = 0, z = 0) => new Quaternion().setFromEuler(new Euler(x, y, z));
const S = (x: number, y = x, z = x) => new Vector3(x, y, z);

/** Every item's picture, by the sim's item id. */
export function iconScenes(): Record<string, () => IconScene> {
  const yaw = (58 * Math.PI) / 180, pitch = (20 * Math.PI) / 180;
  return {
    beachBall: () => {
      const q = Q(0, 0, 0);
      return {
        solid: [solidOf(blaster(), V(0, 0, -0.35), q), solidOf(kind('laserBolt'), V(0, 0.08, 0.95), q, 0.7)],
        glow: [glowOf(kind('boltGlow'), V(0, 0.08, 0.95), q, S(0.7))],
        yaw: (72 * Math.PI) / 180, pitch,
      };
    },
    homingKite: () => {
      const q = Q(-0.5, 0, 0.2);
      const nozzle = V(0, 0, -0.44).applyQuaternion(q);
      return {
        solid: [solidOf(kind('rocket'), V(), q)],
        glow: [glowOf(kind('flameHot'), nozzle, q, S(0.14, 0.14, 0.9)), glowOf(kind('glowOrb'), nozzle, q, S(0.26), [3, 1.3, 0.35], 0.7)],
        yaw: (80 * Math.PI) / 180, pitch: (12 * Math.PI) / 180,
      };
    },
    oilCan: () => {
      // the slick in glossy black with the oily rainbow sheen a studio shows up best as thin-film iridescence
      const slick = new Mesh(kind('oilSlick'), new MeshPhysicalMaterial({
        color: 0x040406, roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04,
        iridescence: 1, iridescenceIOR: 1.45, iridescenceThicknessRange: [180, 820],
      }));
      slick.scale.set(0.8, 1, 0.8);
      const q = Q(0, 0.5, Math.PI / 2 - 0.12);
      return { solid: [slick, solidOf(kind('canister'), V(0.62, 0.19, 0.25), q, 1.35)], glow: [], yaw, pitch: (32 * Math.PI) / 180 };
    },
    decoyBalloon: () => ({
      solid: [solidOf(kind('mine'), V(), Q(0, 0.4, 0)), solidOf(kind('mineLight'), V(), Q(0, 0.4, 0))],
      glow: [glowOf(kind('glowOrb'), V(0, -0.82, 0), Q(), S(0.5), [1.8, 0.08, 0.06])],
      yaw, pitch: (8 * Math.PI) / 180,
    }),
    airHorn: () => ({
      solid: [solidOf(pulser(), V(), Q())],
      glow: [0.58, 0.82, 1.06].map((r, k) => glowOf(kind('ring'), V(0, 0.1, 0), Q(Math.PI / 2, 0, 0), S(r, r, 2.2), [0.22, 1.0, 1.4], 1 - k * 0.28)),
      yaw, pitch: (34 * Math.PI) / 180, frameGlow: true,
    }),
    bubble: () => {
      const g = new SphereGeometry(1, 48, 32);
      g.setAttribute('aShield', new InstancedBufferAttribute(new Float32Array([10, 1, 2.3]), 3));
      const m = new InstancedMesh(g, shieldMaterial(), 1);
      m.setMatrixAt(0, new Matrix4().makeScale(SHIELD.radii[0], SHIELD.radii[1], SHIELD.radii[0]));
      // a deep blue glass ball inside it, so the hexes read on the slot's pale gold as they do on the road
      const core = new Mesh(new SphereGeometry(1, 40, 28), new MeshStandardMaterial({ color: 0x0b3a6e, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55 }));
      core.scale.set(SHIELD.radii[0] * 0.96, SHIELD.radii[1] * 0.96, SHIELD.radii[0] * 0.96);
      return { solid: [core], glow: [m], yaw, pitch };
    },
    fizzPop: () => ({
      solid: [solidOf(kind('nitro'), V(0, -0.28, 0), Q(0, 0.3, -0.35), 1.2)],
      glow: [glowOf(kind('glowOrb'), V(0.1, -0.04, 0), Q(), S(0.2), [0.4, 1.8, 2.6], 0.35)],
      yaw, pitch,
    }),
    tripleFizz: () => ({
      solid: [-1, 0, 1].map((k) => solidOf(kind('nitro'), V(k * 0.27, -0.28 + (k === 0 ? 0.04 : 0), k * -0.05), Q(0, 0.3, -k * 0.28), 1.05)),
      glow: [],
      yaw, pitch,
    }),
    fogBank: () => ({
      solid: [solidOf(empCore(), V(), Q())],
      glow: [glowOf(arcs(0.24, 9, 7), V(), Q(), S(1)), glowOf(kind('glowOrb'), V(), Q(), S(0.32), [0.45, 0.35, 1.6], 0.8)], frameGlow: true,
      yaw, pitch,
    }),
    strikeBall: () => {
      const q = Q(-0.18, 0, -0.32);
      const parts = ['jetHull', 'jetWingL', 'jetWingR', 'jetFins'].map((k) => solidOf(kind(k), V(), q, 1, k === 'jetHull' ? JET_ICON.hull : JET_ICON.trim));
      const glow: Mesh[] = [];
      for (const sx of [-1, 1]) {
        const n = V(sx * 0.17, 0, -1.62).applyQuaternion(q);
        glow.push(glowOf(kind('flameBlue'), n, q, S(0.17, 0.17, 1.1)), glowOf(kind('glowOrb'), n, q, S(0.3), [0.7, 1.5, 3], 0.7));
      }
      return { solid: [...parts, solidOf(kind('jetTrim'), V(), q)], glow, yaw: (60 * Math.PI) / 180, pitch: (24 * Math.PI) / 180 };
    },
    pogoSpring: () => {
      const solid: Mesh[] = [], glow: Mesh[] = [];
      for (const sx of [-1, 1]) {
        // each pod's strut (modelled toward +x) back, away from the eye
        const q = Q(0, Math.PI / 2, 0);
        solid.push(solidOf(kind('thruster'), V(sx * 0.2, 0.3, 0), q));
        const f = Q(Math.PI / 2, 0, 0);
        glow.push(glowOf(kind('flameHot'), V(sx * 0.2, 0.3, 0), f, S(0.12, 0.12, 0.75)), glowOf(kind('glowOrb'), V(sx * 0.2, 0.3, 0), Q(), S(0.2), [1.6, 0.7, 0.2], 0.8));
      }
      return { solid, glow, yaw, pitch: (14 * Math.PI) / 180 };
    },
    grappleAnchor: () => {
      const q = Q(0, 0, 0);
      return {
        solid: [solidOf(kind('beamEmitter'), V(0, 0, -0.55), q, 1.9)],
        glow: [
          glowOf(kind('beam'), V(0, 0, -0.2), q, S(0.14, 0.14, 1.05), [0.22, 1.05, 0.38]),
          glowOf(kind('ring'), V(0, 0, 0.85), q, S(0.34, 0.34, 2), [0.25, 1.2, 0.45]),
          glowOf(kind('glowOrb'), V(0, 0, 0.85), q, S(0.26), [0.2, 0.9, 0.32], 0.8),
        ],
        yaw: (70 * Math.PI) / 180, pitch,
      };
    },
    windUpMouse: () => ({
      solid: [solidOf(kind('drone'), V(), Q(0.12, 0, 0))],
      glow: [glowOf(kind('droneFx'), V(), Q(0.12, 0, 0), S(1))],
      yaw, pitch: (26 * Math.PI) / 180,
    }),
  };
}

/** Aim `camera` along (yaw, pitch) at `box`, near enough that it fills the picture but for the margin. */
function frame(camera: PerspectiveCamera, box: Box3, yaw: number, pitch: number): void {
  const mid = box.getCenter(new Vector3());
  const dir = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const corners: Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z));
  const fits = (d: number): boolean => {
    camera.position.copy(mid).addScaledVector(dir, d);
    camera.lookAt(mid);
    camera.updateMatrixWorld(true);
    return corners.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) <= 1 - ITEM_ICON.margin && Math.abs(p.y) <= 1 - ITEM_ICON.margin; });
  };
  let lo = 0.3, hi = 40;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  fits(hi);
}

/** A render's pixels as an ImageData (the renderer's canvas copied out). */
function pixels(canvas: HTMLCanvasElement): ImageData {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const g = c.getContext('2d')!;
  g.drawImage(canvas, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}

/** Light on black as color with alpha: each pixel's brightest channel is how much of it there is. */
function lightLayer(src: ImageData): HTMLCanvasElement {
  const out = new ImageData(src.width, src.height), d = src.data, o = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = Math.max(d[i], d[i + 1], d[i + 2]);
    if (a < 2) continue;
    o[i] = Math.min(255, (d[i] * 255) / a); o[i + 1] = Math.min(255, (d[i + 1] * 255) / a); o[i + 2] = Math.min(255, (d[i + 2] * 255) / a); o[i + 3] = a;
  }
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d')!.putImageData(out, 0, 0);
  return c;
}

/** Render every item's picture to a PNG data URL (by item id). */
export async function renderItemIcons(only?: string[]): Promise<Record<string, string>> {
  const N = ITEM_ICON.size;
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(N, N, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  const key = new DirectionalLight(0xfff1dc, 2.6);
  key.position.set(4, 7, 6);
  const rim = new DirectionalLight(0xd4e4ff, 1.6);
  rim.position.set(-5, 4, -6);
  scene.add(key, rim, new HemisphereLight(0xf2f7ff, 0x6c6a5e, 1.0), new AmbientLight(0xffffff, 0.2));
  const camera = new PerspectiveCamera(ITEM_ICON.fov, 1, 0.05, 100);
  const black = new MeshBasicMaterial({ color: 0x000000 });
  const out: Record<string, string> = {};
  for (const [id, make] of Object.entries(iconScenes())) {
    if (only && !only.includes(id)) continue;
    const s = make();
    const root = new Group();
    for (const o of [...s.solid, ...s.glow]) root.add(o);
    scene.add(root);
    root.updateMatrixWorld(true);
    const box = new Box3();
    for (const o of s.solid) box.expandByObject(o);
    if (s.frameGlow || box.isEmpty()) for (const o of s.glow) box.expandByObject(o);
    frame(camera, box, s.yaw, s.pitch);
    // the solid parts on a clear background
    for (const o of s.glow) o.visible = false;
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    const solid = pixels(canvas);
    // the light on black, the solid parts black in front of it (what stands before a glow hides it)
    for (const o of s.glow) o.visible = true;
    const was = new Map<Mesh, Material | Material[]>();
    for (const o of s.solid) o.traverse((x) => { const m = x as Mesh; if (m.isMesh) { was.set(m, m.material); m.material = black; } });
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    const light = lightLayer(pixels(canvas));
    for (const [m, mat] of was) m.material = mat;
    // the halo behind, the solid parts, the light over them
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d')!;
    g.filter = `blur(${ITEM_ICON.halo}px)`;
    g.globalAlpha = ITEM_ICON.haloStrength;
    g.drawImage(light, 0, 0);
    g.filter = 'none';
    g.globalAlpha = 1;
    const sc = document.createElement('canvas');
    sc.width = sc.height = N;
    sc.getContext('2d')!.putImageData(solid, 0, 0);
    g.drawImage(sc, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(light, 0, 0);
    g.globalCompositeOperation = 'source-over';
    out[id] = c.toDataURL('image/png');
    scene.remove(root);
  }
  pmrem.dispose();
  renderer.dispose();
  return out;
}

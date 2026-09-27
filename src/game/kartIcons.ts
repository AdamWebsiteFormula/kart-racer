// The Kart screen's tile pictures (design §12, Adam 26 Sept 2026: "the karts look super cartoony in the
// selector"): each kart alone, rendered from our own 3D kart models the race draws (the body and wheels of a
// racer built from parts, rigged.ts kartOnly; Classic and Buggy code-built, bodies.ts), three-quarters from
// the front and its left, nose to the left, on a clear background — as Mario Kart World's vehicle select
// shows each vehicle rendered on its tile. A dev tool, never imported by the game: scripts/headless/
// kart-icons.mjs runs it in the dev server's page (where the model files load as they do in a race) and
// writes public/art/karts/<name>.webp. Its own renderer (alpha, kept buffer): a still, once.
import {
  ACESFilmicToneMapping, AmbientLight, Box3, DirectionalLight, HemisphereLight, Mesh, PerspectiveCamera, PMREMGenerator, Scene,
  SRGBColorSpace, Vector3, WebGLRenderer, type Material, type Object3D,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PAINTS, RACER_MODELS, racerGeometry, vertexToon } from '../art-pipeline/index.ts';
import { KARTS } from '../kart-controller/karts.ts';

/** the picture's size (px) and the shot: yaw from dead ahead toward the kart's left, the look-down angle, the lens */
export const ICON = Object.freeze({ w: 640, h: 400, yaw: (58 * Math.PI) / 180, pitch: (17 * Math.PI) / 180, fov: 24, margin: 0.04 });

const RACERS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];

/** Every picture the Kart screen shows, by file name (ui-hud data/karts.ts kartArt): the karts in their owners' colors, the owners' paints, and the twins in each racer's colors and each paint. */
export function iconJobs(): { name: string; build: () => Object3D | null }[] {
  const jobs: { name: string; build: () => Object3D | null }[] = [];
  const rigged = (owner: string, paint?: string) => () => {
    const t = RACER_MODELS.rigged(owner);
    if (!t?.kartOnly) return null;
    const m = (paint ? RACER_MODELS.paintMaterial(owner, paint) : null) ?? t.material;
    return new Mesh(t.kartOnly, m as Material);
  };
  const twin = (body: 'classic' | 'buggy', racer: string, paint?: string) => () => {
    const g = racerGeometry(racer, { body, ...(paint ? { paint } : {}) }, false);
    return g ? new Mesh(g.body, vertexToon()) : null;
  };
  for (const k of KARTS) {
    if (k.owner) {
      jobs.push({ name: k.id, build: rigged(k.owner) });
      for (const p of PAINTS.filter((x) => x.racerId === k.owner)) jobs.push({ name: `${k.id}-${p.id}`, build: rigged(k.owner, p.id) });
    } else if (k.id === 'classic' || k.id === 'buggy') {
      for (const r of RACERS) jobs.push({ name: `${k.id}-${r}`, build: twin(k.id, r) });
      for (const p of PAINTS) jobs.push({ name: `${k.id}-${p.id}`, build: twin(k.id, p.racerId, p.id) });
    }
  }
  return jobs;
}

/** Aim `camera` at `obj` from the icon's angle, near enough that its box fills the picture but for the margin. */
function frame(camera: PerspectiveCamera, obj: Object3D): void {
  const box = new Box3().setFromObject(obj);
  const mid = box.getCenter(new Vector3());
  const dir = new Vector3(Math.sin(ICON.yaw) * Math.cos(ICON.pitch), Math.sin(ICON.pitch), Math.cos(ICON.yaw) * Math.cos(ICON.pitch));
  const corners: Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z));
  const fits = (d: number): boolean => {
    camera.position.copy(mid).addScaledVector(dir, d);
    camera.lookAt(mid);
    camera.updateMatrixWorld(true);
    return corners.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) <= 1 - ICON.margin && Math.abs(p.y) <= 1 - ICON.margin; });
  };
  let lo = 0.5, hi = 40;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  fits(hi);
}

/** The picture cut to the kart itself (its alpha's bounds, a few pixels round it), as WebP: every kart fills its tile alike. */
function trimmed(src: HTMLCanvasElement): string {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 8) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return src.toDataURL('image/webp', 0.9);
  const pad = 6;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/webp', 0.9);
}

/** Render every job to a WebP data URL (null where its model is not in). */
export async function renderKartIcons(): Promise<Record<string, string | null>> {
  await RACER_MODELS.load();
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(ICON.w, ICON.h, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const key = new DirectionalLight(0xfff1dc, 2.6);
  key.position.set(4, 7, 6);
  const rim = new DirectionalLight(0xd4e4ff, 1.3);
  rim.position.set(-5, 4, -6);
  scene.add(key, rim, new HemisphereLight(0xf2f7ff, 0x6c6a5e, 1.1), new AmbientLight(0xffffff, 0.25));
  const camera = new PerspectiveCamera(ICON.fov, ICON.w / ICON.h, 0.1, 200);
  const out: Record<string, string | null> = {};
  for (const job of iconJobs()) {
    const obj = job.build();
    if (!obj) { out[job.name] = null; continue; }
    scene.add(obj);
    frame(camera, obj);
    renderer.clear();
    renderer.render(scene, camera);
    out[job.name] = trimmed(canvas);
    scene.remove(obj);
  }
  pmrem.dispose();
  renderer.dispose();
  return out;
}

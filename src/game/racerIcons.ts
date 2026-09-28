// The Racer screen's tile pictures (Adam, 28 Sept 2026, on "Pick your racer": "This part should just show the
// characters, not the karts"): each racer alone, full figure, rendered from their own rigged 3D model standing
// (art-pipeline stand.ts) at the height of their own flourish (Pip in the air with a fist up, Otto waving, Juniper
// saluting ...), three-quarters from the front, on a clear background, as Mario Kart World's character select
// shows each character in a pose of its own on its tile (stills: youtube.com/watch?v=_9JZhslBy3E, 3:00). All eight
// in the racers' own PBR material and the same studio light as the kart tiles (kartIcons.ts), so the two screens
// match. A dev tool, never imported by the game: scripts/headless/racer-tiles.mjs runs it in the dev server's page
// (where the model files load as for a race) and writes public/art/racers/tiles/<id>.webp. Its own renderer (alpha,
// kept buffer): a still, once.
import {
  ACESFilmicToneMapping, AmbientLight, Box3, DirectionalLight, Group, HemisphereLight, PerspectiveCamera, PMREMGenerator, Scene,
  SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RACER_MODELS } from '../art-pipeline/index.ts';
import { makeStanding, temperOf, type Flourish } from '../art-pipeline/stand.ts';

/** the picture's size (px, the tile's 4:5), the shot's turn from dead ahead toward the figure's left (MKW's face you a little from the side), its look-down angle and lens */
export const TILE = Object.freeze({ w: 520, h: 650, yaw: (22 * Math.PI) / 180, pitch: (6 * Math.PI) / 180, fov: 22, margin: 0.07 });

export const RACERS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'] as const;

/** Each flourish's moment for a tile: its height, the face still toward you (a bow's tile is its hand to the chest before it bows; a twirl's, arms out before it turns). */
export const TILE_AT: Readonly<Record<Flourish, number>> = Object.freeze({ hop: 0.47, point: 0.5, twirl: 0.14, salute: 0.5, wave: 0.46, cheer: 0.4, bow: 0.22, laugh: 0.5 });

/** Aim `camera` at `obj` from the tile's angle, near enough that its (skinned) box fills the picture but for the margin. */
function frame(camera: PerspectiveCamera, obj: Group): void {
  const box = new Box3().setFromObject(obj, true);
  const mid = box.getCenter(new Vector3());
  const dir = new Vector3(Math.sin(TILE.yaw) * Math.cos(TILE.pitch), Math.sin(TILE.pitch), Math.cos(TILE.yaw) * Math.cos(TILE.pitch));
  const corners: Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z));
  const fits = (d: number): boolean => {
    camera.position.copy(mid).addScaledVector(dir, d);
    camera.lookAt(mid);
    camera.updateMatrixWorld(true);
    return corners.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) <= 1 - TILE.margin && Math.abs(p.y) <= 1 - TILE.margin; });
  };
  let lo = 0.3, hi = 40;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  fits(hi);
}

/** The studio: its own renderer and lights (the kart tiles' own), and a camera. */
function studio(w: number, h: number): { renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera; done: () => void } {
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
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
  const camera = new PerspectiveCamera(TILE.fov, w / h, 0.05, 200);
  return { renderer, scene, camera, done: () => { pmrem.dispose(); renderer.dispose(); } };
}

/**
 * Render `racerId` standing, once for each of `phases` (a moment of its flourish, 0..1; -1 its idle), to WebP data
 * URLs; null where its model is not in. `paint`: in that paint. The tiles take TILE_AT; a check of the poses takes several.
 */
export async function renderStanding(racerId: string, phases: readonly number[], paint?: string, size = { w: TILE.w, h: TILE.h }): Promise<(string | null)[]> {
  await RACER_MODELS.load();
  const t = RACER_MODELS.rigged(racerId);
  if (!t) return phases.map(() => null);
  const s = studio(size.w, size.h);
  const fig = makeStanding(t, RACER_MODELS.paintMaterial(racerId, paint) ?? undefined);
  const holder = new Group();
  holder.add(fig.root);
  s.scene.add(holder);
  const out: (string | null)[] = [];
  for (const u of phases) {
    // posed first straight on, so the frame fits the pose; then again with the head toward the camera
    fig.update(0, null, u < 0, u < 0 ? undefined : u);
    frame(s.camera, holder);
    fig.update(0, s.camera.position, u < 0, u < 0 ? undefined : u);
    s.renderer.clear();
    s.renderer.render(s.scene, s.camera);
    out.push(s.renderer.domElement.toDataURL('image/webp', 0.9));
  }
  s.done();
  return out;
}

/** Every racer's tile picture (its own colors, at its flourish's height: TILE_AT), by racer id. */
export async function renderRacerTiles(): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const id of RACERS) out[id] = (await renderStanding(id, [TILE_AT[temperOf(id).move]]))[0];
  return out;
}

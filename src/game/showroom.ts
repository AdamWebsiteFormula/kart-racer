// The racer screen's hero turntable (design §12 "roster screen: turntable", §10 rewards): the focused
// racer in their paint and body, turning slowly on a pedestal under a soft spotlight. A little scene of
// its own, drawn by the game's one renderer into the box the menu leaves for it (main.ts), so it costs
// no second WebGL context. Its kart wears its own copies of the materials (never the near-camera fade
// the rivals' shared ones carry) and gives them back when it changes.
import {
  AmbientLight, BufferAttribute, CircleGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight,
  Mesh, MeshBasicMaterial, MeshToonMaterial, PerspectiveCamera, Scene, TorusGeometry,
  type BufferGeometry, type Material, type Texture, type WebGLRenderer,
} from 'three';
import { buildRacerMesh, freeSkeletons, isShared, RACER_MODELS, toonRamp, type KartLook } from '../art-pipeline/index.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { createKartState, NEUTRAL_INPUT, type KartState } from '../kart-controller/types.ts';
import { KartView } from '../kart-controller/view.ts';
import { ownKartMaterials } from './kartMesh.ts';

/** The backdrop's colour where the spotlight fades out; the renderer clears to it too. */
export const SHOWROOM_BG = '#211b38';
/** radians a second the kart turns; with reduced motion it stands still at a three-quarter view */
export const TURN_RATE = 0.6;
export const STILL_YAW = 0.7;

/** A disc whose vertex colours fade from `inner` at the centre to `outer` at the rim (unlit, not tone-mapped). */
function glowDisc(radius: number, inner: string, outer: string): Mesh {
  const g = new CircleGeometry(radius, 48, 0, Math.PI * 2);
  const pos = g.getAttribute('position'), col = new Float32Array(pos.count * 3);
  const a = new Color(inner), b = new Color(outer), c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const r = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / radius);
    c.lerpColors(a, b, r * r * (3 - 2 * r));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
  return new Mesh(g, new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false, depthWrite: false }));
}

export class Showroom {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 0.9, 0.5, 60);
  readonly background = new Color(SHOWROOM_BG);
  /** the kart on the stand, and what it is; a rigged racer (art-pipeline rigged.ts) sits in a KartView and idles, looking at you */
  private kart: { key: string; root: Group; view: KartView | null; state: KartState } | null = null;
  private last = -1;
  private readonly stand = new Group();
  /** the pedestal's own geometries and materials, freed with the showroom */
  private readonly own: (BufferGeometry | Material)[] = [];

  constructor(environment: Texture | null = null) {
    this.scene.environment = environment; // the model-file racers' PBR metal needs a reflection
    this.scene.environmentIntensity = 0.7;
    const key = new DirectionalLight(0xfff2de, 2.6);
    key.position.set(3, 7, 5);
    const rim = new DirectionalLight(0xa9c4ff, 1.1);
    rim.position.set(-4, 3, -5);
    this.scene.add(key, rim, new HemisphereLight(0xe6f0ff, 0x3c3358, 1.2), new AmbientLight(0xbcd8ff, 0.3));
    // the spotlight: a soft pool of light on the floor and a glow on the wall behind
    const wall = glowDisc(7, '#5b4b93', SHOWROOM_BG);
    wall.position.set(0, 1.6, -4.5);
    const floor = glowDisc(4.2, '#fff1d6', SHOWROOM_BG);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.36;
    // the pedestal: a low drum with a bright rim, the kart standing on its top
    const toon = (hex: string) => new MeshToonMaterial({ color: hex, gradientMap: toonRamp() });
    const drumGeo = new CylinderGeometry(1.75, 1.9, 0.34, 48), rimGeo = new TorusGeometry(1.76, 0.05, 8, 64);
    const drumMat = toon('#3d3566'), rimMat = toon('#ffd23f');
    const drum = new Mesh(drumGeo, drumMat);
    drum.position.y = -0.17;
    const rimRing = new Mesh(rimGeo, rimMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0;
    this.stand.add(drum, rimRing);
    this.scene.add(wall, floor, this.stand);
    this.own.push(drumGeo, rimGeo, drumMat, rimMat, wall.geometry, floor.geometry, wall.material as Material, floor.material as Material);
    this.camera.position.set(0, 2.5, 8.2);
    this.camera.lookAt(0, 0.7, 0);
  }

  /** Put this racer in this look on the stand (built again only when it changes, or once the model files arrive). */
  show(racerId: string, look: KartLook): void {
    const key = `${racerId}|${look.paint ?? ''}|${look.body ?? ''}|${look.kartId ?? ''}|${RACER_MODELS.has(racerId)}`;
    if (this.kart?.key === key) return;
    this.clearKart();
    const root = buildRacerMesh(racerId, look);
    if (!root) return;
    ownKartMaterials(root);
    const state = createKartState({ racerId });
    const view = root.userData.rig ? new KartView(makeConstants('medium', 150), root, state) : null;
    this.stand.add(view ? view.root : root);
    this.kart = { key, root, view, state };
  }

  /** What stands on the stand now ('' for nothing). */
  get showing(): string { return this.kart?.key ?? ''; }

  /** Turn the stand; `aspect` is the box's width over its height. A rigged driver idles and looks at the camera while it can. */
  update(nowS: number, reduced: boolean, aspect: number): void {
    this.stand.rotation.y = reduced ? STILL_YAW : (nowS * TURN_RATE) % (Math.PI * 2);
    const k = this.kart, dt = this.last < 0 ? 0 : Math.min(0.1, Math.max(0, nowS - this.last));
    this.last = nowS;
    if (k?.view && dt > 0) {
      // the camera in the stand's turning frame: faced while it is anywhere in front of the kart
      const a = -this.stand.rotation.y, c = Math.cos(a), s = Math.sin(a), p = this.camera.position;
      const eye = k.view.look.eye as [number, number, number] | null ?? [0, 0, 0];
      eye[0] = p.x * c + p.z * s; eye[1] = p.y; eye[2] = -p.x * s + p.z * c;
      k.view.look.eye = eye;
      k.view.look.faceEye = eye[2] > -1.5;
      k.view.onTick(k.state, dt, NEUTRAL_INPUT);
      k.view.onFrame(1, k.state, 0, dt, reduced);
    }
    if (Math.abs(this.camera.aspect - aspect) > 1e-3) {
      this.camera.aspect = aspect;
      // a narrow box pulls back so the whole kart fits across it
      this.camera.position.set(0, 2.5, 8.2 / Math.min(1, Math.max(0.6, aspect)));
      this.camera.lookAt(0, 0.7, 0);
      this.camera.updateProjectionMatrix();
    }
  }

  /** Compile its programs now (a kart in each kind of material on the stand), so the racer screen never waits on a shader. */
  precompile(renderer: WebGLRenderer, racerId: string, look: KartLook): Promise<unknown> {
    this.show(racerId, look);
    return renderer.compileAsync(this.scene, this.camera);
  }

  private clearKart(): void {
    if (!this.kart) return;
    this.stand.remove(this.kart.view ? this.kart.view.root : this.kart.root);
    this.kart.root.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) if (!isShared(x)) x.dispose();
    });
    freeSkeletons(this.kart.root);
    this.kart = null;
  }

  dispose(): void {
    this.clearKart();
    for (const x of this.own) x.dispose();
  }
}

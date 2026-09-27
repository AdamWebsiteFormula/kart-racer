// The select screens' stage (design §12; Adam, 26 Sept 2026: "it all just looks really cheap ... the
// quality that Mario Kart World has"): the Racer and Kart screens' whole backdrop and their big 3D hero,
// drawn by the game's one renderer straight into the main canvas under the menu (main.ts drawStage), so
// it costs no second WebGL context and no copy. As Mario Kart World's own select screens (stills from
// its character and vehicle select, youtube.com/watch?v=PI0dNuQNq5k and B9sACzOphLc): the world blurred
// out of focus behind (ours a still of Harbor Loop from its course intro, blurred once:
// public/art/menus/stage.webp), no pedestal and no box, and the racer large on the right beside the
// grid, turning slowly (on the Kart screen seated in the kart under the focus). The kart wears its own
// copies of the materials (never the near-camera fade the rivals' shared ones carry) and gives them back
// when it changes. A new racer pops in and gives a happy bounce (the finish's own reaction, anim.ts).
import {
  AmbientLight, Box3, Color, DirectionalLight, Group, HemisphereLight, Mesh, PerspectiveCamera, PlaneGeometry, Scene,
  ShaderMaterial, Sphere, SRGBColorSpace,
  type Material, type Object3D, type Texture, type WebGLRenderer,
} from 'three';
import { buildRacerMesh, freeSkeletons, isShared, RACER_MODELS, type KartLook } from '../art-pipeline/index.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { createKartState, NEUTRAL_INPUT, type KartState } from '../kart-controller/types.ts';
import { KartView } from '../kart-controller/view.ts';
import { ownKartMaterials } from './kartMesh.ts';

/** The stage's colour before its backdrop picture is in (the picture's own sky-and-sea average), and under it. */
export const SHOWROOM_BG = '#9fc4dd';
/** radians a second the kart turns (one turn in about ten seconds, as MKW's select screens turn theirs); with reduced motion it stands still at a three-quarter view */
export const TURN_RATE = 0.6;
export const STILL_YAW = 0.7;

/**
 * The hero shot (Adam, 25 Sept 2026: "the kart looks small in a big panel"; 26 Sept: MKW's select screens
 * show the racer big on one side). The camera keeps its tuned field of view and look-down angle for every
 * kart; only its distance changes, solved from the built racer's own bounding sphere (kart + driver
 * together, frameOf) so it fills FRAME_FILL of the tighter side of the hero's box, on any aspect ratio: a
 * small kart (Pip's) and a tall one (Boulder's) or a long one (Nova's pod) all read large. Framing an object
 * by its bounding sphere at a fixed fov (only distance solved) is the standard "frame selected" camera fit
 * (as in Blender's View Selected or Unity's Frame Selected). The sphere is looser than the kart itself, so
 * the fill runs past 1.
 */
export const FRAME_FILL = 1.36;
/** The camera's original look-down angle above its target (its tuned position, 2.5 high and 8.2 back, looking at 0.7 up): kept fixed so only distance changes with a kart's size. */
const CAMERA_ELEVATION = Math.atan2(2.5 - 0.7, 8.2);
/** Distance floor and ceiling: never so close the near plane crowds a tiny kart, nor so far a huge one outgrows the far plane. */
export const MIN_DISTANCE = 3, MAX_DISTANCE = 36;
/** Before anything is built (or a racer with no model yet): the old fixed shot's own numbers. */
const DEFAULT_FRAME = Object.freeze({ y: 0.7, radius: 1.9 });
/** a new kart on the stand pops in from this scale over POP_S seconds, with a little overshoot (none with reduced motion) */
export const POP_FROM = 0.86, POP_S = 0.34;
/** the camera eases to a new box (the stats panel opening, a window resized) at this rate a second (reduced motion: at once) */
const FIT_RATE = 14;

/**
 * The distance a camera (this vertical `fovDeg`) must stand from a sphere of `radius` so it fills
 * `fill` of the tighter side of the frame at this `aspect` (width / height): whichever of the
 * vertical or horizontal half-angle is narrower binds. Pure: the geometry behind the hero shot,
 * clamped to [MIN_DISTANCE, MAX_DISTANCE].
 */
export function frameDistance(radius: number, fovDeg: number, aspect: number, fill = FRAME_FILL): number {
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distV = radius / (fill * Math.sin(vFov / 2));
  const distH = radius / (fill * Math.sin(hFov / 2));
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distV, distH));
}

/** A rectangle on the screen, CSS pixels from the top left. */
export interface Box { x: number; y: number; w: number; h: number }

/**
 * Where the hero stands on the whole screen (`view`): the camera draws the whole canvas, its axis moved to
 * the middle of `box` by a view offset (a lens shift: the kart is seen straight on, wherever the box is), and
 * the distance that fills the box, from the part of the field of view the box spans. Pure.
 */
export function heroFit(view: { w: number; h: number }, box: Box, radius: number, fovDeg: number, fill = FRAME_FILL): { dist: number; offX: number; offY: number } {
  const half = Math.tan((fovDeg * Math.PI) / 360);
  const boxFov = (2 * Math.atan((half * box.h) / Math.max(1, view.h)) * 180) / Math.PI;
  return { dist: frameDistance(radius, boxFov, box.w / Math.max(1, box.h), fill), offX: view.w / 2 - (box.x + box.w / 2), offY: view.h / 2 - (box.y + box.h / 2) };
}

/**
 * The stage's share of the screen `dt` seconds on: toward all of it (1) while it is `on`, toward none (0) when
 * not, over `fadeS` seconds (the screen change's own length), at once with reduced motion. Pure.
 */
export function stageFade(alpha: number, on: boolean, dt: number, fadeS: number, reduced = false): number {
  if (reduced || !(fadeS > 0)) return on ? 1 : 0;
  const step = Math.max(0, dt) / fadeS;
  return on ? Math.min(1, alpha + step) : Math.max(0, alpha - step);
}

/** A pop-in's scale `t` seconds after a new kart went on the stand: POP_FROM up to 1 with a small overshoot (an ease-out-back), then 1. Pure. */
export function popScale(t: number): number {
  if (!(t >= 0) || t >= POP_S) return 1;
  const u = t / POP_S - 1, c = 1.9;
  return POP_FROM + (1 - POP_FROM) * (1 + (c + 1) * u * u * u + c * u * u);
}

/** the contact shadow's half extents across and along the kart (every kart is fitted to the same footprint, glb.ts KART_FIT 2.1 × 1.7 m) and its darkness */
export const SHADOW = Object.freeze({ halfWidth: 1.4, halfLength: 1.65, opacity: 0.64 });
const SHADOW_VERT = /* glsl */ `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// a dark core out to about the wheels (the kart hides its middle: what shows is the contact under the tyres),
// then a soft halo round it
const SHADOW_FRAG = /* glsl */ `varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = ${SHADOW.opacity.toFixed(2)} * (1.0 - smoothstep(0.5, 0.8, d)) + 0.2 * (1.0 - smoothstep(0.8, 1.0, d));
  gl_FragColor = vec4(0.03, 0.04, 0.1, a);
}`;

// the backdrop: the blurred world, cover-fitted to the screen, drifting very slowly, a little darker at the
// edges and along the bottom (the prompt bar); drawn first with no depth, over the race while it fades in
const BACKDROP_VERT = /* glsl */ `varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BACKDROP_FRAG = /* glsl */ `uniform sampler2D map;
uniform float opacity;
uniform vec2 cover;
uniform vec2 drift;
uniform vec3 base;
uniform float ready;
varying vec2 vUv;
void main() {
  vec2 uv = (vUv - 0.5) * cover + 0.5 + drift;
  vec3 c = mix(base, texture2D(map, uv).rgb, ready) * 0.93;
  float edge = smoothstep(1.2, 0.3, length((vUv - vec2(0.56, 0.58)) * vec2(1.0, 1.25)));
  c *= mix(0.68, 1.0, edge) * mix(0.72, 1.0, smoothstep(0.0, 0.24, vUv.y)) * mix(0.84, 1.0, smoothstep(1.0, 0.8, vUv.y));
  gl_FragColor = vec4(c, opacity);
  #include <colorspace_fragment>
}`;

export class Showroom {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 16 / 9, 0.5, 80);
  readonly background = new Color(SHOWROOM_BG);
  /** the kart on the stand, and what it is; a rigged racer (art-pipeline rigged.ts) sits in a KartView and idles, looking at you */
  private kart: { key: string; root: Group; view: KartView | null; state: KartState; frame: { y: number; radius: number }; fresh: boolean; at: number } | null = null;
  private last = -1;
  /** the camera's fit now (eased toward each frame's), or null before the first frame */
  private fit: { dist: number; offX: number; offY: number; y: number } | null = null;
  private readonly stand = new Group();
  private readonly backdrop: { scene: Scene; mesh: Mesh<PlaneGeometry, ShaderMaterial> };
  /** the contact shadow under the kart */
  private readonly shadow: Mesh<PlaneGeometry, ShaderMaterial>;
  /** the backdrop picture's width over height, once in */
  private backdropAspect = 16 / 9;

  constructor(environment: Texture | null = null) {
    this.scene.environment = environment; // the model-file racers' PBR metal needs a reflection
    this.scene.environmentIntensity = 0.8;
    // a warm key, and a strong cool rim from behind so the hero's edge stands off the bright world behind it
    const key = new DirectionalLight(0xffecd0, 2.9);
    key.position.set(3, 7, 5);
    const rim = new DirectionalLight(0xd8e6ff, 2.3);
    rim.position.set(-5, 4, -4);
    this.scene.add(key, rim, new HemisphereLight(0xeef6ff, 0x6a6a58, 1.2), new AmbientLight(0xdfeaff, 0.3));
    // a soft contact shadow on the ground under the kart (the ground itself unseen), so the hero stands, not floats;
    // it stays on the ground when the kart hops
    const shadow = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ vertexShader: SHADOW_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false, toneMapped: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.scale.set(SHADOW.halfWidth, SHADOW.halfLength, 1);
    shadow.renderOrder = -1;
    this.shadow = shadow;
    this.stand.add(shadow);
    this.scene.add(this.stand);
    const material = new ShaderMaterial({
      vertexShader: BACKDROP_VERT, fragmentShader: BACKDROP_FRAG, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        map: { value: null }, opacity: { value: 1 }, cover: { value: [1, 1] }, drift: { value: [0, 0] },
        base: { value: new Color(SHOWROOM_BG).toArray() }, ready: { value: 0 },
      },
    });
    const mesh = new Mesh(new PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    const scene = new Scene();
    scene.add(mesh);
    this.backdrop = { scene, mesh };
    this.camera.position.set(0, 2.5, 8.2);
    this.camera.lookAt(0, 0.7, 0);
  }

  /** The blurred world behind (an sRGB picture). */
  setBackdrop(map: Texture): void {
    map.colorSpace = SRGBColorSpace;
    const u = this.backdrop.mesh.material.uniforms;
    u.map.value = map;
    u.ready.value = 1;
    const img = map.image as { width?: number; height?: number } | undefined;
    if (img?.width && img.height) this.backdropAspect = img.width / img.height;
  }

  /** Put this racer in this look on the stand (built again only when it changes, or once the model files arrive). */
  show(racerId: string, look: KartLook): void {
    const key = `${racerId}|${look.paint ?? ''}|${look.body ?? ''}|${look.kartId ?? ''}|${RACER_MODELS.has(racerId)}`;
    if (this.kart?.key === key) return;
    // the same racer on the stand, only in another kart (the Kart screen's focus moving) or their models just in: no hello again
    const hello = this.kart?.key.split('|')[0] !== racerId;
    this.clearKart();
    const root = buildRacerMesh(racerId, look);
    if (!root) return;
    ownKartMaterials(root);
    const state = createKartState({ racerId });
    const view = root.userData.rig ? new KartView(makeConstants('medium', 150), root, state) : null;
    // the hero close-up stands calm: the engine's rumble is the race's (kart-controller rev.ts)
    if (view) view.engine = false;
    const target = view ? view.root : root;
    this.stand.add(target);
    this.kart = { key, root, view, state, frame: this.frameOf(target), fresh: hello, at: -1 };
  }

  /**
   * The kart-plus-driver bounding sphere, measured once in its rest pose (stable through the
   * turntable's spin, so the hero shot never breathes in and out as it idles) and in the stand's
   * own un-rotated frame (so a rotation already under way does not skew it). Empty geometry (a
   * headless test) keeps the old fixed shot's numbers.
   */
  private frameOf(target: Object3D): { y: number; radius: number } {
    const yaw = this.stand.rotation.y, scale = this.stand.scale.x;
    this.stand.rotation.y = 0;
    this.stand.scale.setScalar(1);
    this.stand.updateMatrixWorld(true);
    const box = new Box3().setFromObject(target);
    this.stand.rotation.y = yaw;
    this.stand.scale.setScalar(scale);
    if (box.isEmpty()) return DEFAULT_FRAME;
    const sphere = box.getBoundingSphere(new Sphere());
    return { y: sphere.center.y, radius: Math.max(sphere.radius, 0.6) };
  }

  /** What stands on the stand now ('' for nothing). */
  get showing(): string { return this.kart?.key ?? ''; }

  /**
   * Turn the stand and aim the camera: the whole canvas is `view` (CSS pixels) and the hero stands in `box`
   * (the whole view when absent). A rigged driver idles and looks at the camera while it can; a racer just
   * put on the stand pops in and bounces hello (not with reduced motion).
   */
  update(nowS: number, reduced: boolean, view: { w: number; h: number }, box: Box = { x: 0, y: 0, w: view.w, h: view.h }): void {
    this.stand.rotation.y = reduced ? STILL_YAW : (nowS * TURN_RATE) % (Math.PI * 2);
    const k = this.kart, dt = this.last < 0 ? 0 : Math.min(0.1, Math.max(0, nowS - this.last));
    this.last = nowS;
    if (k && k.at < 0) {
      k.at = nowS;
      if (k.fresh && !reduced) k.view?.anim.react('bounce');
    }
    this.stand.scale.setScalar(k && !reduced ? popScale(nowS - k.at) : 1);
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
    // this kart's own bounding sphere solves the distance that fills FRAME_FILL of the box, at the camera's
    // fixed fov and look-down angle; a view offset moves it to the box (heroFit). Eased, so the stats panel
    // opening moves the hero smoothly out of its way.
    const frame = k?.frame ?? DEFAULT_FRAME;
    const want = { ...heroFit(view, box, frame.radius, this.camera.fov), y: frame.y };
    const f = this.fit && !reduced && dt > 0 ? this.fit : null;
    const e = f ? 1 - Math.exp(-FIT_RATE * dt) : 1;
    this.fit = f ? { dist: f.dist + (want.dist - f.dist) * e, offX: f.offX + (want.offX - f.offX) * e, offY: f.offY + (want.offY - f.offY) * e, y: f.y + (want.y - f.y) * e } : want;
    const fit = this.fit;
    this.camera.aspect = view.w / Math.max(1, view.h);
    this.camera.setViewOffset(view.w, view.h, fit.offX, fit.offY, view.w, view.h);
    this.camera.position.set(0, fit.y + fit.dist * Math.sin(CAMERA_ELEVATION), fit.dist * Math.cos(CAMERA_ELEVATION));
    this.camera.lookAt(0, fit.y, 0);
    this.camera.updateProjectionMatrix();
    // the backdrop covers the screen whatever its shape, zoomed a touch so its slow drift never shows an edge
    const va = view.w / Math.max(1, view.h), ta = this.backdropAspect, zoom = 1 / 1.06;
    const u = this.backdrop.mesh.material.uniforms;
    u.cover.value = va > ta ? [zoom, (zoom * ta) / va] : [(zoom * va) / ta, zoom];
    u.drift.value = reduced ? [0, 0] : [0.018 * Math.sin(nowS * 0.07), 0.01 * Math.sin(nowS * 0.05 + 1.3)];
  }

  /**
   * Draw the stage over whatever the canvas holds: the backdrop at `alpha` (0 to 1: fading in over the race,
   * or out), then, with `hero`, the kart on top. The caller has updated it this frame and set the viewport to
   * the whole canvas.
   */
  draw(renderer: WebGLRenderer, alpha: number, hero = true): void {
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    this.backdrop.mesh.material.uniforms.opacity.value = alpha;
    renderer.clearDepth();
    renderer.render(this.backdrop.scene, this.camera);
    if (this.kart && hero) { renderer.clearDepth(); renderer.render(this.scene, this.camera); }
    renderer.autoClear = auto;
  }

  /**
   * Compile its programs now (a kart in each kind of material on the stand, and the backdrop), so the racer screen
   * never waits on a shader. Never swaps a kart already on show; the one it put there goes again once compiled,
   * unless the stage has shown it meanwhile (so the first racer on show still says hello).
   */
  precompile(renderer: WebGLRenderer, racerId: string, look: KartLook): Promise<unknown> {
    const mine = !this.kart;
    if (mine) this.show(racerId, look);
    const warm = mine ? this.kart : null;
    if (warm) warm.at = -2; // (update() marks it shown: at ≥ 0)
    return Promise.all([renderer.compileAsync(this.scene, this.camera), renderer.compileAsync(this.backdrop.scene, this.camera)])
      .finally(() => { if (warm && this.kart === warm && warm.at === -2) this.clearKart(); });
  }

  /** Nothing on the stand (the stage has gone: its kart's copies are freed, and the next racer on show says hello again). */
  empty(): void { this.clearKart(); }

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
    this.backdrop.mesh.geometry.dispose();
    this.backdrop.mesh.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }
}

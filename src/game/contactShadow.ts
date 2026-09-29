// The contact shade under each kart (second MKW gap review, 28 Sept 2026, item 5). The sun's cast shadows
// were near-black; lit to Mario Kart World's fill (game/shadow.ts SUN_SHADOW.intensity), a kart would float
// on its own pale shadow. What holds it down is the light its body keeps off the road right under it: the
// sky's and the bounce's, which one sun shadow map never takes away. MKW's kart shadows are darkest there,
// between and round the wheels (OSU-aguh1AY 1:11 and 2:44: the core under the rear axle darker than the rest
// of the shadow). The industry's answer is a soft occlusion shape under the character on top of the sun's
// own shadow map: Unreal Engine's capsule shadows exist so "the soft shadows serve to ground the character in
// indirectly lit areas" (dev.epicgames.com, "Capsule Shadows Overview"); the same idea as the blob shadow a
// menu hero already stands on here (showroom.ts SHADOW). So: a soft, rounded shade over the kart's own
// footprint (every kart is fitted to the same one, KART_FIT 2.1 × 1.7 m), darkest under the body, gone a
// hand's width past the wheels, on the road under the kart's own tilt (a bank, a ramp, a loop), fading as
// the kart leaves the road (a jump, a hit's toss, a trick) and near the lens. One InstancedMesh for the whole
// field: one draw call; it casts and takes no shadow; it works on the Low tier too, where there is no shadow map.
import {
  DoubleSide, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector3, type Object3D,
} from 'three';
import type { KartState, Vec3 } from '../kart-controller/types.ts';

export const CONTACT = Object.freeze({
  /** half extents across and along the kart (m): the fitted footprint is 1.7 × 2.1, so the shade ends 10 to 15 cm past the kart */
  halfWidth: 1.0,
  halfLength: 1.15,
  /** where the dark core ends and the fade to nothing begins, as a share of the half extents (a rounded box, a superellipse of power 6) */
  core: 0.72,
  /**
   * The share of the light the core takes away: MKW's road right under a kart's rear axle is 0.21 to 0.24 of the lit
   * road (OSU-aguh1AY 1:11, 2:44), about the kart's own cast shadow (0.5, game/shadow.ts) times 0.4
   */
  strength: 0.6,
  /** its colour: the sky's shade, a little blue (linear RGB) */
  tint: [0.02, 0.03, 0.07] as readonly [number, number, number],
  /** m over the road (with a polygon offset): never fights the road for depth */
  lift: 0.025,
  /** 1/s: it fades out as the kart leaves the road and back as it lands */
  fadeRate: 14,
  /** m the body rises (a hit's toss, a trick's lift) over which the shade under it fades away */
  rise: [0.05, 0.45] as readonly [number, number],
  /** m from the lens: none nearer than near[0] (a rival brushing the camera), whole from near[1] */
  near: [1.4, 3] as readonly [number, number],
  /** m from the lens: whole to far[0], none past far[1] (the haze has the kart by then; the shade is unfogged) */
  far: [55, 80] as readonly [number, number],
});

const smooth = (a: number, b: number, x: number): number => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/**
 * How much of its shade a kart shows (0..1), before its landing ease: `rise` metres its body stands over its
 * root on the road (the chassis's own lift), `dist` metres from the lens. Pure.
 */
export function contactShade(rise: number, dist: number, c = CONTACT): number {
  return (1 - smooth(c.rise[0], c.rise[1], rise)) * smooth(c.near[0], c.near[1], dist) * (1 - smooth(c.far[0], c.far[1], dist));
}

/**
 * The shade's darkness at (x, z) in the quad's own units (−1..1 across and along: its edges at ±1): a rounded
 * box (a superellipse of power 6) dark to `core`, then a smooth fade to nothing at the edge. Mirrors the shader. Pure.
 */
export function contactAlpha(x: number, z: number, c = CONTACT): number {
  const d = Math.pow(Math.pow(Math.abs(x), 6) + Math.pow(Math.abs(z), 6), 1 / 6);
  return c.strength * (1 - smooth(c.core, 1, d));
}

const VERT = /* glsl */ `
attribute float shade;
varying vec2 vXZ;
varying float vShade;
void main() {
  vXZ = position.xz;
  vShade = shade;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */ `
uniform vec3 tint;
varying vec2 vXZ;
varying float vShade;
void main() {
  vec2 p = abs(vXZ);
  float d = pow(pow(p.x, 6.0) + pow(p.y, 6.0), 1.0 / 6.0);
  float a = ${CONTACT.strength.toFixed(3)} * (1.0 - smoothstep(${CONTACT.core.toFixed(3)}, 1.0, d)) * vShade;
  if (a < 0.002) discard;
  gl_FragColor = vec4(tint, a);
}`;

/** What the shade reads of a kart's view (kart-controller view.ts KartView): its root on the road, and how far its body is off it. */
export interface ShadedKart {
  readonly root: Object3D;
  /** m the body stands off the road over the root this frame (a hit's toss, a trick's lift; not the lean in a turn) */
  readonly bodyRise: number;
}

/** The shades under a race's karts: `add` its mesh to the scene, `update` once a frame after the karts are posed. */
export class ContactShadows {
  readonly mesh: InstancedMesh;
  private readonly shade: InstancedBufferAttribute;
  /** each kart's eased landing fade (1 on the road, 0 in the air) */
  private readonly onRoad: Float32Array;
  private readonly m = new Matrix4();
  private readonly scale = new Matrix4();
  private readonly up = new Vector3();

  constructor(count: number) {
    const geo = new PlaneGeometry(2, 2);
    geo.rotateX(-Math.PI / 2); // lies on the ground: x across the kart, z along it
    this.shade = new InstancedBufferAttribute(new Float32Array(Math.max(1, count)), 1);
    geo.setAttribute('shade', this.shade);
    const mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: { tint: { value: [...CONTACT.tint] } },
      transparent: true, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    });
    this.mesh = new InstancedMesh(geo, mat, Math.max(1, count));
    this.mesh.name = 'contact-shadows';
    this.mesh.count = count;
    this.mesh.frustumCulled = false; // the karts spread over the whole course; one quad each is nothing to draw
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = -1; // the first of the see-through things (after the sea), under the sparks and dust
    this.onRoad = new Float32Array(Math.max(1, count)).fill(1);
    this.scale.makeScale(CONTACT.halfWidth, 1, CONTACT.halfLength);
  }

  /**
   * Once a frame after the karts are posed: each kart's shade on the road under its root (its place, heading
   * and tilt to the ground), fading with its body's rise off the road, in the air, and with distance from
   * `eye` (the camera). `dt`: the frame's seconds (0 while paused: nothing eases).
   */
  update(views: readonly ShadedKart[], karts: readonly Readonly<KartState>[], eye: Readonly<Vec3> | null, dt: number): void {
    const n = Math.min(views.length, this.onRoad.length);
    const k = 1 - Math.exp(-CONTACT.fadeRate * Math.max(0, dt));
    for (let i = 0; i < n; i++) {
      const root = views[i].root, s = karts[i];
      root.updateMatrix();
      // on the road under the kart: its root's own frame (heading and tilt), lifted a little along its up
      this.m.multiplyMatrices(root.matrix, this.scale);
      this.up.set(0, CONTACT.lift, 0).applyQuaternion(root.quaternion);
      this.m.elements[12] += this.up.x; this.m.elements[13] += this.up.y; this.m.elements[14] += this.up.z;
      this.mesh.setMatrixAt(i, this.m);
      const grounded = s ? s.grounded || s.status.loopIndex >= 0 : true;
      this.onRoad[i] += ((grounded ? 1 : 0) - this.onRoad[i]) * k;
      const p = root.position;
      const dist = eye ? Math.hypot(p.x - eye[0], p.y - eye[1], p.z - eye[2]) : CONTACT.near[1];
      this.shade.array[i] = this.onRoad[i] * contactShade(views[i].bodyRise, dist);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.shade.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
    this.mesh.dispose();
  }
}

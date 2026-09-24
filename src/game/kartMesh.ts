// Placeholder kart: a toon-shaded body, a driver blob and four wheels, sized to the
// collision circle. Art pipeline replaces this whole file with a GLB loader.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshToonMaterial, SphereGeometry, type Material, type Object3D } from 'three';
import { flameMaterial } from '../art-pipeline/index.ts';
import { BASE } from '../kart-controller/constants.ts';
import { fadeNearCamera } from '../track-builder/mesh/glow.ts';
import { CAM } from './camera.ts';

const R = BASE.kartRadius;
const BODY = new BoxGeometry(R * 1.5, 0.45, R * 2.1);
const NOSE = new BoxGeometry(R * 1.1, 0.25, R * 0.6);
const HEAD = new SphereGeometry(0.33, 12, 8);
const WHEEL = new CylinderGeometry(0.3, 0.3, 0.22, 10).rotateZ(Math.PI / 2);
const WHEEL_MAT = new MeshToonMaterial({ color: 0x23201d });

/** A kart mesh with its origin on the ground, facing +Z (the controller's forward). */
export function buildKartMesh(accent: number, secondary: number): Group {
  const g = new Group();
  const body = new Mesh(BODY, new MeshToonMaterial({ color: accent }));
  body.position.y = 0.45;
  body.castShadow = true;
  g.add(body);

  const nose = new Mesh(NOSE, new MeshToonMaterial({ color: secondary }));
  nose.position.set(0, 0.42, R * 1.2);
  g.add(nose);

  const head = new Mesh(HEAD, new MeshToonMaterial({ color: secondary }));
  head.position.set(0, 0.92, -0.1);
  head.castShadow = true;
  g.add(head);

  for (const [x, z] of [[-R * 0.8, R * 0.75], [R * 0.8, R * 0.75], [-R * 0.8, -R * 0.75], [R * 0.8, -R * 0.75]]) {
    const w = new Mesh(WHEEL, WHEEL_MAT);
    w.position.set(x, 0.3, z);
    g.add(w);
  }
  return g;
}

/** The kart's own surfaces (an exhaust flame is the shared flame material, handled on its own). */
function lit(m: Material): boolean {
  const f = m as Material & { isMeshToonMaterial?: boolean; isMeshStandardMaterial?: boolean; isMeshLambertMaterial?: boolean; isMeshPhongMaterial?: boolean };
  return !!(f.isMeshToonMaterial || f.isMeshStandardMaterial || f.isMeshLambertMaterial || f.isMeshPhongMaterial);
}

let rivalFlame: Material | null = null;
/** The boost flame for rivals: the shared flame, faded near the lens too (shared across races, never disposed). */
function fadedFlame(): Material {
  if (!rivalFlame) {
    rivalFlame = flameMaterial().clone();
    rivalFlame.userData.shared = true;
    fadeNearCamera(rivalFlame, CAM.kartFade);
  }
  return rivalFlame;
}

/**
 * A rival pressed against the lens (tucked in between you and the camera, or passing close by)
 * dissolves within CAM.kartFade metres, its boost flames with it, as props do, instead of filling
 * the screen and hiding you. Call it once the flames are on the kart.
 */
export function fadeKartNearCamera(root: Object3D): void {
  eachLit(root, (x) => { fadeNearCamera(x, CAM.kartFade); return x; });
  root.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).material === flameMaterial()) (o as Mesh).material = fadedFlame(); });
}

/**
 * Your own kart never dissolves: its materials (shared by every clone of the racer's model, and
 * faded when that racer is a rival) become its own unpatched copies, freed with the session.
 */
export function ownKartMaterials(root: Object3D): void {
  eachLit(root, (x) => {
    const c = x.clone(); // a clone copies the userData but not the fade patch
    c.userData.shared = false;
    return c;
  });
}

function eachLit(root: Object3D, f: (m: Material) => Material): void {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((x) => (lit(x) ? f(x) : x));
    else if (mesh.material && lit(mesh.material)) mesh.material = f(mesh.material);
  });
}

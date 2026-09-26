// Placeholder kart: a toon-shaded body, a driver blob and four wheels, sized to the
// collision circle. Art pipeline replaces this whole file with a GLB loader.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshToonMaterial, SphereGeometry, type Material, type Object3D } from 'three';
import { BASE } from '../kart-controller/constants.ts';

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

/** The kart's own surfaces (lit materials; an exhaust flame is its own shader). */
function lit(m: Material): boolean {
  const f = m as Material & { isMeshToonMaterial?: boolean; isMeshStandardMaterial?: boolean; isMeshLambertMaterial?: boolean; isMeshPhongMaterial?: boolean };
  return !!(f.isMeshToonMaterial || f.isMeshStandardMaterial || f.isMeshLambertMaterial || f.isMeshPhongMaterial);
}

/**
 * Your own kart never fades (a rival's turns to a ghost through copies of its own: kartFade.ts). Its
 * materials, shared by every clone of the racer's model, become its own copies, freed with the session.
 * A clone copies neither `onBeforeCompile` nor `customProgramCacheKey` (kartFade.ts's `variant()` carries
 * the same note): without carrying them over by hand, the copy would silently drop the world's PBR
 * lighting patch (look.ts's litWorld: the sun's gain, the wrap term, the sky's light) and any racer-only
 * one (rigged.ts's racerRim), reverting to three's plain defaults — bug hunt, 25 Sept 2026: this is why a
 * dark racer (Boulder, Momo) read as a flat black shape only in your own kart or on the podium (every
 * racer there is its own copy too), never as a rival mid-race.
 */
export function ownKartMaterials(root: Object3D): void {
  eachLit(root, (x) => {
    const c = x.clone(); // its own: nothing done to a rival's reaches it
    c.userData.shared = false;
    c.onBeforeCompile = x.onBeforeCompile;
    c.customProgramCacheKey = x.customProgramCacheKey;
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

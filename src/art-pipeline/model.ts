// Model builder: add coloured primitives, get back one merged vertex-coloured geometry and a
// matching outline hull. Every part is inflated by an absolute ink width along its own axes,
// so boxes and spheres both get an even outline with no cracks at the corners.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, IcosahedronGeometry,
  Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];

interface PartSpec { geo: BufferGeometry; colour: Color; pos: V3; rot: V3; scale: V3; outline: boolean }

const tmpM = new Matrix4(), tmpQ = new Quaternion(), tmpE = new Euler(), tmpS = new Vector3(), tmpP = new Vector3();

function place(g: BufferGeometry, pos: V3, rot: V3, scale: V3): BufferGeometry {
  tmpE.set(rot[0], rot[1], rot[2]);
  tmpQ.setFromEuler(tmpE);
  tmpM.compose(tmpP.set(...pos), tmpQ, tmpS.set(...scale));
  return g.applyMatrix4(tmpM);
}

function paint(g: BufferGeometry, c: Color): BufferGeometry {
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new BufferAttribute(a, 3));
  return g;
}

/** Keep only position, normal and colour, indexed, so every part merges with every other. */
function normalise(g: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
  if (!g.index) {
    const n = g.getAttribute('position').count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new BufferAttribute(idx, 1));
  }
  g.clearGroups();
  return g;
}

export class ModelBuilder {
  private readonly parts: PartSpec[] = [];
  /** outline width in metres at scale 1 */
  readonly ink: number;
  constructor(ink = 0.045) { this.ink = ink; }

  private push(geo: BufferGeometry, colour: string | number, pos: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], outline = true): this {
    this.parts.push({ geo, colour: new Color(colour), pos, rot, scale, outline });
    return this;
  }

  box(size: V3, colour: string | number, pos: V3, rot?: V3, outline = true): this {
    return this.push(new BoxGeometry(size[0], size[1], size[2]), colour, pos, rot, [1, 1, 1], outline);
  }
  /** A sphere of radius 1 scaled to `radii` (an ellipsoid). */
  ball(radii: V3, colour: string | number, pos: V3, rot?: V3, detail = 14, outline = true): this {
    return this.push(new SphereGeometry(1, detail, Math.max(6, detail * 0.66 | 0)), colour, pos, rot, radii, outline);
  }
  cyl(rTop: number, rBottom: number, h: number, colour: string | number, pos: V3, rot?: V3, seg = 12, outline = true): this {
    return this.push(new CylinderGeometry(rTop, rBottom, h, seg), colour, pos, rot, [1, 1, 1], outline);
  }
  cone(r: number, h: number, colour: string | number, pos: V3, rot?: V3, seg = 10, outline = true): this {
    return this.push(new ConeGeometry(r, h, seg), colour, pos, rot, [1, 1, 1], outline);
  }
  torus(r: number, tube: number, colour: string | number, pos: V3, rot?: V3, outline = true): this {
    return this.push(new TorusGeometry(r, tube, 8, 18), colour, pos, rot, [1, 1, 1], outline);
  }
  rock(r: number, colour: string | number, pos: V3, rot?: V3, scale: V3 = [1, 1, 1]): this {
    return this.push(new IcosahedronGeometry(r, 0), colour, pos, rot, scale, true);
  }
  /** A cartoon eye: white ball with a dark pupil, facing +Z. */
  eye(r: number, pos: V3, look: V3 = [0, 0, 1]): this {
    this.ball([r, r, r * 0.8], '#ffffff', pos, [0, 0, 0], 10, false);
    return this.ball([r * 0.5, r * 0.5, r * 0.4], '#1b1b2f', [pos[0] + look[0] * r * 0.25, pos[1] + look[1] * r * 0.25, pos[2] + r * 0.62], [0, 0, 0], 8, false);
  }

  /** The merged body. One draw call. */
  build(): BufferGeometry {
    const gs = this.parts.map((p) => normalise(paint(place(p.geo.clone(), p.pos, p.rot, p.scale), p.colour)));
    const out = mergeGeometries(gs, false)!;
    out.computeBoundingSphere();
    out.computeBoundingBox();
    return out;
  }

  /** The ink hull: every outlined part inflated by `ink` metres on each side. One draw call. */
  outline(): BufferGeometry {
    const gs: BufferGeometry[] = [];
    for (const p of this.parts) {
      if (!p.outline) continue;
      const g = p.geo.clone();
      g.computeBoundingBox();
      const s = new Vector3();
      g.boundingBox!.getSize(s);
      // inflate in the part's own frame so the ink is even whatever the part's scale
      const k = (i: number, size: number) => (size * p.scale[i] + 2 * this.ink) / Math.max(1e-4, size * p.scale[i]);
      const scale: V3 = [p.scale[0] * k(0, s.x), p.scale[1] * k(1, s.y), p.scale[2] * k(2, s.z)];
      gs.push(normalise(paint(place(g, p.pos, p.rot, scale), new Color(0, 0, 0))));
    }
    const out = mergeGeometries(gs, false)!;
    out.deleteAttribute('color');
    out.computeBoundingSphere();
    return out;
  }

  get partCount(): number { return this.parts.length; }
}

// Model builder: add coloured primitives, get back one merged vertex-coloured geometry and a
// matching outline hull. Every part is inflated by an absolute ink width along its own axes,
// so boxes and spheres both get an even outline with no cracks at the corners. Each part's ink
// is a deep shade of its own colour (a soft coloured edge, not a black line).
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, IcosahedronGeometry,
  Matrix4, Quaternion, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];
/** A CSS colour, a hex number, or linear RGB where values above 1 glow through the bloom. */
export type Paint = string | number | readonly [number, number, number];

const toColor = (c: Paint): Color => (typeof c === 'object' ? new Color().setRGB(c[0], c[1], c[2]) : new Color(c));

const hsl = { h: 0, s: 0, l: 0 };
/** sRGB lightness below which a part gets no outline: tyres and other near-black parts are their own edge */
export const INK_SKIP_LIGHTNESS = 0.25;

/** A part's sRGB lightness (0 black, 1 white). */
export function lightness(c: Color): number {
  new Color(Math.min(1, c.r), Math.min(1, c.g), Math.min(1, c.b)).getHSL(hsl, SRGBColorSpace);
  return hsl.l;
}

/**
 * The outline colour for a part: a mid-tone of its own colour, never black (the user's call,
 * 2026-09-23): red edged in a richer red, teal in a deeper teal, white in a soft blue-grey.
 */
export function inkFor(c: Color): Color {
  new Color(Math.min(1, c.r), Math.min(1, c.g), Math.min(1, c.b)).getHSL(hsl, SRGBColorSpace);
  // greys and whites get a cool tint so their edge reads as shade, not dirt
  const grey = hsl.s < 0.08;
  return new Color().setHSL(grey ? 0.62 : hsl.h, grey ? 0.25 : Math.min(1, hsl.s * 1.15 + 0.1), Math.min(0.55, Math.max(0.18, hsl.l * 0.68)), SRGBColorSpace);
}

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

  private push(geo: BufferGeometry, colour: Paint, pos: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], outline = true): this {
    this.parts.push({ geo, colour: toColor(colour), pos, rot, scale, outline });
    return this;
  }

  box(size: V3, colour: Paint, pos: V3, rot?: V3, outline = true): this {
    return this.push(new BoxGeometry(size[0], size[1], size[2]), colour, pos, rot, [1, 1, 1], outline);
  }
  /** A sphere of radius 1 scaled to `radii` (an ellipsoid). */
  ball(radii: V3, colour: Paint, pos: V3, rot?: V3, detail = 14, outline = true): this {
    return this.push(new SphereGeometry(1, detail, Math.max(4, detail * 0.66 | 0)), colour, pos, rot, radii, outline);
  }
  cyl(rTop: number, rBottom: number, h: number, colour: Paint, pos: V3, rot?: V3, seg = 12, outline = true): this {
    return this.push(new CylinderGeometry(rTop, rBottom, h, seg), colour, pos, rot, [1, 1, 1], outline);
  }
  cone(r: number, h: number, colour: Paint, pos: V3, rot?: V3, seg = 10, outline = true): this {
    return this.push(new ConeGeometry(r, h, seg), colour, pos, rot, [1, 1, 1], outline);
  }
  torus(r: number, tube: number, colour: Paint, pos: V3, rot?: V3, outline = true): this {
    return this.push(new TorusGeometry(r, tube, 8, 18), colour, pos, rot, [1, 1, 1], outline);
  }
  rock(r: number, colour: Paint, pos: V3, rot?: V3, scale: V3 = [1, 1, 1]): this {
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

  /**
   * An optional ink hull: every outlined part inflated by `ink` metres, in a mid-tone of its own
   * colour. The game draws none since 2026-09-23 (the user's call; Mario Kart World has no outlines).
   */
  outline(): BufferGeometry {
    const gs: BufferGeometry[] = [];
    for (const p of this.parts) {
      if (!p.outline || lightness(p.colour) < INK_SKIP_LIGHTNESS) continue;
      const g = p.geo.clone();
      g.computeBoundingBox();
      const s = new Vector3();
      g.boundingBox!.getSize(s);
      // inflate in the part's own frame so the ink is even whatever the part's scale
      const k = (i: number, size: number) => (size * p.scale[i] + 2 * this.ink) / Math.max(1e-4, size * p.scale[i]);
      const scale: V3 = [p.scale[0] * k(0, s.x), p.scale[1] * k(1, s.y), p.scale[2] * k(2, s.z)];
      gs.push(normalise(paint(place(g, p.pos, p.rot, scale), inkFor(p.colour))));
    }
    const out = mergeGeometries(gs, false)!;
    out.computeBoundingSphere();
    return out;
  }

  get partCount(): number { return this.parts.length; }
}

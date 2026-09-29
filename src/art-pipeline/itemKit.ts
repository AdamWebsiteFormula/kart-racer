// The item models' kit (28 Sept 2026, the new set; Adam: "something cool and maybe a little more edgy",
// "still rated G, just in a cool way"). Parts are added in a finish of their own and merged into one
// geometry that the race draws in one PBR material (items.ts itemMaterial): every vertex carries its color
// and its finish in `pbr` (metalness, roughness, glow, the pickup balloons' night glow), so chrome, glossy
// paint, tinted glass and lights share one batched draw. The glows' own models (additive light: a bolt's
// halo, a flame, a beam) are made the same way with `energy()`: position, normal and an RGBA color whose
// alpha fades their edges, drawn in the additive energy material.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Euler, ExtrudeGeometry,
  LatheGeometry, Matrix4, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];
/** A CSS color or hex number (sRGB), or linear RGB where values above 1 glow through the bloom. */
export type Tint = string | number | readonly [number, number, number];

/** A part's finish: metalness and roughness (0..1), how many times its color it glows, and its share of the pickup balloons' night glow. */
export interface Finish { metal: number; rough: number; glow?: number; pickup?: number }

/** The finishes the models share. */
export const FINISH = Object.freeze({
  /** glossy lacquered paint */
  paint: Object.freeze({ metal: 0.2, rough: 0.28 }),
  /** metallic candy paint (the Nitro canister's blue) */
  candy: Object.freeze({ metal: 0.6, rough: 0.24 }),
  chrome: Object.freeze({ metal: 1, rough: 0.12 }),
  /** dark brushed metal: nozzles, arms, bands */
  steel: Object.freeze({ metal: 0.85, rough: 0.38 }),
  rubber: Object.freeze({ metal: 0, rough: 0.75 }),
  /** a canopy's or a dome's tinted glass: a dark mirror of the sky */
  glass: Object.freeze({ metal: 0.75, rough: 0.05 }),
  /** the pickup balloon's own matte skin, self-lit at night like the real ones (track-builder glow.ts selfLit) */
  balloon: Object.freeze({ metal: 0, rough: 0.9, pickup: 1 }),
  /** a light or a glowing core: its color `k` times over (above 1 blooms) */
  light: (k: number): Finish => ({ metal: 0, rough: 1, glow: k }),
});

const toLinear = (c: Tint): Color => (typeof c === 'object' ? new Color().setRGB(c[0], c[1], c[2]) : new Color(c));

const tmpM = new Matrix4(), tmpQ = new Quaternion(), tmpE = new Euler(), tmpS = new Vector3(), tmpP = new Vector3();

/** `g` moved to `pos`, turned by `rot` (XYZ Euler) and scaled. */
function place(g: BufferGeometry, pos: V3, rot: V3, scale: V3): BufferGeometry {
  tmpE.set(rot[0], rot[1], rot[2]);
  tmpQ.setFromEuler(tmpE);
  tmpM.compose(tmpP.set(pos[0], pos[1], pos[2]), tmpQ, tmpS.set(scale[0], scale[1], scale[2]));
  return g.applyMatrix4(tmpM);
}

/** Only position and normal, indexed, every normal of unit length (a zero-length one is a NaN pixel through the bloom: 26 Sept 2026). */
function clean(g: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const n = g.getAttribute('normal') as BufferAttribute;
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = Math.hypot(x, y, z);
    if (!(l > 1e-6)) n.setXYZ(i, 0, 1, 0); else n.setXYZ(i, x / l, y / l, z / l);
  }
  if (!g.index) {
    const count = g.getAttribute('position').count, idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    g.setIndex(new BufferAttribute(idx, 1));
  }
  g.clearGroups();
  return g;
}

/** A lathe round +Y from (radius, height) points. */
export function latheY(profile: readonly (readonly [number, number])[], segments = 18): BufferGeometry {
  return new LatheGeometry(profile.map(([r, y]) => new Vector2(Math.max(0, r), y)), segments);
}

/**
 * A flat plate: the outline `pts` in the XZ plane (x across, z along), `thick` metres from y −thick/2 to
 * +thick/2, edges rounded by `bevel` (a wing, a fin).
 */
export function plateXZ(pts: readonly (readonly [number, number])[], thick: number, bevel = 0): BufferGeometry {
  const s = new Shape(pts.map(([x, z]) => new Vector2(x, z)));
  const depth = Math.max(1e-3, thick - 2 * bevel);
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 4 });
  // the shape's y is the plate's z; the extrusion (0..depth along +z) its thickness, down −y from the top
  g.rotateX(Math.PI / 2);
  g.translate(0, depth / 2, 0);
  return g;
}

interface Part { geo: BufferGeometry; color: Color; alpha: number; finish: Finish }

/** Builds one solid model: parts in their own finish, merged, with `color` and `pbr` per vertex. */
export class ItemBuilder {
  private readonly parts: Part[] = [];

  /** A hand-made part, placed. */
  part(geo: BufferGeometry, tint: Tint, finish: Finish, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    this.parts.push({ geo: place(geo, pos, rot, scale), color: toLinear(tint), alpha: 1, finish });
    return this;
  }
  box(size: V3, tint: Tint, finish: Finish, pos: V3, rot?: V3): this {
    return this.part(new BoxGeometry(size[0], size[1], size[2]), tint, finish, pos, rot);
  }
  /** A unit sphere scaled to `radii`. */
  ball(radii: V3, tint: Tint, finish: Finish, pos: V3, rot?: V3, detail = 16): this {
    return this.part(new SphereGeometry(1, detail, Math.max(6, Math.round(detail * 0.7))), tint, finish, pos, rot, radii);
  }
  cyl(rTop: number, rBottom: number, h: number, tint: Tint, finish: Finish, pos: V3, rot?: V3, seg = 16): this {
    return this.part(new CylinderGeometry(rTop, rBottom, h, seg), tint, finish, pos, rot);
  }
  cone(r: number, h: number, tint: Tint, finish: Finish, pos: V3, rot?: V3, seg = 12): this {
    return this.part(new ConeGeometry(r, h, seg), tint, finish, pos, rot);
  }
  torus(r: number, tube: number, tint: Tint, finish: Finish, pos: V3, rot?: V3, arc = Math.PI * 2, tubular = 28): this {
    return this.part(new TorusGeometry(r, tube, 8, tubular, arc), tint, finish, pos, rot);
  }
  /** A capsule along +Y: `len` between the two half-sphere ends. */
  capsule(r: number, len: number, tint: Tint, finish: Finish, pos: V3, rot?: V3, seg = 12): this {
    return this.part(new CapsuleGeometry(r, len, 4, seg), tint, finish, pos, rot);
  }
  /** A flat disc facing +Y. */
  disc(r: number, tint: Tint, finish: Finish, pos: V3, rot?: V3, seg = 16): this {
    return this.part(new CircleGeometry(r, seg).rotateX(-Math.PI / 2), tint, finish, pos, rot);
  }
  lathe(profile: readonly (readonly [number, number])[], tint: Tint, finish: Finish, pos: V3, rot?: V3, seg = 18, scale: V3 = [1, 1, 1]): this {
    return this.part(latheY(profile, seg), tint, finish, pos, rot, scale);
  }

  get partCount(): number { return this.parts.length; }

  /** The merged model: position, normal, color and pbr (metalness, roughness, glow, pickup glow), indexed. */
  build(): BufferGeometry {
    const gs = this.parts.map((p) => {
      const g = clean(p.geo);
      const n = g.getAttribute('position').count;
      const col = new Float32Array(n * 3), pbr = new Float32Array(n * 4);
      const f = p.finish;
      for (let i = 0; i < n; i++) {
        col[i * 3] = p.color.r; col[i * 3 + 1] = p.color.g; col[i * 3 + 2] = p.color.b;
        pbr[i * 4] = f.metal; pbr[i * 4 + 1] = f.rough; pbr[i * 4 + 2] = f.glow ?? 0; pbr[i * 4 + 3] = f.pickup ?? 0;
      }
      g.setAttribute('color', new BufferAttribute(col, 3));
      g.setAttribute('pbr', new BufferAttribute(pbr, 4));
      return g;
    });
    const out = mergeGeometries(gs, false)!;
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  }
}

/**
 * Builds one energy model (additive light): parts with an RGBA color per vertex, the alpha a share of the
 * light. `fade(part vertex) → 0..1` shapes a part's light along it (a flame's tip, a beam's ends).
 */
export class EnergyBuilder {
  private readonly parts: { geo: BufferGeometry; rgba: (p: Vector3) => [number, number, number, number] }[] = [];

  part(geo: BufferGeometry, rgba: [number, number, number, number] | ((p: Vector3) => [number, number, number, number]), pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    this.parts.push({ geo: place(geo, pos, rot, scale), rgba: typeof rgba === 'function' ? rgba : () => rgba });
    return this;
  }

  build(): BufferGeometry {
    const v = new Vector3();
    const gs = this.parts.map(({ geo, rgba }) => {
      const g = clean(geo);
      const p = g.getAttribute('position'), n = p.count, col = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const c = rgba(v.set(p.getX(i), p.getY(i), p.getZ(i)));
        col.set(c, i * 4);
      }
      g.setAttribute('color', new BufferAttribute(col, 4));
      return g;
    });
    const out = mergeGeometries(gs, false)!;
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  }
}

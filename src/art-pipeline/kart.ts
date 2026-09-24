// Racer meshes for the game: one vertex-coloured body per racer (no outline: Mario Kart World
// draws none, and neither do we since 2026-09-23), geometry cached per racer so eight karts
// never rebuild. Three.js objects only; the geometry maths is in model.ts.
// A kart's look (design §10 unlocks, cosmetic only): an alt paint, and a shared body (Classic,
// Buggy) with the racer's driver seated in it in place of their signature kart.
import { Color, Group, Mesh, SRGBColorSpace, type BufferGeometry } from 'three';
import { bodyInto, BODY_EXHAUST, KART_COLOURS, type BodyId } from './bodies.ts';
import { RACER_MODELS } from './glb.ts';
import { ModelBuilder } from './model.ts';
import { paintFor, repaintHex, repaintRgb, type Paint } from './paints.ts';
import { EXHAUST, racerModel, type Exhaust } from './racers.ts';
import { vertexToon } from './toon.ts';

/** How a kart looks: an alt paint id (paints.ts) and a body (bodies.ts). Absent = the racer's own. */
export interface KartLook { paint?: string; body?: BodyId }

const cache = new Map<string, { body: BufferGeometry }>();

/** A code-built model's colours through an alt paint (sRGB rules on linear colours; glowing parts, above 1, are left alone). */
function recolorFor(p: Paint | undefined): ((c: Color) => Color) | undefined {
  if (!p) return undefined;
  const px = [0, 0, 0], srgb = { r: 0, g: 0, b: 0 };
  return (c) => {
    if (c.r > 1 || c.g > 1 || c.b > 1) return c;
    c.getRGB(srgb, SRGBColorSpace);
    repaintRgb(srgb.r, srgb.g, srgb.b, p.rules, px);
    return new Color().setRGB(px[0], px[1], px[2], SRGBColorSpace);
  };
}

/** A shared body's two colours for this racer and paint. */
export function bodyColours(racerId: string, paintId?: string): { primary: string; secondary: string } {
  const c = KART_COLOURS[racerId] ?? KART_COLOURS.pip;
  const p = paintFor(racerId, paintId);
  if (!p) return c;
  return { primary: p.primary ?? repaintHex(c.primary, p.rules), secondary: p.secondary ?? repaintHex(c.secondary, p.rules) };
}

/**
 * The code-built geometry for a racer in a look: their signature kart and driver, or a shared body
 * with (`withDriver`) or without their code-built driver seated in it. Cached; never disposed.
 */
export function racerGeometry(id: string, look: KartLook = {}, withDriver = true): { body: BufferGeometry } | null {
  const paint = paintFor(id, look.paint);
  const body = look.body && look.body !== 'standard' ? look.body : undefined;
  const key = `${id}|${paint?.id ?? ''}|${body ?? ''}|${withDriver ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let m: ModelBuilder | null;
  if (body && !withDriver) {
    if (!KART_COLOURS[id]) return null;
    const c = bodyColours(id, paint?.id);
    m = bodyInto(new ModelBuilder(), body, c.primary, c.secondary);
  } else {
    const c = body ? bodyColours(id, paint?.id) : null;
    // the body is drawn in its paint's colours already: only the driver takes the recolour
    const recolor = recolorFor(paint);
    m = racerModel(id, { body: body && c ? (b) => { const r = b.recolor; b.recolor = null; bodyInto(b, body, c.primary, c.secondary); b.recolor = r; } : undefined, recolor });
  }
  if (!m) return null;
  const g = { body: m.build() };
  cache.set(key, g);
  return g;
}

/** The pipes a kart burns from in a look: a shared body's, else the racer's own. The flame colour is always the racer's. */
export function exhaustFor(racerId: string, look: KartLook = {}): Exhaust | undefined {
  const own = EXHAUST[racerId];
  if (!own || !look.body || look.body === 'standard') return own;
  return { ...BODY_EXHAUST[look.body], flame: own.flame };
}

/**
 * A kart for `racerId`, origin on the ground, facing +Z: its model file when loaded, else the
 * code-built one. With a shared body, the body is code-built and the driver is cut from the model
 * file (or code-built without one): two draw calls where the model file alone is one.
 * `userData.exhaust` carries the pipes the flames burn from.
 */
export function buildRacerMesh(racerId: string, look: KartLook = {}): Group | null {
  const shared = look.body && look.body !== 'standard';
  let root: Group | null = null;
  if (!shared) root = RACER_MODELS.make(racerId, look.paint);
  else {
    const driver = RACER_MODELS.driver(racerId, look.paint);
    const g = racerGeometry(racerId, look, !driver);
    if (g) {
      root = new Group();
      const body = new Mesh(g.body, vertexToon());
      body.castShadow = true;
      root.add(body);
      if (driver) root.add(driver);
    }
  }
  if (!root) {
    const g = racerGeometry(racerId, look);
    if (!g) return null;
    root = new Group();
    const body = new Mesh(g.body, vertexToon());
    body.castShadow = true;
    root.add(body);
  }
  root.name = `racer-${racerId}`;
  root.userData.exhaust = exhaustFor(racerId, look);
  return root;
}

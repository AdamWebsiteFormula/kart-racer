// Racer meshes for the game: one vertex-coloured body per racer (no outline: Mario Kart World
// draws none, and neither do we since 2026-09-23), geometry cached per racer so eight karts
// never rebuild. Three.js objects only; the geometry maths is in model.ts.
// A kart's look (design §10 unlocks, cosmetic only): an alt paint, and a shared body (Classic,
// Buggy) with the racer's driver seated in it in place of their signature kart.
import { Color, Group, Mesh, SRGBColorSpace, type BufferGeometry } from 'three';
import { isKartId, kartById, ownKartOf } from '../kart-controller/karts.ts';
import { bodyInto, BODY_EXHAUST, KART_COLOURS, type BodyId } from './bodies.ts';
import { RACER_MODELS } from './glb.ts';
import { ModelBuilder } from './model.ts';
import { paintFor, repaintHex, repaintRgb, type Paint } from './paints.ts';
import { codeRig, EXHAUST, racerModel, type Exhaust } from './racers.ts';
import { BODY_WHEELS, rigKart } from './rig.ts';
import { vertexToon } from './toon.ts';

/**
 * How a kart looks: an alt paint id (paints.ts), a body (bodies.ts), and, with karts picked (design
 * §5, UI.kartPick), the kart it races in (kart-controller karts.ts KART_IDS). `kartId` absent, unknown,
 * or the racer's own signature kart: no change, as always. A twin (classic, buggy): the same as
 * `body`. Another racer's signature kart: that racer's own body and wheels, this racer's own driver
 * (buildRacerMesh, exhaustFor; art-pipeline rigged.ts buildComboTemplate).
 */
export interface KartLook { paint?: string; body?: BodyId; kartId?: string }

/** `look.kartId`, resolved: undefined for the racer's own kart, or one the table does not know. */
function chosenKart(racerId: string, look: KartLook): string | undefined {
  const id = look.kartId;
  return id !== undefined && isKartId(id) && id !== ownKartOf(racerId) ? id : undefined;
}

/** The shared body (bodies.ts) a look wants: `look.kartId`'s twin, else `look.body`. */
function twinBodyOf(racerId: string, look: KartLook): Exclude<BodyId, 'standard'> | undefined {
  const chosen = chosenKart(racerId, look);
  if (chosen === 'classic' || chosen === 'buggy') return chosen;
  return look.body && look.body !== 'standard' ? look.body : undefined;
}

/** The racer whose signature kart this driver should sit in: `look.kartId`, when it is another racer's own and not a twin; else undefined. */
export function comboOwnerOf(racerId: string, look: KartLook): string | undefined {
  const chosen = chosenKart(racerId, look);
  if (!chosen || chosen === 'classic' || chosen === 'buggy') return undefined;
  const owner = kartById(chosen)?.owner;
  return owner && owner !== racerId ? owner : undefined;
}

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
  // the moving parts (rig.ts; KartView moves them): the wheels and the body on them, and a
  // code-built driver (merged last) about its hips
  const code = codeRig(id, !!body);
  const driver = withDriver && code && m.driverPart >= 0 ? { y: code.hips.y, x: 2, z: [-2, 2] as const, at: code.hips.at } : null;
  rigKart(g.body, null, { driver, driverFrom: driver ? m.vertexStart(m.driverPart) : 0, wheels: body ? BODY_WHEELS[body] : code?.wheels });
  cache.set(key, g);
  return g;
}

/**
 * The pipes a kart burns from in a look: a shared body's, else the kart's own (design §5: another
 * racer's signature kart burns from its own measured pipes; a racer built from parts, otherwise: the
 * pipe mouths measured on its own body, pointing where its pipes point, no splay); the flame in the
 * racer's color, or their alt paint's, always the driver's own (never the kart owner's).
 */
export function exhaustFor(racerId: string, look: KartLook = {}): Exhaust | undefined {
  const own = EXHAUST[racerId];
  if (!own) return own;
  const paint = paintFor(racerId, look.paint);
  const flame = paint ? repaintHex(own.flame, paint.rules) : own.flame;
  const twin = twinBodyOf(racerId, look);
  if (twin) return { ...BODY_EXHAUST[twin], flame };
  const owner = comboOwnerOf(racerId, look);
  const measured = RACER_MODELS.exhaust(owner ?? racerId);
  if (measured) return { ports: measured.ports, dir: measured.dir, flame, splay: 0, ...(own.size ? { size: own.size } : {}) };
  return paint ? { ...own, flame } : own;
}

/**
 * A kart for `racerId`, origin on the ground, facing +Z: its model file when loaded, else the
 * code-built one. With a shared body, the body is code-built and the driver is cut from the model
 * file (or code-built without one): two draw calls where the model file alone is one. A racer built
 * from parts (rigged.ts) comes rigged, one skinned mesh; in a shared body its rigged driver sits by IK
 * on the body's seat (bodies.ts SEATS). With another racer's signature kart chosen (design §5,
 * `look.kartId`), both built from parts: the driver seated by IK in the kart owner's own body and
 * wheels, one skinned mesh (RACER_MODELS.combo); never the kart owner's own driver. `userData.exhaust`
 * carries the pipes the flames burn from, `userData.rig` the rig KartView animates (rigged racers).
 */
export function buildRacerMesh(racerId: string, look: KartLook = {}): Group | null {
  const owner = comboOwnerOf(racerId, look);
  if (owner) {
    const combo = RACER_MODELS.combo(racerId, owner, look.paint);
    if (combo) {
      combo.name = `racer-${racerId}`;
      combo.userData.exhaust = exhaustFor(racerId, look);
      return combo;
    }
    // either racer's model is not in yet: fails soft to this racer's own kart, as any missing model does
  }
  const shared = twinBodyOf(racerId, look);
  let root: Group | null = null;
  if (!shared) root = RACER_MODELS.make(racerId, look.paint);
  else {
    const rigged = RACER_MODELS.seatedDriver(racerId, shared, look.paint);
    const driver = rigged ?? RACER_MODELS.driver(racerId, look.paint);
    const g = racerGeometry(racerId, { ...look, body: shared }, !driver);
    if (g) {
      root = new Group();
      const body = new Mesh(g.body, vertexToon());
      body.castShadow = true;
      root.add(body);
      if (driver) root.add(driver);
      if (rigged) root.userData.rig = rigged.userData.rig;
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

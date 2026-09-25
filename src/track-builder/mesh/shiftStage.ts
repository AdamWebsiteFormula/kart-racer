// The Final Lap Shift's stage (design §2, §6): each track's set piece, built with the scene and shown
// from the shift's own tick (shiftShow.ts has the beats). The sim changed the road on that tick
// (shift.ts); this makes the change readable from the chase camera in 2 to 3 seconds:
// - Harbor Loop: the tide rolls in off the bay over the beach road (foam at its front and edges, a wet
//   sheen), the sea comes up round the course, and a beacon lights the pier ramp, the one jump left;
// - Meadow Run: storm cloud rolls over, rain, lightning strikes the big oak by the hedgerow cut and it
//   falls across the cut's mouth, where it stays (the cut is closed);
// - Canyon Rush: the rope bridge breaks in the middle and its planks fall away plank by plank into the
//   chasm (dust rising from the floor), and the mine's lanterns flicker on from its mouth inward;
// - Frostbite Pass: the fog closes in, the snow thickens, and the lake freezes out from the crossing;
// - Boardwalk Nights: two bursts of fireworks over the road, two Ferris-wheel spokes swing down onto the
//   new ramp as it rises out of the planks, and a day-glow line lights up the racing line lap-round;
// - Skyline Circuit: the finish line lights up, the old sky bridges retract, and the rail lights up
//   as the only road.
// Visual only: nothing here is read by the sim. Everything is built at load (its shaders compile in the
// race's warm-up); the per-frame update allocates nothing.
import {
  BufferAttribute, BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Matrix4, Mesh, MeshToonMaterial, Object3D, Quaternion, Vector3,
  type Material, type Texture,
} from 'three';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import type { Track } from '../track.ts';
import type { ShiftKind, Vec3 } from '../types.ts';
import { CUES, ease, fogAt, FOG, lastStrike, lightning, SHOW, span, STRIKES, THUNDER, type ShowCue } from '../shiftShow.ts';
import { buildRibbon } from './road.ts';
import { buildJumpMeshes } from './ramps.ts';
import { fadeNearCamera, glowFromVertexColours } from './glow.ts';
import type { Rgb, TrackPalette } from './palette.ts';
import {
  boltGeometry, boltMaterial, Boxes, cloudMesh, floodMaterial, GLOW_KIND, GlowBuilder, glowMaterial, weatherMesh,
  type CloudUniforms, type FloodUniforms, type GlowUniforms, type WeatherUniforms,
} from './shiftFx.ts';

/** The frozen lake's paint on Frostbite's snow (art-pipeline surfaces.ts): its path and how far the frost has spread. */
export interface LakeHook {
  /** (x, z, radius, 0) per point along the lake's middle */
  path: { value: Float32Array };
  count: { value: number };
  /** metres out from the middle the ice has reached (-1: open water) */
  front: { value: number };
  /** 0..1: frozen everywhere, faded in (reduced motion) */
  fade: { value: number };
}
/** Points along the lake's middle at most (the shader's array). */
export const LAKE_POINTS = 12;

/** What the stage is built from. */
export interface StageContext {
  /** the race's track, before its shift */
  track: Track;
  /** the same track with its shift applied (built at load): where the new road and features will be */
  twin: Track | null;
  palette: TrackPalette;
  gradient: Texture | null;
  /** the scene's group (the sea's plane and the mine are found in it) */
  group: Group;
  /** the ground plane's height (NaN: none) */
  groundY: number;
  /** the land's height as drawn (off-road tracks), else the ground plane */
  groundAt?: (x: number, z: number) => number;
  /** whether no prop of the scenery stands within r metres of (x, z) */
  clear?: (x: number, z: number, r: number) => boolean;
  /** a decor asset's geometry and (a model file's) own material */
  geometry: (asset: string) => BufferGeometry;
  material: (asset: string) => Material | undefined;
  /** the track's road material (Skyline's retracting bridges are road) */
  roadMaterial: Material;
  lake?: LakeHook;
}

/** A sound the game plays under the shift's sting: at a world point (fading with distance) or everywhere. */
export interface StageCue { sfx: string; gain: number; at: Vec3 | null; reach: number }
/** A burst of particles the game's effects throw (vfx-juice): dust, a plume, sparks, leaves, a firework. */
export interface StageBurst { kind: 'dust' | 'plume' | 'sparks' | 'leaves' | 'firework'; at: Vec3; size: number; hue: number }

export interface ShiftStage {
  readonly group: Group;
  readonly kind: ShiftKind;
  /** jumps the shift adds that the stage draws (the scene leaves them out of its merged ramps) */
  readonly ownsJumps: ReadonlySet<string>;
  /** shortcuts the shift closes that stay on show (a flooded or blocked road), by branch index */
  readonly keepsBranches: ReadonlySet<number>;
  /** main-LUT samples [from, to] of road the stage draws itself (the rope bridge), or null */
  readonly roadGap: readonly [number, number] | null;
  /** where each set piece stands (for checks, and the sounds heard from it) */
  readonly anchors: Readonly<Record<string, Vec3>>;
  /** seconds since the shift (-1 before it) */
  readonly since: number;
  /** lightning's brightness 0..1 (the game's lights flash with it) */
  readonly flash: number;
  /** the fog's near and far, metres (a blizzard closes in) */
  readonly fog: { readonly near: number; readonly far: number };
  /** this frame's sounds and bursts (cleared every update) */
  readonly cues: readonly StageCue[];
  readonly bursts: readonly StageBurst[];
  /**
   * Per frame: seconds since the shift (-1 before it), the race clock (s, for what moves before it too),
   * the kart the camera follows and its heading (fireworks go up ahead of it) and reduced motion.
   */
  update(since: number, clock: number, focus: Vec3 | null, heading: number, reduced: boolean): void;
  dispose(): void;
}

/** A set piece: its meshes, its per-frame work, and where it stands. */
interface Piece {
  meshes: Object3D[];
  anchors?: Record<string, Vec3>;
  update(f: Frame): void;
}

/** One frame of the show, handed to each piece. */
interface Frame {
  since: number;
  /** the last frame's since (a beat fires once, on the frame that crosses it) */
  prev: number;
  clock: number;
  reduced: boolean;
  focus: Vec3 | null;
  heading: number;
  stage: StageImpl;
}

const crossed = (f: Frame, at: number) => f.prev < at && f.since >= at;

/** Which anchor a kind's own sounds are heard from. */
const CUE_ANCHOR: Readonly<Partial<Record<ShiftKind, string>>> = Object.freeze({
  flood: 'flood', storm: 'tree', collapse: 'bridge', blizzard: 'lake', fireworks: 'ramp', sunset: 'bridges',
});

// ---------------------------------------------------------------- road geometry helpers

/** A point on a LUT: sample i, `lat` metres right of the centre line, `h` up from the (banked) road. */
function roadPoint(L: Lut, i: number, lat: number, h = 0, out: Vec3 = [0, 0, 0]): Vec3 {
  const j = L.idx(i), tb = Math.tan(L.bank[j]);
  out[0] = L.px[j] + L.rx[j] * lat;
  out[1] = L.py[j] - lat * tb + h;
  out[2] = L.pz[j] + L.rz[j] * lat;
  return out;
}

/** The level unit forward and right at sample i. */
function frameAt(L: Lut, i: number): { f: Vec3; r: Vec3 } {
  const j = L.idx(i), th = Math.hypot(L.tx[j], L.tz[j]) || 1;
  return { f: [L.tx[j] / th, 0, L.tz[j] / th], r: [L.rx[j], 0, L.rz[j]] };
}

/** Metres between samples. */
const metresPer = (L: Lut) => L.length / L.step;
/** The sample at t on a LUT. */
const sampleOf = (L: Lut, t: number) => Math.round(L.norm(t) * L.step);

/** The road surface's height at `lat` across sample i, curb and shoulder included, as the ribbon draws it. */
function ribbonY(L: Lut, i: number, lat: number): number {
  const j = L.idx(i), hw = L.hw[j], a = Math.abs(lat), base = L.py[j] - lat * Math.tan(L.bank[j]);
  if (a <= hw) return base;
  if (a <= hw + BUILDER.kerbWidth) return base + BUILDER.kerbHeight;
  return base - BUILDER.shoulderDrop * Math.min(1, (a - hw - BUILDER.kerbWidth) / BUILDER.shoulderWidth);
}

/** Level distance from p to the main line's centre (at its nearest sample in 3D), and that t. */
function mainDistance(track: Track, p: Vec3): { d: number; t: number } {
  const near = track.branches.main.nearestGlobal(p);
  const c = track.branches.main.lut.sample(near.t, 0).position;
  return { d: Math.hypot(p[0] - c[0], p[2] - c[2]), t: near.t };
}

/** The shortcuts a shift closes that no route change lays the main road over: they stay drawn (flooded, blocked). */
export function keptShortcuts(track: Track): number[] {
  const shift = track.def.finalLapShift, out: number[] = [];
  for (const id of shift.closesShortcuts ?? []) {
    const b = track.branches.byId(id);
    if (!b) continue;
    const covered = (shift.routeOverrides ?? []).some((ov) => Math.abs(ov.fromT - b.entryT) < 0.02 && Math.abs(ov.toT - b.exitT) < 0.02);
    if (!covered) out.push(b.index);
  }
  return out;
}

/** +1 or -1: the side of LUT sample i away from the main road. */
function awaySide(track: Track, L: Lut, i: number): number {
  const c = roadPoint(L, i, 0), m = track.branches.main.lut.sample(mainDistance(track, c).t, 0).position;
  const j = L.idx(i);
  return (c[0] - m[0]) * L.rx[j] + (c[2] - m[2]) * L.rz[j] >= 0 ? 1 : -1;
}

/** A toon material for vertex-coloured props: colours past 1 light themselves; it dissolves near the lens. */
function propMaterial(gradient: Texture | null): MeshToonMaterial {
  const m = new MeshToonMaterial({ vertexColors: true, gradientMap: gradient });
  glowFromVertexColours(m);
  fadeNearCamera(m);
  return m;
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hex = (h: string): Rgb => [lin(parseInt(h.slice(1, 3), 16) / 255), lin(parseInt(h.slice(3, 5), 16) / 255), lin(parseInt(h.slice(5, 7), 16) / 255)];
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const scale3 = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

/** Scratch for the per-frame transforms (no garbage per frame). */
const Q1 = new Quaternion(), Q2 = new Quaternion(), V1 = new Vector3(), V2 = new Vector3(), V3_ = new Vector3();

// ---------------------------------------------------------------- the stage

class StageImpl implements ShiftStage {
  readonly group = new Group();
  readonly kind: ShiftKind;
  readonly ownsJumps = new Set<string>();
  readonly keepsBranches = new Set<number>();
  roadGap: readonly [number, number] | null = null;
  readonly anchors: Record<string, Vec3> = {};
  since = -1;
  flash = 0;
  readonly fog = { near: FOG.near, far: FOG.far };
  readonly cues: StageCue[] = [];
  readonly bursts: StageBurst[] = [];
  readonly pieces: Piece[] = [];
  private prev = -1;
  private readonly frame: Frame;
  /** pooled cue and burst records (no garbage per frame) */
  private readonly cuePool: StageCue[] = [];
  private readonly burstPool: StageBurst[] = [];
  private readonly showCues: readonly ShowCue[];
  private readonly owned: Material[] = [];

  constructor(kind: ShiftKind) {
    this.kind = kind;
    this.group.name = 'shift-stage';
    this.frame = { since: -1, prev: -1, clock: 0, reduced: false, focus: null, heading: 0, stage: this };
    this.showCues = CUES[kind] ?? [];
  }

  add(p: Piece | null): void {
    if (!p) return;
    this.pieces.push(p);
    for (const m of p.meshes) {
      // the stage frees its own materials; the scene's dispose leaves every material here alone
      m.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        if (mesh.userData.ownMaterial) this.owned.push(mesh.material as Material);
        mesh.userData.sharedMaterial = true;
      });
      this.group.add(m);
    }
    Object.assign(this.anchors, p.anchors ?? {});
  }

  cue(sfx: string, gain: number, at: Vec3 | null, reach = 200): void {
    const n = this.cues.length;
    const c = this.cuePool[n] ?? (this.cuePool[n] = { sfx, gain, at: null, reach });
    c.sfx = sfx; c.gain = gain; c.at = at; c.reach = reach;
    this.cues.push(c);
  }

  burst(kind: StageBurst['kind'], x: number, y: number, z: number, size = 1, hue = 0): void {
    const n = this.bursts.length;
    const b = this.burstPool[n] ?? (this.burstPool[n] = { kind, at: [0, 0, 0], size, hue });
    b.kind = kind; b.at[0] = x; b.at[1] = y; b.at[2] = z; b.size = size; b.hue = hue;
    this.bursts.push(b);
  }

  update(since: number, clock: number, focus: Vec3 | null, heading: number, reduced: boolean): void {
    this.cues.length = 0;
    this.bursts.length = 0;
    const f = this.frame;
    f.since = since; f.prev = this.prev; f.clock = clock; f.reduced = reduced; f.focus = focus; f.heading = heading;
    this.since = since;
    this.flash = 0;
    fogAt(this.kind, since, this.fog);
    // (index loops and no destructuring here and in the pieces: an iterator is garbage every frame)
    const anchor = this.anchors[CUE_ANCHOR[this.kind] ?? ''] ?? null;
    for (let i = 0; i < this.showCues.length; i++) {
      const c = this.showCues[i];
      if (crossed(f, c.at)) this.cue(c.sfx, c.gain, c.where === 'piece' ? anchor : null, c.reach);
    }
    for (let i = 0; i < this.pieces.length; i++) this.pieces[i].update(f);
    this.prev = since;
  }

  dispose(): void {
    this.group.traverse((o) => { const m = o as Mesh; if (m.isMesh && m.userData.ownGeometry) m.geometry.dispose(); });
    // (a ramp deck's material carries its own texture)
    for (const m of this.owned) { (m as Material & { map?: Texture | null }).map?.dispose(); m.dispose(); }
    this.group.clear();
  }
}

/** A mesh whose geometry and material the stage made (and frees). */
function own<T extends Mesh>(m: T, material = true): T {
  m.userData.ownGeometry = true;
  if (material) m.userData.ownMaterial = true;
  return m;
}

/** A glow strip's clocks (the stage sets them each frame). */
function glowUniforms(): GlowUniforms { return { uSince: { value: -1 }, uClock: { value: 0 }, uReduced: { value: 0 }, uFade: { value: 1 } }; }
function setGlow(u: GlowUniforms, f: Frame): void { u.uSince.value = f.since; u.uClock.value = f.clock; u.uReduced.value = f.reduced ? 1 : 0; }

/**
 * The stage for `ctx.track`'s shift, or null for a kind with no set piece. Built at load, before the
 * shift; `update` plays it.
 */
export function buildShiftStage(ctx: StageContext): ShiftStage | null {
  if (ctx.track.shifted) return null;
  const kind = ctx.track.def.finalLapShift.kind;
  const stage = new StageImpl(kind);
  for (const b of keptShortcuts(ctx.track)) stage.keepsBranches.add(b);
  switch (kind) {
    case 'flood': stage.add(flood(ctx)); stage.add(seaRise(ctx)); stage.add(rampBeacon(ctx)); break;
    case 'storm': stage.add(storm(ctx)); break;
    case 'collapse': stage.add(ropeBridge(ctx, stage)); stage.add(lanterns(ctx)); break;
    case 'blizzard': stage.add(snowfall()); stage.add(frozenLake(ctx)); break;
    case 'fireworks': stage.add(racingLine(ctx)); stage.add(spokeRamp(ctx, stage)); stage.add(salvo(ctx)); break;
    case 'sunset': stage.add(retractingBridges(ctx)); stage.add(railGlow(ctx)); break;
    default: return null;
  }
  return stage;
}

// ================================================================ Harbor Loop: the tide comes in

/** The flooded shortcut: water over the road and its sides, rolling in from the bay side. */
function flood(ctx: StageContext): Piece | null {
  const { track } = ctx;
  const bi = keptShortcuts(track)[0];
  if (bi === undefined) return null;
  const L = track.branches.list[bi].lut, ds = metresPer(L);
  const reach = BUILDER.kerbWidth + 6.5;
  const main = track.branches.main;
  // the sea's level once the tide is in: the water runs out over the beach and down into it
  const sea = ctx.group.getObjectByName('ground-water');
  const seaTop = sea ? sea.position.y + SHOW.flood.sea : -Infinity;
  const clearOfMain = (p: Vec3) => { const m = mainDistance(track, p); return m.d - main.halfWidthAt(m.t) - BUILDER.kerbWidth - 1.5; };
  // rows every ~1.2 m while the water can cover the road without reaching the main road's curb
  const step = Math.max(1, Math.round(1.2 / ds));
  type Row = { i: number; inner: number; outer: number; side: number };
  const rows: Row[] = [];
  const P: Vec3 = [0, 0, 0];
  for (let i = 0; i <= L.step; i += step) {
    const hw = L.hw[L.idx(i)], side = awaySide(track, L, i);
    // the inner side (toward the main road) as far as it keeps clear of the main road's curb
    let inner = 0;
    for (let e = 0.5; e <= hw + reach; e += 0.5) { if (clearOfMain(roadPoint(L, i, -side * e, 0, P)) < 0) break; inner = e; }
    // the outer (bay) side out over the beach until it is under the sea, and a little further
    let outer = hw + reach;
    if (ctx.groundAt) {
      for (let e = hw + BUILDER.kerbWidth + 1; e <= 45; e += 1) {
        const q = roadPoint(L, i, side * e, 0, P);
        if (clearOfMain(q) < 0) break;
        outer = e;
        if (ctx.groundAt(q[0], q[2]) < seaTop - 0.3) { outer = e + 3; break; }
      }
    }
    rows.push({ i, inner: inner < hw + BUILDER.kerbWidth ? -1 : inner, outer, side });
  }
  // the longest run of rows the water can take, less a few metres at each end
  let best: [number, number] = [0, -1];
  for (let a = 0; a < rows.length;) {
    if (rows[a].inner < 0) { a++; continue; }
    let b = a;
    while (b + 1 < rows.length && rows[b + 1].inner >= 0) b++;
    if (b - a > best[1] - best[0]) best = [a, b];
    a = b + 1;
  }
  const trim = Math.round(5 / (step * ds));
  const r0 = best[0] + trim, r1 = best[1] - trim;
  if (r1 - r0 < 8) return null;
  const COLS = 28;
  const pos: number[] = [], attr: number[] = [], idx: number[] = [];
  let maxIn = 0;
  for (let r = r0; r <= r1; r++) {
    const row = rows[r], width = row.outer + row.inner, hw = L.hw[L.idx(row.i)];
    for (let k = 0; k <= COLS; k++) {
      // across from the outer (bay) edge to the inner one, draped over the road and the land (past the
      // curb the land meets it: an off-road track draws no shoulder), down the beach into the sea
      const inward = (width * k) / COLS, lat = row.side * (row.outer - inward);
      const p = roadPoint(L, row.i, lat, 0, P);
      const land = ctx.groundAt ? ctx.groundAt(p[0], p[2]) : ribbonY(L, row.i, lat);
      const y = Math.abs(lat) <= hw + BUILDER.kerbWidth ? Math.max(ribbonY(L, row.i, lat), land) : land;
      pos.push(p[0], y + SHOW.flood.over, p[2]);
      maxIn = Math.max(maxIn, inward);
      attr.push(inward, k / COLS, (row.i - rows[r0].i) * ds, width);
    }
    if (r > r0) {
      const a = (r - r0 - 1) * (COLS + 1), b = a + COLS + 1;
      for (let k = 0; k < COLS; k++) {
        // wound so the water faces up
        if (row.side > 0) idx.push(a + k, a + k + 1, b + k, a + k + 1, b + k + 1, b + k);
        else idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlood', new Float32BufferAttribute(attr, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const u: FloodUniforms = { uFront: { value: -10 }, uClock: { value: 0 }, uRise: { value: 0 }, uLength: { value: (rows[r1].i - rows[r0].i) * ds } };
  const mat = floodMaterial(u);
  mat.side = DoubleSide; // seen from either side of its winding
  const mesh = own(new Mesh(g, mat));
  mesh.name = 'shift-flood';
  mesh.visible = false;
  const mid = rows[(r0 + r1) >> 1];
  return {
    meshes: [mesh],
    anchors: { flood: roadPoint(L, mid.i, 0) },
    update(f) {
      const on = f.since >= 0;
      mesh.visible = on;
      if (!on) return;
      const a = SHOW.flood.rise[0], b = SHOW.flood.rise[1];
      u.uClock.value = f.clock;
      // the water comes up, and rolls in from the bay side (reduced motion: it only comes up)
      u.uRise.value = ease(f.since, a, a + (b - a) * 0.6);
      u.uFront.value = f.reduced ? maxIn + 8 : ease(f.since, a, b) * (maxIn + 8) - 2;
    },
  };
}

/** The sea comes up round the course with the tide. */
function seaRise(ctx: StageContext): Piece | null {
  const sea = ctx.group.getObjectByName('ground-water');
  if (!sea) return null;
  const base = sea.position.y;
  return {
    meshes: [],
    update(f) {
      sea.position.y = base + (f.since < 0 ? 0 : SHOW.flood.sea * ease(f.since, SHOW.flood.rise[0], SHOW.flood.rise[1]));
    },
  };
}

/** A beacon over the main road's one ramp: two chevrons pointing up, and its lip lit. */
function rampBeacon(ctx: StageContext): Piece | null {
  const { track } = ctx;
  const ramp = track.features.find((x) => x.kind === 'jump' && x.shape !== 'hump' && x.branch === 0);
  if (!ramp?.run || !ramp.rise) return null;
  const L = track.branches.main.lut, i = sampleOf(L, ramp.t), { f: fw, r } = frameAt(L, i);
  const lip = roadPoint(L, i, ramp.lateral, ramp.rise);
  const gb = new GlowBuilder(), t0 = SHOW.flood.beacon, gold: Rgb = [2.6, 1.35, 0.3], white: Rgb = [2.2, 2.0, 1.6];
  // two chevrons (^) in a plane across the road, facing the karts coming up to it
  const at = (x: number, y: number): Vec3 => [lip[0] + r[0] * x, lip[1] + y, lip[2] + r[2] * x];
  for (const [y0, c] of [[3.2, gold], [4.9, white]] as const) {
    for (const s of [-1, 1]) {
      const a = gb.vert(at(0, y0 + 1.86), c, 0, 0, t0, t0, GLOW_KIND.sign);
      gb.vert(at(s * 2.6, y0 + 0.5), c, 1, 0, t0, t0, GLOW_KIND.sign);
      gb.vert(at(s * 2.6, y0 - 0.3), c, 1, 1, t0, t0, GLOW_KIND.sign);
      gb.vert(at(0, y0 + 1.05), c, 0, 1, t0, t0, GLOW_KIND.sign);
      gb.quad(a, a + 1, a + 2, a + 3);
    }
  }
  // a pillar of light over it, seen from across the harbor (two crossed curtains)
  for (const [ax, az] of [[r[0], r[2]], [fw[0], fw[2]]] as const) {
    const q = (x: number, y: number): Vec3 => [lip[0] + ax * x, lip[1] + y, lip[2] + az * x];
    const c0 = gb.vert(q(-1.3, 0), gold, 0, 0, t0, t0, GLOW_KIND.curtain);
    gb.vert(q(1.3, 0), gold, 1, 0, t0, t0, GLOW_KIND.curtain);
    gb.vert(q(1.3, 16), gold, 1, 1, t0, t0, GLOW_KIND.curtain);
    gb.vert(q(-1.3, 16), gold, 0, 1, t0, t0, GLOW_KIND.curtain);
    gb.quad(c0, c0 + 1, c0 + 2, c0 + 3);
  }
  // the lip: a bright line across the ramp's top edge
  const hwR = ramp.width / 2, back = Math.max(1, Math.round(0.5 / metresPer(L))), rise = ramp.rise, lat0 = ramp.lateral;
  gb.strip([0, 1].map((k) => ({ l: roadPoint(L, i, lat0 - hwR + 2 * hwR * k, rise + 0.05), r: roadPoint(L, i - back, lat0 - hwR + 2 * hwR * k, rise + 0.02), along: k * 2 * hwR, sweep: t0 })), () => gold, t0, GLOW_KIND.line);
  const u = glowUniforms();
  const mesh = own(new Mesh(gb.build(), glowMaterial(u)));
  mesh.name = 'shift-beacon';
  mesh.visible = false;
  return {
    meshes: [mesh],
    anchors: { beacon: lip },
    update(f) {
      mesh.visible = f.since >= t0;
      setGlow(u, f);
    },
  };
}

// ================================================================ Meadow Run: the storm rolls in

/** Where the cut's oak stands, which way it falls, and how tall it is. */
interface OakSpot { base: Vec3; fall: Vec3; height: number }

/**
 * The oak by the closed shortcut's mouth: just past where the cut leaves the main road's course
 * limit, standing off the cut's far side, falling across the cut toward the main road (never onto it).
 */
function oakSpot(ctx: StageContext): OakSpot | null {
  const { track } = ctx;
  const bi = keptShortcuts(track)[0];
  if (bi === undefined) return null;
  const L = track.branches.list[bi].lut, ds = metresPer(L), main = track.branches.main;
  const limit = (t: number) => main.halfWidthAt(t) + BUILDER.kerbWidth + (track.def.offroad ? BUILDER.offroadReach : 0);
  let at = -1;
  for (let i = Math.round(15 / ds); i < L.step / 2; i++) {
    const m = mainDistance(track, roadPoint(L, i, 0));
    if (m.d >= limit(m.t) + 1.5) { at = i; break; }
  }
  if (at < 0) return null;
  const height = 15;
  for (const tryK of [0, 1, -1, 2, -2, 3]) {
    const i = at + Math.round((tryK * 3) / ds);
    const side = awaySide(track, L, i), hw = L.hw[L.idx(i)];
    const base = roadPoint(L, i, side * (hw + BUILDER.kerbWidth + 2.6));
    if (ctx.clear && !ctx.clear(base[0], base[2], 3) && tryK !== 3) continue;
    base[1] = ctx.groundAt ? ctx.groundAt(base[0], base[2]) : ribbonY(L, i, side * (hw + BUILDER.kerbWidth + 2.6));
    const { r } = frameAt(L, i);
    return { base, fall: [-side * r[0], 0, -side * r[2]], height };
  }
  return null;
}

function storm(ctx: StageContext): Piece {
  const S = SHOW.storm;
  const meshes: Object3D[] = [];
  const anchors: Record<string, Vec3> = {};
  // the oak, as the course's other oaks are drawn, scaled up to a giant
  const spot = oakSpot(ctx);
  let pivot: Object3D | null = null, axis = new Vector3(1, 0, 0), top: Vec3 = [0, 0, 0];
  if (spot) {
    const g = ctx.geometry('oak');
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox!, h = Math.max(0.5, bb.max.y - bb.min.y), k = spot.height / h;
    const model = ctx.material('oak');
    const tree = new Mesh(g, model ?? propMaterial(ctx.gradient));
    if (!model) tree.userData.ownMaterial = true;
    tree.name = 'shift-oak';
    tree.scale.setScalar(k);
    tree.position.y = -bb.min.y * k;
    tree.rotation.y = 0.7;
    tree.castShadow = true;
    tree.receiveShadow = true;
    pivot = new Object3D();
    pivot.name = 'shift-oak-pivot';
    pivot.position.set(spot.base[0], spot.base[1], spot.base[2]);
    pivot.add(tree);
    meshes.push(pivot);
    // tip it over toward the road: about up × fall
    axis = new Vector3(0, 1, 0).cross(new Vector3(spot.fall[0], 0, spot.fall[2])).normalize();
    top = [spot.base[0], spot.base[1] + spot.height, spot.base[2]];
    anchors.tree = spot.base;
  }
  // the cloud ceiling, rolling in from upwind (the mirror's wind blows the other way)
  const mirrored = ctx.track.def.mirrored === true;
  const wind: [number, number] = [mirrored ? 0.6 : -0.6, 0.8];
  const ground = Number.isFinite(ctx.groundY) ? ctx.groundY : 0;
  const cu: CloudUniforms = { uCover: { value: 0 }, uClock: { value: 0 }, uFlash: { value: 0 }, uHeight: { value: ground + 125 }, uReduced: { value: 0 } };
  const clouds = own(cloudMesh(cu, wind));
  clouds.visible = false;
  meshes.push(clouds);
  // rain
  const wu: WeatherUniforms = { uTime: { value: 0 }, uDensity: { value: 0 }, uFlash: { value: 0 } };
  const rain = own(weatherMesh('rain', wu));
  rain.visible = false;
  meshes.push(rain);
  // the bolt
  const bolt = own(new Mesh(boltGeometry(), boltMaterial()));
  bolt.name = 'shift-bolt';
  bolt.visible = false;
  bolt.frustumCulled = false;
  meshes.push(bolt);
  // later strikes fall far off round the course, each somewhere else (a fixed round)
  const L = ctx.track.branches.main.lut;
  let cx = 0, cz = 0, rad = 0;
  for (let i = 0; i < L.n; i++) { cx += L.px[i] / L.n; cz += L.pz[i] / L.n; }
  for (let i = 0; i < L.n; i += 8) rad = Math.max(rad, Math.hypot(L.px[i] - cx, L.pz[i] - cz));
  const farAt: Vec3 = [0, 0, 0];
  const far = (k: number): Vec3 => {
    const a = k * 2.39996 * (mirrored ? -1 : 1), d = rad + 70 + hash(k) * 160;
    farAt[0] = cx + Math.cos(a) * d; farAt[1] = ground; farAt[2] = cz + Math.sin(a) * d;
    return farAt;
  };
  let placed = -1;
  const cloudY = ground + 125;
  const place = (target: Vec3, width: number) => {
    bolt.position.set(target[0], target[1], target[2]);
    bolt.scale.set(width, Math.max(10, cloudY - target[1]), width);
    bolt.rotation.y = target[0] * 0.13;
  };
  if (spot) anchors.strike = top;
  let fell = false;
  return {
    meshes,
    anchors,
    update(f) {
      const on = f.since >= 0;
      clouds.visible = on; rain.visible = on;
      // the flurries of rain start as the cloud comes over; lightning brightens the rain and the cloud
      const flash = on ? lightning(f.since, f.reduced) : 0;
      f.stage.flash = flash;
      cu.uFlash.value = flash; cu.uClock.value = f.clock; cu.uReduced.value = f.reduced ? 1 : 0;
      cu.uCover.value = on ? ease(f.since, S.clouds[0], S.clouds[1]) : 0;
      wu.uTime.value = f.clock; wu.uFlash.value = flash;
      wu.uDensity.value = on ? ease(f.since, S.rain[0], S.rain[1]) : 0;
      // the bolt: on the oak first, then far off; seen while its flash is bright
      const k = on ? lastStrike(f.since) : -1;
      if (k >= 0) {
        if (k !== placed) { placed = k; if (k === 0 && spot) place(top, 38); else place(far(k), 60); }
        const age = f.since - STRIKES[k];
        bolt.visible = age < 0.34 && flash > 0.06;
        (bolt.material as Material & { opacity: number }).opacity = Math.min(1, flash * 1.3);
        // thunder a beat after each far strike
        if (k >= 1 && crossed(f, STRIKES[k] + THUNDER.delay)) f.stage.cue(THUNDER.sfx, THUNDER.gain, null);
      } else bolt.visible = false;
      if (spot && crossed(f, S.strike)) f.stage.burst('sparks', top[0], top[1], top[2], 1.4);
      // the oak falls across the cut: slow, then fast, a small bounce as it lands (reduced motion: a cut)
      if (!pivot || !spot) return;
      let th = 0;
      const TH = 1.5, T = S.fall[1] - S.fall[0];
      if (on && f.since >= S.fall[0]) {
        if (f.reduced) th = f.since >= S.fall[0] + 0.3 ? TH : 0;
        else {
          const k2 = Math.min(1, (f.since - S.fall[0]) / T);
          th = TH * Math.pow(k2, 2.3);
          const after = f.since - S.fall[1];
          if (after > 0) th = TH - 0.08 * Math.sin(Math.min(1, after / 0.45) * Math.PI) * Math.exp(-after * 2);
        }
      }
      pivot.quaternion.setFromAxisAngle(axis, th);
      const landed = on && th >= TH - 0.1;
      if (landed && !fell) {
        fell = true;
        // dust along where it lies, leaves from its crown
        for (let q = 0; q < 3; q++) { const s = 0.3 + q * 0.25; f.stage.burst('dust', spot.base[0] + spot.fall[0] * spot.height * s, spot.base[1] + 0.5, spot.base[2] + spot.fall[2] * spot.height * s, 1.5); }
        f.stage.burst('leaves', spot.base[0] + spot.fall[0] * spot.height * 0.85, spot.base[1] + 2, spot.base[2] + spot.fall[2] * spot.height * 0.85, 1.2);
      }
    },
  };
}

// ================================================================ Canyon Rush: the rope bridge collapses

/** The stretch of main road open on both sides inside the route the shift replaces: [first, last] sample. */
function bridgeSpan(track: Track): [number, number] | null {
  const L = track.branches.main.lut, ovs = track.def.finalLapShift.routeOverrides ?? [];
  const inRange = (t: number, a: number, b: number) => ((((t - a) % 1) + 1) % 1) <= ((((b - a) % 1) + 1) % 1);
  let best: [number, number] | null = null;
  for (let i = 0; i < L.n;) {
    const ok = (k: number) => L.open[L.idx(k)] === 3 && ovs.some((ov) => inRange(k / L.step, ov.fromT, ov.toT));
    if (!ok(i)) { i++; continue; }
    let j = i;
    while (j + 1 < L.n && ok(j + 1)) j++;
    if (!best || j - i > best[1] - best[0]) best = [i, j];
    i = j + 1;
  }
  return best && (best[1] - best[0]) * metresPer(L) >= 10 ? best : null;
}

function ropeBridge(ctx: StageContext, stage: StageImpl): Piece | null {
  const { track } = ctx;
  const span0 = bridgeSpan(track);
  if (!span0) return null;
  stage.roadGap = span0;
  const L = track.branches.main.lut, ds = metresPer(L);
  const [b0, b1] = span0, s0 = b0 * ds, s1 = b1 * ds;
  const SPACING = 0.62, planks = Math.floor((s1 - s0) / SPACING), mid = planks >> 1;
  const bx = new Boxes();
  const WOOD = hex('#9a6a3e'), POST = hex('#6e4a2a'), ROPE = hex('#d9c08a'), END = hex('#5a3a20');
  // a frame at arc s: centre on the road, across (banked), up, forward
  const at = (s: number, lat: number, h: number): Vec3 => {
    const x = s / ds, i = Math.floor(x), a = x - i, p = roadPoint(L, i, lat, h), q = roadPoint(L, i + 1, lat, h);
    return [p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a, p[2] + (q[2] - p[2]) * a];
  };
  const centres: Vec3[] = [];
  const across: Vec3[] = [];
  const fwd: Vec3[] = [];
  const edge = (s: number) => L.hw[L.idx(Math.round(s / ds))] + BUILDER.kerbWidth;
  const postTops: Vec3[][] = [[], []];
  for (let k = 0; k < planks; k++) {
    const s = s0 + (k + 0.5) * SPACING, w = edge(s) + 0.2;
    const l = at(s, -w, -0.03), rr = at(s, w, -0.03), c: Vec3 = [(l[0] + rr[0]) / 2, (l[1] + rr[1]) / 2, (l[2] + rr[2]) / 2];
    const x: Vec3 = [(rr[0] - l[0]) / 2, (rr[1] - l[1]) / 2, (rr[2] - l[2]) / 2];
    const { f } = frameAt(L, Math.round(s / ds));
    centres.push(c); across.push(x); fwd.push(f);
    bx.current = k;
    const tone = 0.82 + 0.3 * hash(k) - (k % 7 === 3 ? 0.18 : 0);
    bx.box(c, x, [0, 0.05, 0], [f[0] * 0.27, 0, f[2] * 0.27], scale3(WOOD, tone));
    // a rope post on each side every fourth plank
    if (k % 4 === 1 || k === planks - 2) {
      for (const [si, side] of [[0, -1], [1, 1]] as const) {
        const p = at(s, side * (edge(s) + 0.1), 0.55);
        bx.box(p, [0.07, 0, 0], [0, 0.55, 0], [0, 0, 0.07], POST);
        postTops[si].push([p[0], p[1] + 0.5, p[2]]);
      }
    }
  }
  // the hand ropes: from each end post along the post tops, sagging between; each half its own piece
  const HALF_A = planks, HALF_B = planks + 1;
  const ends: Vec3[][] = [[], []]; // [side][start, end] rope anchors on the end posts
  for (const [si, side] of [[0, -1], [1, 1]] as const) {
    const a = at(s0 - 0.35, side * (edge(s0) + 0.3), 1.25), b = at(s1 + 0.35, side * (edge(s1) + 0.3), 1.25);
    ends[si] = [a, b];
    const pts = [a, ...postTops[si], b];
    for (let k = 0; k + 1 < pts.length; k++) {
      const p = pts[k], q = pts[k + 1], m: Vec3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.14, (p[2] + q[2]) / 2];
      // which half: by where the span's middle lies against the break
      const sMid = s0 + ((k + 0.5) / (pts.length - 1)) * (s1 - s0);
      bx.current = sMid < s0 + (mid + 0.5) * SPACING ? HALF_A : HALF_B;
      bx.rod(p, m, 0.035, ROPE);
      bx.rod(m, q, 0.035, ROPE);
    }
  }
  // the end posts: heavy timber, staying put
  bx.current = -1;
  for (const side of [-1, 1]) {
    for (const s of [s0 - 0.35, s1 + 0.35]) {
      const p = at(s, side * (edge(s) + 0.3), 0.45);
      bx.box(p, [0.17, 0, 0], [0, 0.95, 0], [0, 0, 0.17], END);
    }
  }
  const g = bx.build();
  const posAttr = g.getAttribute('position') as BufferAttribute;
  const orig = Float32Array.from(posAttr.array as Float32Array);
  const piece = Int32Array.from(bx.piece);
  const mesh = own(new Mesh(g, propMaterial(ctx.gradient)));
  mesh.name = 'shift-bridge';
  mesh.receiveShadow = true;
  // each plank's fall: when it lets go (from the middle outward), its spin and drift
  const S = SHOW.collapse;
  const release = new Float32Array(planks), spin = new Float32Array(planks), yaw = new Float32Array(planks);
  for (let k = 0; k < planks; k++) {
    release[k] = S.snap + Math.abs(k - mid) * S.gap;
    spin[k] = (2 + 3.5 * hash(k * 3 + 1)) * (hash(k * 5) < 0.5 ? -1 : 1);
    yaw[k] = (hash(k * 7 + 2) - 0.5) * 1.6;
  }
  // each rope half swings down about its end post's anchor (averaged over the two sides' anchors per half)
  const midPt = centres[mid];
  const floor = Number.isFinite(ctx.groundY) ? ctx.groundY : midPt[1] - 40;
  const G = 13, DONE = S.snap + (planks / 2) * S.gap + 4;
  let finished = false, lastDust = -1;
  const apply = (f: Frame) => {
    const pos = posAttr.array as Float32Array;
    const tRope = f.since - S.snap;
    for (let v = 0; v < piece.length; v++) {
      const k = piece[v], o = v * 3;
      if (k < 0) continue;
      V1.set(orig[o], orig[o + 1], orig[o + 2]);
      if (k < planks) {
        const tau = f.since - release[k];
        if (tau <= 0) { pos[o] = orig[o]; pos[o + 1] = orig[o + 1]; pos[o + 2] = orig[o + 2]; continue; }
        const c = centres[k];
        if (f.reduced) { pos[o] = orig[o]; pos[o + 1] = orig[o + 1] - 400; pos[o + 2] = orig[o + 2]; continue; }
        // spin about its long axis, turn a little about the vertical, drop, drift out from the break
        V2.set(across[k][0], across[k][1], across[k][2]).normalize();
        Q1.setFromAxisAngle(V2, spin[k] * tau);
        Q2.setFromAxisAngle(V3_.set(0, 1, 0), yaw[k] * tau);
        Q2.multiply(Q1);
        V1.set(orig[o] - c[0], orig[o + 1] - c[1], orig[o + 2] - c[2]).applyQuaternion(Q2);
        const drift = (k < mid ? -1 : 1) * 0.9 * tau;
        pos[o] = c[0] + V1.x + fwd[k][0] * drift;
        pos[o + 1] = c[1] + V1.y - 0.5 * G * tau * tau - 0.4 * tau;
        pos[o + 2] = c[2] + V1.z + fwd[k][2] * drift;
      } else {
        // a rope half: swung down about the anchor on its end posts
        const half = k === HALF_A ? 0 : 1;
        const ax = (ends[0][half][0] + ends[1][half][0]) / 2, ay = (ends[0][half][1] + ends[1][half][1]) / 2, az = (ends[0][half][2] + ends[1][half][2]) / 2;
        const phi = tRope <= 0 ? 0 : f.reduced ? 1.45 : 1.45 * ease(tRope, 0, 1.2) + 0.12 * Math.sin(Math.min(tRope, 3) * 5) * Math.exp(-tRope * 1.5) * (tRope > 1.2 ? 1 : 0);
        // the half's way along the bridge from its anchor, and the level axis across it
        const dx = midPt[0] - ax, dz = midPt[2] - az, dl = Math.hypot(dx, dz) || 1;
        V2.set(dz / dl, 0, -dx / dl); // (dir × down) for dir = (dx, 0, dz)/dl
        Q1.setFromAxisAngle(V2, phi);
        V1.set(orig[o] - ax, orig[o + 1] - ay, orig[o + 2] - az).applyQuaternion(Q1);
        pos[o] = ax + V1.x; pos[o + 1] = ay + V1.y; pos[o + 2] = az + V1.z;
      }
    }
    posAttr.needsUpdate = true;
  };
  return {
    meshes: [mesh],
    anchors: { bridge: midPt },
    update(f) {
      if (f.since < S.snap || finished) return;
      if (crossed(f, S.snap)) {
        mesh.frustumCulled = false;
        f.stage.burst('dust', midPt[0], midPt[1] - 0.5, midPt[2], 2.2);
      }
      apply(f);
      // dust off the planks as they let go, then rising from the chasm floor as they land
      const n = Math.floor((f.since - S.snap) / (S.gap * 6));
      if (!f.reduced && n > lastDust && n <= mid / 6) {
        lastDust = n;
        for (let side = -1; side <= 1; side += 2) {
          const k = mid + side * n * 6;
          if (k >= 0 && k < planks) f.stage.burst('dust', centres[k][0], centres[k][1] - 0.3, centres[k][2], 0.9);
        }
      }
      for (let q = 0; q < 3; q++) {
        const t = 2.4 + q * 0.5;
        if (crossed(f, S.snap + t)) f.stage.burst('plume', midPt[0] + (t - 2.9) * 8 * fwd[mid][0], floor + 1, midPt[2] + (t - 2.9) * 8 * fwd[mid][2], 3);
      }
      if (f.since > DONE) finished = true;
    },
  };
}

/**
 * The mine's lanterns: dim embers until the shift, then lit one after another from the mouth in
 * (tunnel.ts), and their warm light spilling out of the mouth the final lap drives into.
 */
function lanterns(ctx: StageContext): Piece | null {
  const t = ctx.group.getObjectByName('tunnels') as Mesh | undefined;
  const u = t?.userData.lamps as { since: { value: number }; reduced: { value: number } } | undefined;
  const line = ctx.track.tunnels[0];
  if (!u || !line) return null;
  const L = line.lut, ds = metresPer(L), t0 = SHOW.collapse.lamps[0];
  const gb = new GlowBuilder(), WARM: Rgb = [1.5, 0.8, 0.22];
  // two veils of lamplight across the bore just inside the mouth, brightest at the floor
  for (const inM of [1.5, 9]) {
    const i = line.i0 + Math.round(inM / ds), w = L.hw[L.idx(i)] + BUILDER.kerbWidth;
    const c0 = gb.vert(roadPoint(L, i, -w, 0), WARM, 0, 0, t0, t0, GLOW_KIND.curtain);
    gb.vert(roadPoint(L, i, w, 0), WARM, 1, 0, t0, t0, GLOW_KIND.curtain);
    gb.vert(roadPoint(L, i, w, BUILDER.tunnelWall + 1.2), WARM, 1, 1, t0, t0, GLOW_KIND.curtain);
    gb.vert(roadPoint(L, i, -w, BUILDER.tunnelWall + 1.2), WARM, 0, 1, t0, t0, GLOW_KIND.curtain);
    gb.quad(c0, c0 + 1, c0 + 2, c0 + 3);
  }
  const gu = glowUniforms();
  const glow = own(new Mesh(gb.build(), glowMaterial(gu)));
  glow.name = 'shift-mine-glow';
  glow.visible = false;
  return {
    meshes: [glow],
    anchors: { mine: roadPoint(L, line.i0, 0) },
    update(f) {
      u.since.value = f.since; u.reduced.value = f.reduced ? 1 : 0;
      glow.visible = f.since >= t0;
      setGlow(gu, f);
    },
  };
}

// ================================================================ Frostbite Pass: the blizzard

/** Snow round the camera: light flurries from the start, thick once the blizzard comes. */
function snowfall(): Piece {
  const wu: WeatherUniforms = { uTime: { value: 0 }, uDensity: { value: SHOW.blizzard.flurries }, uFlash: { value: 0 } };
  const snow = own(weatherMesh('snow', wu));
  return {
    meshes: [snow],
    update(f) {
      const fl = SHOW.blizzard.flurries;
      wu.uTime.value = f.clock;
      wu.uDensity.value = fl + (1 - fl) * (f.since < 0 ? 0 : ease(f.since, SHOW.blizzard.snow[0], SHOW.blizzard.snow[1]));
    },
  };
}

/**
 * The lake along the crossing the blizzard opens (painted on the snow: art-pipeline surfaces.ts): open
 * water and floes until the shift, then ice spreading out from the crossing. It keeps 3 m past every
 * open road's course limit, so no kart ever drives on its water.
 */
function frozenLake(ctx: StageContext): Piece | null {
  const { track, lake } = ctx;
  const id = track.def.finalLapShift.opensShortcuts?.[0];
  const b = id ? track.branches.byId(id) : undefined;
  if (!lake || !b) { if (lake) lake.count.value = 0; return null; }
  const L = b.lut, len = L.length;
  const others = track.branches.list.filter((x) => x !== b);
  const clearance = (p: Vec3) => {
    let best = Infinity;
    for (const o of others) {
      const Lo = o.lut;
      for (let i = 0; i < Lo.n; i += 3) {
        const d = Math.hypot(Lo.px[i] - p[0], Lo.pz[i] - p[2]) - (Lo.hw[i] + BUILDER.kerbWidth + (track.def.offroad ? BUILDER.offroadReach : 0));
        if (d < best) best = d;
      }
    }
    return best;
  };
  const n = LAKE_POINTS, arr = lake.path.value;
  arr.fill(0);
  let rMax = 0, midP: Vec3 = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const s = 8 + ((len - 16) * k) / (n - 1), i = Math.round((s / len) * L.step);
    const p = roadPoint(L, i, 0);
    // (its ragged shore reaches up to 4.5 m past the radius: the lake paint, art-pipeline surfaces.ts)
    const r = Math.max(0, Math.min(26, clearance(p) - 5));
    arr[k * 4] = p[0]; arr[k * 4 + 1] = p[2]; arr[k * 4 + 2] = r < 5 ? 0 : r;
    rMax = Math.max(rMax, r);
    if (k === n >> 1) midP = p;
  }
  lake.count.value = n;
  lake.front.value = -1;
  lake.fade.value = 0;
  const [a, bb] = SHOW.blizzard.freeze;
  return {
    meshes: [],
    anchors: { lake: midP },
    update(f) {
      if (f.since < 0) { lake.front.value = -1; lake.fade.value = 0; return; }
      if (f.reduced) { lake.front.value = -1; lake.fade.value = ease(f.since, a, a + 1); return; }
      lake.fade.value = 0;
      lake.front.value = ease(f.since, a, bb) * (rMax + 12);
    },
  };
}

// ================================================================ Boardwalk Nights: the fireworks finale

/** The racing line in day-glow: inside at the apexes, dashes running forward, lit lap-round from the start line. */
function racingLine(ctx: StageContext): Piece | null {
  const L = ctx.track.branches.main.lut, ds = metresPer(L), n = L.step;
  const [p0, p1] = SHOW.fireworks.path;
  // how hard the road turns at each sample (signed: a right turn negative), over ±5 m
  const K = Math.max(1, Math.round(5 / ds));
  const turn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = L.idx(i - K), c = L.idx(i + K);
    const cross = L.tx[a] * L.tz[c] - L.tz[a] * L.tx[c], dot = L.tx[a] * L.tx[c] + L.tz[a] * L.tz[c];
    turn[i] = Math.atan2(cross, dot) / (2 * K * ds);
  }
  // inside of the bend (right turn: right of centre), smoothed over ±24 m, kept 1.8 m off the curb
  const lat = new Float64Array(n);
  for (let i = 0; i < n; i++) lat[i] = -turn[i] * 260;
  const W = Math.max(1, Math.round(24 / ds));
  for (let pass = 0; pass < 2; pass++) {
    const src = Float64Array.from(lat);
    let sum = 0;
    for (let k = -W; k <= W; k++) sum += src[L.idx(k)];
    for (let i = 0; i < n; i++) {
      lat[i] = sum / (2 * W + 1);
      sum += src[L.idx(i + W + 1)] - src[L.idx(i - W)];
    }
  }
  const step = Math.max(1, Math.round(1.5 / ds)), start = sampleOf(L, ctx.track.startT);
  const COLOURS: Rgb[] = [[1.6, 0.06, 1.0], [1.5, 1.05, 0.04], [0.04, 1.2, 1.6], [0.5, 1.5, 0.05]];
  const rows: { l: Vec3; r: Vec3; along: number; sweep: number; cut?: boolean }[] = [];
  for (let k = 0; k <= Math.ceil(n / step); k++) {
    const i = start + k * step, j = L.idx(i), hw = L.hw[j];
    const c = Math.max(-(hw - 1.8), Math.min(hw - 1.8, lat[j]));
    const s = k * step * ds;
    rows.push({ l: roadPoint(L, i, c - 0.28, 0.05), r: roadPoint(L, i, c + 0.28, 0.05), along: s, sweep: p0 + ((p1 - p0) * s) / L.length });
  }
  const gb = new GlowBuilder();
  gb.strip(rows, (s) => {
    const h = (s / 40) % COLOURS.length, a = Math.floor(h), k = h - a, x = COLOURS[a], y = COLOURS[(a + 1) % COLOURS.length];
    return [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k];
  }, p0, GLOW_KIND.dashes);
  const u = glowUniforms();
  const mesh = own(new Mesh(gb.build(), glowMaterial(u)));
  mesh.name = 'shift-racing-line';
  mesh.visible = false;
  return {
    meshes: [mesh],
    anchors: { line: rows[0].l },
    update(f) { mesh.visible = f.since >= 0; setGlow(u, f); },
  };
}

/** A Ferris-wheel spoke (a white lattice girder with bulbs, a hub at its foot, a star at its tip), `len` long up local +Y. */
function spokeModel(bx: Boxes, len: number): void {
  const WHITE = hex('#f0eef8'), HUB = hex('#23234a');
  const BULBS: Rgb[] = [[2.6, 1.9, 0.8], [2.4, 0.5, 1.8], [0.5, 2.2, 2.6]];
  for (const x of [-0.24, 0.24]) bx.rod([x, 0, 0], [x, len, 0], 0.055, WHITE);
  // zigzag braces between the rails
  const n = Math.max(2, Math.round(len / 0.45));
  for (let k = 0; k < n; k++) {
    const y0 = (len * k) / n, y1 = (len * (k + 1)) / n;
    bx.rod([k % 2 ? 0.24 : -0.24, y0, 0], [k % 2 ? -0.24 : 0.24, y1, 0], 0.03, WHITE);
  }
  // bulbs down both rails, facing out both ways
  const m = Math.max(2, Math.round(len / 0.55));
  for (let k = 0; k <= m; k++) for (const x of [-0.24, 0.24]) bx.box([x, (len * k) / m, 0], [0.075, 0, 0], [0, 0.075, 0], [0, 0, 0.09], BULBS[(k + (x > 0 ? 1 : 0)) % 3]);
  bx.box([0, 0, 0], [0.38, 0, 0], [0, 0.38, 0], [0, 0, 0.26], HUB);
  // a star at the tip
  for (const a of [0, Math.PI / 4]) bx.box([0, len + 0.15, 0], [Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0], [-Math.sin(a) * 0.34, Math.cos(a) * 0.34, 0], [0, 0, 0.05], [2.4, 0.6, 1.6]);
}

/**
 * A spoke's pose on the GPU: `aSpoke` picks which of the two matrices moves each vertex (the model is
 * built in the spoke's own frame, +Y up its length), normals turned with it.
 */
function posedBySpoke(m: MeshToonMaterial, u: { uSpokeA: { value: Matrix4 }; uSpokeB: { value: Matrix4 } }): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = `uniform mat4 uSpokeA;\nuniform mat4 uSpokeB;\nattribute float aSpoke;\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  mat4 spokeM = aSpoke < 0.5 ? uSpokeA : uSpokeB;\n  objectNormal = mat3(spokeM) * objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = (spokeM * vec4(transformed, 1.0)).xyz;');
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|spoke`;
}

/** A ramp that rises out of the road on the GPU: each vertex from the road under it (`aBase`) to its height, by `uLift`. */
function risingFromRoad(m: MeshToonMaterial, lift: { value: number }): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uLift = lift;
    shader.vertexShader = `uniform float uLift;\nattribute float aBase;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.y = aBase + (transformed.y - aBase) * uLift;');
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|rising`;
}

/**
 * The Ferris spokes and the ramp they make: two spokes stand either side of the road past the curb
 * until the shift; then each swings down and in to lie along the new ramp's edges as the ramp rises
 * out of the planks (the ramp is the track data's, the twin's feature, drawn here instead of in the
 * scene's merged ramps so it can rise). Both posed on the GPU from two matrices and a height a frame.
 */
function spokeRamp(ctx: StageContext, stage: StageImpl): Piece | null {
  const { twin } = ctx;
  const added = ctx.track.def.finalLapShift.addsJumps ?? [];
  if (!twin || !added.length) return null;
  const f = twin.features.find((x) => x.kind === 'jump' && x.id === added[0].id && x.shape !== 'hump');
  if (!f?.run || !f.rise) return null;
  for (const j of added) stage.ownsJumps.add(j.id);
  const meshes: Object3D[] = [];
  // the deck, as the scene would draw it, rising from flat
  const decks = buildJumpMeshes(twin, ctx.palette, ctx.gradient, (x) => stage.ownsJumps.has(x.id));
  const M = twin.branches.main, L = M.lut;
  const lift = { value: 0 };
  for (const d of decks) {
    own(d);
    d.name = 'shift-ramp-deck';
    d.visible = false;
    d.frustumCulled = false;
    const attr = d.geometry.getAttribute('position') as BufferAttribute, base = new Float32Array(attr.count);
    const P: Vec3 = [0, 0, 0];
    for (let v = 0; v < attr.count; v++) {
      P[0] = attr.getX(v); P[1] = attr.getY(v); P[2] = attr.getZ(v);
      const t = M.nearestGlobal(P).t, c = L.sample(t, 0), rx = c.tangent[2], rz = -c.tangent[0], h = Math.hypot(rx, rz) || 1;
      const lat = ((P[0] - c.position[0]) * rx + (P[2] - c.position[2]) * rz) / h;
      base[v] = L.sample(t, lat).position[1] + 0.03;
    }
    d.geometry.setAttribute('aBase', new BufferAttribute(base, 1));
    risingFromRoad(d.material as MeshToonMaterial, lift);
    meshes.push(d);
  }
  // the spokes, each in its own frame (+Y up its length), posed by a matrix a frame
  const iLip = sampleOf(L, f.t), ds = metresPer(L), iEntry = iLip - Math.round(f.run / ds);
  const { r } = frameAt(L, iLip);
  const hw = L.hw[L.idx(iLip)];
  const bx = new Boxes();
  const len = Math.hypot(f.run, f.rise);
  const spokes: { hs: Vec3; he: Vec3; qs: Quaternion; qe: Quaternion; m: Matrix4 }[] = [];
  const which: number[] = [];
  for (const side of [-1, 1]) {
    const from = bx.pos.length / 3;
    spokeModel(bx, len);
    for (let v = from; v < bx.pos.length / 3; v++) which.push(spokes.length);
    const hs = roadPoint(L, iLip, side * (hw + BUILDER.kerbWidth + 1.1), 0.9);
    const he = roadPoint(L, iLip, f.lateral + side * (f.width / 2 + 0.12), f.rise + 0.1);
    const entry = roadPoint(L, iEntry, f.lateral + side * (f.width / 2 + 0.12), 0.12);
    // +Z its face toward the road's middle
    const zAxis = new Vector3(-side * r[0], 0, -side * r[2]);
    const basis = (y: Vector3) => { const x = new Vector3().crossVectors(y, zAxis).normalize(); const z = new Vector3().crossVectors(x, y).normalize(); return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)); };
    spokes.push({ hs, he, qs: basis(new Vector3(0, 1, 0)), qe: basis(new Vector3(entry[0] - he[0], entry[1] - he[1], entry[2] - he[2]).normalize()), m: new Matrix4() });
  }
  const g = bx.build();
  g.setAttribute('aSpoke', new Float32BufferAttribute(which, 1));
  const mat = propMaterial(ctx.gradient);
  const su = { uSpokeA: { value: spokes[0].m }, uSpokeB: { value: spokes[1].m } };
  posedBySpoke(mat, su);
  const spokeMesh = own(new Mesh(g, mat));
  spokeMesh.name = 'shift-spokes';
  spokeMesh.castShadow = false;
  spokeMesh.receiveShadow = true;
  spokeMesh.frustumCulled = false;
  spokeMesh.userData.pose = su; // (for checks)
  meshes.push(spokeMesh);
  const H = new Vector3();
  const pose = (k: number) => {
    for (let n = 0; n < spokes.length; n++) {
      const s = spokes[n];
      // swing: a slerp from standing to lying, the hinge sliding in; a little overshoot as it lands
      const kk = Math.min(1.06, k < 1 ? k + 0.06 * Math.sin(k * Math.PI) : 1);
      Q1.copy(s.qs).slerp(s.qe, Math.min(1, kk));
      const kh = Math.min(1, k * 1.25);
      H.set(s.hs[0] + (s.he[0] - s.hs[0]) * kh, s.hs[1] + (s.he[1] - s.hs[1]) * kh + Math.sin(k * Math.PI) * 1.2, s.hs[2] + (s.he[2] - s.hs[2]) * kh);
      s.m.makeRotationFromQuaternion(Q1).setPosition(H);
    }
  };
  pose(0);
  const S = SHOW.fireworks;
  let lastK = 0, landed = false;
  const rampAnchor = roadPoint(L, iLip, f.lateral, f.rise);
  return {
    meshes,
    anchors: { ramp: rampAnchor, spokeL: spokes[0].hs, spokeR: spokes[1].hs },
    update(fr) {
      const on = fr.since >= 0;
      // the spokes: standing, swinging (reduced motion: a cut), lying
      const k = !on ? 0 : fr.reduced ? (fr.since >= S.spokes[0] + 0.3 ? 1 : 0) : ease(fr.since, S.spokes[0], S.spokes[1]);
      if (k !== lastK) { pose(k); lastK = k; }
      if (on && k >= 1 && !landed) {
        landed = true;
        for (let n = 0; n < spokes.length; n++) fr.stage.burst('sparks', spokes[n].he[0], spokes[n].he[1] + 0.2, spokes[n].he[2], 1);
      }
      // the deck rises past its height a little and settles (a spring)
      const kd = !on ? 0 : fr.reduced ? (fr.since >= S.deck[0] ? 1 : 0) : span(fr.since, S.deck[0], S.deck[1]);
      lift.value = kd >= 1 ? 1 : kd * kd * (3 - 2 * kd) * (1 + 0.12 * Math.sin(kd * Math.PI));
      for (let i = 0; i < decks.length; i++) decks[i].visible = on && fr.since >= S.deck[0];
    },
  };
}

/** Where each salvo's bursts go up: metres to the right of the camera's kart (a burst is 58 to 66 m ahead of it). */
const SALVO = Object.freeze({ first: [-20, 0, 20], second: [-12, 12], reduced: [-14, 14] });

/** Two big bursts of fireworks over the road ahead of the camera's kart (vfx-juice draws them). */
function salvo(ctx: StageContext): Piece {
  const L = ctx.track.branches.main.lut;
  const fallback: Vec3 = [L.px[0], L.py[0], L.pz[0]];
  return {
    meshes: [],
    update(f) {
      const S = SHOW.fireworks.salvo;
      for (let n = 0; n < S.length; n++) {
        if (!crossed(f, S[n]) || (f.reduced && n > 0)) continue;
        const p = f.focus ?? fallback, sh = Math.sin(f.heading), ch = Math.cos(f.heading);
        // forward = (sin h, 0, cos h), right = (cos h, 0, -sin h)
        const bursts = f.reduced ? SALVO.reduced : n === 0 ? SALVO.first : SALVO.second;
        for (let i = 0; i < bursts.length; i++) {
          const side = bursts[i], ahead = 58 + (i % 2) * 8, up = 26 + ((i + n) % 3) * 5;
          f.stage.burst('firework', p[0] + sh * ahead + ch * side, p[1] + up, p[2] + ch * ahead - sh * side, 3.2, n * 3 + i * 2);
        }
      }
    },
  };
}

// ================================================================ Skyline Circuit: sunset to starlight

/**
 * The old sky bridges: the road the shift's route replaces, drawn on (a copy of its ribbon and its gold
 * parapet) and retracting from its middle back to its ends, where it clears the new road, then gone.
 */
function retractingBridges(ctx: StageContext): Piece | null {
  const { track, twin } = ctx;
  const ov = track.def.finalLapShift.routeOverrides?.[0];
  if (!twin || !ov) return null;
  const L = track.branches.main.lut, NM = twin.branches.main;
  const i0 = Math.round(ov.fromT * L.step), i1 = Math.round((ov.toT < ov.fromT ? ov.toT + 1 : ov.toT) * L.step);
  // the stretch clear of the new road (no two roads drawn in one place)
  const ok = (i: number) => {
    const p = roadPoint(L, i, 0), near = NM.nearestGlobal(p), c = NM.lut.sample(near.t, 0);
    return Math.hypot(p[0] - c.position[0], p[1] - c.position[1], p[2] - c.position[2]) > L.hw[L.idx(i)] + c.halfWidth + 2 * BUILDER.kerbWidth + 1;
  };
  let best: [number, number] | null = null;
  for (let i = i0; i <= i1;) {
    if (!ok(i)) { i++; continue; }
    let j = i;
    while (j + 1 <= i1 && ok(j + 1)) j++;
    if (!best || j - i > best[1] - best[0]) best = [i, j];
    i = j + 1;
  }
  if (!best || best[1] - best[0] < 20) return null;
  const [a, b] = best, count = b - a + 1;
  const ribbon = buildRibbon(L, a / L.step, b / L.step, ctx.palette, { offroad: false });
  const rp = ribbon.getAttribute('position') as BufferAttribute;
  const ribbonVerts = rp.count, perStrip = count * 2;
  // the parapet on each side: inner face, top, outer face (a 0.34 m gold wall), in the ribbon's attributes
  const wall: number[] = [], wallCol: number[] = [], wallIdx: number[] = [];
  const FOOT: Rgb = [0.78, 0.55, 0.12], TOP: Rgb = [1.05, 0.86, 0.35];
  const PROFILE: [number, number, Rgb][] = [[0, -0.3, FOOT], [0, 0.55, TOP], [0.34, 0.55, TOP], [0.34, -0.3, FOOT]];
  for (const side of [-1, 1]) {
    const base = ribbonVerts + wall.length / 3;
    for (let r = 0; r < count; r++) {
      const i = a + r, w = L.hw[L.idx(i)] + BUILDER.kerbWidth;
      for (const [dx, h, c] of PROFILE) {
        const p = roadPoint(L, i, side * (w + dx), h);
        wall.push(p[0], p[1], p[2]);
        wallCol.push(c[0], c[1], c[2]);
      }
    }
    for (let r = 0; r + 1 < count; r++) {
      for (let q = 0; q < 3; q++) {
        const p0 = base + r * 4 + q, p1 = p0 + 1, n0 = p0 + 4, n1 = n0 + 1;
        wallIdx.push(p0, n0, p1, p1, n0, n1);
      }
    }
  }
  // merge: the ribbon, then the walls, all in the ribbon's attributes (the walls plain, mark 3)
  const total = ribbonVerts + wall.length / 3;
  const pos = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const mark = new Float32Array(total), bend = new Float32Array(total), surf = new Float32Array(total);
  pos.set(rp.array as Float32Array);
  pos.set(wall, ribbonVerts * 3);
  col.set(ribbon.getAttribute('color').array as Float32Array);
  col.set(wallCol, ribbonVerts * 3);
  uv.set(ribbon.getAttribute('uv').array as Float32Array);
  mark.set(ribbon.getAttribute('mark').array as Float32Array);
  mark.fill(3, ribbonVerts);
  bend.set(ribbon.getAttribute('bend').array as Float32Array);
  surf.set(ribbon.getAttribute('surf').array as Float32Array);
  const idx = Array.from(ribbon.getIndex()!.array as Uint32Array);
  // walls both ways round, so each face shows from outside (the road's material draws front faces only)
  for (let k = 0; k < wallIdx.length; k += 3) idx.push(wallIdx[k], wallIdx[k + 1], wallIdx[k + 2], wallIdx[k], wallIdx[k + 2], wallIdx[k + 1]);
  ribbon.dispose();
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('mark', new BufferAttribute(mark, 1));
  g.setAttribute('bend', new BufferAttribute(bend, 1));
  g.setAttribute('surf', new BufferAttribute(surf, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  // each vertex's row along the road and the stride to the same vertex a row on
  const row = new Int32Array(total), stride = new Int32Array(total);
  for (let v = 0; v < ribbonVerts; v++) { row[v] = Math.floor((v % perStrip) / 2); stride[v] = 2; }
  for (let v = ribbonVerts; v < total; v++) { row[v] = Math.floor(((v - ribbonVerts) % (count * 4)) / 4); stride[v] = 4; }
  const orig = Float32Array.from(pos);
  const mesh = own(new Mesh(g, ctx.roadMaterial), false);
  mesh.name = 'shift-old-road';
  mesh.receiveShadow = true;
  mesh.visible = false;
  const mid = (count - 1) >> 1, S = SHOW.sunset;
  let lastK = -1, lastSpark = -1;
  const edgeAt = (r: number, out: Vec3 = [0, 0, 0]): Vec3 => roadPoint(L, a + r, 0, 0.3, out);
  const spark: Vec3 = [0, 0, 0];
  return {
    meshes: [mesh],
    anchors: { bridges: edgeAt(mid) },
    update(f) {
      if (f.since < 0) { mesh.visible = false; return; }
      const k = f.reduced ? (f.since >= S.retract[0] + 0.4 ? 1 : 0) : ease(f.since, S.retract[0], S.retract[1]);
      mesh.visible = k < 1;
      if (k >= 1 || k === lastK) return;
      lastK = k;
      // the two halves slide back into their ends: rows past each front stand at the front
      const fl = Math.round(mid - k * mid), fr = Math.round(mid + 1 + k * (count - 2 - mid));
      const p = g.getAttribute('position').array as Float32Array;
      for (let v = 0; v < total; v++) {
        const r = row[v];
        let w = v;
        if (r <= mid && r > fl) w = v - (r - fl) * stride[v];
        else if (r > mid && r < fr) w = v + (fr - r) * stride[v];
        p[v * 3] = orig[w * 3]; p[v * 3 + 1] = orig[w * 3 + 1]; p[v * 3 + 2] = orig[w * 3 + 2];
      }
      g.getAttribute('position').needsUpdate = true;
      // sparks off the moving edges
      const n = Math.floor(f.since / 0.22);
      if (!f.reduced && n !== lastSpark && k > 0) {
        lastSpark = n;
        for (let q = 0; q < 2; q++) { const e = edgeAt(q ? fr : fl, spark); f.stage.burst('sparks', e[0], e[1], e[2], 0.8); }
      }
    },
  };
}

/** The rail lit as the only road (edge lines and dashes run along it) and the finish line lit gold. */
function railGlow(ctx: StageContext): Piece | null {
  const { track, twin } = ctx;
  const ov = track.def.finalLapShift.routeOverrides?.[0];
  if (!twin || !ov) return null;
  const L = twin.branches.main.lut, ds = metresPer(L);
  const S = SHOW.sunset;
  const first = ov.controlPoints[0], last = ov.controlPoints[ov.controlPoints.length - 1];
  const tA = L.nearestTGlobal([first.x, first.y, first.z]), tB = L.nearestTGlobal([last.x, last.y, last.z]);
  const iA = sampleOf(L, tA), iB = iA + Math.round(((((tB - tA) % 1) + 1) % 1) * L.step);
  const step = Math.max(1, Math.round(1.5 / ds));
  const gb = new GlowBuilder();
  const GOLD: Rgb = [1.8, 1.05, 0.18], PALE: Rgb = [1.6, 1.3, 0.6];
  const lines: { l: Vec3; r: Vec3; along: number; sweep: number }[][] = [[], [], []];
  for (let i = iA; i <= iB; i += step) {
    const hw = L.hw[L.idx(i)], s = (i - iA) * ds, sweep = S.rail[0] + ((S.rail[1] - S.rail[0]) * (i - iA)) / Math.max(1, iB - iA);
    for (const [k, c, w] of [[0, -(hw - 0.45), 0.16], [1, hw - 0.45, 0.16], [2, 0, 0.45]] as const) {
      lines[k].push({ l: roadPoint(L, i, c - w, 0.05), r: roadPoint(L, i, c + w, 0.05), along: s, sweep });
    }
  }
  gb.strip(lines[0], () => GOLD, S.rail[0], GLOW_KIND.line);
  gb.strip(lines[1], () => GOLD, S.rail[0], GLOW_KIND.line);
  gb.strip(lines[2], () => PALE, S.rail[0], GLOW_KIND.dashes);
  // the finish line: a gold band across the road and a curtain of light over it
  const iS = sampleOf(L, twin.startT), W = L.hw[L.idx(iS)] + BUILDER.kerbWidth, f0 = S.finish[0];
  const off = Math.max(1, Math.round(0.45 / ds));
  const FINISH: Rgb = [1.9, 1.25, 0.3];
  gb.strip([-1, 1].map((k) => ({ l: roadPoint(L, iS + k * off, -W, 0.06), r: roadPoint(L, iS + k * off, W, 0.06), along: 0, sweep: f0 })), () => FINISH, f0, GLOW_KIND.line);
  const c0 = gb.vert(roadPoint(L, iS, -W, 0.05), FINISH, 0, 0, f0, f0, GLOW_KIND.curtain);
  gb.vert(roadPoint(L, iS, W, 0.05), FINISH, 1, 0, f0, f0, GLOW_KIND.curtain);
  gb.vert(roadPoint(L, iS, W, 3.4), FINISH, 1, 1, f0, f0, GLOW_KIND.curtain);
  gb.vert(roadPoint(L, iS, -W, 3.4), FINISH, 0, 1, f0, f0, GLOW_KIND.curtain);
  gb.quad(c0, c0 + 1, c0 + 2, c0 + 3);
  const u = glowUniforms();
  const mesh = own(new Mesh(gb.build(), glowMaterial(u)));
  mesh.name = 'shift-rail-glow';
  mesh.visible = false;
  return {
    meshes: [mesh],
    anchors: { rail: roadPoint(L, (iA + iB) >> 1, 0), finish: roadPoint(L, iS, 0) },
    update(f) { mesh.visible = f.since >= 0; setGlow(u, f); },
  };
}

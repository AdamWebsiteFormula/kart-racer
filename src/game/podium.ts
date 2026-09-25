// The podium ceremony (Adam, 24 Sept 2026; Mario Kart World's award ceremony, design §9): after a
// Grand Prix's final standings and after a Knockout final, the top three stand on a podium on the
// grid behind the start line, in the last track's own world under its own sky, the grandstands'
// townsfolk cheering past the gantry. 2nd, 1st and 3rd on stepped blocks in the biome's stand
// colours with their places on the front, each in their own kart, paint and body and reacting
// (kart-controller anim.ts: champion, cheer, bounce), a big gold cup of our own (a balloon on its
// lid) popping up on a column behind the winner, confetti drifting down and fireworks over the
// stands, the camera craning down and sweeping slowly across. Reduced motion: two still shots cut
// in turn, the reactions small, fewer fireworks. Built at the series' last results and compiled
// then (performance/warmup.ts precompile), so no frame stalls on it; main.ts hides the race's karts
// and items while it shows. Render only: nothing here touches the sim.
import {
  BufferAttribute, CanvasTexture, CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, MeshToonMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2,
  type BufferGeometry, type Material, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowFromVertexColours } from '../track-builder/mesh/glow.ts';
import { buildRacerMesh, isShared, ModelBuilder, toonRamp, vertexToon, type KartLook } from '../art-pipeline/index.ts';
import { BIOMES, type Crowd } from '../art-pipeline/crowd.ts';
import type { Paint as Colour } from '../art-pipeline/model.ts';
import type { Reaction } from '../kart-controller/anim.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { createKartState, NEUTRAL_INPUT, type Archetype, type KartState, type TrackSample, type Vec3 } from '../kart-controller/types.ts';
import { KartView } from '../kart-controller/view.ts';
import type { Track } from '../track-builder/track.ts';
import { buildKartMesh, ownKartMaterials } from './kartMesh.ts';

export const PODIUM = Object.freeze({
  /**
   * metres behind the start line (at the back of the grid: no balloon, pad or hazard stands there), far
   * enough that the start gantry frames the winners from behind and the cup stands above it, against the sky
   */
  back: 14,
  /** a block's width and depth, the gap between blocks; heights for 1st, 2nd, 3rd */
  width: 2.5, depth: 2.9, gap: 0.08, heights: [1.15, 0.8, 0.5] as const,
  /** the cup: its column behind the winner (height, radius, metres back from the podium's middle), the cup's height, the pop-up (s after the start, s long) */
  column: 2.8, columnRadius: 0.45, columnBack: 2.05, cup: 1.9, cupAt: 2.3, cupPop: 0.6,
  /** the camera: circling radius and height over the road, aim height; its sweep either side (rad) and the sweep's period (s); the crane in (start radius, height, seconds); field of view */
  radius: 8, height: 1.75, aim: 2.3, arc: 0.42, period: 24, craneFrom: [16, 7.5] as const, crane: 3.4, fov: 50,
  /** reduced motion: the wide shot and the winner's close shot cut in turn every `cut` seconds */
  cut: 5, close: 5.2, closeHeight: 2.1,
  /** each place's reaction starts (3rd, then 2nd, then 1st) and plays again every `again` seconds */
  reactAt: [0.25, 0.85, 1.5] as const, again: 7.5,
  /** confetti pieces a second over the podium, within `confettiRadius` of it */
  confetti: 46, confettiRadius: 5.5,
  /** a firework every `firework` seconds (±40 %), behind the podium and over the stands: metres back, across, up */
  firework: 0.8, fwBack: [7, 16] as const, fwAcross: 13, fwUp: [8, 13] as const,
  /** the crowd cheers again every this many seconds (art-pipeline crowd.ts CROWD.cheer is 3.2) */
  cheer: 3,
});

/** Each place's reaction on its step: 1st, 2nd, 3rd. */
export const PODIUM_REACTIONS: readonly Reaction[] = Object.freeze(['champion', 'cheer', 'bounce']);

/** A racer on the podium: who, their class (their kart's springs) and their look (the player's paint and body; a rival's own). */
export interface PodiumRacer { racerId: string; archetype: Archetype; look?: KartLook }

/** What the ceremony throws: game/main.ts passes the Vfx (vfx-juice/vfx.ts). */
export interface PodiumFx {
  firework(x: number, y: number, z: number, hue: number, reduced?: boolean): void;
  confettiRain(x: number, y: number, z: number, radius: number, n: number): void;
}

/** The podium's place on the track: its middle on the road, the way its front faces (toward the camera, back down the straight) and the road height. */
export interface PodiumSpot { middle: Vec3; facing: number; front: Vec3; right: Vec3 }

/** Where the podium stands on a track: PODIUM.back metres behind the start line, facing back down the grid. */
export function podiumSpot(track: Track, back: number = PODIUM.back): PodiumSpot {
  const s: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
  const t = (((track.startT - back / track.length) % 1) + 1) % 1;
  track.sampleInto(t, 0, 0, s);
  const h = Math.hypot(s.tangent[0], s.tangent[2]) || 1;
  const front: Vec3 = [-s.tangent[0] / h, 0, -s.tangent[2] / h];
  // the audience's right (looking at the podium): 3rd stands there, 2nd on the left
  const right: Vec3 = [front[2], 0, -front[0]];
  return { middle: [s.position[0], s.groundY, s.position[2]], facing: Math.atan2(front[0], front[2]), front, right };
}

/**
 * The biome's podium colours, from its grandstands (art-pipeline crowd.ts): body, trim, band, plinth.
 * A night stand (neon trimmed: Boardwalk Nights) gives a pale body with neon trims that light
 * themselves (colours past 1, track-builder glow.ts), as its stands do: a dark one vanished at night.
 */
function palette(biome: string | undefined): { body: Colour; trim: Colour; band: Colour; plinth: Colour; night: boolean } {
  const st = (biome && BIOMES[biome]?.stand) || BIOMES.harbour.stand;
  if (st.neon) return { body: '#e4ddff', trim: [2.4, 0.3, 1.5], band: [0.3, 2.0, 2.4], plinth: st.frame, night: true };
  return { body: '#fffaf0', trim: st.awningA, band: st.seatA, plinth: st.frame, night: false };
}

const MEDAL = ['#f2b705', '#c9d2dc', '#d0894f'] as const;
const ORDINAL = ['1', '2', '3'] as const;

/** The three place plates' picture: a medal badge with its numeral in each third (null outside a browser). */
function platesTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 768; c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  for (let i = 0; i < 3; i++) {
    const x = i * 256 + 128, y = 128;
    g.fillStyle = '#1b1b2f';
    g.beginPath(); g.arc(x, y + 8, 112, 0, Math.PI * 2); g.fill();
    g.fillStyle = MEDAL[i];
    g.beginPath(); g.arc(x, y, 108, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fffaf0'; g.lineWidth = 10;
    g.beginPath(); g.arc(x, y, 90, 0, Math.PI * 2); g.stroke();
    g.font = "400 150px 'Lilita One', 'Arial Rounded MT Bold', sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 18; g.strokeStyle = '#fffaf0';
    g.strokeText(ORDINAL[i], x, y + 10);
    g.fillStyle = '#1b1b2f';
    g.fillText(ORDINAL[i], x, y + 10);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A cup of our own: a flared bowl with a rolled rim on a stem, knob and stepped foot, two looped handles, a lid with a balloon on it. Origin at its foot. */
function cupGeometry(height: number): BufferGeometry {
  const s = height / 1.6;
  const profile = [
    [0, 0], [0.5, 0], [0.52, 0.06], [0.44, 0.1], [0.4, 0.16], [0.22, 0.22], [0.12, 0.3], [0.11, 0.42], [0.2, 0.47], [0.11, 0.53],
    [0.13, 0.6], [0.3, 0.66], [0.5, 0.78], [0.6, 0.94], [0.64, 1.1], [0.68, 1.16], [0.62, 1.18], [0.58, 1.14], [0.1, 1.2],
  ].map(([r, y]) => new Vector2(r * s, y * s));
  const parts: BufferGeometry[] = [new LatheGeometry(profile, 40)];
  // a domed lid inside the rim, and the knot our balloon is tied to (the balloon is its own red mesh: balloonGeometry)
  parts.push(new SphereGeometry(0.56 * s, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.42, 1).translate(0, 1.15 * s, 0));
  parts.push(new CylinderGeometry(0.02 * s, 0.06 * s, 0.12 * s, 10).translate(0, 1.36 * s, 0));
  // two handles: rings half sunk into the bowl's sides, so a loop stands out from each
  for (const side of [-1, 1]) parts.push(new TorusGeometry(0.22 * s, 0.05 * s, 10, 28).translate(side * 0.66 * s, 0.9 * s, 0));
  const clean = parts.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const n of Object.keys(x.attributes)) if (n !== 'position' && n !== 'normal') x.deleteAttribute(n); return x; });
  const out = mergeGeometries(clean, false)!;
  for (const g of parts) g.dispose();
  out.computeBoundingSphere();
  return out;
}

/** The cup's crown: a pickup balloon (design §8: pickups are balloons), red, tied on its lid. Origin at the cup's foot. */
function balloonGeometry(height: number): BufferGeometry {
  const s = height / 1.6;
  return new SphereGeometry(0.23 * s, 22, 16).scale(1, 1.2, 1).translate(0, 1.66 * s, 0);
}

const smoother = (u: number): number => { const k = u < 0 ? 0 : u > 1 ? 1 : u; return k * k * k * (k * (k * 6 - 15) + 10); };
/** 0 → 1 with a springy overshoot, over 0..1 */
const popIn = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2));

/** Visual-only randomness for the ceremony's fireworks (never the sim's). */
let seed = 0x51ed27;
const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };

export class Podium {
  /** everything the ceremony adds to the scene (the karts in world space), hidden until start() */
  readonly group = new Group();
  /** the podium itself, placed and turned: local +Z its front (toward the camera), local +X the audience's right */
  private readonly stage = new Group();
  readonly spot: PodiumSpot;
  /** the camera this frame (main.ts copies it), and its field of view */
  readonly pos: Vec3 = [0, 0, 0];
  readonly look: Vec3 = [0, 0, 0];
  fov: number = PODIUM.fov;
  /** seconds since start(), -1 before */
  time = -1;
  /** each racer on their step: 1st, 2nd, 3rd (fewer when the field was smaller) */
  readonly views: KartView[] = [];
  readonly racers: readonly PodiumRacer[];
  private readonly states: KartState[] = [];
  private readonly cup: Mesh;
  private readonly own: (BufferGeometry | Material | CanvasTexture)[] = [];
  private readonly crowd: Crowd | null;
  private nextFirework = 0;
  private nextCheer = 0;
  private confettiDebt = 0;
  private reacted = [-1, -1, -1];
  private hue = 0;

  /** `top`: 1st, 2nd, 3rd; `biome`: the track's (its stands' colours); `crowd`: the track's grandstand crowd, cheered on through the ceremony */
  constructor(track: Track, top: readonly PodiumRacer[], biome?: string, crowd: Crowd | null = null) {
    this.racers = top.slice(0, 3);
    this.crowd = crowd;
    this.spot = podiumSpot(track);
    const P = PODIUM, pal = palette(biome), sp = this.spot;
    this.group.name = 'podium';
    this.group.visible = false;
    this.stage.position.set(...sp.middle);
    this.stage.rotation.y = sp.facing;
    this.group.add(this.stage);
    // the blocks (merged, vertex-coloured: one draw): 2nd on the audience's left, 1st in the middle, 3rd on the right
    const m = new ModelBuilder(0);
    const across = P.width + P.gap;
    const xs = [0, -across, across];
    for (let i = 0; i < 3; i++) {
      const h = P.heights[i], x = xs[i];
      m.box([P.width, h - 0.12, P.depth], pal.body, [x, (h - 0.12) / 2, 0]);
      // a coloured top with a lip, and a band round the foot
      m.box([P.width + 0.12, 0.12, P.depth + 0.12], pal.trim, [x, h - 0.06, 0]);
      m.box([P.width + 0.06, 0.14, P.depth + 0.06], pal.band, [x, 0.07, 0]);
    }
    // a low plinth under all three, and the cup's column behind the winner
    m.box([3 * P.width + 2 * P.gap + 0.8, 0.12, P.depth + 0.8], pal.plinth, [0, 0.06, 0]);
    const cz = -P.columnBack;
    m.cyl(P.columnRadius * 1.25, P.columnRadius * 1.35, 0.22, pal.band, [0, 0.11, cz], undefined, 24);
    m.cyl(P.columnRadius, P.columnRadius, P.column - 0.3, pal.body, [0, 0.07 + (P.column - 0.3) / 2 + 0.15, cz], undefined, 24);
    m.cyl(P.columnRadius * 1.2, P.columnRadius * 1.1, 0.16, pal.trim, [0, P.column - 0.08, cz], undefined, 24);
    // (at night its own toon, whose neon trims light themselves; by day the shared one)
    const nightMat = pal.night ? new MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonRamp() }) : null;
    if (nightMat) { glowFromVertexColours(nightMat); this.own.push(nightMat); }
    const blocks = new Mesh(m.build(), nightMat ?? vertexToon());
    blocks.name = 'podium-blocks';
    blocks.castShadow = true;
    blocks.receiveShadow = true;
    this.own.push(blocks.geometry);
    this.stage.add(blocks);
    // the places on the block fronts: one strip of three plates, one draw
    const plateGeos: BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const size = Math.min(0.95, P.heights[i] * 0.82), g = new PlaneGeometry(size, size);
      const uv = g.getAttribute('uv') as BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 3);
      g.translate(xs[i], (P.heights[i] - 0.12) / 2 + 0.02, P.depth / 2 + 0.012);
      plateGeos.push(g);
    }
    const plates = mergeGeometries(plateGeos, false)!;
    for (const g of plateGeos) g.dispose();
    const tex = platesTexture();
    // (at night the plates light themselves a little, so the places read)
    const plateMat = new MeshToonMaterial({
      color: tex ? 0xffffff : 0xf2b705, map: tex, gradientMap: toonRamp(), transparent: !!tex, alphaTest: tex ? 0.5 : 0,
      ...(pal.night ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45 } : {}),
    });
    const plateMesh = new Mesh(plates, plateMat);
    plateMesh.name = 'podium-places';
    plateMesh.receiveShadow = true;
    this.own.push(plates, plateMat);
    if (tex) this.own.push(tex);
    this.stage.add(plateMesh);
    // the cup: polished gold (the scene's soft studio reflection shines on it), on the column
    const cupGeo = cupGeometry(P.cup), cupMat = new MeshStandardMaterial({ color: '#ffc93c', metalness: 1, roughness: 0.26, envMapIntensity: 1.4 });
    this.cup = new Mesh(cupGeo, cupMat);
    this.cup.name = 'podium-cup';
    this.cup.castShadow = true;
    this.cup.position.set(0, P.column, cz);
    const bGeo = balloonGeometry(P.cup), bMat = new MeshToonMaterial({ color: '#ff3d52', gradientMap: toonRamp() });
    const balloon = new Mesh(bGeo, bMat);
    balloon.name = 'podium-cup-balloon';
    balloon.castShadow = true;
    this.cup.add(balloon);
    this.own.push(cupGeo, cupMat, bGeo, bMat);
    this.stage.add(this.cup);
    // the racers, each on their step facing the audience, on springs of their own (a reaction each)
    for (let i = 0; i < this.racers.length; i++) {
      const r = this.racers[i];
      const mesh = buildRacerMesh(r.racerId, r.look ?? {}) ?? buildKartMesh(0xffffff, 0x888888);
      ownKartMaterials(mesh); // their own copies: never a rival's near-camera fade
      mesh.name = `podium-${r.racerId}`;
      const lx = xs[i], h = P.heights[i];
      const wx = sp.middle[0] + sp.right[0] * lx, wz = sp.middle[2] + sp.right[2] * lx;
      const st = createKartState({ racerId: r.racerId, position: [wx, sp.middle[1] + h, wz], heading: sp.facing });
      const v = new KartView(makeConstants(r.archetype, 150), mesh, st, i + 3);
      v.root.name = `podium-kart-${i + 1}`;
      this.states.push(st);
      this.views.push(v);
      this.group.add(v.root); // in world space: the group itself is never moved
    }
    this.reset();
  }

  /** Back to before the ceremony: the cup down, nobody reacting, the camera at its crane start. */
  private reset(): void {
    this.time = -1;
    this.cup.scale.setScalar(0.001);
    this.reacted = [-1, -1, -1];
    this.nextFirework = 0.4;
    this.nextCheer = 0;
    this.confettiDebt = 0;
    for (const v of this.views) v.anim.react(null);
  }

  /** Show it and start the ceremony now. */
  start(): void {
    this.reset();
    this.time = 0;
    this.group.visible = true;
  }

  /** Hide it again (its karts stop). */
  stop(): void {
    this.group.visible = false;
    this.time = -1;
  }

  get showing(): boolean { return this.time >= 0; }

  /**
   * One rendered frame of the ceremony: `dt` real seconds. The racers react and bob, the cup pops up,
   * confetti drifts down, fireworks go up over the stands, the crowd cheers, the camera cranes in and
   * sweeps (reduced motion: still shots cut in turn). `clock` is the crowd's clock (WATER_CLOCK).
   */
  update(dt: number, reduced: boolean, fx: PodiumFx | null, clock = 0): void {
    if (this.time < 0) return;
    const P = PODIUM, t = (this.time += dt), sp = this.spot;
    // the racers: 3rd, then 2nd, then the winner; each again every so often
    for (let i = 0; i < this.views.length; i++) {
      const at = P.reactAt[2 - i] ?? 0;
      const n = t < at ? -1 : Math.floor((t - at) / P.again);
      if (n !== this.reacted[i]) { this.reacted[i] = n; if (n >= 0) this.views[i].anim.react(PODIUM_REACTIONS[i]); }
      this.views[i].onTick(this.states[i], dt, NEUTRAL_INPUT);
      this.views[i].onFrame(1, this.states[i], 0, dt, reduced);
    }
    // the cup pops up on its column (reduced motion: there from the start) and turns slowly
    this.cup.scale.setScalar(Math.max(0.001, reduced ? 1 : popIn((t - P.cupAt) / P.cupPop)));
    this.cup.rotation.y = reduced ? 0.35 : t * 0.45;
    // the crowd past the gantry keeps cheering
    if (this.crowd && t >= this.nextCheer) { this.crowd.shift(clock); this.nextCheer = t + P.cheer; }
    if (fx) {
      const up = sp.middle[1];
      this.confettiDebt += P.confetti * dt * (reduced ? 0.5 : 1);
      const n = Math.floor(this.confettiDebt);
      if (n > 0) { this.confettiDebt -= n; fx.confettiRain(sp.middle[0], up, sp.middle[2], P.confettiRadius, n); }
      if (t >= this.nextFirework) {
        const back = P.fwBack[0] + rnd() * (P.fwBack[1] - P.fwBack[0]), across = (rnd() * 2 - 1) * P.fwAcross, h = P.fwUp[0] + rnd() * (P.fwUp[1] - P.fwUp[0]);
        fx.firework(sp.middle[0] - sp.front[0] * back + sp.right[0] * across, up + h, sp.middle[2] - sp.front[2] * back + sp.right[2] * across, this.hue++, reduced);
        this.nextFirework = t + P.firework * (reduced ? 2 : 1) * (0.6 + rnd() * 0.8);
      }
    }
    this.camera(t, reduced);
  }

  /** The camera: craning down and in, then sweeping slowly across the front; with reduced motion, still shots cut in turn. */
  private camera(t: number, reduced: boolean): void {
    const P = PODIUM, sp = this.spot, m = sp.middle;
    let r: number, h: number, a: number, aimX = 0;
    if (reduced) {
      const close = Math.floor(t / P.cut) % 2 === 1;
      r = close ? P.close : P.radius; h = close ? P.closeHeight : P.height; a = close ? 0.18 : 0;
    } else {
      const c = smoother(t / P.crane);
      r = P.craneFrom[0] + (P.radius - P.craneFrom[0]) * c;
      h = P.craneFrom[1] + (P.height - P.craneFrom[1]) * c;
      // the sweep starts at the middle and swings either side
      a = P.arc * Math.sin((2 * Math.PI * Math.max(0, t - P.crane * 0.5)) / P.period) * c;
    }
    const ca = Math.cos(a), sa = Math.sin(a);
    this.pos[0] = m[0] + (sp.front[0] * ca + sp.right[0] * sa) * r;
    this.pos[1] = m[1] + h;
    this.pos[2] = m[2] + (sp.front[2] * ca + sp.right[2] * sa) * r;
    this.look[0] = m[0] + sp.right[0] * aimX;
    this.look[1] = m[1] + P.aim;
    this.look[2] = m[2] + sp.right[2] * aimX;
    this.fov = P.fov;
  }

  /** Free its own geometry, materials and texture, and the karts' own material copies. */
  dispose(): void {
    this.group.removeFromParent();
    for (const x of this.own) x.dispose();
    for (const v of this.views) {
      v.root.traverse((o: Object3D) => {
        const mm = (o as Mesh).material as Material | Material[] | undefined;
        for (const x of Array.isArray(mm) ? mm : mm ? [mm] : []) if (!isShared(x)) x.dispose();
      });
    }
  }
}

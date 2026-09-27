// The speed pickup, a gear (Adam, 26 Sept 2026: "I don't think the game needs coins, because that's too much
// of a copy of Mario Kart. Perhaps some other object that works in a similar way, but not coins."). A chunky
// cartoon cog that tunes up your kart: each one a little more top speed, up to 10, and a hit knocks some loose.
// Only the picture and the words changed: the sim, race-manager, the AI and saved data still call them coins
// (`coins`, `coinStates`, the track's `coins`), so input logs and the leaderboard's score check are unchanged.
//
// Its own look, never a copy (design §3): Mario Kart's coins are gold discs, Diddy Kong Racing's bananas yellow,
// Crash Team Racing's Wumpa fruit orange-red, Sonic's rings gold hoops. Ours is a bright teal cog (the house
// teal, lightened: steel grey read as the asphalt from the chase camera) with a polished steel hub, eight
// rounded teeth and an axle hole, so its 32 px silhouette reads as a gear, never a disc (gear.test.ts). One
// merged, vertex-colored geometry facing ±Z and centred, a little larger than the coin placeholder it
// replaces (scene.ts places it by BUILDER.coinRadius, unchanged).
import { BufferAttribute, BufferGeometry } from 'three';
import type { ModelBuilder } from './model.ts';

export const GEAR = Object.freeze({
  teeth: 8,
  /** radius to the teeth's tips' corners and to the gaps between them, metres, and how far each tip's crown stands past its corners */
  tip: 0.57,
  root: 0.43,
  crown: 0.015,
  /** half a tooth's width at its tip and at its root, in shares of the tooth pitch (the teeth taper) */
  tipHalf: 0.14,
  rootHalf: 0.3,
  /** thickness front to back; the sides' normals lean this far toward the faces at their edges, so the rims read round */
  thick: 0.2,
  round: 0.6,
  /** the axle hole, the hub ring round it, and how far the hub stands proud of each face */
  hole: 0.12,
  hub: 0.24,
  proud: 0.03,
  hubSegments: 16,
  /** the faces bright teal, the rims round the teeth a deeper teal; the hub polished steel, its bore darker */
  paint: Object.freeze({ face: '#3ad6c8', side: '#22ab9f', hub: '#eef3f8', bore: '#8195aa' }),
});

/**
 * The gear's outline, counter-clockwise from the first tooth's root: 5 points a tooth (its root, its tip's
 * corner, the tip's crown standing a little proud so the tip reads round, the other corner, the other root;
 * the gap between two teeth is one straight chord, 5 mm off the round at most). The sides' smooth normals
 * round every corner in the light.
 */
export function gearOutline(g = GEAR): [number, number][] {
  const out: [number, number][] = [];
  const pitch = (Math.PI * 2) / g.teeth;
  // (share of the pitch from the tooth's centre, radius): one tooth
  const knots: [number, number][] = [[-g.rootHalf, g.root], [-g.tipHalf, g.tip], [0, g.tip + g.crown], [g.tipHalf, g.tip], [g.rootHalf, g.root]];
  for (let j = 0; j < g.teeth; j++) {
    for (const [d, r] of knots) {
      const a = (j + 0.5 + d) * pitch;
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  return out;
}

/** Positions, normals and an index, gathered a vertex at a time. */
class Strip {
  private readonly p: number[] = [];
  private readonly n: number[] = [];
  private readonly i: number[] = [];
  /** vertices so far: the index the next one gets */
  get count(): number { return this.p.length / 3; }
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
    const l = Math.hypot(nx, ny, nz) || 1;
    this.p.push(x, y, z);
    this.n.push(nx / l, ny / l, nz / l);
    return this.p.length / 3 - 1;
  }
  /** a, b, c, d counter-clockwise seen from the side the normals face */
  quad(a: number, b: number, c: number, d: number): void { this.i.push(a, b, c, a, c, d); }
  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.n), 3));
    g.setIndex(this.i);
    return g;
  }
}

/** The gear's parts, each one color: the two faces, the rims round the teeth, the hub and its bore. */
export function gearParts(g = GEAR): { face: BufferGeometry; side: BufferGeometry; hub: BufferGeometry; bore: BufferGeometry } {
  const P = gearOutline(g), N = P.length;
  // each outline point's outward normal, from its neighbours (the outline runs counter-clockwise)
  const nrm = P.map((_, i) => {
    const [ax, ay] = P[(i + N - 1) % N], [bx, by] = P[(i + 1) % N];
    const tx = bx - ax, ty = by - ay, l = Math.hypot(tx, ty);
    return [ty / l, -tx / l] as const;
  });
  // the faces run in from the outline to under the hub
  const zf = g.thick / 2, rin = g.hub - 0.02;
  const face = new Strip(), side = new Strip();
  for (const s of [1, -1]) {
    const z = zf * s, base = face.count;
    for (let i = 0; i < N; i++) {
      const [px, py] = P[i], a = Math.atan2(py, px);
      face.v(Math.cos(a) * rin, Math.sin(a) * rin, z, 0, 0, s);
      face.v(px, py, z, 0, 0, s);
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, ri = base + i * 2, pi = ri + 1, rj = base + j * 2, pj = rj + 1;
      if (s > 0) face.quad(ri, pi, pj, rj); else face.quad(ri, rj, pj, pi);
    }
  }
  // the rims round the teeth: smooth round each tooth (the outline's own normals), leaning toward each face at its edge
  for (let i = 0; i < N; i++) {
    const [nx, ny] = nrm[i];
    side.v(P[i][0], P[i][1], zf, nx, ny, g.round);
    side.v(P[i][0], P[i][1], -zf, nx, ny, -g.round);
  }
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    side.quad(i * 2, i * 2 + 1, j * 2 + 1, j * 2);
  }
  // the hub: a ring standing proud of both faces, and the bore through it
  const hub = new Strip(), bore = new Strip(), M = g.hubSegments, zh = zf + g.proud;
  for (const s of [1, -1]) {
    const base = hub.count;
    for (let k = 0; k < M; k++) {
      const a = (k / M) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      hub.v(c * g.hole, sn * g.hole, zh * s, 0, 0, s);
      hub.v(c * g.hub, sn * g.hub, zh * s, 0, 0, s);
    }
    for (let k = 0; k < M; k++) {
      const l = (k + 1) % M, ik = base + k * 2, ok = ik + 1, il = base + l * 2, ol = il + 1;
      if (s > 0) hub.quad(ik, ok, ol, il); else hub.quad(ik, il, ol, ok);
    }
  }
  const wall = hub.count;
  for (let k = 0; k < M; k++) {
    const a = (k / M) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    hub.v(c * g.hub, sn * g.hub, zh, c, sn, 0);
    hub.v(c * g.hub, sn * g.hub, -zh, c, sn, 0);
    bore.v(c * g.hole, sn * g.hole, zh, -c, -sn, 0);
    bore.v(c * g.hole, sn * g.hole, -zh, -c, -sn, 0);
  }
  for (let k = 0; k < M; k++) {
    const l = (k + 1) % M;
    hub.quad(wall + k * 2, wall + k * 2 + 1, wall + l * 2 + 1, wall + l * 2);
    bore.quad(k * 2, l * 2, l * 2 + 1, k * 2 + 1);
  }
  return { face: face.geometry(), side: side.geometry(), hub: hub.geometry(), bore: bore.geometry() };
}

/** The gear into a model: one merged geometry once built (decor.ts's `coin`, vfx-juice's scatter). */
export function buildGear(m: ModelBuilder, g = GEAR): void {
  const p = gearParts(g), c = g.paint;
  m.part(p.face, c.face).part(p.side, c.side).part(p.hub, c.hub).part(p.bore, c.bore);
}

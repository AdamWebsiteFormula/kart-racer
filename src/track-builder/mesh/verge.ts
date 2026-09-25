// The PBR look's grass by the road (art-pipeline grass.ts draws it; look.ts is the switch): small tufts
// of grass and a few flowers along both curbs of an off-road grass track, thickest right by the curb
// (where the land's soft dirt edge gives way to grass) and thinning out over the verge, as ONE
// InstancedMesh (scene.ts). Pure maths over the sim layer, seeded by the track id: two builds give the
// same tufts. Visual only: karts drive through it, and nothing the sim reads changes.
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import type { TrackJump } from '../../kart-controller/types.ts';
import { hashString, insideRoadEnvelope, mulberry32, pushTransform } from './decor.ts';

/**
 * How the grass is laid: `edge` metres past the curb the thick fringe spans (biased toward the curb by
 * `bias`), `edgeEvery` metres of road per tuft on each side there; `field` the thinner verge past it,
 * `fieldEvery` metres per tuft a side; `flowers` the share of tufts with flowers; `scale` the size range;
 * `clearJump` metres before and after a ramp or bump with none (their skirts stand past the curb).
 */
export const VERGE_GRASS = Object.freeze({
  edge: [0.2, 3] as const, bias: 1.5, edgeEvery: 0.33,
  field: [3, 9] as const, fieldEvery: 1.2,
  flowers: 0.14, scale: [0.75, 1.35] as const, clearJump: 6,
});

export interface GrassPlacement {
  /** 16 floats per tuft */
  matrices: Float32Array;
  /** per tuft: its flowers (0 none, 1..3 which colour) and a seed (0..1) for its tint and sway */
  kinds: Float32Array;
  count: number;
}

/**
 * Tufts along both curbs of the main road (the land is only there on an off-road track: none otherwise),
 * each standing on the land as drawn (`groundAt`), never on a road or a curb (any branch), over a tunnel,
 * past the drivable land, beside an open edge or on a ramp's or bump's skirt (`jumps`).
 */
export function placeGrass(branches: Branches, seed: string, groundAt?: (x: number, z: number) => number, jumps: readonly TrackJump[] = []): GrassPlacement {
  const main = branches.main.lut;
  const out: number[] = [], kinds: number[] = [];
  if (!main.offroad) return { matrices: new Float32Array(0), kinds: new Float32Array(0), count: 0 };
  const rng = mulberry32(hashString(`${seed}:verge-grass`));
  const G = VERGE_GRASS, L = main.length;
  // main-line t ranges a ramp or bump's skirts cover
  const clear = jumps.filter((j) => (j.branch ?? 0) === 0).map((j) => [j.t - ((j.run ?? 0) + G.clearJump) / L, j.t + G.clearJump / L] as const);
  const cleared = (t: number) => clear.some(([a, b]) => { const u = ((t - a) % 1 + 1) % 1; return u <= ((b - a) % 1 + 1) % 1; });
  const layers = [
    { band: G.edge, every: G.edgeEvery, bias: G.bias },
    { band: G.field, every: G.fieldEvery, bias: 1 },
  ];
  for (const layer of layers) {
    const n = Math.floor(L / layer.every);
    for (const side of [-1, 1]) {
      for (let k = 0; k < n; k++) {
        const t = ((k + rng()) * layer.every) / L;
        const u = rng(), dist = layer.band[0] + (layer.band[1] - layer.band[0]) * u ** layer.bias;
        const yaw = rng() * Math.PI * 2, size = G.scale[0] + (G.scale[1] - G.scale[0]) * rng(), flower = rng(), tint = rng();
        const j = main.idx(Math.round(t * main.step));
        if (main.covered[j] || dist > main.reach[j] || (main.open[j] & (side < 0 ? 1 : 2)) || cleared(t)) continue;
        const c = main.sample(t, 0), l = side * (c.halfWidth + BUILDER.kerbWidth + dist);
        const x = c.position[0] + c.tangent[2] * l, z = c.position[2] - c.tangent[0] * l;
        // off every road and curb, this one's included (the inside of a tight bend folds back toward it)
        if (insideRoadEnvelope(branches, x, z, -1, BUILDER.kerbWidth + 0.1)) continue;
        const y = groundAt ? groundAt(x, z) : c.position[1] - BUILDER.offroadDrop;
        pushTransform(out, [x, y, z], yaw, [size, size, size]);
        kinds.push(flower < G.flowers ? 1 + Math.floor((flower / G.flowers) * 3) : 0, tint);
      }
    }
  }
  return { matrices: Float32Array.from(out), kinds: Float32Array.from(kinds), count: out.length / 16 };
}

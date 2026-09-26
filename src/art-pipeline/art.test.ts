// Art checks: every racer builds inside the kart footprint and a triangle budget, has an ink
// hull, and passes the SOP's 32 px silhouette test (no two racers read the same in black).
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { inkFor, INK_SKIP_LIGHTNESS, lightness } from './model.ts';
import { Color } from 'three';
import { RACER_IDS, racerModel } from './racers.ts';

const SIZE = 32;

/** Rasterise a geometry's triangles, projected on two world axes, into a SIZE² bitmap. */
function silhouette(g: BufferGeometry, ax: 0 | 1 | 2, ay: 0 | 1 | 2, box: { min: number[]; max: number[] }): Uint8Array {
  const pos = g.getAttribute('position');
  const idx = g.index!;
  const bmp = new Uint8Array(SIZE * SIZE);
  const span = Math.max(box.max[ax] - box.min[ax], box.max[ay] - box.min[ay]);
  const px = (v: number, a: number) => ((v - box.min[a]) / span) * SIZE;
  const P = (i: number) => [px(pos.getComponent(i, ax), ax), SIZE - px(pos.getComponent(i, ay), ay)];
  for (let t = 0; t < idx.count; t += 3) {
    const [a, b, c] = [P(idx.getX(t)), P(idx.getX(t + 1)), P(idx.getX(t + 2))];
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(SIZE - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(SIZE - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = [x + 0.5, y + 0.5];
      const w0 = (b[0] - p[0]) * (c[1] - p[1]) - (b[1] - p[1]) * (c[0] - p[0]);
      const w1 = (c[0] - p[0]) * (a[1] - p[1]) - (c[1] - p[1]) * (a[0] - p[0]);
      const w2 = (a[0] - p[0]) * (b[1] - p[1]) - (a[1] - p[1]) * (b[0] - p[0]);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) bmp[y * SIZE + x] = 1;
    }
  }
  return bmp;
}

const iou = (a: Uint8Array, b: Uint8Array) => {
  let i = 0, u = 0;
  for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; }
  return i / u;
};

const svg = (bmp: Uint8Array) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="128" height="128" shape-rendering="crispEdges"><rect width="${SIZE}" height="${SIZE}" fill="#fff"/>`
  + [...bmp].map((v, k) => (v ? `<rect x="${k % SIZE}" y="${Math.floor(k / SIZE)}" width="1" height="1"/>` : '')).join('') + '</svg>';

const built = RACER_IDS.map((id) => {
  const m = racerModel(id)!;
  const body = m.build();
  return { id, body, hull: m.outline() };
});

// one shared frame for every racer, so size differences show in the silhouette too
const frame = { min: [Infinity, 0, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const { body } of built) {
  const b = body.boundingBox!;
  frame.min[0] = Math.min(frame.min[0], b.min.x); frame.min[2] = Math.min(frame.min[2], b.min.z);
  frame.max[0] = Math.max(frame.max[0], b.max.x); frame.max[1] = Math.max(frame.max[1], b.max.y); frame.max[2] = Math.max(frame.max[2], b.max.z);
}

describe('racer models', () => {
  it('every cast member has a model, and nothing else does', () => {
    expect([...RACER_IDS].sort()).toEqual(CAST.map((c) => c.id).sort());
    expect(racerModel('nobody')).toBeNull();
  });

  it('each sits on the ground inside the kart footprint, under the triangle budget, with vertex colours', () => {
    for (const { id, body } of built) {
      const b = body.boundingBox!;
      expect(b.min.y, id).toBeGreaterThanOrEqual(-0.01);
      expect(b.max.y, id).toBeLessThan(2.4);
      expect(b.max.x - b.min.x, id).toBeLessThan(BASE.kartRadius * 2.1);
      expect(b.max.z - b.min.z, id).toBeLessThan(BASE.kartRadius * 2.9);
      expect(body.index!.count / 3, id).toBeLessThan(9000);
      expect(body.hasAttribute('color'), id).toBe(true);
    }
  });

  it('SOP gate: every racer passes the 32 px silhouette test, side and front, against every other', async () => {
    const side = built.map((r) => silhouette(r.body, 2, 1, frame));
    const front = built.map((r) => silhouette(r.body, 0, 1, frame));
    const worst: [string, number][] = [];
    for (let i = 0; i < built.length; i++) {
      for (let j = i + 1; j < built.length; j++) {
        // two racers read the same only if BOTH views overlap almost entirely
        const same = Math.min(iou(side[i], side[j]), iou(front[i], front[j]));
        worst.push([`${built[i].id}/${built[j].id}`, same]);
      }
    }
    worst.sort((a, b) => b[1] - a[1]);
    expect(worst[0][1], `most alike: ${worst[0][0]}`).toBeLessThan(0.86);
    // WRITE_SILHOUETTES=1 npx vitest run src/art-pipeline refreshes docs/silhouettes/
    const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
    if (env.WRITE_SILHOUETTES) {
      const fs = (await import('node:fs' as string)) as { mkdirSync(p: string, o: object): void; writeFileSync(p: string, d: string): void };
      fs.mkdirSync('docs/silhouettes', { recursive: true });
      built.forEach((r, i) => {
        fs.writeFileSync(`docs/silhouettes/${r.id}-side.svg`, svg(side[i]));
        fs.writeFileSync(`docs/silhouettes/${r.id}-front.svg`, svg(front[i]));
      });
    }
  });
});

describe('track dressing', () => {
  it('every model exists, and the per-instance triangle budget holds', async () => {
    const { DECOR_NAMES, decorGeometry } = await import('./decor.ts');
    // budgets per instance: the kerb repeats a thousand times, the lighthouse once
    const budget: Record<string, number> = { 'harbour-barrier': 80, 'meadow-barrier': 80, 'canyon-barrier': 80, fence: 150, palm: 1100, oak: 700, cactus: 700, gull: 400, balloon: 1200, coin: 260, lighthouse: 3000, windmill: 3000, arch: 1500, mesa: 800, 'frost-barrier': 80, 'skyline-barrier': 80, 'boardwalk-barrier': 80, pine: 500, snowman: 1000, lamp: 300, stall: 500, cloud: 700, 'cloud-sea': 700, 'sky-lamp': 600, peak: 1500, airship: 4000, 'ferris-wheel': 6000, tent: 1200, island: 900, gust: 1200, tuft: 80, flowers: 240, bush: 220, scrub: 200, pebbles: 80, sapling: 150, stones: 120, crate: 80, umbrella: 120, 'rope-post': 180 };
    for (const name of DECOR_NAMES) {
      const g = decorGeometry(name)!;
      const tris = g.body.index!.count / 3;
      expect(tris, name).toBeLessThan(budget[name] ?? 1500);
      expect(g.body.hasAttribute('color'), name).toBe(true);
    }
  });

  const tracks = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as { id: string; environment?: { decor?: { asset: string; band: string; lift?: number }[] } }[];
  it('no prop floats: a lifted (centred) model rests its lowest point on the ground, never above it (the harbor barrels hung 0.2 m up)', async () => {
    const { decorGeometry } = await import('./decor.ts');
    for (const t of tracks) {
      for (const e of t.environment?.decor ?? []) {
        if (e.band === 'sky') continue;
        const g = decorGeometry(e.asset);
        if (!g) continue;
        g.body.computeBoundingBox();
        const b = g.body.boundingBox!;
        if ((e.lift ?? 0) > b.max.y - b.min.y) continue; // lifted clear off the ground on purpose (an airship)
        // placeDecor scales the lift with the model, so the gap is (lift + min.y) × scale
        expect((e.lift ?? 0) + g.body.boundingBox!.min.y, `${t.id} ${e.asset}`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('verge ground cover is small and low: karts drive through it, so it never stands higher than a kart', async () => {
    const { decorGeometry } = await import('./decor.ts');
    const verge = new Set(tracks.flatMap((t) => (t.environment?.decor ?? []).filter((e) => e.band === 'verge').map((e) => e.asset)));
    expect(verge.size).toBeGreaterThanOrEqual(7);
    for (const name of verge) {
      const b = decorGeometry(name)!.body.boundingBox!;
      // scaled up to 1.3 by placeDecor: still under a kart's roof (about 1.4 m), and no wider than a kart
      expect(b.max.y * 1.3, name).toBeLessThan(1.45);
      expect(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z), name).toBeLessThan(1.0);
      expect(decorGeometry(name)!.body.index!.count / 3, name).toBeLessThan(250);
    }
  });
});

describe('outline colours', () => {
  it('are a mid-tone of the part, darker than it, never black; near-black parts get none', () => {
    const red = new Color('#e63946'), teal = new Color('#2ec4b6'), white = new Color('#ffffff');
    for (const c of [red, teal, white]) {
      const ink = inkFor(c);
      expect(lightness(ink)).toBeLessThan(lightness(c));
      expect(lightness(ink)).toBeGreaterThanOrEqual(0.18);
    }
    expect(inkFor(red).r).toBeGreaterThan(inkFor(red).g * 3); // still red
    const w = inkFor(white);
    expect(w.b).toBeGreaterThan(w.r); // white gets a cool blue-grey edge
    expect(lightness(new Color('#2a2630'))).toBeLessThan(INK_SKIP_LIGHTNESS); // tyres: no outline
  });
});

describe('racer model files', () => {
  it('fit into the kart footprint: nose to tail, centred, wheels on the ground, one uniform scale', async () => {
    const { fitToKart, KART_FIT } = await import('./glb.ts');
    // a model 4 m long, 2 m wide, 1.5 m tall, sitting off-centre and below the origin
    const { scale, offset } = fitToKart([1, -0.5, 3], [3, 1, 7]);
    expect(scale).toBeCloseTo(KART_FIT.length / 4, 6);
    const min = [1 * scale + offset[0], -0.5 * scale + offset[1], 3 * scale + offset[2]];
    const max = [3 * scale + offset[0], 1 * scale + offset[1], 7 * scale + offset[2]];
    expect(min[1]).toBeCloseTo(0, 6); // on the ground
    expect(min[0] + max[0]).toBeCloseTo(0, 6); // centred side to side
    expect(min[2] + max[2]).toBeCloseTo(0, 6); // centred nose to tail
    expect(max[0] - min[0]).toBeLessThanOrEqual(KART_FIT.width + 1e-9);
    // a tall model is limited by its height instead
    expect(fitToKart([0, 0, 0], [1, 5, 1]).scale).toBeCloseTo(KART_FIT.height / 5, 6);
  });

  it('with no manifest every racer keeps its code-built kart', async () => {
    const { RacerModels } = await import('./glb.ts');
    const models = new RacerModels('/', (async () => ({ ok: false })) as unknown as typeof fetch);
    await models.load();
    expect(models.has('pip')).toBe(false);
    expect(models.make('pip')).toBeNull();
  });
});

describe('painted skies', () => {
  it('every sky preset has its panorama file, and its horizon colour is a real colour for the fog', async () => {
    const { SKIES, PANORAMAS } = await import('./sky.ts');
    const fs = (await import('node:fs' as string)) as { existsSync(p: URL): boolean };
    for (const id of Object.keys(SKIES)) {
      expect(PANORAMAS.has(id), id).toBe(true);
      expect(fs.existsSync(new URL(`../../public/skies/${id}.webp`, import.meta.url)), id).toBe(true);
      expect(SKIES[id].horizon, id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('scenery model files', () => {
  it('fit onto the code-built model they replace: same height, same spot, same floor', async () => {
    const { Box3, BoxGeometry, Vector3 } = await import('three');
    const { fitToBox, PropModels } = await import('./glb.ts');
    // a 2 × 4 × 1 box sitting off to one side, fitted onto a 6 m tall target standing on y = -1
    const g = new BoxGeometry(2, 4, 1).translate(10, 2, -3);
    const target = new Box3(new Vector3(-1, -1, 4), new Vector3(1, 5, 6));
    fitToBox(g, target);
    const b = g.boundingBox!;
    expect(b.max.y - b.min.y).toBeCloseTo(6, 6);
    expect(b.min.y).toBeCloseTo(-1, 6);
    expect((b.min.x + b.max.x) / 2).toBeCloseTo(0, 6);
    expect((b.min.z + b.max.z) / 2).toBeCloseTo(5, 6);
    expect(b.max.x - b.min.x).toBeCloseTo(3, 6); // one uniform scale: 2 m wide × 1.5
    // by width: a flat cloud bank matches the target's widest side, not its height
    const w = fitToBox(new BoxGeometry(2, 4, 1), new Box3(new Vector3(-10, 0, -3), new Vector3(10, 2, 3)), 'width').boundingBox!;
    expect(w.max.x - w.min.x).toBeCloseTo(20, 6);
    expect(w.max.y - w.min.y).toBeCloseTo(40, 6);
    // no manifest: every prop stays code-built
    const none = new PropModels('/', (async () => ({ ok: false })) as unknown as typeof fetch);
    await none.load();
    expect(none.get('palm')).toBeUndefined();
  });

  it('a folded sliver (two faces back to back) gets a real normal, not the (0, 0, 0) its faces average to', async () => {
    const { BufferAttribute, BufferGeometry } = await import('three');
    const { mergeVertices } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
    const { repairZeroNormals, smoothed } = await import('./glb.ts');
    // one 1/128 m triangle twice, the second wound the other way (powers of two, so float rounding
    // leaves no residue): welded, its three corners' face normals cancel exactly
    const e = 1 / 128, g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, e, 0, 0, 0, e, 0, 0, 0, 0, 0, e, 0, e, 0, 0]), 3));
    const plain = mergeVertices(g);
    plain.computeVertexNormals();
    expect(plain.getAttribute('normal').getZ(0)).toBe(0); // the fault itself, before the fix
    const n = smoothed(g).getAttribute('normal');
    expect(n.count).toBe(3);
    for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 6);
    expect(Math.abs(n.getZ(0))).toBeCloseTo(1, 6);
    // nothing left to fix the second time
    const again = new BufferGeometry().setAttribute('position', g.getAttribute('position')).setAttribute('normal', n);
    expect(repairZeroNormals(again)).toBe(0);
  });

  it('every prop file, loaded as the game loads it, has only unit-length normals (a zero one shades a NaN pixel; bloom spreads it into a black frame)', async () => {
    (globalThis as { self?: unknown }).self ??= globalThis; // GLTFLoader reaches for a browser's `self` at a texture
    const fs = (await import('node:fs' as string)) as { readdirSync(p: URL): string[]; readFileSync(p: URL): Uint8Array };
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { bakedGeometry, smoothed } = await import('./glb.ts');
    const dir = new URL('../../public/models/props/', import.meta.url);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb'));
    expect(files.length).toBeGreaterThan(20);
    const quiet = [console.error, console.warn];
    console.error = console.warn = () => {}; // textures cannot decode here, and need not
    try {
      for (const f of files) {
        const b = fs.readFileSync(new URL(f, dir));
        const scene = (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '')).scene;
        let mesh: import('three').Mesh | undefined;
        scene.traverse((o) => { if (!mesh && (o as import('three').Mesh).isMesh) mesh = o as import('three').Mesh; });
        const n = smoothed(bakedGeometry(mesh!)).getAttribute('normal');
        let bad = 0;
        for (let i = 0; i < n.count; i++) if (!(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 1e-3)) bad++;
        expect(bad, f).toBe(0);
      }
    } finally { [console.error, console.warn] = quiet; }
  }, 60_000);
});

describe('painted surfaces', () => {
  it('every ground and road texture the game asks for ships, and the sea tracks get water', async () => {
    const fs = (await import('node:fs' as string)) as { existsSync(p: URL): boolean };
    for (const f of ['grass', 'sand', 'snow', 'asphalt']) expect(fs.existsSync(new URL(`../../public/textures/${f}.webp`, import.meta.url)), f).toBe(true);
    const { groundMaterial } = await import('./surfaces.ts');
    expect(groundMaterial('harbour', 'water', 2400)?.type).toBe('ShaderMaterial');
    expect(groundMaterial('meadow', 'plane', 2400)?.type).toBe('MeshStandardMaterial'); // the PBR look is the default (25 Sept 2026)
    expect(groundMaterial('skyline', 'none', 2400)).toBeUndefined();
  });
});

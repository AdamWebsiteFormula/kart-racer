// The land beside an off-road track's road, dressed (detail review 5, 24 Sept 2026): ground cover on
// the drivable verge, props favouring the outside of corners, mud with a ragged edge and no lines, hay
// humps on Meadow Run, and a tree line where Meadow's lawn meets its hills.
import { describe, expect, it } from 'vitest';
import type { DataTexture, Mesh } from 'three';
import { BUILDER } from '../constants.ts';
import { buildLut } from '../lut.ts';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { SURFACES } from '../types.ts';
import { cloneDef } from '../__tests__/fixtures.ts';
import { buildBackdrop } from './backdrop.ts';
import { hashString, insideRoadEnvelope, mulberry32, outsideOf, placeDecor } from './decor.ts';
import { paletteFor } from './palette.ts';
import { buildRibbon, MUD_EDGE, mudDepth, ROAD_MARK } from './road.ts';
import { buildTrackScene } from './scene.ts';
import meadowJson from '../tracks/meadow-run.json';
import boardwalkJson from '../tracks/boardwalk-nights.json';

const all = Object.values(import.meta.glob('../tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const offroad = all.filter((d) => d.offroad === true);

/** Metres past the main road's curb at (x, z), and the nearest sample. */
function pastCurb(lut: ReturnType<typeof buildTrack>['branches']['main']['lut'], x: number, z: number): { past: number; j: number } {
  let best = Infinity, j = 0;
  for (let i = 0; i < lut.n; i++) {
    const d = (lut.px[i] - x) ** 2 + (lut.pz[i] - z) ** 2;
    if (d < best) { best = d; j = i; }
  }
  return { past: Math.sqrt(best) - lut.hw[j] - BUILDER.kerbWidth, j };
}

describe('the verge: ground cover on the drivable land (visual only)', () => {
  it('every off-road track has one, and the verge band lies past a ramp skirt and inside the course limit', () => {
    expect(offroad.map((d) => d.id).sort()).toEqual(['canyon-rush', 'frostbite-pass', 'harbour-loop', 'meadow-run']);
    for (const d of offroad) expect(d.environment!.decor!.filter((e) => e.band === 'verge').length, d.id).toBeGreaterThanOrEqual(2);
    const [near, far] = BUILDER.decorBands.verge;
    expect(near).toBeGreaterThanOrEqual(BUILDER.rampSkirt);
    expect(far).toBeLessThan(BUILDER.offroadReach);
  });

  it.each(offroad.map((d) => [d.id, d] as const))('%s: each piece lies on the land karts drive over, off every road and curb, casting no shadow', (_id, raw) => {
    const def = cloneDef(raw), track = buildTrack(def), scene = buildTrackScene(track), lut = track.branches.main.lut;
    const verge = scene.decor.filter((p) => p.band === 'verge');
    let n = 0;
    for (const p of verge) {
      expect(p.count, p.asset).toBe(def.environment!.decor!.find((e) => e.asset === p.asset && e.band === 'verge')!.instances);
      for (let i = 0; i < p.count; i++, n++) {
        const x = p.matrices[i * 16 + 12], z = p.matrices[i * 16 + 14];
        expect(insideRoadEnvelope(track.branches, x, z, -1, BUILDER.kerbWidth + 0.5)).toBe(false);
        // inside the course limit (on a bend the nearest sample is not the one it was laid out from: a little slack)
        expect(pastCurb(lut, x, z).past).toBeLessThanOrEqual(BUILDER.offroadReach + 0.01);
      }
    }
    expect(n).toBeGreaterThanOrEqual(300);
    scene.group.traverse((o) => { if (o.name.startsWith('decor:') && verge.some((p) => o.name === `decor:${p.asset}`)) expect((o as Mesh).castShadow, o.name).toBe(false); });
    scene.dispose();
  });

  it('a pier or a sky road has no verge: an entry there places nothing', () => {
    const track = buildTrack(boardwalkJson as unknown as TrackDefinition);
    const p = placeDecor(track.branches, { asset: 'tuft', instances: 50, band: 'verge' }, mulberry32(1), 0);
    expect(p.count).toBe(0);
  });

  it('roadside and verge groups favour the outside of sharp corners, where the eye looks across them', () => {
    let out = 0, inside = 0;
    for (const raw of offroad) {
      const track = buildTrack(cloneDef(raw)), lut = track.branches.main.lut;
      const rng = mulberry32(hashString(raw.id));
      for (const entry of raw.environment!.decor!) {
        const p = placeDecor(track.branches, entry, rng, track.groundPlaneY);
        if (entry.band !== 'verge' && entry.band !== 'roadside') continue;
        for (let i = 0; i < p.count; i++) {
          const x = p.matrices[i * 16 + 12], z = p.matrices[i * 16 + 14], { j } = pastCurb(lut, x, z);
          const o = outsideOf(lut, j / lut.step);
          if (o.bend < 0.6) continue;
          const side = Math.sign((x - lut.px[j]) * lut.tz[j] - (z - lut.pz[j]) * lut.tx[j]);
          if (side === o.side) out++; else inside++;
        }
      }
    }
    expect(out + inside, `${out} out, ${inside} in`).toBeGreaterThan(80);
    expect(out / (out + inside), `${out} out, ${inside} in`).toBeGreaterThan(0.62);
  });

  it('outsideOf reads a left-hand bend as having its outside on the right', () => {
    // a circle driven anticlockwise seen from above (x right, z down the screen): every bend turns left
    const pts = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2; return { x: Math.cos(a) * 30, y: 0, z: -Math.sin(a) * 30, halfWidth: 6 }; });
    const lut = buildLut(pts);
    const o = outsideOf(lut, 0.3);
    expect(o.bend).toBeGreaterThan(0.9);
    // the centre of the circle is the inside: the outside is the side away from it
    const j = Math.round(0.3 * lut.step), side = o.side * BUILDER.offroadReach;
    const ox = lut.px[j] + lut.tz[j] * side, oz = lut.pz[j] - lut.tx[j] * side;
    expect(Math.hypot(ox, oz)).toBeGreaterThan(Math.hypot(lut.px[j], lut.pz[j]));
  });
});

describe('mud on the road (Meadow Run)', () => {
  const track = buildTrack(meadowJson as unknown as TrackDefinition), lut = track.branches.main.lut, palette = paletteFor(track.def);
  const MUD = SURFACES.indexOf('mud');

  it('its depth is 0 off the mud, 0.5 on its first sample, and 1 from MUD_EDGE metres in', () => {
    const { depth } = mudDepth(lut);
    const metres = lut.length / lut.step;
    let first = -1;
    for (let i = 0; i < lut.n; i++) if (lut.surface[i] === MUD && lut.surface[lut.idx(i - 1)] !== MUD) { first = i; break; }
    expect(first).toBeGreaterThanOrEqual(0);
    expect(depth[lut.idx(first - 1)]).toBe(0);
    expect(depth[first]).toBeCloseTo(0.5, 5);
    const deep = lut.idx(first + Math.ceil(MUD_EDGE / metres));
    if (lut.surface[deep] === MUD) expect(depth[deep]).toBe(1);
    for (let i = 0; i < lut.n; i++) expect(depth[i] === 0).toBe(lut.surface[i] !== MUD);
  });

  it('the ribbon keeps the road under the mud (the material paints the mud over it, ragged) and marks it in `surf`', () => {
    const g = buildRibbon(lut, 0, 1, palette);
    const mark = g.getAttribute('mark').array as Float32Array, surf = g.getAttribute('surf').array as Float32Array, col = g.getAttribute('color').array as Float32Array;
    let onMud = 0;
    for (let v = 0; v < mark.length; v++) {
      if (mark[v] !== ROAD_MARK.road) { expect(surf[v]).toBe(0); continue; }
      if (surf[v] > 0) {
        onMud++;
        // not the flat mud colour: the road's own, so the ragged edge shows road, not a straight colour change
        expect([col[v * 3], col[v * 3 + 1], col[v * 3 + 2]]).toEqual(Array.from(new Float32Array(palette.surfaces.road)));
      }
    }
    expect(onMud).toBeGreaterThan(10);
  });

  it('a mud patch repaints only its own samples (a surface shift still rebuilds just the chunks it touches)', () => {
    const clean = cloneDef(meadowJson as unknown as TrackDefinition);
    for (const c of clean.controlPoints) delete c.surface;
    const a = buildRibbon(buildTrack(clean).branches.main.lut, 0, 1, palette), b = buildRibbon(lut, 0, 1, palette);
    const ca = a.getAttribute('color').array, cb = b.getAttribute('color').array, sb = b.getAttribute('surf').array;
    for (let v = 0; v < sb.length; v++) if (sb[v] === 0) expect(cb[v * 3 + 1]).toBe(ca[v * 3 + 1]);
  });
});

describe('Meadow Run: hay humps and the horizon', () => {
  it('its trick bumps are straw with a red twine crest, not brown slabs', () => {
    const scene = buildTrackScene(buildTrack(meadowJson as unknown as TrackDefinition));
    const humps = scene.group.getObjectByName('humps') as Mesh;
    const data = ((humps.material as unknown as { map: DataTexture }).map.image.data) as Uint8Array;
    let r = 0, g = 0, b = 0, red = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
      if (data[i] > 180 && data[i + 1] < 100) red++;
    }
    const n = data.length / 4;
    expect(r / n).toBeGreaterThan(190);
    expect(g / n).toBeGreaterThan(160);
    expect(b / n).toBeLessThan(120);
    expect(red).toBeGreaterThan(0);
    scene.dispose();
  });

  it('a low tree line at 420 m hides where the lawn ends, not hazed toward the sky; still one draw for every ring', () => {
    const horizon: [number, number, number] = [0.83, 0.92, 0.7];
    const group = buildBackdrop('meadow', 0, horizon)!;
    const meshes = group.children as Mesh[];
    expect(meshes).toHaveLength(1);
    const pos = meshes[0].geometry.getAttribute('position'), col = meshes[0].geometry.getAttribute('color');
    let near = Infinity, seen = 0;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      near = Math.min(near, r);
      if (Math.abs(r - 420) > 1 || pos.getY(i) > -29) continue; // the foot row
      seen++;
      // its foot is a dark hedgerow green: far from the pale horizon colour
      const d = Math.hypot(col.getX(i) - horizon[0], col.getY(i) - horizon[1], col.getZ(i) - horizon[2]);
      expect(d).toBeGreaterThan(0.5);
      expect(col.getY(i)).toBeGreaterThan(col.getX(i));
    }
    expect(near).toBeCloseTo(420, 0);
    expect(seen).toBeGreaterThan(0);
  });
});
